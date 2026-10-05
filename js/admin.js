// Page des réglages : connexion TikTok, messages défilants, affichage et son.

import { STORAGE, CAST_MAX } from './config.js';
import { load, save, loadFlag, saveFlag } from './prefs.js';
import { loadMessages, loadFileMessages, saveLocalMessages, clearLocalMessages } from './messages.js';
import { Ticker } from './ticker.js';
import { TikTokLive } from './tiktok.js';
import { ROLES, DEFAULT_GIFT_NAMES } from './gifts.js';
import { FEATURES, loadFeatures, saveFeatures, loadGiftConfig, saveGiftConfig, loadGiftLog } from './features.js';
import { SETTINGS, DEFAULTS, loadSettings, saveSettings } from './settings.js';
import { getMedia, putMedia, deleteMedia, shrinkImage } from './media.js';
import { hostKey, viewerLink, Broadcaster, castMedia } from './broadcast.js';
import { grimoireMessages, loadEdits, saveEdits, buildDeck, messageId } from './universe.js';
import { TOUR_TARGETS, TOUR_SIDES, STAR_POSES, starImage, loadTour, saveTour, defaultTour } from './tour.js';
import { loadMyTracks, addFileTrack, addUrlTrack, removeTrack, moveTrack, renameTrack } from './playlist.js';

const $ = (id) => document.getElementById(id);
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));


function status(el, text, state = '') {
  el.textContent = text;
  el.dataset.state = state;
}

// ---------- Connexion TikTok ----------

const cleanHandle = (v) => v.trim()
  .replace(/^https?:\/\/(www\.)?tiktok\.com\//i, '')
  .replace(/^@/, '')
  .replace(/[/?#].*$/, '');

$('tt-user').value = load(STORAGE.tiktokUser, '') ? `@${load(STORAGE.tiktokUser)}` : '';
$('tt-key').value = load(STORAGE.tiktokKey, '');

function saveCreds() {
  const user = cleanHandle($('tt-user').value);
  const key = $('tt-key').value.trim();
  save(STORAGE.tiktokUser, user);
  save(STORAGE.tiktokKey, key);
  $('tt-user').value = user ? `@${user}` : '';
  return { user, key };
}

$('tiktok-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const { user, key } = saveCreds();
  status($('tt-status'), user && key ? '✓ Enregistré. La connexion se fera au lancement du jeu TikTok.' : 'Renseignez le pseudo et la clé.', user && key ? 'live' : 'error');
});

$('tt-key-show').addEventListener('click', () => {
  const k = $('tt-key');
  k.type = k.type === 'password' ? 'text' : 'password';
});

$('tt-forget').addEventListener('click', () => {
  save(STORAGE.tiktokKey, null);
  $('tt-key').value = '';
  status($('tt-status'), 'Clé effacée de cet appareil.');
});

let tester = null;
$('tt-test').addEventListener('click', () => {
  const { user, key } = saveCreds();
  if (tester) tester.disconnect(true);
  tester = new TikTokLive();
  const t = tester;
  const stop = setTimeout(() => {
    t.disconnect(true);
    status($('tt-status'), 'Pas de réponse d’Euler Stream. Vérifiez la connexion internet.', 'error');
  }, 15000);
  t.addEventListener('status', (e) => {
    const { state, message } = e.detail;
    if (state === 'live') {
      clearTimeout(stop);
      status($('tt-status'), `✓ Connexion réussie au live de @${user}.`, 'live');
      setTimeout(() => t.disconnect(true), 2500);
    } else if (state === 'waiting' || state === 'error') {
      clearTimeout(stop);
      t.disconnect(true);
      status($('tt-status'), message, state);
    } else {
      status($('tt-status'), message, state);
    }
  });
  t.connect(user, key);
});

// ---------- Messages qui défilent (ruban du bas et case centrale) ----------

// prefix : « msg » (ruban) ou « board » (case centrale) ; kind : liste de messages concernée.
function messageEditor(prefix, kind, file, onPreview) {
  const el = (id) => $(`${prefix}-${id}`);
  const lines = () => el('text').value.split('\n').map((l) => l.trim()).filter(Boolean);
  const show = () => {
    const speed = Number(el('speed').value);
    el('speed-out').textContent = speed;
    if (onPreview) onPreview(lines(), speed);
  };
  const fillForm = ({ messages, speed }) => {
    el('text').value = messages.join('\n');
    el('speed').value = speed;
    show();
  };
  let timer;
  el('text').addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(show, 400);
  });
  el('speed').addEventListener('input', show);
  el('save').addEventListener('click', () => {
    const list = lines();
    if (!list.length) {
      status(el('status'), 'Ajoutez au moins un message.', 'error');
      return;
    }
    saveLocalMessages(list, Number(el('speed').value), kind);
    status(el('status'), `✓ ${list.length} message${list.length > 1 ? 's' : ''} enregistré${list.length > 1 ? 's' : ''} sur cet appareil.`, 'live');
  });
  el('reset').addEventListener('click', async () => {
    clearLocalMessages(kind);
    try {
      fillForm(await loadFileMessages(kind));
      status(el('status'), `Messages du fichier ${file} (GitHub) rétablis.`, 'live');
    } catch (e) {
      status(el('status'), `Le fichier ${file} est illisible.`, 'error');
    }
  });
  loadMessages(kind).then((data) => {
    fillForm(data);
    if (data.error) status(el('status'), `Le fichier ${file} contient une erreur.`, 'error');
    else status(el('status'), data.source === 'local'
      ? 'Messages actuels : ceux enregistrés sur cet appareil.'
      : `Messages actuels : ceux du fichier ${file} (GitHub).`);
  });
}

