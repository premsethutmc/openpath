import test from 'node:test';
import assert from 'node:assert/strict';
import { IDENTITIES_CONFIG, ANGLE_PAIRS_PRECISE_CONFIG, connectedSkill, strategyConnects, validSkillTask } from '../../../packages/learning/src/skill-connections';
import { classifyQuestionWith, projectFromEventsWith } from '../../../packages/learning/src/subskill-projection';
import { LINEAR_EQUATIONS_CONFIG } from '../../../packages/learning/src/subskill-evidence';
import { foundationPlan, FOUNDATION_POLICY, type FoundationPolicy } from '../../../packages/learning/src/foundation';
import { moduleFor, question } from '../../../packages/learning/src/content';
import { withDecisions, readRecords } from '../../../packages/learning/src/records';
import { SliceSession } from './session';
import { questionForRequirement, teachable } from '../../../packages/learning/src/intervention';
import { gradeRequest } from '../../../packages/learning/src/server-grader';
const at=Date.parse('2026-01-01T00:00:00Z');
test('parameter partitions separate mathematical quantities and preserve historical prerequisites',()=>{
  for(const format of ['',':mc',':w']) {
    assert.equal(connectedSkill(IDENTITIES_CONFIG,`gen:ahid:0,1,3,1${format}`),'identities.square-cross-term@1');
    assert.equal(connectedSkill(IDENTITIES_CONFIG,`gen:ahid:0,1,3,2${format}`),'identities.square-constant@1');
  }
  assert.equal(connectedSkill(IDENTITIES_CONFIG,'gen:ahid:2,1,3,1'),null);
  for(const [rel,name] of ['opposite','adjacent','other-three'].entries()) assert.equal(connectedSkill(ANGLE_PAIRS_PRECISE_CONFIG,`gen:afcross:60,${rel}`),`angle-pairs.${name}@2`);
  assert.equal(classifyQuestionWith(LINEAR_EQUATIONS_CONFIG,'gen:ahone:0,3,7').kind,'mapped');
});
test('invalid and ambiguous metadata fails closed',()=>{
  const config={...IDENTITIES_CONFIG,subSkills:[...IDENTITIES_CONFIG.subSkills,IDENTITIES_CONFIG.subSkills[1]]};
  assert.equal(connectedSkill(config,'gen:ahid:0,2,3,0'),null);
  const invalid={...IDENTITIES_CONFIG,subSkills:[{...IDENTITIES_CONFIG.subSkills[1],parameters:[{index:99,values:[0]}]}]};
  assert.equal(connectedSkill(invalid,'gen:ahid:0,2,3,0'),null);
  assert.equal(validSkillTask(IDENTITIES_CONFIG,'identities.square-cross-term@1','gen:ahid:0,1,3,2'),false);
  assert.equal(validSkillTask(IDENTITIES_CONFIG,'identities.square-cross-term@1','gen:ahid:0,1,3,1'),true);
});
test('general binomial teaching and answer credit do not certify square teaching or working',()=>{
  const m=moduleFor(IDENTITIES_CONFIG.competency)!;
  assert.ok(m.strategies.some(s=>strategyConnects(IDENTITIES_CONFIG,'identities.binomial-cross-term@1',s)));
  assert.ok(m.strategies.every(s=>!strategyConnects(IDENTITIES_CONFIG,'identities.square-cross-term@1',s)));
  const decision=gradeRequest({id:'gen:ahid:0,1,3,1',response:'6',working:['x² + 6x + 9']}).decision!;
  assert.notEqual(decision.working?.methodEvidence,'method-verified');
});
for(const [config,skill] of [[IDENTITIES_CONFIG,'identities.square-cross-term@1'],[ANGLE_PAIRS_PRECISE_CONFIG,'angle-pairs.opposite@2']] as const) test(`persisted same-skill check, retention and recovery: ${skill}`,()=>{
  const s=new SliceSession(`connections-${skill}`,config.competency,at);
  const policy: FoundationPolicy={version:FOUNDATION_POLICY,config,requirements:[{skill,method:false}]};
  const saved=()=>withDecisions(s.events,s.decisions);
  let p=foundationPlan(policy,s.learnerId,saved(),s.now);
  for(let i=0;i<12&&p.status!=='shown';i++) {
    assert.ok(p.question,JSON.stringify(p)); assert.equal(connectedSkill(config,p.question),skill);
    assert.equal(s.submit(p.question,question(p.question).answer,'check').credit,true);
    p=foundationPlan(policy,s.learnerId,saved(),s.now);
  }
  assert.equal(p.status,'shown');
  assert.deepEqual(foundationPlan(policy,s.learnerId,JSON.parse(JSON.stringify(saved())).reverse(),s.now),p);
  s.now+=8*86400000;
  p=foundationPlan(policy,s.learnerId,saved(),s.now);assert.equal(p.status,'retention');assert.ok(p.question);assert.equal(connectedSkill(config,p.question),skill);
  s.submit(p.question,'-999','retention');
  p=foundationPlan(policy,s.learnerId,saved(),s.now);assert.equal(p.status,'recovery');assert.ok(p.question);assert.equal(connectedSkill(config,p.question),skill);
  assert.equal(projectFromEventsWith(config,s.learnerId,saved(),s.now).subSkills.find(x=>x.id===skill)?.historical.everDemonstrated,true);
});
test('correct constants cannot satisfy middle-coefficient coverage',()=>{
  const s=new SliceSession('constant-only',IDENTITIES_CONFIG.competency,at);
  for(const q of ['gen:ahid:0,1,3,2','gen:ahid:0,1,4,2','gen:ahid:0,1,5,2']) s.submit(q,question(q).answer,'check');
  const policy: FoundationPolicy={version:FOUNDATION_POLICY,config:IDENTITIES_CONFIG,requirements:[{skill:'identities.square-cross-term@1',method:false}]};
  const p=foundationPlan(policy,s.learnerId,withDecisions(s.events,s.decisions),s.now);
  assert.equal(p.status,'unobserved'); assert.ok(p.question);assert.equal(connectedSkill(IDENTITIES_CONFIG,p.question),'identities.square-cross-term@1');
});
test('fresh checks exclude taught examples without a submitted answer',()=>{
  const m=moduleFor('MATH.number.addition')!, st=m.strategies[0];
  const records=readRecords('learner',[]);records.teaching.push({at:new Date(at).toISOString(),rule:'x',strategy:st.id,competency:m.competency,session:'s'});
  assert.equal(questionForRequirement(m,'check',records,id=>id===st.guided),null);
});

