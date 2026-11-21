import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTransfer, perform, initialPhase, particleNotes } from './model.mjs';

test('recovers sand then salt without changing the identity of either solid', () => {
  let phase = initialPhase;
  for (const [action, result] of [['water','wet'],['stir','solution'],['filter','filtered'],['evaporate','recovered']]) {
    phase = perform(phase, action).phase;
    assert.equal(phase, result);
  }
  assert.match(particleNotes.recovered, /solid salt crystals/);
});

test('wrong order teaches without corrupting state', () => {
  assert.equal(perform('dry','filter').phase, 'dry');
  assert.equal(perform('wet','filter').phase, 'wet');
  assert.match(perform('solution','evaporate').message, /Filter first/);
  assert.equal(perform('solution','evaporate').phase, 'solution');
  assert.match(perform('filtered','filter').message, /dissolved salt/);
  assert.throws(() => perform('outside','stir'), TypeError);
});

test('the new scenario needs both prediction and reasoning', () => {
  assert.equal(checkTransfer('evaporate', null), null);
  assert.deepEqual(checkTransfer('evaporate', 'holes'), { method: true, reason: false });
  assert.deepEqual(checkTransfer('evaporate', 'vapour'), { method: true, reason: true });
});