const preview = new Ticker($('preview'), $('preview-track'));
preview.setEnabled(true);
messageEditor('msg', 'ticker', 'messages.json', (list, speed) => preview.setData(list, speed));
messageEditor('board', 'board', 'regles.json');

// ---------- Personnalisation : textes, disposition, paliers, animations ----------

function settingField(item, value) {
  const id = `set-${item.key}`;
  const attrs = `id="${id}" data-setting="${item.key}"`;
  if (item.type === 'bool') {
    return `<button class="btn btn-menu btn-toggle" ${attrs} type="button" aria-pressed="${value}">
      <span><strong>${esc(item.label)}</strong><small class="state">${value ? 'Oui' : 'Non'}</small></span><span class="switch" aria-hidden="true"></span></button>`;
  }
  let input;
  if (item.type === 'select') {
    input = `<select ${attrs}>${item.options.map(([v, l]) => `<option value="${v}"${v === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (item.type === 'range') {
    input = `<span class="range-row"><input ${attrs} type="range" min="${item.min}" max="${item.max}" step="1" value="${value}"><output>${value}${item.unit || ''}</output></span>`;
  } else if (item.type === 'number') {
    input = `<input ${attrs} type="number" inputmode="numeric" min="${item.min}" max="${item.max}" value="${value}">`;
  } else if (item.type === 'color') {
    input = `<input ${attrs} type="color" value="${esc(value)}">`;
  } else if (item.type === 'textarea') {
    input = `<textarea ${attrs} rows="3">${esc(value)}</textarea>`;
  } else {
    input = `<input ${attrs} type="text" value="${esc(value)}" placeholder="${esc(item.def)}">`;
  }
  return `<label class="field"><span>${esc(item.label)}</span>${input}</label>`;
}

function renderSettings(values = loadSettings()) {
  $('custom-groups').innerHTML = SETTINGS.map((g, i) => `
    <details class="set-group"${i === 0 ? ' open' : ''}>
      <summary>${esc(g.group)}</summary>
      <div class="set-items">${g.items.map((it) => settingField(it, values[it.key])).join('')}</div>
    </details>`).join('');
}

function readSettings() {
  const out = loadSettings();
  SETTINGS.forEach((g) => g.items.forEach((it) => {
    const el = $(`set-${it.key}`);
    if (!el) return;
    if (it.type === 'bool') out[it.key] = el.getAttribute('aria-pressed') === 'true';
    else if (it.type === 'range' || it.type === 'number') {
      const v = Number(el.value);
      out[it.key] = Number.isFinite(v) ? Math.min(it.max, Math.max(it.min, v)) : it.def;
    } else out[it.key] = el.value;
  }));
  return out;
}

$('custom-groups').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-setting]');
  if (!b) return;
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(on));
  b.querySelector('.state').textContent = on ? 'Oui' : 'Non';
});
$('custom-groups').addEventListener('input', (e) => {
  if (e.target.type === 'range') {
    const it = SETTINGS.flatMap((g) => g.items).find((x) => x.key === e.target.dataset.setting);
    e.target.nextElementSibling.textContent = `${e.target.value}${it.unit || ''}`;
  }
});
$('custom-save').addEventListener('click', () => {
  saveSettings(readSettings());
  status($('custom-status'), '✓ Réglages enregistrés. Ils s’appliquent dès le retour au tableau de bord.', 'live');
});
$('custom-reset').addEventListener('click', () => {
  if (!window.confirm('Remettre tous les textes et la disposition par défaut ?')) return;
  saveSettings(DEFAULTS);
  renderSettings(DEFAULTS);
  status($('custom-status'), 'Réglages par défaut rétablis.', 'live');
});
renderSettings();

