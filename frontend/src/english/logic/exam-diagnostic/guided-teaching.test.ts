import test from 'node:test';import assert from 'node:assert/strict';
import {GuidedTeaching,guidedLesson} from './guided-teaching.ts';
import {JOURNEY_WRITING_CHECKS,WRITING_CHECKS,type WritingSkill} from './verification.ts';
import {REASSESSMENT} from './reassessment.ts';
const skills:WritingSkill[]=['subject_verb_agreement','articles','source_fidelity','evidence_reasoning'];
const keys:Record<WritingSkill,number>={subject_verb_agreement:1,articles:1,source_fidelity:1,evidence_reasoning:0};
test('each supported skill has a worked example, reasoning steps and separate guided practice',()=>{
 const ids=new Set<string>();for(const skill of skills){
  const lesson=guidedLesson(skill);assert.equal(lesson.skill,skill);assert.equal(lesson.workedExample.steps.length,3);assert.ok(!('practice' in lesson));
  const flow=new GuidedTeaching(skill);assert.equal(flow.snapshot().phase,'example');assert.equal(flow.snapshot().practice,null);
  flow.startPractice();const q=flow.snapshot().practice!;ids.add(q.id);
  assert.ok([...WRITING_CHECKS,...JOURNEY_WRITING_CHECKS,...REASSESSMENT].every(item=>item.id!==q.id&&item.prompt!==q.prompt&&item.prompt!==lesson.workedExample.prompt));
  assert.ok(!('answer' in q));assert.ok(!('explanation' in q));assert.equal(flow.snapshot().hint,null);assert.equal(flow.snapshot().feedback,null);
 }assert.equal(ids.size,4);
});
test('correct practice completes only after explicit acknowledgment and remains supported evidence',()=>{
 for(const skill of skills){const flow=new GuidedTeaching(skill);flow.complete();assert.equal(flow.snapshot().phase,'example');
  flow.startPractice();flow.complete();assert.equal(flow.snapshot().phase,'practice');
  flow.answer(keys[skill]);assert.equal(flow.snapshot().phase,'feedback');assert.equal(flow.snapshot().completion,null);
  flow.complete();assert.equal(flow.snapshot().phase,'complete');assert.equal(flow.snapshot().completion?.kind,'supported');assert.equal(flow.snapshot().completion?.independentEvidence,false);
  assert.match(flow.snapshot().completion!.message,/not independent evidence/);
 }
});
test('wrong answer offers explanation and retry, never marks lesson completed automatically',()=>{
 const flow=new GuidedTeaching('articles');flow.startPractice();flow.answer(0);flow.complete();assert.equal(flow.snapshot().phase,'feedback');assert.equal(flow.snapshot().feedback?.correct,false);assert.equal(flow.snapshot().feedback?.expected,null);
 flow.answer(1);assert.equal(flow.snapshot().selected,0);flow.retry();assert.equal(flow.snapshot().phase,'practice');assert.equal(flow.snapshot().feedback,null);
 flow.showHint();assert.ok(flow.snapshot().hint);flow.answer(1);flow.complete();assert.equal(flow.snapshot().completion?.independentEvidence,false);
});
test('explicit reveal allows supported completion, never an independent correct response',()=>{
 const flow=new GuidedTeaching('evidence_reasoning');flow.revealAnswer();assert.equal(flow.snapshot().phase,'example');flow.startPractice();flow.revealAnswer();
 assert.equal(flow.snapshot().feedback?.correct,null);assert.equal(flow.snapshot().feedback?.revealed,true);flow.retry();assert.equal(flow.snapshot().phase,'feedback');flow.complete();
 assert.equal(flow.snapshot().completion?.kind,'supported');assert.equal(flow.snapshot().completion?.independentEvidence,false);
});
test('out-of-order, invalid and repeated actions cannot alter a locked completed result',()=>{
 const flow=new GuidedTeaching('source_fidelity');flow.answer(1);flow.showHint();flow.retry();assert.equal(flow.snapshot().hint,null);flow.startPractice();
 for(const index of [-1,2,NaN,Infinity,0.5])flow.answer(index);assert.equal(flow.snapshot().phase,'practice');flow.answer(1);flow.complete();const done=flow.snapshot();
 flow.startPractice();flow.answer(0);flow.showHint();flow.retry();flow.revealAnswer();flow.complete();assert.deepEqual(flow.snapshot(),done);
});
test('snapshots and lesson accessor cannot mutate private keys or content',()=>{
 const flow=new GuidedTeaching('subject_verb_agreement');const lesson=guidedLesson('subject_verb_agreement');lesson.workedExample.steps.length=0;
 flow.snapshot().lesson.workedExample.steps.length=0;flow.startPractice();flow.snapshot().practice!.options[1]='tampered';flow.answer(1);
 assert.equal(flow.snapshot().lesson.workedExample.steps.length,3);assert.equal(flow.snapshot().feedback?.expected,'switch on');assert.equal(flow.snapshot().feedback?.correct,true);
 assert.throws(()=>new GuidedTeaching('unknown' as WritingSkill));assert.throws(()=>new GuidedTeaching('__proto__' as WritingSkill));
});
