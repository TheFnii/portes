// Les 12 portes : forme de l'arche, cadre, battants, couleurs et fleurs.
//
// shape   : round (plein cintre) · segment (arc surbaissé) · pointed (ogive) · ogee (arc mauresque) · flat
// frame   : stone · gilded · tile · redgold · gothic · wood · celestial
// panel   : panels · planks · carved · diamond · glass · stars · sun
// leaves  : 1 (un battant) ou 2 (double porte)
// medal   : gold · porcelain · tile · sun
// garland : fleurs le long du cadre (kinds = symboles de fleurs, avec leurs couleurs)
// base    : touffes de fleurs au pied de la porte

const ROSE_LEAVES = ['#2e5a2b', '#3c6f35', '#23471f', '#4b7d3a'];

export const DOORS = [
  {
    n: 1, name: 'La Porte Saphir',
    shape: 'round', frame: 'stone', panel: 'panels', leaves: 2, medal: 'gold',
    color: '#1f3f95', dark: '#0f2257', light: '#3b63c4', trim: '#e6c46e', enamel: '#1b2f6e',
    stone: ['#9a8f7e', '#6f6557'], lantern: true,
    garland: { kinds: [{ sym: 'rose', colors: ['#f4a9bb', '#e98aa2', '#fde4ea', '#f7c3cf'] }], leaves: ROSE_LEAVES, density: 1 },
    base: { sym: 'daisy', colors: ['#fbf3e6', '#f7d9e0'], count: 5 },
  },
  {
    n: 2, name: 'La Porte d’Or',
    shape: 'segment', frame: 'gilded', panel: 'carved', leaves: 2, medal: 'gold',
    color: '#c9952f', dark: '#7d5413', light: '#f2cd6f', trim: '#fff0b8', enamel: '#5a3a0c',
    garland: { kinds: [{ sym: 'bud', colors: ['#f6e7b0', '#fff6d6'] }], leaves: ['#4f6b2c', '#6a7f33'], density: 0.35 },
    base: { sym: 'lotus', colors: ['#f0a8d0', '#e58cc0', '#f7c6e2'], count: 7 },
  },
  {
    n: 3, name: 'La Porte du Soleil',
    shape: 'round', frame: 'stone', panel: 'planks', leaves: 1, medal: 'gold',
    color: '#7b4a24', dark: '#4a2a12', light: '#a06a3a', trim: '#2b2622', enamel: '#3a2412',
    stone: ['#a39883', '#756b5b'],
    garland: { kinds: [{ sym: 'sunflower', colors: ['#f5b81c'] }], leaves: ['#3f6a26', '#557f2d', '#2f5220'], density: 0.9 },
    base: { sym: 'sunflower', colors: ['#f5b81c'], count: 4 },
  },
  {
    n: 4, name: 'La Porte d’Azur',
    shape: 'ogee', frame: 'tile', panel: 'panels', leaves: 2, medal: 'tile',
    color: '#f1ece2', dark: '#b9b2a3', light: '#ffffff', trim: '#2a9d9a', enamel: '#1f6f86',
    garland: { kinds: [{ sym: 'rose', colors: ['#d8347a', '#e85a98', '#b81f62', '#f07bb0'] }], leaves: ROSE_LEAVES, density: 0.85, sides: true },
    base: { sym: 'lily', colors: ['#fbf7ee', '#fff2dc'], count: 6 },
  },
  {
    n: 5, name: 'La Porte Rubis',
    shape: 'round', frame: 'redgold', panel: 'carved', leaves: 2, medal: 'gold',
    color: '#8d1b14', dark: '#4e0c08', light: '#b9352a', trim: '#e9c268', enamel: '#6d0f0a',
    garland: { kinds: [{ sym: 'rose', colors: ['#b8151f', '#d6303a', '#8e0e16'] }], leaves: ROSE_LEAVES, density: 0.35 },
    base: { sym: 'lily', colors: ['#fdf9f0', '#fff4e0'], count: 7 },
  },
  {
    n: 6, name: 'La Porte des Roses',
    shape: 'round', frame: 'stone', panel: 'panels', leaves: 1, medal: 'porcelain',
    color: '#ecbcc2', dark: '#c48f97', light: '#fbe0e3', trim: '#b98a4a', enamel: '#5b3aa0',
    stone: ['#cfc3b1', '#9b8f7d'], lantern: true,
    garland: { kinds: [{ sym: 'rose', colors: ['#f5a3b6', '#e3637f', '#fbd4dd', '#d94f6f'] }], leaves: ROSE_LEAVES, density: 1 },
    base: { sym: 'lily', colors: ['#fbf6ec'], count: 5 },
  },
  {
    n: 7, name: 'La Porte Émeraude',
    shape: 'pointed', frame: 'stone', panel: 'diamond', leaves: 2, medal: 'gold',
    color: '#1d6a48', dark: '#0c3d27', light: '#2f8a60', trim: '#e8c878', enamel: '#0f4a31',
    stone: ['#8e8a78', '#5f5c4d'], moss: true,
    garland: { kinds: [{ sym: 'daisy', colors: ['#ffffff', '#f4f1e6'] }, { sym: 'bud', colors: ['#fff7d9'] }], leaves: ['#2d6a2e', '#3f8237', '#1f4f22', '#5a9a3d'], density: 1, ivy: true },
    base: { sym: 'daisy', colors: ['#ffffff'], count: 5 },
  },
  {
    n: 8, name: 'La Porte de la Lune',
    shape: 'round', frame: 'celestial', panel: 'stars', leaves: 1, medal: 'gold',
    color: '#452671', dark: '#220f3f', light: '#6a44a0', trim: '#e9d08a', enamel: '#2a1450',
    garland: { kinds: [{ sym: 'rose', colors: ['#c9b3f0', '#a98ae0'] }], leaves: ['#3b5f35', '#4d7440'], density: 0.45, wisteria: ['#b49ae8', '#9a7ddc', '#cbb8f4'] },
    base: { sym: 'lavender', colors: ['#9b7fd8', '#b59bea'], count: 6 },
  },
  {
    n: 9, name: 'La Porte d’Onyx',
    shape: 'pointed', frame: 'gothic', panel: 'glass', leaves: 2, medal: 'gold',
    color: '#23222b', dark: '#101016', light: '#3b3a47', trim: '#c9ccd6', enamel: '#1a1a22',
    glass: ['#b3122e', '#1f4fb8', '#e0a019', '#6a1fa0', '#1b8a5a'],
    garland: { kinds: [{ sym: 'rose', colors: ['#7a0c1a', '#9c1426', '#5e0712'] }], leaves: ['#1f3b22', '#2a4b2b'], density: 0.55 },
    base: { sym: 'rose', colors: ['#8a0f1f', '#6b0914'], count: 4 },
  },
  {
    n: 10, name: 'La Porte des Songes',
    shape: 'round', frame: 'wood', panel: 'glass', leaves: 2, medal: 'gold',
    color: '#1d7b83', dark: '#0e474d', light: '#36a2aa', trim: '#e0a86a', enamel: '#0f5157',
    glass: ['#f2c14e', '#e56b3c', '#3fb6a8', '#f7e3a1', '#d9485f'], lantern: true,
    garland: { kinds: [{ sym: 'rose', colors: ['#f08a24', '#f7a531', '#e2641c'] }, { sym: 'daisy', colors: ['#ffd24a'] }], leaves: ['#3b6a2c', '#4f7f34'], density: 0.8 },
    base: { sym: 'rose', colors: ['#f08a24', '#e2641c'], count: 5 },
  },
  {
    n: 11, name: 'La Porte de Cuivre',
    shape: 'segment', frame: 'stone', panel: 'sun', leaves: 1, medal: 'sun',
    color: '#a4532a', dark: '#5e2a12', light: '#cf7a45', trim: '#f2c45a', enamel: '#6e3314',
    stone: ['#b09c80', '#7c6a52'],
    garland: { kinds: [{ sym: 'daisy', colors: ['#ffc83d', '#ff9f2e', '#fff1b0'] }], leaves: ['#4a6f2a', '#5d8431'], density: 0.75 },
    base: { sym: 'sunflower', colors: ['#f5b81c'], count: 3 },
  },
  {
    n: 12, name: 'La Porte Nacrée',
    shape: 'ogee', frame: 'gilded', panel: 'stars', leaves: 2, medal: 'porcelain',
    color: '#efe7d6', dark: '#c9bda5', light: '#fffaf0', trim: '#caa24e', enamel: '#b0853a',
    starColor: '#caa24e',
    garland: { kinds: [{ sym: 'rose', colors: ['#fffaf2', '#f6ece0', '#fde8ee'] }], leaves: ROSE_LEAVES, density: 0.8 },
    base: { sym: 'lavender', colors: ['#8f74d0', '#a58ce0'], count: 7 },
  },
];
