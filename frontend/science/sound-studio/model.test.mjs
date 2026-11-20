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
