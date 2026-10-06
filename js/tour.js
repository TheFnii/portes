// Écran de veille « présentation » : une petite étoile fait le tour des cases du tableau de
// bord. La case présentée est mise en lumière, l'étoile la montre du doigt, et une bulle
// explique à quoi elle sert. Textes, position de l'étoile et durées : Réglages.

import { STORAGE } from './config.js';

// Les cases présentables : élément du tableau de bord et texte par défaut.
export const TOUR_TARGETS = {
  pinned: { el: 'pinned', label: 'Message épinglé', title: 'Le message épinglé', text: 'Ici s’affiche le message que j’épingle pendant le live : l’info importante du moment.' },
  list: { el: 'queue-col', label: 'Liste à traiter', title: 'La liste des tirages', text: 'Un Chat porte-bonheur, une Galaxie ou une victoire au Jeu des Portes vous place dans cette liste. Le titre indique combien de tirages restent avant le prochain jeu.' },
  board: { el: 'board-box', label: 'Case centrale', title: 'Les règles du live', text: 'Toutes les règles et les infos utiles défilent ici. Prenez le temps de les lire ✨' },
  likes: { el: 'likes-box', label: 'Top Likes', title: 'Top Likes', text: 'Vos likes comptent ! Les plus beaux soutiens du live apparaissent ici, et certains paliers peuvent vous offrir un tirage.' },
  gifters: { el: 'gifters-box', label: 'Top Gifters', title: 'Top Gifters', text: 'Merci à celles et ceux qui offrent des cadeaux : le nombre de pièces de chacun s’affiche ici.' },
  univ: { el: 'donut-box', label: 'Message de l’univers', title: 'Message de l’univers', text: 'Avec un Donut, l’univers vous écrit une lettre rien que pour vous. Tous les messages reçus restent ici jusqu’à la fin du live.' },
  game: { el: 'btn-open-game', label: 'Jeu des Portes', title: 'Le Jeu des Portes', text: 'Quand je lance le jeu, écrivez un chiffre de 1 à 12 dans le chat. Si le dé ouvre votre porte, je réponds à votre question !' },
  radio: { el: 'radio', label: 'Radio', title: 'La radio', text: 'La musique qui accompagne le live, tout droit sortie du Grimoire.' },
};

export const TOUR_SIDES = [['auto', 'Automatique'], ['left', 'À gauche de la case'], ['right', 'À droite de la case'], ['top', 'Au-dessus de la case'], ['bottom', 'En dessous de la case']];

export function defaultTour() {
  return ['pinned', 'list', 'board', 'likes', 'gifters', 'univ', 'game'].map((key) => ({
    key, on: true, title: TOUR_TARGETS[key].title, text: TOUR_TARGETS[key].text, side: 'auto', pose: 'auto', seconds: 9,
  }));
}

export function loadTour() {
  try {
    const t = JSON.parse(localStorage.getItem(STORAGE.tour) || 'null');
    if (Array.isArray(t) && t.length) return t.filter((s) => s && TOUR_TARGETS[s.key]);
  } catch (e) { /* réglages illisibles */ }
  return defaultTour();
}

export function saveTour(steps) {
  localStorage.setItem(STORAGE.tour, JSON.stringify(steps));
}

// Les poses de l'étoile (images/etoile/<nom>.webp, découpées dans la planche fournie).
export const STAR_POSES = [
  ['regard-droite', 'Regarde à droite'], ['regard-droite-doux', 'Regarde à droite (douce)'],
  ['regard-gauche', 'Regarde à gauche'], ['regard-gauche-doux', 'Regarde à gauche (douce)'], ['regard-gauche-sourire', 'Regarde à gauche (sourire)'],
  ['en-bas', 'Regarde en bas'], ['en-bas-droite', 'Regarde en bas à droite'], ['en-bas-gauche', 'Regarde en bas à gauche'],
  ['en-haut-droite', 'Monte vers la droite'], ['en-haut-gauche', 'Monte vers la gauche'],
  ['face', 'Face'], ['douce', 'Douce'], ['curieuse', 'Curieuse'], ['heureuse', 'Heureuse'], ['joyeuse', 'Joyeuse'],
  ['grand-sourire', 'Grand sourire'], ['rieuse', 'Rieuse'], ['rire', 'Rire'], ['eclat-de-rire', 'Éclat de rire'],
  ['clin-oeil', 'Clin d’œil'], ['clin-doux', 'Clin d’œil doux'], ['espiegle', 'Espiègle'], ['malicieuse', 'Malicieuse'],
  ['emerveillee', 'Émerveillée'], ['surprise', 'Surprise'], ['etonnee', 'Étonnée'], ['sereine', 'Sereine'],
  ['timide', 'Timide'], ['bisou', 'Bisou'], ['triste', 'Triste'], ['grincheuse', 'Grincheuse'],
  ['vol-droite', 'Vol vers la droite'], ['vol-gauche', 'Vol vers la gauche'],
  ['vol-droite-clin', 'Vol clin d’œil (droite)'], ['vol-gauche-clin', 'Vol clin d’œil (gauche)'],
  ['vol-droite-joie', 'Vol joyeux (droite)'], ['vol-gauche-joie', 'Vol joyeux (gauche)'],
  ['vol-droite-reve', 'Vol rêveur (droite)'], ['vol-gauche-reve', 'Vol rêveur (gauche)'],
];
export const starImage = (pose) => `images/etoile/${pose}.webp`;

