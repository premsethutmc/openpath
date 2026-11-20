import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankLesson, checkTransfer, checkTwoPots, emptyPot, firstDay, lessonView, loadLesson, loadPot, nextDay, savePot, stageOf, storageKey } from './model.mjs';

test('first root comes before the shoot, after suitable days', () => {
  assert.equal(stageOf(emptyPot), 'empty');
  assert.equal(stageOf(firstDay), 'seed');
  const root = nextDay(firstDay, 'wait').pot;
  assert.equal(stageOf(root), 'root');
  assert.equal(root.moisture, 'dry');
  const stillRoot = nextDay(root, 'water').pot;
  assert.equal(stageOf(stillRoot), 'root');
  assert.equal(stageOf(nextDay(stillRoot, 'wait').pot), 'sprout');
});

test('both too dry and waterlogged pause growth; care lets it recover', () => {
  const soaked = nextDay(firstDay, 'water');
  assert.deepEqual(soaked, { pot: { day: 2, moisture: 'waterlogged', growth: 0 }, outcome: 'soaked' });
  const drained = nextDay(soaked.pot, 'wait');
  assert.deepEqual(drained, { pot: { day: 3, moisture: 'moist', growth: 0 }, outcome: 'drained' });
  const dry = { day: 2, moisture: 'dry', growth: 0 };
  assert.equal(nextDay(dry, 'wait').outcome, 'dry');
  assert.equal(stageOf(nextDay(dry, 'water').pot), 'root');
  assert.equal(stageOf(nextDay(drained.pot, 'wait').pot), 'root');
  assert.throws(() => nextDay(emptyPot, 'water'), TypeError);
});

test('transfer only scores complete action pairs and requires both appropriate choices', () => {
  assert.equal(checkTwoPots('water', null), null);
  assert.deepEqual(checkTwoPots('water', 'water'), { crumbly: true, damp: false });
  assert.deepEqual(checkTwoPots('water', 'wait'), { crumbly: true, damp: true });
});

test('one anonymous pot saves and reloads; invalid or unavailable storage is not trusted', () => {
  const map = new Map();
  const storage = { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  assert.deepEqual(loadPot(storage), { pot: emptyPot, status: 'ready' });
  const pot = nextDay(firstDay, 'wait').pot;
  assert.equal(savePot(storage, pot), true);
  assert.deepEqual(loadPot(storage), { pot, status: 'ready' });
  assert.deepEqual([...map.keys()], [storageKey]);
  for (const invalid of ['junk', '{"version":1,"pot":null}', '{"version":1,"pot":{"day":2,"moisture":"dry","growth":3}}']) {
    map.set(storageKey, invalid);
    assert.deepEqual(loadPot(storage), { pot: emptyPot, status: 'unavailable' });
    assert.equal(map.get(storageKey), invalid);
  }
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(loadPot(blocked).status, 'unavailable');
  assert.equal(savePot(blocked, pot), false);
});

test('never reveals the first root until a prediction is locked and the soil window is opened', () => {
  const root = nextDay(firstDay, 'wait').pot;
  const unavailable = lessonView(root, blankLesson, true);
  assert.deepEqual(unavailable, {
    mustPredict: true, mustLook: false, cutaway: false, stage: 'seed', canCare: false, canApply: false,
  });
  const predicted = { prediction: 'shoot', rootSeen: false };
  assert.equal(lessonView(root, predicted).stage, 'seed');
  assert.equal(lessonView(root, predicted).mustLook, true);
  assert.equal(lessonView(root, predicted, true).stage, 'root');
  assert.equal(lessonView(root, { ...predicted, rootSeen: true }).canCare, true);
});

test('practice scores care and hidden-growth evidence separately and requires reasons', () => {
  const answers = { crumbly: 'water', damp: 'wait', careReason: 'soil', observe: 'cutaway', observeReason: 'hiddenGrowth' };
  assert.equal(checkTransfer({ ...answers, careReason: undefined }), null);
  assert.deepEqual(checkTransfer(answers), { care: true, evidence: true });
  assert.deepEqual(checkTransfer({ ...answers, observe: 'surface' }), { care: true, evidence: false });
});

test('the device-only pot can retain prediction and observation without revealing on restore', () => {
  const pot = nextDay(firstDay, 'wait').pot;
  let stored = JSON.stringify({ version: 1, pot });
  const storage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  assert.equal(loadLesson(storage, pot), blankLesson);
  const lesson = { prediction: 'shoot', rootSeen: true };
  assert.equal(savePot(storage, pot, lesson), true);
  assert.deepEqual(loadLesson(storage, pot), lesson);
  assert.equal(lessonView(pot, loadLesson(storage, pot)).cutaway, false);
});
