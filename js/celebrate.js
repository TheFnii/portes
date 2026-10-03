// Grandes animations au centre de l'écran : Chat porte-bonheur, Galaxie, enveloppe du Donut,
// palier de likes. Elles passent l'une après l'autre (jamais deux en même temps).

import { esc } from './shell.js';
import { image } from './images.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const CAT_SVG = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <radialGradient id="cel-cat" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f1dcc0"/></radialGradient>
    <linearGradient id="cel-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset="1" stop-color="#d49a2a"/></linearGradient>
  </defs>
  <ellipse cx="100" cy="150" rx="62" ry="44" fill="url(#cel-cat)" stroke="#3a2412" stroke-width="3"/>
  <path d="M146 120 q30 -40 20 -70 q-6 -10 -14 0 q8 30 -16 60z" fill="url(#cel-cat)" stroke="#3a2412" stroke-width="3"/>
  <circle cx="100" cy="86" r="50" fill="url(#cel-cat)" stroke="#3a2412" stroke-width="3"/>
  <path d="M58 64 L56 22 L88 46 Z M142 64 L144 22 L112 46 Z" fill="url(#cel-cat)" stroke="#3a2412" stroke-width="3" stroke-linejoin="round"/>
  <path d="M62 56 L61 32 L80 46 Z M138 56 L139 32 L120 46 Z" fill="#f4a3b3"/>
  <path d="M76 84 q8 -8 16 0 M108 84 q8 -8 16 0" fill="none" stroke="#3a2412" stroke-width="4" stroke-linecap="round"/>
  <path d="M96 100 l4 4 l4 -4 z" fill="#e0607a"/>
  <path d="M100 104 q-8 10 -16 4 M100 104 q8 10 16 4" fill="none" stroke="#3a2412" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M62 98 h-24 M62 106 h-22 M138 98 h24 M138 106 h22" stroke="#3a2412" stroke-width="2" stroke-linecap="round"/>
  <path d="M60 128 q40 16 80 0" fill="none" stroke="#c0392b" stroke-width="9" stroke-linecap="round"/>
  <circle cx="100" cy="140" r="11" fill="url(#cel-gold)" stroke="#8a5a12" stroke-width="2"/>
  <path d="M36 150 q-14 -30 4 -52 q10 -6 14 4 q-10 22 4 44z" fill="url(#cel-cat)" stroke="#3a2412" stroke-width="3"/>
</svg>`;

const ENVELOPE_BACK = `<svg viewBox="0 0 320 210" aria-hidden="true">
  <defs><linearGradient id="cel-paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf3e2"/><stop offset="1" stop-color="#e9d7b4"/></linearGradient></defs>
  <rect x="4" y="4" width="312" height="202" rx="10" fill="url(#cel-paper)" stroke="#b08a4a" stroke-width="3"/>
  <path d="M6 8 L160 120 L314 8" fill="#f3e6c8" stroke="#b08a4a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M6 204 L130 100 M314 204 L190 100" stroke="#c9a76a" stroke-width="2"/>
  <circle cx="160" cy="118" r="26" fill="#9b1c2c" stroke="#6a0f1c" stroke-width="3"/>
  <path d="M160 102 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1z" fill="#e8c77a"/>
</svg>`;

// Le dos dessiné (si aucune image n'est fournie), utilisable comme une image.
const BACK_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ENVELOPE_BACK.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}`;

const clampPct = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : def;
};

// Proportions de l'image (largeur / hauteur).
function imageRatio(url, fallback) {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : fallback);
    img.onerror = () => ok(fallback);
    img.src = url;
    setTimeout(() => ok(fallback), 3000);
  });
}

export class Celebrate {
  constructor({ root, fx, sound, getSettings }) {
    this.root = root;
    this.fx = fx;
    this.sound = sound;
    this.getSettings = getSettings;
    this.queue = [];
    this.busy = false;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'confetti';
    root.appendChild(this.canvas);
  }

