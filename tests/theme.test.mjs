import test from 'node:test';
import assert from 'node:assert/strict';
import { themeAt, currentTheme } from '../js/theme.js';

const at = (h) => new Date(2026, 0, 1, h, 30);

test('thème automatique selon l’heure', () => {
  assert.equal(themeAt(at(3)), 'nuit');
  assert.equal(themeAt(at(6)), 'aube');
  assert.equal(themeAt(at(12)), 'jour');
  assert.equal(themeAt(at(18)), 'crepuscule');
  assert.equal(themeAt(at(22)), 'nuit');
});

test('thème choisi ou inconnu', () => {
  assert.equal(currentTheme({ theme: 'foret' }), 'foret');
  assert.equal(currentTheme({ theme: 'auto' }, at(12)), 'jour');
  assert.equal(currentTheme({ theme: 'nimporte' }), 'nuit');
});
