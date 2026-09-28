import { APP_SUBTITLE, APP_TAGLINE, STORAGE } from './config.js';
import { load, loadFlag, saveFlag } from './prefs.js';
import { randomInt } from './random.js';
import { flowerDefs } from './doors-art.js';
import { buildBackdrop, LAYOUT } from './scene.js';
import { DoorStage } from './doors.js';
import { Dice } from './dice.js';
import { FX } from './fx.js';
import { Sound } from './sound.js';
import { Ticker } from './ticker.js';
import { Round } from './game.js';
import { TikTokLive } from './tiktok.js';

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const body = document.body;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Construction de la scène ----------

$('flower-defs').innerHTML = flowerDefs();
buildBackdrop($('backdrop'));

const stage = $('stage');
const doors = new DoorStage({ doorsEl: $('doors'), plaza: $('plaza'), focusEl: $('focus'), focusDoorEl: $('focus-door') });
const dice = new Dice($('dice'), { region: { x: 470, y: 330, w: 560, h: 670 }, rest: LAYOUT.dice });
const fx = new FX($('fx'));
const sound = new Sound();
const ticker = new Ticker($('ticker'), $('ticker-track'));
const round = new Round();
const live = new TikTokLive();

const diceHit = document.createElement('button');
diceHit.className = 'dice-hit';
diceHit.type = 'button';
diceHit.setAttribute('aria-label', 'Lancer le dé');
stage.appendChild(diceHit);

const state = { screen: 'home', mode: 'simple', phase: 'idle', result: 0, scale: 1 };
let simulating = false;

// ---------- Mise à l'échelle ----------

function fit() {
  const tickerTop = ticker.enabled && ticker.messages.length && state.screen === 'game';
  const top = tickerTop ? 58 : 0;
  const s = Math.min(window.innerWidth / LAYOUT.W, (window.innerHeight - top) / LAYOUT.H);
  state.scale = s;
  stage.style.setProperty('--scale', s.toFixed(4));
  stage.style.top = `calc(50% + ${top / 2}px)`;
  body.style.setProperty('--ticker-space', `${top}px`);
  dice.resize(s);
}
window.addEventListener('resize', fit);

function stageToScreen(x, y) {
  const r = stage.getBoundingClientRect();
  return { x: r.left + (x / LAYOUT.W) * r.width, y: r.top + (y / LAYOUT.H) * r.height };
}

// ---------- Déblocage audio + écran allumé ----------

let wakeLock = null;
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock && !document.hidden) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) { /* refusé : pas grave */ }
}
function unlock() {
  sound.unlock();
  keepAwake();
}
document.addEventListener('pointerdown', unlock, { capture: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake(); });

// ---------- Messages temporaires ----------

let toastTimer;
function toast(msg, ms = 3200) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

// ---------- Écrans ----------

async function goHome() {
  closeDrawer();
  rollId++;
  $('result').hidden = true;
  $('dice-number').classList.remove('show');
  doors.highlight(0);
  if (doors.focused) await doors.close();
  if (state.mode === 'live') round.close();
  state.screen = 'home';
  state.phase = 'idle';
  body.classList.add('at-home');
  body.classList.remove('mode-live', 'rolling');
  dice.setActive(false);
  fx.setAmbient(26);
  fit();
}

function goGame(mode) {
  state.mode = mode;
  state.screen = 'game';
  state.phase = 'idle';
  round.reset();
  body.classList.remove('at-home');
  body.classList.toggle('mode-live', mode === 'live');
  dice.setActive(true);
  fx.setAmbient(18);
  renderFeeds();
  updateUI();
  fit();
  if (mode === 'live') {
    if (hasCreds()) ensureLive();
    else {
      setTimeout(() => {
        if (!simulating && state.mode === 'live' && state.screen === 'game' && state.phase === 'idle') needCreds();
      }, 700);
    }
  }
}

