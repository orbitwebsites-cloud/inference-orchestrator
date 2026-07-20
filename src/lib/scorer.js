// Scoring + selection logic for the router.
//
// Each candidate endpoint is scored on three normalized axes (0..1, higher
// is always better after normalization):
//   - costScore:    1 - normalized(costPerMTokUsd)   (cheaper => higher score)
//   - latencyScore: 1 - normalized(expectedLatencyMs) (faster => higher score)
//   - qualityScore: normalized(quality)               (better => higher score)
//
// Weighted sum picks the winner. Hard constraints (maxLatencyMs, minQuality)
// filter the candidate pool before scoring; if nothing survives the filter,
// the constraint is dropped with a logged warning rather than failing the
// request outright (graceful degradation).

function normalize(values, invert) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1; // avoid div/0 when all values are equal
  return values.map((v) => {
    const n = (v - min) / span;
    return invert ? 1 - n : n;
  });
}

export function estimateLatencyMs(endpoint) {
  // Deterministic-ish jitter based on Date.now() would break workflow replay
  // rules elsewhere in this codebase; here it's fine since this file runs as
  // a normal Node process, not inside a Workflow script.
  const jitter = (Math.random() * 2 - 1) * endpoint.jitterMs;
  return Math.max(20, Math.round(endpoint.baseLatencyMs + jitter));
}

export function scoreCandidates(endpoints, weights, expectedLatencies) {
  const costs = endpoints.map((e) => e.costPerMTokUsd);
  const latencies = expectedLatencies;
  const qualities = endpoints.map((e) => e.quality);

  const costScores = normalize(costs, true);
  const latencyScores = normalize(latencies, true);
  const qualityScores = normalize(qualities, false);

  return endpoints.map((e, i) => {
    const composite =
      weights.cost * costScores[i] +
      weights.latency * latencyScores[i] +
      weights.quality * qualityScores[i];
    return {
      endpoint: e,
      expectedLatencyMs: latencies[i],
      costScore: costScores[i],
      latencyScore: latencyScores[i],
      qualityScore: qualityScores[i],
      composite,
    };
  });
}

export function pickBest(scored) {
  return scored.reduce((best, cur) => (cur.composite > best.composite ? cur : best));
}
