// Préférences enregistrées dans le navigateur de la tablette.

export function load(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

export function save(key, value) {
  try {
    if (value === null || value === undefined || value === '') localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) { /* stockage indisponible (navigation privée) */ }
}

export function loadFlag(key, fallback) {
  const v = load(key);
  return v === null ? fallback : v === 'on';
}

export function saveFlag(key, on) {
  save(key, on ? 'on' : 'off');
}
