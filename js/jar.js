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

// Le bocal illustré : la couleur monte selon le remplissage, le bouchon attend à côté tant que
// le bocal est ouvert ; close() le pose dessus (animation), puis le bocal se vide.
export class Jar {
  constructor(root) {
    this.root = root;
    root.classList.add('jar');
    root.innerHTML = `<div class="jar-body">
        <div class="jar-inside"><div class="jar-fill"><span></span><span></span><span></span><span></span><span></span></div></div>
        <img class="jar-glass" src="images/bocal/bocal.webp" alt="" draggable="false">
        <img class="jar-cork" src="images/bocal/bouchon.webp" alt="" draggable="false">
      </div>`;
    this.p = 0;
    this.closing = false;
  }

  set(p) {
    this.p = Math.min(1, Math.max(0, Number(p) || 0));
    if (!this.closing) this.root.style.setProperty('--fill', this.p.toFixed(3));
  }

  // Bocal plein : on le remplit jusqu'en haut, le bouchon se pose, puis on le vide.
  async close({ sound, reset = true } = {}) {
    if (this.closing) return;
    this.closing = true;
    this.root.style.setProperty('--fill', '1');
    await wait(700);
    this.root.classList.add('closed');
    await wait(650);
    if (sound) sound();
    this.root.classList.add('won');
    await wait(2600);
    if (!reset) return;
    this.root.classList.remove('closed', 'won');
    await wait(500);
    this.closing = false;
    this.root.style.setProperty('--fill', this.p.toFixed(3));
  }
}
