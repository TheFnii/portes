// Dessin des portes en SVG : cadre, battants, lumière intérieure, médaillon numéroté et fleurs.
// Chaque porte est construite dans un repère fixe de 160 × 280 unités.

import { seeded } from './random.js';

export const BOX = { W: 160, H: 280 };

// Ouverture de la porte (zone couverte par les battants).
const X0 = 36;
const X1 = 124;
const TOP = 88;
const BOTTOM = 254;
const F = 17; // épaisseur du cadre
const M = (X0 + X1) / 2;
const W = X1 - X0;
const MED = { x: 80, y: 50 }; // médaillon numéroté

const r2 = (v) => Math.round(v * 100) / 100;
let uidCounter = 0;

// ---------- Formes d'arche ----------

function pointedApex(w) {
  const R = w * 0.9;
  const r = w / 2;
  return { R, h: Math.sqrt(R * R - (R - r) * (R - r)) };
}

export function springline(shape, x0, x1, top) {
  const w = x1 - x0;
  switch (shape) {
    case 'segment': return top + w * 0.24;
    case 'pointed': return top + pointedApex(w).h;
    case 'ogee': return top + w * 0.7;
    case 'flat': return top + w * 0.12;
    default: return top + w / 2;
  }
}

export function archPath(shape, x0, x1, top, bottom) {
  const w = x1 - x0;
  const m = (x0 + x1) / 2;
  const r = w / 2;
  const sy = r2(springline(shape, x0, x1, top));
  switch (shape) {
    case 'segment': {
      const h = w * 0.24;
      const R = r2((r * r + h * h) / (2 * h));
      return `M${r2(x0)},${r2(bottom)}V${sy}A${R},${R} 0 0 1 ${r2(x1)},${sy}V${r2(bottom)}Z`;
    }
    case 'pointed': {
      const R = r2(pointedApex(w).R);
      return `M${r2(x0)},${r2(bottom)}V${sy}A${R},${R} 0 0 1 ${r2(m)},${r2(top)}A${R},${R} 0 0 1 ${r2(x1)},${sy}V${r2(bottom)}Z`;
    }
    case 'ogee':
      return `M${r2(x0)},${r2(bottom)}V${sy}C${r2(x0)},${r2(sy - w * 0.42)} ${r2(m - w * 0.1)},${r2(top + w * 0.2)} ${r2(m)},${r2(top)}`
        + `C${r2(m + w * 0.1)},${r2(top + w * 0.2)} ${r2(x1)},${r2(sy - w * 0.42)} ${r2(x1)},${sy}V${r2(bottom)}Z`;
    case 'flat': {
      const c = w * 0.12;
      return `M${r2(x0)},${r2(bottom)}V${r2(top + c)}Q${r2(x0)},${r2(top)} ${r2(x0 + c)},${r2(top)}H${r2(x1 - c)}Q${r2(x1)},${r2(top)} ${r2(x1)},${r2(top + c)}V${r2(bottom)}Z`;
    }
    default:
      return `M${r2(x0)},${r2(bottom)}V${sy}A${r2(r)},${r2(r)} 0 0 1 ${r2(x1)},${sy}V${r2(bottom)}Z`;
  }
}

const OPENING = (d) => archPath(d.shape, X0, X1, TOP, BOTTOM);
const SY = (d) => springline(d.shape, X0, X1, TOP);

function outerPath(d) {
  if (d.frame === 'tile') {
    const t = TOP - F - 16;
    return `M${X0 - F - 4},${BOTTOM}V${t}H${X1 + F + 4}V${BOTTOM}Z`;
  }
  return archPath(d.shape, X0 - F, X1 + F, TOP - F, BOTTOM);
}

// ---------- Symboles de fleurs (définis une seule fois dans la page) ----------

export function flowerDefs() {
  const petals = (n, rx, ry, dist, fill, offset = 0) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += `<ellipse cx="0" cy="${-dist}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${r2((360 / n) * (i + offset))})"/>`;
    }
    return s;
  };
  const lily = () => {
    let s = '';
    for (let i = 0; i < 6; i++) {
      s += `<path d="M0,0 C1.6,-2 1.4,-4.6 0,-6.4 C-1.4,-4.6 -1.6,-2 0,0Z" fill="currentColor" stroke="rgba(120,100,80,.35)" stroke-width=".25" transform="rotate(${i * 60})"/>`;
    }
    return s;
  };
  let lav = '';
  for (let i = 0; i < 7; i++) {
    lav += `<ellipse cx="${i % 2 ? 0.9 : -0.9}" cy="${-2 - i * 1.7}" rx="1.1" ry="1.5" fill="currentColor"/>`;
  }
  let wis = '';
  for (let i = 0; i < 9; i++) {
    const y = 1.5 + i * 1.6;
    const spread = 3 * (1 - i / 10);
    wis += `<circle cx="${r2(Math.sin(i * 2.1) * spread)}" cy="${r2(y)}" r="${r2(1.6 - i * 0.08)}" fill="currentColor"/>`;
  }
  return `
  <radialGradient id="fl-shade" cx="42%" cy="40%" r="60%">
    <stop offset="0" stop-color="#fff" stop-opacity=".28"/>
    <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity=".38"/>
  </radialGradient>
  <symbol id="fl-rose" viewBox="-6 -6 12 12" overflow="visible">
    <circle r="5.2" fill="currentColor"/>
    <path d="M-3.4,1.6 C-2,4.4 2,4.4 3.4,1.6 M-2.6,-0.4 C-2.2,-3.2 2.2,-3.2 2.6,-0.4 M-1.2,1 C-1.4,-1.2 1.4,-1.4 1.4,0.6" stroke="rgba(70,0,20,.32)" stroke-width=".7" fill="none"/>
    <circle r="5.2" fill="url(#fl-shade)"/>
  </symbol>
  <symbol id="fl-bud" viewBox="-6 -6 12 12" overflow="visible">
    <circle r="2.6" fill="currentColor"/><circle r="2.6" fill="url(#fl-shade)"/>
  </symbol>
  <symbol id="fl-daisy" viewBox="-6 -6 12 12" overflow="visible">
    ${petals(10, 1.2, 2.4, 2.9, 'currentColor')}
    <circle r="1.9" fill="#f2b61f"/><circle r="1.9" fill="url(#fl-shade)"/>
  </symbol>
  <symbol id="fl-sunflower" viewBox="-6 -6 12 12" overflow="visible">
    ${petals(14, 1.2, 2.5, 3.4, '#f0a712')}
    ${petals(14, 1, 2.2, 3.1, '#f7c531', 0.5)}
    <circle r="2.6" fill="#5a3413"/><circle r="2.6" fill="url(#fl-shade)"/>
  </symbol>
  <symbol id="fl-lily" viewBox="-7 -7 14 14" overflow="visible">
    ${lily()}
    <circle r="1" fill="#f0a23a"/>
  </symbol>
  <symbol id="fl-lotus" viewBox="-7 -7 14 14" overflow="visible">
    <ellipse cx="0" cy="3.2" rx="6.4" ry="1.8" fill="#2f6b3a"/>
    <path d="M0,2.6 C-5,1.8 -6,-1.6 -5.2,-3 C-3.4,-1.2 -1.6,0 0,2.6Z" fill="currentColor"/>
    <path d="M0,2.6 C5,1.8 6,-1.6 5.2,-3 C3.4,-1.2 1.6,0 0,2.6Z" fill="currentColor"/>
    <path d="M0,2.6 C-2.6,0 -2.6,-3.6 0,-5.6 C2.6,-3.6 2.6,0 0,2.6Z" fill="currentColor"/>
    <path d="M0,2.6 C-2.6,0 -2.6,-3.6 0,-5.6 C2.6,-3.6 2.6,0 0,2.6Z" fill="url(#fl-shade)"/>
  </symbol>
  <symbol id="fl-lavender" viewBox="-3 -15 6 16" overflow="visible">
    <path d="M0,0 V-13" stroke="#4f6b35" stroke-width=".5"/>
    ${lav}
  </symbol>
  <symbol id="fl-wisteria" viewBox="-4 0 8 17" overflow="visible">
    ${wis}
  </symbol>
  <symbol id="fl-leaf" viewBox="-6 -6 12 12" overflow="visible">
    <path d="M-6,0 C-3,-3.4 3,-3.4 6,0 C3,3.4 -3,3.4 -6,0Z" fill="currentColor"/>
    <path d="M-5,0 H5" stroke="rgba(0,0,0,.28)" stroke-width=".45"/>
    <path d="M-6,0 C-3,-3.4 3,-3.4 6,0 C3,3.4 -3,3.4 -6,0Z" fill="url(#fl-shade)" opacity=".6"/>
  </symbol>
  <symbol id="fl-star" viewBox="-5 -5 10 10" overflow="visible">
    <path d="M0,-5 Q0.6,-0.6 5,0 Q0.6,0.6 0,5 Q-0.6,0.6 -5,0 Q-0.6,-0.6 0,-5Z" fill="currentColor"/>
  </symbol>`;
}

