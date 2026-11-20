import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ROOM, MATERIALS, shadowAt } from './model.mjs';

test('moving the torch in grows the shadow without changing the cutout', () => {
  for (let x = ROOM.near + 1; x <= ROOM.far; x++) {
    assert.ok(shadowAt(x).wallHalfHeight > shadowAt(x - 1).wallHalfHeight);
  }
  assert.ok(shadowAt(ROOM.far).scale / shadowAt(ROOM.near).scale > 2);
});

test('shadow edges follow the same ray slopes before and after the cutout', () => {
  for (const x of [ROOM.near, ROOM.start, ROOM.far]) {
    const s = shadowAt(x);
    assert.ok(Math.abs(s.wallHalfHeight / (ROOM.wall - x) - ROOM.halfHeight / s.lightToObject) < 1e-12);
    assert.ok(s.wallHalfHeight < 46);
  }
});

test('out-of-range inputs clamp and non-finite inputs reset', () => {
  assert.deepEqual(shadowAt(-4), shadowAt(ROOM.near));
  assert.deepEqual(shadowAt(900), shadowAt(ROOM.far));
  assert.deepEqual(shadowAt(NaN), shadowAt(ROOM.start));
});

test('materials keep geometry constant and distinguish blocking, scatter and transmission', () => {
  const { cardboard, tracing, clear } = MATERIALS;
  assert.equal(cardboard.transmission, 0);
  assert.ok(tracing.transmission > 0 && tracing.transmission < clear.transmission);
  assert.ok(clear.transmission >= .9 && clear.transmission <= 1);
  assert.ok(tracing.blur > cardboard.blur && tracing.blur > clear.blur);
});
