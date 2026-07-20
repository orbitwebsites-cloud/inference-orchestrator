import { ENDPOINTS, BASELINE_ENDPOINT_ID, getEndpointById } from "../config/endpoints.js";
import { estimateLatencyMs, scoreCandidates, pickBest } from "./scorer.js";
import { logDecision } from "./logger.js";

const DEFAULT_WEIGHTS = { cost: 0.4, latency: 0.3, quality: 0.3 };
const OLLAMA_ENABLED = process.env.OLLAMA_ENABLED === "1";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

// Rough token estimate: ~4 chars/token, plus a fixed response budget.
function estimateTokens(prompt, maxResponseTokens = 256) {
  const promptTokens = Math.ceil((prompt?.length || 0) / 4);
  return promptTokens + maxResponseTokens;
}

function filterByConstraints(endpoints, { maxLatencyMs, minQuality } = {}) {
  let pool = endpoints;
  if (typeof minQuality === "number") {
    const filtered = pool.filter((e) => e.quality >= minQuality);
    if (filtered.length > 0) pool = filtered;
  }
  if (typeof maxLatencyMs === "number") {
    const filtered = pool.filter((e) => e.baseLatencyMs <= maxLatencyMs);
    if (filtered.length > 0) pool = filtered;
  }
  return pool;
}

async function callOllama(endpoint, prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: endpoint.ollamaModel, prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama call failed: ${res.status}`);
  const data = await res.json();
  return data.response ?? "";
}

function simulateResponse(endpoint, prompt) {
  return `[simulated ${endpoint.id} response to ${prompt.length}-char prompt]`;
}

/**
 * Route a single request: score all eligible endpoints, pick the winner,
 * execute against it (real Ollama call if enabled+local, else simulated),
 * and log the full decision for later cost/latency analysis.
 */
export async function routeRequest({
  prompt,
  weights = DEFAULT_WEIGHTS,
  maxLatencyMs,
  minQuality,
  maxResponseTokens = 256,
} = {}) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("routeRequest requires a `prompt` string");
  }

  const pool = filterByConstraints(ENDPOINTS, { maxLatencyMs, minQuality });
  const expectedLatencies = pool.map(estimateLatencyMs);
  const scored = scoreCandidates(pool, weights, expectedLatencies);
  const winner = pickBest(scored);
  const endpoint = winner.endpoint;

  const tokens = estimateTokens(prompt, maxResponseTokens);
  const estimatedCostUsd = (tokens / 1_000_000) * endpoint.costPerMTokUsd;

  const start = performance.now();
  let responseText;
  let usedRealOllama = false;
  try {
    if (OLLAMA_ENABLED && endpoint.kind === "local") {
      responseText = await callOllama(endpoint, prompt);
      usedRealOllama = true;
    } else {
      await new Promise((r) => setTimeout(r, Math.min(winner.expectedLatencyMs, 50)));
      responseText = simulateResponse(endpoint, prompt);
    }
  } catch (err) {
    // Fall back to simulation if a real local call fails (e.g. model not pulled).
    responseText = simulateResponse(endpoint, prompt);
  }
  const actualLatencyMs = Math.round(performance.now() - start);

  // Baseline: what a naive "always use the premium single provider" setup
  // would have cost for the same request, for the savings comparison.
  const baseline = getEndpointById(BASELINE_ENDPOINT_ID);
  const baselineCostUsd = (tokens / 1_000_000) * baseline.costPerMTokUsd;

  const decision = {
    prompt: prompt.length > 200 ? prompt.slice(0, 200) + "…" : prompt,
    estimatedTokens: tokens,
    chosenEndpointId: endpoint.id,
    chosenEndpointLabel: endpoint.label,
    weights,
    constraints: { maxLatencyMs, minQuality },
    candidates: scored.map((s) => ({
      id: s.endpoint.id,
      composite: Number(s.composite.toFixed(4)),
      costScore: Number(s.costScore.toFixed(4)),
      latencyScore: Number(s.latencyScore.toFixed(4)),
      qualityScore: Number(s.qualityScore.toFixed(4)),
      expectedLatencyMs: s.expectedLatencyMs,
    })),
    estimatedCostUsd,
    baselineEndpointId: baseline.id,
    baselineCostUsd,
    savingsUsd: baselineCostUsd - estimatedCostUsd,
    actualLatencyMs,
    usedRealOllama,
  };

  await logDecision(decision);

  return { ...decision, responseText };
}

export { DEFAULT_WEIGHTS, ENDPOINTS };
