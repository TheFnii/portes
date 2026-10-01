// Affichage du tableau de bord : message épinglé, Top Likes, Top Gifters, case centrale,
// liste à traiter, messages de l'univers. Disposition et textes viennent des Réglages.

import { ROLES } from './gifts.js';
import { fill } from './settings.js';
import { esc } from './shell.js';

const $ = (id) => document.getElementById(id);

export class Dashboard {
  constructor({ onRemove, onRemoveDonut }) {
    this.seen = new Set();
    this.lastCurrent = null;
    this.s = {};
    $('queue-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove]');
      if (b) onRemove(b.dataset.remove);
    });
    $('donut-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove]');
      if (b) onRemoveDonut(b.dataset.remove);
    });
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
    document.querySelectorAll('[data-text]').forEach((el) => {
      const v = s[el.dataset.text];
      if (v !== undefined) el.textContent = v;
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

  icon(e) {
    if (e.type === 'winner') return '<span class="gift-icon" title="Gagnant du jeu">🏆</span>';
    if (e.type === 'milestone') return '<span class="gift-icon" title="Palier de likes">🏅</span>';
    const role = ROLES[e.gift];
    const emoji = role ? role.emoji : '🎁';
    const img = e.giftImage ? `<img src="${esc(e.giftImage)}" alt="" referrerpolicy="no-referrer" loading="lazy" data-emoji="${emoji}">` : emoji;
    return `<span class="gift-icon" title="${esc(role ? role.label : '')}">${img}</span>`;
  }

  detail(e) {
    if (e.type === 'winner') return `Gagnant · porte ${e.door ?? ''}`.trim();
    if (e.type === 'milestone') return e.label || 'Palier de likes';
    return `${e.count} question${e.count > 1 ? 's' : ''} en priorité`;
  }

  renderQueue(queue) {
    $('queue-title').textContent = this.title(queue);
    const list = queue.list();
    const cur = list[0];
    const box = $('queue-current');
    if (!cur) {
      box.className = 'queue-current empty';
      box.textContent = this.s.listEmpty || '';
    } else {
      box.className = 'queue-current';
      if (this.lastCurrent !== cur.id) {
        void box.offsetWidth;
        box.classList.add('pop');
      }
      box.innerHTML = `${this.icon(cur)}
        <div class="who"><span class="kicker">${esc(this.s.currentLabel || '')}</span><strong>${esc(cur.name)}</strong><small>${esc(this.detail(cur))}</small></div>`;
    }
    this.lastCurrent = cur ? cur.id : null;

    const SECTIONS = { priority: 'Priorités', winner: 'Gagnants du jeu', milestone: 'Paliers de likes' };
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
    $('donut-count').textContent = d.length;
    $('donut-list').innerHTML = d.length
      ? d.map((e) => `<li><span class="env-mini" aria-hidden="true">✉️</span><span class="name">${esc(e.name)}</span>${e.count > 1 ? `<span class="mult">×${e.count}</span>` : ''}
          <button class="x-btn" data-remove="${esc(e.id)}" type="button" aria-label="Message lu pour ${esc(e.name)}">✓</button></li>`).join('')
      : `<li class="empty">${esc(this.s.univEmpty || '')}</li>`;
  }

  // ---------- Tops ----------

  renderTop(listId, totalId, ranking, unit) {
    const n = this.s.topCount || 6;
    $(totalId).textContent = Math.round(ranking.total).toLocaleString('fr-FR');
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
    this.renderTop('gifters-list', 'gifters-total', gifters, ' 🪙');
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
    let size = 64;
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

  // ---------- Case centrale : messages qui défilent ----------

  renderBoard(messages, speed) {
    const track = $('board-track');
    track.textContent = '';
    if (!messages.length) return;
    const copy = () => messages.map((m) => `<p class="board-item">${esc(m)}</p><span class="board-sep" aria-hidden="true">✦</span>`).join('');
    track.innerHTML = `<div>${copy()}</div><div aria-hidden="true">${copy()}</div>`;
    requestAnimationFrame(() => {
      const h = track.firstElementChild.getBoundingClientRect().height;
      const win = track.parentElement.clientHeight;
      // Peu de messages qui tiennent dans la case : on ne fait pas défiler.
      track.classList.toggle('still', h < win * 0.8);
      if (h < win * 0.8) track.lastElementChild.hidden = true;
      track.style.setProperty('--board-dur', `${(h / Math.max(5, speed)).toFixed(1)}s`);
    });
  }
}