const use = (sym, x, y, size, color, rot = 0) =>
  `<use href="#fl-${sym}" x="${r2(x - size / 2)}" y="${r2(y - size / 2)}" width="${r2(size)}" height="${r2(size)}" color="${color}"${rot ? ` transform="rotate(${r2(rot)} ${r2(x)} ${r2(y)})"` : ''}/>`;

// ---------- Guirlandes ----------

function garlandPoints(d) {
  const pts = [];
  const step = 3;
  const push = (x, y, nx, ny, zone) => pts.push({ x, y, nx, ny, zone });
  if (d.frame === 'tile') {
    const l = X0 - F - 4;
    const r = X1 + F + 4;
    const t = TOP - F - 16;
    for (let y = BOTTOM - 8; y > t; y -= step) push(l, y, -1, 0, 'side');
    for (let x = l; x < r; x += step) push(x, t, 0, -1, 'top');
    for (let y = t; y < BOTTOM - 8; y += step) push(r, y, 1, 0, 'side');
    return pts;
  }
  const sy = SY(d);
  const off = F * 0.62;
  const xl = X0 - off;
  const xr = X1 + off;
  const rx = W / 2 + off;
  const ry = sy - (TOP - off);
  for (let y = BOTTOM - 8; y > sy; y -= step) push(xl, y, -1, 0, 'side');
  const n = Math.ceil((Math.PI * (rx + ry) / 2) / step);
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI * i) / n;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const nx = c / rx;
    const ny = s / ry;
    const len = Math.hypot(nx, ny);
    push(M + rx * c, sy + ry * s, nx / len, ny / len, 'top');
  }
  for (let y = sy; y < BOTTOM - 8; y += step) push(xr, y, 1, 0, 'side');
  return pts;
}

function pick(rnd, arr) {
  return arr[Math.floor(rnd() * arr.length) % arr.length];
}

// Guirlande composée : une tige régulière le long de l'arche, des feuilles alternées
// et quelques bouquets placés précisément (au lieu de fleurs semées au hasard).
function vine(d, rnd) {
  const g = d.garland;
  const pts = garlandPoints(d);
  const L = pts.length - 1;
  const at = (t) => pts[Math.max(0, Math.min(L, Math.round(t * L)))];
  const from = g.from ?? 0;
  const to = g.to ?? 1;
  const leafColor = (i) => g.leaves[i % g.leaves.length];
  let stem = '';
  let leaves = '';
  let front = '';

  // Tige : légère ondulation autour du cadre
  const seg = pts.slice(Math.round(from * L), Math.round(to * L) + 1).filter((_, i) => i % 3 === 0);
  seg.forEach((p, i) => {
    const o = 1.5 + Math.sin(i * 0.9) * 2.2;
    stem += `${i ? 'L' : 'M'}${r2(p.x + p.nx * o)},${r2(p.y + p.ny * o)}`;
  });
  // Feuilles alternées, espacées régulièrement
  seg.forEach((p, i) => {
    if (i % 2) return;
    const side = (i / 2) % 2 ? 1 : -1;
    const tang = Math.atan2(p.nx, -p.ny) * 180 / Math.PI;
    const o = 1.5 + Math.sin(i * 0.9) * 2.2 + side * 3.2;
    leaves += use('leaf', p.x + p.nx * o, p.y + p.ny * o, 8 + (i % 3), leafColor(i), tang + side * 55);
  });

  // Bouquets : une grande fleur, deux plus petites, des feuilles derrière
  (g.clusters || []).forEach((c, ci) => {
    const p = at(c.t);
    const tx = -p.ny;
    const ty = p.nx;
    const size = c.size || 14;
    const kind = g.kinds[0];
    const ang = Math.atan2(p.ny, p.nx) * 180 / Math.PI;
    [-50, 0, 50].forEach((da, k) => {
      leaves += use('leaf', p.x + p.nx * 5, p.y + p.ny * 5, size * 0.95, leafColor(ci + k), ang + da);
    });
    [-1, 1].forEach((s, k) => {
      const q = { x: p.x + tx * s * size * 0.62 + p.nx * 1.5, y: p.y + ty * s * size * 0.62 + p.ny * 1.5 };
      front += use(kind.sym, q.x, q.y, size * 0.62, kind.colors[(ci + k + 1) % kind.colors.length], rnd() * 360);
    });
    front += use(kind.sym, p.x + p.nx * 2, p.y + p.ny * 2, size, kind.colors[ci % kind.colors.length], rnd() * 360);
  });

  // Grappes suspendues (glycine), symétriques, plus longues vers les côtés
  if (g.hang) {
    const { count, colors, from: hf, to: ht } = g.hang;
    for (let i = 0; i < count; i++) {
      const u = count === 1 ? 0.5 : i / (count - 1);
      const p = at(hf + (ht - hf) * u);
      const len = 26 + Math.abs(u - 0.5) * 2 * 16;
      front += use('leaf', p.x - 4, p.y, 10, leafColor(i), 160);
      front += use('leaf', p.x + 4, p.y, 10, leafColor(i + 1), 20);
      front += `<use href="#fl-wisteria" x="${r2(p.x - len * 0.25)}" y="${r2(p.y + 1)}" width="${r2(len * 0.5)}" height="${r2(len)}" color="${colors[i % colors.length]}"/>`;
    }
  }

  return `<path d="${stem}" fill="none" stroke="${g.stem || '#3a5a26'}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>${leaves}${front}`;
}

