// Thème de l'interface (Réglages → Personnalisation → Thème et couleurs) : un thème choisi, ou
// un thème qui suit le moment de la journée. On peut aussi imposer la couleur des ornements
// (accent) et celle des cases, puis la taille et la couleur de chaque texte.
// Tout passe par des variables CSS posées sur la page (tablette, Réglages et viewers).

export const THEMES = {
  nuit: { label: 'Nuit étoilée (violet et or)', accent: '#e8c77a', panel: '#28123e', veil: '#0a0412' },
  aube: { label: 'Aube (rose poudré)', accent: '#f4b9a6', panel: '#3e1838', veil: '#1a0716' },
  jour: { label: 'Jour (bleu ciel et or)', accent: '#f2d27a', panel: '#13304d', veil: '#06141f' },
  crepuscule: { label: 'Crépuscule (orangé)', accent: '#ffa76b', panel: '#45142a', veil: '#1b0610' },
  foret: { label: 'Forêt (vert et or)', accent: '#c3e07f', panel: '#12351f', veil: '#04120a' },
  ocean: { label: 'Océan (bleu profond)', accent: '#86dbe9', panel: '#0e2c47', veil: '#030d18' },
  rose: { label: 'Rose (framboise)', accent: '#f7a6c8', panel: '#3a1236', veil: '#14040f' },
};

// Moments de la journée du thème automatique (heure de la tablette).
export const DAY_PARTS = [
  { from: 6, theme: 'aube' },
  { from: 10, theme: 'jour' },
  { from: 17, theme: 'crepuscule' },
  { from: 21, theme: 'nuit' },
];

export const THEME_OPTIONS = [
  ['auto', 'Selon l’heure (aube 6 h, jour 10 h, crépuscule 17 h, nuit 21 h)'],
  ...Object.entries(THEMES).map(([k, t]) => [k, t.label]),
];

// Les textes réglables un par un (taille + couleur).
export const TEXT_AREAS = [
  { key: 'Title', label: 'Titres des cases', size: true },
  { key: 'Pinned', label: 'Message épinglé', size: true },
  { key: 'Board', label: 'Case centrale', size: true },
  { key: 'Ticker', label: 'Bandeau déroulant', size: true },
  { key: 'List', label: 'Liste à traiter', size: true },
  { key: 'Tops', label: 'Tops et messages de l’univers', size: true },
  { key: 'Letter', label: 'Lettre de l’univers', size: true },
  { key: 'Anim', label: 'Animations des cadeaux', size: true },
  { key: 'Game', label: 'Jeu des Portes (titre et sous-titre)', size: true },
  { key: 'End', label: 'Message de fin de live', size: true },
  { key: 'Star', label: 'Bulle de l’étoile (la taille se règle dans « Présentation »)', size: false },
  { key: 'Text', label: 'Autres textes', size: false },
];

export function themeAt(date = new Date()) {
  const h = date.getHours();
  let key = DAY_PARTS[DAY_PARTS.length - 1].theme; // avant l'aube : encore la nuit
  DAY_PARTS.forEach((p) => { if (h >= p.from) key = p.theme; });
  return key;
}

export function currentTheme(s, date) {
  if (THEMES[s.theme]) return s.theme;
  return s.theme === 'auto' ? themeAt(date) : 'nuit';
}

function rgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (c, to, k) => c.map((v, i) => Math.round(v + (to[i] - v) * k));
const list = (c) => c.join(', ');
const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

// key : thème imposé (les viewers suivent le thème décidé par la tablette).
export function applyTheme(s, key = currentTheme(s)) {
  const t = THEMES[key] || THEMES.nuit;
  const root = document.documentElement;
  const st = root.style;
  const accent = rgb(s.accentColor) || rgb(t.accent);
  const panel = rgb(s.panelColor) || rgb(t.panel);
  const veil = rgb(t.veil);
  const black = [0, 0, 0];
  const white = [255, 255, 255];
  const light = mix(accent, white, 0.45);
  st.setProperty('--accent-rgb', list(accent));
  st.setProperty('--accent-light-rgb', list(light));
  st.setProperty('--gold', hex(accent));
  st.setProperty('--gold-light', hex(light));
  st.setProperty('--gold-deep', hex(mix(accent, black, 0.3)));
  st.setProperty('--panel-a', `rgba(${list(panel)}, .88)`);
  st.setProperty('--panel-b', `rgba(${list(mix(panel, black, 0.7))}, .9)`);
  st.setProperty('--panel-solid-a', hex(mix(panel, black, 0.3)));
  st.setProperty('--panel-solid-b', hex(mix(panel, black, 0.58)));
  st.setProperty('--btn-a', `rgba(${list(mix(panel, white, 0.12))}, .88)`);
  st.setProperty('--btn-b', `rgba(${list(mix(panel, black, 0.4))}, .9)`);
  st.setProperty('--veil-rgb', list(veil));
  st.setProperty('--veil-deep-rgb', list(mix(veil, black, 0.5)));
  root.dataset.theme = key;

  TEXT_AREAS.forEach(({ key: k, size }) => {
    const name = k.toLowerCase();
    if (size) st.setProperty(`--fs-${name}`, ((Number(s[`size${k}`]) || 100) / 100).toFixed(2));
    const c = rgb(s[`color${k}`]);
    if (c) st.setProperty(`--c-${name}`, hex(c));
    else st.removeProperty(`--c-${name}`);
  });
  const ink = rgb(s.colorText);
  if (ink) st.setProperty('--ink', hex(ink));
  else st.removeProperty('--ink');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = hex(mix(veil, black, 0.3));
  return key;
}
