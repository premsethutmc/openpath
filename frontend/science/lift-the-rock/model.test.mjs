import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leverAt } from './model.mjs';

test('the same rock rises the same distance: less force takes more hand travel', () => {
  const far = leverAt(40), near = leverAt(20);
  assert.deepEqual([far.effort, far.handTravel, far.rockRise], [16, 6, 4]);
  assert.deepEqual([near.effort, near.handTravel, near.rockRise], [6, 16, 4]);
  assert.equal(near.workJ, far.workJ);
  assert.equal(near.workJ, .96);
});
test('work and displacement stay consistent throughout the motion at every pivot', () => {
  for (let p = 20; p <= 60; p++) for (let f = 0; f <= 1; f += .125) {
    const s = leverAt(p, f);
    assert.ok(Math.abs(s.workJ - s.effort*s.handTravel/100) < 1e-10);
    assert.equal(s.rockRise, 4*f);
  }
});
test('bounds and invalid inputs are explicit', () => {
  assert.equal(leverAt(-5, -1).handTravel, 0);
  assert.equal(leverAt(90, 4).loadArm, 60);
  assert.equal(leverAt(90, 4).rockRise, 4);
  assert.throws(() => leverAt(Infinity));
  assert.throws(() => leverAt(30, NaN));
});