import { make, learnerState } from '../../../packages/learning/src/session';
import { connectionConfig } from '../../../packages/learning/src/skill-connections';
for (const competency of ['MATH.number.addition','MATH.geometry.triangle-properties']) test(`actual pathway keeps delivered teaching, guided work and fresh check connected: ${competency}`,()=>{
  const s=new SliceSession(`block-${competency}`,competency,at), m=moduleFor(competency)!, config=connectionConfig(competency)!;
  s.events.push(make.pathway({learnerId:s.learnerId,sessionId:s.session,at:new Date(at-1000).toISOString()},competency));
  const strategy=m.strategies.find(st=>teachable(m,st,[]) && strategyConnects(config,connectedSkill(config,st.guided)!,st))!;
  assert.ok(strategy);
  s.events.push(make.teach({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()},competency,strategy.id,'foundation-lesson-review@1'));
  let next=s.state().module(competency);
  assert.equal(next.phase,'guided',JSON.stringify(next));assert.equal(next.question,strategy.guided);
  s.submit(next.question!,question(next.question!).answer,'guided');
  next=s.state().module(competency);
  assert.equal(next.phase,'check',JSON.stringify(next));assert.ok(next.question);
  assert.notEqual(next.question,strategy.guided);
  assert.equal(connectedSkill(config,next.question),connectedSkill(config,strategy.guided));
  const saved=JSON.parse(JSON.stringify(withDecisions(s.events,s.decisions)));
  assert.deepEqual(learnerState(s.learnerId,saved,s.now,{currentSession:s.session}).module(competency),next);
  s.submit(next.question,question(next.question).answer,'check');
  assert.equal(s.state().records.attempts.at(-1)?.solution,true,'lesson-review assistance persists');
  assert.notEqual(s.state().module(competency).context,`foundation:${connectedSkill(config,strategy.guided)}`,'an assisted reassessment closes the teaching block without mastery credit');
});

