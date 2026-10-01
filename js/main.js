// Tableau de bord du live + Jeu des Portes.

import { STORAGE } from './config.js';
import { load, save, loadFlag, saveFlag } from './prefs.js';
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
import { LiveQueue, Ranking, Milestones } from './queue.js';
import { roleOf, GiftCounter } from './gifts.js';
import { loadFeatures, loadGiftConfig, logGift, readJSON } from './features.js';
import { Dashboard } from './dashboard.js';
import { Radio } from './radio.js';
import { Celebrate } from './celebrate.js';
import { loadSettings, fill } from './settings.js';
import { loadMessages } from './messages.js';
import { normalizeHandle } from './game.js';
import { toast, notice, closeNotice, enterFullscreen, toggleFullscreen, keepAwake, esc } from './shell.js';

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const body = document.body;

// ---------- Construction ----------

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
const radio = new Radio($('radio'));

// Données du live, gardées sur l'appareil (un rechargement de page ne perd rien).
const queue = new LiveQueue(readJSON(STORAGE.queue, null));
const likes = new Ranking(readJSON(STORAGE.likes, null));
const gifters = new Ranking(readJSON(STORAGE.gifters, null));
let pinned = readJSON(STORAGE.pinned, null);
let features = loadFeatures();
let giftConfig = loadGiftConfig();
let settings = loadSettings();
const giftCounter = new GiftCounter();
const milestones = new Milestones();
milestones.reached = Number(load(STORAGE.milestone, 0)) || 0;
let milestoneAnnounced = 0; // palier déjà annoncé (« bientôt »)

const celebrate = new Celebrate({ root: $('celebrate'), fx, sound, getSettings: () => settings });

const dash = new Dashboard({
  onRemove: (id) => { queue.remove(id); changed(); },
  onRemoveDonut: (id) => { queue.removeDonut(id); changed(); },
});

const diceHit = document.createElement('button');
diceHit.className = 'dice-hit';
diceHit.type = 'button';
diceHit.setAttribute('aria-label', 'Lancer le dé');
stage.appendChild(diceHit);

// screen : 'dash' (tableau de bord) | 'game'
// phase du jeu : 'start' | 'countdown' | 'collecting' | 'rolling' | 'result' | 'between'
const state = { screen: 'dash', mode: 'live', phase: 'start', scale: 1 };
let simulating = false;

// ---------- Sauvegarde ----------

let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    save(STORAGE.queue, JSON.stringify(queue));
    save(STORAGE.likes, JSON.stringify(likes));
    save(STORAGE.gifters, JSON.stringify(gifters));
    save(STORAGE.milestone, milestones.reached ? String(milestones.reached) : null);
    save(STORAGE.pinned, pinned ? JSON.stringify(pinned) : null);
  }, 400);
}

let dashDirty = false;
function changed() {
  persist();
  if (dashDirty) return;
  dashDirty = true;
  requestAnimationFrame(() => {
    dashDirty = false;
    dash.renderQueue(queue);
    dash.renderDonuts(queue);
    dash.renderLikes(likes);
    dash.renderGifters(gifters);
  });
}

// ---------- Mise à l'échelle ----------

