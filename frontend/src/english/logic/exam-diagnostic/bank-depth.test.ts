import test from 'node:test';import assert from 'node:assert/strict';
import {JOURNEY_WRITING_CHECKS as BANK,WRITING_CHECKS,WRITING_LESSONS,firstUnseenPair,verifyWritingSkill,type WritingSkill} from './verification.ts';
import {REASSESSMENT,reassessmentFor} from './reassessment.ts';
import {ExamJourney,EXAMPLE_WRITING} from './journey.ts';
import {QUESTIONS} from './session.ts';
const skills:WritingSkill[]=['subject_verb_agreement','articles','source_fidelity','evidence_reasoning'];
test('two complete forms per skill; all journey/retest IDs and prompts are distinct and authored keys valid',()=>{
 const all=[...BANK,...REASSESSMENT];
 assert.equal(new Set(all.map(q=>q.id)).size,32);assert.equal(new Set(all.map(q=>q.prompt)).size,32);
 for(const bank of [BANK,REASSESSMENT])for(const skill of skills){
  const first=firstUnseenPair(bank,skill,[]),second=firstUnseenPair(bank,skill,first.map(q=>q.id));
  assert.equal(first.length,2);assert.equal(second.length,2);assert.deepEqual(firstUnseenPair(bank,skill,[...first,...second].map(q=>q.id)),[]);
  for(const q of [...first,...second]){assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);assert.ok(q.explanation);assert.ok(!WRITING_LESSONS[skill].includes(q.prompt));}
 }
});
test('partial exposure retires whole form; selection never mixes forms or exposed items',()=>{
 for(const bank of [BANK,REASSESSMENT])for(const skill of skills){
  const first=firstUnseenPair(bank,skill,[]),second=firstUnseenPair(bank,skill,[first[0].id]);
  assert.equal(second.length,2);assert.ok(second.every(q=>q.form==='2'));
  assert.deepEqual(firstUnseenPair(bank,skill,[first[1].id,second[0].id]),[]);
 }
});
test('verification scores only the selected complete form, not answers borrowed from another form',()=>{
 for(const skill of skills){
  const first=firstUnseenPair(BANK,skill,[]),seen=[first[0].id],second=firstUnseenPair(BANK,skill,seen);
  const answers=Object.fromEntries(second.map(q=>[q.id,q.answer]));
  assert.equal(verifyWritingSkill(skill,answers,seen,BANK).correct,2);
  assert.equal(verifyWritingSkill(skill,answers,[],BANK).correct,null);
  delete answers[second[0].id];answers[first[1].id]=first[1].answer;
  assert.equal(verifyWritingSkill(skill,answers,seen,BANK).correct,null);
 }
});
test('legacy default bank stays one form and defensive copies cannot alter scoring',()=>{
 assert.equal(WRITING_CHECKS.length,8);
 const pair=firstUnseenPair(BANK,'articles',[]);pair[0].answer=999;
 assert.notEqual(firstUnseenPair(BANK,'articles',[])[0].answer,999);
 assert.deepEqual(firstUnseenPair(WRITING_CHECKS,'articles',['writing-articles-1']),[]);
 assert.equal(reassessmentFor(['articles','articles'],[]).length,2);
});
test('two synthetic sittings get separate checks and retests; third sitting reports exhaustion',async()=>{
 let seen:string[]=[];const oldIds=new Set<string>();
 for(let sitting=0;sitting<2;sitting++){
  const flow=new ExamJourney(undefined,undefined,seen);for(const q of QUESTIONS)flow.reading(q.id,q.answer);
  await flow.analyse(EXAMPLE_WRITING,true);assert.equal(flow.snapshot().checks.length,8);
  for(const q of flow.snapshot().checks){assert.ok(!oldIds.has(q.id));oldIds.add(q.id);flow.answer(q.id,1-BANK.find(item=>item.id===q.id)!.answer);}
  flow.finishChecks();for(const skill of flow.snapshot().lessons)flow.markTaught(skill);flow.startReassessment();
  assert.equal(flow.snapshot().fresh.length,8);
  for(const q of flow.snapshot().fresh){assert.ok(!oldIds.has(q.id));oldIds.add(q.id);flow.answer(q.id,REASSESSMENT.find(item=>item.id===q.id)!.answer);}
  flow.finish();assert.ok(flow.summary().every(r=>r.correct===0&&r.after===2));seen=flow.snapshot().seen;
 }
 const third=new ExamJourney(undefined,undefined,seen);for(const q of QUESTIONS)third.reading(q.id,q.answer);await third.analyse(EXAMPLE_WRITING,true);
 assert.equal(third.snapshot().checks.length,0);assert.equal(third.snapshot().phase,'complete');assert.deepEqual(reassessmentFor(skills,seen),[]);
});
