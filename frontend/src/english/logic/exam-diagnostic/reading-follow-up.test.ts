import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ReadingFollowUp } from './reading-follow-up.ts';
import { initialSession, answer, submitWriting, QUESTIONS, CHECKS } from './session.ts';
function teach(flow:ReadingFollowUp){flow.guidedAction('start');flow.guidedAction('reveal');flow.guidedAction('complete');flow.completeLesson();}
function initial(wrongSkills: string[]) {
  let s = initialSession();
  for (const q of QUESTIONS) s = answer(s, q.id, wrongSkills.includes(q.skill) ? (q.answer + 1) % q.options.length : q.answer);
  return submitWriting(s, '');
}
test('only initial possible gaps get a lesson and fresh transfer, with limited evidence', () => {
  const flow = new ReadingFollowUp(initial(['main_argument']));
  assert.equal(flow.snapshot().phase, 'lesson');
  assert.equal(flow.snapshot().lesson?.skill, 'main_argument');
  assert.equal(flow.snapshot().question, null);
  teach(flow);
  const q = flow.snapshot().question!;
  assert.equal(q.id, 'journey-reading-main-1');
  assert.equal('answer' in q, false); assert.equal('explanation' in q, false);
  flow.answer(q.id, ({main_argument:1,supported_inference:0,example_function:2,evidence_limits:1} as Record<string,number>)[q.skill]);
  assert.equal(flow.snapshot().results[0].outcome, 'supported_after_lesson');
  assert.match(flow.snapshot().results[0].scope, /not proof/);
  flow.next(); assert.equal(flow.snapshot().phase, 'complete');
});
test('cannot answer before teaching, skip a check, submit invalid answers, or revise a submitted answer', () => {
  const flow = new ReadingFollowUp(initial(['main_argument']));
  flow.answer('journey-reading-main-1', 1); flow.next();
  assert.equal(flow.snapshot().phase, 'lesson');
  teach(flow); teach(flow);
  assert.deepEqual(flow.snapshot().seenIds, ['journey-reading-main-1']);
  for (const value of [-1, 99, NaN, 0.5]) flow.answer('journey-reading-main-1', value);
  flow.answer('other', 1); flow.next();
  assert.equal(flow.snapshot().phase, 'check');
  flow.answer('journey-reading-main-1', 0); flow.answer('journey-reading-main-1', 1);
  assert.equal(flow.snapshot().answer, 0);
  assert.equal(flow.snapshot().results[0].outcome, 'needs_more_practice');
});
test('display without submission uses exposure and cannot become fresh again', () => {
  const session = initial(['main_argument']);
  const first = new ReadingFollowUp(session); teach(first);
  const second = new ReadingFollowUp(session, first.snapshot().seenIds);
  assert.equal(second.snapshot().phase, 'complete');
  assert.equal(second.snapshot().results[0].outcome, 'no_fresh_item');
  assert.equal(second.snapshot().question, null);
});
test('exhausted skills do not block other fresh skills', () => {
  const flow = new ReadingFollowUp(initial(['main_argument', 'evidence_limits']), ['journey-reading-main-1']);
  assert.equal(flow.snapshot().results[0].outcome, 'no_fresh_item');
  assert.equal(flow.snapshot().lesson?.skill, 'evidence_limits');
  teach(flow); flow.answer('journey-reading-evidence-1', 0); flow.next();
  assert.equal(flow.snapshot().phase, 'complete'); assert.equal(flow.snapshot().results.length, 2);
});
test('no initial wrong response means no invented gaps or unnecessary teaching', () => {
  const flow = new ReadingFollowUp(initial([]));
  assert.equal(flow.snapshot().phase, 'complete'); assert.deepEqual(flow.snapshot().results, []);
});
test('snapshots and constructor inputs cannot mutate internal scoring or exposure', () => {
  const seen: string[] = [];
  const flow = new ReadingFollowUp(initial(['main_argument']), seen); seen.push('journey-reading-main-1');
  flow.snapshot().skills.length = 0; teach(flow);
  const snap = flow.snapshot(); snap.seenIds.length = 0; snap.question!.options[1] = 'tampered';
  flow.answer('journey-reading-main-1', 1);
  assert.equal(flow.snapshot().results[0].outcome, 'supported_after_lesson');
  assert.ok(!flow.snapshot().results[0].explanation.includes('tampered'));
  assert.deepEqual(flow.snapshot().seenIds, ['journey-reading-main-1']);
});
test('incomplete or invalid initial sessions are rejected', () => {
  assert.throws(() => new ReadingFollowUp(initialSession()));
  assert.throws(() => new ReadingFollowUp({ ...initial([]), phase: 'reading' }));
});
test('all four gaps pass through distinct teaching, check, feedback steps', () => {
  const flow = new ReadingFollowUp(initial(QUESTIONS.map(q => q.skill)));
  for (let i = 0; i < 4; i++) {
    assert.equal(flow.snapshot().phase, 'lesson'); teach(flow);
    const q = flow.snapshot().question!;
    flow.answer(q.id, ({main_argument:1,supported_inference:0,example_function:2,evidence_limits:1} as Record<string,number>)[q.skill]); flow.next();
  }
  assert.equal(flow.snapshot().phase, 'complete');
  assert.equal(new Set(flow.snapshot().seenIds).size, 4);
  assert.ok(flow.snapshot().results.every(r => r.outcome === 'supported_after_lesson'));
});

test('legacy preview practice items are not recycled as new transfer evidence', () => {
  const flow = new ReadingFollowUp(initial(QUESTIONS.map(q => q.skill)), CHECKS.map(q => q.id));
  for (let i = 0; i < 4; i++) {
    teach(flow); const q = flow.snapshot().question!;
    assert.ok(!CHECKS.some(old => old.id === q.id || old.passage === q.passage || old.prompt === q.prompt));
    flow.answer(q.id, 0); flow.next();
  }
  assert.equal(flow.snapshot().phase, 'complete');
  assert.ok(flow.snapshot().results.every(r => r.outcome !== 'no_fresh_item'));
});
test('reading guided practice cannot be skipped and never adds independent evidence',()=>{
 const flow=new ReadingFollowUp(initial(['main_argument']));flow.completeLesson();assert.equal(flow.snapshot().phase,'lesson');assert.deepEqual(flow.snapshot().seenIds,[]);
 flow.guidedAction('complete');flow.completeLesson();assert.equal(flow.snapshot().phase,'lesson');
 flow.guidedAction('start');flow.guidedAction('hint');flow.guidedAction('reveal');flow.guidedAction('complete');assert.deepEqual(flow.snapshot().results,[]);assert.deepEqual(flow.snapshot().seenIds,[]);
 flow.completeLesson();assert.equal(flow.snapshot().phase,'check');assert.equal(flow.teachingSnapshot(),null);assert.deepEqual(flow.snapshot().seenIds,['journey-reading-main-1']);
 const before=flow.snapshot();flow.guidedAction('answer',1);assert.deepEqual(flow.snapshot(),before);
});
