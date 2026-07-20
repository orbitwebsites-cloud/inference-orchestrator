// Demo runner: fires a batch of varied requests through the router,
// prints a routing-decision table, and reports total cost vs the naive
// "always use the premium single provider" baseline.
//
// Run with: npm run demo

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routeRequest } from "./lib/router.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SAMPLE_REQUESTS = [
  { prompt: "Say hi in one word.", maxResponseTokens: 8 },
  { prompt: "Summarize the plot of a short story about a lighthouse keeper.", maxResponseTokens: 200 },
  { prompt: "What's 12 * 7?", maxResponseTokens: 8, maxLatencyMs: 250 },
  { prompt: "Write a detailed technical explanation of how TCP congestion control works, covering slow start, congestion avoidance, and fast retransmit.", maxResponseTokens: 600, minQuality: 0.8 },
  { prompt: "Translate 'good morning' to French.", maxResponseTokens: 16 },
  { prompt: "Draft a professional email declining a meeting invite.", maxResponseTokens: 150 },
  { prompt: "Explain the CAP theorem to a junior engineer, with an example.", maxResponseTokens: 400, minQuality: 0.75 },
  { prompt: "List 5 synonyms for 'happy'.", maxResponseTokens: 40 },
  { prompt: "Generate a haiku about autumn.", maxResponseTokens: 40 },
  { prompt: "Review this SQL query for injection risk: SELECT * FROM users WHERE id = '\" + userId + \"'", maxResponseTokens: 300, minQuality: 0.85 },
  { prompt: "What's the capital of Peru?", maxResponseTokens: 8, maxLatencyMs: 300 },
  { prompt: "Compare REST and gRPC for an internal microservice API, with tradeoffs.", maxResponseTokens: 500, minQuality: 0.8 },
];

function fmtUsd(n) {
  return `$${n.toFixed(6)}`;
}

async function main() {
  console.log(`Running ${SAMPLE_REQUESTS.length} requests through the orchestrator...\n`);

  const results = [];
  for (const req of SAMPLE_REQUESTS) {
    const result = await routeRequest(req);
    results.push(result);
  }

  const rows = results.map((r) => ({
    prompt: r.prompt.length > 40 ? r.prompt.slice(0, 40) + "…" : r.prompt,
    endpoint: r.chosenEndpointId,
    latencyMs: r.actualLatencyMs,
    cost: fmtUsd(r.estimatedCostUsd),
    baselineCost: fmtUsd(r.baselineCostUsd),
    savings: fmtUsd(r.savingsUsd),
  }));

  console.table(rows);

  const totalCost = results.reduce((s, r) => s + r.estimatedCostUsd, 0);
  const totalBaselineCost = results.reduce((s, r) => s + r.baselineCostUsd, 0);
  const totalSavings = totalBaselineCost - totalCost;
  const savingsPct = totalBaselineCost > 0 ? (totalSavings / totalBaselineCost) * 100 : 0;

  const distribution = {};
  for (const r of results) {
    distribution[r.chosenEndpointId] = (distribution[r.chosenEndpointId] || 0) + 1;
  }

  const avgLatency = results.reduce((s, r) => s + r.actualLatencyMs, 0) / results.length;

  console.log("\n--- Summary ---");
  console.log(`Total requests:        ${results.length}`);
  console.log(`Total cost (routed):   ${fmtUsd(totalCost)}`);
  console.log(`Total cost (baseline): ${fmtUsd(totalBaselineCost)}  (always ${results[0].baselineEndpointId})`);
  console.log(`Total savings:         ${fmtUsd(totalSavings)}  (${savingsPct.toFixed(1)}%)`);
  console.log(`Avg latency:           ${avgLatency.toFixed(0)}ms`);
  console.log(`Routing distribution:  ${JSON.stringify(distribution, null, 2)}`);

  const summary = {
    generatedAt: new Date().toISOString(),
    requestCount: results.length,
    totalCostUsd: totalCost,
    totalBaselineCostUsd: totalBaselineCost,
    totalSavingsUsd: totalSavings,
    savingsPct,
    avgLatencyMs: avgLatency,
    distribution,
  };

  const outPath = path.join(__dirname, "..", "logs", "demo-summary.json");
  await writeFile(outPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`\nSummary written to ${outPath}`);
  console.log(`Full per-request log: ${path.join(__dirname, "..", "logs", "routing-log.jsonl")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