function updateUI() {
  const isLive = state.mode === 'live';
  const p = state.phase;
  $('panel-players').hidden = !isLive;
  $('panel-out').hidden = !isLive;
  $('live-status').hidden = !isLive;

  let heading = APP_SUBTITLE;
  let tagline = APP_TAGLINE;
  if (isLive) {
    if (p === 'collecting') {
      heading = 'Écrivez un chiffre de 1 à 12 dans le chat';
      tagline = 'Une seule porte par personne : changer de chiffre élimine !';
    } else {
      tagline = 'Écrivez votre chiffre dans le chat dès l’ouverture du jeu';
    }
  }
  $('stage-heading').textContent = heading;
  $('stage-tagline').textContent = tagline;

  const btn = $('btn-main');
  btn.disabled = p === 'rolling' || p === 'result';
  btn.textContent = isLive && p !== 'collecting' ? 'Lancer le jeu' : 'Lancer le dé';
  diceHit.disabled = btn.disabled || (isLive && p !== 'collecting');
  doors.setCounts(isLive && p !== 'idle' ? round.counts() : null);
  body.classList.toggle('rolling', p === 'rolling');
}

// ---------- Jeu ----------

function mainAction() {
  if (state.screen !== 'game') return;
  if (state.mode === 'live' && state.phase === 'idle') startCollecting();
  else if (state.phase === 'idle' || state.phase === 'collecting') roll();
}
$('btn-main').addEventListener('click', mainAction);
diceHit.addEventListener('click', () => {
  if (state.mode === 'simple' || state.phase === 'collecting') roll();
});

function startCollecting({ force = false } = {}) {
  if (!force && !hasCreds()) {
    needCreds();
    return;
  }
  if (!force) ensureLive();
  round.setHost(load(STORAGE.tiktokUser));
  round.start();
  state.phase = 'collecting';
  renderFeeds();
  updateUI();
  sound.gameStart();
  const p = stageToScreen(750, 470);
  fx.burst(p.x, p.y, { count: 60, speed: 240, life: 1.8, stars: 0.4 });
  toast('Les participations sont ouvertes !');
}

// Chaque lancer a un numéro : revenir à l'accueil en plein lancer l'annule proprement.
let rollId = 0;

async function roll() {
  if (state.phase === 'rolling' || state.phase === 'result') return;
  closeDrawer();
  const id = ++rollId;
  const alive = () => id === rollId && state.screen === 'game';
  if (state.mode === 'live') round.close();
  state.phase = 'rolling';
  updateUI();
  const numEl = $('dice-number');
  numEl.classList.remove('show');

  const n = randomInt(1, 12);
  state.result = n;
  sound.diceThrow();
  let frame = 0;
  await dice.roll(n, {
    onBounce: (h) => {
      if (!alive()) return;
      sound.diceHit(Math.min(1, h + 0.2));
      const p = stageToScreen(dice.pos.x, dice.pos.y + 40);
      fx.burst(p.x, p.y, { count: 6 + 16 * h, speed: 140, spread: Math.PI, angle: -Math.PI / 2, life: 0.9, stars: 0.2, size: 0.8, gravity: 60 });
    },
    onFrame: (p, h) => {
      if (alive() && h > 0.06 && frame++ % 2 === 0) {
        const s = stageToScreen(p.x, p.y);
        fx.trail(s.x, s.y);
      }
    },
  });
  if (!alive()) return;

  numEl.textContent = n;
  numEl.classList.add('show');
  sound.diceResult();
  const c = stageToScreen(LAYOUT.dice.x, LAYOUT.dice.y);
  fx.burst(c.x, c.y, { count: 50, speed: 240, life: 1.6, stars: 0.4 });
  doors.highlight(n);
  await wait(1200);
  if (!alive()) return;

  sound.doorCall();
  await doors.focus(n);
  numEl.classList.remove('show');
  await wait(200);
  if (!alive()) return;
  doors.open();
  sound.doorOpen();
  await wait(550);
  if (!alive()) return;
  fx.portal(doors.openingRect());
  await wait(1500);
  if (!alive()) return;
  doors.split();
  showResult(n);
  sound.reveal();
  state.phase = 'result';
  updateUI();
}