// ---------- Affichage et son ----------

function syncToggles() {
  document.querySelectorAll('[data-toggle]').forEach((b) => {
    const isTicker = b.dataset.toggle === 'ticker';
    const on = loadFlag(isTicker ? STORAGE.ticker : STORAGE.sound, true);
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('.state').textContent = isTicker ? (on ? 'Affiché dans le jeu' : 'Masqué') : (on ? 'Activé' : 'Coupé');
  });
}
document.querySelectorAll('[data-toggle]').forEach((b) => {
  b.addEventListener('click', () => {
    const key = b.dataset.toggle === 'ticker' ? STORAGE.ticker : STORAGE.sound;
    saveFlag(key, !loadFlag(key, true));
    syncToggles();
  });
});
syncToggles();

// ---------- Modules du tableau de bord ----------

function renderFeatures() {
  const f = loadFeatures();
  $('feature-toggles').innerHTML = Object.entries(FEATURES).map(([k, v]) => `
    <button class="btn btn-menu btn-toggle" data-feature-toggle="${k}" type="button" aria-pressed="${f[k]}">
      <span><strong>${v.label}</strong><small class="state">${f[k] ? 'Affiché' : 'Masqué'}</small></span><span class="switch" aria-hidden="true"></span>
    </button>`).join('');
}
$('feature-toggles').addEventListener('click', (e) => {
  const b = e.target.closest('[data-feature-toggle]');
  if (!b) return;
  const f = loadFeatures();
  f[b.dataset.featureToggle] = !f[b.dataset.featureToggle];
  saveFeatures(f);
  renderFeatures();
});
renderFeatures();

// ---------- Cadeaux ----------


function renderGifts(cfg = loadGiftConfig()) {
  $('gift-roles').innerHTML = Object.entries(ROLES).map(([role, r]) => `
    <label class="gift-role">
      <span class="emoji" aria-hidden="true">${r.emoji}</span>
      <strong>${r.label}<small>${r.effect}</small></strong>
      <input data-role="${role}" type="text" value="${esc((cfg.names[role] || []).join(', '))}" autocapitalize="off" spellcheck="false">
    </label>`).join('');

  const log = loadGiftLog();
  const options = (sel) => [['', 'Automatique (par le nom)'], ...Object.entries(ROLES).map(([k, r]) => [k, `${r.emoji} ${r.label}`]), ['none', 'Aucun rôle']]
    .map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`).join('');
  $('gift-log').innerHTML = log.length
    ? log.map((g) => `<tr>
        <td>${g.giftImage ? `<img src="${esc(g.giftImage)}" alt="" referrerpolicy="no-referrer">` : '🎁'}</td>
        <td>${esc(g.giftName || '?')}<small>n° ${esc(g.giftId || '?')}</small></td>
        <td>${g.count}</td>
        <td><select data-gift-id="${esc(g.giftId)}"${g.giftId ? '' : ' disabled'}>${options(cfg.byId[g.giftId] || '')}</select></td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="empty">Aucun cadeau reçu pour l’instant. Ils apparaîtront ici pendant le live.</td></tr>';
}

$('gifts-save').addEventListener('click', () => {
  const names = {};
  document.querySelectorAll('[data-role]').forEach((i) => {
    names[i.dataset.role] = i.value.split(',').map((x) => x.trim()).filter(Boolean);
  });
  const byId = {};
  document.querySelectorAll('[data-gift-id]').forEach((sel) => {
    if (sel.value && sel.dataset.giftId) byId[sel.dataset.giftId] = sel.value;
  });
  saveGiftConfig({ names, byId });
  status($('gifts-status'), '✓ Cadeaux enregistrés.', 'live');
});

$('gifts-reset').addEventListener('click', () => {
  const cfg = loadGiftConfig();
  renderGifts({ names: { ...DEFAULT_GIFT_NAMES }, byId: cfg.byId });
  status($('gifts-status'), 'Noms par défaut rétablis : touchez « Enregistrer les cadeaux » pour valider.');
});
renderGifts();

// ---------- Nouveau live ----------

$('live-reset').addEventListener('click', () => {
  if (!window.confirm('Vider la liste, les enveloppes, les tops, les paliers et le message épinglé ?')) return;
  [STORAGE.queue, STORAGE.likes, STORAGE.gifters, STORAGE.milestone, STORAGE.pinned, STORAGE.likeTiersReached].forEach((k) => save(k, null));
  status($('reset-status'), '✓ Tout est vidé. Bon live !', 'live');
});

