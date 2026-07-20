# lablab.ai Submission Draft

**Event:** AI Infra Summit Hackathon
**Link:** https://lablab.ai/ai-hackathons/ai-infra-summit-hackathon
**Deadline:** Sep 17, 2026
**Account:** rrus3676@gmail.com

> Draft only — not submitted. Review/edit, then submit manually on lablab.ai.

---

## Title

**Inference Orchestrator: Cost-Aware Auto-Scaling LLM Router**

## Description (for the submission form)

Most applications hard-wire a single LLM provider for every request,
regardless of whether the task is a one-word translation or a complex
technical explanation — leaving significant cost and latency on the table.
Inference Orchestrator is a lightweight, dependency-free routing service
that scores a pool of candidate model endpoints on cost, latency, and
quality for every incoming request, then routes to the best fit under
optional hard constraints (minimum quality, maximum latency). The scoring
and selection logic is fully implemented and testable end-to-end: a batch
demo runs 12 varied sample requests through the router and reports total
cost against a naive "always use the premium provider" baseline, along
with a full per-request decision log for auditability.

Built under a strict zero-paid-API-key constraint, the demo endpoint pool
combines real free local models (served via Ollama) with clearly-labeled
simulated cloud-tier profiles modeled on real provider pricing/latency
tiers — so the orchestration logic is demonstrated against real inference
where possible, and realistic simulated inference elsewhere, without ever
touching a gated or paid API. The architecture is designed so that
plugging in a real paid provider (OpenAI, Anthropic, Groq, etc.) later is
a single config entry plus one function, with zero changes needed to the
scoring, constraint-filtering, or logging layers.

## Tags

`llm-routing` `inference-optimization` `cost-optimization` `open-source`
`ollama` `infra` `orchestration` `mlops`

## Notes for whoever submits

- Confirm final prize/track details on the event page before submitting
  (listed as TBA/Summit-backed as of this draft).
- Attach/link the demo video following `DEMO.md`.
- Link the GitHub repo (push `inference-orchestrator` before submitting).