// Une petite flèche dorée qui part de l'étoile vers la case.
const ARM_SVG = `<svg viewBox="0 0 60 30" aria-hidden="true"><path d="M2 15 Q20 9 40 12 L40 5 L58 15 L40 25 L40 18 Q20 21 2 15 Z" fill="#ffd86e" stroke="#a8670f" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
const DIR_ANGLE = { right: 0, down: 90, left: 180, up: -90 };
// Pose automatique : l'étoile regarde la case.
const LOOK = { right: 'regard-droite', left: 'regard-gauche', down: 'en-bas', up: 'en-haut-droite' };
const POSE_KEYS = new Set(STAR_POSES.map(([k]) => k));

export class Tour {
  // getSettings : réglages (taille de la bulle…) ; render : texte → HTML (autocollants).
  constructor(root, { getSettings = () => ({}), render = (t) => t } = {}) {
    this.root = root;
    this.getSettings = getSettings;
    this.render = render;
    root.innerHTML = `<div class="tour-spot"></div>
      <div class="tour-star"><div class="tour-star-body"></div><div class="tour-arm">${ARM_SVG}</div></div>
      <div class="tour-bubble"><h2 class="tour-title"></h2><p class="tour-text"></p><span class="tour-tail"></span></div>
      <p class="tour-dots"></p>`;
    this.spot = root.querySelector('.tour-spot');
    this.star = root.querySelector('.tour-star');
    this.bubble = root.querySelector('.tour-bubble');
    this.timer = null;
    // Les images sont chargées d'avance (pas de clignotement au changement de pose).
    this.preload = STAR_POSES.map(([k]) => { const i = new Image(); i.src = starImage(k); return i; });
    window.addEventListener('resize', () => { if (this.active) this.show(this.index, true); });
  }

  get active() {
    return !this.root.hidden;
  }

  // Étapes à montrer : activées, avec une case visible à l'écran.
  steps() {
    return loadTour().filter((s) => {
      if (!s.on) return false;
      const el = document.getElementById(TOUR_TARGETS[s.key].el);
      if (!el || el.closest('.feature-off')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  open() {
    this.list = this.steps();
    if (!this.list.length) return false;
    this.root.hidden = false;
    this.index = 0;
    this.show(0);
    return true;
  }

  // Le texte prend la plus grande taille qui tient dans la bulle.
  fitText(max) {
    const b = this.bubble;
    let fs = max;
    b.style.setProperty('--tour-fs', `${fs}px`);
    const title = b.querySelector('.tour-title');
    const text = b.querySelector('.tour-text');
    const style = getComputedStyle(b);
    const room = b.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const used = () => title.offsetHeight + text.offsetHeight + parseFloat(getComputedStyle(title).marginBottom || 0);
    while (fs > 14 && used() > room) {
      fs -= 2;
      b.style.setProperty('--tour-fs', `${fs}px`);
    }
  }

  // Change l'image de l'étoile (flying : pendant le vol, la flèche se cache).
  pose(name, flying = false) {
    const body = this.star.querySelector('.tour-star-body');
    if (body.dataset.pose !== name) {
      body.dataset.pose = name;
      body.innerHTML = `<img src="${starImage(name)}" alt="">`;
    }
    this.star.classList.toggle('flying', flying);
    this.star.classList.toggle('hidden-arm', /^vol/.test(name));
  }

  close() {
    clearTimeout(this.timer);
    clearTimeout(this.poseTimer);
    this.starPos = null;
    this.root.hidden = true;
    this.root.classList.remove('in');
  }

  next() {
    this.index = (this.index + 1) % this.list.length;
    this.show(this.index);
  }

  show(i, resize = false) {
    if (!resize) clearTimeout(this.timer);
    const step = this.list[i];
    const el = document.getElementById(TOUR_TARGETS[step.key].el);
    const W = window.innerWidth;
    const H = window.innerHeight;
    const pad = 10;
    const r0 = el.getBoundingClientRect();
    const r = { left: r0.left - pad, top: r0.top - pad, right: r0.right + pad, bottom: r0.bottom + pad };
    r.width = r.right - r.left;
    r.height = r.bottom - r.top;
    Object.assign(this.spot.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });

    // Côté de l'étoile : celui choisi, ou celui où il reste le plus de place.
    const space = { left: r.left, right: W - r.right, top: r.top, bottom: H - r.bottom };
    let side = step.side;
    if (!space[side] || side === 'auto') side = Object.entries(space).sort((a, b) => b[1] - a[1])[0][0];
    const S = Math.max(80, Math.min(150, Math.min(W, H) * 0.16));
    const gap = 14;
    let sx;
    let sy;
    if (side === 'left') { sx = r.left - S - gap; sy = r.top + r.height / 2 - S / 2; }
    if (side === 'right') { sx = r.right + gap; sy = r.top + r.height / 2 - S / 2; }
    if (side === 'top') { sx = r.left + r.width / 2 - S / 2; sy = r.top - S - gap; }
    if (side === 'bottom') { sx = r.left + r.width / 2 - S / 2; sy = r.bottom + gap; }
    sx = Math.min(W - S - 8, Math.max(8, sx));
    sy = Math.min(H - S - 8, Math.max(8, sy));
    const dir = { left: 'right', right: 'left', top: 'down', bottom: 'up' }[side];
    const pose = POSE_KEYS.has(step.pose) ? step.pose : LOOK[dir];
    const prev = this.starPos;
    const moving = !resize && prev && Math.hypot(prev.x - sx, prev.y - sy) > 30;
    this.star.style.cssText = `left:${sx}px;top:${sy}px;width:${S}px;height:${S}px;--s:${S}px`;
    this.star.querySelector('.tour-arm').style.setProperty('--a', `${DIR_ANGLE[dir]}deg`);
    clearTimeout(this.poseTimer);
    if (moving) {
      // Elle vole jusqu'à la case suivante, puis prend sa pose.
      this.pose(sx < prev.x ? 'vol-gauche' : 'vol-droite', true);
      this.poseTimer = setTimeout(() => this.pose(pose), 850);
    } else if (!prev && !resize) {
      // Au début, elle arrive toute joyeuse.
      this.pose('joyeuse');
      this.poseTimer = setTimeout(() => this.pose(pose), 1500);
    } else {
      this.pose(pose);
    }
    this.starPos = { x: sx, y: sy };

    // La bulle : dans la plus grande zone libre de l'écran (hors case et étoile).
    const st = { left: sx, top: sy, right: sx + S, bottom: sy + S };
    const zones = [
      { x: 16, y: 16, w: Math.min(r.left, st.left) - 32, h: H - 32, tail: 'right' },
      { x: Math.max(r.right, st.right) + 16, y: 16, w: W - Math.max(r.right, st.right) - 32, h: H - 32, tail: 'left' },
      { x: 16, y: 16, w: W - 32, h: Math.min(r.top, st.top) - 32, tail: 'bottom' },
      { x: 16, y: Math.max(r.bottom, st.bottom) + 16, w: W - 32, h: H - Math.max(r.bottom, st.bottom) - 32, tail: 'top' },
    ].filter((z) => z.w > 160 && z.h > 110);
    const zone = zones.sort((a, b) => Math.min(b.w, 900) * Math.min(b.h, 700) - Math.min(a.w, 900) * Math.min(a.h, 700))[0] || { x: W * 0.1, y: H * 0.6, w: W * 0.8, h: H * 0.35, tail: 'top' };
    this.bubble.querySelector('.tour-title').innerHTML = this.render(step.title || '');
    this.bubble.querySelector('.tour-text').innerHTML = this.render(step.text || '');
    // La bulle prend la plus grande partie de l'espace libre (réglable), le texte s'y ajuste.
    const set = this.getSettings();
    const k = Math.min(1, Math.max(0.5, (Number(set.tourBubble) || 92) / 100));
    const bw = Math.max(200, zone.w * k);
    const bh = Math.max(120, zone.h * k);
    this.bubble.className = `tour-bubble tail-${zone.tail}`;
    Object.assign(this.bubble.style, { width: `${bw}px`, height: `${bh}px`, left: '0px', top: '0px', visibility: 'hidden' });
    this.fitText(Number(set.tourTextMax) || 54);
    requestAnimationFrame(() => {
      const b = this.bubble.getBoundingClientRect();
      // Au plus près de l'étoile, sans sortir de la zone.
      const cx = Math.min(zone.x + zone.w - b.width, Math.max(zone.x, sx + S / 2 - b.width / 2));
      const cy = Math.min(zone.y + zone.h - b.height, Math.max(zone.y, sy + S / 2 - b.height / 2));
      this.bubble.style.left = `${cx}px`;
      this.bubble.style.top = `${cy}px`;
      // La pointe de la bulle se tourne vers l'étoile.
      const tail = this.bubble.querySelector('.tour-tail');
      if (zone.tail === 'left' || zone.tail === 'right') tail.style.top = `${Math.min(b.height - 30, Math.max(14, sy + S / 2 - cy - 12))}px`;
      else tail.style.left = `${Math.min(b.width - 30, Math.max(14, sx + S / 2 - cx - 12))}px`;
      tail.style.removeProperty(zone.tail === 'left' || zone.tail === 'right' ? 'left' : 'top');
      this.bubble.style.visibility = '';
      if (!resize) {
        this.bubble.classList.remove('pop');
        void this.bubble.offsetWidth;
        this.bubble.classList.add('pop');
      }
    });
    this.root.querySelector('.tour-dots').innerHTML = this.list.map((s, k) => `<span${k === i ? ' class="on"' : ''}></span>`).join('');
    this.root.classList.add('in');
    if (!resize) this.timer = setTimeout(() => this.next(), Math.max(3, Number(step.seconds) || 9) * 1000);
  }
}
