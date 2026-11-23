/* Servidor sem Vite: node server.js
 *   - se existir dist/ (depois de npm run build), serve a versão final → usado no Render;
 *   - senão, serve os arquivos-fonte direto (funciona até sem npm install).
 * A API é a mesma do Vite (lib/api-middleware.js).
 */
import http from "node:http";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { apiMiddleware, lanUrls } from "./lib/api-middleware.js";
import { getStore } from "./lib/sala.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");
const BUILT = existsSync(path.join(DIST, "index.html"));
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
  ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8"
};

/* sem dist/: só as páginas, src/ e public/ ficam visíveis (nunca lib/, .env etc.) */
function candidates(p) {
  if (BUILT) return [path.join(DIST, p)];
  if (/^\/[\w-]+\.html$/.test(p)) return [path.join(ROOT, p)];
  if (p.startsWith("/src/")) return [path.join(ROOT, p)];
  return [path.join(ROOT, "public", p)];
}

const api = apiMiddleware();
const server = http.createServer((req, res) => {
  api(req, res, async () => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      for (const file of candidates(p)) {
        const norm = path.normalize(file);
        if (!norm.startsWith(ROOT + path.sep)) break;
        try {
          const data = await fs.readFile(norm);
          res.writeHead(200, { "Content-Type": TYPES[path.extname(norm)] || "application/octet-stream", "Cache-Control": "no-cache" });
          return res.end(data);
        } catch {}
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Não encontrado");
    } catch (e) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Erro: " + e.message);
    }
  });
});

server.listen(PORT, () => {
  console.log("\nApex Dash (" + (BUILT ? "versão final, dist/" : "arquivos-fonte") + ") · armazenamento: " + getStore().kind + "\n");
  console.log("  Controle (PC):  http://localhost:" + PORT + "/controle.html");
  for (const u of lanUrls(PORT)) console.log("  Na rede:        " + u + "   (celular no mesmo Wi-Fi)");
  console.log("\nCtrl+C para parar.\n");
});