function fit() {
  const tickerOn = ticker.enabled && ticker.messages.length > 0;
  body.classList.toggle('ticker-on', tickerOn);
  const top = tickerOn && state.screen === 'game' ? 58 : 0;
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

function unlock() {
  sound.unlock();
  keepAwake();
}
document.addEventListener('pointerdown', unlock, { capture: true });

// ---------- Modules activables ----------

function applyFeatures() {
  $$('[data-feature]').forEach((el) => el.classList.toggle('feature-off', !features[el.dataset.feature]));
  if (!features.radio) radio.pause();
  milestones.configure({
    first: settings.milestoneFirst,
    step: settings.milestoneStep,
    alert: settings.milestoneAlert,
    words: String(settings.milestoneWords || '').split(','),
  });
  dash.applySettings(settings, features);
  changed();
}

// ---------- Tableau de bord ----------

$('btn-next').addEventListener('click', () => {
  const done = queue.next();
  if (!done) return;
  sound.tink();
  changed();
  const r = $('queue-current').getBoundingClientRect();
  if (queue.current) fx.burst(r.left + 60, r.top + r.height / 2, { count: 18, speed: 150, life: 1, stars: 0.3, size: 0.8 });
});
$('btn-undo').addEventListener('click', () => {
  if (queue.undo()) changed();
});
$('btn-open-game').addEventListener('click', openGame);

// ---------- Événements du live ----------

function onGift(g) {
  const n = giftCounter.count({ ...g, userKey: g.user.key });
  if (n <= 0) return;
  logGift(g, n);
  if (g.diamonds > 0) gifters.add(g.user, g.diamonds * n);
  const role = roleOf(g, giftConfig);
  const user = { ...g.user, giftImage: g.giftImage };
  if (role === 'cat' || role === 'galaxy') {
    const q = n * Math.max(1, Number(role === 'cat' ? settings.catQuestions : settings.galaxyQuestions) || 1);
    queue.addPriority(user, role, q);
    const text = role === 'cat' ? fill(q === 1 ? settings.catText : settings.catTextPlural, { q }) : fill(settings.galaxyText, { q });
    const anim = role === 'cat' ? settings.animCat : settings.animGalaxy;
    if (anim) celebrate.play(role, { name: user.name, text, giftImage: g.giftImage });
    else sound.diceResult();
  } else if (role === 'donut') {
    // Le pseudo rejoint la case « Message de l'univers » une fois l'enveloppe arrivée.
    const add = () => { queue.addDonut(user, n); changed(); };
    if (settings.animDonut && features.donuts) {
      celebrate.play('donut', { name: user.name, text: settings.donutText, target: $('donut-box') }).then(add);
    } else {
      sound.join();
      add();
    }
  }
  changed();
}

let likesDirty = false;
function onLike({ user, likeCount, totalLikeCount }) {
  likes.add(user, likeCount, totalLikeCount);
  persist();
  checkMilestone();
  if (likesDirty) return;
  likesDirty = true;
  setTimeout(() => { likesDirty = false; dash.renderLikes(likes); }, 500);
}

// ---------- Paliers de likes ----------

function milestonesOn() {
  return settings.milestones && features.list;
}

function checkMilestone() {
  if (!milestonesOn()) {
    dash.milestoneChip('');
    return;
  }
  const st = milestones.status(likes.total);
  const palier = Milestones.label(milestones.next());
  if (st === 'idle') {
    dash.milestoneChip('');
  } else if (st === 'alert') {
    dash.milestoneChip(`🏅 ${palier} bientôt`);
    if (milestoneAnnounced !== milestones.next()) {
      milestoneAnnounced = milestones.next();
      celebrate.play('banner', { text: fill(settings.milestoneAlertText, { palier }) });
    }
  } else {
    dash.milestoneChip(`🏅 ${palier} atteint !`);
  }
}

function claimMilestone(msg) {
  if (!milestonesOn()) return;
  const handle = normalizeHandle(msg.handle);
  if (handle && handle === normalizeHandle(load(STORAGE.tiktokUser))) return;
  const won = milestones.claim(msg.text, likes.total);
  if (!won) return;
  const palier = Milestones.label(won);
  const user = { key: handle || String(msg.userId || msg.name), handle, name: msg.name || handle, avatar: msg.avatar || '' };
  queue.addMilestone(user, fill(settings.milestoneLabel, { palier }));
  celebrate.play('milestone', { name: user.name, title: fill(settings.milestoneTitle, { palier }) });
  changed();
  checkMilestone();
}

function onPin(p) {
  if (p.pinned) {
    pinned = { text: p.text, name: p.user ? p.user.name : '', pinId: p.pinId };
    dash.flashPinned();
    sound.tink();
  } else if (!p.pinId || !pinned || !pinned.pinId || pinned.pinId === p.pinId) {
    pinned = null;
  }
  dash.renderPinned(pinned);
  persist();
}

live.addEventListener('chat', (e) => { claimMilestone(e.detail); onChat(e.detail); });
live.addEventListener('gift', (e) => onGift(e.detail));
live.addEventListener('like', (e) => onLike(e.detail));
live.addEventListener('pin', (e) => onPin(e.detail));

function renderStatus() {
  const pill = $('live-status');
  const st = simulating ? 'waiting' : live.state;
  pill.dataset.state = st;
  pill.querySelector('.label').textContent = simulating
    ? 'Simulation'
    : st === 'live' ? `En direct · @${live.handle}` : (live.state === 'off' && !hasCreds() ? 'TikTok non configuré' : live.message || 'Non connecté');
}
live.addEventListener('status', (e) => {
  const { state: st, message } = e.detail;
  renderStatus();
  if (st === 'error') toast(message, 5000);
});
$('live-status').addEventListener('click', () => { location.href = 'admin.html#tiktok'; });

function hasCreds() {
  return Boolean(load(STORAGE.tiktokUser) && load(STORAGE.tiktokKey));
}

function ensureLive() {
  if (!hasCreds()) return;
  if (['live', 'connecting', 'waiting'].includes(live.state)) return;
  live.connect(load(STORAGE.tiktokUser), load(STORAGE.tiktokKey));
}

// ---------- Jeu des Portes : session ----------

function openGame() {
  if (state.screen === 'game') return;
  state.screen = 'game';
  state.phase = 'start';
  round.reset();
  body.classList.remove('at-home');
  $('game-start').hidden = false;
  dice.setActive(true);
  fx.setAmbient(18);
  radio.duck(true);
  markOpened();
  renderFeeds();
  updateUI();
  fit();
}

async function startSession(mode, { force = false } = {}) {
  if (mode === 'live' && !force && !hasCreds()) {
    needCreds();
    return;
  }
  $('game-start').hidden = true;
  state.mode = mode;
  body.classList.toggle('mode-live', mode === 'live');
  if (mode === 'live' && !force) ensureLive();
  state.phase = 'countdown';
  updateUI();
  if (settings.countdown) await countdown();
  if (state.screen !== 'game') return;
  if (mode === 'live') {
    round.setHost(load(STORAGE.tiktokUser));
    round.start();
    state.phase = 'collecting';
    toast('Les participations sont ouvertes !');
  } else {
    round.start();
    round.close();
    state.phase = 'between';
  }
  renderFeeds();
  updateUI();
}

async function countdown() {
  const box = $('countdown');
  const num = $('countdown-num');
  box.hidden = false;
  for (const step of ['3', '2', '1', settings.countdownGo || '✦']) {
    if (state.screen !== 'game') break;
    num.textContent = step;
    num.className = `tick${step.length > 1 ? ' go' : ''}`;
    void num.offsetWidth;
    if (step.length > 1) {
      sound.gameStart();
      const c = stageToScreen(750, 480);
      fx.burst(c.x, c.y, { count: 80, speed: 320, life: 2, stars: 0.4 });
    } else {
      sound.diceResult();
    }
    await wait(step.length > 1 ? 1300 : 950);
  }
  box.hidden = true;
}

async function closeGame() {
  if (state.screen !== 'game') return;
  rollId++;
  $('drawer').hidden = true;
  $('game-start').hidden = true;
  $('countdown').hidden = true;
  $('result').hidden = true;
  $('dice-number').classList.remove('show');
  doors.highlight(0);
  if (doors.focused) await doors.close();
  const winners = state.mode === 'live' ? round.sessionWinners() : [];
  const added = queue.closeGame(winners);
  round.reset();
  markOpened();
  state.screen = 'dash';
  state.phase = 'start';
  body.classList.add('at-home');
  body.classList.remove('mode-live', 'rolling');
  dice.setActive(false);
  fx.setAmbient(22);
  radio.duck(false);
  updateUI();
  changed();
  fit();
  if (added.length) toast(`${added.length} gagnant${added.length > 1 ? 's' : ''} ajouté${added.length > 1 ? 's' : ''} à la liste.`, 4000);
}

// Les portes déjà ouvertes pendant la session sont estompées.
function markOpened() {
  doors.els.forEach((el, i) => el.classList.toggle('opened', round.opened.includes(i + 1)));
}

function updateUI() {
  const inGame = state.screen === 'game';
  const isLive = state.mode === 'live';
  const p = state.phase;
  const collecting = p === 'collecting';
  $('panel-players').hidden = !inGame || !isLive || p === 'start';
  $('panel-out').hidden = !inGame || !isLive || p === 'start';
  $('session-bar').hidden = !inGame || p === 'start' || p === 'countdown';

  let heading = settings.gameTitle;
  let tagline = settings.gameTagline;
  if (isLive && collecting) {
    heading = settings.gameCollectTitle;
    tagline = settings.gameCollectTagline;
  } else if (p === 'between' && round.opened.length) {
    heading = settings.gameAgainTitle;
  }
  $('stage-heading').textContent = heading;
  $('stage-tagline').textContent = tagline;

  const left = round.closedDoors().length;
  const btn = $('btn-main');
  btn.hidden = !inGame || p === 'start' || p === 'countdown';
  btn.disabled = !(collecting || p === 'between') || !left;
  btn.textContent = round.opened.length ? 'Relancer le dé' : 'Lancer le dé';
  diceHit.disabled = btn.disabled || btn.hidden;
  $('btn-again').disabled = !left;
  doors.setCounts(inGame && isLive && p !== 'start' && p !== 'countdown' ? round.counts() : null);
  body.classList.toggle('rolling', p === 'rolling');

  renderSessionInfo();
}

function renderSessionInfo() {
  const won = round.sessionWinners().length;
  const np = round.players.size;
  const opened = round.opened.length ? `Portes ouvertes : ${round.opened.join(', ')}` : 'Aucune porte ouverte';
  $('session-info').textContent = state.mode === 'live'
    ? `${opened} · 🏆 ${won} gagnant${won > 1 ? 's' : ''} · ${np} participant${np > 1 ? 's' : ''}`
    : opened;
}

function mainAction() {
  if (state.screen !== 'game') return;
  if (state.phase === 'collecting' || state.phase === 'between') roll();
}
$('btn-main').addEventListener('click', mainAction);
diceHit.addEventListener('click', mainAction);

// Chaque lancer a un numéro : fermer le jeu en plein lancer l'annule proprement.
let rollId = 0;

async function roll() {
  if (!['collecting', 'between'].includes(state.phase)) return;
  const choices = round.closedDoors();
  if (!choices.length) {
    toast('Toutes les portes sont déjà ouvertes : fermez le jeu.');
    return;
  }
  $('drawer').hidden = true;
  const id = ++rollId;
  const alive = () => id === rollId && state.screen === 'game';
  round.close();
  state.phase = 'rolling';
  updateUI();
  const numEl = $('dice-number');
  numEl.classList.remove('show');

  // Tirage au hasard parmi les portes encore fermées.
  const n = choices[randomInt(0, choices.length - 1)];
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
  const winners = round.openDoor(n);
  doors.split();
  showResult(n, winners);
  sound.reveal();
  state.phase = 'result';
  updateUI();
}

function showResult(n, winners) {
  let html = `<p class="result-kicker">Le dé a parlé</p><div class="result-number">${n}</div>`;
  if (state.mode === 'simple') {
    html += `<p class="result-title">${esc(fill(settings.resultSimple, { n }))}</p>`;
  } else {
    html += `<p class="result-title">${esc(fill(settings.resultLive, { n }))}</p>`;
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
      html += `<p class="result-text">${esc(settings.resultNobody)}</p>`;
    }
    const won = round.sessionWinners().length;
    html += `<p class="result-stats">🏆 ${won} gagnant${won > 1 ? 's' : ''} depuis le début du jeu · ${round.players.size} participant${round.players.size > 1 ? 's' : ''}</p>`;
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

async function backToDoors() {
  $('result').hidden = true;
  await doors.close();
  state.phase = 'between';
  markOpened();
  renderFeeds();
  updateUI();
}

$('btn-again').addEventListener('click', async () => {
  await backToDoors();
  roll();
});
$('btn-back').addEventListener('click', backToDoors);

// ---------- Participants (chat) ----------

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
    feed.innerHTML = `<li class="empty">${state.phase === 'collecting' ? 'En attente des premiers chiffres…' : 'Aucun participant'}</li>`;
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
  if (state.screen !== 'game' || state.mode !== 'live' || state.phase !== 'collecting') return;
  const r = round.handle(msg);
  if (r.type === 'join') sound.join();
  else if (r.type === 'out') sound.eliminated();
  else return;
  doors.setCounts(round.counts());
  renderSessionInfo();
  renderFeedsSoon();
}

function needCreds() {
  notice('Connexion TikTok',
    '<p class="hint">Pour jouer avec le chat, renseignez d’abord votre pseudo TikTok et votre clé API Euler Stream dans les réglages.</p>',
    [
      { label: 'Ouvrir les réglages', href: 'admin.html#tiktok', primary: true },
      { label: 'Simuler des participants', onClick: simulateGame },
      { label: 'Jouer sans le chat', onClick: () => startSession('simple') },
    ]);
}

// ---------- Simulations (pour répéter sans être en live) ----------

const FAKE = ['Luna', 'Céleste', 'Maëlys', 'Inès', 'Sofia', 'Jade', 'Léna', 'Nour', 'Camille', 'Aurore', 'Yasmine', 'Élise',
  'Manon', 'Chloé', 'Sarah', 'Lilou', 'Anaïs', 'Rose', 'Iris', 'Mila', 'Emma', 'Noa', 'Zoé', 'Lina', 'Alice', 'Julia'];
const fakeUser = (name) => ({ key: name.toLowerCase(), handle: name.toLowerCase(), name, avatar: '' });

async function simulateGame() {
  closeNotice();
  if (simulating) return;
  if (state.screen !== 'game') openGame();
  simulating = true;
  renderStatus();
  if (state.phase === 'start') await startSession('live', { force: true });
  toast('Simulation : de faux spectateurs participent…');
  const phrases = (n) => [`${n}`, `la ${n} stp`, `je prends la porte ${n} ✨`, `${n} !!`, `porte ${n}`, `${n} 🙏`, `bonsoir ! ${n}`];
  for (let i = 0; i < FAKE.length && state.phase === 'collecting'; i++) {
    const name = FAKE[i];
    const n = randomInt(1, 12);
    const options = phrases(n);
    onChat({ handle: name.toLowerCase(), name, text: options[randomInt(0, options.length - 1)] });
    // De temps en temps, quelqu'un change d'avis : éliminé.
    if (i > 4 && randomInt(1, 6) === 1) {
      const prev = FAKE[randomInt(0, i - 1)];
      const p = round.players.get(prev.toLowerCase());
      if (p) onChat({ handle: prev.toLowerCase(), name: prev, text: `non finalement la ${(p.choice % 12) + 1}` });
    }
    await wait(220 + randomInt(0, 380));
  }
  simulating = false;
  renderStatus();
}

// Faux cadeaux, likes et message épinglé, pour voir le tableau de bord se remplir.
async function simulateGifts() {
  if (simulating) return;
  simulating = true;
  renderStatus();
  toast('Simulation : cadeaux, likes et message épinglé…');
  const script = [
    ['pin', 'Luna', 'Bienvenue ! Posez vos questions après un Chat porte-bonheur 🐱'],
    ['gift', 'Céleste', 'Lucky Cat', 99], ['like', 'Inès', 40], ['gift', 'Jade', 'Galaxy', 1000], ['gift', 'Sofia', 'Doughnut', 30],
    ['like', 'Céleste', 25], ['gift', 'Camille', 'Rose', 1], ['like', 'Jade', 60], ['gift', 'Aurore', 'Lucky Cat', 99],
    ['like', 'Manon', 99700], ['like', 'Nour', 150], ['chat', 'Iris', 'allez les 100k !!'], ['like', 'Lina', 120], ['chat', 'Zoé', 'on a fait 100k 🎉'],
  ];
  let i = 0;
  for (const [type, name, arg, extra] of script) {
    const user = fakeUser(name);
    if (type === 'pin') onPin({ pinned: true, text: arg, user, pinId: 'sim' });
    else if (type === 'like') onLike({ user, likeCount: arg, totalLikeCount: 0 });
    else if (type === 'chat') claimMilestone({ handle: user.handle, name, text: arg });
    else onGift({ user, msgId: `sim-${Date.now()}-${i++}`, giftId: `sim-${arg}`, giftName: arg, giftImage: '', combo: false, repeatCount: 1, repeatEnd: true, diamonds: extra });
    await wait(type === 'like' ? 900 : 1200);
  }
  simulating = false;
  renderStatus();
}

// ---------- Bascules, menus ----------

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

$('btn-game-menu').addEventListener('click', () => {
  const d = $('drawer');
  d.hidden = !d.hidden;
  $('btn-game-menu').setAttribute('aria-expanded', String(!d.hidden));
});
document.addEventListener('pointerdown', (e) => {
  if (!$('drawer').hidden && !e.target.closest('#drawer, #btn-game-menu')) $('drawer').hidden = true;
});

// Écran de veille : seulement les messages.
const saver = new Ticker($('screensaver'), $('ss-track'), { speedFactor: 2.4 });
saver.setEnabled(true);

function openScreensaver() {
  $('drawer').hidden = true;
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

// Délégation des clics
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-toggle], [data-action]');
  if (!t) return;
  sound.tink();
  const a = t.dataset.action;
  if (t.dataset.toggle === 'ticker') setTicker(!ticker.enabled);
  else if (t.dataset.toggle === 'sound') setSound(!sound.enabled);
  else if (a === 'close-game') closeGame();
  else if (a === 'start-live') startSession('live');
  else if (a === 'start-simple') startSession('simple');
  else if (a === 'fullscreen') toggleFullscreen();
  else if (a === 'screensaver') openScreensaver();
});

