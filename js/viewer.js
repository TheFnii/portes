// Page des viewers : copie en lecture seule du live, synchronisée en temps réel avec la
// tablette (tableau de bord, Jeu des Portes, animations des cadeaux et des paliers).

import { STORAGE } from './config.js';
import { flowerDefs } from './doors-art.js';
import { buildBackdrop, LAYOUT } from './scene.js';
import { DoorStage } from './doors.js';
import { Dice } from './dice.js';
import { FX } from './fx.js';
import { Sound } from './sound.js';
import { Celebrate } from './celebrate.js';
import { Receiver } from './broadcast.js';
import { entryIcon, entryDetail, SECTIONS, COIN } from './dashboard.js';
import { DEFAULTS } from './settings.js';
import { imagesReady, setImageOverride } from './images.js';
import { keepAwake, esc } from './shell.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const body = document.body;

// ---------- Construction ----------

$('flower-defs').innerHTML = flowerDefs();
buildBackdrop($('backdrop'));

const stage = $('stage');
const doors = new DoorStage({ doorsEl: $('doors'), plaza: $('plaza'), focusEl: $('focus'), focusDoorEl: $('focus-door') });
const dice = new Dice($('dice'), { region: { x: 470, y: 330, w: 560, h: 670 }, rest: LAYOUT.dice });
const fx = new FX($('fx'));
const sound = new Sound({ key: STORAGE.viewerSound, defaultOn: false });
let settings = { ...DEFAULTS };
const celebrate = new Celebrate({ root: $('celebrate'), fx, sound, getSettings: () => settings });

let last = null; // dernier état reçu de la tablette
let connected = false;
let gameOpen = false;
let rolling = null; // promesse du lancer en cours (le résultat attend sa fin)
let rollId = 0;

// ---------- Mise à l'échelle de la scène du jeu ----------

function fit() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const portrait = H > W;
  const s = Math.min(W / LAYOUT.W, (portrait ? H * 0.7 : H - 40) / LAYOUT.H);
  stage.style.setProperty('--scale', s.toFixed(4));
  // En portrait, la scène se place un peu au-dessus du centre (les infos sont en bas).
  stage.style.top = portrait ? `${Math.round(H * 0.44)}px` : 'calc(50% - 16px)';
  dice.resize(s);
}
window.addEventListener('resize', fit);

function stageToScreen(x, y) {
  const r = stage.getBoundingClientRect();
  return { x: r.left + (x / LAYOUT.W) * r.width, y: r.top + (y / LAYOUT.H) * r.height };
}

// ---------- Son (coupé par défaut : le live a déjà le sien) ----------

function renderSound() {
  const b = $('v-sound');
  b.textContent = sound.enabled ? '🔊' : '🔇';
  b.setAttribute('aria-label', sound.enabled ? 'Couper le son' : 'Activer le son');
}
$('v-sound').addEventListener('click', () => {
  sound.setEnabled(!sound.enabled);
  sound.unlock();
  if (sound.enabled) sound.tink();
  renderSound();
});
document.addEventListener('pointerdown', () => { if (sound.enabled) sound.unlock(); keepAwake(); }, { capture: true });

// ---------- État du live ----------

const OFFLINE_AFTER = 3 * 60 * 1000; // sans nouvelles depuis 3 min : le live est sans doute fini

function isFresh() {
  return last && !last.offline && Date.now() - last.t < OFFLINE_AFTER;
}

function renderStatus() {
  const el = $('v-status');
  const fresh = isFresh();
  el.className = `v-status ${connected && fresh ? 'live' : 'wait'}`;
  el.querySelector('.label').textContent = !connected ? 'Connexion…' : fresh ? 'En direct' : 'Hors ligne';
  const w = $('v-wait');
  if (last && !last.list) {
    w.classList.remove('gone');
    $('v-wait-title').textContent = 'Le live est terminé';
    $('v-wait-text').textContent = 'Merci pour votre présence ✨ Gardez ce lien : il servira pour le prochain live.';
  } else if (!last) {
    w.classList.remove('gone');
    $('v-wait-title').textContent = connected ? 'Le live n’a pas encore commencé' : 'Connexion au live…';
    $('v-wait-text').textContent = connected
      ? 'Gardez cette page ouverte : tout apparaîtra dès que le live commence.'
      : 'Un instant, les portes s’ouvrent.';
  } else {
    w.classList.add('gone');
  }
}
setInterval(renderStatus, 15000);

function setText(id, v) {
  const el = $(id);
  if (el.textContent !== v) el.textContent = v;
}

let seen = new Set();
let lastCurrent = null;

