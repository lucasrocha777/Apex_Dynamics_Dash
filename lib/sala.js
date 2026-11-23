/* Apex Dash · backend da "sala"
 *
 * Uma sala liga um controle (PC) a um ou mais painéis (celular), pelo código de 4 letras.
 *   POST /api/sala?code=K7Q2&op=cmd     o controle envia um comando  { t:"cmd", a:"sim", v:"oil" }
 *   POST /api/sala?code=K7Q2&op=status  o painel publica seu estado  { t:"st", alerts:[...] }
 *   GET  /api/sala?code=K7Q2&op=poll&since=N
 *        devolve { seq, cmds:[{seq,m}], status, now, store }  com os comandos de número > N.
 *        since=-1 devolve só o número atual (um painel recém-aberto não repete comandos antigos).
 *
 * Armazenamento:
 *   - Redis da Upstash (Vercel), se existirem KV_REST_API_URL/KV_REST_API_TOKEN
 *     ou UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN;
 *   - senão, memória do processo (npm run dev, npm run preview, node server.js, Render...).
 */

const TTL = 6 * 3600;      // a sala some 6 h depois do último uso
const MAX_CMDS = 50;       // guarda só os últimos comandos
const MAX_BODY = 6000;     // bytes

export function cleanCode(c) {
  c = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length >= 3 && c.length <= 8 ? c : "";
}

/* ---------- memória ---------- */
const mem = new Map();
function room(code) {
  const now = Date.now();
  for (const [k, r] of mem) if (r.exp < now) mem.delete(k);
  let r = mem.get(code);
  if (!r) { r = { seq: 0, cmds: [], status: null, exp: 0 }; mem.set(code, r); }
  r.exp = now + TTL * 1000;
  return r;
}
const memoryStore = {
  kind: "memoria",
  async push(code, m) {
    const r = room(code);
    r.seq += 1;
    r.cmds.push({ seq: r.seq, m });
    if (r.cmds.length > MAX_CMDS) r.cmds.shift();
    return r.seq;
  },
  async setStatus(code, st) { room(code).status = st; },
  async poll(code, since, withCmds) {
    const r = room(code);
    return { seq: r.seq, cmds: withCmds && since >= 0 ? r.cmds.filter(c => c.seq > since) : [], status: r.status };
  }
};

/* ---------- Redis (Upstash, via REST: sem dependências) ---------- */
function redisStore(url, token) {
  url = url.replace(/\/+$/, "");
  async function pipe(cmds) {
    const r = await fetch(url + "/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(cmds)
    });
    if (!r.ok) throw new Error("Redis HTTP " + r.status);
    const out = await r.json();
    return out.map(x => { if (x.error) throw new Error("Redis: " + x.error); return x.result; });
  }
  const K = code => ({ seq: "apex:" + code + ":seq", list: "apex:" + code + ":cmds", st: "apex:" + code + ":st" });
  return {
    kind: "redis",
    async push(code, m) {
      const k = K(code);
      const [seq] = await pipe([["INCR", k.seq], ["EXPIRE", k.seq, TTL]]);
      await pipe([
        ["RPUSH", k.list, JSON.stringify({ seq, m })],
        ["LTRIM", k.list, -MAX_CMDS, -1],
        ["EXPIRE", k.list, TTL]
      ]);
      return seq;
    },
    async setStatus(code, st) {
      await pipe([["SET", K(code).st, JSON.stringify(st), "EX", TTL]]);
    },
    async poll(code, since, withCmds) {
      const k = K(code);
      const want = withCmds && since >= 0;
      const res = await pipe(want ? [["GET", k.seq], ["GET", k.st], ["LRANGE", k.list, 0, -1]] : [["GET", k.seq], ["GET", k.st]]);
      const seq = Number(res[0] || 0);
      let status = null;
      try { status = res[1] ? JSON.parse(res[1]) : null; } catch (e) {}
      let cmds = [];
      if (want) {
        cmds = (res[2] || []).map(s => { try { return JSON.parse(s); } catch (e) { return null; } })
          .filter(c => c && c.seq > since)
          .sort((a, b) => a.seq - b.seq);
      }
      return { seq, cmds, status };
    }
  };
}

/* escolhido no primeiro uso, depois que o Vite (ou a Vercel) já carregou as variáveis do .env */
let chosen = null;
export function getStore() {
  if (!chosen) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const tok = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    chosen = url && tok ? redisStore(url, tok) : memoryStore;
  }
  return chosen;
}

/* ---------- regras da API (iguais na Vercel e no server.js) ---------- */
export async function handle({ method, query, body }) {
  const code = cleanCode(query.code);
  if (!code) return { status: 400, json: { erro: "Código de sala inválido." } };
  const op = query.op || (method === "GET" ? "poll" : "");

  if (method === "GET" && op === "poll") {
    const since = Number.isFinite(+query.since) ? +query.since : -1;
    const store = getStore();
    const r = await store.poll(code, since, query.cmds !== "0");
    return { status: 200, json: { ...r, now: Date.now(), store: store.kind } };
  }

  if (method === "POST" && (op === "cmd" || op === "status")) {
    let m = body;
    if (typeof m === "string") { try { m = JSON.parse(m); } catch (e) { m = null; } }
    if (!m || typeof m !== "object" || Array.isArray(m)) return { status: 400, json: { erro: "Corpo JSON inválido." } };
    if (JSON.stringify(m).length > MAX_BODY) return { status: 413, json: { erro: "Mensagem grande demais." } };
    if (op === "cmd") {
      if (m.t !== "cmd" && m.t !== "ping") return { status: 400, json: { erro: "Comando desconhecido." } };
      const seq = await getStore().push(code, m);
      return { status: 200, json: { ok: true, seq } };
    }
    if (m.t !== "st") return { status: 400, json: { erro: "Estado inválido." } };
    m.at = Date.now();
    await getStore().setStatus(code, m);
    return { status: 200, json: { ok: true } };
  }

  return { status: 405, json: { erro: "Operação não suportada." } };
}

/* lê o corpo de uma requisição Node (no server.js; na Vercel o corpo já vem em req.body) */
export function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, chunks = [];
    req.on("data", c => { size += c.length; if (size > MAX_BODY * 2) { reject(new Error("grande")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