// ---------- Images et sons déposés ----------

const MEDIA_SLOTS = {
  'media-logos': [
    ['img:logoChat', 'Chat porte-bonheur', 'liste à traiter', 384],
    ['img:logoGalaxie', 'Galaxie', 'liste à traiter', 384],
    ['img:logoEnveloppe', 'Enveloppe', 'case « Message de l’univers »', 384],
  ],
  'media-anims': [
    ['img:animChat', 'Chat porte-bonheur', 'grande animation', 1400],
    ['img:animGalaxie', 'Galaxie', 'grande animation', 1400],
    ['img:animEnveloppeDos', 'Enveloppe : côté sceau', 'virevolte, puis dépasse derrière la lettre', 1400],
    ['img:animEnveloppe', 'Enveloppe : côté destinataire', 'le pseudo est écrit dessus', 1400],
    ['img:animLettre', 'Lettre ouverte (vierge)', 'le message est écrit dessus', 1600],
  ],
  'media-sounds': [
    ['snd:chat', 'Chat porte-bonheur', 'miaulement'],
    ['snd:galaxie', 'Galaxie', 'harpe'],
    ['snd:enveloppe', 'Enveloppe', 'papier froissé'],
    ['snd:ouverture', 'Ouverture de l’enveloppe', 'la lettre apparaît'],
    ['snd:palier', 'Palier de likes', 'fanfare'],
    ['snd:de', 'Dé', 'le dé qui roule'],
    ['snd:porte', 'Porte', 'la porte s’ouvre'],
    ['snd:resultat', 'Résultat', 'le résultat apparaît'],
    ['snd:jeu', 'Début du jeu', '« Le jeu commence ! »'],
  ],
};
const mediaUrls = {};

function mediaSlot([key, label, where]) {
  const isSound = key.startsWith('snd:');
  return `<div class="media-slot" data-media="${key}">
    <div class="media-preview">${isSound ? '<button class="btn media-play" type="button" hidden>▶ Écouter</button>' : ''}<span class="media-empty">${isSound ? 'Son d’origine' : 'Dessin d’origine'}</span></div>
    <strong>${esc(label)}</strong><small>${esc(where)}</small>
    <div class="media-actions">
      <label class="btn btn-primary media-pick">Choisir<input type="file" accept="${isSound ? 'audio/*,.mp3,.m4a,.wav' : 'image/*'}" hidden></label>
      <button class="btn btn-ghost media-remove" type="button" hidden>Retirer</button>
    </div>
    <p class="form-status" role="status"></p>
  </div>`;
}

async function showMedia(slot) {
  const key = slot.dataset.media;
  const blob = await getMedia(key);
  if (mediaUrls[key]) URL.revokeObjectURL(mediaUrls[key]);
  mediaUrls[key] = blob ? URL.createObjectURL(blob) : null;
  const prev = slot.querySelector('.media-preview');
  const old = prev.querySelector('img');
  if (old) old.remove();
  if (key.startsWith('img:') && blob) prev.insertAdjacentHTML('afterbegin', `<img src="${mediaUrls[key]}" alt="">`);
  const play = prev.querySelector('.media-play');
  if (play) play.hidden = !blob;
  prev.querySelector('.media-empty').hidden = !!blob;
  slot.querySelector('.media-remove').hidden = !blob;
}

// Diffusion active : le fichier part aussitôt chez les viewers (même si le tableau de bord
// n'est pas ouvert). Sinon il partira à la prochaine ouverture du tableau de bord.
let adminCast = null;
async function mediaChanged(key, status, text) {
  try { localStorage.setItem(STORAGE.media, String(Date.now())); } catch (e) { /* ignore */ }
  status.textContent = text;
  if (!loadFlag(STORAGE.cast, false)) return;
  status.textContent = `${text} · envoi aux viewers…`;
  adminCast = adminCast || new Broadcaster();
  const ok = await castMedia(adminCast, { only: key }).catch(() => false);
  status.textContent = ok
    ? `${text} · envoyé aux viewers ✓`
    : `${text} · pas encore envoyé aux viewers (relais injoignable) : il partira à l’ouverture du tableau de bord.`;
}
window.addEventListener('pagehide', () => { if (adminCast) adminCast.close(); adminCast = null; });

Object.entries(MEDIA_SLOTS).forEach(([id, slots]) => {
  const box = $(id);
  box.innerHTML = slots.map(mediaSlot).join('');
  box.querySelectorAll('.media-slot').forEach(showMedia);
});

