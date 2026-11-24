/* Apex Dash v2 · controle remoto (PC) */
import { ApexLink, ApexRoom } from "./link.js";

{
const $ = s => document.querySelector(s);
const SYM = {
  water:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="21" y="5" width="6" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><line x1="27" y1="11" x2="33" y2="11" stroke="currentColor" stroke-width="3"/><line x1="27" y1="18" x2="33" y2="18" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="30" r="4.5" fill="currentColor"/><path d="M5 37 q4.75 -5 9.5 0 t9.5 0 t9.5 0 t9.5 0" fill="none" stroke="currentColor" stroke-width="3"/><path d="M5 44 q4.75 -5 9.5 0 t9.5 0 t9.5 0 t9.5 0" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
  oil:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 20 h22 l6 -4 l9 3 l-12 14 H12 a4 4 0 0 1 -4 -4 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M14 20 v-5 h8 v5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M3 24 l5 -2" stroke="currentColor" stroke-width="3"/><path d="M43 36 q2 4 0 6 q-2 -2 0 -6 Z" fill="currentColor"/></svg>',
  boost:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="22" cy="26" r="15" fill="none" stroke="currentColor" stroke-width="3"/><path d="M22 26 m0 -8 a8 8 0 1 1 -8 8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M33 15 l10 -8 M37 7 h6 v6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  fuel:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="6" width="20" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="12" y="10" width="12" height="9" fill="currentColor"/><path d="M28 18 h5 a3 3 0 0 1 3 3 v14 a3 3 0 0 0 6 0 V16 l-5 -6" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><line x1="5" y1="42" x2="31" y2="42" stroke="currentColor" stroke-width="3"/></svg>'
};
const LV = {
  1:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="10.8" y="10" width="2.4" height="7.5" fill="currentColor"/><circle cx="12" cy="6.8" r="1.6" fill="currentColor"/></svg>',
  2:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 L23 21.5 H1 Z" fill="currentColor"/><rect x="10.8" y="8.5" width="2.4" height="7" fill="#FFB020"/><circle cx="12" cy="18.3" r="1.5" fill="#FFB020"/></svg>',
  3:'<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="7.6,1 16.4,1 23,7.6 23,16.4 16.4,23 7.6,23 1,16.4 1,7.6" fill="#fff"/><rect x="10.7" y="5.5" width="2.6" height="9" fill="#CC2A2A"/><circle cx="12" cy="18" r="1.7" fill="#CC2A2A"/></svg>'
};
const SIMS = [
  { k:"water", key:"1", t:"Água do motor esquentando" },
  { k:"oil",   key:"2", t:"Óleo esquentando" },
  { k:"boost", key:"3", t:"Turbo acima do limite" },
  { k:"fuel",  key:"4", t:"Combustível acabando" }
];
const LABEL = { water:"Água esquentando", oil:"Óleo esquentando", boost:"Turbo acima do limite", fuel:"Combustível acabando", clear:"Voltar ao normal",
  ack:"Reconhecer alerta crítico", padrao:"Layout Padrão", corrida:"Layout Corrida", essencial:"Layout Essencial", track:"Carro em pista", parked:"Carro parado", reboot:"Religar o painel", five:"Círculo de 5°", amb:"Luz ambiente" };

$("#sims").innerHTML = SIMS.map(s => `<button class="sim" data-sim="${s.k}" type="button">${SYM[s.k]}<span>${s.t}<span class="on">ATIVO</span></span><kbd>${s.key}</kbd></button>`).join("")
  + `<button class="sim clear" data-sim="clear" type="button">Voltar ao normal<kbd>0</kbd></button>`;

/* ---------- sala e endereço ---------- */
let ROOM = ApexRoom.fromPage() || ApexRoom.make();
let link = null, lastSt = null, pings = {};
const isLocal = /^(localhost|127\.|\[::1\])/.test(location.hostname);
/* endereço que vai no QR: o do site; rodando no PC (npm run dev), o servidor informa o IP da rede */
let BASE = location.origin + location.pathname.replace(/[^/]*$/, "");
let baseTouched = false;
$("#base").value = BASE;
if (isLocal) {
  fetch("/api/rede", { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).then(j => {
    if (!j || !j.urls || !j.urls.length || baseTouched) return;
    BASE = j.urls[0]; $("#base").value = BASE; renderRoom();
    $("#netInfo").textContent = "Endereço de rede deste PC detectado." + (j.urls.length > 1 ? " Outros: " + j.urls.slice(1).join(" · ") : "");
  }).catch(() => {});
}
function dashUrl() {
  let b = BASE.trim(); if (!/^https?:\/\//i.test(b)) b = "http://" + b;
  if (!/\/$/.test(b) && !/\.html$/.test(b)) b += "/";
  return b + "#sala=" + ROOM;
}
function renderRoom() {
  $("#code").textContent = ROOM;
  const u = dashUrl();
  $("#url").textContent = u;
  const img = new Image(200, 200);
  img.alt = "QR code com o link do painel";
  img.src = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=12&data=" + encodeURIComponent(u);
  img.onerror = () => { $("#qr").innerHTML = '<p class="small">QR indisponível sem internet. Digite o link no celular.</p>'; };
  $("#qr").innerHTML = ""; $("#qr").appendChild(img);
  $("#localWarn").classList.toggle("on", /localhost|127\.0\.0\.1/.test(u));
  try { history.replaceState(null, "", location.pathname + location.search + "#sala=" + ROOM); } catch (e) {}
  if ($("#mirrorOn").checked) mountMirror();
}
function connect() {
  if (link) link.close();
  ApexRoom.save(ROOM);
  lastSt = null; renderLive(); renderDash(null);
  link = ApexLink({ room: ROOM, role: "controle", onMsg, onState, onStatusAge: age => renderDash(age) });
  renderRoom();
  setTimeout(() => ping(true), 600);
}
$("#newRoom").addEventListener("click", () => { ROOM = ApexRoom.make(); $("#codeIn").value = ""; connect(); toast("Nova sala " + ROOM + ". Abra o novo link no celular."); });
$("#codeIn").addEventListener("change", e => { const c = ApexRoom.clean(e.target.value); if (!c) { toast("Código inválido.", true); return; } ROOM = c; e.target.value = ""; connect(); toast("Usando a sala " + c + "."); });
$("#base").addEventListener("change", e => { BASE = e.target.value.trim(); baseTouched = true; renderRoom(); });
$("#copy").addEventListener("click", () => {
  const u = dashUrl();
  (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast("Link copiado."), () => toast("Não deu para copiar; selecione o link.", true));
});

/* ---------- estado da conexão ---------- */
function onState(s, info) {
  const dot = $("#pillDot"), txt = $("#pillTxt");
  dot.className = "dot " + (s === "online" ? "ok" : s === "offline" ? "bad" : "wait");
  txt.textContent = "Sala " + ROOM + " · " + (s === "online" ? "servidor ok" : s === "offline" ? "sem servidor" : "conectando…");
  if (info && info.store) {
    $("#storeTxt").textContent = "Armazenamento: " + (info.store === "redis" ? "Redis" : "memória do servidor");
    $("#memWarn").classList.toggle("on", info.store === "memoria" && /vercel\.app$/.test(location.hostname));
  }
}
function renderDash(age) {
  const dot = $("#dashDot"), txt = $("#dashTxt");
  if (!lastSt) { dot.className = "dot"; txt.textContent = "Nenhum painel nesta sala ainda"; return; }
  if (age == null) age = lastSt.age || 0;
  const s = Math.max(0, Math.round(age / 1000));
  if (s <= 20) { dot.className = "dot ok"; txt.textContent = "Painel aberto no celular" + (lastSt.on ? "" : " · na tela de abertura"); }
  else { dot.className = "dot bad"; txt.textContent = "Painel sem sinal há " + (s < 120 ? s + " s" : Math.round(s / 60) + " min") + " (celular bloqueado ou fora do ar?)"; }
}
function ping(silent) {
  const p = Math.random().toString(36).slice(2, 7);
  pings[p] = performance.now();
  link.send({ t: "ping", p }).then(ok => { if (!ok && !silent) toast("Sem conexão com o servidor.", true); });
  setTimeout(() => { if (pings[p]) { delete pings[p]; if (!silent) { $("#rtt").textContent = "Sem resposta do painel em 6 s"; } } }, 6000);
}
$("#ping").addEventListener("click", () => { $("#rtt").textContent = "Testando…"; ping(false); });

/* ---------- mensagens do painel ---------- */
function onMsg(m) {
  if (m.role !== "painel" || m.t !== "st") return;
  lastSt = m;
  if (m.pong && pings[m.pong]) {
    const ms = performance.now() - pings[m.pong]; delete pings[m.pong];
    $("#rtt").textContent = "Resposta do painel em " + (ms / 1000).toFixed(1).replace(".", ",") + " s";
  }
  renderDash(m.age); renderLive();
}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
function renderLive() {
  const st = lastSt;
  if (!st) { $("#alerts").innerHTML = '<div class="al none">Aguardando o celular…</div>'; $("#msg").textContent = ""; $("#facts").innerHTML = ""; return; }
  const a = st.alerts || [];
  $("#alerts").innerHTML = a.length
    ? a.map(x => `<div class="al l${x.lv}">${LV[x.lv] || ""}<div><b>${esc(x.t)}</b><span>${esc(x.d)}${x.ack ? " · reconhecido" : ""}</span></div></div>`).join("")
    : '<div class="al none">Sem alertas</div>';
  $("#msg").textContent = st.msg || "";
  $("#facts").innerHTML = [
    st.on ? "Ligado" : "Na tela de abertura",
    st.car === "parked" ? "Carro parado" : "Carro em pista",
    st.fs ? "Em tela cheia" : "Fora da tela cheia",
    "Layout: " + ({ padrao:"Padrão", corrida:"Corrida", essencial:"Essencial", personalizado:"personalizado" }[st.layout] || "—")
  ].map(x => "<span>" + x + "</span>").join("");
  document.querySelectorAll("[data-sim]").forEach(b => b.classList.toggle("active", !!(st.sims && st.sims[b.dataset.sim])));
  setCarUI(st.car);
  if (document.activeElement !== $("#amb") && typeof st.amb === "number") $("#amb").value = st.amb;
  $("#five").checked = !!st.five;
  document.querySelectorAll("[data-layout]").forEach(b => b.setAttribute("aria-pressed", b.dataset.layout === st.layout));
}

/* ---------- comandos ---------- */
const logItems = [];
function cmd(a, v, label) {
  const m = { t: "cmd", a };
  if (v !== undefined) m.v = v;
  const item = { at: new Date(), label: label || LABEL[v] || LABEL[a] || a, ok: null };
  logItems.unshift(item); if (logItems.length > 8) logItems.pop(); renderLog();
  return link.send(m).then(ok => { item.ok = ok; renderLog(); if (!ok) toast("Não foi enviado: sem conexão com o servidor.", true); else toast("Enviado: " + item.label); return ok; });
}
function renderLog() {
  $("#log").innerHTML = logItems.map(i => `<li><time>${i.at.toLocaleTimeString("pt-BR")}</time><span>${esc(i.label)}</span>${i.ok === false ? '<span class="x">falhou</span>' : i.ok ? "" : '<span class="small">enviando…</span>'}</li>`).join("");
}
document.addEventListener("click", e => { const b = e.target.closest("[data-sim]"); if (b) cmd("sim", b.dataset.sim); });
$("#ack").addEventListener("click", () => cmd("ack"));
function setCarUI(c) { document.querySelectorAll("#carSeg button").forEach(x => x.setAttribute("aria-pressed", x.dataset.car === c)); }
let car = "track";
$("#carSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; car = b.dataset.car; setCarUI(car); cmd("car", car); });
let ambT = 0, ambLast = 0;
$("#amb").addEventListener("input", e => { const now = Date.now(); clearTimeout(ambT);
  if (now - ambLast > 500) { ambLast = now; link.send({ t: "cmd", a: "amb", v: +e.target.value }); }
  ambT = setTimeout(() => cmd("amb", +e.target.value, "Luz ambiente em " + e.target.value + "%"), 350); });
$("#five").addEventListener("change", e => cmd("five", e.target.checked, e.target.checked ? "Mostrar círculo de 5°" : "Esconder círculo de 5°"));
$("#reboot").addEventListener("click", () => cmd("reboot"));
document.querySelectorAll("[data-layout]").forEach(b => b.addEventListener("click", () => cmd("layout", b.dataset.layout)));
document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" && e.target.type !== "checkbox" && e.target.type !== "range") return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = { "1":"water", "2":"oil", "3":"boost", "4":"fuel", "0":"clear" }[e.key];
  if (k) { e.preventDefault(); cmd("sim", k); return; }
  if (e.code === "Space") { e.preventDefault(); if (e.target.blur) e.target.blur(); cmd("ack"); return; }
  if (e.key === "p" || e.key === "P") { const now = (lastSt && lastSt.car) || car; car = now === "parked" ? "track" : "parked"; setCarUI(car); cmd("car", car); }
});

/* ---------- espelho ---------- */
function mountMirror() {
  const box = $("#mirror");
  box.innerHTML = `<iframe title="Espelho do painel" src="/?espelho=1#sala=${ROOM}"></iframe>`;
  fitMirror();
  /* o espelho nasce do zero: copia o estado que o celular informou por último */
  $("#mirror iframe").addEventListener("load", () => setTimeout(() => {
    const st = lastSt; if (!st || !link) return;
    link.local({ t: "cmd", a: "car", v: st.car });
    if (typeof st.amb === "number") link.local({ t: "cmd", a: "amb", v: st.amb });
    if (st.five) link.local({ t: "cmd", a: "five", v: true });
    Object.keys(st.sims || {}).forEach(k => { if (st.sims[k]) link.local({ t: "cmd", a: "sim", v: k }); });
  }, 400));
}
function fitMirror() { const f = $("#mirror iframe"); if (f) f.style.transform = "scale(" + ($("#mirror").clientWidth / 1280) + ")"; }
new ResizeObserver(fitMirror).observe($("#mirror"));
$("#mirrorOn").addEventListener("change", e => { $("#mirror").classList.toggle("on", e.target.checked); if (e.target.checked) mountMirror(); else $("#mirror").innerHTML = ""; });

let toastT = 0;
function toast(t, bad) { const el = $("#toast"); el.textContent = t; el.className = "toast on" + (bad ? " bad" : ""); clearTimeout(toastT); toastT = setTimeout(() => el.className = "toast", 2200); }

connect();
}
