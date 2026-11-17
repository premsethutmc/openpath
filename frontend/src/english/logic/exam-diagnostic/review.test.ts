import assert from 'node:assert/strict';
import {test} from 'node:test';
import {QUESTIONS,PASSAGE,CHECKS,validSession,initialSession,answer,submitWriting} from './session.ts';
import {verifyWritingSkill,WRITING_CHECKS,planWritingChecks} from './verification.ts';

test('persisted skipped writing cannot acquire an orphan revision',()=>{
 let s=initialSession();
 for(const q of QUESTIONS) s=answer(s,q.id,q.answer);
 s=submitWriting(s,'');
 assert.equal(validSession(s),true);
 assert.equal(validSession({...s,revision:'This has no original writing.'}),false);
});
test('reading explanations cite supplied text and every keyed option is valid',()=>{
 for(const q of QUESTIONS){ assert.ok(PASSAGE.includes(q.quote)); assert.ok(q.answer>=0 && q.answer<q.options.length); }
 for(const q of CHECKS){ assert.ok(q.passage.includes(q.quote)); assert.ok(q.answer>=0 && q.answer<q.options.length); }
});
test('exposure prevents a previously revealed writing pair from becoming fresh evidence',()=>{
 const observation={skill:'articles' as const,quote:'a hour',explanation:'Vowel sound',kind:'error' as const,confidence:'high' as const,requiresCheck:true};
 const pair=WRITING_CHECKS.filter(q=>q.skill==='articles');
 const correct=Object.fromEntries(pair.map(q=>[q.id,q.answer]));
 for(const q of pair){
  assert.deepEqual(planWritingChecks([observation],[q.id]),[]);
  const result=verifyWritingSkill('articles',correct,[q.id]);
  assert.equal(result.outcome,'inconclusive'); assert.equal(result.lesson,null);
 }
});

test('writing bank and answer options are runtime immutable',()=>{
 assert.ok(Object.isFrozen(WRITING_CHECKS));
 for(const q of WRITING_CHECKS){
  assert.ok(Object.isFrozen(q)); assert.ok(Object.isFrozen(q.options));
  assert.throws(()=>{ (q as {answer:number}).answer=99; },TypeError);
  assert.throws(()=>{ (q.options as string[])[0]='altered'; },TypeError);
 }
});

test('late successful fixture reply cannot resurrect a reset workflow',async()=>{
 const {SyntheticWritingWorkflow}=await import('./workflow.ts');
 let release!:(value:unknown)=>void;
 let payload:{essay:{id:string};rubric:string}|undefined;
 const flow=new SyntheticWritingWorkflow(body=>{
  payload=body.request as typeof payload;
  return new Promise(resolve=>{release=resolve;});
 });
 const pending=flow.analyse(); flow.reset();
 release({evaluator:{id:'local-exam-fixture',version:'fixture@1',model:'simulated-not-a-model',rubric:payload!.rubric,protocol:'essay-observe.v2'},output:{essay_id:payload!.essay.id,rubric:payload!.rubric,not_observable:[],observations:[]}});
 await pending;
 assert.equal(flow.snapshot().phase,'idle'); assert.deepEqual(flow.snapshot().observations,[]); assert.deepEqual(flow.snapshot().seenIds,[]);
});
