// Serves docs/ at http://127.0.0.1:8080/ to look at the built site. `node tools/serve.mjs [port]`
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const docs = join(fileURLToPath(new URL("..", import.meta.url)), "docs");
const port = Number(process.argv[2] ?? 8080);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".txt": "text/plain; charset=utf-8" };

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (path.includes("..")) return res.writeHead(400).end();
  let file = join(docs, path);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404, { "content-type": types[".html"] }).end(await readFile(join(docs, "404.html")));
  }
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}/`));