document.querySelectorAll('.media-slot').forEach((slot) => {
  const key = slot.dataset.media;
  const max = (Object.values(MEDIA_SLOTS).flat().find((s) => s[0] === key) || [])[3];
  const status = slot.querySelector('.form-status');
  slot.querySelector('input[type=file]').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const isSound = key.startsWith('snd:');
    if (isSound ? !/^audio\//.test(file.type) && !/\.(mp3|m4a|wav|aac|ogg)$/i.test(file.name) : !/^image\//.test(file.type)) {
      status.textContent = isSound ? 'Ce fichier n’est pas un son.' : 'Ce fichier n’est pas une image.';
      return;
    }
    status.textContent = 'Enregistrement…';
    try {
      const blob = isSound ? file : await shrinkImage(file, max || 1400);
      await putMedia(key, blob);
      await showMedia(slot);
      await mediaChanged(key, status, isSound && blob.size > CAST_MAX.sound
        ? 'Enregistré ✓ — trop lourd pour les viewers (1,5 Mo maximum) : ils entendront le son d’origine'
        : 'Enregistré ✓');
    } catch (err) {
      status.textContent = 'Impossible d’enregistrer ce fichier sur cet appareil.';
    }
  });
  slot.querySelector('.media-remove').addEventListener('click', async () => {
    await deleteMedia(key).catch(() => {});
    await showMedia(slot);
    await mediaChanged(key, status, 'Retiré : retour au dessin ou au son d’origine');
  });
  const play = slot.querySelector('.media-play');
  if (play) play.addEventListener('click', () => { if (mediaUrls[key]) new Audio(mediaUrls[key]).play().catch(() => {}); });
});

// ---------- Page des viewers ----------

function syncCast() {
  const on = loadFlag(STORAGE.cast, false);
  const b = $('cast-toggle');
  b.setAttribute('aria-pressed', String(on));
  b.querySelector('.state').textContent = on ? 'Activée sur cet appareil' : 'Coupée';
}

async function showCastLink(renew = false) {
  try {
    const key = await hostKey({ renew });
    const link = viewerLink(key.pub);
    $('cast-link').value = link;
    $('cast-open').href = link;
  } catch (e) {
    $('cast-link').value = 'Ce navigateur ne permet pas de créer le lien (page à ouvrir en https).';
  }
}

$('cast-toggle').addEventListener('click', () => {
  const on = !loadFlag(STORAGE.cast, false);
  saveFlag(STORAGE.cast, on);
  syncCast();
  if (!on) {
    // Prévient les viewers tout de suite (le tableau de bord n'est peut-être pas ouvert).
    // L'état « hors ligne » est envoyé dès que le relais répond.
    const b = new Broadcaster();
    b.lastState = { offline: true };
    setTimeout(() => b.close(), 8000);
  }
  status($('cast-status-text'), loadFlag(STORAGE.cast, false)
    ? 'Diffusion activée : le tableau de bord envoie tout aux viewers.'
    : 'Diffusion coupée : les viewers voient « Hors ligne ».', 'live');
});

$('cast-copy').addEventListener('click', async () => {
  const link = $('cast-link').value;
  try {
    await navigator.clipboard.writeText(link);
  } catch (e) {
    $('cast-link').select();
    document.execCommand('copy');
  }
  status($('cast-status-text'), 'Lien copié ✓', 'live');
});

$('cast-renew').addEventListener('click', async () => {
  if (!window.confirm('Créer un nouveau lien ? L’ancien lien ne fonctionnera plus : il faudra partager le nouveau.')) return;
  await showCastLink(true);
  status($('cast-status-text'), 'Nouveau lien créé. Pensez à le partager.', 'live');
});

syncCast();
showCastLink();
window.addEventListener('storage', (e) => { if (e.key === STORAGE.castKey) showCastLink(); });

// ---------- Rubriques repliables ----------

const FOLD_KEY = 'portes.admin.open';
const folds = [...document.querySelectorAll('details.fold')];
let openFolds = [];
try { openFolds = JSON.parse(sessionStorage.getItem(FOLD_KEY) || '[]'); } catch (e) { /* ignore */ }
folds.forEach((d, i) => {
  const id = d.id || `fold-${i}`;
  if (openFolds.includes(id)) d.open = true;
  d.addEventListener('toggle', () => {
    openFolds = folds.filter((f) => f.open).map((f, k) => f.id || `fold-${folds.indexOf(f)}`);
    try { sessionStorage.setItem(FOLD_KEY, JSON.stringify(openFolds)); } catch (e) { /* ignore */ }
  });
});
// Lien direct vers une rubrique (admin.html#tiktok…) : elle s'ouvre.
function openFromHash() {
  const target = location.hash && document.getElementById(location.hash.slice(1));
  const fold = target && target.closest('details.fold');
  if (fold) {
    fold.open = true;
    setTimeout(() => fold.scrollIntoView({ block: 'start' }), 50);
  }
}
openFromHash();
window.addEventListener('hashchange', openFromHash);
$('fold-all').addEventListener('click', () => folds.forEach((d) => { d.open = false; }));