function garland(d, rnd) {
  const g = d.garland;
  if (!g) return '';
  if (g.style === 'vine') return vine(d, rnd);
  const pts = garlandPoints(d);
  let back = '';
  let front = '';
  const dens = g.density ?? 1;
  pts.forEach((p, i) => {
    // Les guirlandes clairsemées se concentrent sur le haut de l'arche.
    const zoneBoost = p.zone === 'top' ? 1 : (dens < 0.6 ? 0.35 : 0.85);
    const lower = p.y > BOTTOM - 60 ? 0.6 : 1;
    const k = dens * zoneBoost * lower;
    if (rnd() < k * (g.ivy ? 1 : 0.8)) {
      const o = -3 + rnd() * 10;
      const size = (g.ivy ? 7 : 9) + rnd() * 5;
      const ang = Math.atan2(p.ny, p.nx) * 180 / Math.PI + (rnd() - 0.5) * 120;
      back += use('leaf', p.x + p.nx * o, p.y + p.ny * o, size, pick(rnd, g.leaves), ang);
    }
    if (g.ivy && p.zone === 'side' && rnd() < 0.35) {
      const size = 6 + rnd() * 4;
      back += use('leaf', p.x + 4 + rnd() * 3 * p.nx, p.y + rnd() * 6, size, pick(rnd, g.leaves), 60 + rnd() * 60);
    }
    if (i % 2 === 0 && rnd() < k * 0.62) {
      const kind = pick(rnd, g.kinds);
      const o = -2 + rnd() * 7;
      const big = kind.sym === 'sunflower' ? 13 : kind.sym === 'bud' ? 8 : 10;
      const size = big * (0.8 + rnd() * 0.45);
      front += use(kind.sym, p.x + p.nx * o, p.y + p.ny * o, size, pick(rnd, kind.colors), rnd() * 360);
    }
  });
  if (g.wisteria) {
    pts.filter((p) => p.zone === 'top').forEach((p, i) => {
      if (i % 3 !== 0 || rnd() < 0.2) return;
      const size = 13 + rnd() * 9;
      front += `<use href="#fl-wisteria" x="${r2(p.x - size * 0.25)}" y="${r2(p.y - 2)}" width="${r2(size * 0.5)}" height="${r2(size)}" color="${pick(rnd, g.wisteria)}"/>`;
    });
  }
  return back + front;
}

function baseFlowers(d, rnd) {
  const b = d.base;
  if (!b) return '';
  let s = '';
  const sides = [X0 - F - 3, X1 + F + 3];
  sides.forEach((cx, side) => {
    const dir = side ? 1 : -1;
    for (let i = 0; i < b.count; i++) {
      const x = cx + dir * (rnd() * 12 - 3);
      const y = BOTTOM + 8 - rnd() * 26;
      const color = pick(rnd, b.colors);
      if (b.sym === 'lavender') {
        const h = 18 + rnd() * 10;
        s += `<use href="#fl-lavender" x="${r2(x - h * 0.19)}" y="${r2(y + 8 - h)}" width="${r2(h * 0.375)}" height="${r2(h)}" color="${color}" transform="rotate(${r2((rnd() - 0.5) * 24)} ${r2(x)} ${r2(y + 8)})"/>`;
        continue;
      }
      const size = b.sym === 'lotus' ? 13 + rnd() * 4 : b.sym === 'sunflower' ? 14 + rnd() * 4 : 10 + rnd() * 4;
      if (b.sym === 'lily' || b.sym === 'sunflower' || b.sym === 'daisy') {
        s += `<path d="M${r2(x)},${r2(y)} Q${r2(x + dir * 2)},${r2(y + 8)} ${r2(x + dir)},${r2(BOTTOM + 10)}" stroke="#3d6b2e" stroke-width="1" fill="none"/>`;
        s += use('leaf', x + dir * 3, y + 7, 9, '#3f7031', dir * 50 + 90);
      } else {
        s += use('leaf', x - 3, y + 4, 9, '#2f5a2b', 150);
        s += use('leaf', x + 4, y + 3, 9, '#3c6f35', 30);
      }
      s += use(b.sym, x, y, size, color, b.sym === 'lotus' ? (rnd() - 0.5) * 16 : rnd() * 360);
    }
  });
  return s;
}

// ---------- Cadres ----------

function stoneFrame(d, id, rnd) {
  const [c1, c2] = d.stone || ['#9a8f7e', '#6f6557'];
  const sy = SY(d);
  const body = `${outerPath(d)} ${OPENING(d)}`;
  let joints = '';
  for (let y = BOTTOM - 20, k = 0; y > sy; y -= 21, k++) {
    joints += `<path d="M${X0 - F},${r2(y)}H${X0}M${X1},${r2(y)}H${X1 + F}"/>`;
    const xa = X0 - F + (k % 2 ? 6 : 10);
    const xb = X1 + (k % 2 ? 10 : 6);
    joints += `<path d="M${xa},${r2(y)}V${r2(y + 21)}M${xb},${r2(y)}V${r2(y + 21)}" opacity=".6"/>`;
  }
  for (let i = 1; i < 11; i++) {
    const a = Math.PI + (Math.PI * i) / 11;
    joints += `<path d="M${M},${r2(sy)}L${r2(M + Math.cos(a) * 200)},${r2(sy + Math.sin(a) * 200)}"/>`;
  }
  let moss = '';
  if (d.moss) {
    const pts = garlandPoints(d);
    for (let i = 0; i < 40; i++) {
      const p = pts[Math.floor(rnd() * pts.length)];
      moss += `<circle cx="${r2(p.x + (rnd() - 0.5) * 12)}" cy="${r2(p.y + (rnd() - 0.5) * 8)}" r="${r2(1 + rnd() * 2.4)}" fill="#4d6b34" opacity=".55"/>`;
    }
  }
  return `
    <defs>
      <linearGradient id="${id}-st" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient>
      <clipPath id="${id}-body"><path d="${body}" clip-rule="evenodd"/></clipPath>
    </defs>
    <path d="${body}" fill="url(#${id}-st)" fill-rule="evenodd"/>
    <g clip-path="url(#${id}-body)" stroke="rgba(40,30,20,.45)" stroke-width=".9" fill="none">${joints}${moss}</g>
    <path d="M${M - 9},${TOP - F - 3}H${M + 9}L${M + 6},${TOP + 7}H${M - 6}Z" fill="${c1}" stroke="rgba(40,30,20,.5)" stroke-width=".8"/>
    <path d="${outerPath(d)}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1"/>`;
}

function gildedFrame(d, id) {
  const body = `${outerPath(d)} ${OPENING(d)}`;
  const mid = archPath(d.shape, X0 - F / 2, X1 + F / 2, TOP - F / 2, BOTTOM);
  const sy = SY(d);
  const crest = `M${M - 46},${TOP - F + 6} C${M - 50},${TOP - F - 22} ${M - 32},${MED.y - 30} ${M},${MED.y - 36} C${M + 32},${MED.y - 30} ${M + 50},${TOP - F - 22} ${M + 46},${TOP - F + 6}Z`;
  let flutes = '';
  for (let i = 0; i < 13; i++) {
    const a = Math.PI + (Math.PI * (i + 0.5)) / 13;
    flutes += `<path d="M${M},${MED.y}L${r2(M + Math.cos(a) * 60)},${r2(MED.y + Math.sin(a) * 60)}"/>`;
  }
  const volute = (x, y, dir) => `
    <circle cx="${x}" cy="${y}" r="6" fill="url(#${id}-gold)" stroke="#6e4a12" stroke-width=".8"/>
    <circle cx="${x}" cy="${y}" r="2.6" fill="none" stroke="#6e4a12" stroke-width=".8"/>
    <path d="M${x + dir * 6},${y} C${x + dir * 9},${y + 12} ${x + dir * 4},${y + 22} ${x + dir * 2},${y + 30}" stroke="url(#${id}-gold)" stroke-width="3" fill="none"/>`;
  return `
    <defs>
      <linearGradient id="${id}-gold" x1="0" y1="0" x2=".4" y2="1">
        <stop offset="0" stop-color="#fff2b8"/><stop offset=".3" stop-color="#e2b451"/>
        <stop offset=".62" stop-color="#a26f1c"/><stop offset="1" stop-color="#f1cd6c"/>
      </linearGradient>
      <clipPath id="${id}-crest"><path d="${crest}"/></clipPath>
    </defs>
    <path d="${crest}" fill="url(#${id}-gold)" stroke="#6e4a12" stroke-width="1"/>
    <g clip-path="url(#${id}-crest)" stroke="rgba(110,74,18,.55)" stroke-width="1.1">${flutes}</g>
    <path d="${body}" fill="url(#${id}-gold)" fill-rule="evenodd" stroke="#6e4a12" stroke-width="1.1"/>
    <path d="${mid}" fill="none" stroke="#fff6d0" stroke-width="2.4" stroke-dasharray="0.1 4.2" stroke-linecap="round" opacity=".9"/>
    ${volute(X0 - F - 1, sy + 2, -1)}${volute(X1 + F + 1, sy + 2, 1)}`;
}

