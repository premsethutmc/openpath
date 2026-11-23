import assert from 'node:assert/strict';
import test from 'node:test';
import { advance, answer, initial, lines, people, stages } from './story.mjs';

test('first-person journey follows the historical sequence without questions as gates',()=>{
  let s = initial();
  assert.equal(stages[s.stage].place,'Sabarmati Ashram');
  s = advance(s,.9999);
  assert.equal(s.stage,0);
  s = advance(s,.0001);
  assert.equal(s.stage,1);
  s = advance(s,1);
  assert.equal(stages[s.stage].date,'6 April 1930');
  assert.equal(s.stage,2);
  s = advance(s,1);
  assert.equal(s.stage,3);
  assert.deepEqual(advance(s,100),s);
});
test('stage cannot reverse or become invalid from a bad input',()=>{
  const s = {position:1.25,stage:1};
  for(const n of [-8,NaN,Infinity]) assert.deepEqual(advance(s,n),s);
  assert.deepEqual(advance(initial(),.4),{position:.4,stage:0});
});
test('Gandhi does not speak and invented dialogue belongs only to the companions',()=>{
  assert.deepEqual(Object.values(people),['Raman','Dev']);
  for(const [id,line] of Object.entries(lines)){
    assert.ok(Object.hasOwn(people,line.speaker));
    assert.equal(answer(id,0),null);
    assert.equal(answer(id,1),line);
    assert.equal(answer(id,2),null);
    assert.equal(answer(id,3),null);
  }
  assert.equal(answer('unknown',1),null);
  assert.equal(answer('toString',1),null);
});
