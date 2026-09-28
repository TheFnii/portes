// Décor : jardin enchanté en plein écran + place pavée sous le dé.

import { seeded } from './random.js';

const r2 = (v) => Math.round(v * 10) / 10;

export const LAYOUT = {
  W: 1500,
  H: 1000,
  dice: { x: 750, y: 772 },
  arc: { cx: 750, cy: 905, rx: 672, ry: 598, from: 169, to: 11 },
};

// Positions des 12 portes, espacées régulièrement le long d'un arc d'ellipse.
export function doorSlots(count) {
  const { cx, cy, rx, ry, from, to } = LAYOUT.arc;
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (deg) => ({ x: cx + rx * Math.cos(rad(deg)), y: cy - ry * Math.sin(rad(deg)) });
  // table de longueur d'arc
  const steps = 600;
  const table = [0];
  let prev = pt(from);
  for (let i = 1; i <= steps; i++) {
    const p = pt(from + ((to - from) * i) / steps);
    table.push(table[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  const total = table[steps];
  const slots = [];
  const yTop = cy - ry;
  const yLow = pt(from).y;
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (count - 1);
    let i = table.findIndex((v) => v >= target);
    if (i < 0) i = steps;
    const deg = from + ((to - from) * i) / steps;
    const p = pt(deg);
    const depth = (p.y - yTop) / (yLow - yTop); // 0 = au fond, 1 = devant
    slots.push({ x: p.x, y: p.y, scale: 0.84 + depth * 0.22, depth });
  }
  return slots;
}

function flowerCluster(rnd, x0, y0, w, h, n, palette) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * w;
    const y = y0 + rnd() * h;
    const leaf = ['#1f4a22', '#2c5e2a', '#173a1a', '#3b6e30'][i % 4];
    s += `<use href="#fl-leaf" x="${r2(x - 14)}" y="${r2(y - 14)}" width="28" height="28" color="${leaf}" transform="rotate(${r2(rnd() * 360)} ${r2(x)} ${r2(y)})"/>`;
  }
  for (let i = 0; i < n * 0.8; i++) {
    const x = x0 + rnd() * w;
    const y = y0 + rnd() * h;
    const [sym, color] = palette[Math.floor(rnd() * palette.length)];
    const size = 14 + rnd() * 16 + (y - y0) / h * 12;
    s += `<use href="#fl-${sym}" x="${r2(x - size / 2)}" y="${r2(y - size / 2)}" width="${r2(size)}" height="${r2(size)}" color="${color}" transform="rotate(${r2(rnd() * 360)} ${r2(x)} ${r2(y)})"/>`;
  }
  return s;
}

