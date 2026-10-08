// Case centrale (et message de fin de live) : les messages défilent de bas en haut, ou bien
// s'affichent un par un, quelques secondes chacun, puis glissent vers le suivant.
// Utilisé par la tablette (case, plein écran) et par la page des viewers.

import { rich } from './stickers.js';

const running = new Map(); // track → minuteur des diapositives

export function stopBoard(track) {
  clearInterval(running.get(track));
  running.delete(track);
}

// o : { speed, mode: 'scroll' | 'slides', seconds }
export function renderBoard(track, messages, o = {}) {
  stopBoard(track);
  track.textContent = '';
  track.className = 'board-track';
  track.style.removeProperty('--board-dur');
  if (!messages || !messages.length) return;
  if (o.mode === 'slides') slides(track, messages, o.seconds);
  else scroll(track, messages, o.speed || 30);
}

function scroll(track, messages, speed) {
  const copy = () => messages.map((m) => `<p class="board-item">${rich(m)}</p><span class="board-sep" aria-hidden="true">✦</span>`).join('');
  track.innerHTML = `<div>${copy()}</div><div aria-hidden="true">${copy()}</div>`;
  requestAnimationFrame(() => {
    if (!track.firstElementChild) return;
    const h = track.firstElementChild.getBoundingClientRect().height;
    const win = track.parentElement.clientHeight;
    // Peu de messages qui tiennent dans la case : on ne fait pas défiler.
    track.classList.toggle('still', h < win * 0.8);
    if (h < win * 0.8) track.lastElementChild.hidden = true;
    track.style.setProperty('--board-dur', `${(h / Math.max(5, speed)).toFixed(1)}s`);
  });
}

// Le message prend la plus grande taille qui tient dans la case.
function fit(slide) {
  const p = slide.firstElementChild;
  const win = slide.parentElement && slide.parentElement.parentElement;
  if (!p || !win || !win.clientHeight) return;
  p.style.fontSize = '';
  const base = parseFloat(getComputedStyle(p).fontSize) || 30;
  let size = Math.round(base * 1.6);
  p.style.fontSize = `${size}px`;
  while (size > 12 && (p.scrollHeight > win.clientHeight * 0.9 || p.scrollWidth > win.clientWidth + 1)) {
    size -= 2;
    p.style.fontSize = `${size}px`;
  }
}

function slides(track, messages, seconds) {
  track.classList.add('slides');
  track.innerHTML = messages.map((m) => `<div class="board-slide"><p class="board-item">${rich(m)}</p></div>`).join('');
  const items = [...track.children];
  let cur = -1;
  const next = () => {
    const prev = items[cur];
    cur = (cur + 1) % items.length;
    const el = items[cur];
    fit(el);
    if (prev && prev !== el) {
      prev.classList.remove('on');
      prev.classList.add('off');
      setTimeout(() => {
        // Retour à droite sans animation, prêt pour son prochain passage.
        prev.classList.add('reset');
        prev.classList.remove('off');
        void prev.offsetWidth;
        prev.classList.remove('reset');
      }, 900);
    }
    el.classList.add('on');
  };
  requestAnimationFrame(() => {
    if (!track.isConnected) return;
    next();
    if (items.length > 1) running.set(track, setInterval(next, Math.max(2, Number(seconds) || 8) * 1000));
  });
}

window.addEventListener('resize', () => document.querySelectorAll('.board-slide.on').forEach(fit));