// ---------- Messages de l'univers ----------

let univGrimoire = [];
async function renderUniv() {
  if (!univGrimoire.length) univGrimoire = await grimoireMessages();
  const edits = loadEdits();
  const deck = buildDeck(univGrimoire, edits);
  const q = $('univ-search').value.trim().toLowerCase();
  const shown = q ? deck.filter((m) => m.text.toLowerCase().includes(q)) : deck;
  $('univ-count').textContent = `${deck.length} message${deck.length > 1 ? 's' : ''}`;
  $('univ-list').innerHTML = shown.length
    ? shown.map((m) => `<li><p>${esc(m.text)}</p><div class="row"><span class="src">${m.source === 'added' ? 'Ajouté' : 'Grimoire'}</span>
        <span class="univ-actions"><button class="btn btn-ghost" data-univ-edit="${m.id}" type="button">Modifier</button>
        <button class="btn btn-ghost" data-univ-del="${m.id}" type="button">Supprimer</button></span></div></li>`).join('')
    : '<li class="empty">Aucun message.</li>';
}
$('univ-search').addEventListener('input', renderUniv);
// Modifier un message : on retire l'ancien et on garde le nouveau texte.
function replaceMessage(id, text) {
  const edits = loadEdits();
  const i = edits.added.findIndex((t) => messageId(t.trim()) === id);
  if (i >= 0) edits.added[i] = text;
  else {
    edits.removed.push(id);
    edits.added.unshift(text);
  }
  edits.removed = edits.removed.filter((r) => r !== messageId(text));
  saveEdits(edits);
}
$('univ-list').addEventListener('click', (e) => {
  const ed = e.target.closest('[data-univ-edit]');
  if (ed) {
    const li = ed.closest('li');
    const p = li.querySelector('p');
    li.innerHTML = `<textarea rows="5" data-univ-text>${esc(p.textContent)}</textarea>
      <div class="row"><span></span><span class="univ-actions"><button class="btn btn-ghost" data-univ-cancel type="button">Annuler</button>
      <button class="btn btn-primary" data-univ-save="${ed.dataset.univEdit}" type="button">Enregistrer</button></span></div>`;
    li.querySelector('textarea').focus();
    return;
  }
  if (e.target.closest('[data-univ-cancel]')) { renderUniv(); return; }
  const sv = e.target.closest('[data-univ-save]');
  if (sv) {
    const text = sv.closest('li').querySelector('[data-univ-text]').value.trim();
    if (!text) { status($('univ-status'), 'Le message est vide.'); return; }
    replaceMessage(sv.dataset.univSave, text);
    renderUniv();
    status($('univ-status'), '✓ Message modifié.', 'live');
    return;
  }
  const b = e.target.closest('[data-univ-del]');
  if (!b) return;
  if (!window.confirm('Supprimer définitivement ce message du deck ?')) return;
  const edits = loadEdits();
  const id = b.dataset.univDel;
  const added = edits.added.filter((t) => messageId(t.trim()) !== id);
  if (added.length === edits.added.length) edits.removed.push(id);
  edits.added = added;
  saveEdits(edits);
  renderUniv();
  status($('univ-status'), 'Message supprimé.', 'live');
});
$('univ-add').addEventListener('click', () => {
  const text = $('univ-new').value.trim();
  if (!text) { status($('univ-status'), 'Écrivez d’abord le message.'); return; }
  const edits = loadEdits();
  edits.removed = edits.removed.filter((id) => id !== messageId(text));
  edits.added.unshift(text);
  saveEdits(edits);
  $('univ-new').value = '';
  $('univ-search').value = '';
  renderUniv();
  status($('univ-status'), '✓ Message ajouté au deck.', 'live');
});
$('univ-restore').addEventListener('click', () => {
  const edits = loadEdits();
  if (!edits.removed.length) { status($('univ-status'), 'Aucun message supprimé.'); return; }
  if (!window.confirm(`Rétablir ${edits.removed.length} message(s) supprimé(s) ?`)) return;
  edits.removed = [];
  saveEdits(edits);
  renderUniv();
  status($('univ-status'), '✓ Messages rétablis.', 'live');
});
renderUniv();

// ---------- Paliers de likes par personne ----------

