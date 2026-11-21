import assert from 'node:assert/strict';
import {test} from 'node:test';
import { lessons, sceneOrder, clampDial, hasSignal, SIGNAL, moveScene } from './story.mjs';

test('first visit and replay have the same bounded order',()=>{
  assert.deepEqual(sceneOrder,['title','talks','gathering','arrests','radio','places','aftermath']);
  assert.equal(moveScene(0,-1),0);
  assert.equal(moveScene(6,1),6);
  for(let i=0;i<6;i++) assert.equal(moveScene(i,1),i+1);
});
test('dial lock has a discoverable, bounded window',()=>{
  assert.equal(clampDial(-3),0);assert.equal(clampDial(100),80);
  assert.equal(hasSignal(SIGNAL),true);assert.equal(hasSignal(SIGNAL-5),true);
  assert.equal(hasSignal(SIGNAL+5),true);assert.equal(hasSignal(SIGNAL+6),false);
  assert.equal(hasSignal(SIGNAL-6),false);
});
test('the resolution, arrests, radio and 1947 are not conflated',()=>{
  assert.match(lessons.gathering.date,/8 AUGUST/);assert.match(lessons.arrests.date,/9 AUGUST/);
  assert.match(lessons.radio.date,/LATER IN 1942/);
  assert.match(lessons.aftermath.context,/did not end in 1942.*1947.*Partition/);
  assert.match(lessons.places.clues[3][2],/Madurai/);
  assert.match(lessons.talks.clues[0][2],/after the war.*keep control/);
  assert.match(lessons.talks.clues[1][2],/real authority during the war/);
});
