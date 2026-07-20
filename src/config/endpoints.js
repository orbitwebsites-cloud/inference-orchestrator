// Simulated model endpoint pool.
//
// NOTE ON REALISM: no paid/gated API keys are used anywhere in this project
// (hackathon constraint). The "local-*" endpoints are real Ollama models if
// OLLAMA_ENABLED=1 and Ollama is running locally; otherwise every endpoint
// (local and cloud) runs in full simulation mode using the cost/latency
// profile below, with a small amount of random jitter so repeated runs look
// like a real fleet under variable load rather than static numbers.
//
// Each endpoint models one plug-in point for a real paid provider later:
// swap `simulate()` for a real HTTP call to OpenAI/Anthropic/Groq/Together/etc,
// keep the same cost/latency/quality reporting contract, and the router logic
// below does not need to change at all.

export const ENDPOINTS = [
  {
    id: "local-tinyllama",
    label: "Local: TinyLlama 1.1B (Ollama)",
    kind: "local",
    ollamaModel: "tinyllama",
    costPerMTokUsd: 0, // local compute, no per-token billing
    baseLatencyMs: 150,
    jitterMs: 60,
    quality: 0.55,
    notes: "Fastest, cheapest, lowest quality. Good for trivial/short requests.",
  },
  {
    id: "local-phi3-mini",
    label: "Local: Phi-3 Mini 3.8B (Ollama)",
    kind: "local",
    ollamaModel: "phi3:mini",
    costPerMTokUsd: 0,
    baseLatencyMs: 400,
    jitterMs: 120,
    quality: 0.72,
    notes: "Mid-tier local model, decent quality/latency balance.",
  },
  {
    id: "local-llama3-8b",
    label: "Local: Llama 3.1 8B (Ollama)",
    kind: "local",
    ollamaModel: "llama3.1:8b",
    costPerMTokUsd: 0,
    baseLatencyMs: 900,
    jitterMs: 200,
    quality: 0.85,
    notes: "Best local quality, slowest local option.",
  },
  {
    id: "sim-cloud-fast",
    label: "Simulated Cloud: fast-tier (e.g. Groq/Together-class)",
    kind: "simulated-cloud",
    ollamaModel: null,
    costPerMTokUsd: 0.20, // $0.20 / 1M tokens, illustrative
    baseLatencyMs: 300,
    jitterMs: 80,
    quality: 0.75,
    notes: "SIMULATED. In production this maps to a low-cost hosted inference provider.",
  },
  {
    id: "sim-cloud-premium",
    label: "Simulated Cloud: premium-tier (e.g. GPT-4/Claude-class)",
    kind: "simulated-cloud",
    ollamaModel: null,
    costPerMTokUsd: 10.0, // $10 / 1M tokens, illustrative
    baseLatencyMs: 1200,
    jitterMs: 250,
    quality: 0.95,
    notes: "SIMULATED. In production this maps to a frontier hosted model. Used as the naive single-provider baseline for cost comparison.",
  },
];

export const BASELINE_ENDPOINT_ID = "sim-cloud-premium";

export function getEndpointById(id) {
  const ep = ENDPOINTS.find((e) => e.id === id);
  if (!ep) throw new Error(`Unknown endpoint id: ${id}`);
  return ep;
}