function tileFrame(d, id) {
  const body = `${outerPath(d)} ${OPENING(d)}`;
  const t = TOP - F - 16;
  const band = archPath(d.shape, X0 - 5, X1 + 5, TOP - 5, BOTTOM);
  let crenel = '';
  for (let x = X0 - F - 4; x < X1 + F + 4; x += 8) {
    crenel += `<path d="M${x},${t}l4,-6l4,6Z"/>`;
  }
  return `
    <defs>
      <pattern id="${id}-tile" width="9" height="9" patternUnits="userSpaceOnUse">
        <rect width="9" height="9" fill="${d.color}"/>
        <path d="M4.5,0.8 L8.2,4.5 L4.5,8.2 L0.8,4.5Z" fill="${d.trim}" opacity=".85"/>
        <circle cx="4.5" cy="4.5" r="1.2" fill="#f3d27a"/>
        <path d="M0,0H9V9" fill="none" stroke="${d.trim}" stroke-width=".35" opacity=".6"/>
      </pattern>
    </defs>
    <g fill="${d.trim}">${crenel}</g>
    <path d="${body}" fill="url(#${id}-tile)" fill-rule="evenodd"/>
    <path d="${outerPath(d)}" fill="none" stroke="${d.trim}" stroke-width="3"/>
    <path d="${outerPath(d)}" fill="none" stroke="#f3d27a" stroke-width=".7"/>
    <path d="${band}" fill="none" stroke="${d.trim}" stroke-width="5"/>
    <path d="${band}" fill="none" stroke="#fdf8ee" stroke-width="1.2" stroke-dasharray="2 2"/>`;
}

function redGoldFrame(d, id) {
  const body = `${outerPath(d)} ${OPENING(d)}`;
  const mid = archPath(d.shape, X0 - F / 2, X1 + F / 2, TOP - F / 2, BOTTOM);
  const sy = SY(d);
  const cap = `M${X0 - F - 6},${TOP - F + 16} C${X0 - F - 8},${TOP - F - 10} ${M - 24},${TOP - F - 10} ${M},${MED.y - 30} C${M + 24},${TOP - F - 10} ${X1 + F + 8},${TOP - F - 10} ${X1 + F + 6},${TOP - F + 16}Z`;
  let flutes = '';
  [X0 - F + 5, X0 - F + 9, X0 - F + 13, X1 + 4, X1 + 8, X1 + 12].forEach((x) => {
    flutes += `<path d="M${x},${BOTTOM - 4}V${r2(sy + 8)}"/>`;
  });
  return `
    <defs>
      <linearGradient id="${id}-lac" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#b3281b"/><stop offset=".6" stop-color="#7c140c"/><stop offset="1" stop-color="#52090a"/>
      </linearGradient>
      <linearGradient id="${id}-gold" x1="0" y1="0" x2=".3" y2="1">
        <stop offset="0" stop-color="#fff0b0"/><stop offset=".4" stop-color="#e2b451"/><stop offset="1" stop-color="#9c6a1b"/>
      </linearGradient>
    </defs>
    <path d="${cap}" fill="url(#${id}-gold)" stroke="#5e3b0c" stroke-width="1"/>
    <path d="${cap}" fill="url(#${id}-lac)" transform="translate(${M} ${TOP - F}) scale(.8) translate(${-M} ${-(TOP - F)})"/>
    <path d="${body}" fill="url(#${id}-lac)" fill-rule="evenodd"/>
    <g stroke="url(#${id}-gold)" stroke-width=".9" opacity=".75">${flutes}</g>
    <path d="${outerPath(d)}" fill="none" stroke="url(#${id}-gold)" stroke-width="2.6"/>
    <path d="${OPENING(d)}" fill="none" stroke="url(#${id}-gold)" stroke-width="2.4"/>
    <path d="${mid}" fill="none" stroke="#f0cf78" stroke-width=".8" stroke-dasharray="3 2"/>
    <circle cx="${X0 - F - 2}" cy="${r2(sy)}" r="5" fill="url(#${id}-gold)" stroke="#5e3b0c" stroke-width=".7"/>
    <circle cx="${X1 + F + 2}" cy="${r2(sy)}" r="5" fill="url(#${id}-gold)" stroke="#5e3b0c" stroke-width=".7"/>`;
}

function gothicFrame(d, id) {
  const body = `${outerPath(d)} ${OPENING(d)}`;
  const sy = SY(d);
  const gable = `M${X0 - F - 2},${r2(sy - 6)} L${M},${TOP - F - 40} L${X1 + F + 2},${r2(sy - 6)}`;
  const spire = (x) => `
    <path d="M${x - 5},${BOTTOM}V${r2(sy - 18)}H${x + 5}V${BOTTOM}Z" fill="url(#${id}-slate)" stroke="#c9ccd6" stroke-width=".7"/>
    <path d="M${x - 5},${r2(sy - 18)}L${x},${r2(sy - 58)}L${x + 5},${r2(sy - 18)}Z" fill="url(#${id}-slate)" stroke="#c9ccd6" stroke-width=".7"/>
    <circle cx="${x}" cy="${r2(sy - 60)}" r="2.2" fill="#dfe2ea"/>
    ${[0, 1, 2, 3].map((i) => `<circle cx="${r2(x + (i % 2 ? 3.4 : -3.4) * (1 - i / 5))}" cy="${r2(sy - 26 - i * 9)}" r="1.2" fill="#c9ccd6"/>`).join('')}`;
  return `
    <defs>
      <linearGradient id="${id}-slate" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#55556a"/><stop offset="1" stop-color="#23232c"/>
      </linearGradient>
    </defs>
    <path d="${gable}" fill="none" stroke="#c9ccd6" stroke-width="2"/>
    <path d="${gable}" fill="none" stroke="#3a3a48" stroke-width=".8"/>
    ${spire(X0 - F - 6)}${spire(X1 + F + 6)}
    <path d="${body}" fill="url(#${id}-slate)" fill-rule="evenodd" stroke="#c9ccd6" stroke-width="1"/>
    <path d="${archPath(d.shape, X0 - F / 2, X1 + F / 2, TOP - F / 2, BOTTOM)}" fill="none" stroke="#9ea2b0" stroke-width=".7"/>`;
}

