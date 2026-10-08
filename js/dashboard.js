// Affichage du tableau de bord : message épinglé, Top Likes, Top Gifters, case centrale,
// liste à traiter, messages de l'univers. Disposition et textes viennent des Réglages.

import { ROLES } from './gifts.js';
import { image, LOGO_OF_ROLE } from './images.js';
import { fill } from './settings.js';
import { applyFonts } from './fonts.js';
import { rich } from './stickers.js';
import { esc } from './shell.js';
import { renderBoard, stopBoard } from './board.js';

const $ = (id) => document.getElementById(id);

// Pièce dorée des Top Gifters (nombre de pièces TikTok offertes).
export const COIN = `<svg class="coin" viewBox="0 0 32 32" aria-label="pièces" role="img">
  <defs><radialGradient id="coin-g" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff6c2"/><stop offset=".45" stop-color="#f4c542"/><stop offset="1" stop-color="#b07a12"/></radialGradient></defs>
  <circle cx="16" cy="16" r="15" fill="url(#coin-g)" stroke="#8a5a0a" stroke-width="1.5"/>
  <circle cx="16" cy="16" r="11" fill="none" stroke="#fff0a8" stroke-opacity=".7" stroke-width="1.2"/>
  <path d="M16 9.5l1.9 4 4.4.5-3.3 3 .9 4.3-3.9-2.2-3.9 2.2.9-4.3-3.3-3 4.4-.5z" fill="#c98d14" stroke="#fff3b8" stroke-width=".6"/>
</svg>`;

// Logo fourni (images/logos) en priorité, puis l'image du cadeau TikTok, puis l'emoji.
function logo(role, fallbackUrl, emoji) {
  const url = (LOGO_OF_ROLE[role] && image(LOGO_OF_ROLE[role])) || fallbackUrl;
  return url ? `<img src="${esc(url)}" alt="" referrerpolicy="no-referrer" loading="lazy" data-emoji="${emoji}">` : emoji;
}

// Icône d'une entrée de la liste (logo fourni, image du cadeau ou emoji).
export function entryIcon(e) {
  if (e.type === 'winner') return '<span class="gift-icon" title="Gagnant du jeu">🏆</span>';
  if (e.type === 'milestone') return '<span class="gift-icon" title="Palier de likes">🏅</span>';
  const role = ROLES[e.gift];
  const emoji = role ? role.emoji : '🎁';
  const img = logo(e.gift, e.giftImage, emoji);
  return `<span class="gift-icon" title="${esc(role ? role.label : '')}">${img}</span>`;
}

// Ligne de détail d'une entrée de la liste.
export function entryDetail(e) {
  if (e.type === 'winner') return `Gagnant · porte ${e.door ?? ''}`.trim();
  if (e.type === 'milestone') return e.label || 'Palier de likes';
  return `${e.count} question${e.count > 1 ? 's' : ''} en priorité`;
}

export const SECTIONS = { priority: 'Priorités', winner: 'Gagnants du jeu', milestone: 'Paliers de likes' };

