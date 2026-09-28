// Particules : lucioles du jardin, gerbes d'étincelles, étoiles scintillantes.
// (Adapté du grimoire.)

const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Tablettes (iPad, Android) : moins de particules et une résolution de canvas réduite.
export const TOUCH = navigator.maxTouchPoints > 1 || /iPad|Android/.test(navigator.userAgent);

function makeGlowSprite(size, inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.25, outer);
  grd.addColorStop(1, 'rgba(255,170,60,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

function makeStarSprite(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const m = size / 2;
  const glow = g.createRadialGradient(m, m, 0, m, m, m);
  glow.addColorStop(0, 'rgba(255,245,210,0.9)');
  glow.addColorStop(0.2, 'rgba(255,210,120,0.35)');
  glow.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);
  g.fillStyle = 'rgba(255,250,230,1)';
  g.beginPath();
  const r = m * 0.95;
  const k = m * 0.12;
  g.moveTo(m, m - r);
  g.quadraticCurveTo(m + k, m - k, m + r, m);
  g.quadraticCurveTo(m + k, m + k, m, m + r);
  g.quadraticCurveTo(m - k, m + k, m - r, m);
  g.quadraticCurveTo(m - k, m - k, m, m - r);
  g.fill();
  return c;
}

export class FX {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.parts = [];
    this.ambient = 0;
    this.running = false;
    this.last = 0;
    this.sprites = {
      gold: makeGlowSprite(64, 'rgba(255,248,220,1)', 'rgba(255,200,95,0.55)'),
      warm: makeGlowSprite(64, 'rgba(255,230,180,0.9)', 'rgba(255,150,60,0.35)'),
      star: makeStarSprite(64),
      violet: makeGlowSprite(64, 'rgba(252,244,255,1)', 'rgba(190,145,255,0.6)'),
      rose: makeGlowSprite(64, 'rgba(255,240,246,1)', 'rgba(255,140,190,0.55)'),
      firefly: makeGlowSprite(64, 'rgba(250,255,215,1)', 'rgba(200,240,120,0.5)'),
    };
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.kick();
    });
  }

  resize() {
    this.dpr = TOUCH ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  get scale() {
    return reduceMotion ? 0.3 : TOUCH ? 0.55 : this.w < 700 ? 0.6 : 1;
  }

  setAmbient(n) {
    this.ambient = Math.round(n * this.scale);
    this.kick();
  }

  add(p) {
    if (this.parts.length > 900) return;
    this.parts.push(p);
  }

  // Lucioles et poussière dorée qui flottent dans le jardin.
  mote() {
    const fly = Math.random() < 0.45;
    return {
      kind: 'mote',
      x: Math.random() * this.w,
      y: this.h * (0.15 + Math.random() * 0.85),
      vx: (Math.random() - 0.5) * (fly ? 18 : 6),
      vy: -3 - Math.random() * (fly ? 12 : 8),
      size: fly ? 3 + Math.random() * 4 : 3 + Math.random() * 7,
      life: 0,
      max: 6 + Math.random() * 8,
      sprite: fly ? 'firefly' : 'warm',
      alpha: fly ? 0.5 + Math.random() * 0.45 : 0.25 + Math.random() * 0.4,
      tw: Math.random() * Math.PI * 2,
    };
  }

  // Gerbe d'étincelles depuis un point.
  burst(x, y, { count = 40, speed = 160, spread = Math.PI * 2, angle = -Math.PI / 2, gravity = -30, size = 1, stars = 0.25, life = 1.6, glow = 'gold' } = {}) {
    const n = Math.round(count * this.scale);
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.35 + Math.random() * 0.8);
      const isStar = Math.random() < stars;
      this.add({
        kind: 'spark',
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: gravity,
        drag: 1.6,
        size: (isStar ? 10 + Math.random() * 14 : 4 + Math.random() * 9) * size,
        life: 0,
        max: life * (0.6 + Math.random() * 0.8),
        sprite: isStar ? 'star' : glow,
        alpha: 1,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 3,
        tw: Math.random() * 6,
      });
    }
    this.kick();
  }

  // Particules émises le long du contour d'un rectangle.
  edges(rect, { count = 60, speed = 90, life = 1.8 } = {}) {
    const n = Math.round(count * this.scale);
    const per = 2 * (rect.width + rect.height);
    for (let i = 0; i < n; i++) {
      let d = Math.random() * per;
      let x, y, a;
      if (d < rect.width) { x = rect.left + d; y = rect.top; a = -Math.PI / 2; }
      else if ((d -= rect.width) < rect.height) { x = rect.right; y = rect.top + d; a = 0; }
      else if ((d -= rect.height) < rect.width) { x = rect.right - d; y = rect.bottom; a = Math.PI / 2; }
      else { d -= rect.width; x = rect.left; y = rect.bottom - d; a = Math.PI; }
      this.burst(x, y, { count: 1 / this.scale, speed, angle: a, spread: 1.4, life, gravity: -40, stars: 0.3 });
    }
  }

  // Fontaine de lumière qui s'élève le long d'une ligne verticale.
  column(x, top, bottom, { count = 70, spread = 40, life = 2.4 } = {}) {
    const n = Math.round(count * this.scale);
    for (let i = 0; i < n; i++) {
      const y = top + Math.random() * (bottom - top);
      this.burst(x + (Math.random() - 0.5) * spread, y, {
        count: 1 / this.scale, speed: 70, angle: -Math.PI / 2, spread: 2.2, gravity: -60, life, stars: 0.35, size: 1.1,
      });
    }
  }

  // Grande ouverture de porte : explosion de lumière, fontaine et contour scintillant.
  portal(rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.45;
    this.burst(cx, cy, { count: 90, speed: Math.max(260, rect.width * 2.2), life: 2.2, stars: 0.35, size: 1.4 });
    this.burst(cx, cy, { count: 50, speed: rect.width * 1.4, life: 2.6, stars: 0.2, glow: 'violet', size: 1.2 });
    this.column(cx, rect.top, rect.bottom, { count: 80, spread: rect.width * 0.7, life: 2.8 });
    this.edges(rect, { count: 70, speed: 110, life: 2 });
  }

  // Petite traînée d'étincelles (dé en l'air).
  trail(x, y, k = 1) {
    this.burst(x, y, { count: 3 * k, speed: 50, life: 0.9, stars: 0.3, size: 0.8, gravity: 20 });
  }

  kick() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.tick);
  }

  tick(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    let motes = 0;
    for (const p of this.parts) if (p.kind === 'mote') motes++;
    while (motes < this.ambient) { this.add(this.mote()); motes++; }

    ctx.globalCompositeOperation = 'lighter';
    const alive = [];
    for (const p of this.parts) {
      p.life += dt;
      if (p.life >= p.max) continue;
      if (p.kind === 'mote' && motes > this.ambient && Math.random() < 0.02) { motes--; continue; }
      const t = p.life / p.max;
      if (p.kind === 'spark') {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy = p.vy * k + p.g * dt;
        p.rot += p.vr * dt;
      } else {
        p.vx += (Math.random() - 0.5) * 4 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.tw += dt * 5;
      let a;
      if (p.kind === 'mote') {
        a = p.alpha * Math.sin(Math.PI * t) * (0.65 + 0.35 * Math.sin(p.tw));
      } else {
        a = (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9) * (0.75 + 0.25 * Math.sin(p.tw * 2));
      }
      const s = p.size * (p.kind === 'spark' && p.sprite === 'star' ? 0.6 + 0.4 * Math.sin(Math.PI * t) : 1);
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      const img = this.sprites[p.sprite];
      if (p.sprite === 'star') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(img, -s, -s, s * 2, s * 2);
        ctx.restore();
      } else {
        ctx.drawImage(img, p.x - s, p.y - s, s * 2, s * 2);
      }
      alive.push(p);
    }
    this.parts = alive;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if ((this.parts.length || this.ambient) && !document.hidden) {
      requestAnimationFrame(this.tick);
    } else {
      this.running = false;
      ctx.clearRect(0, 0, this.w, this.h);
    }
  }
}