function woodFrame(d, id, rnd) {
  const body = `${outerPath(d)} ${OPENING(d)}`;
  const sy = SY(d);
  let grain = '';
  for (let i = 0; i < 14; i++) {
    const x = X0 - F + rnd() * (W + 2 * F);
    grain += `<path d="M${r2(x)},${BOTTOM} C${r2(x + 3)},${r2(BOTTOM - 60)} ${r2(x - 3)},${r2(TOP)} ${r2(x + 1)},${TOP - F - 10}"/>`;
  }
  return `
    <defs>
      <linearGradient id="${id}-wd" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#9b6a3c"/><stop offset=".5" stop-color="#7a4d27"/><stop offset="1" stop-color="#5a3518"/>
      </linearGradient>
      <clipPath id="${id}-body"><path d="${body}" clip-rule="evenodd"/></clipPath>
    </defs>
    <path d="${body}" fill="url(#${id}-wd)" fill-rule="evenodd"/>
    <g clip-path="url(#${id}-body)" stroke="rgba(40,20,5,.35)" stroke-width=".7" fill="none">${grain}</g>
    <rect x="${X0 - F - 3}" y="${r2(sy - 4)}" width="${F + 6}" height="7" rx="1.5" fill="#6b4220" stroke="#3e240e" stroke-width=".7"/>
    <rect x="${X1 - 3}" y="${r2(sy - 4)}" width="${F + 6}" height="7" rx="1.5" fill="#6b4220" stroke="#3e240e" stroke-width=".7"/>
    <path d="${outerPath(d)}" fill="none" stroke="#3e240e" stroke-width="1"/>
    <path d="${OPENING(d)}" fill="none" stroke="${d.trim}" stroke-width="1.6"/>`;
}

function celestialFrame(d, id, rnd) {
  const body = `${outerPath(d)} ${OPENING(d)}`;
  let stars = '';
  const pts = garlandPoints(d);
  for (let i = 0; i < 22; i++) {
    const p = pts[Math.floor(rnd() * pts.length)];
    const o = -6 + rnd() * 5;
    stars += use('star', p.x + p.nx * o, p.y + p.ny * o, 2.5 + rnd() * 3.5, '#f4dc98');
  }
  return `
    <defs>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3a2170"/><stop offset="1" stop-color="#120828"/>
      </linearGradient>
      <clipPath id="${id}-body"><path d="${body}" clip-rule="evenodd"/></clipPath>
    </defs>
    <path d="${body}" fill="url(#${id}-sky)" fill-rule="evenodd"/>
    <g clip-path="url(#${id}-body)">${stars}</g>
    <path d="${outerPath(d)}" fill="none" stroke="#e9d08a" stroke-width="2"/>
    <path d="${OPENING(d)}" fill="none" stroke="#e9d08a" stroke-width="1.6"/>
    <path d="M${M - 12},${TOP - F - 6} a13,13 0 1,0 20,-13 a10,10 0 1,1 -20,13Z" fill="#f4dc98" transform="translate(-4 -2)"/>`;
}

const FRAMES = {
  stone: stoneFrame, gilded: gildedFrame, tile: tileFrame, redgold: redGoldFrame,
  gothic: gothicFrame, wood: woodFrame, celestial: celestialFrame,
};

// ---------- Médaillon ----------

function medallion(d, id) {
  const { x, y } = MED;
  const num = String(d.n);
  const fs = num.length > 1 ? 27 : 33;
  const text = (fill, stroke) =>
    `<text x="${x}" y="${y}" dy=".36em" text-anchor="middle" font-family="'Cinzel', serif" font-weight="700" font-size="${fs}" fill="${fill}" stroke="${stroke}" stroke-width=".7" paint-order="stroke">${num}</text>`;
  const goldDefs = `
    <linearGradient id="${id}-mg" x1="0" y1="0" x2=".3" y2="1">
      <stop offset="0" stop-color="#fff4c4"/><stop offset=".45" stop-color="#e6b85a"/><stop offset="1" stop-color="#9a6618"/>
    </linearGradient>
    <radialGradient id="${id}-en" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="${d.enamel}"/><stop offset="1" stop-color="#000" stop-opacity=".6"/>
    </radialGradient>`;
  switch (d.medal) {
    case 'porcelain': {
      let dots = '';
      for (let i = 0; i < 14; i++) {
        const a = (Math.PI * 2 * i) / 14;
        dots += `<circle cx="${r2(x + Math.cos(a) * 23)}" cy="${r2(y + Math.sin(a) * 27)}" r="${i % 2 ? 1.2 : 1.7}" fill="${i % 2 ? '#6aa06a' : '#e98aa2'}"/>`;
      }
      return `<defs>${goldDefs}</defs>
        <ellipse cx="${x}" cy="${y}" rx="28" ry="32" fill="url(#${id}-mg)" stroke="#6e4a12" stroke-width=".8"/>
        <ellipse cx="${x}" cy="${y}" rx="25.5" ry="29.5" fill="#fbf6ee"/>${dots}
        ${text(d.enamel, '#fff')}`;
    }
    case 'tile':
      return `<defs>${goldDefs}</defs>
        <rect x="${x - 27}" y="${y - 27}" width="54" height="54" rx="3" fill="#fbf7ee" stroke="${d.trim}" stroke-width="3"/>
        <rect x="${x - 22}" y="${y - 22}" width="44" height="44" fill="none" stroke="${d.trim}" stroke-width=".8" stroke-dasharray="2 1.5"/>
        ${[[-27, -27], [27, -27], [-27, 27], [27, 27]].map(([a, b]) => `<circle cx="${x + a}" cy="${y + b}" r="3" fill="#f3d27a" stroke="${d.trim}" stroke-width=".8"/>`).join('')}
        ${text(d.enamel, '#fff')}`;
    case 'sun': {
      let rays = '';
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI * 2 * i) / 16;
        const b = a + Math.PI / 16;
        const c = a - Math.PI / 16;
        const R = i % 2 ? 31 : 36;
        rays += `<path d="M${r2(x + Math.cos(c) * 24)},${r2(y + Math.sin(c) * 24)}L${r2(x + Math.cos(a) * R)},${r2(y + Math.sin(a) * R)}L${r2(x + Math.cos(b) * 24)},${r2(y + Math.sin(b) * 24)}Z"/>`;
      }
      return `<defs>${goldDefs}</defs>
        <g fill="url(#${id}-mg)" stroke="#8a5a12" stroke-width=".5">${rays}</g>
        <circle cx="${x}" cy="${y}" r="25" fill="url(#${id}-mg)" stroke="#8a5a12" stroke-width="1"/>
        <circle cx="${x}" cy="${y}" r="21.5" fill="url(#${id}-en)"/>
        ${text(`url(#${id}-mg)`, '#2a1606')}`;
    }
    default:
      return `<defs>${goldDefs}</defs>
        <circle cx="${x}" cy="${y}" r="31" fill="url(#${id}-mg)" stroke="#6e4a12" stroke-width=".9"/>
        <circle cx="${x}" cy="${y}" r="28.4" fill="none" stroke="#fff6d0" stroke-width="1.8" stroke-dasharray="0.1 3.6" stroke-linecap="round"/>
        <circle cx="${x}" cy="${y}" r="25" fill="url(#${id}-en)" stroke="#5a3a0c" stroke-width=".8"/>
        ${text(`url(#${id}-mg)`, '#1c1206')}`;
  }
}

function lanterns(d, id) {
  if (!d.lantern) return '';
  const sy = SY(d);
  const one = (x, dir) => `
    <path d="M${x - dir * 10},${r2(sy - 14)} H${x} V${r2(sy - 10)}" stroke="#2a2420" stroke-width="1.4" fill="none"/>
    <circle class="lantern-glow" cx="${x}" cy="${r2(sy + 2)}" r="16" fill="url(#${id}-lg)"/>
    <path d="M${x - 4},${r2(sy - 10)} H${x + 4} L${x + 5},${r2(sy - 6)} V${r2(sy + 6)} L${x + 3},${r2(sy + 9)} H${x - 3} L${x - 5},${r2(sy + 6)} V${r2(sy - 6)}Z" fill="#ffd98a" stroke="#2a2420" stroke-width="1.2"/>
    <path d="M${x},${r2(sy - 6)} V${r2(sy + 7)}" stroke="#2a2420" stroke-width=".8"/>`;
  return `<defs><radialGradient id="${id}-lg"><stop offset="0" stop-color="#ffcf70" stop-opacity=".7"/><stop offset="1" stop-color="#ffb040" stop-opacity="0"/></radialGradient></defs>
    ${one(X0 - F - 8, -1)}${one(X1 + F + 8, 1)}`;
}

