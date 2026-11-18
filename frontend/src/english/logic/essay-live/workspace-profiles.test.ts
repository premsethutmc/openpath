import test from 'node:test';import assert from 'node:assert/strict';
import {type EssayEvaluator,indexCompetencyProfile} from '../../../../../packages/english-core/src/index.ts';
import {loadContent} from '../content.ts';import {Learner} from '../learner.ts';import {MemoryRepo} from '../store.ts';
import {EssayStudio,essayContext,SAMPLES,studioEvaluator} from './studio.ts';
import {createWorkspaceProfile,WORKSPACE_GOALS,WORKSPACE_DIFFICULTIES} from './workspace-profiles.ts';
const content=loadContent();
function clock(){let n=0;return ()=>new Date(Date.UTC(2026,10,18,12,0,n++)).toISOString();}
const valid:EssayEvaluator={id:'openpath-gateway:llm',version:'fixture@1',model:'synthetic',protocols:{observe:'essay-observe.v2',rewrite:'essay-rewrite.v2'},async observe(req){return {essay_id:req.essay.id,rubric:req.rubric,observations:[],not_observable:req.competencies.map(c=>c.id)};},async rewrite(){throw Error('not requested');}};
test('all 15 profiles use explicit self-selected references and retain honest coverage gaps',()=>{
 const ids=new Set<string>();for(const goal of WORKSPACE_GOALS)for(const difficulty of WORKSPACE_DIFFICULTIES){
  const w=createWorkspaceProfile(goal,difficulty,content);ids.add(w.rubric);indexCompetencyProfile(w.profile,content.index);
  assert.equal(w.profile.grade,goal==='grade7'?7:0);assert.equal(w.measured,false);assert.equal(w.validated,false);
  assert.deepEqual(w.summary,{specified:17,observationOnly:3,withLessons:4,withoutLessons:16});
  assert.ok(w.profile.competencies.every(c=>c.expectedBand===(c.specified?{foundation:2,developing:4,stretch:6}[difficulty]:null)));
  assert.ok(w.profile.competencies.every(c=>c.curriculum.every(r=>r.scheme==='openpath'&&r.validated===false)));
  assert.match(w.taskGuidance.argumentChallenge,/for or against/);assert.match(w.taskGuidance.coaching,/Do not supply a canned replacement/);
  assert.ok(w.coverage.every(c=>c.bankItems>=c.itemsAtPracticeTarget));
 }assert.equal(ids.size,15);
});
test('profile instances are independent and context retains legacy default',()=>{
 const a=createWorkspaceProfile('general','developing',content),b=createWorkspaceProfile('general','developing',content);a.profile.competencies[0].expectedBand=8;
 assert.equal(b.profile.competencies[0].expectedBand,4);assert.equal(essayContext(content).profile.key,'openpath.g8-writing@2');
 assert.equal(essayContext(content,undefined,b.profile).profile.key,b.rubric);
});
test('selected profile reuses learner and repo, preserves history, and records profile provenance',async()=>{
 const repo=new MemoryRepo(),time=clock();let learner=await Learner.create(content,repo,'Existing synthetic learner','guardian',time,'workspace-test');
 const old=learner.events.length,w=createWorkspaceProfile('cat','developing',content);
 const studio=new EssayStudio(learner,valid,undefined,undefined,{profile:w.profile,failClosed:true,useFallback:false});
 w.profile.competencies[0].expectedBand=8;
 const view=await studio.submit(SAMPLES.essays[0].text);assert.equal(view.analysis?.status,'accepted');assert.equal(view.essay?.source.profile,'foundation-writing-cat-developing@1');assert.equal(view.essay?.source.grade,0);
 assert.equal(studio.ectx.profile.profile.competencies[0].expectedBand,4);assert.equal(learner.profileId,'workspace-test');assert.ok(learner.events.length>old);
 assert.deepEqual((await repo.profiles()).map(p=>p.id),['workspace-test']);
 learner=await Learner.open(content,repo,'workspace-test',time);
 const reopened=new EssayStudio(learner,valid,undefined,undefined,{profile:createWorkspaceProfile('cat','developing',content).profile,failClosed:true});
 assert.equal(reopened.view().essay?.id,view.essay?.id);assert.equal(reopened.view().analysis?.status,'accepted');
});
test('unavailable server keeps submission and rejected record without fabricated analysis or fallback',async()=>{
 const repo=new MemoryRepo(),learner=await Learner.create(content,repo,'Synthetic','guardian',clock(),'no-server');
 let fallbackCalls=0;const fallback=studioEvaluator();fallback.observe=async()=>{fallbackCalls++;throw Error('must not run');};
 const studio=new EssayStudio(learner,null,fallback,undefined,{profile:createWorkspaceProfile('grade7','foundation',content).profile,failClosed:true});
 const view=await studio.submit(SAMPLES.essays[0].text);assert.equal(studio.connected,false);assert.equal(view.analysis?.status,'rejected');assert.equal(view.analysedBy,null);assert.equal(view.hypotheses.length,0);assert.equal(view.diagnostics.length,0);assert.equal(fallbackCalls,0);
 assert.equal(view.essay?.source.grade,7);assert.equal(view.analysis?.observations.length,0);assert.equal(view.profile.competencies.every(c=>c.state==='unknown'),true);
});
test('invalid or failing configured evaluator stays fail closed and useFallback false also opts out',async()=>{
 for(const options of [{failClosed:true,useFallback:true},{useFallback:false}])for(const fail of [false,true]){
  const learner=await Learner.create(content,new MemoryRepo(),'Synthetic','guardian',clock(),`failure-${String(fail)}-${String(options.failClosed)}`);
  let fallbackCalls=0;const fallback=studioEvaluator();fallback.observe=async()=>{fallbackCalls++;throw Error('must not run');};
  const bad:EssayEvaluator={...valid,observe:async()=>{if(fail)throw Error('synthetic outage');return {invalid:'schema'};}};
  const studio=new EssayStudio(learner,bad,fallback,undefined,{...options,profile:createWorkspaceProfile('gre','stretch',content).profile});
  const view=await studio.submit(SAMPLES.essays[0].text);assert.equal(view.analysis?.status,'rejected');assert.equal(view.analysedBy,null);assert.equal(view.diagnostics.length,0);assert.equal(fallbackCalls,0);
  assert.equal(learner.events.filter(e=>e.kind==='essay'&&e.record.type==='analysis').length,1);
 }
});
