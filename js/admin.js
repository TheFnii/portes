// Page des réglages : connexion TikTok, messages défilants, affichage et son.

import { STORAGE } from './config.js';
import { load, save, loadFlag, saveFlag } from './prefs.js';
import { loadMessages, loadFileMessages, saveLocalMessages, clearLocalMessages } from './messages.js';
import { Ticker } from './ticker.js';
import { TikTokLive } from './tiktok.js';

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
