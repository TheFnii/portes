// Dé à 12 faces (dodécaèdre) dessiné en 3D sur un canvas : rebonds, culbutes, et arrêt sur la face tirée.

const PHI = (1 + Math.sqrt(5)) / 2;

// ---------- Petits outils de géométrie ----------

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const norm = (a) => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));

// Quaternions [w, x, y, z]
const qAxis = (axis, ang) => {
  const s = Math.sin(ang / 2);
  return [Math.cos(ang / 2), axis[0] * s, axis[1] * s, axis[2] * s];
};
const qMul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];
const qConj = (q) => [q[0], -q[1], -q[2], -q[3]];
const qRotate = (q, v) => {
  const p = qMul(qMul(q, [0, v[0], v[1], v[2]]), qConj(q));
  return [p[1], p[2], p[3]];
};

// Matrice de rotation (colonnes c0, c1, c2) → quaternion
function qFromBasis(c0, c1, c2) {
  const m00 = c0[0]; const m01 = c1[0]; const m02 = c2[0];
  const m10 = c0[1]; const m11 = c1[1]; const m12 = c2[1];
  const m20 = c0[2]; const m21 = c1[2]; const m22 = c2[2];
  const tr = m00 + m11 + m22;
  let q;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [0.25 * s, (m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    q = [(m21 - m12) / s, 0.25 * s, (m01 + m10) / s, (m02 + m20) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    q = [(m02 - m20) / s, (m01 + m10) / s, 0.25 * s, (m12 + m21) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    q = [(m10 - m01) / s, (m02 + m20) / s, (m12 + m21) / s, 0.25 * s];
  }
  const l = Math.hypot(...q);
  return q.map((v) => v / l);
}

// ---------- Le dodécaèdre ----------

function buildSolid() {
  const verts = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) verts.push([a, b, c]);
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      verts.push([0, a / PHI, b * PHI]);
      verts.push([a / PHI, b * PHI, 0]);
      verts.push([a * PHI, 0, b / PHI]);
    }
  }
  const V = verts.map((v) => scale(v, 1 / Math.sqrt(3)));
  const normals = [];
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      normals.push(norm([0, a * PHI, b]));
      normals.push(norm([b, 0, a * PHI]));
      normals.push(norm([a * PHI, b, 0]));
    }
  }
  // Numérotation : deux faces opposées totalisent 13 (une face de chaque paire opposée).
  const numbers = new Array(12).fill(0);
  [0, 4, 8, 1, 6, 2].forEach((i, k) => {
    const j = normals.findIndex((m) => dot(m, normals[i]) < -0.999);
    numbers[i] = k + 1;
    numbers[j] = 12 - k;
  });

  return normals.map((n, i) => {
    const dots = V.map((v) => dot(v, n));
    const max = Math.max(...dots);
    const idx = dots.map((d, j) => (d > max - 1e-6 ? j : -1)).filter((j) => j >= 0);
    const c = scale(n, max);
    const e1 = norm(sub(V[idx[0]], c));
    const e2 = cross(n, e1);
    idx.sort((a, b) => {
      const pa = sub(V[a], c);
      const pb = sub(V[b], c);
      return Math.atan2(dot(pa, e2), dot(pa, e1)) - Math.atan2(dot(pb, e2), dot(pb, e1));
    });
    const up = norm(sub(V[idx[0]], c));
    return { n, c, up, right: cross(up, n), num: numbers[i], verts: idx.map((j) => V[j]) };
  });
}

const FACES = buildSolid();

// ---------- Rendu ----------

const LIGHT = norm([-0.45, 0.78, 0.6]);
const HALF = norm(add(LIGHT, [0, 0, 1]));
const BASE = [150, 20, 40];
const CAM = 5.2; // distance de la caméra, en rayons du dé