function threshold(d, id) {
  return `
    <defs><linearGradient id="${id}-step" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a99c86"/><stop offset="1" stop-color="#5d5446"/>
    </linearGradient></defs>
    <path d="M${X0 - F - 7},${BOTTOM} H${X1 + F + 7} V${BOTTOM + 7} H${X0 - F - 7}Z" fill="url(#${id}-step)"/>
    <path d="M${X0 - F - 13},${BOTTOM + 7} H${X1 + F + 13} V${BOTTOM + 14} H${X0 - F - 13}Z" fill="url(#${id}-step)" opacity=".9"/>
    <path d="M${X0 - F - 7},${BOTTOM + .5} H${X1 + F + 7}" stroke="rgba(255,255,255,.25)" stroke-width="1"/>`;
}

// ---------- Battants ----------

function handles(d) {
  const sy = SY(d);
  const hy = r2(sy + (BOTTOM - sy) * 0.46);
  const metal = d.panel === 'planks' || d.frame === 'gothic' ? '#2b2622' : d.trim;
  const hi = d.frame === 'gothic' ? '#c9ccd6' : 'rgba(255,255,255,.55)';
  if (d.leaves === 2) {
    return `
      <rect x="${M - 7.5}" y="${hy - 11}" width="4" height="22" rx="2" fill="${metal}" stroke="rgba(0,0,0,.45)" stroke-width=".5"/>
      <rect x="${M + 3.5}" y="${hy - 11}" width="4" height="22" rx="2" fill="${metal}" stroke="rgba(0,0,0,.45)" stroke-width=".5"/>
      <path d="M${M - 6.6},${hy - 9}V${hy + 9}M${M + 4.4},${hy - 9}V${hy + 9}" stroke="${hi}" stroke-width=".7"/>`;
  }
  return `
    <circle cx="${X1 - 11}" cy="${hy}" r="4.4" fill="${metal}" stroke="rgba(0,0,0,.5)" stroke-width=".6"/>
    <circle cx="${X1 - 12}" cy="${hy - 1}" r="1.5" fill="${hi}"/>
    <path d="M${X1 - 12.2},${hy + 8} h2.4 l.6,5 h-3.6Z" fill="rgba(0,0,0,.6)"/>`;
}

function leafRegions(d) {
  return d.leaves === 2 ? [[X0, M], [M, X1]] : [[X0, X1]];
}

function panelBoxes(d, a, b, sy) {
  const ix = 7;
  const y1 = sy + 6;
  const split = sy + (BOTTOM - sy) * 0.44;
  return [
    { x: a + ix, y: y1, w: b - a - 2 * ix, h: split - y1 },
    { x: a + ix, y: split + 8, w: b - a - 2 * ix, h: BOTTOM - 12 - (split + 8) },
  ];
}

function flourish(cx, cy, s, color) {
  return `
    <path d="M${cx},${r2(cy - s)} C${r2(cx + s * 0.55)},${r2(cy - s * 0.4)} ${r2(cx + s * 0.55)},${r2(cy + s * 0.4)} ${cx},${r2(cy + s)} C${r2(cx - s * 0.55)},${r2(cy + s * 0.4)} ${r2(cx - s * 0.55)},${r2(cy - s * 0.4)} ${cx},${r2(cy - s)}Z" fill="${color}"/>
    <path d="M${cx},${r2(cy - s * 0.3)} C${r2(cx + s * 1.1)},${r2(cy - s * 1.1)} ${r2(cx + s * 1.5)},${r2(cy + s * 0.2)} ${r2(cx + s * 0.9)},${r2(cy + s * 0.35)}
             M${cx},${r2(cy - s * 0.3)} C${r2(cx - s * 1.1)},${r2(cy - s * 1.1)} ${r2(cx - s * 1.5)},${r2(cy + s * 0.2)} ${r2(cx - s * 0.9)},${r2(cy + s * 0.35)}
             M${cx},${r2(cy + s * 0.4)} C${r2(cx + s * 0.9)},${r2(cy + s * 1.2)} ${r2(cx + s * 0.4)},${r2(cy + s * 1.6)} ${r2(cx + s * 0.1)},${r2(cy + s * 1.5)}
             M${cx},${r2(cy + s * 0.4)} C${r2(cx - s * 0.9)},${r2(cy + s * 1.2)} ${r2(cx - s * 0.4)},${r2(cy + s * 1.6)} ${r2(cx - s * 0.1)},${r2(cy + s * 1.5)}"
          fill="none" stroke="${color}" stroke-width="${r2(s * 0.16)}" stroke-linecap="round"/>
    <circle cx="${r2(cx + s * 0.9)}" cy="${r2(cy + s * 0.35)}" r="${r2(s * 0.14)}" fill="${color}"/>
    <circle cx="${r2(cx - s * 0.9)}" cy="${r2(cy + s * 0.35)}" r="${r2(s * 0.14)}" fill="${color}"/>`;
}

function star8(cx, cy, R, color) {
  let p = '';
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * i) / 8 - Math.PI / 2;
    const r = i % 2 ? R * 0.42 : (i % 4 ? R * 0.7 : R);
    p += `${i ? 'L' : 'M'}${r2(cx + Math.cos(a) * r)},${r2(cy + Math.sin(a) * r)}`;
  }
  return `<path d="${p}Z" fill="${color}"/>`;
}