function readTiers() {
  try {
    const t = JSON.parse(localStorage.getItem(STORAGE.likeTiers) || 'null');
    if (Array.isArray(t)) return t;
  } catch (e) { /* ignore */ }
  return [{ likes: 10000, anim: true, list: true }];
}
function tierRow(t) {
  return `<div class="tier-row">
    <label class="check">Palier <input type="number" min="1" step="1" inputmode="numeric" value="${Number(t.likes) || ''}" data-tier="likes"> likes</label>
    <label class="check"><input type="checkbox" data-tier="anim"${t.anim ? ' checked' : ''}> Animation de victoire</label>
    <label class="check"><input type="checkbox" data-tier="list"${t.list ? ' checked' : ''}> Ajout à la liste</label>
    <button class="x-btn" data-tier-del type="button" aria-label="Retirer ce palier">✕</button>
  </div>`;
}
function renderTiers(list = readTiers()) {
  $('tier-rows').innerHTML = list.length ? list.map(tierRow).join('') : '<p class="hint">Aucun palier.</p>';
}
function collectTiers() {
  return [...$('tier-rows').querySelectorAll('.tier-row')].map((row) => ({
    likes: Math.round(Number(row.querySelector('[data-tier="likes"]').value) || 0),
    anim: row.querySelector('[data-tier="anim"]').checked,
    list: row.querySelector('[data-tier="list"]').checked,
  }));
}
$('tier-rows').addEventListener('click', (e) => {
  if (!e.target.closest('[data-tier-del]')) return;
  e.target.closest('.tier-row').remove();
});
$('tier-add').addEventListener('click', () => {
  const list = collectTiers();
  const last = list.length ? Math.max(...list.map((t) => t.likes)) : 0;
  list.push({ likes: last ? last * 2 : 10000, anim: true, list: false });
  renderTiers(list);
});
$('tier-save').addEventListener('click', () => {
  const list = collectTiers().filter((t) => t.likes > 0).sort((a, b) => a.likes - b.likes);
  localStorage.setItem(STORAGE.likeTiers, JSON.stringify(list));
  renderTiers(list);
  status($('tier-status'), '✓ Paliers enregistrés.', 'live');
});
renderTiers();

// ---------- Radio : ma playlist ----------

function syncMusicToggle() {
  const on = loadFlag(STORAGE.radioGrimoire, true);
  $('music-grimoire').setAttribute('aria-pressed', String(on));
  $('music-grimoire').querySelector('.state').textContent = on ? 'Oui' : 'Non';
}
function renderMusic() {
  const list = loadMyTracks();
  $('music-list').innerHTML = list.length
    ? list.map((t, i) => `<li data-music="${esc(t.id)}"><span class="kind" aria-hidden="true">${t.kind === 'file' ? '🎵' : '🔗'}</span>
        <input type="text" value="${esc(t.title)}" aria-label="Titre" data-music-title>
        <button class="x-btn" data-music-up type="button" aria-label="Monter"${i ? '' : ' disabled'}>↑</button>
        <button class="x-btn" data-music-del type="button" aria-label="Retirer">✕</button></li>`).join('')
    : '<li class="empty">Aucune musique ajoutée.</li>';
}
function musicChanged(text) {
  renderMusic();
  status($('music-status'), text, 'live');
}
$('music-file').addEventListener('change', async (e) => {
  const files = [...(e.target.files || [])];
  e.target.value = '';
  for (const f of files) {
    status($('music-status'), `Enregistrement de « ${f.name} »…`);
    try {
      await addFileTrack(f);
    } catch (err) {
      status($('music-status'), 'Impossible d’enregistrer ce fichier sur cet appareil (mémoire pleine ?).');
      return;
    }
  }
  if (files.length) musicChanged(`✓ ${files.length} musique${files.length > 1 ? 's' : ''} ajoutée${files.length > 1 ? 's' : ''}.`);
});
$('music-add-url').addEventListener('click', () => {
  const t = addUrlTrack($('music-url').value);
  if (!t) { status($('music-status'), 'Lien non reconnu : collez un lien Suno (suno.com/song/…) ou l’adresse d’un fichier MP3.'); return; }
  $('music-url').value = '';
  musicChanged('✓ Lien ajouté.');
});
$('music-list').addEventListener('click', async (e) => {
  const li = e.target.closest('[data-music]');
  if (!li) return;
  const id = li.dataset.music;
  if (e.target.closest('[data-music-del]')) {
    if (!window.confirm('Retirer cette musique de la playlist ?')) return;
    await removeTrack(id);
    musicChanged('Musique retirée.');
  } else if (e.target.closest('[data-music-up]')) {
    moveTrack(id, -1);
    musicChanged('Ordre modifié.');
  }
});
$('music-list').addEventListener('change', (e) => {
  const input = e.target.closest('[data-music-title]');
  if (!input) return;
  renameTrack(input.closest('[data-music]').dataset.music, input.value);
  status($('music-status'), '✓ Titre enregistré.', 'live');
});
$('music-grimoire').addEventListener('click', () => {
  saveFlag(STORAGE.radioGrimoire, !loadFlag(STORAGE.radioGrimoire, true));
  syncMusicToggle();
});
syncMusicToggle();
renderMusic();

