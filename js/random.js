// Tirage vraiment aléatoire : générateur cryptographique du navigateur,
// avec rejet des valeurs qui introduiraient un biais (chaque face a exactement la même chance).

export function randomInt(min, max) {
  const range = max - min + 1;
  const limit = Math.floor(0x100000000 / range) * range;
  const buf = new Uint32Array(1);
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return min + (x % range);
}

// Petit générateur déterministe pour le décor (les portes gardent le même dessin à chaque chargement).
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
