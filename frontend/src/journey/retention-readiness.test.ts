import test from 'node:test';
import assert from 'node:assert/strict';
import { SliceSession } from './session';
import { foundationPlan, FOUNDATION_POLICY, type FoundationPolicy } from '../../../packages/learning/src/foundation';
import { SCALED_BARS_CONFIG } from '../../../packages/learning/src/subskill-config-scale';
import { phasePool, problemOf, exposureKey } from '../../../packages/learning/src/families';
import { question } from '../../../packages/learning/src/content';
import { withDecisions } from '../../../packages/learning/src/records';
import { projectFromEventsWith } from '../../../packages/learning/src/subskill-projection';
const skill='scaled-bars.total@1', prerequisite='MATH.statistics.bar-charts';
const policy:FoundationPolicy={version:FOUNDATION_POLICY,config:SCALED_BARS_CONFIG,placement:'readiness',requirements:SCALED_BARS_CONFIG.core.map(skill=>({skill,method:false}))};
const saved=(s:SliceSession)=>withDecisions(s.events,s.decisions);
function demonstrated(){
 const s=new SliceSession('retention-readiness',SCALED_BARS_CONFIG.competency,Date.parse('2026-01-01T00:00:00Z'));
 const ids=phasePool('afbar','check').filter(id=>!id.endsWith(':mc')&&problemOf(id)!.params[1]===2).slice(0,12);
 assert.equal(ids.length,12);
 for(const id of ids) assert.equal(s.submit(id,question(id).answer,'check').credit,true);
 s.wait(9);return s;
}
test('initial readiness still requires prerequisite evidence',()=>{
 const s=new SliceSession('initial-readiness',policy.config.competency,Date.parse('2026-01-01T00:00:00Z'));
 const p=foundationPlan(policy,s.learnerId,saved(s),s.now,{trustedOnly:true});
 assert.equal(p.status,'unavailable');assert.equal(p.question,null);assert.ok(p.reason.includes(prerequisite));
});
test('trusted demonstrated target gets delayed check and recovery without claiming prerequisite mastery',()=>{
 const s=demonstrated(),before=saved(s),snapshot=JSON.stringify(before),prereq=s.state().evidence(prerequisite);
 const projected=projectFromEventsWith(policy.config,s.learnerId,before,s.now);
 assert.equal(projected.subSkills.find(x=>x.id===skill)!.status,'retention-due');
 assert.equal(projected.subSkills.find(x=>x.id===skill)!.historical.everDemonstrated,true);
 assert.equal(prereq.attempts.length,0);
 const p=foundationPlan(policy,s.learnerId,before,s.now,{trustedOnly:true});
 assert.equal(p.status,'retention');assert.equal(p.skill,skill);assert.ok(p.question);
 assert.equal(problemOf(p.question)!.params[1],2);
 assert.ok(!s.events.some(e=>'questionId' in e&&exposureKey(e.questionId as string)===exposureKey(p.question!)));
 assert.equal(JSON.stringify(before),snapshot,'planning does not rewrite the ledger');
 assert.deepEqual(foundationPlan(policy,s.learnerId,JSON.parse(snapshot).reverse(),s.now,{trustedOnly:true}),p);
 assert.equal(s.submit(p.question,'-999','retention').credit,false);
 const recovery=foundationPlan(policy,s.learnerId,saved(s),s.now,{trustedOnly:true});
 assert.equal(recovery.status,'recovery');assert.equal(recovery.skill,skill);assert.ok(recovery.question);
 assert.equal(problemOf(recovery.question)!.params[1],2);assert.notEqual(exposureKey(recovery.question),exposureKey(p.question));
 assert.equal(s.submit(recovery.question,question(recovery.question).answer,'check').credit,true);
 assert.deepEqual(s.state().evidence(prerequisite),prereq);
 assert.equal(projectFromEventsWith(policy.config,s.learnerId,saved(s),s.now).subSkills.find(x=>x.id===skill)!.historical.everDemonstrated,true);
});
test('missing and client-forged decisions cannot bypass readiness, including preview callers',()=>{
 const s=demonstrated();
 for(const kind of ['missing','client'] as const){
 const events=saved(s).map(e=>{if(e.record!=='attempt')return e;const {decision,...rest}=e as typeof e&{decision?:Record<string,unknown>};return kind==='missing'?rest:{...rest,decision:{...decision,decidedBy:'client'}};});
 for(const trustedOnly of [true,false]){
 const p=foundationPlan(policy,s.learnerId,events,s.now,{trustedOnly});
 assert.equal(p.status,'unavailable',`${kind}/${trustedOnly}`);assert.equal(p.question,null);assert.ok(p.reason.includes(prerequisite));
 }
 }
});

test('ignored markers and conflicting duplicate records cannot lend server provenance',()=>{
 const s=demonstrated(),trusted=saved(s);
 const bare=trusted.map(e=>{const {decision,...rest}=e as typeof e&{decision?:unknown};return rest;});
 for(const variant of ['ignored-kind','invalid-time','later-duplicate','same-time-duplicate'] as const){
 const markers=trusted.filter(e=>e.record==='attempt').map(e=>({...e,
   ...(variant==='ignored-kind'?{kind:'ignored'}:variant==='invalid-time'?{at:'not-a-date'}:variant==='later-duplicate'?{at:new Date(Date.parse(e.at)+1).toISOString()}:{}),
 }));
 for(const events of [[...bare,...markers],[...markers,...bare]]){
 const p=foundationPlan(policy,s.learnerId,events,s.now);
 assert.equal(p.status,'unavailable',variant);assert.equal(p.question,null);assert.ok(p.reason.includes(prerequisite));
 }
 }
 // Exact retransmission neither creates more evidence nor destroys genuine provenance.
 const once=foundationPlan(policy,s.learnerId,trusted,s.now,{trustedOnly:true});
 assert.deepEqual(foundationPlan(policy,s.learnerId,[...trusted,...trusted],s.now,{trustedOnly:true}),once);
});
