import test from 'node:test';import assert from 'node:assert/strict';
import {COURSE,LEVELS,questionsFor,lessonFor,type Level} from './course.ts';
import {supportingSets,assessSentences} from './check-evidence.ts';
import {ReadingUnitSession,progress,type ReadingRecord} from './session.ts';
const unit=(level:Level)=>({skill:'inference' as const,level});
function teach(s:ReadingUnitSession){for(let v=s.snapshot();v.phase==='lesson';v=s.snapshot())if(v.steps<v.lesson.worked.steps.length)s.nextStep();else s.startPractice();}
function check(s:ReadingUnitSession){for(let v=s.snapshot();v.phase==='check';v=s.snapshot()){const q=COURSE.questions.find(q=>q.id===v.question.id)!;s.selectCheckAnswer((q.answer+1)%3);s.lockCheckAnswer();s.selectCheckEvidence(supportingSets(COURSE,q)[0]);s.submitCheckEvidence();}}
test('seventh skill uses dedicated multi-clue texts with complete exact sets, no answer phrase stated and balanced choices',()=>{
 const positions=[0,0,0];let longest=0;
 for(const level of LEVELS){const u=unit(level),practice=questionsFor(COURSE,u,'practice'),checks=questionsFor(COURSE,u,'check');assert.equal(practice.length,2);assert.equal(checks.length,4);assert.ok(lessonFor(COURSE,u).worked.passage.startsWith('INF'));
 for(const q of [...practice,...checks]){assert.ok(q.passage.startsWith('INF'));const text=COURSE.passages.get(q.passage)!.text;assert.ok(!text.toLowerCase().includes(q.options[q.answer].toLowerCase()),q.id);assert.equal(COURSE.questions.filter(x=>x.passage===q.passage).length,1);for(const set of supportingSets(COURSE,q)){assert.ok(set.length>=2,q.id);for(const one of set)assert.notEqual(assessSentences(COURSE,q,[one]),'complete');}positions[q.answer]++;if(q.options.every((o,i)=>i===q.answer||o.length<q.options[q.answer].length))longest++;}}
 for(const n of positions)assert.ok(n>=8&&n<=16,`inference positions ${positions}`);assert.ok(longest/36<0.4,`longest ${longest}/36`);
});
test('all six inference units teach, require guided clue practice, then preserve independent answer/evidence results and draft recovery',()=>{
 for(const level of LEVELS){let s=new ReadingUnitSession(COURSE,unit(level),'learn');teach(s);let count=0;for(let v=s.snapshot();v.phase==='practice';v=s.snapshot()){const q=COURSE.questions.find(q=>q.id===v.practice.question.id)!;s.answerPractice(q.answer);s.nextPractice();assert.equal(s.snapshot().phase,'practice');s.selectPracticeClues([supportingSets(COURSE,q)[0][0]]);s.checkPracticeClues();const marked=s.snapshot();assert.ok(marked.phase==='practice'&&marked.practice.clues?.finding==='partial');s.nextPractice();count++;assert.ok(count<=2);}assert.equal(count,2);let v=s.snapshot();assert.ok(v.phase==='check');const id=v.question.id,q=COURSE.questions.find(q=>q.id===id)!;s.selectCheckAnswer(q.answer);s.lockCheckAnswer();s.selectCheckEvidence(supportingSets(COURSE,q)[0]);const history=s.take();s=new ReadingUnitSession(COURSE,unit(level),'learn',history);v=s.snapshot();assert.ok(v.phase==='check'&&v.draft.locked&&v.draft.sentences.length>=2);assert.deepEqual(s.take(),[]);s.submitCheckEvidence();check(s);v=s.snapshot();assert.ok(v.phase==='result');assert.equal(v.result.passed,false);assert.ok(v.result.review.every(r=>r.evidenceFinding==='complete'));assert.equal(v.result.review.filter(r=>r.correct).length,1);}
});
test('exhausted inference pool never recycles a check or blocks ordinary lesson fallback; legacy records remain intact',()=>{
 for(const level of LEVELS){const history:ReadingRecord[]=[];for(let attempt=0;attempt<2;attempt++){const s=new ReadingUnitSession(COURSE,unit(level),'check_me',history);check(s);history.push(...s.take());}const before=structuredClone(history);assert.equal(new ReadingUnitSession(COURSE,unit(level),'check_me',history).snapshot().phase,'no_fresh_check');assert.equal(new ReadingUnitSession(COURSE,unit(level),'learn',history).snapshot().phase,'lesson');assert.equal(progress(COURSE,history).seenQuestions.size,4);assert.deepEqual(history,before);}
});
test('advanced contrasts retain one-clue distractors and do not state the evaluative conclusion',()=>{
 const lunch=COURSE.questions.find(q=>q.id==='INF6.C2.inference')!;
 assert.equal(lunch.options.filter(o=>o.includes('both queues')).length,2);
 assert.equal(lunch.options.filter(o=>o.includes('until the meals arrive')).length,2);
 assert.ok(lunch.options[lunch.answer].includes('both queues')&&lunch.options[lunch.answer].includes('until the meals arrive'));
 const records=COURSE.questions.find(q=>q.id==='INF6.C4.inference')!,text=COURSE.passages.get(records.passage)!.text;
 assert.ok(!text.includes('no way to tell')&&!text.includes('overstating'));
 assert.ok(records.options.some(o=>o.startsWith('The cards can'))&&records.options.some(o=>o.startsWith('The receipts can')));
 const set=supportingSets(COURSE,records)[0];assert.equal(set.length,3);
 for(const i of set)assert.equal(assessSentences(COURSE,records,[i]),'partial');
 assert.equal(assessSentences(COURSE,records,set.slice(0,2)),'partial');
});
