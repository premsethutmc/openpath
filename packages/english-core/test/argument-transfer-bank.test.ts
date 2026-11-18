import test from 'node:test';
import assert from 'node:assert/strict';
import {ARGUMENT_TRANSFER_TASKS} from '../src/essay/argument-transfer-bank.ts';
import {GOAL_TOPICS,type WorkspaceGoal} from '../src/essay/argument.ts';
const goals:WorkspaceGoal[]=['grade7','general','cat','gre','gmat'];
const normalized=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
test('finite candidate bank has fourteen stable topics and genuine family identities, not one copy per preference',()=>{
 assert.equal(ARGUMENT_TRANSFER_TASKS.length,14);
 for(const field of ['id','family','topic'] as const)assert.equal(new Set(ARGUMENT_TRANSFER_TASKS.map(t=>normalized(t[field]))).size,14,field);
 const visible=goals.flatMap(goal=>ARGUMENT_TRANSFER_TASKS.filter(t=>t.allowedGoals.includes(goal)));
 assert.equal(new Set(visible.map(t=>t.id)).size,14);
 assert.equal(new Set(visible.map(t=>t.family)).size,14);
 for(const task of ARGUMENT_TRANSFER_TASKS){
  assert.equal(task.version,1);assert.match(task.id,/^argument-transfer\./);assert.match(task.family,/^argument-transfer-family\./);
  assert.deepEqual(Object.keys(task).sort(),['allowedGoals','family','id','prompt','topic','version']);
  assert.ok(task.allowedGoals.length>0);assert.equal(new Set(task.allowedGoals).size,task.allowedGoals.length);
  assert.ok(task.allowedGoals.every(g=>goals.includes(g)));
 }
});
test('goal suitability filters contexts without manufacturing new difficulty or exam forms',()=>{
 assert.equal(ARGUMENT_TRANSFER_TASKS.filter(t=>t.allowedGoals.includes('grade7')).length,10);
 for(const goal of goals.filter(g=>g!=='grade7'))assert.equal(ARGUMENT_TRANSFER_TASKS.filter(t=>t.allowedGoals.includes(goal)).length,14);
 const adultOnly=ARGUMENT_TRANSFER_TASKS.filter(t=>!t.allowedGoals.includes('grade7'));
 assert.deepEqual(adultOnly.map(t=>t.id),['argument-transfer.salary-ranges','argument-transfer.renewal-choice','argument-transfer.correction-history','argument-transfer.bid-criteria']);
 for(const task of ARGUMENT_TRANSFER_TASKS){
  assert.ok(!('difficulty' in task));assert.ok(!('score' in task));assert.ok(!('expectedBand' in task));
  for(const goal of task.allowedGoals)assert.equal(ARGUMENT_TRANSFER_TASKS.find(t=>t.id===task.id&&t.allowedGoals.includes(goal)),task);
 }
});
test('transfer propositions are distinct from every legacy coached topic and contain no model or coaching scaffold',()=>{
 const coaching=new Set(Object.values(GOAL_TOPICS).flat().map(normalized));
 for(const task of ARGUMENT_TRANSFER_TASKS){
  assert.ok(!coaching.has(normalized(task.topic)));assert.ok(task.topic.endsWith('?'));
  assert.equal(task.prompt,`${task.topic}\nWrite your own argument taking a position on this question. Write 30–800 words. This is candidate practice, not an official exam task.`);
  assert.ok(!/for example|first,|second,|counterargument|two reasons|model answer|correct answer|use this|hint:/i.test(task.prompt));
  assert.ok(task.prompt.length<650);
 }
});
test('authored bank and eligibility lists cannot be mutated between reservation and display',()=>{
 assert.ok(Object.isFrozen(ARGUMENT_TRANSFER_TASKS));
 for(const task of ARGUMENT_TRANSFER_TASKS){assert.ok(Object.isFrozen(task));assert.ok(Object.isFrozen(task.allowedGoals));}
 const copy=structuredClone(ARGUMENT_TRANSFER_TASKS[0]);copy.prompt='changed copy';
 assert.notEqual(copy.prompt,ARGUMENT_TRANSFER_TASKS[0].prompt);
 assert.throws(()=>{(ARGUMENT_TRANSFER_TASKS as unknown as {prompt:string}[])[0].prompt='changed bank';},TypeError);
});
