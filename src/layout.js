/* Apex Dash · layout personalizável (lógica pura, sem tela)
 *
 * Regras de IHM que este módulo garante (aula 05 e avaliação da v1):
 *   - Grade fixa: cada coluna lateral tem 6 unidades de altura e só aceita 5 formatos.
 *     Nada fica fora da grade, desalinhado ou cortado ("uso de grades", "regularidade").
 *   - O centro (marcha, rotação, velocidade, delta) e a faixa de alertas não entram aqui:
 *     não podem ser movidos, ocultados nem redimensionados (5° de visão, prevenção de erros).
 *   - "Vazio" deixa o lugar vazio; os vizinhos não andam ("inalterabilidade da posição").
 *   - Cada item aparece uma vez só; escolher um item que já está na tela troca os dois de lugar.
 *   - No máximo 3 itens por coluna (6 no total), dentro da memória de curta duração (7 ± 2).
 */

export const UNITS = 6;
/* formatos de coluna, de cima para baixo, em unidades de altura */
export const FORMATS = { "33": [3, 3], "222": [2, 2, 2], "42": [4, 2], "24": [2, 4], "6": [6] };
export const SIZES = [2, 3, 4, 6];
export const SIZE_NAME = { 2: "Compacto", 3: "Padrão", 4: "Grande", 6: "Coluna inteira" };
export const ITEMS = ["water", "oil", "boost", "fuel", "lap"];
export const SIDES = ["L", "R"];
export const SIDE_NAME = { L: "esquerda", R: "direita" };

export const DEFAULT = { L: { f: "33", items: ["water", "oil"] }, R: { f: "33", items: ["boost", "fuel"] } };

/* modelos prontos: ponto de partida para quem não quer montar do zero (aula 05: "oferecimento de valores defaults") */
export const PRESETS = {
  padrao:    { name: "Padrão",    desc: "Quatro medidores do mesmo tamanho.", lay: DEFAULT },
  corrida:   { name: "Corrida",   desc: "Motor à esquerda; tempo de volta grande à direita.",
               lay: { L: { f: "222", items: ["water", "oil", "boost"] }, R: { f: "24", items: ["fuel", "lap"] } } },
  essencial: { name: "Essencial", desc: "Só três itens, maiores, para quem está começando.",
               lay: { L: { f: "33", items: ["water", "oil"] }, R: { f: "6", items: ["fuel"] } } }
};

export function clone(o) { return JSON.parse(JSON.stringify(o)); }

/* aceita o layout salvo (inclusive o formato da v2: {E1,E2,D1,D2}) e devolve um layout válido */
export function normalize(raw) {
  let l = raw;
  if (l && l.E1 !== undefined) l = { L: { f: "33", items: [l.E1, l.E2] }, R: { f: "33", items: [l.D1, l.D2] } };
  if (!l || !l.L || !l.R) return clone(DEFAULT);
  const seen = {};
  const out = {};
  for (const s of SIDES) {
    const col = l[s] || {};
    const f = FORMATS[col.f] ? col.f : "33";
    const n = FORMATS[f].length;
    const items = [];
    for (let i = 0; i < n; i++) {
      let id = (col.items || [])[i];
      if (!ITEMS.includes(id) || seen[id]) id = "empty";
      if (id !== "empty") seen[id] = 1;
      items.push(id);
    }
    out[s] = { f, items };
  }
  return out;
}

/* lugares na ordem de leitura (esquerda de cima para baixo, depois direita) */
export function places(lay) {
  const out = [];
  for (const s of SIDES) {
    const sizes = FORMATS[lay[s].f];
    let row = 1;
    sizes.forEach((size, i) => { out.push({ side: s, i, size, row, item: lay[s].items[i] }); row += size; });
  }
  return out;
}

export function where(lay, item) {
  for (const s of SIDES) { const i = lay[s].items.indexOf(item); if (i >= 0) return { side: s, i }; }
  return null;
}

export function placeName(lay, side, i) {
  const n = FORMATS[lay[side].f].length;
  const pos = n === 1 ? "inteira" : n === 2 ? (i === 0 ? "em cima" : "embaixo") : ["em cima", "no meio", "embaixo"][i];
  return "Coluna " + SIDE_NAME[side] + ", " + pos;
}

/* escolhe o que mostrar num lugar; se o item já está em outro lugar, os dois trocam */
export function setItem(lay, side, i, item) {
  const next = clone(lay);
  const old = next[side].items[i];
  let other = null;
  if (item !== "empty") {
    const w = where(next, item);
    if (w && !(w.side === side && w.i === i)) { other = w; next[w.side].items[w.i] = old; }
  }
  next[side].items[i] = item;
  return { lay: next, old, swappedWith: other };
}

/* troca o conteúdo de dois lugares; o tamanho fica com o lugar */
export function swap(lay, a, b) {
  const next = clone(lay);
  const t = next[a.side].items[a.i];
  next[a.side].items[a.i] = next[b.side].items[b.i];
  next[b.side].items[b.i] = t;
  return next;
}

/* muda o tamanho de um lugar escolhendo, entre os formatos permitidos, o que menos mexe no resto:
 *   1º não tirar ninguém da tela · 2º o item escolhido não sai do lugar
 *   3º não criar lugar vazio (o vizinho ocupa o espaço) · 4º mudar o tamanho de menos vizinhos.
 * Quem não couber vai para um lugar vazio da outra coluna; se não houver, sai da tela (com aviso e desfazer). */
export function setSize(lay, side, i, size) {
  const curSizes = FORMATS[lay[side].f];
  if (curSizes[i] === size) return { lay: clone(lay), index: i, removed: [], relocated: [], changed: [] };
  const sel = lay[side].items[i];
  const othersFull = lay[side].items.filter((x, k) => k !== i && x !== "empty");
  const oldSize = {};
  lay[side].items.forEach((x, k) => { oldSize[x] = curSizes[k]; });
  let best = null;
  for (const [f, sizes] of Object.entries(FORMATS)) {
    sizes.forEach((sz, j) => {
      if (sz !== size) return;
      const items = new Array(sizes.length).fill("empty");
      items[j] = sel;
      // os outros itens ocupam os lugares livres na mesma ordem de cima para baixo; sobra = vazio
      const free = sizes.map((_, k) => k).filter(k => k !== j);
      const placed = othersFull.slice(0, free.length);
      placed.forEach((x, n) => { items[free[n]] = x; });
      const removed = othersFull.slice(free.length);
      const empties = items.filter(x => x === "empty").length - (sel === "empty" ? 1 : 0);
      const changed = placed.filter(x => sizes[items.indexOf(x)] !== oldSize[x]);
      const score = removed.length * 1000 + Math.abs(j - i) * 100 + empties * 10 + changed.length;
      if (!best || score < best.score) best = { f, items, removed, changed, score, j };
    });
  }
  const next = clone(lay);
  next[side] = { f: best.f, items: best.items };
  const relocated = [];
  const removed = [];
  const otherSide = side === "L" ? "R" : "L";
  for (const id of best.removed) {
    const k = next[otherSide].items.indexOf("empty");
    if (k >= 0) { next[otherSide].items[k] = id; relocated.push(id); } else removed.push(id);
  }
  return { lay: next, index: best.j, removed, relocated, changed: best.changed };
}

export function presetOf(lay) {
  for (const [k, p] of Object.entries(PRESETS)) if (JSON.stringify(normalize(p.lay)) === JSON.stringify(normalize(lay))) return k;
  return null;
}
