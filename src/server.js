import { createServer } from "node:http";
import { routeRequest } from "./lib/router.js";
import { ENDPOINTS } from "./config/endpoints.js";

const PORT = process.env.PORT || 8787;

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/endpoints") {
      return sendJson(res, 200, ENDPOINTS);
    }

    if (req.method === "POST" && req.url === "/route") {
      const body = await readBody(req);
      const result = await routeRequest(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "GET" && req.url === "/health") {
      return sendJson(res, 200, { status: "ok" });
    }

    sendJson(res, 404, { error: "not found" });
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`inference-orchestrator router listening on http://localhost:${PORT}`);
  console.log(`POST /route   { "prompt": "...", "maxLatencyMs": 500, "minQuality": 0.7 }`);
  console.log(`GET  /endpoints`);
});
