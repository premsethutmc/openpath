import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyQuestionWith, projectFromEventsWith, type SubSkillConfig } from '../../../packages/learning/src/subskill-projection';
import { pool, problemOf, exposureKey } from '../../../packages/learning/src/families';
import { foundationPlan, FOUNDATION_POLICY, type FoundationPolicy } from '../../../packages/learning/src/foundation';
import { withDecisions } from '../../../packages/learning/src/records';
import { question } from '../../../packages/learning/src/content';
import { SliceSession } from './session';
// Test-only finite cases, independently selected from the generator's half-picture count.
// No curriculum registration and no production predicate/function are introduced.
const halves=pool('acpicthalf').items.filter(p=>p.params[3]===0 && Number(p.steps[0].value)%2===1);
assert.ok(halves.length>12);
const config:SubSkillConfig={version:'cases-test@1',mapping:'cases-test@1',competency:halves[0].competency,
 subSkills:[{id:'half-row',name:'Selected row has a half picture',example:halves[0].id,families:['acpicthalf'],competency:halves[0].competency,
 parameters:[{index:3,values:[0]}],parameterCases:halves.map(p=>p.params.slice(0,3).map((v,index)=>({index,values:[v]})))}],core:['half-row'],unmapped:{},broadClaim:l=>l};
const mapped=(c:SubSkillConfig,id:string)=>classifyQuestionWith(c,id).kind==='mapped';
test('cases are OR within a skill, AND existing constraints, without broad Cartesian leakage',()=>{
 assert.ok(problemOf('gen:acpicthalf:0,8,1,0'));
 assert.equal(mapped(config,'gen:acpicthalf:0,8,1,0'),false);
 for(const p of pool('acpicthalf').items) for(const suffix of ['',':mc']) assert.equal(mapped(config,p.id+suffix),p.params[3]===0&&Number(p.steps[0].value)%2===1,p.id+suffix);
 const overlapping={...config,subSkills:[{...config.subSkills[0],parameterCases:[...config.subSkills[0].parameterCases!,config.subSkills[0].parameterCases![0]]}]};
 assert.equal(mapped(overlapping,halves[0].id),true);
 assert.equal(mapped({...config,subSkills:[...config.subSkills,{...config.subSkills[0],id:'ambiguous'}]},halves[0].id),false);
 assert.equal(mapped(config,'gen:acpicthalf:9,8,1,0'),false);
 assert.equal(mapped(config,halves[0].id+':w:mc'),false);
 const legacy={...config,subSkills:[{...config.subSkills[0],parameterCases:undefined}]};
 assert.equal(mapped(legacy,'gen:acpicthalf:0,8,1,0'),true);
});
test('malformed case metadata fails closed even after an otherwise matching case',()=>{
 const good=config.subSkills[0].parameterCases![0];
 const bad=[null,{},[],new Array(1),[new Array(1)],[[{index:0,values:new Array(1)}]],[[]],[[null]],[[{index:-1,values:[0]}]],[[{index:4,values:[0]}]],[[{index:0.5,values:[0]}]],[[{index:0,values:[]}]],[[{index:0,values:'0'}]],[[{index:0,values:[NaN]}]],[[{index:0,values:[Infinity]}]],[[{index:0,values:['0']}]], [good,[]], [good,[{index:0,values:[NaN]}]]];
 for(const parameterCases of bad){const c={...config,subSkills:[{...config.subSkills[0],parameterCases}]} as unknown as SubSkillConfig;assert.equal(mapped(c,halves[0].id),false,JSON.stringify(parameterCases));}
});
test('projection, persisted replay, fresh checks and delayed selection respect the declared cases',()=>{
 const s=new SliceSession('parameter-cases',config.competency,Date.parse('2026-01-01T00:00:00Z'));
 const policy:FoundationPolicy={version:FOUNDATION_POLICY,config,requirements:[{skill:'half-row',method:false}]};
 const saved=()=>withDecisions(s.events,s.decisions),seen=new Set<string>();
 const whole='gen:acpicthalf:0,8,1,0';s.submit(whole,question(whole).answer,'check');
 assert.equal(projectFromEventsWith(config,s.learnerId,saved(),s.now).subSkills[0].attempts.total,0);
 let plan=foundationPlan(policy,s.learnerId,saved(),s.now);
 for(let i=0;i<12&&plan.status!=='shown';i++){
 assert.ok(plan.question,JSON.stringify(plan));assert.ok(mapped(config,plan.question));assert.equal(Number(problemOf(plan.question)!.steps[0].value)%2,1);
 const key=exposureKey(plan.question);assert.ok(!seen.has(key));seen.add(key);
 assert.equal(s.submit(plan.question,question(plan.question).answer,'check').credit,true);
 plan=foundationPlan(policy,s.learnerId,saved(),s.now);
 }
 assert.equal(plan.status,'shown');
 const replay=JSON.parse(JSON.stringify(saved())).reverse();
 assert.deepEqual(projectFromEventsWith(config,s.learnerId,replay,s.now),projectFromEventsWith(config,s.learnerId,saved(),s.now));
 s.wait(8);plan=foundationPlan(policy,s.learnerId,replay,s.now);
 assert.equal(plan.status,'retention');assert.ok(plan.question);assert.ok(mapped(config,plan.question));assert.ok(!seen.has(exposureKey(plan.question)));
 assert.equal(Number(problemOf(plan.question)!.steps[0].value)%2,1);
});