function renderQueue(st) {
  setText('v-queue-title', st.title || '');
  const chip = $('v-chip');
  chip.hidden = !st.chip;
  chip.textContent = st.chip || '';
  const list = st.list || [];
  const cur = list[0];
  const box = $('v-current');
  if (!cur) {
    box.className = 'queue-current empty';
    box.textContent = settings.listEmpty || '';
  } else {
    box.className = 'queue-current';
    if (lastCurrent !== cur.id) {
      void box.offsetWidth;
      box.classList.add('pop');
    }
    box.innerHTML = `${entryIcon(cur)}<div class="who"><span class="kicker">${esc(settings.currentLabel || '')}</span><strong>${esc(cur.name)}</strong><small>${esc(entryDetail(cur))}</small></div>`;
  }
  lastCurrent = cur ? cur.id : null;
  let html = '';
  let section = cur ? cur.type : null;
  list.slice(1).forEach((e, i) => {
    if (e.type !== section) {
      section = e.type;
      html += `<li class="sep">${SECTIONS[e.type] || ''}</li>`;
    }
    html += `<li${seen.has(e.id) ? '' : ' class="new"'}><span class="rank">${i + 2}</span>${entryIcon(e)}
      <span class="who"><span class="name">${esc(e.name)}</span><small>${esc(entryDetail(e))}</small></span></li>`;
  });
  seen = new Set(list.map((e) => e.id));
  $('v-list').innerHTML = html;
}

function renderTop(listId, totalId, data, unit) {
  const d = data || { total: 0, top: [] };
  $(totalId).innerHTML = Math.round(d.total || 0).toLocaleString('fr-FR') + unit;
  const medals = ['🥇', '🥈', '🥉'];
  $(listId).innerHTML = d.top && d.top.length
    ? d.top.map((u, i) => `<li><span class="medal">${medals[i] || i + 1}</span><span class="name">${esc(u.name)}</span>
        <span class="value">${Math.round(u.value).toLocaleString('fr-FR')}${unit}</span></li>`).join('')
    : '<li class="empty">Personne pour l’instant</li>';
}

let boardKey = '';
function renderBoard(board) {
  const messages = (board && board.messages) || [];
  const speed = (board && board.speed) || 30;
  const key = JSON.stringify([messages, speed]);
  if (key === boardKey) return;
  boardKey = key;
  const track = $('v-board');
  track.textContent = '';
  track.className = 'board-track';
  if (!messages.length) return;
  const copy = () => messages.map((m) => `<p class="board-item">${esc(m)}</p><span class="board-sep" aria-hidden="true">✦</span>`).join('');
  track.innerHTML = `<div>${copy()}</div><div aria-hidden="true">${copy()}</div>`;
  requestAnimationFrame(() => {
    const h = track.firstElementChild.getBoundingClientRect().height;
    const win = track.parentElement.clientHeight;
    const still = h < win * 0.8;
    track.classList.toggle('still', still);
    track.lastElementChild.hidden = still;
    track.style.setProperty('--board-dur', `${(h / Math.max(5, speed)).toFixed(1)}s`);
  });
}

function renderDash(st) {
  const f = st.features || {};
  document.querySelectorAll('[data-feature]').forEach((el) => el.classList.toggle('feature-off', f[el.dataset.feature] === false));
  document.documentElement.style.setProperty('--ts', ((settings.textScale || 100) / 100).toFixed(2));
  const pin = $('v-pinned');
  pin.hidden = !st.pinned;
  setText('v-pinned-text', st.pinned || '');
  renderQueue(st);
  setText('v-likes-title', settings.likesTitle || 'Top Likes');
  setText('v-gifters-title', settings.giftersTitle || 'Top Gifters');
  setText('v-board-title', settings.boardTitle || '');
  renderTop('v-likes', 'v-likes-total', st.likes, '');
  renderTop('v-gifters', 'v-gifters-total', st.gifters, COIN);
  renderBoard(st.board);
}

function onState(st) {
  // Diffusion coupée depuis les Réglages : on garde l'affichage, marqué « Hors ligne ».
  if (st.offline && !st.list) {
    last = last ? { ...last, offline: true } : { offline: true, t: st.t };
    if (gameOpen) closeGame();
    renderStatus();
    return;
  }
  last = st;
  if (st.settings) settings = { ...DEFAULTS, ...st.settings };
  renderDash(st);
  renderGame(st.game);
  renderStatus();
}

// ---------- Jeu des Portes ----------

function renderGame(g) {
  if (g && !gameOpen) openGame();
  else if (!g && gameOpen) closeGame();
  if (!g) return;
  setText('stage-heading', g.heading || '');
  setText('stage-tagline', g.tagline || '');
  setText('v-game-info', g.info || '');
  doors.setCounts(g.counts || null);
  doors.els.forEach((el, i) => el.classList.toggle('opened', (g.opened || []).includes(i + 1)));
  body.classList.toggle('rolling', g.phase === 'rolling');
}

function openGame() {
  gameOpen = true;
  body.classList.remove('at-home');
  dice.setActive(true);
  fx.setAmbient(14);
  fit();
}

