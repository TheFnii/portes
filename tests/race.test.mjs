import test from 'node:test';
import assert from 'node:assert/strict';
import { raceScale } from '../js/race.js';

test('course aux likes : la vue s’arrête au prochain objectif, puis recule', () => {
  assert.deepEqual(raceScale(4000, [10000, 20000]), { max: 10000, goals: [10000] });
  assert.deepEqual(raceScale(12000, [20000, 10000]), { max: 20000, goals: [10000, 20000] });
  // Après les paliers réglés, la course continue avec des objectifs ronds.
  assert.deepEqual(raceScale(26000, [10000, 20000]), { max: 50000, goals: [10000, 20000, 50000] });
  assert.deepEqual(raceScale(99700, [10000]).max, 100000);
  assert.deepEqual(raceScale(0, []).max, 10000);
});
