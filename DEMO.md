# Demo Script (for the submission video)

Target length: 2-3 minutes.

## 1. Problem framing (20s)

- "Apps that call LLMs almost always hard-wire one provider for every
  request. That's expensive and wasteful — a one-word translation doesn't
  need a frontier model."
- Show `src/config/endpoints.js` briefly: 5 endpoints, each with a
  cost/latency/quality profile — 3 free local models, 2 simulated cloud
  tiers (explicitly labeled SIMULATED, no paid keys used anywhere).

## 2. Show the routing logic (30s)

- Open `src/lib/scorer.js` — explain the normalize -> weighted composite
  score -> pick winner flow in plain terms.
- Open `src/lib/router.js` — point at `filterByConstraints` (hard
  constraints like `minQuality`/`maxLatencyMs`) and `routeRequest` (the
  full pipeline: filter -> score -> execute -> log).

## 3. Live run: single request via API (30s)

```bash
npm start
```

In another terminal:

```bash
curl -X POST http://localhost:8787/route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What'\''s the capital of Peru?", "maxLatencyMs": 300}'
```

- Point out the response: which endpoint won, the full scored candidate
  breakdown (why it won over the others), estimated cost vs baseline cost.
- Run a second request with a high `minQuality` (e.g. 0.85) and show it
  routes to a different, higher-quality endpoint — proving the constraint
  logic actually changes behavior, not just cost-minimizing blindly.

## 4. Batch demo + cost savings (45s)

```bash
npm run demo
```

- Show the printed table: 12 varied requests, each with its chosen
  endpoint, latency, cost, and savings vs baseline.
- Show the summary block: total cost (routed) vs total cost (naive
  baseline = always premium tier), savings %, routing distribution across
  the 4 endpoints (proves it's not just always picking the cheapest one —
  it adapts per request).
- Open `logs/routing-log.jsonl` briefly to show every decision is logged
  with full audit detail (not just a black box).

## 5. Real local model tie-in (optional, 20s)

If Ollama is installed and models are pulled:

```bash
OLLAMA_ENABLED=1 npm run demo
```

- Point out `usedRealOllama: true` in a log entry — this is a real local
  model call, not a simulation, proving the orchestration layer works
  against real inference, not just fake numbers.

## 6. Close: path to production (15s)

- "Swapping a simulated cloud tier for a real paid provider (OpenAI,
  Anthropic, Groq, etc.) is a config entry + one function — the scoring,
  constraint filtering, and logging don't change." Point at the "Plugging
  in real paid providers later" section of the README.
- Restate the constraint honestly: this demo proves the *routing decision
  engine* works correctly under realistic cost/latency/quality tradeoffs,
  using local + simulated endpoints because the hackathon rules disallow
  paid API keys.

## Things to have open/ready before recording

- Terminal 1: ready to run `npm start`
- Terminal 2: ready to run the `curl` commands and `npm run demo`
- Editor: `src/config/endpoints.js`, `src/lib/scorer.js`, `src/lib/router.js` open in tabs
- (optional) Ollama running with `tinyllama`, `phi3:mini`, `llama3.1:8b` pulled
