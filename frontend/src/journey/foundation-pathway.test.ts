import test from 'node:test';
import assert from 'node:assert/strict';
import { learnerState, make } from '../../../packages/learning/src/session';
import { latestReleases } from '../../../packages/learning/src/curricula';
import { graph } from '../../../packages/learning/src/graph';
import { moduleFor, question } from '../../../packages/learning/src/content';
import { withDecisions } from '../../../packages/learning/src/records';
import { SliceSession } from './session';
const t = Date.parse('2026-01-01T00:00:00Z');
function begin(target: string) {
 const s = new SliceSession('pathway', target, t); s.session='learn:pathway:s1';
 const c={learnerId:s.learnerId,sessionId:s.session,at:new Date(t-2000).toISOString()};
 s.events.push(make.enrol(c,1,'2026',latestReleases.find(r=>r.grade===1)!));
 s.events.push(make.pathway({...c,at:new Date(t-1000).toISOString()},target));
 return s;
}
const events=(s:SliceSession)=>withDecisions(s.events,s.decisions);
test('persisted planner moves through prerequisites and above starting grade; reload and replay agree',()=>{
 const target='MATH.number.addition-regroup',s=begin(target),visited=new Set<string>();
 for(let i=0;i<180;i++){
  const state=s.state(), n=state.next!;
  if(n.kind==='none') {assert.match(n.reason,/requirements.*shown/,JSON.stringify({n,visited:[...visited]}));break;}
  assert.ok(n.competency);visited.add(n.competency);
  const m=state.module(n.competency);
  if(m.phase==='chapter'&&m.strategy){s.taught(m);continue;}
  assert.ok(m.question,JSON.stringify({n,m}));
  const q=question(m.question);
  s.submit(q.id,q.answer,m.activity??'diagnostic',{context:m.context});
  assert.ok(i<179,'path must terminate without repeating busywork');
 }
 assert.ok(visited.has('MATH.number.addition'));
 assert.ok(visited.has('MATH.number.subtraction'));
 assert.ok(visited.has(target),JSON.stringify([...visited]));
 assert.ok(graph.get(target).gradeRange[0]>1);
 const saved=JSON.parse(JSON.stringify(events(s))),a=learnerState(s.learnerId,saved,s.now,{currentSession:s.session});
 assert.deepEqual(a.next,s.state().next);
 assert.deepEqual(learnerState(s.learnerId,[...saved].reverse(),s.now,{currentSession:s.session}).next,a.next);
});
test('unknown prerequisite evidence probes rather than inventing weakness or readiness',()=>{
 const s=begin('MATH.number.subtraction');
 assert.equal(s.state().next?.competency,'MATH.number.addition');
 assert.equal(s.state().next?.kind,'start');
 const q=question(s.state().module('MATH.number.addition').question!);
 // A client assertion cannot satisfy the new policy, even with correct text.
 const c={learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()};
 s.events.push(make.attempt(c,q.id,q.answer,'check'));
 assert.equal(s.state().next?.competency,'MATH.number.addition');
 assert.equal(s.state().next?.kind,'start');
});
test('unsupported target stops; disabling the opt-in restores the ordinary plan',()=>{
 const target=graph.competencies.find(c=>!moduleFor(c.id))!.id,s=begin(target);
 assert.equal(s.state().next?.kind,'none');assert.match(s.state().next!.reason,/does not yet have/);
 s.events.push(make.pathway({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()},target,false));
 const legacy=events(s).filter(e=>(e as {record?:string}).record!=='foundation_pathway');
 assert.deepEqual(s.state().next,learnerState(s.learnerId,legacy,s.now,{currentSession:s.session}).next);
});

test('readiness placement is confined to the selected route and invalid methods supply no readiness',()=>{
 const s=begin('MATH.number.addition');
 assert.deepEqual(s.state().selectionRecords.readinessRoute,['MATH.number.addition']);
 assert.equal(s.state().module('MATH.algebra.linear-equations').requirementsMet,undefined);
 const reply=s.submit('gen:lin:2,17,11','11','check',{working:['2x = 23','x = 11']});
 assert.equal(reply.decision?.verdict,'correct');assert.equal(reply.decision?.working?.status,'invalid');
 assert.equal(s.state().selectionRecords.attempts.length,0);
 assert.ok(s.state().selectionRecords.unresolved.some(r=>r.questionId==='gen:lin:2,17,11'));
});