  // kind : 'cat' | 'galaxy' | 'donut' | 'milestone' ; data : { name, questions, giftImage, title, target }
  // Renvoie une promesse tenue à la fin de cette animation.
  play(kind, data) {
    return new Promise((done) => {
      if (this.queue.length > 6) { done(); return; } // énorme combo : on n'empile pas des minutes d'animation
      this.queue.push([kind, data, done]);
      if (!this.busy) this.run();
    });
  }

  async run() {
    this.busy = true;
    while (this.queue.length) {
      const [kind, data, done] = this.queue.shift();
      try {
        await this[kind](data);
      } catch (e) {
        console.error(e);
      }
      done();
    }
    this.busy = false;
  }

  get seconds() {
    return Math.max(2, Number(this.getSettings().animSeconds) || 4);
  }

  stage(cls, html) {
    const el = document.createElement('div');
    el.className = `cel ${cls}`;
    el.innerHTML = html;
    this.root.appendChild(el);
    this.root.hidden = false;
    void el.offsetWidth;
    el.classList.add('in');
    return el;
  }

  async finish(el, extra = 0) {
    await wait(this.seconds * 1000 + extra);
    el.classList.add('out');
    await wait(600);
    el.remove();
    if (!this.root.querySelector('.cel')) this.root.hidden = true;
  }

  center() {
    return { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
  }

  // Particules magiques qui jaillissent autour de l'illustration pendant `ms`.
  magic(ms, glow) {
    const c = this.center();
    const r = Math.min(window.innerWidth, window.innerHeight) * 0.22;
    const id = setInterval(() => {
      const a = Math.random() * Math.PI * 2;
      this.fx.burst(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.9, { count: 10, speed: 120, life: 1.4, stars: 0.75, size: 0.9, glow });
    }, 160);
    setTimeout(() => clearInterval(id), ms);
  }

  async cat({ name, text, giftImage }) {
    // Illustration fournie (images/animations/chat), sinon l'image du cadeau, sinon le dessin.
    const url = image('animChat') || giftImage;
    const img = url ? `<img src="${esc(url)}" alt="" referrerpolicy="no-referrer">` : CAT_SVG;
    const el = this.stage('cel-cat', `
      <div class="cel-rays"></div>
      <div class="cel-icon${image('animChat') ? ' custom' : ''}">${img}</div>
      <p class="cel-text">${esc(text)}</p>
      <p class="cel-name">${esc(name)}</p>`);
    const fallback = el.querySelector('img');
    if (fallback) fallback.addEventListener('error', () => { fallback.outerHTML = CAT_SVG; });
    this.sound.meow();
    const c = this.center();
    await wait(350);
    this.fx.burst(c.x, c.y, { count: 90, speed: 380, life: 2, stars: 0.45, size: 1.3 });
    this.magic(this.seconds * 1000 - 600);
    await this.finish(el);
  }

  async galaxy({ name, text }) {
    let stars = '';
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 30;
      stars += `<i style="left:${(50 + Math.cos(a) * r).toFixed(1)}%;top:${(50 + Math.sin(a) * r).toFixed(1)}%;animation-delay:${(-Math.random() * 2).toFixed(2)}s;--s:${(0.5 + Math.random()).toFixed(2)}"></i>`;
    }
    // Illustration fournie (images/animations/galaxie), sinon la galaxie dessinée.
    const url = image('animGalaxie');
    const art = url ? `<img class="cel-galaxy-img" src="${esc(url)}" alt="">` : '<div class="cel-spiral"></div><div class="cel-core"></div>';
    const el = this.stage('cel-galaxy', `
      <div class="cel-galaxy-disc${url ? ' custom' : ''}">${art}${stars}</div>
      <p class="cel-text">${esc(text)}</p>
      <p class="cel-name">${esc(name)}</p>`);
    this.sound.harp();
    const c = this.center();
    this.magic(this.seconds * 1000 - 600, 'violet');
    for (let i = 0; i < 4; i++) {
      await wait(450);
      this.fx.burst(c.x + (Math.random() - 0.5) * 200, c.y + (Math.random() - 0.5) * 120, { count: 40, speed: 220, life: 1.8, stars: 0.6, glow: 'violet' });
    }
    await this.finish(el, -1800);
  }

