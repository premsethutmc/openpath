import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SPECIES, LIMITS, initialGarden, setCount, nextWeek, trend, observation } from './model.mjs';

const row = s => SPECIES.map(k => s[k]);
function trajectory(start, weeks) {
  const states = [start];
  for (let i = 0; i < weeks; i++) states.push(nextWeek(states.at(-1)));
  return states;
}

test('untouched garden is balanced', () => {
  assert.deepEqual(row(trajectory(initialGarden(), 10).at(-1)), [6, 6, 1, 2]);
});

test('remove the plants: caterpillars fall first, then the hunters', () => {
  const states = trajectory(setCount(initialGarden(), 'plants', 0), 5);
  assert.deepEqual(states.map(row), [[0, 6, 1, 2], [0, 4, 1, 2], [0, 2, 0, 1], [0, 0, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0]]);
  assert.match(observation(states[0], states[1]), /not enough leaves/);
  assert.match(observation(states[1], states[2]), /last frog is gone/);
  assert.match(observation(states[4], states[5]), /garden is empty/);
});

test('remove the birds: caterpillars boom, plants suffer, frogs fill the gap, then a new balance', () => {
  const states = trajectory(setCount(initialGarden(), 'birds', 0), 8);
  assert.deepEqual(states.slice(0, 4).map(row), [[6, 6, 1, 0], [6, 8, 2, 1], [5, 6, 3, 2], [4, 4, 2, 1]]);
  assert.match(observation(states[0], states[1]), /few hunters about, caterpillars multiplied/);
  assert.match(observation(states[1], states[2]), /chewed the plants/);
  assert.deepEqual(row(states.at(-1)), [6, 6, 2, 1]);
});

test('no frogs and no birds: caterpillars overrun the plants, then numbers rise and fall in cycles', () => {
  const states = trajectory(setCount(setCount(initialGarden(), 'frogs', 0), 'birds', 0), 16);
  const plants = states.map(s => s.plants);
  const caterpillars = states.map(s => s.caterpillars);
  assert.equal(Math.max(...caterpillars), 10);
  assert.ok(Math.min(...plants) >= 1, 'grazing never wipes out the last plant');
  assert.equal(states.findIndex(s => s.caterpillars === 0), 7);
  assert.ok(caterpillars.slice(8).some(c => c > 0), 'butterflies bring caterpillars back');
  assert.ok(states.every(s => s.frogs === 0), 'frogs never return by themselves');
  assert.match(observation(states[7], states[8]), /Plants grew new leaves/);
  assert.match(observation(states[8], states[9]), /Butterflies laid eggs/);
});

test('counts stay within the drawn garden for any choices', () => {
  let garden = initialGarden();
  for (let i = 1; i <= 200; i++) {
    const key = SPECIES[i % 4];
    garden = nextWeek(setCount(garden, key, (i * 7) % (LIMITS[key] + 3) - 1));
    assert.equal(garden.week, i);
    for (const k of SPECIES) assert.ok(Number.isInteger(garden[k]) && garden[k] >= 0 && garden[k] <= LIMITS[k], `${k} at week ${i}`);
  }
  assert.deepEqual(row(setCount(initialGarden(), 'birds', 99)), [6, 6, 1, 4]);
  assert.equal(trend({ birds: 1 }, { birds: 1 }, 'birds'), 'same');
});
