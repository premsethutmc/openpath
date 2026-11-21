import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialGarden, setLeaves, nextWeek, observation } from './model.mjs';

const counts = s => [s.caterpillars, s.birds];
function trajectory(start, weeks) {
  const states = [start];
  for (let i = 0; i < weeks; i++) states.push(nextWeek(states.at(-1)));
  return states;
}

test('remove the plants now; fewer caterpillars, then fewer birds later', () => {
  const base = initialGarden();
  const bare = setLeaves(base, false);
  const states = trajectory(bare, 4);
  assert.deepEqual(states.map(counts), [[6, 3], [4, 3], [2, 2], [0, 1], [0, 0]]);
  assert.equal(base.leaves, true);
  assert.equal(states[4].week, 4);
  assert.match(observation(states[0], states[1]), /Less food for caterpillars/);
  assert.match(observation(states[1], states[2]), /Fewer birds/);
});

test('restoring plants does not instantly restore animals; they return in food-chain order', () => {
  const empty = trajectory(setLeaves(initialGarden(), false), 4).at(-1);
  const states = trajectory(setLeaves(empty, true), 5);
  assert.deepEqual(states.map(counts), [[0, 0], [2, 0], [4, 1], [6, 2], [6, 3], [6, 3]]);
  assert.equal(states[0].week, 4);
  assert.equal(states[5].week, 9);
  assert.match(observation(states[0], states[1]), /Fresh leaves/);
  assert.match(observation(states[3], states[4]), /More birds visit/);
});

test('unchanged garden is stable; reversing decisions stays within scene limits', () => {
  assert.deepEqual(counts(trajectory(initialGarden(), 8).at(-1)), [6, 3]);
  let garden = initialGarden();
  for (let i = 1; i <= 60; i++) {
    garden = nextWeek(setLeaves(garden, i % 11 < 5));
    assert.equal(garden.week, i);
    assert.ok(garden.caterpillars >= 0 && garden.caterpillars <= 6);
    assert.ok(garden.birds >= 0 && garden.birds <= 3);
  }
  assert.deepEqual(nextWeek(setLeaves(setLeaves(initialGarden(), false), true)), { ...initialGarden(), week: 1 });
});
