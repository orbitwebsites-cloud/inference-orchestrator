import pyttsx3
import os
import wave
import contextlib
import json

SEGMENTS = [
    ("01_intro", "Inference Orchestrator is an auto scaling L L M request router, built for the AI Infra Summit Hackathon. Most apps hard-wire a single model provider for every request, wasting money and latency. This router scores a pool of model endpoints on cost, latency, and quality, and picks the best fit for each request. No paid or gated AP I keys are used anywhere in this project."),
    ("02_endpoints", "The endpoint pool mixes three free local models served through Ollama, and two clearly labeled simulated cloud tiers, modeled on real provider pricing and latency. Here is the configuration."),
    ("03_scoring", "For every request, each candidate endpoint is scored using min-max normalized cost, latency, and quality, combined into a weighted composite score. Hard constraints, like minimum quality or maximum latency, filter the pool before scoring happens."),
    ("04_liverequest", "Let's start the router and send it a real request with a quality constraint, and see which endpoint wins."),
    ("05_batchdemo", "Now let's run the batch demo: twelve varied requests through the router, compared against a naive baseline of always using the premium cloud tier."),
    ("06_closing", "Every routing decision is logged for full auditability. Swapping a simulated cloud tier for a real paid provider later is a single config entry plus one function, no changes needed to the scoring or logging logic. Thanks for watching."),
]

OUT_DIR = os.path.join(os.path.dirname(__file__), "narration")
os.makedirs(OUT_DIR, exist_ok=True)

engine = pyttsx3.init()
engine.setProperty("rate", 165)
voices = engine.getProperty("voices")
# Prefer Zira (index 1) if present, else default
for v in voices:
    if "ZIRA" in v.id.upper():
        engine.setProperty("voice", v.id)
        break

durations = {}
for name, text in SEGMENTS:
    path = os.path.join(OUT_DIR, f"{name}.wav")
    engine.save_to_file(text, path)
engine.runAndWait()

for name, text in SEGMENTS:
    path = os.path.join(OUT_DIR, f"{name}.wav")
    with contextlib.closing(wave.open(path, 'r')) as f:
        frames = f.getnframes()
        rate = f.getframerate()
        dur = frames / float(rate)
    durations[name] = round(dur, 2)

with open(os.path.join(OUT_DIR, "durations.json"), "w") as f:
    json.dump(durations, f, indent=2)

print(json.dumps(durations, indent=2))
