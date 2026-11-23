/* Função da Vercel: /api/sala  (as regras ficam em lib/sala.js) */
import { handle, readBody } from "../lib/sala.js";

export default async function sala(req, res) {
  try {
    const url = new URL(req.url, "http://x");
    const query = Object.fromEntries(url.searchParams);
    let body = null;
    if (req.method === "POST") body = req.body !== undefined ? req.body : await readBody(req);
    const out = await handle({ method: req.method, query, body });
    res.statusCode = out.status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(out.json));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ erro: "Falha no servidor: " + e.message }));
  }
}