// ---------- Présentation des cases (écran de veille ⭐) ----------

function tourRow(st, i, n) {
  const t = TOUR_TARGETS[st.key];
  return `<div class="tour-row" data-key="${st.key}">
    <div class="tour-row-head">
      <label class="check"><input type="checkbox" data-t="on"${st.on ? ' checked' : ''}> <strong>${esc(t.label)}</strong></label>
      <span class="tour-move">
        <button class="x-btn" data-t-move="-1" type="button" aria-label="Monter"${i ? '' : ' disabled'}>↑</button>
        <button class="x-btn" data-t-move="1" type="button" aria-label="Descendre"${i < n - 1 ? '' : ' disabled'}>↓</button>
      </span>
    </div>
    <label class="field"><span>Titre de la bulle</span><input type="text" data-t="title" value="${esc(st.title || '')}"></label>
    <label class="field"><span>Texte de la bulle</span><textarea rows="3" data-t="text">${esc(st.text || '')}</textarea></label>
    <div class="tour-row-opts">
      <label class="field tour-pose"><span>Pose de l’étoile</span><span class="pose-row"><img class="pose-preview" src="${starImage(STAR_POSES.some(([k]) => k === st.pose) ? st.pose : 'regard-droite')}" alt="">
        <select data-t="pose"><option value="auto"${STAR_POSES.some(([k]) => k === st.pose) ? '' : ' selected'}>Regarde la case (automatique)</option>${STAR_POSES.map(([v, l]) => `<option value="${v}"${v === st.pose ? ' selected' : ''}>${l}</option>`).join('')}</select></span></label>
      <label class="field"><span>Position de l’étoile</span><select data-t="side">${TOUR_SIDES.map(([v, l]) => `<option value="${v}"${v === st.side ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Durée (secondes)</span><input type="number" min="3" max="120" data-t="seconds" value="${Number(st.seconds) || 9}"></label>
    </div>
  </div>`;
}
function renderTourRows(list = loadTour()) {
  // Les cases absentes de la liste enregistrée sont proposées à la fin (désactivées).
  const keys = list.map((s) => s.key);
  Object.keys(TOUR_TARGETS).forEach((k) => {
    if (!keys.includes(k)) list.push({ key: k, on: false, title: TOUR_TARGETS[k].title, text: TOUR_TARGETS[k].text, side: 'auto', seconds: 9 });
  });
  $('tour-rows').innerHTML = list.map((s, i) => tourRow(s, i, list.length)).join('');
}
function collectTour() {
  return [...$('tour-rows').querySelectorAll('.tour-row')].map((row) => ({
    key: row.dataset.key,
    on: row.querySelector('[data-t="on"]').checked,
    title: row.querySelector('[data-t="title"]').value.trim(),
    text: row.querySelector('[data-t="text"]').value.trim(),
    side: row.querySelector('[data-t="side"]').value,
    pose: row.querySelector('[data-t="pose"]').value,
    seconds: Math.min(120, Math.max(3, Number(row.querySelector('[data-t="seconds"]').value) || 9)),
  }));
}
$('tour-rows').addEventListener('click', (e) => {
  const b = e.target.closest('[data-t-move]');
  if (!b) return;
  const list = collectTour();
  const i = list.findIndex((s) => s.key === b.closest('.tour-row').dataset.key);
  const j = i + Number(b.dataset.tMove);
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  renderTourRows(list);
});
$('tour-rows').addEventListener('change', (e) => {
  const sel = e.target.closest('[data-t="pose"]');
  if (sel) sel.closest('.pose-row').querySelector('.pose-preview').src = starImage(sel.value === 'auto' ? 'regard-droite' : sel.value);
});
$('tour-save').addEventListener('click', () => {
  saveTour(collectTour());
  status($('tour-status'), '✓ Présentation enregistrée.', 'live');
});
$('tour-reset').addEventListener('click', () => {
  if (!window.confirm('Remettre les textes, positions et durées par défaut ?')) return;
  const d = defaultTour();
  saveTour(d);
  renderTourRows(d);
  status($('tour-status'), 'Présentation remise par défaut.', 'live');
});
renderTourRows();
