// Affichage du tableau de bord : personne en cours, liste à traiter, Donuts, top likeurs,
// message épinglé.

import { ROLES } from './gifts.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (id) => document.getElementById(id);

function giftIcon(e) {
  if (e.type === 'winner') return '<span class="gift-icon" title="Gagnant du jeu">🏆</span>';
  const role = ROLES[e.gift];
  const emoji = role ? role.emoji : '🎁';
  const img = e.giftImage ? `<img src="${esc(e.giftImage)}" alt="" referrerpolicy="no-referrer" loading="lazy" data-emoji="${emoji}">` : emoji;
  return `<span class="gift-icon" title="${esc(role ? role.label : '')}">${img}</span>`;
}

function detail(e) {
  if (e.type === 'winner') return `Gagnant · porte ${e.door ?? ''}`.trim();
  if (e.type === 'priority') return `${e.count} question${e.count > 1 ? 's' : ''} prioritaire${e.count > 1 ? 's' : ''}`;
  if (e.type === 'heart') return e.count > 1 ? `Cœur ballon ×${e.count}` : 'Cœur ballon';
  return '';
}

function handleOf(e) {
  return e.handle && e.handle !== String(e.name).toLowerCase() ? ` <small>@${esc(e.handle)}</small>` : '';
}

const SECTIONS = { priority: 'Priorités', winner: 'Gagnants du jeu', heart: 'Cœurs ballon' };

export class Dashboard {
  constructor({ onRemove, onRemoveDonut }) {
    this.seen = new Set();
    this.lastCurrent = null;
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
  }

  renderQueue(queue) {
    const list = queue.list();
    const cur = list[0];
    const box = $('queue-current');
    if (!cur) {
      box.className = 'queue-current empty';
      box.innerHTML = 'Personne à traiter pour l’instant';
    } else {
      box.className = 'queue-current';
      if (this.lastCurrent !== cur.id) {
        void box.offsetWidth;
        box.classList.add('pop');
      }
      box.innerHTML = `${giftIcon(cur)}
        <div class="who"><span class="kicker">EN COURS</span><strong>${esc(cur.name)}</strong><small>${esc(detail(cur))}${handleOf(cur)}</small></div>`;
    }
    this.lastCurrent = cur ? cur.id : null;

    let html = '';
    let section = cur ? cur.type : null;
    list.slice(1).forEach((e, i) => {
      if (e.type !== section) {
        section = e.type;
        html += `<li class="sep">${SECTIONS[e.type]}</li>`;
      }
      const isNew = !this.seen.has(e.id);
      html += `<li${isNew ? ' class="new"' : ''}><span class="rank">${i + 2}</span>${giftIcon(e)}
        <span class="name">${esc(e.name)}</span><span class="tag">${esc(detail(e))}</span>
        <button class="x-btn" data-remove="${esc(e.id)}" type="button" aria-label="Retirer ${esc(e.name)}">✕</button></li>`;
    });
    this.seen = new Set(list.map((e) => e.id));
    $('queue-list').innerHTML = html;
    $('queue-count').textContent = list.length;

    const pending = queue.pendingHearts.reduce((t, e) => t + e.count, 0);
    const p = $('queue-pending');
    p.hidden = !pending;
    p.textContent = `🎈 ${pending} cœur${pending > 1 ? 's' : ''} ballon en attente de la fin du jeu`;
    $('btn-undo').disabled = !queue.history.length;
    $('btn-next').disabled = !cur;
  }

  renderDonuts(queue) {
    const d = queue.donuts;
    $('donut-count').textContent = d.length;
    $('donut-list').innerHTML = d.length
      ? d.map((e) => `<li><span class="name">${esc(e.name)}</span>${e.count > 1 ? `<span class="mult">×${e.count}</span>` : ''}
          <button class="x-btn" data-remove="${esc(e.id)}" type="button" aria-label="Message lu pour ${esc(e.name)}">✓</button></li>`).join('')
      : '<li class="empty">Aucun Donut pour l’instant</li>';
  }

  renderLikes(likes) {
    $('likes-total').textContent = likes.total.toLocaleString('fr-FR');
    const top = likes.top(8);
    const medals = ['🥇', '🥈', '🥉'];
    $('likes-list').innerHTML = top.length
      ? top.map((u, i) => `<li><span class="medal">${medals[i] || i + 1}</span><span class="name">${esc(u.name || u.handle)}</span>
          <span class="likes">${u.likes.toLocaleString('fr-FR')}</span></li>`).join('')
      : '<li class="empty">Aucun like pour l’instant</li>';
  }

  renderPinned(pin) {
    const p = $('pinned-text');
    if (pin && pin.text) {
      p.textContent = pin.text;
      p.classList.remove('empty');
      $('pinned-who').textContent = pin.name ? `Message épinglé · ${pin.name}` : 'Message épinglé';
    } else {
      p.textContent = 'Aucun message épinglé pour l’instant';
      p.classList.add('empty');
      $('pinned-who').textContent = 'Message épinglé';
    }
  }

  flashPinned() {
    const el = $('pinned');
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
}
