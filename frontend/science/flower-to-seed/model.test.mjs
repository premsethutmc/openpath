import test from 'node:test';
import assert from 'node:assert/strict';
import {pollenPath,cycle,days,disperse,seeds,checkTransfer} from './model.mjs';
test('pollen on a petal is not pollination; same-plant differs from cross',()=>{
 assert.equal(pollenPath(null,1,'stigma'),'empty');
 assert.equal(pollenPath(0,1,'petal'),'miss');
 assert.equal(pollenPath(0,0,'stigma'),'self');
 assert.equal(pollenPath(1,0,'stigma'),'cross');
});
test('only compatible cross leads to the pod sequence in this model',()=>{
 for(const rejected of [null,'empty','miss','self'])assert.equal(cycle(rejected,1),null);
 assert.equal(cycle('cross',-1),null);
 assert.equal(cycle('cross',4),null);
 assert.deepEqual(days.map((_,i)=>cycle('cross',i).step),[0,1,2,3]);
 assert.match(cycle('cross',0).detail,/No seed/);
 assert.match(cycle('cross',2).detail,/ovules develop into seeds/);
});
test('different specimen features match different carriers',()=>{
 for(const [id,s] of Object.entries(seeds))for(const carrier of ['wind','water','animal']){
  assert.equal(disperse(id,carrier),carrier===s.carrier);
 }
 assert.equal(disperse('stone','wind'),null);
});
test('new-case check needs the carrier and its evidence, and separates propagation',()=>{
 assert.deepEqual(checkTransfer({carrier:'animal',reason:'plume'}),
 {carrier:'correct',reason:'try-again',propagation:'unanswered'});
 assert.ok(Object.values(checkTransfer({carrier:'animal',reason:'hook',propagation:'potato-eye'})).every(x=>x==='correct'));
});