import { hypotheses, investigateContext } from '../../../packages/learning/src/hypotheses';
import { probeReading } from '../../../packages/learning/src/reasoning';
test('saved same-family teaching and resolution on another parameter skill cannot close a diagnosis',()=>{
  const competency=ANGLE_PAIRS_PRECISE_CONFIG.competency,s=new SliceSession('precise-diagnosis',competency,at),m=moduleFor(competency)!;
  const original='gen:afpair:0,60', follow='gen:afpair:0,50';
  s.submit(original,probeReading(original,'wrong-total').predicted[0],'check');
  s.submit(follow,probeReading(follow,'wrong-total').predicted[0],'diagnostic',{context:investigateContext(original)});
  assert.equal(hypotheses(s.state().records)[0]?.status,'established');
  const strategy={...m.strategies[0],id:'test-other-parameter',guided:'gen:afpair:1,60',check:'gen:afpair:1,50'};
  m.strategies.push(strategy);
  try {
    s.events.push(make.pathway({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()},competency));
    s.events.push(make.teach({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()},competency,strategy.id,'conceptual'));
    for(const q of ['gen:afpair:1,40','gen:afpair:1,70'])s.submit(q,question(q).answer,'check');
    const h=hypotheses(s.state().selectionRecords)[0];
    assert.equal(h.status,'established');assert.equal(h.teachingDue,true);assert.equal(h.teaching.deliveredAt,null);
    assert.ok(h.probes.every(p=>connectedSkill(ANGLE_PAIRS_PRECISE_CONFIG,p.question)==='angle-pairs.complement@2'));
  } finally {m.strategies.splice(m.strategies.indexOf(strategy),1);}
});

test('teaching-instance semantics must agree with guided and check tasks',()=>{
  const m=moduleFor(ANGLE_PAIRS_PRECISE_CONFIG.competency)!;
  const s={...m.strategies[0],guided:'gen:afpair:1,147',check:'gen:afpair:1,136:mc',screens:[{title:'Complement',text:['Complement of 36 degrees'],instance:'gen:afpair:0,36'}]};
  assert.equal(strategyConnects(ANGLE_PAIRS_PRECISE_CONFIG,'angle-pairs.supplement@2',s),false);
});

import { discriminatingProbe } from '../../../packages/learning/src/hypotheses';
test('displayed solved examples cannot become fresh diagnostic resolution evidence',()=>{
  const competency=ANGLE_PAIRS_PRECISE_CONFIG.competency,s=new SliceSession('shown-probe',competency,at),m=moduleFor(competency)!;
  const original='gen:afpair:0,60', follow='gen:afpair:0,50';
  s.submit(original,probeReading(original,'wrong-total').predicted[0],'check');
  s.submit(follow,probeReading(follow,'wrong-total').predicted[0],'diagnostic',{context:investigateContext(original)});
  const strategy={...m.strategies[0],id:'test-shown-example',guided:'gen:afpair:0,40',check:'gen:afpair:0,70',screens:[{title:'Complement',text:['90 minus the angle'],instance:'gen:afpair:0,40'}]};
  m.strategies.push(strategy);
  try {
    s.events.push(make.pathway({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()},competency));
    s.events.push(make.teach({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()},competency,strategy.id,'conceptual'));
    let records=s.state().selectionRecords,h=hypotheses(records)[0];
    assert.equal(discriminatingProbe(h,records,id=>id===strategy.guided),null);
    s.submit(strategy.guided,question(strategy.guided).answer,'check');
    records=s.state().selectionRecords;h=hypotheses(records)[0];
    assert.ok(h.probes.every(p=>p.question!==strategy.guided));assert.notEqual(h.status,'resolved');
  } finally {m.strategies.splice(m.strategies.indexOf(strategy),1);}
});
