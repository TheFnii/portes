// Polices de l'application (Réglages → Personnalisation → Polices) : une pour les textes,
// une pour les titres, et une à part pour la bulle de l'étoile (qui doit être très lisible).
// Les polices en ligne viennent de Google Fonts et ne sont chargées que si elles sont choisies.

export const FONTS = {
  cormorant: { label: 'Cormorant Garamond (élégante)', css: "'Cormorant Garamond', Georgia, serif" },
  cinzel: { label: 'Cinzel (majuscules gravées)', css: "'Cinzel', serif" },
  ebgaramond: { label: 'EB Garamond (classique)', css: "'EB Garamond', Georgia, serif", google: 'EB+Garamond:ital,wght@0,400;0,500;0,700;1,400' },
  lora: { label: 'Lora (classique, très lisible)', css: "'Lora', Georgia, serif", google: 'Lora:ital,wght@0,400;0,500;0,700;1,400' },
  merriweather: { label: 'Merriweather (lisible sur écran)', css: "'Merriweather', Georgia, serif", google: 'Merriweather:ital,wght@0,400;0,700;1,400' },
  playfair: { label: 'Playfair Display (chic)', css: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:ital,wght@0,400;0,500;0,700;1,400' },
  georgia: { label: 'Georgia (classique, sans téléchargement)', css: "Georgia, 'Times New Roman', serif" },
  nunito: { label: 'Nunito (arrondie, douce)', css: "'Nunito', 'Segoe UI', sans-serif", google: 'Nunito:ital,wght@0,400;0,600;0,700;1,400' },
  atkinson: { label: 'Atkinson Hyperlegible (ultra lisible)', css: "'Atkinson Hyperlegible', Verdana, sans-serif", google: 'Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400' },
  system: { label: 'Police du système (Helvetica / Arial)', css: "-apple-system, 'Helvetica Neue', Arial, sans-serif" },
};

export const FONT_OPTIONS = Object.entries(FONTS).map(([k, f]) => [k, f.label]);

const loaded = new Set();
function load(key) {
  const f = FONTS[key];
  if (!f || !f.google || loaded.has(key)) return;
  loaded.add(key);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`;
  document.head.appendChild(link);
}

export function applyFonts(s) {
  const root = document.documentElement.style;
  const pick = (key, def) => (FONTS[key] ? key : def);
  const text = pick(s.fontText, 'cormorant');
  const title = pick(s.fontTitle, 'cinzel');
  const star = s.fontStar === 'same' ? text : pick(s.fontStar, 'lora');
  [text, title, star].forEach(load);
  root.setProperty('--font-text', FONTS[text].css);
  root.setProperty('--font-title', FONTS[title].css);
  root.setProperty('--font-star', FONTS[star].css);
}
