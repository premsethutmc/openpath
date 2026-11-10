import { presentedProblems } from "../../../packages/learning/src/skill-units";
import { currentRevision,contentEligibility } from "../../../packages/learning/src/explanation-review";
import { SliceSession } from "../journey/session";
import { make, learnerState } from "../../../packages/learning/src/session";
import { withDecisions } from "../../../packages/learning/src/records";
import blueprints from "../../../content/learning/blueprints.v1.json";
import { synthesise,type Blueprint } from "../../../packages/learning/src/library";
import test from 'node:test';
import assert from 'node:assert/strict';
import { A,B,INITIAL_C,clampC,triangleAngles } from './triangle';
import { moduleFor,question } from '../../../packages/learning/src/content';
import { problemKeyOf } from '../../../packages/learning/src/families';
const distance=(p:readonly number[],q:readonly number[])=>Math.hypot(p[0]-q[0],p[1]-q[1]);
test('triangle measurements agree with independent cosine-law angles, including obtuse shapes',()=>{
  for(let x=0;x<=6;x+=.25)for(let y=.1;y<=5.5;y+=.25){
    const c=[x,y] as const, [aa,bb,cc]=[distance(B,c),distance(A,c),distance(A,B)];
    const expected=[[bb,cc,aa],[aa,cc,bb],[aa,bb,cc]].map(([u,v,w])=>Math.acos(Math.max(-1,Math.min(1,(u*u+v*v-w*w)/(2*u*v))))*180/Math.PI);
    const actual=triangleAngles(c)!;
    actual.forEach((a,i)=>assert.ok(Math.abs(a-expected[i])<1e-8));
    assert.ok(Math.abs(actual.reduce((a,b)=>a+b,0)-180)<1e-10);
  }
});
test('flat, non-finite and outside-domain positions never claim a triangle; reset retains exact example',()=>{
  for(const c of [[0,0],[3,0],[6,0],[3,.05],[-1,2],[7,2],[3,6],[NaN,2],[3,Infinity]] as const)assert.equal(triangleAngles(c),null);
  assert.deepEqual(clampC(-4,10),[0,5.5]);assert.deepEqual(clampC(NaN,2),INITIAL_C);
  triangleAngles(INITIAL_C)!.forEach((a,i)=>assert.ok(Math.abs(a-[30,90,60][i])<1e-10));
});
test('triangle reasoning teaches the same task as fresh guided and independent questions',()=>{
  const s=moduleFor('MATH.geometry.triangle-properties')!.strategies.find(s=>s.id==='worked_steps')!;
  assert.ok(s);assert.deepEqual(s.scope,{family:'ahtri',subSkill:'triangle-properties.angle-sum@1'});
  assert.equal(question(s.guided).answer,'42');assert.equal(question(s.check).answer,'99');
  assert.notEqual(problemKeyOf(s.guided),problemKeyOf(s.check));
  for(const sc of s.screens.filter(b=>b.section!=='method')) {assert.ok(['gen:ahtri:30,90','gen:ahtri:56,85'].includes(sc.instance!));assert.notEqual(problemKeyOf(sc.instance!),problemKeyOf(s.check));}
});

test('replacement keeps the old lesson record ID and refuses missing IDs or another family',()=>{
  const blueprint=blueprints.blueprints.find(b=>b.competency==='MATH.geometry.triangle-properties')! as Blueprint;
  const replacement=blueprint.strategies.find(s=>s.replaceTemplateStrategy)!;
  assert.equal(replacement.id,'worked_steps');
  assert.throws(()=>synthesise({...blueprint,strategies:[{...replacement,id:'unknown'}]},'test'),/existing template ID/);
  assert.throws(()=>synthesise({...blueprint,strategies:[{...replacement,scope:{family:'ahext'}}]},'test'),/question family/);
});

test('old worked_steps teaching and answers still resume without invented mastery',()=>{
  const cid='MATH.geometry.triangle-properties', s=new SliceSession('synthetic-old-triangle',cid,Date.parse('2026-11-09T08:00:00Z'));
  s.events.push(make.teach({learnerId:s.learnerId,sessionId:s.session,at:new Date(s.now).toISOString()},cid,'worked_steps','procedural'));
  assert.equal(question('gen:ahtri:56,29').answer,'95');assert.equal(question('gen:ahtri:25,65').answer,'90');
  assert.equal(s.submit('gen:ahtri:56,29','95','guided').credit,true);
  assert.equal(s.submit('gen:ahtri:25,65','90','check').credit,true);
  assert.ok(presentedProblems(s.state().records,moduleFor).has(problemKeyOf('gen:ahtri:56,85')));
  const before=JSON.stringify({events:s.events,decisions:s.decisions}), state=s.state();
  const restored=JSON.parse(before), again=learnerState(s.learnerId,withDecisions(restored.events,restored.decisions),s.now,{currentSession:s.session});
  assert.deepEqual(again.module(cid),state.module(cid));
  assert.deepEqual(again.records.attempts,state.records.attempts);
  assert.notEqual(state.evidence(cid).status,'verified');
  assert.equal(JSON.stringify({events:s.events,decisions:s.decisions}),before);
});

test('the revised selected explanation remains scoped and pending, never approved by the interaction',()=>{
  const m=moduleFor('MATH.geometry.triangle-properties')!,s=m.strategies.find(s=>s.id==='worked_steps')!;
  assert.equal(currentRevision(m,s)?.revision.status,'pending_review');
  const evaluation=contentEligibility(m,s,{competency:m.competency,usage:'lesson',mode:'supervised-evaluation'});
  assert.equal(evaluation.eligible,false);assert.equal(evaluation.educatorApproved,false);
});
