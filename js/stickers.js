// Autocollants : vos propres images (autocollants de l'iPad, logos…) utilisées comme des emojis
// dans les textes de l'app. Dans un texte, un autocollant s'écrit :st-<id>: ; l'image est gardée
// sur l'appareil et envoyée aux viewers.

import { STORAGE } from './config.js';
import { esc } from './shell.js';

const TOKEN = /:st-([a-z0-9]{4,24}):/g;
const received = {}; // autocollants reçus de la tablette (page des viewers)

export function loadStickers() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE.stickers) || '{}');
    return s && typeof s === 'object' ? s : {};
  } catch (e) {
    return {};
  }
}

function saveStickers(map) {
  localStorage.setItem(STORAGE.stickers, JSON.stringify(map));
}

export function stickerUrl(id) {
  return received[id] || loadStickers()[id] || null;
}

export function setReceivedSticker(id, url) {
  if (url) received[id] = url;
  else delete received[id];
}

export function removeSticker(id) {
  const map = loadStickers();
  delete map[id];
  saveStickers(map);
}

// Texte → HTML : le texte est protégé, les autocollants deviennent des images.
export function rich(text) {
  return esc(String(text ?? '')).replace(TOKEN, (m, id) => {
    const url = stickerUrl(id);
    return url ? `<img class="sticker" src="${esc(url)}" data-st="${id}" alt="">` : '';
  });
}

function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// Une image (autocollant collé, fichier, image du presse-papiers) devient un autocollant léger.
export async function addSticker(src) {
  const img = await new Promise((ok, ko) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ko(new Error('Image illisible'));
    i.src = src;
  });
  const side = 160;
  const scale = Math.min(1, side / Math.max(img.naturalWidth || side, img.naturalHeight || side));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round((img.naturalWidth || side) * scale));
  c.height = Math.max(1, Math.round((img.naturalHeight || side) * scale));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  let data = c.toDataURL('image/webp', 0.9);
  if (!data.startsWith('data:image/webp')) data = c.toDataURL('image/png');
  const id = hash(data).slice(0, 10);
  const map = loadStickers();
  map[id] = data;
  saveStickers(map);
  return id;
}

export function fileToDataUrl(file) {
  return new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = () => ko(r.error);
    r.readAsDataURL(file);
  });
}

// ---------- Champs de texte avec autocollants (page Réglages) ----------
// Le champ d'origine (textarea / input) reste caché et garde la valeur ; on écrit dans une
// zone éditable où les autocollants de l'iPad (ou une image collée) s'insèrent comme des emojis.

function serialize(root) {
  let out = '';
  const walk = (node, first) => {
    node.childNodes.forEach((n, i) => {
      if (n.nodeType === 3) out += n.nodeValue.replace(/ /g, ' ');
      else if (n.nodeName === 'BR') out += '\n';
      else if (n.nodeName === 'IMG') { if (n.dataset.st) out += `:st-${n.dataset.st}:`; }
      else if (n.nodeType === 1) {
        const block = /^(DIV|P)$/.test(n.nodeName);
        if (block && (i > 0 || !first) && !out.endsWith('\n')) out += '\n';
        walk(n, false);
      }
    });
  };
  walk(root, true);
  return out.replace(/\n$/, '');
}

let lastRange = null;
let lastEditor = null;
document.addEventListener('selectionchange', () => {
  const sel = document.getSelection();
  if (!sel || !sel.rangeCount) return;
  const ed = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)?.closest('.rich-input');
  if (ed) { lastRange = sel.getRangeAt(0).cloneRange(); lastEditor = ed; }
});

function insertAtCaret(editor, node) {
  editor.focus();
  const sel = document.getSelection();
  let range = lastEditor === editor && lastRange ? lastRange : null;
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
  }
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function stickerImg(id) {
  const img = document.createElement('img');
  img.className = 'sticker';
  img.dataset.st = id;
  img.src = stickerUrl(id) || '';
  img.alt = '';
  return img;
}