export class Dice {
  constructor(canvas, { region, rest }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.region = region; // zone de la scène couverte par le canvas {x, y, w, h}
    this.rest = rest; // position de repos (unités de la scène)
    this.size = 58; // rayon du dé
    this.q = this.targetFor(1 + Math.floor(Math.random() * 12));
    this.qRest = this.q;
    this.pos = { x: rest.x, y: rest.y, h: 0 };
    this.glow = 0;
    this.rolling = false;
    this.active = true;
    this.t0 = performance.now();
    this.loop = this.loop.bind(this);
    this.resize(1);
    requestAnimationFrame(this.loop);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.kick(); });
  }

  resize(stageScale) {
    const touch = navigator.maxTouchPoints > 1;
    const dpr = Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2);
    const k = stageScale * dpr;
    this.k = k;
    this.canvas.width = Math.round(this.region.w * k);
    this.canvas.height = Math.round(this.region.h * k);
    this.draw();
  }

  setActive(on) {
    this.active = on;
    if (on) this.kick();
  }

  kick() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.loop);
  }

  // Orientation qui présente la face « n » vers le public, chiffre à l'endroit.
  targetFor(n, twist = 0) {
    const f = FACES.find((x) => x.num === n);
    const V = norm([0, 0.3, 1]);
    let U = norm(sub([0, 1, 0], scale(V, V[1])));
    U = qRotate(qAxis(V, twist), U);
    const R = cross(U, V);
    const qT = qFromBasis(R, U, V);
    const qS = qFromBasis(f.right, f.up, f.n);
    return qMul(qT, qConj(qS));
  }

  // Lance le dé. Résout la promesse quand il est immobile sur la face « result ».
  roll(result, { onBounce, onFrame } = {}) {
    return new Promise((resolve) => {
      const qStart = this.q;
      const qEnd = this.targetFor(result, (Math.random() - 0.5) * 0.22);
      let qd = qMul(qStart, qConj(qEnd));
      if (qd[0] < 0) qd = qd.map((v) => -v);
      const phi = 2 * Math.acos(Math.min(1, qd[0]));
      const sn = Math.sqrt(Math.max(0, 1 - qd[0] * qd[0]));
      const axisA = sn < 1e-4 ? [1, 0, 0] : [qd[1] / sn, qd[2] / sn, qd[3] / sn];
      const axisB = norm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);
      const turnsA = 2 + Math.floor(Math.random() * 2);
      const turnsB = 1;

      const segs = [
        { d: 0.95, h: 1 },
        { d: 0.52, h: 0.36 },
        { d: 0.34, h: 0.13 },
        { d: 0.22, h: 0.045 },
      ];
      const settle = 0.45;
      const T = segs.reduce((s, g) => s + g.d, 0) + settle;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const ampX = 70 + Math.random() * 50;
      const ampY = 26 + Math.random() * 14;
      const start = performance.now();
      let seg = 0;
      this.rolling = true;
      this.glow = 0;
      this.kick();

      this.anim = (now) => {
        const t = Math.min(T, (now - start) / 1000);
        const u = t / T;
        // hauteur : succession de paraboles
        let acc = 0;
        let h = 0;
        let i = 0;
        for (; i < segs.length; i++) {
          if (t < acc + segs[i].d) {
            const v = (t - acc) / segs[i].d;
            h = segs[i].h * 4 * v * (1 - v);
            break;
          }
          acc += segs[i].d;
        }
        if (i !== seg) {
          if (onBounce && seg < segs.length) onBounce(segs[seg].h);
          seg = i;
        }
        const fade = Math.pow(1 - u, 1.6);
        this.pos.x = this.rest.x + dir * ampX * Math.sin(u * Math.PI * 2.1) * fade;
        this.pos.y = this.rest.y + ampY * Math.sin(u * Math.PI * 1.7 + 0.5) * fade * fade - ampY * 0.48 * fade * fade;
        this.pos.h = h;
        const s = Math.pow(1 - u, 2.4);
        const qa = qAxis(axisA, (phi + 2 * Math.PI * turnsA) * s);
        const qb = qAxis(axisB, 2 * Math.PI * turnsB * Math.pow(s, 1.4));
        this.q = qMul(qMul(qa, qb), qEnd);
        if (onFrame) onFrame(this.screenPos(), h);
        if (t >= T) {
          this.q = qEnd;
          this.qRest = qEnd;
          this.pos = { x: this.rest.x, y: this.rest.y, h: 0 };
          this.anim = null;
          this.rolling = false;
          this.glow = 1;
          this.t0 = performance.now();
          resolve();
        }
      };
    });
  }

  // Position du dé dans la scène (pour les particules).
  screenPos() {
    return { x: this.pos.x, y: this.pos.y - this.pos.h * 250 };
  }

  loop(now) {
    // Au repos, 30 images/s suffisent (économise la batterie et le processeur).
    if (!this.anim && this.active && now - (this.lastIdle || 0) < 30) {
      requestAnimationFrame(this.loop);
      return;
    }
    if (!this.anim) this.lastIdle = now;
    if (this.anim) {
      this.anim(now);
    } else if (this.active) {
      // Flottement doux au repos.
      const t = (now - this.t0) / 1000;
      const wob = qMul(qAxis([1, 0, 0], Math.sin(t * 0.9) * 0.07), qAxis([0, 1, 0], Math.sin(t * 0.63) * 0.1));
      this.q = qMul(wob, this.qRest);
      this.pos.h = 0.018 + Math.sin(t * 1.4) * 0.018;
      this.glow = Math.max(0.35, this.glow * 0.985);
    }
    this.draw();
    if ((this.anim || this.active) && !document.hidden) {
      requestAnimationFrame(this.loop);
    } else {
      this.running = false;
    }
  }

  draw() {
    const ctx = this.ctx;
    const { k, region } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(k, 0, 0, k, -region.x * k, -region.y * k);

    const h = this.pos.h;
    const gx = this.pos.x;
    const gy = this.pos.y;
    const cx = gx;
    const cy = gy - h * 250;
    const size = this.size * (1 + h * 0.3);

    // Ombre et halo au sol
    const sh = ctx.createRadialGradient(gx, gy + 46, 0, gx, gy + 46, 80);
    sh.addColorStop(0, `rgba(0,0,0,${0.55 * (1 - h * 0.7)})`);
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.save();
    ctx.translate(gx, gy + 46);
    ctx.scale(1 - h * 0.35, 0.3 * (1 - h * 0.35));
    ctx.translate(-gx, -(gy + 46));
    ctx.beginPath();
    ctx.arc(gx, gy + 46, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.glow > 0) {
      const g = ctx.createRadialGradient(cx, cy, size * 0.4, cx, cy, size * 2.3);
      g.addColorStop(0, `rgba(255,214,140,${0.5 * this.glow})`);
      g.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    const proj = (p) => {
      const f = CAM / (CAM - p[2]);
      return [cx + p[0] * size * f, cy - p[1] * size * f];
    };

    const faces = [];
    for (const f of FACES) {
      const n = qRotate(this.q, f.n);
      const c = qRotate(this.q, f.c);
      const toCam = sub([0, 0, CAM], c);
      const facing = dot(n, norm(toCam));
      if (facing <= 0.001) continue;
      faces.push({ f, n, c, facing, pts: f.verts.map((v) => proj(qRotate(this.q, v))) });
    }
    faces.sort((a, b) => a.c[2] - b.c[2]);

    ctx.lineJoin = 'round';
    for (const F of faces) {
      const diff = Math.max(0, dot(F.n, LIGHT));
      const spec = Math.pow(Math.max(0, dot(F.n, HALF)), 26);
      const lum = 0.34 + diff * 0.86;
      const col = BASE.map((b) => Math.min(255, Math.round(b * lum + 255 * spec * 0.55)));
      const light = col.map((v) => Math.min(255, Math.round(v * 1.22 + 10)));
      const dark = col.map((v) => Math.round(v * 0.72));

      let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
      F.pts.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
      const grad = ctx.createLinearGradient(minX, minY, maxX, maxY);
      grad.addColorStop(0, `rgb(${light})`);
      grad.addColorStop(1, `rgb(${dark})`);

      ctx.beginPath();
      F.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 208, 130, .95)';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Chiffre, dans le plan de la face
      const up = qRotate(this.q, F.f.up);
      const right = qRotate(this.q, F.f.right);
      const [px, py] = proj(F.c);
      const d = 0.01;
      const [rx, ry] = proj(add(F.c, scale(right, d)));
      const [ux, uy] = proj(add(F.c, scale(up, d)));
      const ax = (rx - px) / d / 100;
      const ay = (ry - py) / d / 100;
      const bx = -(ux - px) / d / 100;
      const by = -(uy - py) / d / 100;
      ctx.save();
      ctx.transform(ax, ay, bx, by, px, py);
      const num = String(F.f.num);
      ctx.font = `700 ${num.length > 1 ? 40 : 48}px Cinzel, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = Math.min(1, F.facing * 1.6);
      ctx.fillStyle = 'rgba(40, 0, 8, .55)';
      ctx.fillText(num, 1.5, 4);
      const tg = ctx.createLinearGradient(0, -24, 0, 24);
      tg.addColorStop(0, '#fff3c4');
      tg.addColorStop(0.5, '#f0c661');
      tg.addColorStop(1, '#b8842a');
      ctx.fillStyle = tg;
      ctx.fillText(num, 0, 2);
      if (num === '6' || num === '9') {
        ctx.fillRect(-12, 25, 24, 3.5);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
