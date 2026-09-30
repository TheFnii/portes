// Page des réglages : connexion TikTok, messages défilants, affichage et son.

import { STORAGE } from './config.js';
import { load, save, loadFlag, saveFlag } from './prefs.js';
import { loadMessages, loadFileMessages, saveLocalMessages, clearLocalMessages } from './messages.js';
import { Ticker } from './ticker.js';
import { TikTokLive } from './tiktok.js';
import { ROLES, DEFAULT_GIFT_NAMES } from './gifts.js';
import { FEATURES, loadFeatures, saveFeatures, loadGiftConfig, saveGiftConfig, loadGiftLog } from './features.js';

const $ = (id) => document.getElementById(id);

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

// ---------- Messages défilants ----------

const preview = new Ticker($('preview'), $('preview-track'));
preview.setEnabled(true);

function currentLines() {
  return $('msg-text').value.split('\n').map((l) => l.trim()).filter(Boolean);
}

function showPreview() {
  const speed = Number($('msg-speed').value);
  $('msg-speed-out').textContent = speed;
  preview.setData(currentLines(), speed);
}

function fill({ messages, speed }) {
  $('msg-text').value = messages.join('\n');
  $('msg-speed').value = speed;
  showPreview();
}

let previewTimer;
$('msg-text').addEventListener('input', () => {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(showPreview, 400);
});
$('msg-speed').addEventListener('input', showPreview);

$('msg-save').addEventListener('click', () => {
  const lines = currentLines();
  if (!lines.length) {
    status($('msg-status'), 'Ajoutez au moins un message.', 'error');
    return;
  }
  saveLocalMessages(lines, Number($('msg-speed').value));
  status($('msg-status'), `✓ ${lines.length} message${lines.length > 1 ? 's' : ''} enregistré${lines.length > 1 ? 's' : ''} sur cet appareil.`, 'live');
});

$('msg-reset').addEventListener('click', async () => {
  clearLocalMessages();
  try {
    fill(await loadFileMessages());
    status($('msg-status'), 'Messages du fichier messages.json (GitHub) rétablis.', 'live');
  } catch (e) {
    status($('msg-status'), 'Le fichier messages.json est illisible.', 'error');
  }
});

loadMessages().then((data) => {
  fill(data);
  if (data.error) status($('msg-status'), 'Le fichier messages.json contient une erreur.', 'error');
  else status($('msg-status'), data.source === 'local'
    ? 'Messages actuels : ceux enregistrés sur cet appareil.'
    : 'Messages actuels : ceux du fichier messages.json (GitHub).');
});

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

const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
  if (!window.confirm('Vider la liste des personnes, les Donuts, les likes et le message épinglé ?')) return;
  [STORAGE.queue, STORAGE.likes, STORAGE.pinned].forEach((k) => save(k, null));
  status($('reset-status'), '✓ Tout est vidé. Bon live !', 'live');
});