  // Message de l'univers (Donut) : l'enveloppe virevolte parmi les étoiles et les comètes
  // (on voit passer le côté du pseudo et celui du sceau), s'arrête, on entend son ouverture
  // et la lettre ouverte s'affiche aussitôt, l'enveloppe dépassant derrière.
  async donut({ name, text, message, target }) {
    const s = this.getSettings();
    const front = image('animEnveloppe');
    const back = image('animEnveloppeDos') || BACK_URL;
    const ratio = await imageRatio(back, 320 / 210);
    let comets = '';
    for (let i = 0; i < 6; i++) {
      comets += `<b class="comet" style="top:${(8 + Math.random() * 70).toFixed(0)}%;animation-delay:${(i * 0.35).toFixed(2)}s"></b>`;
    }
    const el = this.stage('cel-donut', `
      ${comets}
      <div class="env-fly" style="aspect-ratio:${ratio.toFixed(4)}">
        <div class="env-card">
          <div class="env-face env-back"><img src="${esc(back)}" alt=""></div>
          <div class="env-face env-front${front ? ' env-art' : ''}">${front ? `
            <img src="${esc(front)}" alt="">
            <span class="env-name-on ${s.envNameFont === 'cinzel' ? 'cinzel' : 'script'}" style="left:${s.envNameX}%;top:${s.envNameY}%;color:${esc(s.envNameColor)};--env-size:${(s.envNameSize / 100).toFixed(2)}">${esc(name)}</span>` : `
            <span class="env-to">${esc(text)}</span>
            <span class="env-name">${esc(name)}</span>`}
          </div>
        </div>
      </div>`);
    this.sound.envelope(2.2);
    const c = this.center();
    const sparkle = setInterval(() => {
      this.fx.burst(c.x + (Math.random() - 0.5) * window.innerWidth * 0.6, c.y + (Math.random() - 0.5) * 300, { count: 8, speed: 90, life: 1.2, stars: 0.7, size: 0.8 });
    }, 220);
    await wait(2300);
    clearInterval(sparkle);
    await wait(250);

    // Ouverture : le son, puis directement la lettre ouverte.
    this.sound.opening();
    el.classList.add('reading');
    const card = await this.letterCard(name, message, back);
    el.appendChild(card);
    void card.offsetWidth;
    card.classList.add('in');
    this.fitLetter(card);
    this.fx.burst(c.x, c.y, { count: 50, speed: 240, life: 1.6, stars: 0.6, glow: 'violet' });
    await this.readLetter(card);

    // Puis elle rejoint la case « Message de l'univers ».
    const box = target && target.getBoundingClientRect();
    if (box && box.width) {
      const cr = card.getBoundingClientRect();
      card.style.transition = 'transform .9s cubic-bezier(.5, 0, .2, 1), opacity .9s ease';
      card.style.transform = `translate(${box.left + box.width / 2 - (cr.left + cr.width / 2)}px, ${box.top + 40 - (cr.top + cr.height / 2)}px) scale(.08)`;
      card.style.opacity = '0.2';
      await wait(900);
    }
    el.classList.add('out');
    await wait(500);
    el.remove();
    if (!this.root.querySelector('.cel')) this.root.hidden = true;
  }

  // Une lettre relue (touchée dans la liste des Messages de l'univers).
  async letter({ name, message }) {
    const el = this.stage('cel-letter-only', '');
    const card = await this.letterCard(name, message, image('animEnveloppeDos') || BACK_URL);
    el.appendChild(card);
    void card.offsetWidth;
    card.classList.add('in');
    this.fitLetter(card);
    this.sound.opening();
    await this.readLetter(card);
    el.classList.add('out');
    await wait(500);
    el.remove();
    if (!this.root.querySelector('.cel')) this.root.hidden = true;
  }

