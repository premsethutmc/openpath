import test from 'node:test';
import assert from 'node:assert/strict';
import {pollenPath,cycle,stages,disperse,seeds,startBed,tend} from './model.mjs';
test('pollen on a petal does not pollinate; self and cross are distinct',()=>{
 assert.equal(pollenPath(null,1,'stigma'),'empty');
 assert.equal(pollenPath(0,1,'petal'),'miss');
 assert.equal(pollenPath(0,0,'stigma'),'self');
 assert.equal(pollenPath(1,0,'stigma'),'cross');
});
test('only compatible cross leads to the ordered pod stages in this mustard model',()=>{
 for(const rejected of [null,'empty','miss','self'])assert.equal(cycle(rejected,1),null);
 assert.equal(cycle('cross',-1),null);
 assert.equal(cycle('cross',4),null);
 assert.deepEqual(stages.map((_,i)=>cycle('cross',i).title),['Pollen lands','Fertilisation','Seeds grow','Pod ripens']);
});
test('different specimens match their characteristic carriers',()=>{
 for(const [id,s] of Object.entries(seeds))for(const carrier of ['wind','water','animal']){
  assert.equal(disperse(id,carrier),carrier===s.carrier);
 }
 assert.equal(disperse('stone','wind'),null);
 assert.equal(disperse('toString','wind'),null);
});
test('seeds and buds require a planted, moist bed; effects are bounded and inputs untouched',()=>{
 for(const crop of ['mustard','potato']){
  const empty=startBed(crop);
  assert.equal(tend(empty,'water'),empty);
  assert.equal(tend(empty,'time'),empty);
  const planted=tend(empty,'plant');
  assert.equal(tend(planted,'time'),planted);
  const wet=tend(planted,'water');
  const emerging=tend(wet,'time');
  const grown=tend(emerging,'time');
  assert.equal(grown.crop,crop);
  assert.equal(emerging.day,1);
  assert.equal(grown.day,2);
  assert.equal(tend(grown,'time').day,2);
  assert.equal(empty.planted,false);
 }
});
