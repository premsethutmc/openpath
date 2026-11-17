import assert from 'node:assert/strict';
import {test} from 'node:test';
import {SyntheticWritingWorkflow,SYNTHETIC_WRITING_SAMPLE} from './workflow.ts';
import {WRITING_CHECKS} from './verification.ts';
import type {SyntheticWritingPost} from './model.ts';

test('fixed invented sample -> tentative observations -> fresh independent checks -> teaching',async()=>{
  assert.ok(SYNTHETIC_WRITING_SAMPLE.split(/\s+/).length>=50);
  const flow=new SyntheticWritingWorkflow();
  await flow.analyse();
  const s=flow.snapshot();
  assert.equal(s.phase,'checks'); assert.equal(s.checks.length,4); assert.equal(s.results.length,0);
  flow.finishChecks(); assert.equal(flow.snapshot().phase,'checks');
  s.checks.forEach(q=>flow.answer(q.id,1-q.answer)); flow.finishChecks();
  assert.equal(flow.snapshot().phase,'results');
  assert.ok(flow.snapshot().results.every(r=>r.outcome==='needs_practice' && !!r.lesson && !r.calibrated));
  flow.answer(s.checks[0].id,s.checks[0].answer); assert.equal(flow.snapshot().answers[s.checks[0].id],1-s.checks[0].answer);
});
test('reset preserves exposure, partial attempts and repeat runs are not fresh evidence',async()=>{
  const flow=new SyntheticWritingWorkflow(); await flow.analyse();
  const seen=flow.snapshot().checks.map(q=>q.id);
  flow.answer(seen[0],0); flow.reset();
  assert.deepEqual(flow.snapshot().seenIds,seen);
  await flow.analyse();
  assert.equal(flow.snapshot().checks.length,0);
  assert.ok(flow.snapshot().results.every(r=>r.outcome==='inconclusive' && r.lesson===null));
});
test('reset invalidates asynchronous completion and errors, repeated starts do not duplicate requests',async()=>{
  let reject!:(error:Error)=>void; let calls=0;
  const post:SyntheticWritingPost=()=>{calls++;return new Promise((_,r)=>{reject=r;});};
  const flow=new SyntheticWritingWorkflow(post);
  const pending=flow.analyse(); await flow.analyse(); assert.equal(calls,1);
  flow.reset(); reject(new Error('late')); await pending;
  assert.equal(flow.snapshot().phase,'idle'); assert.equal(flow.snapshot().error,null);
});
test('failed transport gives no observations or inferred lesson; only fixed text is passed',async()=>{
  const flow=new SyntheticWritingWorkflow(async body=>{
    assert.equal((body.request as {essay:{text:string}}).essay.text,SYNTHETIC_WRITING_SAMPLE);
    throw new Error('provider token must not be exposed');
  });
  await flow.analyse(); const s=flow.snapshot();
  assert.equal(s.phase,'error');assert.deepEqual(s.observations,[]);assert.deepEqual(s.results,[]);
  assert.ok(!s.error?.includes('token'));
});
test('snapshots and invalid answers cannot alter scoring or the protected answer key',async()=>{
  assert.ok(Object.isFrozen(WRITING_CHECKS));assert.ok(Object.isFrozen(WRITING_CHECKS[0]));assert.ok(Object.isFrozen(WRITING_CHECKS[0].options));
  const flow=new SyntheticWritingWorkflow();await flow.analyse();
  const s=flow.snapshot();s.checks[0].answer=99;s.seenIds.length=0;
  flow.answer('unknown',0);flow.answer(s.checks[0].id,NaN);flow.answer(s.checks[0].id,99);
  assert.deepEqual(flow.snapshot().answers,{});assert.equal(flow.snapshot().seenIds.length,4);
  flow.snapshot().checks.forEach(q=>flow.answer(q.id,q.answer));flow.finishChecks();
  assert.ok(flow.snapshot().results.every(r=>r.outcome==='no_gap_shown' && r.lesson===null));
});
test('successful stale response after reset cannot restore old checks',async()=>{
  let resolve!:(value:unknown)=>void;
  let request: {essay:{id:string};rubric:string}|undefined;
  const flow=new SyntheticWritingWorkflow(body=>{
    request=body.request as typeof request;
    return new Promise(r=>{resolve=r;});
  });
  const pending=flow.analyse();flow.reset();
  resolve({evaluator:{id:'local-exam-fixture',version:'fixture@1',model:'simulated-not-a-model',rubric:'openpath.exam-writing@1',protocol:'essay-observe.v2'},output:{essay_id:request!.essay.id,rubric:request!.rubric,observations:[],not_observable:[]}});
  await pending;assert.equal(flow.snapshot().phase,'idle');assert.deepEqual(flow.snapshot().seenIds,[]);
});