export class Dashboard {
  constructor({ onRemove, onOpenLetter, onBoardFull }) {
    this.seen = new Set();
    this.lastCurrent = null;
    this.s = {};
    $('queue-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove]');
      if (b) onRemove(b.dataset.remove);
    });
    // Toucher un pseudo rouvre sa lettre de l'univers.
    $('donut-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-letter]');
      if (b) onOpenLetter(b.dataset.letter);
    });
    $('board-full-btn').addEventListener('click', () => onBoardFull());
    // Image de cadeau introuvable : l'emoji du rôle prend le relais.
    document.addEventListener('error', (e) => {
      const img = e.target;
      if (img.tagName === 'IMG' && img.closest('.gift-icon')) img.replaceWith(document.createTextNode(img.dataset.emoji || '🎁'));
    }, true);
    window.addEventListener('resize', () => this.fitPinned());
  }

  // ---------- Réglages : textes et disposition ----------

  applySettings(s, features) {
    this.s = s;
    applyFonts(s);
    document.querySelectorAll('[data-text]').forEach((el) => {
      const v = s[el.dataset.text];
      if (v !== undefined) el.innerHTML = rich(v);
    });
    const root = document.documentElement.style;
    root.setProperty('--ts', (s.textScale / 100).toFixed(2));
    root.setProperty('--pinned-h', `${s.pinnedHeight}px`);
    this.layout(s, features);
    this.fitPinned();
  }

  // Calcule les colonnes et les zones de la grille selon les modules affichés.
  layout(s, f) {
    const main = $('dash-main');
    const tops = f.likes || f.gifters;
    const list = f.list;
    const board = f.board;
    $('dash-tops').classList.toggle('feature-off', !tops);
    $('dash-tops').classList.toggle('single', !(f.likes && f.gifters));

    // Colonnes (de gauche à droite pour une liste à droite)
    let cols = [];
    if (tops) cols.push(['tops', `${s.sideWidth}%`]);
    if (board) cols.push(['board', 'minmax(0, 1fr)']);
    if (list) cols.push(['list', `${s.listWidth}%`]);
    if (!board && cols.length) cols[cols.length - 1][1] = 'minmax(0, 1fr)';
    if (!board && tops && list) cols = [['tops', 'minmax(0, 1fr)'], ['list', `${Math.max(s.listWidth, 40)}%`]];
    if (s.listSide === 'left') cols.reverse();
    if (!cols.length) cols = [['board', 'minmax(0, 1fr)']];

    // Rangée du haut : message épinglé, et la case des enveloppes au-dessus de la liste.
    const names = cols.map((c) => c[0]);
    const univCol = list ? names.indexOf('list') : names.length - 1;
    const top = names.map((n, i) => {
      if (f.donuts && i === univCol && names.length > 1) return 'univ';
      return f.pinned ? 'pin' : (f.donuts ? 'univ' : 'pin');
    });
    const showTop = f.pinned || f.donuts;
    main.style.gridTemplateColumns = cols.map((c) => c[1]).join(' ');
    main.style.gridTemplateRows = showTop ? 'var(--pinned-h, 150px) minmax(0, 1fr)' : 'minmax(0, 1fr)';
    main.style.gridTemplateAreas = (showTop ? `"${top.join(' ')}" ` : '') + `"${names.join(' ')}"`;
  }

  // ---------- Liste à traiter ----------

  title(queue) {
    const n = queue.draws;
    if (!n) return this.s.listTitleZero;
    if (n === 1) return this.s.listTitleOne;
    return fill(this.s.listTitle, { n });
  }

  icon(e) { return entryIcon(e); }

  detail(e) { return entryDetail(e); }

  renderQueue(queue) {
    $('queue-title').innerHTML = rich(this.title(queue));
    const list = queue.list();
    const cur = list[0];
    const box = $('queue-current');
    if (!cur) {
      box.className = 'queue-current empty';
      box.innerHTML = rich(this.s.listEmpty || '');
    } else {
      box.className = 'queue-current';
      if (this.lastCurrent !== cur.id) {
        void box.offsetWidth;
        box.classList.add('pop');
      }
      box.innerHTML = `${this.icon(cur)}
        <div class="who"><span class="kicker">${rich(this.s.currentLabel || '')}</span><strong>${esc(cur.name)}</strong><small>${esc(this.detail(cur))}</small></div>`;
    }
    this.lastCurrent = cur ? cur.id : null;

    let html = '';
    let section = cur ? cur.type : null;
    list.slice(1).forEach((e, i) => {
      if (e.type !== section) {
        section = e.type;
        html += `<li class="sep">${SECTIONS[e.type]}</li>`;
      }
      html += `<li${this.seen.has(e.id) ? '' : ' class="new"'}><span class="rank">${i + 2}</span>${this.icon(e)}
        <span class="who"><span class="name">${esc(e.name)}</span><small>${esc(this.detail(e))}</small></span>
        <button class="x-btn" data-remove="${esc(e.id)}" type="button" aria-label="Retirer ${esc(e.name)}">✕</button></li>`;
    });
    this.seen = new Set(list.map((e) => e.id));
    $('queue-list').innerHTML = html;
    $('btn-undo').disabled = !queue.history.length;
    $('btn-next').disabled = !cur;
  }

  milestoneChip(text) {
    const chip = $('milestone-chip');
    chip.hidden = !text;
    chip.textContent = text || '';
  }

  // ---------- Messages de l'univers (Donuts) ----------

  renderDonuts(queue) {
    const d = queue.donuts;
    const head = $('donut-head-icon');
    const src = image('logoEnveloppe') || '';
    if (head && head.dataset.src !== src) {
      head.dataset.src = src;
      head.innerHTML = logo('donut', '', '✉️');
    }
    $('donut-count').textContent = d.length;
    $('donut-list').innerHTML = d.length
      ? d.map((e) => `<li${this.seenLetters && !this.seenLetters.has(e.id) ? ' class="new"' : ''}><button class="letter-btn" ${e.message ? `data-letter="${esc(e.id)}"` : 'disabled'} type="button" aria-label="Relire la lettre de ${esc(e.name)}">
          <span class="env-mini gift-icon" aria-hidden="true">${logo('donut', '', '✉️')}</span><span class="name">${esc(e.name)}</span>${e.count > 1 ? `<span class="mult">×${e.count}</span>` : ''}
          ${e.message ? '<span class="reread" aria-hidden="true">Relire</span>' : ''}</button></li>`).join('')
      : `<li class="empty">${rich(this.s.univEmpty || '')}</li>`;
    this.seenLetters = new Set(d.map((e) => e.id));
  }

  // ---------- Tops ----------

  renderTop(listId, totalId, ranking, unit) {
    const n = this.s.topCount || 6;
    $(totalId).innerHTML = Math.round(ranking.total).toLocaleString('fr-FR') + unit;
    const medals = ['🥇', '🥈', '🥉'];
    const top = ranking.top(n);
    $(listId).innerHTML = top.length
      ? top.map((u, i) => `<li><span class="medal">${medals[i] || i + 1}</span><span class="name">${esc(u.name || u.handle)}</span>
          <span class="value">${Math.round(u.value).toLocaleString('fr-FR')}${unit}</span></li>`).join('')
      : '<li class="empty">Personne pour l’instant</li>';
  }

  renderLikes(likes) {
    this.renderTop('likes-list', 'likes-total', likes, '');
  }

  renderGifters(gifters) {
    this.renderTop('gifters-list', 'gifters-total', gifters, COIN);
  }

  // ---------- Message épinglé ----------

  renderPinned(pin) {
    const p = $('pinned-text');
    if (pin && pin.text) {
      p.textContent = pin.text;
      p.classList.remove('empty');
    } else {
      p.textContent = this.s.pinnedEmpty || '';
      p.classList.add('empty');
    }
    this.fitPinned();
  }

  // Le texte prend la plus grande taille possible qui tient dans la case.
  fitPinned() {
    const p = $('pinned-text');
    const box = $('pinned');
    if (!p || !box.clientHeight) return;
    const maxH = box.clientHeight - 24;
    let size = Math.round(64 * ((Number(this.s.sizePinned) || 100) / 100));
    p.style.fontSize = `${size}px`;
    while (size > 16 && (p.scrollHeight > maxH || p.scrollWidth > p.clientWidth + 1)) {
      size -= 2;
      p.style.fontSize = `${size}px`;
    }
  }

  flashPinned() {
    const el = $('pinned');
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  // ---------- Case centrale : messages qui défilent, ou un par un ----------

  renderBoard(messages, speed, trackId = 'board-track') {
    renderBoard($(trackId), messages, { speed, mode: this.s.boardMode, seconds: this.s.boardSeconds });
  }

  // ---------- Fin du live : message spécial par-dessus la case centrale ----------

  renderEndLive(on) {
    const box = $('end-live');
    const track = $('end-live-track');
    if (!on) {
      box.hidden = true;
      stopBoard(track);
      track.textContent = '';
      return;
    }
    box.hidden = false;
    $('end-live-title').innerHTML = rich(this.s.endTitle || '');
    renderBoard(track, endMessages(this.s), { speed: this.s.endSpeed, mode: this.s.endMode, seconds: this.s.endSeconds });
  }
}

export function endMessages(s) {
  return String(s.endMessages || '').split('\n').map((m) => m.trim()).filter(Boolean);
}