function showResult(n) {
  const d = doors.data(n);
  let html = `<p class="result-kicker">Le dé a parlé</p><div class="result-number">${n}</div>`;
  if (state.mode === 'simple') {
    html += `<p class="result-title">Le chiffre ${n} a été choisi</p>`;
    $('btn-again').textContent = 'Relancer le dé';
  } else {
    const winners = round.winners(n);
    html += `<p class="result-title">La porte ${n} s’ouvre</p>`;
    if (winners.length) {
      html += `<p class="result-text">${winners.length === 1 ? 'Une personne avait choisi cette porte :' : `${winners.length} personnes avaient choisi cette porte :`}</p><ul class="winners">`;
      winners.forEach((w, i) => {
        const initial = esc((w.name || w.handle || '?').trim().charAt(0).toUpperCase());
        const avatar = w.avatar
          ? `<img src="${esc(w.avatar)}" alt="" referrerpolicy="no-referrer" loading="lazy" data-initial="${initial}">`
          : `<span class="avatar">${initial}</span>`;
        const handle = w.handle && w.handle !== String(w.name).toLowerCase() ? `<span class="handle">@${esc(w.handle)}</span>` : '';
        html += `<li style="--i:${Math.min(i, 30)}">${avatar}<span class="who">${esc(w.name)}${handle}</span></li>`;
      });
      html += '</ul>';
    } else {
      html += '<p class="result-text">Personne n’avait choisi cette porte…<br>Le destin garde son secret.</p>';
    }
    const np = round.players.size;
    const no = round.out.size;
    html += `<p class="result-stats">${np} participant${np > 1 ? 's' : ''} · ${no} éliminé${no > 1 ? 's' : ''}</p>`;
    $('btn-again').textContent = 'Nouvelle partie';
  }
  $('result-inner').innerHTML = html;
  $('result-inner').querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => {
      const span = document.createElement('span');
      span.className = 'avatar';
      span.textContent = img.dataset.initial;
      img.replaceWith(span);
    });
  });
  $('result').hidden = false;
  const r = $('result').getBoundingClientRect();
  fx.burst(r.left + r.width / 2, r.top + 110, { count: 22, speed: 170, life: 1.3, stars: 0.25, size: 0.8, glow: 'violet' });
}

async function closeResult() {
  $('result').hidden = true;
  await doors.close();
  state.phase = 'idle';
  if (state.mode === 'live') round.reset();
  renderFeeds();
  updateUI();
}

$('btn-again').addEventListener('click', async () => {
  const again = state.mode;
  await closeResult();
  if (again === 'live') startCollecting({ force: simulating || !hasCreds() });
  else roll();
});
$('btn-back').addEventListener('click', closeResult);

// ---------- Chat TikTok ----------

let feedDirty = false;
function renderFeedsSoon() {
  if (feedDirty) return;
  feedDirty = true;
  requestAnimationFrame(() => { feedDirty = false; renderFeeds(); });
}

// Seules les lignes nouvelles sont animées (les autres restent affichées sans clignoter).
const shown = { players: new Set(), out: new Set() };

function feedItems(entries, set, line) {
  const next = new Set();
  const html = entries.map(([key, p]) => {
    next.add(key);
    return `<li${set.has(key) ? '' : ' class="new"'}>${line(p)}</li>`;
  }).join('');
  set.clear();
  next.forEach((k) => set.add(k));
  return html;
}

function renderFeeds() {
  const players = [...round.players.entries()];
  $('players-count').textContent = players.length;
  const feed = $('players-feed');
  if (!players.length) {
    shown.players.clear();
    feed.innerHTML = `<li class="empty">${state.phase === 'collecting' ? 'En attente des premiers chiffres…' : 'Touchez « Lancer le jeu » pour ouvrir les participations.'}</li>`;
  } else {
    feed.innerHTML = feedItems(players.slice(-12).reverse(), shown.players,
      (p) => `<span class="who">${esc(p.name)}</span><span class="num">${p.choice}</span>`);
  }
  const out = [...round.out.entries()];
  $('out-count').textContent = out.length;
  if (!out.length) {
    shown.out.clear();
    $('out-list').innerHTML = '<li class="empty">Personne pour l’instant</li>';
  } else {
    $('out-list').innerHTML = feedItems(out.slice(-60).reverse(), shown.out,
      (p) => `<span class="who">${esc(p.name)}</span><span class="num">${p.choices.join(' · ')}</span>`);
  }
}

function onChat(msg) {
  if (state.mode !== 'live' || state.phase !== 'collecting') return;
  const r = round.handle(msg);
  if (r.type === 'join') {
    doors.setCounts(round.counts());
    sound.join();
  } else if (r.type === 'out') {
    doors.setCounts(round.counts());
    sound.eliminated();
  } else {
    return;
  }
  renderFeedsSoon();
}
live.addEventListener('chat', (e) => onChat(e.detail));