// Clavier (pratique sur ordinateur)
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (!$('notice').hidden || !$('screensaver').hidden) {
    if (e.key === 'Escape') { closeNotice(); closeScreensaver(); }
    return;
  }
  if (e.key === 'Escape') $('drawer').hidden = true;
  else if (state.screen === 'dash' && (e.key === 'ArrowRight' || e.key === 'Enter')) $('btn-next').click();
  else if (state.screen === 'dash' && e.key === 'Backspace') $('btn-undo').click();
  else if (state.screen === 'game' && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    if (state.phase === 'result') $('btn-again').click();
    else mainAction();
  }
});

// ---------- Démarrage ----------

// Case centrale : messages qui défilent (Réglages ou regles.json).
function loadBoard() {
  return loadMessages('board').then((d) => dash.renderBoard(d.messages, d.speed));
}

function loadTicker() {
  return ticker.load().then(() => {
    fit();
    if (ticker.error) toast('Le fichier messages.json contient une erreur : le bandeau est masqué.', 6000);
  });
}

// Relit les réglages (retour depuis la page Réglages, ou changement dans un autre onglet).
function reloadSettings() {
  features = loadFeatures();
  giftConfig = loadGiftConfig();
  settings = loadSettings();
  loadBoard();
  applyFeatures();
  ticker.setEnabled(loadFlag(STORAGE.ticker, true));
  sound.setEnabled(loadFlag(STORAGE.sound, true));
  syncToggles();
  // La liste a été vidée depuis les Réglages (« Nouveau live »).
  if (!load(STORAGE.queue)) {
    queue.clear();
    likes.total = 0;
    likes.users = {};
    gifters.total = 0;
    gifters.users = {};
    milestones.reached = 0;
    milestoneAnnounced = 0;
    pinned = null;
    dash.renderPinned(pinned);
    changed();
  }
  ensureLive();
  renderStatus();
}

