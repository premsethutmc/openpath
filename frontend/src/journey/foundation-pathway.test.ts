import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
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
 s.events.push(make.enrol(c,1,'2026-27',latestReleases.find(r=>r.grade===1)!));
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
 const wrong=s.submit('gen:lin:2,17,11','12','check',{working:['2x = 23','x = 12']});
 assert.equal(wrong.decision?.verdict,'incorrect');
 const kept=s.state().selectionRecords.attempts;
 assert.equal(kept.length,1);assert.equal(kept[0].credit,false);assert.equal(kept[0].n,2);
 s.submit('gen:lin:2,17,11','11','check');
 assert.equal(s.state().selectionRecords.attempts.at(-1)?.n,3);
});

test('a weak prerequisite stays in remediation; due skills return and failed checks recover',()=>{
 const s=begin('MATH.number.subtraction');
 let remediation=false;
 for(let i=0;i<12;i++){
  const st=s.state(),id=st.next!.competency!;assert.equal(id,'MATH.number.addition');
  const m=st.module(id);
  if(['chapter','strategy','recover','guided','pause'].includes(m.phase)){remediation=true;break;}
  assert.ok(m.question);const q=question(m.question);
  s.submit(q.id,q.type==='choice'?(q.answer==='A'?'B':'A'):String(Number(q.answer)+3),m.activity??'diagnostic',{context:m.context});
 }
 assert.equal(remediation,true);
 const a=begin('MATH.number.addition');
 for(let i=0;i<60&&a.state().next?.kind!=='none';i++){
  const m=a.state().module('MATH.number.addition');
  if(m.phase==='chapter'){a.taught(m);continue;}
  assert.ok(m.question);const q=question(m.question);a.submit(q.id,q.answer,m.activity??'check',{context:m.context});
 }
 assert.equal(a.state().next?.kind,'none');a.now+=8*86400000;
 assert.equal(a.state().next?.kind,'retention');
 const due=a.state().module('MATH.number.addition');assert.equal(due.phase,'retention');assert.ok(due.question);
 const q=question(due.question);a.submit(q.id,q.type==='choice'?(q.answer==='A'?'B':'A'):String(Number(q.answer)+3),'retention',{context:due.context});
 assert.equal(a.state().next?.competency,'MATH.number.addition');assert.equal(a.state().next?.kind,'review');
 const saved=JSON.parse(JSON.stringify(events(a)));
 assert.deepEqual(learnerState(a.learnerId,saved,a.now,{currentSession:a.session}).next,a.state().next);
});


test('a cyclic prerequisite route stops without claiming completion or granting placement',()=>{
 // Node 22.18 + tsx can load this package through separate ESM and CommonJS instances.
 // Inject the same graph defect into both test fixtures; never change the production graph contract.
 const requiredGraph = (createRequire(import.meta.url)('../../../packages/learning/src/graph.ts') as { graph: typeof graph }).graph;
 const originals = [...new Set([graph, requiredGraph])].map(g => ({ g, relations: g.relationsOf }));
 for (const {g, relations} of originals) g.relationsOf=(id,opts)=>id==='MATH.number.addition'?[{from:id,type:'mandatory',source:'audit@1'}]:relations(id,opts);
 try {
  const s=begin('MATH.number.addition'),st=s.state();
  assert.equal(st.next?.kind,'none');assert.match(st.next!.reason,/route needs review/);
  assert.equal(st.selectionRecords.readinessRoute,undefined);
 } finally {for (const {g, relations} of originals) g.relationsOf=relations;}
});


test('saved demonstrated prerequisites are skipped on re-entry to an above-grade target',()=>{
 const target='MATH.number.addition-regroup',s=begin(target);
 for(let i=0;i<180&&s.state().next?.competency!==target;i++){
  const st=s.state(),id=st.next?.competency;assert.ok(id);
  const m=st.module(id);
  if(m.phase==='chapter'&&m.strategy){s.taught(m);continue;}
  assert.ok(m.question);const q=question(m.question);
  s.submit(q.id,q.answer,m.activity??'diagnostic',{context:m.context});
 }
 assert.equal(s.state().next?.competency,target);
 assert.ok(graph.get(target).gradeRange[0]>1);
 const saved=JSON.parse(JSON.stringify(events(s))),count=saved.length;
 const reentered=learnerState(s.learnerId,saved,s.now,{currentSession:'learn:pathway:new-session'});
 assert.equal(reentered.next?.competency,target,'no compulsory replay of already demonstrated grade-one modules');
 assert.equal(saved.length,count);
 assert.deepEqual(learnerState(s.learnerId,[...saved].reverse(),s.now,{currentSession:'learn:pathway:new-session'}).next,reentered.next);
});
