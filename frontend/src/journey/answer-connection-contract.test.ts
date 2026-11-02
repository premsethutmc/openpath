import test from 'node:test';
import assert from 'node:assert/strict';
import { problemOf, exposureKey, pool } from '../../../packages/learning/src/families';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validSkillTask, connectedSkill } from '../../../packages/learning/src/skill-connections';
import type { SubSkillConfig } from '../../../packages/learning/src/subskill-projection';
import { gradeRequest } from '../../../packages/learning/src/server-grader';
import { probeReading, reason } from '../../../packages/learning/src/reasoning';
import { foundationPlan, FOUNDATION_POLICY, type FoundationPolicy } from '../../../packages/learning/src/foundation';
import { withDecisions } from '../../../packages/learning/src/records';
import { question } from '../../../packages/learning/src/content';
import { SliceSession } from './session';
// Test-only mappings register no curriculum coverage or teaching approval.
function configFor(id:string):SubSkillConfig {
 const p=problemOf(id)!;
 return {version:'answer-test@1',mapping:'answer-test@1',competency:p.competency,subSkills:[{id:'test.skill',name:'Test',example:id,families:[p.family],competency:p.competency}],core:['test.skill'],unmapped:{},broadClaim:l=>l};
}
for(const id of ['gen:adfcmp:1,1,9,11,0','gen:akchance:2,3,2,0','gen:aedecc:2,2,0,1','gen:aaname:15','gen:pow:3,3:mc','gen:addur:0,7','gen:quad:-5,6']) test(`connection uses typed answer authority: ${id}`,()=>{
 const p=problemOf(id);assert.ok(p);assert.equal(gradeRequest({id,response:p.answer}).verdict,'correct');
 assert.equal(validSkillTask(configFor(id),'test.skill',id),true);assert.equal(validSkillTask(configFor(id),'other',id),false);
});
test('invalid variants and quarantine cannot borrow base-task authority',()=>{
 const id='gen:quad:-5,6',c=configFor(id);assert.equal(problemOf(`${id}:mc`),null);
 for(const bad of [`${id}:mc`,`${id}:w:mc`,'gen:addur:0,999999']) assert.equal(validSkillTask(c,'test.skill',bad),false);
 const held='gen:adexp:9,8,5,7:w';assert.ok(problemOf(held));
 assert.equal(gradeRequest({id:held,response:problemOf(held)!.answer}).reason,'unresolved.quarantined');
 assert.equal(validSkillTask(configFor(held),'test.skill',held),false);
});
test('equivalence, original diagnosis text and tuple order survive connection',()=>{
 for(const [id,response] of [['gen:adfcmp:1,1,9,11,0','2/18'],['gen:aedecc:2,2,0,1','11/5'],['gen:addur:0,7','(12/2,100/2)'],['gen:quad:-5,6','3,2'],['gen:aaname:15','a']]) {
 assert.equal(validSkillTask(configFor(id),'test.skill',id),true);assert.equal(gradeRequest({id,response}).verdict,'correct',id);
 }
 const id='gen:addur:0,84',response=' (16/2, 150/2) ';
 assert.equal(probeReading(id,'no-carry',response).reading,'predicted');assert.equal(reason(id,[{questionId:id,response}])!.observed[0].response,response);
 assert.equal(probeReading(id,'no-carry','(75,8)').reading,'other');
 assert.equal(gradeRequest({id:'gen:addur:0,7',response:'(50,6)'}).verdict,'incorrect');
 for(const response of ['(6,)','(6,1/0)']) assert.equal(gradeRequest({id:'gen:addur:0,7',response}).verdict,'unresolved');
});
test('answer connection grants no unsupported method credit',()=>{
 const id='gen:addur:0,7';assert.equal(validSkillTask(configFor(id),'test.skill',id),true);
 const d=gradeRequest({id,response:problemOf(id)!.answer,working:['6 hours and 50 minutes']}).decision!;
 assert.equal(d.verdict,'correct');assert.notEqual(d.working?.methodEvidence,'method-verified');assert.equal(d.method?.verified,false);
});
test('required forms and a newly held contract remain authoritative after connection',()=>{
 const id=pool('aifdiv').items.find(p=>p.answer==='4')!.id;
 assert.equal(validSkillTask(configFor(id),'test.skill',id),true);
 for(const response of ['8/2','4.0']) assert.equal(gradeRequest({id,response}).reason,'incorrect.required-form');
 // Isolate the controlled corruption fixture in one module system. Node 22 can
 // load separate ESM/CJS contract caches; mutating a different cache tests nothing.
 const root=fileURLToPath(new URL('../../../packages/learning/src/',import.meta.url));
 execFileSync(process.execPath,['--import','tsx','-e',`
  const assert=require('node:assert/strict');
  const {contractV2}=require(${JSON.stringify(root+'grading/contract.ts')});
  const {grade}=require(${JSON.stringify(root+'grading/decision.ts')});
  const {validSkillTask}=require(${JSON.stringify(root+'skill-connections.ts')});
  const id=${JSON.stringify(id)}, config=${JSON.stringify(configFor(id))};
  assert.equal(validSkillTask(config,'test.skill',id),true);
  const c=contractV2(id), before=c.inconsistencies.slice();
  try {
   c.inconsistencies.push('test fixture: independently detected contract inconsistency');
   assert.equal(grade(id,'4').decision.reason,'unresolved.contract-inconsistency');
   assert.equal(validSkillTask(config,'test.skill',id),false);
  } finally { c.inconsistencies.splice(0,c.inconsistencies.length,...before); }
  assert.equal(validSkillTask(config,'test.skill',id),true);
 `],{cwd:fileURLToPath(new URL('../../',import.meta.url)),stdio:'pipe'});
});
test('duration skill has fresh checks, saved replay, delayed check and recovery',()=>{
 const base=configFor('gen:addur:0,7');
 const c:SubSkillConfig={...base,subSkills:[{...base.subSkills[0],parameters:[{index:0,values:[0]}]}]};
 const s=new SliceSession('answer-duration',c.competency,Date.parse('2026-01-01T00:00:00Z'));
 const policy:FoundationPolicy={version:FOUNDATION_POLICY,config:c,requirements:[{skill:'test.skill',method:false}]};
 const saved=()=>withDecisions(s.events,s.decisions),seen=new Set<string>();
 let p=foundationPlan(policy,s.learnerId,saved(),s.now);
 for(let i=0;i<12&&p.status!=='shown';i++) {
 assert.ok(p.question,JSON.stringify(p));assert.equal(connectedSkill(c,p.question),'test.skill');assert.equal(validSkillTask(c,'test.skill',p.question),true);
 const key=exposureKey(p.question);assert.ok(!seen.has(key));seen.add(key);
 assert.equal(s.submit(p.question,question(p.question).answer,'check').credit,true);p=foundationPlan(policy,s.learnerId,saved(),s.now);
 }
 assert.equal(p.status,'shown');assert.ok(seen.size>=2);
 assert.deepEqual(foundationPlan(policy,s.learnerId,JSON.parse(JSON.stringify(saved())).reverse(),s.now),p);
 s.now+=8*86400000;p=foundationPlan(policy,s.learnerId,saved(),s.now);
 assert.equal(p.status,'retention');assert.ok(p.question);assert.equal(connectedSkill(c,p.question),'test.skill');assert.ok(!seen.has(exposureKey(p.question)));
 assert.equal(s.submit(p.question,'(0,0)','retention').credit,false);p=foundationPlan(policy,s.learnerId,saved(),s.now);
 assert.equal(p.status,'recovery');assert.ok(p.question);assert.equal(connectedSkill(c,p.question),'test.skill');
 assert.deepEqual(foundationPlan(policy,s.learnerId,JSON.parse(JSON.stringify(saved())).reverse(),s.now),p);
});
