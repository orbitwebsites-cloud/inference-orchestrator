# Offline terminal-frame renderer for DEMO_VIDEO.mp4.
#
# Renders each demo "scene" as a PNG using Pillow only -- no screen capture,
# no browser, no live desktop involved at any point. Content embedded here
# is either static narration/explainer text (matching DEMO.md) or the real
# captured output of actually running the project's commands (see
# demo_assets/captures/*.txt|json, produced by genuinely running
# `node ...`, `curl ...`, and `npm run demo`).

import json
import os
import textwrap

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(__file__)
CAPTURES = os.path.join(HERE, "captures")
FRAMES = os.path.join(HERE, "frames")
os.makedirs(FRAMES, exist_ok=True)

W, H = 1920, 1080
BG = (13, 17, 23)
HEADER_BG = (22, 27, 34)
FG = (198, 205, 216)
DIM = (110, 118, 129)
YELLOW = (229, 192, 123)
CYAN = (86, 182, 194)
GREEN = (152, 195, 121)
RED = (224, 108, 117)
WHITE = (240, 240, 245)

FONT_DIR = "C:/Windows/Fonts"
def font(size, bold=False):
    name = "CascadiaMono.ttf" if not bold else "consolab.ttf"
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)

F_TITLEBAR = font(20)
F_BANNER = font(34, bold=True)
F_BODY = font(24)
F_BODY_SMALL = font(19)
F_MONO_WIDE = font(17)


def new_canvas(title="PS D:\\Hackathons2026\\inference-orchestrator>"):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # title bar
    d.rectangle([0, 0, W, 46], fill=HEADER_BG)
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([24 + i * 28, 15, 24 + i * 28 + 16, 31], fill=c)
    d.text((120, 12), title, font=F_TITLEBAR, fill=DIM)
    return img, d


def banner(d, y, text):
    line = "=" * 96
    d.text((60, y), line, font=F_BODY_SMALL, fill=CYAN)
    d.text((60, y + 30), text, font=F_BANNER, fill=YELLOW)
    d.text((60, y + 78), line, font=F_BODY_SMALL, fill=CYAN)
    return y + 130


def body_lines(d, y, lines, fnt=F_BODY, fill=FG, x=60, lh=36):
    for line in lines:
        d.text((x, y), line, font=fnt, fill=fill)
        y += lh
    return y


def save(img, name):
    path = os.path.join(FRAMES, name)
    img.save(path)
    print("wrote", path)


# ---------------------------------------------------------------------
# Scene 1: intro
# ---------------------------------------------------------------------
img, d = new_canvas()
y = 90
line = "=" * 96
d.text((60, y), line, font=F_BODY_SMALL, fill=CYAN)
d.text((60, y + 34), "INFERENCE ORCHESTRATOR", font=font(56, bold=True), fill=YELLOW)
d.text((60, y + 100), "Cost / Latency / Quality Aware LLM Request Router", font=font(30), fill=WHITE)
d.text((60, y + 148), line, font=F_BODY_SMALL, fill=CYAN)
y2 = y + 210
body_lines(d, y2, [
    "Built for the AI Infra Summit Hackathon (lablab.ai)",
    "",
    "Most apps hard-wire a single model provider for every request --",
    "wasting money and latency on requests that don't need it.",
    "",
    "This router scores a pool of model endpoints on cost, latency,",
    "and quality, and picks the best fit for each individual request.",
], fnt=font(26), fill=FG, lh=42)
d.text((60, 900), "No paid or gated API keys are used anywhere in this project.", font=font(24), fill=GREEN)
d.text((60, 1000), "github.com/orbitwebsites-cloud/inference-orchestrator", font=font(22), fill=DIM)
save(img, "01_intro.png")

# ---------------------------------------------------------------------
# Scene 2: endpoint pool (real captured output)
# ---------------------------------------------------------------------
with open(os.path.join(CAPTURES, "endpoints.txt"), encoding="utf-8") as f:
    endpoint_lines = [l.rstrip("\n") for l in f.readlines()]

img, d = new_canvas()
y = banner(d, 70, "1) Endpoint pool: 3 free local models (Ollama) + 2 SIMULATED cloud tiers")
y += 20
d.text((60, y), "$ node --input-type=module -e \"...print ENDPOINTS...\"", font=F_BODY_SMALL, fill=DIM)
y += 50
for line in endpoint_lines:
    color = GREEN if line.startswith("local-") else CYAN
    d.text((60, y), line, font=F_MONO_WIDE, fill=color)
    y += 40
y += 40
body_lines(d, y, [
    "Local endpoints: real free models via Ollama (cost $0, your own hardware).",
    "Simulated cloud tiers: clearly labeled, modeled on real provider pricing --",
    "no paid or gated API is ever called.",
], fnt=font(22), fill=DIM, lh=34)
save(img, "02_endpoints.png")

