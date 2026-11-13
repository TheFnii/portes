// Bocal de likes : chaque personne remplit son bocal avec ses likes. L'objectif (ex. 3 000
// likes) se règle dans les Réglages et n'est jamais affiché : les viewers voient seulement la
// jauge (un petit cœur qui avance) ou le bocal qui se remplit. Bocal plein → victoire, une
// question gratuite en priorité, et le bocal repart de zéro (on peut le remplir encore).

export const DEFAULT_JAR_GOAL = 3000;

export const jarGoal = (s = {}) => Math.max(1, Math.round(Number(s.jarGoal) || DEFAULT_JAR_GOAL));

// value : likes de la personne → { p : remplissage du bocal en cours (0 → 1), n : bocaux remplis }
export function jarOf(value, goal) {
  const v = Math.max(0, Number(value) || 0);
  const g = Math.max(1, Number(goal) || DEFAULT_JAR_GOAL);
  const n = Math.floor(v / g);
  return { p: (v - n * g) / g, n };
}

// Nombre de bocaux remplis entre deux valeurs (0 si aucun).
export function jarsFilled(before, after, goal) {
  return Math.max(0, jarOf(after, goal).n - jarOf(before, goal).n);
}

// Jauge sous un pseudo : une barre qui se remplit, avec un petit cœur au bout.
export function gauge(value, goal) {
  const { p, n } = jarOf(value, goal);
  return `<span class="gauge" style="--p:${p.toFixed(3)}" role="img" aria-label="Bocal rempli à ${Math.round(p * 100)} %">`
    + '<span class="gauge-fill"></span><span class="gauge-heart" aria-hidden="true">❤</span></span>'
    + (n > 0 ? `<span class="gauge-jars" title="Bocaux remplis">🫙×${n}</span>` : '');
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Le bocal illustré, en calques : le verre, le liquide (dans la forme intérieure du bocal,
// jusqu'au goulot), les reflets du verre par-dessus, puis la ficelle et l'étiquette devant.
// Le bouchon attend à côté tant que le bocal est ouvert ; close() le pose dessus : explosion
// de cœurs, « Bravo… » et le bocal fermé et plein ; puis (reset) le bocal se vide.
const IMG = 'images/bocal/';
export const BRAVO = 'Bravo, question gratuite en priorité débloquée';

export class Jar {
  constructor(root) {
    this.root = root;
    root.classList.add('jar');
    root.innerHTML = `<div class="jar-body">
        <img class="jar-glass" src="${IMG}bocal.webp" alt="" draggable="false">
        <div class="jar-inside"><div class="jar-fill"><span></span><span></span><span></span><span></span><span></span></div></div>
        <img class="jar-shine" src="${IMG}bocal-reflets.webp" alt="" draggable="false">
        <img class="jar-front" src="${IMG}bocal-devant.webp" alt="" draggable="false">
        <img class="jar-sealed" src="${IMG}bocal-ferme-plein.webp" alt="" draggable="false">
        <img class="jar-cork" src="${IMG}bouchon.webp" alt="" draggable="false">
        <div class="jar-burst" aria-hidden="true"></div>
        <p class="jar-bravo" role="status"></p>
      </div>`;
    this.p = 0;
    this.closing = false;
  }

  set(p) {
    this.p = Math.min(1, Math.max(0, Number(p) || 0));
    if (!this.closing) this.root.style.setProperty('--fill', this.p.toFixed(3));
  }

  // Explosion de petits cœurs autour du bocal.
  burst(n = 28) {
    const colors = ['#ff4f8b', '#ff8fb1', '#ffd0da', '#ffd76a', '#ff2d6f'];
    this.root.querySelector('.jar-burst').innerHTML = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const d = 55 + Math.random() * 70;
      return `<span style="--dx:${(Math.cos(a) * d).toFixed(1)}%;--dy:${(Math.sin(a) * d).toFixed(1)}%;--s:${(0.7 + Math.random() * 0.9).toFixed(2)};--d:${Math.round(Math.random() * 180)}ms;color:${colors[i % colors.length]}">❤</span>`;
    }).join('');
  }

  // Bocal plein : il se remplit jusqu'en haut, le bouchon se pose, explosion de cœurs et
  // bocal fermé et plein ; puis (reset) il se vide et reprend le remplissage en cours.
  async close({ sound, reset = true, bravo = BRAVO, hold = 3400 } = {}) {
    if (this.closing) return;
    this.closing = true;
    this.root.style.setProperty('--fill', '1');
    await wait(900);
    this.root.classList.add('closed');
    await wait(950);
    this.root.querySelector('.jar-bravo').textContent = bravo || '';
    this.root.classList.toggle('has-bravo', !!bravo);
    this.burst();
    this.root.classList.add('sealed');
    if (sound) sound();
    await wait(hold);
    if (!reset) return;
    this.root.classList.remove('closed', 'sealed', 'has-bravo');
    await wait(600);
    this.closing = false;
    this.root.style.setProperty('--fill', this.p.toFixed(3));
  }
}