export function makeRich(field) {
  if (field.dataset.richDone) return;
  field.dataset.richDone = '1';
  const single = field.tagName === 'INPUT';
  const ed = document.createElement('div');
  ed.className = `rich-input${single ? ' single' : ''}`;
  ed.contentEditable = 'true';
  ed.spellcheck = true;
  if (field.placeholder) ed.dataset.placeholder = field.placeholder;
  if (field.getAttribute('aria-label')) ed.setAttribute('aria-label', field.getAttribute('aria-label'));
  const wrap = document.createElement('div');
  wrap.className = 'rich-wrap';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rich-sticker-btn';
  btn.title = 'Insérer un autocollant';
  btn.setAttribute('aria-label', 'Insérer un autocollant');
  btn.textContent = '✦';
  field.after(wrap);
  wrap.append(ed, btn);
  field.hidden = true;

  // La valeur posée par le code (chargement, « par défaut »…) s'affiche aussi dans la zone.
  const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value');
  const show = (v) => { ed.innerHTML = rich(v).replace(/\n/g, '<br>'); };
  Object.defineProperty(field, 'value', {
    get() { return desc.get.call(field); },
    set(v) { desc.set.call(field, v); show(v); },
  });
  show(field.value);

  const sync = () => {
    let v = serialize(ed);
    if (single) v = v.replace(/\n+/g, ' ');
    desc.set.call(field, v);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };
  // Image insérée (autocollant de l'iPad, glisser-déposer…) : elle devient un autocollant.
  const adopt = async () => {
    const imgs = [...ed.querySelectorAll('img:not([data-st])')];
    for (const img of imgs) {
      try {
        const id = await addSticker(img.src);
        img.dataset.st = id;
        img.className = 'sticker';
        img.src = stickerUrl(id);
      } catch (e) {
        img.remove();
      }
    }
    if (imgs.length) document.dispatchEvent(new CustomEvent('stickers-changed'));
    sync();
  };
  ed.addEventListener('input', () => {
    if (ed.querySelector('img:not([data-st])')) adopt();
    else sync();
  });
  ed.addEventListener('keydown', (e) => { if (single && e.key === 'Enter') e.preventDefault(); });
  ed.addEventListener('paste', async (e) => {
    const items = [...(e.clipboardData?.items || [])];
    const file = items.find((it) => it.kind === 'file' && it.type.startsWith('image/'));
    e.preventDefault();
    if (file) {
      const id = await addSticker(await fileToDataUrl(file.getAsFile()));
      insertAtCaret(ed, stickerImg(id));
      document.dispatchEvent(new CustomEvent('stickers-changed'));
      sync();
      return;
    }
    const text = e.clipboardData?.getData('text/plain') || '';
    if (text) {
      insertAtCaret(ed, document.createTextNode(single ? text.replace(/\s*\n\s*/g, ' ') : text));
      sync();
    } else {
      // Contenu riche sans texte (autocollant) : on laisse le navigateur l'insérer, puis on l'adopte.
      const html = e.clipboardData?.getData('text/html') || '';
      const m = html.match(/<img[^>]+src="([^"]+)"/i);
      if (m) {
        const id = await addSticker(m[1]);
        insertAtCaret(ed, stickerImg(id));
        document.dispatchEvent(new CustomEvent('stickers-changed'));
        sync();
      }
    }
  });
  btn.addEventListener('click', () => openPicker(ed));
}

// ---------- Choix d'un autocollant déjà enregistré (ou ajout depuis une image) ----------

let picker = null;
function openPicker(editor) {
  if (!picker) {
    picker = document.createElement('div');
    picker.className = 'sticker-picker';
    picker.innerHTML = `<div class="sp-card" role="dialog" aria-label="Autocollants">
      <header><strong>Mes autocollants</strong><button type="button" class="x-btn" data-sp-close aria-label="Fermer">✕</button></header>
      <div class="sp-grid"></div>
      <label class="btn btn-primary sp-add">＋ Ajouter une image<input type="file" accept="image/*" hidden></label>
      <p class="hint">Astuce iPad : dans un champ de texte, ouvrez le clavier emoji puis vos autocollants : ils s’insèrent directement.</p>
    </div>`;
    document.body.appendChild(picker);
    picker.addEventListener('click', (e) => {
      if (e.target === picker || e.target.closest('[data-sp-close]')) { picker.hidden = true; return; }
      const del = e.target.closest('[data-sp-del]');
      if (del) {
        if (window.confirm('Supprimer cet autocollant ? Il disparaîtra des textes qui l’utilisent.')) {
          removeSticker(del.dataset.spDel);
          document.dispatchEvent(new CustomEvent('stickers-changed'));
          fillPicker();
        }
        return;
      }
      const b = e.target.closest('[data-sp]');
      if (!b) return;
      picker.hidden = true;
      insertAtCaret(picker.editor, stickerImg(b.dataset.sp));
      picker.editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    picker.querySelector('input[type=file]').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      await addSticker(await fileToDataUrl(f));
      document.dispatchEvent(new CustomEvent('stickers-changed'));
      fillPicker();
    });
  }
  picker.editor = editor;
  fillPicker();
  picker.hidden = false;
}

function fillPicker() {
  const map = loadStickers();
  const ids = Object.keys(map);
  picker.querySelector('.sp-grid').innerHTML = ids.length
    ? ids.map((id) => `<span class="sp-item"><button type="button" data-sp="${id}"><img src="${map[id]}" alt=""></button><button type="button" class="sp-del" data-sp-del="${id}" aria-label="Supprimer">✕</button></span>`).join('')
    : '<p class="hint">Aucun autocollant pour l’instant.</p>';
}
