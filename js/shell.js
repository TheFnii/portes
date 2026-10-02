// Outils d'interface communs : message temporaire, petite fenêtre, plein écran, écran allumé.

const $ = (id) => document.getElementById(id);

// ---------- Message temporaire ----------

let toastTimer;
export function toast(msg, ms = 3200) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

// ---------- Petite fenêtre d'information ----------

export function notice(title, html, actions = []) {
  $('notice-title').textContent = title;
  $('notice-body').innerHTML = html;
  const box = $('notice-actions');
  box.textContent = '';
  actions.forEach(({ label, href, primary, onClick }) => {
    const el = document.createElement(href ? 'a' : 'button');
    el.className = `btn${primary ? ' btn-primary' : ''}`;
    el.textContent = label;
    if (href) el.href = href;
    else {
      el.type = 'button';
      el.addEventListener('click', () => { closeNotice(); if (onClick) onClick(); });
    }
    box.appendChild(el);
  });
  $('notice').hidden = false;
}

export function closeNotice() {
  $('notice').hidden = true;
}

if ($('notice')) {
  $('notice').addEventListener('click', (e) => {
    if (e.target === $('notice') || e.target.closest('[data-close]')) closeNotice();
  });
}

// ---------- Plein écran ----------
// iPad : Safari ne permet pas toujours le plein écran d'une page. La solution fiable est
// d'ajouter l'appli à l'écran d'accueil : elle s'ouvre alors sans aucune barre.

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
if (standalone) document.querySelectorAll('.fullscreen-btn').forEach((el) => { el.hidden = true; });

const isFullscreen = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);

function fullscreenHelp() {
  notice('Plein écran sur iPad',
    `<p class="hint">Safari ne permet pas de masquer ses barres depuis une page web. Installez l’appli sur l’écran d’accueil : elle s’ouvrira en plein écran, sans aucune barre.</p>
     <ol class="steps">
       <li>Dans Safari, touchez le bouton <strong>Partager</strong> <span aria-hidden="true">(carré avec une flèche ↑)</span>.</li>
       <li>Choisissez <strong>Sur l’écran d’accueil</strong>, puis <strong>Ajouter</strong>.</li>
       <li>Fermez Safari et ouvrez <strong>Portes</strong> depuis sa nouvelle icône.</li>
     </ol>`,
    [{ label: 'Compris', primary: true }]);
}

// helpIfFails : afficher l'aide si le plein écran n'est pas possible (bouton « Plein écran »).
export function enterFullscreen(helpIfFails = true) {
  if (standalone || isFullscreen()) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) {
    if (helpIfFails) fullscreenHelp();
    return;
  }
  try {
    const p = req.call(el);
    if (p && p.catch) p.catch(() => { if (helpIfFails) fullscreenHelp(); });
  } catch (e) {
    if (helpIfFails) fullscreenHelp();
    return;
  }
  if (helpIfFails && isIOS) setTimeout(() => { if (!isFullscreen()) fullscreenHelp(); }, 800);
}

export function toggleFullscreen() {
  if (isFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else enterFullscreen(true);
}

// ---------- Écran toujours allumé ----------

let wakeLock = null;
export async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock && !document.hidden) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) { /* refusé : pas grave */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake(); });

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