export function buildBackdrop(el) {
  const rnd = seeded(2024);
  const W = 1600;
  const H = 1000;
  let canopy = '';
  const tones = ['#050d08', '#08160d', '#0c2014', '#10281a'];
  for (let layer = 0; layer < 4; layer++) {
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const edge = Math.min(x, W - x) / W; // plus bas sur les côtés
      const y = -40 + rnd() * 120 + (1 - edge * 2) * (180 + layer * 40) * (rnd() * 0.8 + 0.4) - layer * 12;
      const r = 50 + rnd() * 90;
      canopy += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r)}" fill="${tones[layer]}"/>`;
    }
  }
  let bokeh = '';
  for (let i = 0; i < 34; i++) {
    const x = rnd() * W;
    const y = rnd() * H * 0.62;
    const r = 6 + rnd() * 26;
    bokeh += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r)}" fill="url(#bk-${i % 2})" opacity="${r2(0.25 + rnd() * 0.5)}"/>`;
  }
  let rays = '';
  for (let i = 0; i < 7; i++) {
    const a = 0.32 + i * 0.13 + rnd() * 0.05;
    const w = 0.03 + rnd() * 0.04;
    const L = 1500;
    rays += `<path d="M60,-60 L${r2(60 + Math.cos(a - w) * L)},${r2(-60 + Math.sin(a - w) * L)} L${r2(60 + Math.cos(a + w) * L)},${r2(-60 + Math.sin(a + w) * L)}Z" style="animation-delay:${r2(-i * 1.7)}s"/>`;
  }
  const pal = [['rose', '#f2a2b6'], ['rose', '#e3637f'], ['daisy', '#ffffff'], ['rose', '#f6c1ce'], ['daisy', '#ffd9e1'], ['bud', '#f7e2a6'], ['rose', '#f08a24']];
  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="bg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0d2016"/><stop offset=".5" stop-color="#11281b"/><stop offset="1" stop-color="#08120c"/>
        </linearGradient>
        <radialGradient id="bg-sun" cx="120" cy="40" r="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset=".35" stop-color="#e9a54c" stop-opacity=".16"/><stop offset="1" stop-color="#e9a54c" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="bg-ray" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffe2a0" stop-opacity=".32"/><stop offset=".7" stop-color="#ffe2a0" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="bk-0"><stop offset="0" stop-color="#ffd58a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></radialGradient>
        <radialGradient id="bk-1"><stop offset="0" stop-color="#b9e59a" stop-opacity=".45"/><stop offset="1" stop-color="#b9e59a" stop-opacity="0"/></radialGradient>
        <linearGradient id="bg-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0f2416" stop-opacity="0"/><stop offset=".3" stop-color="#132c19"/><stop offset="1" stop-color="#07110a"/>
        </linearGradient>
        <radialGradient id="bg-vig" cx="50%" cy="55%" r="75%">
          <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg-sky)"/>
      <rect width="${W}" height="${H}" fill="url(#bg-sun)"/>
      <g class="bg-rays" fill="url(#bg-ray)">${rays}</g>
      ${bokeh}
      <g>${canopy}</g>
      <rect y="${H * 0.52}" width="${W}" height="${H * 0.48}" fill="url(#bg-ground)"/>
      <g class="bg-flowers">
        ${flowerCluster(rnd, -40, H - 190, 330, 220, 44, pal)}
        ${flowerCluster(rnd, W - 290, H - 190, 330, 220, 44, pal)}
      </g>
      <rect width="${W}" height="${H}" fill="url(#bg-vig)"/>
    </svg>`;
}

export function buildPlaza(svg, slots) {
  const { x: dx, y: dy } = LAYOUT.dice;
  let paths = '';
  slots.forEach((s) => {
    const ang = Math.atan2(s.y - dy, s.x - dx);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const sx = dx + Math.cos(ang) * 250;
    const sy = dy + Math.sin(ang) * 88;
    const w0 = 34;
    const w1 = 52 * s.scale;
    paths += `<path d="M${r2(sx + nx * w0)},${r2(sy + ny * w0 * 0.4)} L${r2(s.x + nx * w1)},${r2(s.y + 4)} L${r2(s.x - nx * w1)},${r2(s.y + 4)} L${r2(sx - nx * w0)},${r2(sy - ny * w0 * 0.4)}Z"/>`;
  });
  let shadows = '';
  slots.forEach((s) => {
    shadows += `<ellipse cx="${r2(s.x)}" cy="${r2(s.y + 2)}" rx="${r2(78 * s.scale)}" ry="${r2(12 * s.scale)}"/>`;
  });
  let rings = '';
  [0.92, 0.76, 0.6, 0.44, 0.28].forEach((k, i) => {
    rings += `<ellipse cx="${dx}" cy="${dy + 18}" rx="${r2(300 * k)}" ry="${r2(106 * k)}" stroke-dasharray="${i % 2 ? '14 3' : '9 3'}"/>`;
  });
  svg.innerHTML = `
    <defs>
      <radialGradient id="pz-stone" cx="50%" cy="45%" r="60%">
        <stop offset="0" stop-color="#8a7a60"/><stop offset=".6" stop-color="#5a4f40"/><stop offset="1" stop-color="#3a3228" stop-opacity=".0"/>
      </radialGradient>
      <radialGradient id="pz-light" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#ffd690" stop-opacity=".55"/><stop offset="1" stop-color="#ffd690" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="pz-path" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#b8a684" stop-opacity=".34"/><stop offset="1" stop-color="#b8a684" stop-opacity=".16"/>
      </linearGradient>
    </defs>
    <g fill="url(#pz-path)">${paths}</g>
    <g fill="rgba(0,0,0,.45)">${shadows}</g>
    <ellipse cx="${dx}" cy="${dy + 18}" rx="330" ry="118" fill="url(#pz-stone)"/>
    <g fill="none" stroke="rgba(40,30,20,.5)" stroke-width="2.2">${rings}</g>
    <ellipse class="pz-glow" cx="${dx}" cy="${dy + 18}" rx="210" ry="80" fill="url(#pz-light)"/>`;
}