function renderStatus() {
  const pill = $('live-status');
  const st = simulating ? 'waiting' : live.state;
  pill.dataset.state = st;
  pill.querySelector('.label').textContent = simulating
    ? 'Simulation (faux spectateurs)'
    : st === 'live' ? `En direct · @${live.handle}` : live.message || 'Non connecté';
}

live.addEventListener('status', (e) => {
  const { state: st, message } = e.detail;
  renderStatus();
  if (state.mode === 'live' && state.screen === 'game' && (st === 'error' || st === 'waiting')) toast(message, 5000);
});

function hasCreds() {
  return Boolean(load(STORAGE.tiktokUser) && load(STORAGE.tiktokKey));
}

function ensureLive() {
  if (!hasCreds()) return;
  if (['live', 'connecting', 'waiting'].includes(live.state)) return;
  live.connect(load(STORAGE.tiktokUser), load(STORAGE.tiktokKey));
}

// Simulation : de faux spectateurs écrivent dans le chat (pour répéter sans être en live).
async function simulate() {
  closeNotice();
  if (state.screen !== 'game' || state.mode !== 'live') goGame('live');
  if (state.phase === 'result') await closeResult();
  if (state.phase !== 'collecting') startCollecting({ force: true });
  if (simulating) return;
  simulating = true;
  renderStatus();
  toast('Simulation : de faux spectateurs participent…');
  const names = ['Luna', 'Céleste', 'Maëlys', 'Inès', 'Sofia', 'Jade', 'Léna', 'Nour', 'Camille', 'Aurore', 'Yasmine', 'Élise',
    'Manon', 'Chloé', 'Sarah', 'Lilou', 'Anaïs', 'Rose', 'Iris', 'Mila', 'Emma', 'Noa', 'Zoé', 'Lina', 'Alice', 'Julia'];
  const phrases = (n) => [`${n}`, `la ${n} stp`, `je prends la porte ${n} ✨`, `${n} !!`, `porte ${n}`, `${n} 🙏`, `bonsoir ! ${n}`];
  for (let i = 0; i < names.length && state.phase === 'collecting'; i++) {
    const name = names[i];
    const n = randomInt(1, 12);
    const options = phrases(n);
    onChat({ handle: name.toLowerCase(), name, text: options[randomInt(0, options.length - 1)] });
    // De temps en temps, quelqu'un change d'avis : éliminé.
    if (i > 4 && randomInt(1, 6) === 1) {
      const prev = names[randomInt(0, i - 1)];
      const p = round.players.get(prev.toLowerCase());
      if (p) onChat({ handle: prev.toLowerCase(), name: prev, text: `non finalement la ${(p.choice % 12) + 1}` });
    }
    await wait(220 + randomInt(0, 380));
  }
  simulating = false;
  renderStatus();
}

// ---------- Menus, réglages, bascules ----------

function setTicker(on) {
  saveFlag(STORAGE.ticker, on);
  ticker.setEnabled(on);
  syncToggles();
  fit();
}

function setSound(on) {
  sound.setEnabled(on);
  if (on) {
    sound.unlock();
    sound.tink();
  }
  syncToggles();
}

function syncToggles() {
  $$('[data-toggle]').forEach((b) => {
    const isTicker = b.dataset.toggle === 'ticker';
    const on = isTicker ? ticker.enabled : sound.enabled;
    b.setAttribute('aria-pressed', String(on));
    const st = b.querySelector('.state');
    if (st) st.textContent = isTicker ? (on ? 'Activés' : 'Désactivés') : (on ? 'Activé' : 'Coupé');
  });
}

function openDrawer() {
  $('drawer').hidden = false;
  $('btn-game-menu').setAttribute('aria-expanded', 'true');
}
function closeDrawer() {
  $('drawer').hidden = true;
  $('btn-game-menu').setAttribute('aria-expanded', 'false');
}
$('btn-game-menu').addEventListener('click', () => ($('drawer').hidden ? openDrawer() : closeDrawer()));
document.addEventListener('pointerdown', (e) => {
  if (!$('drawer').hidden && !e.target.closest('#drawer, #btn-game-menu')) closeDrawer();
});

