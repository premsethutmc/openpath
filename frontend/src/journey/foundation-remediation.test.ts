import test from 'node:test';
import assert from 'node:assert/strict';
import { GEOMETRY_JOURNEYS } from './geometry-journeys';
import { runScenario } from './scenarios';
import { SliceSession } from './session';
import { moduleFor, question } from '../../../packages/learning/src/content';
import { modulePhasePool } from '../../../packages/learning/src/library';
import { FAMILIES, problemOf } from '../../../packages/learning/src/families';
import { hypotheses, investigateContext, discriminatingProbe } from '../../../packages/learning/src/hypotheses';
import { probeReading } from '../../../packages/learning/src/reasoning';
import { foundationPlan, FOUNDATION_POLICY } from '../../../packages/learning/src/foundation';
import { pathwayModule, pathwayRecords } from '../../../packages/learning/src/foundation-runtime';
import { ANGLE_PAIRS_CONFIG, TRIANGLE_PROPERTIES_CONFIG } from '../../../packages/learning/src/subskill-config-geometry';
import { make } from '../../../packages/learning/src/session';
import { withDecisions } from '../../../packages/learning/src/records';
import { latestReleases } from '../../../packages/learning/src/curricula';
const cases=[{journey:'G-03',config:TRIANGLE_PROPERTIES_CONFIG,bug:'third-interior',family:'ahext'},
 {journey:'G-06',config:ANGLE_PAIRS_CONFIG,bug:'opposite-as-linear',family:'afcross'}];
const events=(s:SliceSession)=>withDecisions(s.events,s.decisions);
function established(c:typeof cases[number]){
 const s=new SliceSession(`remediation-${c.journey}`,c.config.competency,Date.parse('2026-10-01T00:00:00Z'));
 const m=moduleFor(c.config.competency)!;
 const candidates=[...m.practice,...m.retention,...modulePhasePool(m,'check')].filter(q=>!q.endsWith(':mc')&&probeReading(q,c.bug).discriminates);
 for(const [i,q] of candidates.slice(0,2).entries())s.submit(q,probeReading(q,c.bug).predicted[0],i?'diagnostic':'check',i?{context:investigateContext(candidates[0])}:{});
 assert.equal(hypotheses(s.state().records)[0]?.status,'established');
 return {s,m,candidates};
}
for(const c of cases){
 test(`${c.journey}: broad historic transfer cannot satisfy a weak geometry family`,()=>{
  const s=runScenario(GEOMETRY_JOURNEYS.find(j=>j.id===c.journey)!.scenario).f.session;
  assert.equal(s.state().evidence(c.config.competency).status,'transfer');
  const plan=foundationPlan({version:FOUNDATION_POLICY,config:c.config,requirements:c.config.core.map(skill=>({skill,method:false}))},s.learnerId,events(s),s.now,{trustedOnly:true});
  assert.notEqual(plan.status,'shown');assert.ok(plan.question);
  assert.equal(problemOf(plan.question)?.family,c.family);
 });
 test(`${c.journey}: an unrelated generic lesson cannot settle an established geometry misconception`,()=>{
  const {s,m}=established(c);
  const unrelated=m.strategies.find(st=>problemOf(st.check)?.family!==c.family)!;
  const ctx=()=>({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()});
  s.events.push(make.teach(ctx(),c.config.competency,unrelated.id,'conceptual'));
  s.events.push(make.pathway(ctx(),c.config.competency));
  const es=events(s),records=pathwayRecords(s.learnerId,es),state=s.state();
  const ms=pathwayModule(c.config.competency,s.learnerId,es,records,state.evidence,s.now,s.session);
  assert.equal(ms.requirementsMet,false);
  assert.ok(['unavailable','pause'].includes(ms.phase),JSON.stringify(ms));
  assert.equal(ms.question,null);
  assert.match(ms.reason,/explanation|teaching|misunderstanding|misconception/i);
 });
 test(`${c.journey}: only an explicitly selected readiness route unlocks above-grade resolution probes`,()=>{
  const {s}=established(c);
  s.events.push(make.enrol({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()},1,'2026-27',latestReleases.find(r=>r.grade===1)!));
  const ordinary=s.state().records,h=hypotheses(ordinary)[0];
  // Existing geometry families omit grade metadata. Exercise the shared placement
  // rule with that optional capability explicitly present, then restore the family.
  const def=FAMILIES.get(c.family)!,originalGrade=def.grade;
  def.grade=()=>6;
  try {
  assert.equal(discriminatingProbe(h,ordinary),null);
  s.events.push(make.pathway({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()},c.config.competency));
  const records=pathwayRecords(s.learnerId,events(s));
  assert.ok(records.readinessRoute?.includes(c.config.competency));
  const probe=discriminatingProbe(h,records);
  assert.ok(probe);assert.equal(question(probe).competency,c.config.competency);
  assert.ok(probeReading(probe,c.bug).discriminates);
  assert.equal(discriminatingProbe(h,{...records,readinessRoute:['MATH.number.addition']}),null);
  } finally {def.grade=originalGrade;}
 });
}

