import assert from 'node:assert/strict';
import {test} from 'node:test';
import { lessons, sceneOrder, clampDial, hasSignal, SIGNAL, moveScene } from './story.mjs';

test('the full lesson has a bounded sequence, with every chapter on the main path',()=>{
  assert.deepEqual(sceneOrder,['title','bridge','talks','wardha','gathering','arrests','radio','places','suppression','aftermath','independence']);
  assert.equal(moveScene(0,-1),0);
  assert.equal(moveScene(sceneOrder.length-1,1),sceneOrder.length-1);
  sceneOrder.forEach((k,i)=>{assert.ok(lessons[k].date && lessons[k].context);if(i<sceneOrder.length-1) assert.equal(moveScene(i,1),i+1);});
});
test('dial lock has a discoverable, bounded window',()=>{
  assert.equal(clampDial(-3),0);assert.equal(clampDial(100),80);
  assert.equal(hasSignal(SIGNAL),true);assert.equal(hasSignal(SIGNAL-5),true);
  assert.equal(hasSignal(SIGNAL+5),true);assert.equal(hasSignal(SIGNAL+6),false);
  assert.equal(hasSignal(SIGNAL-6),false);
});
test('the causes, resolution, arrests, local action, suppression and 1947 are distinct',()=>{
  assert.match(lessons.bridge.context,/Dandi in 1930.*By 1942/);
  assert.match(lessons.wardha.date,/14 JULY/);
  assert.match(lessons.gathering.date,/8 AUGUST/);assert.match(lessons.arrests.date,/9 AUGUST/);
  assert.match(lessons.radio.date,/LATER IN 1942/);
  assert.match(lessons.places.context,/Students demonstrated, workers struck/);
  assert.match(lessons.suppression.context,/suppress.*nonviolence/);
  assert.match(lessons.aftermath.context,/did not end in 1942/);
  assert.match(lessons.independence.context,/independent in 1947.*Partition/);
  assert.match(lessons.places.clues[3][2],/Madurai/);
  assert.match(lessons.talks.clues[0][2],/after the war.*keep control/);
  assert.match(lessons.talks.clues[1][2],/real authority during the war/);
});

test('every scene has a transcript and a packaged speech asset', async () => {
  const { narration } = await import('./voice.mjs');
  const { readFile } = await import('node:fs/promises');
  assert.deepEqual(Object.keys(narration), sceneOrder);
  for (const key of [...sceneOrder, 'broadcast']) {
    const bytes = await readFile(new URL('./assets/voice/' + key + '.mp3', import.meta.url));
    assert.ok(bytes.byteLength > 4000, key + ' has actual audio data');
    assert.equal(bytes.subarray(0,3).toString(), 'ID3');
  }
});
