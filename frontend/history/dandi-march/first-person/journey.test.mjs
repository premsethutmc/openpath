import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VILLAGE_STEP, LAST_STEP, routeNotes, stepForward } from './journey.mjs';

test('the march advances only while walking, looking ahead and visible',()=>{
  for (const walking of [false,true]) for (const ahead of [false,true]) for (const visible of [false,true]) {
    assert.equal(stepForward(4,{walking,ahead,visible}), walking && ahead && visible ? 5 : 4);
  }
});

test('the village happens before the walk ends, and the end is clamped',()=>{
  const active = {walking:true,ahead:true,visible:true};
  assert.equal(stepForward(VILLAGE_STEP-1,active),VILLAGE_STEP);
  assert.ok(VILLAGE_STEP < LAST_STEP);
  let count = 0;
  for (let i=0; i<LAST_STEP+5; i++) count = stepForward(count,active);
  assert.equal(count,LAST_STEP);
});

test('the route distinguishes arrival from the following morning',()=>{
  assert.match(routeNotes[2], /19–20 March.*Mahi.*Kareli/);
  assert.match(routeNotes[3], /5 April.*Dandi.*next morning/);
});
