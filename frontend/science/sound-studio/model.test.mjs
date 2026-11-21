import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stringNote, compareNotes } from './model.mjs';
test('pull changes amplitude and gain, never frequency', () => {
  const a=stringNote(100,.25),b=stringNote(100,.75);
  assert.equal(a.hz,220); assert.equal(b.hz,a.hz);
  assert.ok(Math.abs(b.gain-3*a.gain)<1e-12);
  assert.equal(compareNotes(a,b),'Louder, same pitch.');
});
test('frequency follows the square root of tension independent of pull', () => {
  const a=stringNote(50,.4), b=stringNote(200,.4);
  assert.equal(b.hz/a.hz,2); assert.equal(a.gain,b.gain);
  assert.equal(compareNotes(a,b),'Higher pitch, about as loud.');
});
test('bounds, silence and invalid inputs', () => {
  assert.equal(stringNote(999,-1).gain,0);
  assert.equal(stringNote(-9,4).amplitude,1);
  assert.throws(()=>stringNote(100,NaN),TypeError);
});
import { bottleNote, drumNote, bellNote, pumpOnce, AIR_FLOOR, sliderToHz, hears, kind, FRETS, rising, DISCOVERIES, discover, nextAsk, wavePath } from './model.mjs';
test('frets shorten the string: half length is an octave up', () => {
  assert.equal(stringNote(100, .5, FRETS[5]).hz, 440);
  assert.ok(Math.abs(stringNote(100, .5, FRETS[4]).hz - 330) < 1e-9);
  assert.ok(FRETS.every((f, i) => !i || f < FRETS[i - 1]));
});
test('more water leaves less air and a higher note', () => {
  const empty = bottleNote(0), half = bottleNote(.5), full = bottleNote(.85);
  assert.ok(empty.hz < half.hz && half.hz < full.hz);
  assert.ok(Math.abs(empty.hz - 343 / (4 * .255)) < 1e-9);
  assert.equal(bottleNote(2).hz, full.hz);
  assert.ok(rising([empty, half, full]) && !rising([half, empty]));
});
test('drum: harder hit is louder with a higher rice jump, tighter is higher', () => {
  const soft = drumNote(100, .3), hard = drumNote(100, .9);
  assert.equal(soft.hz, hard.hz); assert.ok(hard.jump > soft.jump && hard.gain > soft.gain);
  assert.equal(drumNote(200, .5).hz / drumNote(50, .5).hz, 2);
});
test('a hand pump never empties the jar; less air is quieter', () => {
  let air = 1; for (let i = 0; i < 30; i++) air = pumpOnce(air);
  assert.equal(air, AIR_FLOOR);
  assert.ok(pumpOnce(.5) < .5 && bellNote(.1).gain < bellNote(1).gain && bellNote(.1).hz === 880);
});
test('hearing ranges and the log pitch slider', () => {
  assert.equal(sliderToHz(0), 10); assert.equal(sliderToHz(500), 1000); assert.equal(sliderToHz(1000), 100000);
  assert.deepEqual(hears(30000), ['dog', 'bat']); assert.deepEqual(hears(18), ['elephant']); assert.deepEqual(hears(10), []);
  assert.equal(kind(19), 'infrasound'); assert.equal(kind(20001), 'ultrasound'); assert.equal(kind(440), 'audible');
});
test('discoveries: each found once, by doing the thing', () => {
  const found = new Set();
  const a = stringNote(100, .3), b = stringNote(160, .3);
  assert.equal(discover({ station: 'veena', type: 'pluck', note: a, length: 1 }, found), null);
  const peg = discover({ station: 'veena', type: 'pluck', note: b, prev: a, tension: 160, prevTension: 100, length: 1 }, found);
  assert.equal(peg.id, 'peg'); found.add(peg.id);
  assert.equal(nextAsk('veena', found).id, 'fret');
  assert.equal(discover({ station: 'bottles', type: 'scale', notes: [.1, .2, .3, .4, .5].map(w => bottleNote(w)) }, found).id, 'bottles');
  assert.equal(discover({ station: 'bottles', type: 'scale', notes: [.5, .2].map(w => bottleNote(w)) }, found), null);
  assert.equal(discover({ station: 'bell', type: 'ring', air: .3 }, found), null);
  assert.equal(discover({ station: 'bell', type: 'ring', air: .05 }, found).id, 'vacuum');
  assert.equal(discover({ station: 'hear', type: 'tune', hz: 30000 }, found).id, 'ultra');
  assert.equal(discover({ station: 'hear', type: 'tune', hz: 18 }, found).id, 'infra');
  assert.equal(new Set(DISCOVERIES.map(d => d.id)).size, DISCOVERIES.length);
  assert.match(wavePath(220, .5), /^M0\.00 40\.00 L/);
});