  // [Pseudo], — le message — ✦ (une étoile scintillante en guise de signature), sur la lettre
  // vierge fournie (Réglages) ou un papier dessiné ; un morceau d'enveloppe dépasse derrière.
  async letterCard(name, message, envelope) {
    const s = this.getSettings();
    const paper = image('animLettre');
    const ratio = paper ? await imageRatio(paper, 0.75) : 0;
    const card = document.createElement('div');
    card.className = `letter-card${paper ? ' has-paper' : ''}`;
    if (paper) {
      card.style.setProperty('--paper', `url("${paper}")`);
      card.style.setProperty('--ratio', ratio.toFixed(4));
      card.style.setProperty('--margin', `${Math.min(30, Math.max(0, Number(s.letterMargin) || 12))}%`);
    }
    card.innerHTML = `${envelope ? `<img class="letter-env" src="${esc(envelope)}" alt="">` : ''}
      <div class="letter-paper"><div class="letter-text">
        <p class="l-name">${esc(name)},</p><p class="l-msg">${esc(message || '')}</p>
      </div><span class="l-sign" aria-hidden="true">✦</span></div>`;
    return card;
  }

  // Le texte prend la plus grande taille qui tient sur la lettre.
  fitLetter(card) {
    const text = card.querySelector('.letter-text');
    const box = card.querySelector('.letter-paper');
    let k = 1;
    card.style.setProperty('--lfs', k);
    while (k > 0.5 && (text.scrollHeight > box.clientHeight * 0.98 || box.scrollHeight > box.clientHeight + 1)) {
      k -= 0.05;
      card.style.setProperty('--lfs', k.toFixed(2));
    }
  }

  // Le temps de lire (réglable) ; toucher la lettre la referme plus tôt.
  readLetter(card) {
    const ms = Math.max(4, Number(this.getSettings().letterSeconds) || 14) * 1000;
    return new Promise((done) => {
      const t = setTimeout(done, ms);
      card.addEventListener('pointerdown', () => { clearTimeout(t); done(); }, { once: true });
    }).then(() => { card.classList.add('folding'); return wait(350); });
  }

  async milestone({ name, title }) {
    const el = this.stage('cel-milestone', `
      <div class="cel-medal">🏅</div>
      <p class="cel-title">${esc(title)}</p>
      <p class="cel-name">${esc(name)}</p>`);
    this.sound.fanfare();
    this.confetti(this.seconds * 1000 + 1200);
    await this.finish(el, 800);
  }

  // Annonce discrète (palier qui approche).
  async banner({ text }) {
    const el = this.stage('cel-banner', `<p>${esc(text)}</p>`);
    await wait(3500);
    el.classList.add('out');
    await wait(600);
    el.remove();
    if (!this.root.querySelector('.cel')) this.root.hidden = true;
  }

  // Pluie de confettis sur un canvas dédié.
  confetti(ms) {
    const cv = this.canvas;
    const ctx = cv.getContext('2d');
    const w = (cv.width = window.innerWidth);
    const h = (cv.height = window.innerHeight);
    const colors = ['#f6e3a8', '#e8c77a', '#ff8fb1', '#9be7ff', '#c7a8ff', '#ffd36e', '#8ff0ae'];
    const parts = Array.from({ length: Math.min(220, Math.round(w / 5)) }, () => ({
      x: Math.random() * w,
      y: -20 - Math.random() * h * 0.6,
      vx: (Math.random() - 0.5) * 60,
      vy: 120 + Math.random() * 160,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 8,
      s: 6 + Math.random() * 8,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const end = performance.now() + ms;
    let last = performance.now();
    cv.style.opacity = '1';
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p) => {
        p.x += p.vx * dt + Math.sin(now / 300 + p.r) * 0.6;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        if (p.y > h + 20 && now < end - 1500) { p.y = -20; p.x = Math.random() * w; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      });
      if (now < end) requestAnimationFrame(tick);
      else { ctx.clearRect(0, 0, w, h); cv.style.opacity = '0'; }
    };
    requestAnimationFrame(tick);
  }
}
