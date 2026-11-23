/* Apex Dash · API local
 * Um middleware no estilo Connect (req, res, next) usado em três lugares:
 *   - npm run dev      (vite.config.js → configureServer)
 *   - npm run preview  (vite.config.js → configurePreviewServer)
 *   - node server.js
 * Na Vercel quem responde é api/sala.js, com as mesmas regras de lib/sala.js.
 *
 *   /api/sala   salas, comandos e estado do painel (ver lib/sala.js)
 *   /api/rede   só no PC: endereços desta máquina na rede, para o QR do celular
 */
import os from "node:os";
import { handle, readBody, getStore } from "./sala.js";

/* endereços IPv4 da rede local, os mais prováveis (Wi-Fi de casa ou da faculdade) primeiro */
export function lanUrls(port) {
  const ips = [];
  for (const [name, list] of Object.entries(os.networkInterfaces()))
    for (const a of list || [])
      if (a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254.")) ips.push({ ip: a.address, name });
  const virtual = /vEthernet|VirtualBox|VMware|WSL|docker|br-|veth|Hyper-V|utun|tailscale|zerotier/i;
  const score = x => (virtual.test(x.name) ? 10 : 0) + (x.ip.startsWith("192.168.") ? 0 : x.ip.startsWith("10.") ? 1 : 2);
  return ips.sort((a, b) => score(a) - score(b)).map(x => "http://" + x.ip + ":" + port + "/");
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

export function apiMiddleware() {
  return async function apexApi(req, res, next) {
    const url = new URL(req.url || "/", "http://local");
    if (url.pathname === "/api/rede") {
      const port = req.socket && req.socket.localPort;
      return send(res, 200, { port, urls: lanUrls(port), store: getStore().kind });
    }
    if (url.pathname !== "/api/sala") return next();
    try {
      const body = req.method === "POST" ? await readBody(req) : null;
      const out = await handle({ method: req.method, query: Object.fromEntries(url.searchParams), body });
      send(res, out.status, out.json);
    } catch (e) {
      send(res, 500, { erro: "Falha no servidor: " + e.message });
    }
  };
}
