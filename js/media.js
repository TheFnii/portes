// Images et sons déposés depuis la page Réglages. Ils sont gardés dans la tablette
// (IndexedDB) et passent avant les fichiers des dossiers images/ et sounds/.

const DB_NAME = 'portes-media';
const STORE = 'files';

let dbPromise = null;

function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB indisponible')); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

function run(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

// Blob enregistré sous cette clé, ou null.
export function getMedia(key) {
  return run('readonly', (s) => s.get(key)).then((v) => v || null).catch(() => null);
}

export function putMedia(key, blob) {
  return run('readwrite', (s) => s.put(blob, key));
}

export function deleteMedia(key) {
  return run('readwrite', (s) => s.delete(key));
}

// Réduit une image trop grande (les photos de téléphone pèsent plusieurs Mo).
// Garde la transparence (PNG) ; les GIF et SVG sont gardés tels quels.
export async function shrinkImage(file, maxSide) {
  if (/gif|svg/.test(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error('Image illisible'));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < 1.5e6) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob((b) => ok(b || file), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
