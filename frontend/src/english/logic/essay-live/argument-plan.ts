/** Concept learning over the existing ledger, allocator and delayed-check clock. */
import {ARGUMENT_CONCEPTS,ARGUMENT_CONCEPT_MAP,scoreCode,familyOf,type ArgumentConcept,type ArgumentConceptProbe,type EssayContext,type Item,type Response,type EvidenceEvent,type AssistedResponseEvent,type LedgerEvent} from '../../../../../packages/english-core/src/index.ts';
import {essayRecords} from '../../../../../packages/english-core/src/essay/analysis.ts';
import {pickForRole} from '../../../../../packages/english-core/src/essay/allocation.ts';
import {competencyOutcome,plannedChecks,checkProgress,planCheck,planReview} from '../../../../../packages/english-core/src/essay/checks.ts';
import type {Learner} from '../learner.ts';
export interface ArgumentProbeSource {artifactId:string;feedbackEventId:string;findingIndex:number;capability:ArgumentConcept}
export class ArgumentConceptPlan {
 private busy=false;private generation=0;
 readonly learner:Learner;readonly context:EssayContext;readonly sourceLearner:Learner;
 constructor(sourceLearner:Learner,conceptLearner:Learner,context:EssayContext){
  this.sourceLearner=sourceLearner;this.learner=conceptLearner;this.context={...context,teachingText:new Map(context.teachingText)};const learner=conceptLearner;
  for(const l of sourceLearner.content.lessons.values()){const shown=[l.rule,...l.examples.flatMap(e=>[e.text,e.note??'']),l.tip??'',l.check.prompt,...l.check.options,l.check.explain];this.context.teachingText!.set(l.capability,[...(this.context.teachingText!.get(l.capability)??[]),...shown]);}
  if(sourceLearner.profileId===conceptLearner.profileId||conceptLearner.profileId!==`${sourceLearner.profileId}:argument-concepts`)throw Error('Use the separate concept-only profile linked to this writing learner.');
  if(!context.profile.profile.id.startsWith('argument-concepts-')||[...context.ctx.content.items.keys()].some(id=>!id.startsWith('argument.concept.'))||[...learner.content.ctx.content.items.keys()].some(id=>!id.startsWith('argument.concept.')))throw Error('Use the dedicated concept-only content and profile, not a general writing assessment.');
  if(learner.content.gate||learner.content.contentMode==='pilot')throw Error('Candidate concept practice is outside the reviewed pilot.');
  for(const cap of Object.keys(ARGUMENT_CONCEPTS))if(!context.profile.byCapability.get(cap)?.specified)throw Error('An explicit four-concept practice profile is required.');
 }
 private allocationEvents():LedgerEvent[]{
  const exposures:LedgerEvent[]=[];
  for(const e of this.sourceLearner.state.ledger.events){
   if(e.kind!=='presented'&&e.kind!=='evidence'&&e.kind!=='assisted_response')continue;
   const source=this.sourceLearner.content.ctx.content.items.get(e.item.id);if(!source)continue;
   for(const item of this.context.ctx.content.items.values())if(item.id===source.id||familyOf(item)===familyOf(source)){
    exposures.push({kind:'presented',id:`source-exposure:${e.id}:${item.id}`,at:e.at,session:`source:${e.session}`,item:{id:item.id,version:item.version},purpose:e.kind==='assisted_response'||(e.kind==='presented'&&e.purpose!=='assessment')?'practice':'assessment'});
   }
  }
  return [...exposures,...this.learner.state.ledger.events];
 }
 private records(){return essayRecords(this.learner.state.ledger.events,'argument_probe').map(e=>e.record.probe);}
 private answered(id:string,at:string){return this.learner.events.find((e):e is EvidenceEvent|AssistedResponseEvent=>(e.kind==='evidence'||e.kind==='assisted_response')&&e.item.id===id&&e.at>=at);}
 private item(id:string):Item {const item=this.context.ctx.content.items.get(id);if(!item||item.kind!=='code')throw Error('The reserved concept item is unavailable.');return item;}
 private reviewItems(refs:{id:string;version:number}[],at:string){
  if(refs.some(ref=>!this.answered(ref.id,at)))return [];
  return refs.map(ref=>{const response=this.answered(ref.id,at)!;const item=this.item(ref.id) as Extract<Item,{kind:'code'}>;return {itemId:ref.id,prompt:item.prompt,response:response.response,correct:scoreCode(item,response.response).correct,explanation:this.learner.content.feedback.get(item.id)??item.explain??'',assisted:response.kind==='assisted_response'};});
 }
 private lessonDone(id:string,at:string){return this.learner.events.some(e=>e.kind==='lesson'&&e.lesson===id&&e.at>=at);}
 view(){
  const now=this.learner.clock();
  const plans=this.records().map(probe=>{
   const answers=probe.items.map(i=>this.answered(i.id,probe.at));
   const correct=answers.filter((a,i)=>a&&scoreCode(this.item(probe.items[i].id) as Extract<Item,{kind:'code'}>,a.response).correct).length;
   const outcome=competencyOutcome(this.context,this.allocationEvents(),probe.capability,now);
   const checks=plannedChecks(this.learner.state.ledger.events).filter(c=>c.competency===probe.capability).map(c=>{const progress=checkProgress(this.context,this.learner.state.ledger.events,c);return {id:c.id,kind:c.kind,notBefore:c.notBefore,complete:progress.complete,correct:progress.complete?progress.valid.filter(a=>a.correct).length:null,counted:progress.valid.length,total:c.items.length,invalidReasons:progress.invalid.map(a=>a.why),passed:progress.passed,review:progress.complete?this.reviewItems(c.items,c.at):[]};});
   const open=plannedChecks(this.learner.state.ledger.events).filter(c=>c.competency===probe.capability&&!checkProgress(this.context,this.learner.state.ledger.events,c).complete).at(-1);
   let phase:'probe'|'lesson'|'guided'|'check'|'waiting'|'review'|'blocked'|'ready'='ready';
   let reason='Concept practice is separate from improving your own argument.';let nextItemId:string|null=null;
   let lessons=this.context.lessons.get(probe.capability)??[];let lessonAt=probe.at;
   const probeLeft=probe.items.filter(i=>!this.answered(i.id,probe.at));
   let guided=probe.guided.map(i=>i.id);
   const support=essayRecords(this.learner.state.ledger.events,'argument_concept_support').filter(e=>e.record.support.probeId===probe.id).at(-1)?.record.support;
   if(support&&!open?.review){lessonAt=support.at;guided=support.items.map(i=>i.id);}
   if(open?.review){lessons=open.review.lessons;lessonAt=open.at;guided=open.review.practice;}
   const needsLesson=open?.review?open.review.lessonNeeded!==false:!!support||correct<probe.items.length;
   if(probeLeft.length){phase='probe';nextItemId=probeLeft[0].id;reason=probe.sourceKind==='self_selected'?'Explore this self-selected concept; no writing weakness was detected.':'Check a concept suggested by this writing concern, not the quality of your argument.';}
   else if(outcome.review&&!outcome.review.planned){phase='review';reason='The existing delayed concept check calls for supported review.';}
   else if(needsLesson&&!lessons.length){phase='blocked';reason='This concept needs supported practice but no lesson is available.';}
   else if(needsLesson&&lessons.some(id=>!this.lessonDone(id,lessonAt))){phase='lesson';reason='A concept answer needs attention. Work through the lesson, then apply it in your own words.';}
   else if((needsLesson||open?.review)&&guided.some(id=>!this.answered(id,lessonAt))){phase='guided';nextItemId=guided.find(id=>!this.answered(id,lessonAt))!;reason='Supported practice, not independent evidence.';}
   else if((needsLesson||open?.review)&&!guided.length){phase='blocked';reason='No fresh guided concept practice is available; no question was recycled.';}
   else if(open){if(now<open.notBefore){phase='waiting';reason=`Existing check is scheduled from ${open.notBefore}.`;}else{phase='check';nextItemId=checkProgress(this.context,this.learner.state.ledger.events,open).left[0]??null;reason='Fresh concept check without hints, separate from your own writing.';}}
   else if(!outcome.next){phase='blocked';reason=outcome.pending??'No further concept check is currently required.';}
   return {probe,label:ARGUMENT_CONCEPTS[probe.capability],phase,reason,nextItemId,lessons:lessons.map(id=>({id,done:this.lessonDone(id,lessonAt),content:this.learner.content.lessons.get(id)??null})),correct:answers.every(Boolean)?correct:null,probeReview:this.reviewItems(probe.items,probe.at),answered:answers.filter(Boolean).length,total:probe.items.length,checks,outcome,check:open??null};
  });
  return {busy:this.busy,plans,limitation:'These checks concern recognition and application on authored concept tasks. They do not prove the structural integrity of your argument, retained writing skill or exam readiness.'};
 }
 private plan(id:string){const p=this.view().plans.find(p=>p.probe.id===id);if(!p)throw Error('Unknown concept plan.');return p;}
 private async run<T>(action:(live:()=>boolean)=>Promise<T>){if(this.busy)throw Error('A concept operation is already in progress.');this.busy=true;const token=++this.generation;try{return await action(()=>token===this.generation);}finally{if(token===this.generation)this.busy=false;}}
 cancel(){this.generation++;this.busy=false;}
 async startProbe(source:ArgumentProbeSource){await this.run(async live=>{
  const event=this.sourceLearner.events.find(e=>e.id===source.feedbackEventId);
  const artifact=essayRecords(this.sourceLearner.state.ledger.events,'argument_artifact').find(e=>e.record.artifact.id===source.artifactId)?.record.artifact;
  const latest=essayRecords(this.sourceLearner.state.ledger.events,'argument_feedback').filter(e=>e.record.feedback.artifactId===source.artifactId).at(-1);
  if(!artifact||!latest||latest.event.id!==source.feedbackEventId||!event||event.kind!=='essay'||event.record.type!=='argument_feedback'||event.record.feedback.status!=='observations_only'||!Number.isInteger(source.findingIndex))throw Error('Choose an exact, current validated writing concern.');
  const finding=event.record.feedback.findings[source.findingIndex];if(!finding||!ARGUMENT_CONCEPT_MAP[finding.area].includes(source.capability))throw Error('This concern has no such concept mapping.');
  await this.createProbe(source.capability,live,source);
 });return this.view();}
 async startExploration(capability:ArgumentConcept){await this.run(async live=>{if(!Object.hasOwn(ARGUMENT_CONCEPTS,capability))throw Error('Unknown concept.');await this.createProbe(capability,live);});return this.view();}
 private async createProbe(capability:ArgumentConcept,live:()=>boolean,source?:ArgumentProbeSource){
  if(this.records().some(p=>p.capability===capability))throw Error('Continue the existing concept plan; a second concern does not reset its evidence or review clock.');
  const items=pickForRole(this.context,this.allocationEvents(),capability,'diagnostic',2);
  const guided=pickForRole(this.context,this.allocationEvents(),capability,'guided_practice',2,{exclude:new Set(items.map(i=>i.id))});
  if(items.length<2)throw Error('Two fresh concept probes are unavailable. No reserved check was consumed.');
  const [meta]=await this.learner.essayMeta();if(!live())return;
  const probe:ArgumentConceptProbe={version:'argument-concept-probe@1',id:meta.id,at:meta.at,sourceLearnerId:this.sourceLearner.profileId,...(source??{}),sourceKind:source?'finding':'self_selected',capability,items:items.map(i=>({id:i.id,version:i.version})),guided:guided.map(i=>({id:i.id,version:i.version})),scope:'concept_only'};
  await this.learner.recordEssay({kind:'essay',...meta,record:{type:'argument_probe',probe}});
 }
 private async adaptAfterCheck(id:string,live:()=>boolean){
  const p=this.plan(id);const last=plannedChecks(this.learner.state.ledger.events).filter(c=>c.competency===p.probe.capability&&c.kind==='verification').at(-1);if(!last)return;
  const progress=checkProgress(this.context,this.learner.state.ledger.events,last);
  if(!progress.complete||!progress.valid.some(a=>!a.correct)||essayRecords(this.learner.state.ledger.events,'argument_concept_support').some(e=>e.record.support.afterCheck===last.id))return;
  const unusedReserved=p.probe.guided.filter(i=>!this.answered(i.id,p.probe.at)).map(i=>this.item(i.id));
  const items=[...unusedReserved,...pickForRole(this.context,this.allocationEvents(),p.probe.capability,'guided_practice',2)].slice(0,2);
  const [meta]=await this.learner.essayMeta();if(!live())return;await this.learner.recordEssay({kind:'essay',...meta,record:{type:'argument_concept_support',support:{probeId:id,afterCheck:last.id,at:meta.at,items:items.map(i=>({id:i.id,version:i.version}))}}});
 }
 async presentNext(id:string):Promise<Item|null>{let shown:Item|null=null;await this.run(async live=>{
  const p=this.plan(id);if(!p.nextItemId)throw Error(p.reason);
  if(p.phase!=='guided'&&this.allocationEvents().some(e=>e.kind==='presented'&&e.id.startsWith('source-exposure:')&&e.item.id===p.nextItemId))throw Error('This concept question was exposed in the source writing history and is no longer fresh.');
  if(p.phase==='check'){
   const session=this.learner.state.open?.event;
   const taught=this.learner.events.some(e=>e.kind==='intervention'&&e.session===session?.session&&e.capability===p.probe.capability);
   if(taught&&session&&session.at>=p.check!.notBefore)throw Error('This sitting includes teaching. Return for an independent concept check in a later sitting; no automatic reset is used.');
   if(!session||session.type!=='essay'||session.at<p.check!.notBefore)await this.learner.newEssaySession();
  }else await this.learner.essayMeta();
  if(!live())return;shown=this.item(p.nextItemId);
  await this.learner.present(shown,p.phase==='guided'?'practice':'assessment');
 });return shown;}
 async answerNext(id:string,itemId:string,response:Response):Promise<{view:ReturnType<ArgumentConceptPlan['view']>;feedback:Awaited<ReturnType<Learner['answer']>>|null}>{let feedback:Awaited<ReturnType<Learner['answer']>>|null=null;await this.run(async live=>{
  const p=this.plan(id);if(p.nextItemId!==itemId)throw Error('The displayed concept question is no longer current.');
  if(p.phase!=='guided'&&this.allocationEvents().some(e=>e.kind==='presented'&&e.id.startsWith('source-exposure:')&&e.item.id===itemId))throw Error('This concept question is no longer fresh relative to the source writing history.');
  const session=this.learner.state.open?.event.session;
  if(!this.learner.events.some(e=>e.kind==='presented'&&e.session===session&&e.item.id===itemId))throw Error('Present the concept question before answering.');
  if(!live())return;feedback=await this.learner.answer(this.item(itemId),response,{assisted:p.phase==='guided',use:p.phase==='guided'?'practice':p.check?.kind==='retention'?'retention':'assessment'});if(live()&&p.phase==='check')await this.adaptAfterCheck(id,live);
  if(p.phase==='probe'&&this.plan(id).answered<this.plan(id).total)feedback=null;
  if(p.phase==='check'&&!this.plan(id).checks.find(c=>c.id===p.check?.id)?.complete)feedback=null;
 });return {view:this.view(),feedback};}
 async finishLesson(id:string,lessonId:string,checkCorrect:boolean){await this.run(async live=>{
  const p=this.plan(id);if(p.phase!=='lesson'||!p.lessons.some(l=>l.id===lessonId&&!l.done))throw Error('This lesson is not pending in the concept plan.');
  await this.learner.essayMeta();if(live())await this.learner.finishLesson(lessonId,checkCorrect);
 });return this.view();}
 async planNextCheck(id:string){await this.run(async live=>{
  const p=this.plan(id);if(!['ready','review'].includes(p.phase))throw Error(p.reason);
  const [meta]=await this.learner.essayMeta();if(!live())return;
  const result=p.phase==='review'?planReview(this.context,this.allocationEvents(),meta,p.probe.capability):planCheck(this.context,this.allocationEvents(),meta,p.probe.capability);
  await this.learner.recordEssay(result.event);
 });return this.view();}
}
