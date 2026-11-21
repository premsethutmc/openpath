import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareBrickFace, checkStand, pressureKPa } from './model.mjs';

test('the same brick exerts twice the pressure on half the contact area', () => {
  assert.deepEqual(compareBrickFace('wide'), { forceN: 12, areaCm2: 60, pressureKPa: 2 });
  assert.deepEqual(compareBrickFace('narrow'), { forceN: 12, areaCm2: 30, pressureKPa: 4 });
});

test('the pressure conversion uses SI units and validates inputs', () => {
  assert.equal(pressureKPa(1000, 10000), 1);
  assert.equal(pressureKPa(0, 60), 0);
  for (const args of [[-1, 1], [1, 0], [1, Infinity], [NaN, 3]]) {
    assert.throws(() => pressureKPa(...args), RangeError);
  }
  assert.throws(() => compareBrickFace('toString'), RangeError);
});

test('a stand choice alone is not a complete independent explanation', () => {
  assert.deepEqual(checkStand('wide', null), { complete: false });
  assert.equal(checkStand('wide', 'weight').correct, false);
  assert.equal(checkStand('narrow', 'spread').correct, false);
  assert.deepEqual(checkStand('wide', 'spread'), {
    complete: true, footCorrect: true, reasonCorrect: true, correct: true,
  });
});
