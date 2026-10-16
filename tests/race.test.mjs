import test from 'node:test';
import assert from 'node:assert/strict';
import { raceScale } from '../js/race.js';

test('course aux likes : la vue s’arrête au prochain objectif, puis recule', () => {
  assert.deepEqual(raceScale(4000, [10000, 20000]), { max: 10000, goals: [10000] });
  assert.deepEqual(raceScale(12000, [20000, 10000]), { max: 20000, goals: [10000, 20000] });
  // Jamais d'autre palier que ceux réglés : au-delà du dernier, on y reste.
  assert.deepEqual(raceScale(26000, [10000, 20000]), { max: 20000, goals: [10000, 20000] });
  assert.deepEqual(raceScale(99700, [10000]).max, 10000);
  // Ligne fixe : toujours jusqu'au dernier palier.
  assert.deepEqual(raceScale(500, [10000, 50000], false), { max: 50000, goals: [10000, 50000] });
  assert.deepEqual(raceScale(0, []).max, 10000);
  // Total du live : 10 000 tout à droite, puis 50 000 (10 000 reste sur la ligne).
  assert.deepEqual(raceScale(9999, [10000, 50000]), { max: 10000, goals: [10000] });
  assert.deepEqual(raceScale(10000, [10000, 50000]), { max: 50000, goals: [10000, 50000] });
});