function panelArt(d, id, rnd) {
  const sy = SY(d);
  const op = OPENING(d);
  const regions = leafRegions(d);
  const trim = d.trim;
  let s = `
    <defs>
      <linearGradient id="${id}-lf" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${d.light}"/><stop offset=".35" stop-color="${d.color}"/><stop offset="1" stop-color="${d.dark}"/>
      </linearGradient>
      <linearGradient id="${id}-hl" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/>
      </linearGradient>
      <linearGradient id="${id}-hr" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/>
      </linearGradient>
      <clipPath id="${id}-op"><path d="${op}"/></clipPath>
    </defs>
    <g clip-path="url(#${id}-op)">
    <rect x="${X0}" y="${TOP}" width="${W}" height="${BOTTOM - TOP}" fill="url(#${id}-lf)"/>`;

  const border = archPath(d.shape, X0 + 5, X1 - 5, TOP + 5, BOTTOM - 5);
  const archPanel = archPath(d.shape, X0 + 10, X1 - 10, TOP + 10, sy + 1);
  const fan = (color, n = 9, op2 = 0.55) => {
    let f = `<g clip-path="url(#${id}-fan)" stroke="${color}" stroke-width=".7" opacity="${op2}">`;
    for (let i = 1; i < n; i++) {
      const a = Math.PI + (Math.PI * i) / n;
      f += `<path d="M${M},${r2(sy)}L${r2(M + Math.cos(a) * 90)},${r2(sy + Math.sin(a) * 90)}"/>`;
    }
    return `<defs><clipPath id="${id}-fan"><path d="${archPanel}"/></clipPath></defs>${f}</g>`;
  };

  switch (d.panel) {
    case 'planks': {
      for (let x = X0, k = 0; x < X1; x += 11, k++) {
        s += `<rect x="${x}" y="${TOP}" width="11" height="${BOTTOM - TOP}" fill="${k % 2 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.04)'}"/>`;
        s += `<path d="M${x},${TOP}V${BOTTOM}" stroke="rgba(30,15,5,.6)" stroke-width="1"/>`;
        for (let g = 0; g < 3; g++) {
          const gx = x + 2 + rnd() * 7;
          s += `<path d="M${r2(gx)},${TOP} C${r2(gx + 2)},${r2(TOP + 50)} ${r2(gx - 2)},${r2(TOP + 110)} ${r2(gx + 1)},${BOTTOM}" stroke="rgba(30,15,5,.22)" stroke-width=".5" fill="none"/>`;
        }
      }
      [sy + 10, (sy + BOTTOM) / 2 + 12, BOTTOM - 22].forEach((y) => {
        s += `<rect x="${X0}" y="${r2(y)}" width="${W - 14}" height="5.5" fill="#2b2622"/>`;
        s += `<circle cx="${X1 - 14}" cy="${r2(y + 2.75)}" r="4" fill="#2b2622"/>`;
        for (let x = X0 + 5; x < X1 - 16; x += 11) s += `<circle cx="${x}" cy="${r2(y + 2.75)}" r="1" fill="#7a6f64"/>`;
      });
      const ky = (sy + BOTTOM) / 2 - 16;
      s += `<circle cx="${M}" cy="${r2(ky - 6)}" r="4" fill="#2b2622"/>
        <circle cx="${M}" cy="${r2(ky + 4)}" r="9" fill="none" stroke="#2b2622" stroke-width="2.6"/>
        <circle cx="${M}" cy="${r2(ky + 4)}" r="9" fill="none" stroke="rgba(255,255,255,.2)" stroke-width=".6"/>`;
      break;
    }
    case 'carved': {
      s += `<path d="${border}" fill="none" stroke="${trim}" stroke-width="1.2" opacity=".85"/>`;
      s += `<path d="${archPanel}" fill="rgba(255,255,255,.06)" stroke="${trim}" stroke-width="1"/>${fan(trim, 11, 0.7)}`;
      regions.forEach(([a, b]) => {
        const x = a + 8;
        const w = b - a - 16;
        const y = sy + 6;
        const h = BOTTOM - 14 - y;
        const cx = r2(a + (b - a) / 2);
        s += `<rect x="${x}" y="${r2(y)}" width="${w}" height="${r2(h)}" rx="4" fill="rgba(0,0,0,.1)" stroke="${trim}" stroke-width="1.2"/>`;
        s += `<rect x="${x + 3}" y="${r2(y + 3)}" width="${w - 6}" height="${r2(h - 6)}" rx="3" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>`;
        s += flourish(cx, r2(y + h * 0.5), Math.min(9, w * 0.28), trim);
        s += flourish(cx, r2(y + h * 0.16), Math.min(5, w * 0.16), trim);
        s += flourish(cx, r2(y + h * 0.84), Math.min(5, w * 0.16), trim);
      });
      break;
    }
    case 'diamond': {
      s += `<defs><pattern id="${id}-lat" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(45 ${M} 170)">
          <path d="M0,0H11M0,0V11" stroke="${trim}" stroke-width="1"/><circle r="1.6" fill="${trim}"/></pattern></defs>
        <rect x="${X0}" y="${TOP}" width="${W}" height="${BOTTOM - TOP}" fill="url(#${id}-lat)" opacity=".85"/>
        <path d="${border}" fill="none" stroke="${trim}" stroke-width="2"/>`;
      regions.forEach(([a, b]) => {
        const cx = r2((a + b) / 2);
        s += `<circle cx="${cx}" cy="${r2(sy + 40)}" r="7" fill="${d.dark}" stroke="${trim}" stroke-width="1.4"/>${star8(cx, r2(sy + 40), 5, trim)}`;
      });
      break;
    }
    case 'glass': {
      const gy = sy + (BOTTOM - sy) * 0.3;
      const pal = d.glass;
      let wedges = '';
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI + (Math.PI * i) / n;
        const a1 = Math.PI + (Math.PI * (i + 1)) / n;
        wedges += `<path d="M${M},${r2(gy)}L${r2(M + Math.cos(a0) * 140)},${r2(gy + Math.sin(a0) * 140)}L${r2(M + Math.cos(a1) * 140)},${r2(gy + Math.sin(a1) * 140)}Z" fill="${pal[i % pal.length]}"/>`;
      }
      s += `<defs><clipPath id="${id}-gl"><rect x="${X0}" y="${TOP}" width="${W}" height="${r2(gy - TOP)}"/></clipPath>
          <radialGradient id="${id}-glh" cx="50%" cy="100%" r="90%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
        <g clip-path="url(#${id}-gl)">
          ${wedges}
          <rect x="${X0}" y="${TOP}" width="${W}" height="${r2(gy - TOP)}" fill="url(#${id}-glh)"/>
          <g stroke="#15131a" stroke-width="1.3">${Array.from({ length: n + 1 }, (_, i) => {
            const a = Math.PI + (Math.PI * i) / n;
            return `<path d="M${M},${r2(gy)}L${r2(M + Math.cos(a) * 140)},${r2(gy + Math.sin(a) * 140)}"/>`;
          }).join('')}</g>
          <circle cx="${M}" cy="${r2(gy)}" r="13" fill="#f6d77a" stroke="#15131a" stroke-width="1.3"/>
          <path d="${archPath(d.shape, X0 + 18, X1 - 18, TOP + 18, BOTTOM)}" fill="none" stroke="#15131a" stroke-width="1.2"/>
        </g>
        <path d="M${X0},${r2(gy)}H${X1}" stroke="${trim}" stroke-width="2.4"/>`;
      regions.forEach(([a, b]) => {
        const x = a + 7;
        const w = b - a - 14;
        const y = gy + 9;
        const h = BOTTOM - 12 - y;
        s += `<rect x="${x}" y="${r2(y)}" width="${w}" height="${r2(h)}" fill="rgba(255,255,255,.06)" stroke="rgba(0,0,0,.4)" stroke-width="1.3"/>`;
        s += `<rect x="${x + 3}" y="${r2(y + 3)}" width="${w - 6}" height="${r2(h - 6)}" fill="none" stroke="${trim}" stroke-width=".8"/>`;
      });
      break;
    }
    case 'stars': {
      const sc = d.starColor || trim;
      s += `<path d="${border}" fill="none" stroke="${sc}" stroke-width="1.1"/>`;
      const pts = [];
      for (let i = 0; i < 34; i++) {
        const x = X0 + 8 + rnd() * (W - 16);
        const y = TOP + 18 + rnd() * (BOTTOM - TOP - 30);
        pts.push([x, y]);
        s += use('star', x, y, 2 + rnd() * 3.6, sc);
      }
      s += `<path d="M${pts.slice(0, 5).map((p) => p.map(r2).join(',')).join('L')}" stroke="${sc}" stroke-width=".35" fill="none" opacity=".6"/>`;
      if (d.leaves === 1) {
        s += `<path d="M${M + 4},${r2(sy - 6)} a16,16 0 1,0 12,26 a13,13 0 1,1 -12,-26Z" fill="${sc}"/>`;
      } else {
        regions.forEach(([a, b]) => { s += star8(r2((a + b) / 2), r2(sy + 34), 10, sc); });
      }
      break;
    }
    case 'sun': {
      const cy = sy + (BOTTOM - sy) * 0.3;
      let rays = '';
      for (let i = 0; i < 24; i++) {
        const a0 = (Math.PI * 2 * i) / 24;
        const a1 = (Math.PI * 2 * (i + 1)) / 24;
        rays += `<path d="M${M},${r2(cy)}L${r2(M + Math.cos(a0) * 150)},${r2(cy + Math.sin(a0) * 150)}L${r2(M + Math.cos(a1) * 150)},${r2(cy + Math.sin(a1) * 150)}Z" fill="${i % 2 ? 'rgba(255,220,140,.14)' : 'rgba(0,0,0,.1)'}"/>`;
      }
      s += rays;
      s += `<circle cx="${M}" cy="${r2(cy)}" r="17" fill="none" stroke="${trim}" stroke-width="1.2"/>
        <circle cx="${M}" cy="${r2(cy)}" r="12" fill="${trim}"/>
        <circle cx="${M}" cy="${r2(cy)}" r="12" fill="url(#fl-shade)"/>
        <path d="${border}" fill="none" stroke="${trim}" stroke-width="1"/>
        <rect x="${X0 + 8}" y="${r2(BOTTOM - 62)}" width="${W - 16}" height="50" fill="rgba(0,0,0,.08)" stroke="${trim}" stroke-width="1"/>`;
      break;
    }
    default: { // panels
      s += `<path d="${border}" fill="none" stroke="${trim}" stroke-width="1" opacity=".8"/>`;
      s += `<path d="${archPanel}" fill="rgba(255,255,255,.06)" stroke="${trim}" stroke-width=".9"/>${fan(trim)}`;
      regions.forEach(([a, b]) => {
        panelBoxes(d, a, b, sy).forEach((p) => {
          s += `<rect x="${r2(p.x)}" y="${r2(p.y)}" width="${r2(p.w)}" height="${r2(p.h)}" rx="1.5" fill="rgba(255,255,255,.07)" stroke="rgba(0,0,0,.38)" stroke-width="1.3"/>`;
          s += `<rect x="${r2(p.x + 3)}" y="${r2(p.y + 3)}" width="${r2(p.w - 6)}" height="${r2(p.h - 6)}" rx="1" fill="none" stroke="${trim}" stroke-width=".8"/>`;
          const cx = r2(p.x + p.w / 2);
          const cy = r2(p.y + p.h / 2);
          s += `<path d="M${cx},${r2(cy - 5)}L${r2(cx + 3.5)},${cy}L${cx},${r2(cy + 5)}L${r2(cx - 3.5)},${cy}Z" fill="${trim}" opacity=".9"/>`;
        });
      });
    }
  }

  // Ombrage de chaque battant (plus sombre côté charnière) et joint central.
  regions.forEach(([a, b], i) => {
    const grad = regions.length === 2 && i === 1 ? 'hr' : 'hl';
    s += `<rect x="${a}" y="${TOP}" width="${b - a}" height="${BOTTOM - TOP}" fill="url(#${id}-${grad})"/>`;
  });
  if (d.leaves === 2) {
    s += `<path d="M${M},${TOP}V${BOTTOM}" stroke="rgba(0,0,0,.6)" stroke-width="1.5"/>
      <path d="M${M + 1},${TOP}V${BOTTOM}" stroke="rgba(255,255,255,.14)" stroke-width=".6"/>`;
  }
  s += handles(d);
  s += '</g>';
  return s;
}

