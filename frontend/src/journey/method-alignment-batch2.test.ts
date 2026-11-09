import test from 'node:test';import assert from 'node:assert/strict';
import manifest from '../../../content/learning/method-alignment.v1.json';
import{moduleFor,question}from '../../../packages/learning/src/content';
import{methodCompatibility,methodRequirements,selectAligned,establishedMethods}from '../../../packages/learning/src/method-alignment';
import{guidedItem,blockCheck}from '../../../packages/learning/src/intervention';
import{make}from '../../../packages/learning/src/session';import{readRecords}from '../../../packages/learning/src/records';import{problemKeyOf,FAMILIES,problemOf}from '../../../packages/learning/src/families';import{modulePhasePool}from '../../../packages/learning/src/library';import{useReviewFixture}from '../../../packages/learning/src/evidence';import{SliceSession}from './session';
const batch=manifest.lessons.slice(5);
for(const row of batch)test(`${row.competency}/${row.strategy}: fresh compatible follow-ups, unknown, exhaustion and legacy reload`,()=>{
 const m=moduleFor(row.competency)!,s=m.strategies.find(s=>s.id===row.strategy)!,x=new SliceSession('alignment-batch',m.competency);
 x.events.push(make.teach({learnerId:x.learnerId,sessionId:x.session,at:new Date(x.now).toISOString()},m.competency,s.id,'procedural'));
 const r=x.state().records,g=guidedItem(m,s,r),c=blockCheck(m,s,r);assert.ok(g);assert.ok(c);for(const id of [g,c])assert.equal(methodCompatibility(m,s,id!).status,'covered');assert.notEqual(problemKeyOf(g!),problemKeyOf(c!));
 assert.equal(methodCompatibility(m,{...s,screens:[]},c!).status,'unknown');assert.equal(methodCompatibility(m,s,'gen:mul:3,4').status,'unknown');
 const ids=[s.guided,s.check,...modulePhasePool(m,'practice'),...modulePhasePool(m,'check')];assert.equal(selectAligned(m,s,ids,new Set(ids.map(problemKeyOf))).status,'no-fresh-question');
 assert.equal(guidedItem(m,s,readRecords(x.learnerId,JSON.parse(JSON.stringify(x.events)))) ,g);
 delete (x.events[0] as any).methodAlignment;assert.equal(guidedItem(m,s,x.state().records),s.guided,'old configured question retained for legacy records');
});
test('real configured mismatches are blocked, not counted as compatible',()=>{
 const pairs=[['MATH.geometry.triangle-properties','isosceles_base','gen:ahiso:57,1:mc'],['MATH.geometry.triangle-properties','isosceles_vertex','gen:ahiso:142,0:mc'],['MATH.geometry.triangle-properties','exterior_via_third','gen:ahext:44,76,1'],['MATH.geometry.pythagoras','worked_steps','gen:ahpyth:16,30,0'],['MATH.number.fraction-multiply','worked_steps','gen:avfwq:5,9,9,1'],['MATH.calculus.integration-methods','why_du','gen:subst:0,1,3,1']];
 for(const[cid,sid,id]of pairs){const m=moduleFor(cid)!,s=m.strategies.find(s=>s.id===sid)!;assert.equal(methodCompatibility(m,s,id).status,'incompatible');assert.equal(methodCompatibility(m,s,id,new Set(),'diagnostic').status,'diagnostic');assert.equal(methodCompatibility(m,s,id,new Set(methodRequirements(id)!)).status,'covered')}
});
test('Pythagoras requirement reuses the generator case; triples are not silently claimed covered',()=>{for(const id of ['gen:ahpyth:16,30,0','gen:ahpyth:16,30,1','gen:ahpyth:16,30,2']){const p=problemOf(id)!;assert.deepEqual(methodRequirements(id),['ahpyth:'+FAMILIES.get('ahpyth')!.teach!.caseOf!(p.params)])}const m=moduleFor('MATH.geometry.pythagoras')!;assert.equal(methodCompatibility(m,m.strategies.find(s=>s.id==='triples')!,'gen:ahpyth:11,60,0').status,'unknown');
 // foundations fix (2026-11-09): squares_on_sides now teaches a shorter side step by step, so it covers both cases (pending educator review)
 const sq=m.strategies.find(s=>s.id==='squares_on_sides')!;for(const id of ['gen:ahpyth:16,30,0','gen:ahpyth:16,30,1','gen:ahpyth:16,30,2'])assert.equal(methodCompatibility(m,sq,id).status,'covered')});
test('substitution numerical answers do not establish missing antiderivative working',()=>{const x=new SliceSession('prior-substitution','MATH.calculus.integration-methods');for(const id of ['gen:subst:0,1,1,1','gen:subst:0,1,2,1'])x.submit(id,question(id).answer,'diagnostic');useReviewFixture({all:true,items:[],releasedAt:'2020-01-01'});try{const r=x.state().records;assert.equal(establishedMethods(r,'9999').has('integrate-u-power-1'),false);for(const a of r.attempts)a.assessment={policy:'assessment@1',answerCorrect:true,methodExamined:true,derivationVerified:true,firstError:null,clarificationRequired:false,aiFallbackUsed:false,unresolved:false,source:'kernel'};assert.ok(establishedMethods(r,'9999').has('integrate-u-power-1'))}finally{useReviewFixture(null)}});