// ---------- Petite fenêtre d'information ----------

function notice(title, html, actions = []) {
  closeDrawer();
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
function closeNotice() {
  $('notice').hidden = true;
}
$('notice').addEventListener('click', (e) => {
  if (e.target === $('notice') || e.target.closest('[data-close]')) closeNotice();
});

function needCreds() {
  notice('Connexion TikTok',
    '<p class="hint">Pour jouer avec le chat, renseignez d’abord votre pseudo TikTok et votre clé API Euler Stream dans les réglages.</p>',
    [
      { label: 'Ouvrir les réglages', href: 'admin.html#tiktok', primary: true },
      { label: 'Simuler des participants', onClick: simulate },
    ]);
}

// ---------- Écran de veille ----------

const saver = new Ticker($('screensaver'), $('ss-track'), { speedFactor: 2.4 });
saver.setEnabled(true);

function openScreensaver() {
  closeDrawer();
  if (!ticker.messages.length) {
    toast('Aucun message à afficher : ajoutez-en dans les réglages.');
    return;
  }
  saver.setData(ticker.messages, ticker.speed);
  $('screensaver').hidden = false;
  body.classList.add('saver');
  enterFullscreen(false);
}
function closeScreensaver() {
  $('screensaver').hidden = true;
  body.classList.remove('saver');
}
$('screensaver').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  closeScreensaver();
});

// ---------- Plein écran ----------
// iPad : Safari ne permet pas toujours le plein écran d'une page. La solution fiable est
// d'ajouter l'appli à l'écran d'accueil : elle s'ouvre alors sans aucune barre.

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
if (standalone) $$('.fullscreen-btn').forEach((el) => { el.hidden = true; });

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
function enterFullscreen(helpIfFails = true) {
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

function toggleFullscreen() {
  if (isFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else enterFullscreen(true);
}

// Délégation des clics de menu
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go], [data-toggle], [data-action]');
  if (!t) return;
  sound.tink();
  if (t.dataset.go) goGame(t.dataset.go);
  else if (t.dataset.toggle === 'ticker') setTicker(!ticker.enabled);
  else if (t.dataset.toggle === 'sound') setSound(!sound.enabled);
  else if (t.dataset.action === 'home') goHome();
  else if (t.dataset.action === 'fullscreen') toggleFullscreen();
  else if (t.dataset.action === 'screensaver') openScreensaver();
  else if (t.dataset.action === 'reset') {
    closeDrawer();
    if (state.phase === 'result') closeResult();
    else {
      round.reset();
      state.phase = 'idle';
      renderFeeds();
      updateUI();
    }
    toast('Participants effacés.');
  }
});

$('live-status').addEventListener('click', () => { location.href = 'admin.html#tiktok'; });

// Clavier (pratique sur ordinateur)
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input')) return;
  if (e.key === 'Escape') {
    closeNotice();
    closeScreensaver();
    closeDrawer();
  } else if ((e.key === ' ' || e.key === 'Enter') && state.screen === 'game' && $('notice').hidden && $('screensaver').hidden) {
    e.preventDefault();
    if (state.phase === 'result') $('btn-again').click();
    else mainAction();
  }
});

// ---------- Démarrage ----------

ticker.setEnabled(loadFlag(STORAGE.ticker, true));
function loadTicker() {
  return ticker.load().then(() => {
    fit();
    if (ticker.error) toast('Le fichier messages.json contient une erreur : le bandeau est masqué.', 6000);
  });
}
loadTicker();
// Retour depuis la page des réglages : relire les messages et la connexion.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    loadTicker();
    ticker.setEnabled(loadFlag(STORAGE.ticker, true));
    sound.setEnabled(loadFlag(STORAGE.sound, true));
    syncToggles();
    if (state.mode === 'live' && state.screen === 'game') ensureLive();
  }
});
syncToggles();
renderFeeds();
updateUI();
fit();
fx.setAmbient(26);
dice.setActive(false);

// Lien depuis les réglages : ouvrir directement une simulation.
if (new URLSearchParams(location.search).has('simulation')) {
  history.replaceState(null, '', location.pathname);
  setTimeout(simulate, 400);
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
