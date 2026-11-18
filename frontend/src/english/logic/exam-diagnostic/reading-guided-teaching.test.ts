import test from 'node:test';import assert from 'node:assert/strict';
import {ReadingGuidedTeaching,readingGuidedLesson,type ReadingSkill} from './reading-guided-teaching.ts';
import {ReadingFollowUp} from './reading-follow-up.ts';
import {QUESTIONS,CHECKS,PASSAGE,initialSession,answer,submitWriting} from './session.ts';
const skills:ReadingSkill[]=['main_argument','supported_inference','example_function','evidence_limits'];
const keys:Record<ReadingSkill,number>={main_argument:1,supported_inference:1,example_function:2,evidence_limits:0};
test('all reading skills have bounded worked examples and separate hidden-key guided practice',()=>{
 const ids=new Set<string>();for(const skill of skills){
  const lesson=readingGuidedLesson(skill);assert.equal(lesson.skill,skill);assert.equal(lesson.workedExample.steps.length,3);assert.ok(!('practice' in lesson));
  const flow=new ReadingGuidedTeaching(skill);assert.equal(flow.snapshot().phase,'example');assert.equal(flow.snapshot().practice,null);assert.match(lesson.workedExample.prompt,/Passage:/);
  flow.startPractice();const q=flow.snapshot().practice!;ids.add(q.id);assert.match(q.prompt,/Passage:/);
  assert.ok(!('answer' in q));assert.ok(!('explanation' in q));assert.equal(flow.snapshot().hint,null);assert.equal(flow.snapshot().feedback,null);
  assert.ok(!q.prompt.includes(PASSAGE));assert.ok(!lesson.workedExample.prompt.includes(PASSAGE));
  for(const old of [...QUESTIONS,...CHECKS])assert.ok(old.id!==q.id&&old.prompt!==q.prompt);
  for(const old of CHECKS){assert.ok(!q.prompt.includes(old.passage));assert.ok(!lesson.workedExample.prompt.includes(old.passage));}
 }assert.equal(ids.size,4);
});
test('guided content remains separate from every ReadingFollowUp transfer passage',()=>{
 // Inspect authored transfer content through the supported controller rather than exposing its private keys.
 let session=initialSession();for(const q of QUESTIONS)session=answer(session,q.id,(q.answer+1)%q.options.length);session=submitWriting(session,'');
 const transfer=new ReadingFollowUp(session);
 for(let i=0;i<4;i++){
  transfer.guidedAction('start');transfer.guidedAction('reveal');transfer.guidedAction('complete');
  transfer.completeLesson();const q=transfer.snapshot().question!;
  assert.ok(q,'transfer starts after teaching');
  for(const skill of skills){const flow=new ReadingGuidedTeaching(skill);flow.startPractice();assert.ok(!flow.snapshot().practice!.prompt.includes(q.passage));assert.ok(!flow.snapshot().lesson.workedExample.prompt.includes(q.passage));assert.notEqual(flow.snapshot().practice!.id,q.id);}
  transfer.answer(q.id,0);transfer.next();
 }
});
test('wrong feedback hides expected answer, retry and hints remain supported practice',()=>{
 for(const skill of skills){const flow=new ReadingGuidedTeaching(skill);flow.startPractice();flow.answer((keys[skill]+1)%flow.snapshot().practice!.options.length);
  assert.equal(flow.snapshot().feedback?.correct,false);assert.equal(flow.snapshot().feedback?.expected,null);flow.complete();assert.equal(flow.snapshot().phase,'feedback');
  flow.retry();assert.equal(flow.snapshot().feedback,null);flow.showHint();assert.ok(flow.snapshot().hint);flow.answer(keys[skill]);assert.ok(flow.snapshot().feedback?.expected);flow.complete();
  assert.equal(flow.snapshot().completion?.kind,'supported');assert.equal(flow.snapshot().completion?.independentEvidence,false);
 }
});
test('explicit reveal completes only with acknowledgment and never establishes independent evidence',()=>{
 const flow=new ReadingGuidedTeaching('main_argument');flow.revealAnswer();flow.complete();assert.equal(flow.snapshot().phase,'example');flow.startPractice();flow.revealAnswer();
 assert.equal(flow.snapshot().feedback?.correct,null);assert.equal(flow.snapshot().feedback?.revealed,true);assert.equal(flow.snapshot().completion,null);flow.complete();assert.equal(flow.snapshot().phase,'complete');assert.equal(flow.snapshot().completion?.independentEvidence,false);
});
test('snapshots, wrong-phase actions and invalid indices cannot change private content or scoring',()=>{
 const flow=new ReadingGuidedTeaching('example_function');flow.answer(2);flow.showHint();flow.retry();assert.equal(flow.snapshot().hint,null);
 readingGuidedLesson('example_function').workedExample.steps.length=0;flow.snapshot().lesson.workedExample.steps.length=0;flow.startPractice();flow.snapshot().practice!.options[2]='tampered';
 for(const value of [-1,3,NaN,Infinity,0.5])flow.answer(value);assert.equal(flow.snapshot().phase,'practice');flow.answer(2);flow.complete();
 assert.equal(flow.snapshot().lesson.workedExample.steps.length,3);assert.ok(!flow.snapshot().feedback!.expected!.includes('tampered'));const done=flow.snapshot();flow.answer(0);flow.retry();flow.revealAnswer();flow.complete();assert.deepEqual(flow.snapshot(),done);
 assert.throws(()=>new ReadingGuidedTeaching('__proto__' as ReadingSkill));assert.throws(()=>new ReadingGuidedTeaching('unknown' as ReadingSkill));
});