window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    loadTicker();
    reloadSettings();
  }
});
window.addEventListener('storage', (e) => {
  if (!e.key || !e.key.startsWith('portes.')) return;
  if (e.key === STORAGE.messages) loadTicker();
  else if (e.key === STORAGE.board) loadBoard();
  else if ([STORAGE.features, STORAGE.gifts, STORAGE.settings, STORAGE.ticker, STORAGE.sound, STORAGE.queue, STORAGE.tiktokUser, STORAGE.tiktokKey].includes(e.key)) reloadSettings();
});

body.classList.add('at-home');
ticker.setEnabled(loadFlag(STORAGE.ticker, true));
loadTicker();
applyFeatures();
syncToggles();
dash.renderPinned(pinned);
dash.renderQueue(queue);
dash.renderDonuts(queue);
dash.renderLikes(likes);
dash.renderGifters(gifters);
loadBoard();
checkMilestone();
renderFeeds();
updateUI();
fit();
fx.setAmbient(22);
dice.setActive(false);
ensureLive();
renderStatus();

// Liens depuis les Réglages : répéter sans être en live.
const sim = new URLSearchParams(location.search).get('simulation');
if (sim !== null) {
  history.replaceState(null, '', location.pathname);
  setTimeout(sim === 'cadeaux' ? simulateGifts : simulateGame, 500);
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