// Lumière derrière les battants.
function portal(d, id, rnd) {
  const op = OPENING(d);
  const sy = SY(d);
  const cy = r2(sy + 30);
  let rays = '';
  for (let i = 0; i < 18; i++) {
    const a = (Math.PI * 2 * i) / 18;
    const b = a + 0.09;
    rays += `<path d="M${M},${cy}L${r2(M + Math.cos(a) * 200)},${r2(cy + Math.sin(a) * 200)}L${r2(M + Math.cos(b) * 200)},${r2(cy + Math.sin(b) * 200)}Z"/>`;
  }
  let stars = '';
  for (let i = 0; i < 26; i++) {
    stars += `<circle cx="${r2(X0 + rnd() * W)}" cy="${r2(TOP + rnd() * (BOTTOM - TOP))}" r="${r2(0.4 + rnd() * 1.1)}" style="animation-delay:${r2(-rnd() * 3)}s"/>`;
  }
  return `
    <defs>
      <radialGradient id="${id}-pt" cx="${M}" cy="${cy}" r="120" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#fffef6"/><stop offset=".16" stop-color="#fff1c2"/>
        <stop offset=".4" stop-color="#ffc768"/><stop offset=".72" stop-color="#b0558f"/><stop offset="1" stop-color="#2a0f3a"/>
      </radialGradient>
      <clipPath id="${id}-pc"><path d="${op}"/></clipPath>
    </defs>
    <g clip-path="url(#${id}-pc)">
      <rect x="${X0}" y="${TOP}" width="${W}" height="${BOTTOM - TOP}" fill="url(#${id}-pt)"/>
      <g class="portal-rays" fill="#fff" opacity=".22" style="transform-origin:${M}px ${cy}px">${rays}</g>
      <g class="portal-stars" fill="#fff">${stars}</g>
    </g>`;
}

// ---------- Assemblage ----------

// Construit l'élément DOM d'une porte.
export function buildDoor(d) {
  const id = `d${d.n}-${++uidCounter}`;
  const rnd = seeded(d.n * 7919);
  const rndArt = seeded(d.n * 104729);
  const el = document.createElement('div');
  el.className = `door leaves-${d.leaves}`;
  el.dataset.n = d.n;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `Porte ${d.n}`);

  const pct = (v, total) => `${r2((v / total) * 100)}%`;
  const vb = `0 0 ${BOX.W} ${BOX.H}`;

  const art = panelArt(d, `${id}-a`, rndArt);
  let leavesHtml = '';
  leafRegions(d).forEach(([a, b], i) => {
    const side = d.leaves === 2 && i === 1 ? 'right' : 'left';
    const artI = i === 0 ? art : panelArt(d, `${id}-b`, seeded(d.n * 104729));
    leavesHtml += `<div class="door-leaf ${side}" style="left:${pct(a, BOX.W)};top:${pct(TOP, BOX.H)};width:${pct(b - a, BOX.W)};height:${pct(BOTTOM - TOP, BOX.H)}">
      <svg viewBox="${a} ${TOP} ${b - a} ${BOTTOM - TOP}" preserveAspectRatio="none">${artI}</svg></div>`;
  });

  const frameFn = FRAMES[d.frame] || stoneFrame;
  const shade = `<defs><clipPath id="${id}-sh"><path d="${OPENING(d)}"/></clipPath></defs>
    <path d="${OPENING(d)}" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="7" clip-path="url(#${id}-sh)"/>`;

  el.innerHTML = `
    <div class="door-halo"></div>
    <svg class="door-portal" viewBox="${vb}">${portal(d, `${id}-p`, rnd)}</svg>
    ${leavesHtml}
    <svg class="door-frame" viewBox="${vb}">
      ${threshold(d, id)}
      ${frameFn(d, id, rnd)}
      ${shade}
      ${lanterns(d, id)}
      ${garland(d, rnd)}
      ${baseFlowers(d, rnd)}
      ${medallion(d, `${id}-m`)}
    </svg>`;
  return el;
}

// Position de l'ouverture dans la boîte de la porte (fractions), pour les effets de lumière.
export const OPENING_BOX = {
  x: X0 / BOX.W, y: TOP / BOX.H, w: W / BOX.W, h: (BOTTOM - TOP) / BOX.H,
};
export const MEDAL_BOX = { x: MED.x / BOX.W, y: MED.y / BOX.H };
