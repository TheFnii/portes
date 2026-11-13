import test from 'node:test';
import assert from 'node:assert/strict';
import { jarOf, jarsFilled, jarGoal, gauge } from '../js/jar.js';

test('bocal de likes : remplissage, bocaux remplis et remise à zéro', () => {
  assert.deepEqual(jarOf(0, 3000), { p: 0, n: 0 });
  assert.deepEqual(jarOf(1500, 3000), { p: 0.5, n: 0 });
  // Bocal plein : il repart de zéro.
  assert.deepEqual(jarOf(3000, 3000), { p: 0, n: 1 });
  assert.deepEqual(jarOf(7500, 3000), { p: 0.5, n: 2 });
  assert.equal(jarsFilled(2990, 3010, 3000), 1);
  assert.equal(jarsFilled(3010, 5990, 3000), 0);
  assert.equal(jarsFilled(2000, 9000, 3000), 3);
  assert.equal(jarGoal({}), 3000);
  assert.equal(jarGoal({ jarGoal: 500 }), 500);
  // Jamais de nombre de likes dans la jauge.
  assert.ok(!/1500|3000/.test(gauge(1500, 3000)));
});