# ---------------------------------------------------------------------
# Scene 3: scoring logic
# ---------------------------------------------------------------------
img, d = new_canvas()
y = banner(d, 70, "2) Scoring: normalize(cost, latency, quality) -> weighted composite -> pick best")
y += 30
y = body_lines(d, y, [
    "costScore    = 1 - normalized(costPerMTokUsd)    (cheaper wins)",
    "latencyScore = 1 - normalized(expectedLatencyMs)  (faster wins)",
    "qualityScore = normalized(quality)                (better wins)",
], fnt=F_MONO_WIDE, fill=FG, lh=42)
y += 20
y = body_lines(d, y, [
    "composite = 0.4 * costScore + 0.3 * latencyScore + 0.3 * qualityScore",
    "            (weights are overridable per request)",
], fnt=F_MONO_WIDE, fill=YELLOW, lh=42)
y += 30
body_lines(d, y, [
    "Hard constraints -- minQuality, maxLatencyMs -- filter the candidate",
    "pool BEFORE scoring. If a constraint would eliminate every candidate,",
    "it's dropped (graceful degradation) rather than failing the request.",
], fnt=font(24), fill=DIM, lh=38)
save(img, "03_scoring.png")

# ---------------------------------------------------------------------
# Scene 4: live single request (real captured curl + JSON)
# ---------------------------------------------------------------------
with open(os.path.join(CAPTURES, "live_request.json"), encoding="utf-8") as f:
    live = json.load(f)

img, d = new_canvas()
y = banner(d, 60, "3) Live request: quality-constrained routing decision")
y += 10
d.text((60, y), "$ curl -X POST http://localhost:8787/route -d @request.json", font=F_BODY_SMALL, fill=DIM)
y += 30
d.text((60, y), '  request.json: {"prompt":"Explain the CAP theorem...","minQuality":0.8}', font=F_BODY_SMALL, fill=DIM)
y += 60

# Curated (not truncated-by-accident) subset of the real response --
# the full raw JSON doesn't fit on one frame at a readable size.
rows = [
    ("prompt", live["prompt"], FG),
    ("constraints.minQuality", live["constraints"]["minQuality"], FG),
    ("", "", FG),
    ("chosenEndpointId", live["chosenEndpointId"], GREEN),
    ("chosenEndpointLabel", live["chosenEndpointLabel"], GREEN),
    ("", "", FG),
    ("candidates considered", str(len(live["candidates"])), FG),
]
for c in live["candidates"]:
    rows.append((f"  -> {c['id']}", f"composite={c['composite']}  cost={c['costScore']}  latency={c['latencyScore']}  quality={c['qualityScore']}", CYAN))
rows += [
    ("", "", FG),
    ("estimatedCostUsd", f"${live['estimatedCostUsd']:.6f}", YELLOW),
    ("baselineCostUsd", f"${live['baselineCostUsd']:.6f}  (baseline: {live['baselineEndpointId']})", YELLOW),
    ("savingsUsd", f"${live['savingsUsd']:.6f}", YELLOW),
    ("actualLatencyMs", live["actualLatencyMs"], FG),
]

label_font = F_BODY
for label, value, color in rows:
    if not label and not value:
        y += 16
        continue
    if label.startswith("  ->"):
        d.text((60, y), label, font=F_MONO_WIDE, fill=CYAN)
        d.text((520, y), str(value), font=F_MONO_WIDE, fill=FG)
    else:
        d.text((60, y), f"{label}:", font=label_font, fill=DIM)
        d.text((520, y), str(value), font=label_font, fill=color)
    y += 44
save(img, "04_liverequest.png")

# ---------------------------------------------------------------------
# Scene 5: batch demo (real captured npm run demo output)
# ---------------------------------------------------------------------
with open(os.path.join(CAPTURES, "batch_demo.txt"), encoding="utf-8") as f:
    batch_lines = [l.rstrip("\n") for l in f.readlines()]

# trim the npm/node preamble lines, keep from "Running 12 requests" onward
start_idx = 0
for i, l in enumerate(batch_lines):
    if l.startswith("Running"):
        start_idx = i
        break
batch_lines = batch_lines[start_idx:]

img, d = new_canvas()
y = banner(d, 40, "4) Batch demo: 12 varied requests vs naive single-provider baseline")
y += 10
d.text((60, y), "$ npm run demo", font=F_BODY_SMALL, fill=DIM)
y += 34

for line in batch_lines:
    if not line.strip():
        y += 12
        continue
    color = FG
    if line.strip().startswith("---"):
        color = CYAN
    elif line.strip().startswith("Total savings"):
        color = GREEN
    elif "Routing distribution" in line or line.strip().startswith('"'):
        color = YELLOW
    elif line.strip().startswith("Total requests") or line.strip().startswith("Avg latency"):
        color = FG
    d.text((60, y), line, font=F_MONO_WIDE, fill=color)
    y += 25
    if y > 1040:
        break
save(img, "05_batchdemo.png")

# ---------------------------------------------------------------------
# Scene 6: closing
# ---------------------------------------------------------------------
img, d = new_canvas()
y = banner(d, 90, "Every decision is logged to logs/routing-log.jsonl for full auditability")
y += 40
y = body_lines(d, y, [
    "Swapping a simulated cloud tier for a real paid provider later is a",
    "single config entry + one function -- scoring and logging don't change.",
], fnt=font(26), fill=DIM, lh=42)
y += 60
d.text((60, y), "github.com/orbitwebsites-cloud/inference-orchestrator", font=font(30, bold=True), fill=GREEN)
y += 100
d.text((60, y), "Thanks for watching.", font=font(28), fill=WHITE)
save(img, "06_closing.png")

print("done")
