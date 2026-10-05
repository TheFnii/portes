// Écran de veille « présentation » : une petite étoile fait le tour des cases du tableau de
// bord. La case présentée est mise en lumière, l'étoile la montre du doigt, et une bulle
// explique à quoi elle sert. Textes, position de l'étoile et durées : Réglages.

import { STORAGE } from './config.js';
import { image } from './images.js';
import { esc } from './shell.js';

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
    key, on: true, title: TOUR_TARGETS[key].title, text: TOUR_TARGETS[key].text, side: 'auto', seconds: 9,
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

// L'étoile dessinée (si aucune image n'est fournie) : un visage doux et un petit bras qui pointe.
const STAR_SVG = `<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs><radialGradient id="tour-star" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".55" stop-color="#ffd86e"/><stop offset="1" stop-color="#e09a22"/></radialGradient></defs>
  <path d="M60 6 L74 42 L112 44 L82 68 L93 106 L60 84 L27 106 L38 68 L8 44 L46 42 Z" fill="url(#tour-star)" stroke="#a8670f" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="49" cy="56" r="4.5" fill="#3a2410"/><circle cx="71" cy="56" r="4.5" fill="#3a2410"/>
  <circle cx="50.5" cy="54.5" r="1.4" fill="#fff"/><circle cx="72.5" cy="54.5" r="1.4" fill="#fff"/>
  <path d="M51 66 q9 8 18 0" fill="none" stroke="#3a2410" stroke-width="3" stroke-linecap="round"/>
  <circle cx="42" cy="66" r="4" fill="#ff9aa8" opacity=".7"/><circle cx="78" cy="66" r="4" fill="#ff9aa8" opacity=".7"/>
</svg>`;
const ARM_SVG = `<svg viewBox="0 0 60 30" aria-hidden="true"><path d="M2 15 Q20 9 40 12 L40 5 L58 15 L40 25 L40 18 Q20 21 2 15 Z" fill="#ffd86e" stroke="#a8670f" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

// Image fournie pour chaque direction (la pointe vers la case).
const POSE_IMAGE = { right: 'starRight', left: 'starLeft', up: 'starUp', down: 'starDown' };
const POSE_ANGLE = { right: 0, down: 90, left: 180, up: -90 };

export class Tour {
  constructor(root) {
    this.root = root;
    root.innerHTML = `<div class="tour-spot"></div>
      <div class="tour-star"><div class="tour-star-body"></div><div class="tour-arm">${ARM_SVG}</div></div>
      <div class="tour-bubble"><h2 class="tour-title"></h2><p class="tour-text"></p><span class="tour-tail"></span></div>
      <p class="tour-dots"></p>`;
    this.spot = root.querySelector('.tour-spot');
    this.star = root.querySelector('.tour-star');
    this.bubble = root.querySelector('.tour-bubble');
    this.timer = null;
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

  close() {
    clearTimeout(this.timer);
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
    const pose = { left: 'right', right: 'left', top: 'down', bottom: 'up' }[side];
    const poseImg = image(POSE_IMAGE[pose]);
    this.star.style.cssText = `left:${sx}px;top:${sy}px;width:${S}px;height:${S}px;--s:${S}px`;
    this.star.className = `tour-star pose-${pose}${poseImg ? ' has-img' : ''}`;
    this.star.querySelector('.tour-star-body').innerHTML = poseImg ? `<img src="${esc(poseImg)}" alt="">` : STAR_SVG;
    this.star.querySelector('.tour-arm').style.setProperty('--a', `${POSE_ANGLE[pose]}deg`);

    // La bulle : dans la plus grande zone libre de l'écran (hors case et étoile).
    const st = { left: sx, top: sy, right: sx + S, bottom: sy + S };
    const zones = [
      { x: 16, y: 16, w: Math.min(r.left, st.left) - 32, h: H - 32, tail: 'right' },
      { x: Math.max(r.right, st.right) + 16, y: 16, w: W - Math.max(r.right, st.right) - 32, h: H - 32, tail: 'left' },
      { x: 16, y: 16, w: W - 32, h: Math.min(r.top, st.top) - 32, tail: 'bottom' },
      { x: 16, y: Math.max(r.bottom, st.bottom) + 16, w: W - 32, h: H - Math.max(r.bottom, st.bottom) - 32, tail: 'top' },
    ].filter((z) => z.w > 160 && z.h > 110);
    const zone = zones.sort((a, b) => b.w * b.h - a.w * a.h)[0] || { x: W * 0.1, y: H * 0.6, w: W * 0.8, h: H * 0.35, tail: 'top' };
    this.bubble.querySelector('.tour-title').textContent = step.title || '';
    this.bubble.querySelector('.tour-text').textContent = step.text || '';
    const bw = Math.min(zone.w, 620);
    this.bubble.style.maxWidth = `${bw}px`;
    this.bubble.style.maxHeight = `${zone.h}px`;
    this.bubble.className = `tour-bubble tail-${zone.tail}`;
    this.bubble.style.left = '0px';
    this.bubble.style.top = '0px';
    this.bubble.style.visibility = 'hidden';
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