async function closeGame() {
  gameOpen = false;
  rollId++;
  $('countdown').hidden = true;
  $('result').hidden = true;
  $('dice-number').classList.remove('show');
  doors.highlight(0);
  if (doors.focused) await doors.close();
  if (gameOpen) return;
  body.classList.add('at-home');
  body.classList.remove('rolling');
  doors.setCounts(null);
  dice.setActive(false);
  fx.setAmbient(18);
}

async function countdown(go) {
  const box = $('countdown');
  const num = $('countdown-num');
  box.hidden = false;
  for (const step of ['3', '2', '1', go || '✦']) {
    if (!gameOpen) break;
    num.textContent = step;
    num.className = `tick${step.length > 1 ? ' go' : ''}`;
    void num.offsetWidth;
    if (step.length > 1) {
      sound.gameStart();
      const c = stageToScreen(750, 480);
      fx.burst(c.x, c.y, { count: 60, speed: 260, life: 2, stars: 0.4 });
    } else {
      sound.diceResult();
    }
    await wait(step.length > 1 ? 1300 : 950);
  }
  box.hidden = true;
}

// Même mise en scène que sur la tablette : le dé roule, la porte s'approche et s'ouvre.
async function roll(n) {
  const id = ++rollId;
  const alive = () => id === rollId && gameOpen;
  $('result').hidden = true;
  if (doors.focused) await doors.close();
  const numEl = $('dice-number');
  numEl.classList.remove('show');
  sound.diceThrow();
  let frame = 0;
  await dice.roll(n, {
    onBounce: (h) => {
      if (!alive()) return;
      sound.diceHit(Math.min(1, h + 0.2));
      const p = stageToScreen(dice.pos.x, dice.pos.y + 40);
      fx.burst(p.x, p.y, { count: 4 + 10 * h, speed: 120, spread: Math.PI, angle: -Math.PI / 2, life: 0.9, stars: 0.2, size: 0.7, gravity: 60 });
    },
    onFrame: (p, h) => {
      if (alive() && h > 0.06 && frame++ % 3 === 0) {
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
  fx.burst(c.x, c.y, { count: 36, speed: 200, life: 1.6, stars: 0.4 });
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
}

async function showResult(html) {
  if (rolling) await rolling;
  if (!gameOpen || !doors.focused) return;
  doors.split();
  const inner = $('result-inner');
  inner.innerHTML = html;
  inner.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => {
      const span = document.createElement('span');
      span.className = 'avatar';
      span.textContent = img.dataset.initial || '';
      img.replaceWith(span);
    });
  });
  $('result').hidden = false;
  sound.reveal();
  const r = $('result').getBoundingClientRect();
  fx.burst(r.left + r.width / 2, r.top + 80, { count: 18, speed: 150, life: 1.3, stars: 0.25, size: 0.8, glow: 'violet' });
}

async function back() {
  rollId++;
  $('result').hidden = true;
  if (doors.focused) await doors.close();
}

// ---------- Événements reçus ----------

function onEvent(kind, data) {
  if (kind === 'cel') {
    if (data.kind) celebrate.play(data.kind, data.data || {});
  } else if (kind === 'countdown') {
    if (gameOpen) countdown(data.go);
  } else if (kind === 'roll') {
    if (!gameOpen) openGame();
    rolling = roll(Number(data.n)).finally(() => { rolling = null; });
  } else if (kind === 'result') {
    showResult(String(data.html || ''));
  } else if (kind === 'back') {
    back();
  } else if (kind === 'close') {
    closeGame();
  } else if (kind === 'pin') {
    const el = $('v-pinned');
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
}

function onMedia(key, url) {
  setImageOverride(key, url);
  if (last) renderQueue(last);
}

// ---------- Démarrage ----------

// Le lien contient la clé du live ; elle est gardée pour l'icône de l'écran d'accueil.
let pub = location.hash.slice(1);
try {
  if (pub) localStorage.setItem('portes.viewer.key', pub);
  else pub = localStorage.getItem('portes.viewer.key') || '';
} catch (e) { /* stockage indisponible */ }

renderSound();
fit();
fx.setAmbient(18);
dice.setActive(false);

if (!pub || !window.crypto || !crypto.subtle) {
  $('v-wait-title').textContent = !pub ? 'Lien incomplet' : 'Navigateur trop ancien';
  $('v-wait-text').textContent = !pub
    ? 'Ouvrez le lien partagé pendant le live (il contient la clé du live).'
    : 'Mettez à jour votre navigateur pour suivre le live.';
} else {
  renderStatus();
  imagesReady.then(() => { if (last) renderQueue(last); });
  new Receiver(pub, {
    onState,
    onEvent,
    onMedia,
    onSound: (name, buf) => sound.setReceived(name, buf),
    onStatus: (up) => { connected = up; renderStatus(); },
  }).ready.catch(() => {
    $('v-wait-title').textContent = 'Lien incomplet';
    $('v-wait-text').textContent = 'Ce lien ne correspond à aucun live. Demandez le bon lien pendant le live.';
  });
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
