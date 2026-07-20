# Inference Orchestrator

Auto-scaling inference orchestrator: a router service that dynamically picks
which LLM endpoint should handle each incoming request, scored on **cost**,
**latency**, and **quality** — instead of hard-coding a single provider.

Built for the **AI Infra Summit Hackathon** (lablab.ai, deadline Sep 17, 2026).

## Why this exists

Most apps hard-wire one model provider for every request. That's wasteful:
a "translate this word" request doesn't need a frontier model, and a
"debug this security-critical SQL" request shouldn't go to the cheapest
model available. This project shows the **routing/orchestration logic**
that solves that — scoring a pool of candidate endpoints per-request and
picking the best fit under real-time cost/latency/quality tradeoffs, with
per-request constraints (`minQuality`, `maxLatencyMs`) an app can set.

## Important: no paid/gated API keys

This project is built entirely **without paid or gated API keys**, per the
hackathon's zero-cost constraint. The endpoint pool
(`src/config/endpoints.js`) is a mix of:

- **Local models** (`local-*`) — real, free, open-weight models served via
  [Ollama](https://ollama.com) if you have it running, or fully simulated
  otherwise (see below).
- **Simulated cloud tiers** (`sim-cloud-fast`, `sim-cloud-premium`) — these
  do **not** call any real paid API. They are cost/latency/quality profiles
  modeled on real provider tiers (e.g. Groq/Together-class "fast", GPT-4/
  Claude-class "premium") purely to demonstrate what the router does when a
  paid provider is in the mix. Swapping a simulated entry for a real paid
  provider is a one-function change — see "Plugging in real providers" below.

By default (`OLLAMA_ENABLED` unset), **all** endpoints — local and cloud —
run in simulation mode: cost/latency numbers come from the configured
profile plus jitter, and the router logic, scoring, and logging are 100%
real. Only the model's response text is a placeholder string.

### Running against real local models (optional)

If you have [Ollama](https://ollama.com) installed:

```bash
ollama pull tinyllama
ollama pull phi3:mini
ollama pull llama3.1:8b
```

Then run with `OLLAMA_ENABLED=1` (see below) and the `local-*` endpoints will
make real calls to your local Ollama server for the response text. Cost is
still $0 (it's your own hardware) and latency is still measured for real.

## Project structure

```
src/
  config/endpoints.js   endpoint pool: cost/latency/quality profile per model
  lib/scorer.js         normalization + weighted scoring + winner selection
  lib/router.js         routeRequest(): filter -> score -> execute -> log
  lib/logger.js         appends every routing decision to logs/routing-log.jsonl
  server.js             HTTP API: POST /route, GET /endpoints, GET /health
  demo.js               batch demo: 12 varied requests, prints table + savings
logs/
  routing-log.jsonl     every routing decision ever made (JSON Lines)
  demo-summary.json     aggregate stats from the last `npm run demo` run
```

## Setup

Requires Node.js 18+ (uses built-in `fetch`, no `npm install` needed — zero
external dependencies).

```bash
node --version   # confirm >= 18
```

## Running the demo

```bash
npm run demo
```

This fires 12 varied sample requests (short factual questions, long
technical explanations, security-sensitive review requests, etc.) through
the router, prints a table of routing decisions, and reports total cost vs
a **naive baseline** (always routing to the single premium cloud tier).
Full per-request detail is appended to `logs/routing-log.jsonl`, and an
aggregate summary is written to `logs/demo-summary.json`.

## Running the router as a service

```bash
npm start
# -> inference-orchestrator router listening on http://localhost:8787
```

### `POST /route`

```bash
curl -X POST http://localhost:8787/route \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain the CAP theorem to a junior engineer.",
    "minQuality": 0.75,
    "maxLatencyMs": 1000
  }'
```

Request body:

| field              | type   | default                          | description                                   |
|--------------------|--------|-----------------------------------|------------------------------------------------|
| `prompt`           | string | required                          | the request text                                |
| `maxResponseTokens`| number | 256                                | used for the token/cost estimate                |
| `minQuality`       | number | none                               | drop candidates below this quality score (0-1)  |
| `maxLatencyMs`     | number | none                               | drop candidates above this expected latency     |
| `weights`          | object | `{cost:0.4, latency:0.3, quality:0.3}` | per-request scoring weight override        |

Response includes the chosen endpoint, the full scored candidate list (so
you can see *why* it won), estimated cost, the baseline cost for the same
request, and the resulting savings.

### `GET /endpoints`

Returns the full configured endpoint pool with cost/latency/quality profiles.

## How scoring works

For each candidate endpoint, three raw metrics are min-max normalized across
the current candidate pool to a 0..1 score (see `src/lib/scorer.js`):

- `costScore` — cheaper is better (inverted)
- `latencyScore` — faster is better (inverted)
- `qualityScore` — higher quality is better

The composite score is a weighted sum (`weights.cost/latency/quality`,
defaults `0.4/0.3/0.3`), and the endpoint with the highest composite wins.
Hard constraints (`minQuality`, `maxLatencyMs`) filter the pool *before*
scoring; if a constraint would eliminate every candidate, it's dropped
(graceful degradation, logged) rather than failing the request.

## Plugging in real paid providers later

Each entry in `src/config/endpoints.js` only needs: an id, a cost-per-
million-tokens, an expected latency, and a quality score. To add a real
paid provider (OpenAI, Anthropic, etc.):

1. Add an entry with `kind: "cloud"` and its real pricing/latency/quality.
2. In `src/lib/router.js`, add a branch next to `callOllama()` that calls
   the real provider's API with the real API key (read from an env var,
   never hard-coded).
3. Nothing else changes — scoring, constraints, logging, and the demo all
   work against the new endpoint automatically.

## Cost-savings methodology

The baseline used for comparison (`BASELINE_ENDPOINT_ID` in
`endpoints.js`) is "always use the premium cloud tier for every request" —
a common naive default for teams that haven't built routing logic. The
demo reports `(baseline total cost - routed total cost) / baseline total cost`
as the savings percentage. Because the sample requests intentionally range
from trivial to complex, actual savings will vary with real traffic mix —
this is meant to demonstrate the mechanism, not to claim a fixed number for
all workloads.
