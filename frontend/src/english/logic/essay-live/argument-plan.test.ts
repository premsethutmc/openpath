import assert from 'node:assert/strict';import {test} from 'node:test';
import {ArgumentConceptPlan} from './argument-plan.ts';
import {withArgumentConceptContent,createArgumentConceptProfile} from './argument-concept-content.ts';
import {essayContext} from './studio.ts';import {loadContent} from '../content.ts';import {Learner} from '../learner.ts';import {MemoryRepo} from '../store.ts';import {rightAnswer,wrongAnswer} from '../test-helpers.ts';
import {DEVELOPER_VERIFICATION,ARGUMENT_LIMITATION,type ArgumentArea,type ArgumentConcept,type ArgumentArtifact} from '../../../../../packages/english-core/src/index.ts';
import {competencyOutcome} from '../../../../../packages/english-core/src/essay/checks.ts';
import {allocateItems} from '../../../../../packages/english-core/src/essay/allocation.ts';
async function setup(area:ArgumentArea='reasons',capability:ArgumentConcept='EN.WRT.TSK.idea_development'){
 let now='2026-11-18T09:00:00.000Z';const clock=()=>now,repo=new MemoryRepo(),base=loadContent();
 const source=await Learner.create(base,repo,'Synthetic writing source','learner',clock,'source','this_device_only');
 const [m,f]=await source.essayMeta(2);const artifact:ArgumentArtifact={version:'argument-artifact@1',id:'original',cycle:'cycle1',at:m.at,goal:'general',difficulty:'foundation',stage:'for',topic:'An invented proposal',prompt:'Give reasons for an invented proposal.',text:'An invented claim with reasons.',words:5,dataUse:'synthetic_test',assistance:'perspective_prompt'};
 await source.recordEssay({kind:'essay',...m,record:{type:'argument_artifact',artifact}},{kind:'essay',...f,record:{type:'argument_feedback',feedback:{version:'argument-feedback@1',artifactId:artifact.id,at:f.at,status:'observations_only',evaluator:{id:'fixture',version:'1',model:'fixture'},findings:[{area,quote:'An invented claim',question:'What supports your claim?',hint:'Explain the link yourself.'}],notObservable:[],limitation:ARGUMENT_LIMITATION}}});
 const content=withArgumentConceptContent(base),profile=createArgumentConceptProfile('general','foundation',content),context=essayContext(content,DEVELOPER_VERIFICATION,profile);
 const concept=await Learner.create(content,repo,'Synthetic concept recognition only','learner',clock,'source:argument-concepts','this_device_only');
 const flow=new ArgumentConceptPlan(source,concept,context);const origin={artifactId:artifact.id,feedbackEventId:f.id,findingIndex:0,capability};
 return {source,concept,flow,origin,context,content,repo,clock,setTime:(v:string)=>{now=v;}};
}
async function answer(flow:ArgumentConceptPlan,id:string,correct:boolean){const q=await flow.presentNext(id);assert.ok(q);return flow.answerNext(id,q.id,correct?rightAnswer(q):wrongAnswer(q));}
test('exact-source probes reserve fresh roles; own-writing composite never receives concept evidence',async()=>{
 const x=await setup(),before=JSON.stringify(x.source.state.ledger.composite);
 await assert.rejects(x.flow.startProbe({...x.origin,feedbackEventId:'invented'}));await assert.rejects(x.flow.startProbe({...x.origin,capability:'EN.WRT.ORG.paragraphing'}));
 let v=await x.flow.startProbe(x.origin);const p=v.plans[0];assert.equal(p.probe.sourceLearnerId,'source');assert.equal(p.phase,'probe');
 const a=allocateItems(x.context,x.concept.state.ledger.events,x.origin.capability);for(const i of [...p.probe.items,...p.probe.guided])assert.ok(!Object.values(a.available).flat().includes(i.id));
 assert.equal((await answer(x.flow,p.probe.id,false)).feedback,null);assert.equal(x.flow.view().plans[0].correct,null);assert.deepEqual(x.flow.view().plans[0].probeReview,[]);await answer(x.flow,p.probe.id,false);assert.equal(x.flow.view().plans[0].probeReview.length,2);assert.equal(x.flow.view().plans[0].phase,'lesson');
 for(const l of x.flow.view().plans[0].lessons)await x.flow.finishLesson(p.probe.id,l.id,true);
 assert.equal(x.flow.view().plans[0].phase,'guided');await answer(x.flow,p.probe.id,true);await answer(x.flow,p.probe.id,true);
 assert.ok(x.concept.events.filter(e=>e.kind==='assisted_response').length>=2);assert.equal(x.flow.view().plans[0].phase,'ready');
 v=await x.flow.planNextCheck(p.probe.id);assert.equal(v.plans[0].phase,'waiting');await assert.rejects(x.flow.presentNext(p.probe.id));
 const due=v.plans[0].check!.notBefore;x.setTime(new Date(Date.parse(due)+1000).toISOString());
 await answer(x.flow,p.probe.id,true);await answer(x.flow,p.probe.id,true);
 assert.equal(JSON.stringify(x.source.state.ledger.composite),before);
 const reloaded=await Learner.open(x.content,x.repo,x.concept.profileId,x.clock);assert.equal(new ArgumentConceptPlan(x.source,reloaded,x.context).view().plans[0].answered,2);
 await assert.rejects(x.flow.startProbe(x.origin),/existing/);
});
test('displayed item identity and busy guards prevent double answers; cancelled planning writes nothing',async()=>{
 const x=await setup();const v=await x.flow.startProbe(x.origin),id=v.plans[0].probe.id;
 await assert.rejects(x.flow.answerNext(id,v.plans[0].nextItemId!,{kind:'choice',choice:0}),/Present/);
 const q=await x.flow.presentNext(id);const first=x.flow.answerNext(id,q!.id,rightAnswer(q!));await assert.rejects(x.flow.answerNext(id,q!.id,rightAnswer(q!)),/already|no longer/);await first;
 await assert.rejects(x.flow.answerNext(id,q!.id,rightAnswer(q!)),/no longer/);
 const y=await setup();let release!:()=>void;const original=y.concept.essayMeta.bind(y.concept);y.concept.essayMeta=async n=>{await new Promise<void>(r=>{release=r;});return original(n);};
 const pending=y.flow.startProbe(y.origin);y.flow.cancel();release();await pending;assert.equal(y.flow.view().plans.length,0);
});
test('source-family exposure blocks a concept variant without importing source ability evidence',async()=>{
 const x=await setup('organization','EN.WRT.ORG.paragraphing');
 const original=[...x.source.content.ctx.content.items.values()].find(i=>i.kind==='code'&&i.target===x.origin.capability)!;
 await x.source.essayMeta();await x.source.present(original,'practice');await x.source.answer(original,rightAnswer(original),{assisted:true,use:'practice'});
 const candidate=allocateItems(x.context,[],x.origin.capability).available.diagnostic[0];const item=x.context.ctx.content.items.get(candidate)!;
 x.context.ctx.content.items.set(candidate,{...item,family:original.family??original.id});
 const v=await x.flow.startProbe(x.origin);assert.ok(!v.plans[0].probe.items.some(i=>i.id===candidate));assert.equal(x.concept.events.filter(e=>e.kind==='evidence').length,0);
});
test('a due check cannot clear teaching in the same current sitting by an automatic reset',async()=>{
 const x=await setup();const p=(await x.flow.startProbe(x.origin)).plans[0];await answer(x.flow,p.probe.id,true);await answer(x.flow,p.probe.id,true);
 const check=(await x.flow.planNextCheck(p.probe.id)).plans[0].check!;x.setTime(new Date(Date.parse(check.notBefore)+1000).toISOString());await x.concept.newEssaySession();
 await x.concept.finishLesson(x.flow.view().plans[0].lessons[0].id,true);const session=x.concept.state.open!.event.session;
 await assert.rejects(x.flow.presentNext(p.probe.id),/teaching/);assert.equal(x.concept.state.open!.event.session,session);
});
test('self-selected exploration is labelled and later contradictory checks trigger teaching',async()=>{
 const x=await setup();const p=(await x.flow.startExploration(x.origin.capability)).plans[0];assert.equal(p.probe.sourceKind,'self_selected');assert.equal(p.probe.feedbackEventId,undefined);
 await answer(x.flow,p.probe.id,true);await answer(x.flow,p.probe.id,true);const check=(await x.flow.planNextCheck(p.probe.id)).plans[0].check!;
 x.setTime(new Date(Date.parse(check.notBefore)+1000).toISOString());await answer(x.flow,p.probe.id,false);await answer(x.flow,p.probe.id,false);
 assert.equal(x.flow.view().plans[0].phase,'lesson');const support=x.concept.events.find(e=>e.kind==='essay'&&e.record.type==='argument_concept_support');assert.ok(support&&support.kind==='essay'&&support.record.type==='argument_concept_support');assert.deepEqual(support.record.support.items,p.probe.guided);
 assert.equal(x.flow.view().plans[0].outcome.next,null);
 x.setTime(new Date(Date.parse(x.clock())+2*86400000).toISOString());
 for(const l of x.flow.view().plans[0].lessons)await x.flow.finishLesson(p.probe.id,l.id,true);
 assert.equal(x.flow.view().plans[0].outcome.next,null);await answer(x.flow,p.probe.id,true);assert.equal(x.flow.view().plans[0].outcome.next,null);await answer(x.flow,p.probe.id,true);assert.equal(x.concept.events.filter(e=>e.kind==='assisted_response').length,2);
 const completed=x.clock(),events=x.concept.state.ledger.events;
 const result=competencyOutcome(x.context,events,x.origin.capability,completed);assert.ok(result.next);assert.ok(Date.parse(result.next.notBefore)>=Date.parse(completed)+86400000);
 for(const mutate of [
  (es:typeof events)=>es.filter(e=>!(e.kind==='essay'&&e.record.type==='argument_concept_support')),
  (es:typeof events)=>es.filter(e=>e.kind!=='intervention'),
  (es:typeof events)=>es.filter(e=>e.kind!=='assisted_response'),
  (es:typeof events)=>[...es.filter(e=>e.kind!=='intervention'),...es.filter(e=>e.kind==='intervention')],
  (es:typeof events)=>es.map(e=>e.kind==='essay'&&e.record.type==='argument_concept_support'?{...e,record:{...e.record,support:{...e.record.support,items:e.record.support.items.slice(0,1)}}}:e),
  (es:typeof events)=>es.map(e=>e.kind==='essay'&&e.record.type==='argument_concept_support'?{...e,record:{...e.record,support:{...e.record.support,items:[]}}}:e),
  (es:typeof events)=>es.map(e=>e.kind==='essay'&&e.record.type==='argument_concept_support'?{...e,record:{...e.record,support:{...e.record.support,probeId:'not-the-probe'}}}:e),
  (es:typeof events)=>es.map(e=>e.kind==='essay'&&e.record.type==='argument_concept_support'?{...e,record:{...e.record,support:{...e.record.support,afterCheck:'not-the-check'}}}:e),
 ])assert.equal(competencyOutcome(x.context,mutate(events),x.origin.capability,completed).next,null);
 const limited={...x.context,policy:{...x.context.policy,followUpChecks:1}};assert.equal(competencyOutcome(limited,events,x.origin.capability,completed).next,null,'existing follow-up cap stays authoritative');
 const legacy={...x.context,profile:{...x.context.profile,profile:{...x.context.profile.profile,id:'legacy-writing'}}};assert.equal(competencyOutcome(legacy,events,x.origin.capability,completed).next,null);
 const next=(await x.flow.planNextCheck(p.probe.id)).plans[0];assert.equal(next.phase,'waiting');await assert.rejects(x.flow.presentNext(p.probe.id));
});
test('concept retention uses existing delayed checks and failed retention requests supported review',async()=>{
 const x=await setup('counterargument','EN.WRT.GEN.persuasive');const baseline=JSON.stringify(x.source.state.ledger.composite.nodes);
 const p=(await x.flow.startExploration(x.origin.capability)).plans[0];await answer(x.flow,p.probe.id,true);await answer(x.flow,p.probe.id,true);
 let retention=false;
 for(let round=0;round<5;round++){
  const current=x.flow.view().plans[0];assert.equal(current.phase,'ready',current.reason);
  const next=(await x.flow.planNextCheck(p.probe.id)).plans[0];assert.ok(next.check);
  if(next.check.kind==='retention'){
   retention=true;assert.equal(next.phase,'waiting');await assert.rejects(x.flow.presentNext(p.probe.id));
   const shown=next.outcome.targetShownAt!;assert.ok(Date.parse(next.check.notBefore)-Date.parse(shown)>=7*86400000);
   x.setTime(new Date(Date.parse(next.check.notBefore)+1000).toISOString());await answer(x.flow,p.probe.id,false);await answer(x.flow,p.probe.id,false);
   const failed=x.flow.view().plans[0];assert.equal(failed.phase,'review');assert.equal(failed.checks.at(-1)?.passed,false);assert.equal(failed.checks.at(-1)?.counted,2);assert.equal(failed.checks.at(-1)?.review.length,2);
   const review=(await x.flow.planNextCheck(p.probe.id)).plans[0];assert.ok(review.check?.review);assert.equal(review.phase,'lesson');break;
  }
  x.setTime(new Date(Date.parse(next.check.notBefore)+1000).toISOString());await answer(x.flow,p.probe.id,true);await answer(x.flow,p.probe.id,true);
 }
 assert.equal(retention,true,'existing engine must schedule delayed concept retention after sufficient independent concept evidence');assert.equal(JSON.stringify(x.source.state.ledger.composite.nodes),baseline);
});
