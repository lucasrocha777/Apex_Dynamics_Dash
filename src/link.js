/* Apex Dash · ligação entre o controle (PC) e o painel (celular)
 *
 * Fala com o backend deste mesmo site (/api/sala):
 *   - o painel consulta /api/sala?op=poll a cada 0,4 s e executa os comandos novos;
 *   - o controle envia comandos com POST e consulta o estado do painel a cada 1 s.
 * Na mesma máquina (o espelho dentro do controle, ou duas abas) as mensagens também
 * vão por BroadcastChannel, na hora e sem internet.
 */
var ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem 0/O, 1/I/L
function make() {
  var s = "";
  for (var i = 0; i < 4; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}
function clean(r) {
  r = String(r || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return r.length >= 3 ? r : "";
}
function fromPage() {
  var m = /(?:^|[#&?])sala=([A-Za-z0-9]+)/.exec(location.hash + "&" + location.search);
  var r = m ? clean(m[1]) : "";
  if (!r) { try { r = clean(localStorage.getItem("apexdash.sala")); } catch (e) {} }
  return r;
}
function save(r) { try { localStorage.setItem("apexdash.sala", r); } catch (e) {} }
/* ?api=https://outro-site permite hospedar a página num lugar e o backend em outro */
function apiBase() {
  var m = /[?&]api=([^&#]+)/.exec(location.search);
  return m ? decodeURIComponent(m[1]).replace(/\/+$/, "") : "";
}

function ApexLink(opt) {
  var room = opt.room, role = opt.role, useNet = opt.net !== false;
  var url = apiBase() + "/api/sala?code=" + encodeURIComponent(room);
  var every = opt.every || (role === "painel" ? 400 : 1000);
  var me = Math.random().toString(36).slice(2, 8), n = 0, seen = {}, seenQ = [];
  var seq = -1, state = "", fails = 0, timer = null, closed = false, bc = null;
  var info = { store: "", lag: 0, skew: 0 };

  function setState(s) { if (s !== state) { state = s; if (opt.onState) opt.onState(s, info); } }
  function handle(m, via) {
    if (!m || typeof m !== "object" || m.from === me || !m.k || seen[m.k]) return;
    seen[m.k] = 1; seenQ.push(m.k);
    if (seenQ.length > 400) delete seen[seenQ.shift()];
    if (opt.onMsg) opt.onMsg(m, via, info);
  }
  try {
    bc = new BroadcastChannel("apexdash-" + room);
    bc.onmessage = function (e) { handle(e.data, "local"); };
  } catch (e) { bc = null; }

  function tick() {
    if (closed) return;
    var t0 = Date.now();
    fetch(url + "&op=poll&since=" + seq + (role === "painel" ? "" : "&cmds=0"), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        info.store = j.store; info.lag = Date.now() - t0; info.skew = j.now - (t0 + info.lag / 2);
        fails = 0; setState("online");
        if (seq >= 0 && j.cmds) j.cmds.forEach(function (c) { handle(c.m, "net"); });
        if (typeof j.seq === "number") seq = j.seq;
        if (j.status) { j.status.age = j.now - (j.status.at || j.now); handle(j.status, "net"); if (opt.onStatusAge) opt.onStatusAge(j.status.age, j.status); }
      })
      .catch(function () { fails++; setState("offline"); })
      .then(function () {
        if (closed) return;
        var wait = document.hidden ? 4000 : every * (fails ? Math.min(10, 1 + fails) : 1);
        timer = setTimeout(tick, wait);
      });
  }

  function send(m) {
    m.k = me + "-" + (++n); m.from = me; m.role = role; m.ts = Date.now();
    if (bc) { try { bc.postMessage(m); } catch (e) {} }
    if (!useNet) return Promise.resolve(true);
    return fetch(url + "&op=" + (m.t === "st" ? "status" : "cmd"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m), cache: "no-store"
    }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); setState("online"); return true; })
      .catch(function () { setState("offline"); return false; });
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && useNet && !closed) { clearTimeout(timer); tick(); }
  });

  if (useNet) tick(); else setState("local");
  /* só para esta máquina (ex.: acertar o espelho), sem passar pelo servidor */
  function local(m) {
    m.k = me + "-" + (++n); m.from = me; m.role = role; m.ts = Date.now();
    if (bc) { try { bc.postMessage(m); } catch (e) {} }
  }

  return {
    room: room, id: me, send: send, local: local, info: info,
    state: function () { return state; },
    close: function () { closed = true; clearTimeout(timer); if (bc) bc.close(); }
  };
}

export const ApexRoom = { make, clean, fromPage, save };
export { ApexLink };
