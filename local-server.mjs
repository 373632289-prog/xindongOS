import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { onRequestPost } from "./functions/api/visual-intent.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4274);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".toml": "text/plain; charset=utf-8",
};

async function loadEnvFile() {
  const path = join(root, ".dev.vars");
  if (!existsSync(path)) return {};
  const text = await readFile(path, "utf8");
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function requestFromNode(req, body) {
  return new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body,
  });
}

function sendResponse(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  response.arrayBuffer().then((buffer) => res.end(Buffer.from(buffer)));
}

createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/visual-intent") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const env = { ...process.env, ...(await loadEnvFile()) };
      const response = await onRequestPost({
        request: requestFromNode(req, Buffer.concat(chunks)),
        env,
      });
      sendResponse(res, response);
      return;
    }

    const url = new URL(req.url || "/", `http://localhost:${port}`);
    const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
    const fullPath = join(root, safePath);
    if (!fullPath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const data = await readFile(fullPath);
    res.writeHead(200, { "Content-Type": contentTypes[extname(fullPath)] || "application/octet-stream" });
    res.end(data);
  } catch (error) {
    res.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error.code === "ENOENT" ? "Not found" : error.message);
  }
}).listen(port, () => {
  console.log(`xindongOS local model server: http://localhost:${port}`);
});
