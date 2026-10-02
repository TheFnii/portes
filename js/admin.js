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
  [STORAGE.queue, STORAGE.likes, STORAGE.gifters, STORAGE.milestone, STORAGE.pinned].forEach((k) => save(k, null));
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
    ['img:animEnveloppeDos', 'Enveloppe : côté sceau', 'virevolte, puis se retourne', 1400],
    ['img:animEnveloppe', 'Enveloppe : côté destinataire', 'le pseudo est écrit dessus', 1400],
  ],
  'media-sounds': [
    ['snd:chat', 'Chat porte-bonheur', 'miaulement'],
    ['snd:galaxie', 'Galaxie', 'harpe'],
    ['snd:enveloppe', 'Enveloppe', 'papier froissé'],
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
