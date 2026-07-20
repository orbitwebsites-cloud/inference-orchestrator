import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "routing-log.jsonl");

let dirReady = false;
async function ensureDir() {
  if (dirReady) return;
  await mkdir(LOG_DIR, { recursive: true });
  dirReady = true;
}

export async function logDecision(record) {
  await ensureDir();
  const line = JSON.stringify({ ts: new Date().toISOString(), ...record });
  await appendFile(LOG_FILE, line + "\n", "utf8");
}

export function logPath() {
  return LOG_FILE;
}