test('relevant teaching is followed by a discriminating probe before other coverage questions',()=>{
 const c={journey:'angle-sum',config:TRIANGLE_PROPERTIES_CONFIG,bug:'added',family:'ahtri'};
 const {s,m}=established(c),strategy=m.strategies.find(st=>problemOf(st.check)?.family===c.family)!;
 const ctx=()=>({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()});
 s.events.push(make.teach(ctx(),c.config.competency,strategy.id,'conceptual'));
 // Success on other kinds can raise broad status without resolving this hypothesis.
 for(const q of modulePhasePool(m,'check').filter(q=>!q.endsWith(':mc')&&!probeReading(q,c.bug).discriminates).slice(0,12))s.submit(q,question(q).answer,'check');
 assert.ok(['independent','transfer'].includes(s.state().evidence(c.config.competency).status));
 s.events.push(make.pathway(ctx(),c.config.competency));
 const es=events(s),records=pathwayRecords(s.learnerId,es),h=hypotheses(records)[0];
 assert.equal(h.status,'established');assert.equal(h.probeDue,true);
 const ms=pathwayModule(c.config.competency,s.learnerId,es,records,s.state().evidence,s.now,s.session);
 assert.equal(ms.requirementsMet,false);assert.equal(ms.phase,'check');assert.ok(ms.question);
 assert.ok(probeReading(ms.question,c.bug).discriminates);
 assert.equal(ms.context,'foundation:resolution');
 // Record-level exhaustion fixture: assisted prior exposures cannot supply fresh
 // independent resolution evidence, but do consume every safe selectable variant.
 const seen=[...m.practice,...m.transfer,...m.retention,...m.strategies.map(st=>st.check),
  ...(['check','practice','diagnostic','retention'] as const).flatMap(phase=>modulePhasePool(m,phase))];
 const exhausted={...records,attempts:[...records.attempts,...seen.map((questionId,i)=>({...records.attempts[0],
  id:`assisted-exposure-${i}`,questionId,at:new Date(s.now).toISOString(),activity:'guided' as const,hints:1,n:1}))]};
 assert.equal(discriminatingProbe(h,exhausted),null);
 const stopped=pathwayModule(c.config.competency,s.learnerId,es,exhausted,s.state().evidence,s.now,s.session);
 assert.equal(stopped.phase,'unavailable');assert.equal(stopped.requirementsMet,false);assert.equal(stopped.question,null);
 assert.match(stopped.reason,/no fresh supported resolution question/);
});

test('two fresh correct discriminating answers contest a diagnosis without forcing irrelevant teaching',()=>{
 const c=cases[1],{s,candidates}=established(c);
 for(const q of candidates.slice(2,4))s.submit(q,question(q).answer,'check');
 s.events.push(make.pathway({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()},c.config.competency));
 const es=events(s),records=pathwayRecords(s.learnerId,es);
 assert.equal(hypotheses(records)[0].status,'contested');
 const ms=pathwayModule(c.config.competency,s.learnerId,es,records,s.state().evidence,s.now,s.session);
 assert.notEqual(ms.why,'foundation-misconception-resolution@1');
 assert.notEqual(ms.requirementsMet,true,'contesting one misconception does not invent full competency coverage');
});
