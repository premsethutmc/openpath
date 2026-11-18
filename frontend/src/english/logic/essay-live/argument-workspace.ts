import {ARGUMENT_TRANSFER_TASKS} from '../../../../../packages/english-core/src/essay/argument-transfer-bank.ts';
/** One ledger-backed writing cycle. No model response is an ability estimate or a mastery update. */
import {ARGUMENT_RUBRIC,ARGUMENT_TRANSFER_LIMITATION,normalizeArgumentWriting,ARGUMENT_COACHING,ARGUMENT_PRACTICE_ORDER,ARGUMENT_LIMITATION,SELF_REVIEW_QUESTIONS,argumentTask,argumentRecords,argumentRequest,argumentArtifactEvent,argumentFeedbackEvent,validateArgumentFeedback,wordCount,type ArgumentArtifact,type ArgumentTransferReservation,type ArgumentTransferTask,type ArgumentPractice,type ArgumentFeedback,type ArgumentGatewayInfo,type ArgumentPost,type ArgumentStage,type WorkspaceGoal,type WorkspaceDifficulty,type EssayEvent} from '../../../../../packages/english-core/src/index.ts';
import type {AppEvent} from '../events.ts';
export interface ArgumentLedger {
 readonly events:readonly AppEvent[];
 essayMeta(count?:number):Promise<{id:string;at:string;session:string}[]>;
 recordEssay(...events:EssayEvent[]):Promise<void>;
}
export interface ArgumentWorkspaceOptions {goal:WorkspaceGoal;difficulty:WorkspaceDifficulty;grade?:0|7;info?:ArgumentGatewayInfo|null;post?:ArgumentPost|null;transferTasks?:readonly ArgumentTransferTask[]}
const transferLocks=new WeakMap<ArgumentLedger,object>();
const stages:ArgumentStage[]=['initial','for','against','revision'];
export class ArgumentWorkspace {
 private operation=0;private lastStartedOperation=0;private busy=false;private committingTransfer=false;private cycleNumber:number;
 private ledger:ArgumentLedger;private options:ArgumentWorkspaceOptions;
 constructor(ledger:ArgumentLedger,options:ArgumentWorkspaceOptions){
  argumentTask(options.goal,options.difficulty,1,'initial');
  if(options.grade!==undefined&&options.grade!==(options.goal==='grade7'?7:0))throw Error('Grade marker does not match the selected task context.');
  this.ledger=ledger;this.options={...options,...(options.transferTasks?{transferTasks:structuredClone(options.transferTasks)}:{}),info:options.info?structuredClone(options.info):null};
  const prefix=this.prefix();const saved=argumentRecords(ledger.events.filter((e):e is EssayEvent=>e.kind==='essay'));const existing=[...saved.artifacts,...saved.reservations];
  this.cycleNumber=Math.max(1,...existing.filter(a=>a.cycle.startsWith(prefix)).map(a=>Number(a.cycle.slice(prefix.length))).filter(n=>Number.isInteger(n)&&n>0));
 }
 private prefix(){return `argument:${this.options.goal}:${this.options.difficulty}:`;}
 private records(){return argumentRecords(this.ledger.events.filter((e):e is EssayEvent=>e.kind==='essay'));}
 view(){
  const cycle=this.prefix()+this.cycleNumber;const records=this.records();
  const decorate=(artifact:ArgumentArtifact)=>({artifact,feedback:records.feedback.filter(f=>f.artifactId===artifact.id).at(-1)??null});
  const artifacts=records.artifacts.filter(a=>a.cycle===cycle&&a.assistance!=='independent_transfer').map(decorate);
  const history=records.artifacts.filter(a=>a.goal===this.options.goal&&a.difficulty===this.options.difficulty&&a.cycle!==cycle&&a.assistance!=='independent_transfer').map(decorate);
  const stage=stages.find(s=>!artifacts.some(a=>a.artifact.stage===s))??null;
  const feedbackEventIdFor=(id:string)=>this.ledger.events.filter((e):e is EssayEvent=>e.kind==='essay'&&e.record.type==='argument_feedback'&&e.record.feedback.artifactId===id).at(-1)!.id;
  const concerns=artifacts.flatMap(({artifact,feedback})=>feedback?.status==='observations_only'?feedback.findings.map((finding,findingIndex)=>({artifactId:artifact.id,feedbackEventId:feedbackEventIdFor(artifact.id),findingIndex,finding,practice:records.practice.filter(p=>p.artifactId===artifact.id&&p.feedbackEventId===feedbackEventIdFor(artifact.id)&&p.findingIndex===findingIndex&&JSON.stringify(p.finding)===JSON.stringify(finding))})):[]).sort((a,b)=>ARGUMENT_PRACTICE_ORDER.indexOf(a.finding.area)-ARGUMENT_PRACTICE_ORDER.indexOf(b.finding.area));
  const info=this.options.info;const analysisAvailable=!!(info?.available&&info.rubric===ARGUMENT_RUBRIC&&info.protocols.observe==='essay-observe.v2'&&this.options.post);
  const {nextTask:reservedOnlyTask,...transfer}=this.transferState(cycle,stage===null);void reservedOnlyTask;
  return {transfer,cycle,cycleNumber:this.cycleNumber,stage,task:argumentTask(this.options.goal,this.options.difficulty,this.cycleNumber,stage??'revision'),artifacts,history,concerns,practice:records.practice.filter(p=>[...artifacts,...history].some(a=>a.artifact.id===p.artifactId)),selfReviewQuestions:structuredClone(SELF_REVIEW_QUESTIONS),analysisAvailable,busy:this.busy,limitations:[ARGUMENT_LIMITATION,'Self-review prompts are general questions, not detected mistakes. A saved revision is not proof of improvement.','The selected goal and starting difficulty are preferences, not measured proficiency. Topics are practice, not official exam questions.','All writing here must be invented test text. Committed artifacts live in the existing device learner record; no audio is collected.']};
 }
 private transferState(cycle:string,cycleComplete:boolean){
  const records=this.records();
  const history=records.reservations.map(reservation=>{
   const artifact=records.artifacts.find(a=>a.transferReservationId===reservation.id)??null;
   const feedback=artifact?records.feedback.filter(f=>f.artifactId===artifact.id).at(-1)??null:null;
   const status=artifact?'submitted' as const:records.abandoned.some(a=>a.reservationId===reservation.id)?'abandoned' as const:'reserved' as const;
   return {reservation,artifact,feedback,status};
  });
  const reserved=history.find(r=>r.status==='reserved');
  const active=reserved?{reservation:reserved.reservation,task:reserved.reservation.task}:null;
  const tasks=this.options.transferTasks??ARGUMENT_TRANSFER_TASKS;
  const usedIds=new Set(records.reservations.map(r=>r.task.id)),usedFamilies=new Set(records.reservations.map(r=>r.task.family));
  const oldTopics=records.artifacts.map(a=>normalizeArgumentWriting(a.topic));
  const oldPrompts=[...records.artifacts.map(a=>normalizeArgumentWriting(a.prompt)),...this.ledger.events.flatMap(e=>e.kind==='essay'&&e.record.type==='submission'&&e.record.submission.source.prompt?[normalizeArgumentWriting(e.record.submission.source.prompt)]:[])];
  const candidates=tasks.filter(t=>t.allowedGoals.includes(this.options.goal)&&!usedIds.has(t.id)&&!usedFamilies.has(t.family)&&!oldTopics.includes(normalizeArgumentWriting(t.topic))&&!oldPrompts.some(p=>p===normalizeArgumentWriting(t.prompt)||p.includes(normalizeArgumentWriting(t.topic))));
  const submitted=history.some(r=>r.reservation.cycle===cycle&&r.status==='submitted');
  const blockedReason=active?'An independent task is already reserved. Resume it or explicitly abandon it.':!cycleComplete?'Complete your original, for, against and own revision first.':submitted?'This coaching cycle already has a submitted transfer. Complete another coaching cycle before another transfer.':!candidates.length?'No unseen transfer task remains for this goal in this learner’s recorded history. Used or abandoned tasks are not recycled.':null;
  return {active,history,available:blockedReason===null,blockedReason,limitation:ARGUMENT_TRANSFER_LIMITATION,nextTask:candidates[0]??null};
 }
 private acquireTransfer(){if(transferLocks.has(this.ledger))throw Error('Another writing transfer save is already in progress.');const lock={};transferLocks.set(this.ledger,lock);return lock;}
 private releaseTransfer(lock:object){if(transferLocks.get(this.ledger)===lock)transferLocks.delete(this.ledger);}
 private async commitTransfer(event:EssayEvent){
  this.committingTransfer=true;try{await this.ledger.recordEssay(event);}finally{this.committingTransfer=false;}
 }
 async startTransfer(){
  if(this.busy)throw Error('A writing operation is already in progress.');
  const view=this.view(),candidate=this.transferState(view.cycle,view.stage===null).nextTask;if(!view.transfer.available||!candidate)throw Error(view.transfer.blockedReason??'No fresh task is available.');
  const lock=this.acquireTransfer();const token=++this.operation;this.lastStartedOperation=token;this.busy=true;
  try{const [meta]=await this.ledger.essayMeta(1);if(token!==this.operation)return this.view();
   const reservation:ArgumentTransferReservation={version:'argument-transfer-reservation@1',id:`transfer:${meta.id}`,at:meta.at,cycle:view.cycle,goal:this.options.goal,difficulty:this.options.difficulty,task:structuredClone(candidate)};
   await this.commitTransfer({kind:'essay',...meta,record:{type:'argument_transfer_reserved',reservation}});
  }finally{this.releaseTransfer(lock);if(this.lastStartedOperation===token)this.busy=false;}
  return this.view();
 }
 async abandonTransfer(reservationId:string){
  if(this.busy)throw Error('A writing operation is already in progress.');
  const active=this.view().transfer.active;if(!active||active.reservation.id!==reservationId)throw Error('This independent task is not active.');
  const lock=this.acquireTransfer();const token=++this.operation;this.lastStartedOperation=token;this.busy=true;
  try{const [meta]=await this.ledger.essayMeta(1);if(token!==this.operation)return this.view();await this.commitTransfer({kind:'essay',...meta,record:{type:'argument_transfer_abandoned',reservationId}});}finally{this.releaseTransfer(lock);if(this.lastStartedOperation===token)this.busy=false;}
  return this.view();
 }
 async submitTransfer(reservationId:string,text:string,options:{syntheticConfirmed:boolean;unaidedConfirmed:boolean}){
  if(this.busy)throw Error('A writing operation is already in progress.');
  if(options.syntheticConfirmed!==true||options.unaidedConfirmed!==true)throw Error('Confirm invented test writing and declare that this new response was written without assistance. This declaration is unproctored.');
  const active=this.view().transfer.active;if(!active||active.reservation.id!==reservationId)throw Error('This independent task is not active.');
  if(typeof text!=='string'||text.length>10000||wordCount(text)<30||wordCount(text)>800)throw Error('Write 30–800 words, at most 10,000 characters.');
  const records=this.records(),normalized=normalizeArgumentWriting(text);
  const previous=[...records.artifacts.map(a=>a.text),...records.practice.map(p=>p.text),...this.ledger.events.flatMap(e=>e.kind==='essay'&&e.record.type==='submission'?[e.record.submission.text]:[])];
  if(previous.some(old=>normalizeArgumentWriting(old)===normalized))throw Error('Write a new response rather than reuse earlier saved writing. This checks exact normalized reuse, not authorship or semantic copying.');
  const lock=this.acquireTransfer();const token=++this.operation;this.lastStartedOperation=token;this.busy=true;
  try{const [meta]=await this.ledger.essayMeta(1);if(token!==this.operation)return this.view();
   const r=active.reservation;const artifact:ArgumentArtifact={version:'argument-artifact@1',id:`argument:${meta.id}`,cycle:r.cycle,at:meta.at,goal:r.goal,difficulty:r.difficulty,stage:'transfer',topic:r.task.topic,prompt:r.task.prompt,text:text.trim(),words:wordCount(text),dataUse:'synthetic_test',assistance:'independent_transfer',transferReservationId:r.id,independenceDeclaration:{unaided:true,proctored:false,at:meta.at}};
   await this.commitTransfer(argumentArtifactEvent(meta,artifact));this.releaseTransfer(lock);
   if(token===this.operation&&this.view().analysisAvailable)await this.analyse(artifact,token);
  }finally{this.releaseTransfer(lock);if(this.lastStartedOperation===token)this.busy=false;}
  return this.view();
 }
 async submit(text:string,options:{syntheticConfirmed:boolean;revisionOf?:string;sourceEssayId?:string;initialPrompt?:string}){
  if(this.busy)throw Error('A writing operation is already in progress.');
  if(this.view().transfer.active)throw Error('Finish or abandon the active independent writing task before using coaching.');
  if(options.syntheticConfirmed!==true)throw Error('Confirm this is invented test writing, not a real person’s work.');
  const v=this.view();if(!v.stage)throw Error('This cycle is complete. Start a new topic cycle.');
  const words=wordCount(text);if(typeof text!=='string'||text.length>10000||words<30||words>800)throw Error('Write 30–800 words, at most 10,000 characters.');
  const previous=v.stage==='revision'?v.artifacts.find(a=>a.artifact.id===(options.revisionOf??v.artifacts.find(a=>a.artifact.stage==='for')?.artifact.id))?.artifact:undefined;
  if(v.stage==='revision'&&(!previous||!['for','against'].includes(previous.stage)))throw Error('Choose your own for or against argument to revise.');
  if(previous&&previous.text.trim()===text.trim())throw Error('Revise your own argument rather than resubmitting the unchanged text.');
  const source=options.sourceEssayId?this.ledger.events.find(e=>e.kind==='essay'&&e.record.type==='submission'&&e.record.submission.id===options.sourceEssayId):undefined;
  if(options.sourceEssayId&&(v.stage!=='initial'||!source||source.kind!=='essay'||source.record.type!=='submission'||source.record.submission.text.trim()!==text.trim()))throw Error('The initial writing must match its own recorded source.');
  if(options.initialPrompt!==undefined&&(v.stage!=='initial'||!options.initialPrompt.trim()||options.initialPrompt.length>1500))throw Error('Invalid initial writing prompt.');
  const initialPrompt=source?.kind==='essay'&&source.record.type==='submission'?source.record.submission.source.prompt??'Initial language sample from your earlier writing.':options.initialPrompt;
  if(initialPrompt!==undefined&&(!initialPrompt.trim()||initialPrompt.length>1500))throw Error('The source writing prompt is too long or empty.');
  const token=++this.operation;this.lastStartedOperation=token;this.busy=true;
  try{
   const [meta]=await this.ledger.essayMeta(1);if(token!==this.operation)return this.view();
   const artifact:ArgumentArtifact={version:'argument-artifact@1',id:`argument:${meta.id}`,cycle:v.cycle,at:meta.at,goal:this.options.goal,difficulty:this.options.difficulty,stage:v.stage,topic:initialPrompt?'Initial writing sample':v.task.topic,prompt:initialPrompt??v.task.prompt,text:text.trim(),words,dataUse:'synthetic_test',assistance:v.stage==='initial'?'initial_independent':v.stage==='revision'?'supported_revision':'perspective_prompt',...(previous?{revisionOf:previous.id}:{}),...(options.sourceEssayId?{sourceEssayId:options.sourceEssayId}:{})};
   await this.ledger.recordEssay(argumentArtifactEvent(meta,artifact));
   if(token===this.operation&&v.analysisAvailable)await this.analyse(artifact,token);
   if(token===this.operation)this.busy=false;return this.view();
  }finally{if(token===this.operation)this.busy=false;}
 }
 private async analyse(artifact:ArgumentArtifact,token:number){
  const info=this.options.info!;const previous=artifact.revisionOf?this.records().artifacts.find(a=>a.id===artifact.revisionOf):undefined;
  const request=argumentRequest(artifact,artifact.goal==='grade7'?7:0,previous);
  let feedback:Omit<ArgumentFeedback,'artifactId'|'at'>;
  try{const raw=await this.options.post!({task:'observe',request,data_use:'synthetic_test'});feedback=validateArgumentFeedback(raw,request,info);}
  catch{feedback={version:'argument-feedback@1',status:'unavailable',evaluator:null,findings:[],notObservable:[],limitation:'Analysis unavailable or rejected. Writing was saved, not assessed. No gaps or improvement were inferred. Retry explicitly when available.'};}
  if(token!==this.operation)return;
  const [meta]=await this.ledger.essayMeta(1);if(token!==this.operation)return;
  await this.ledger.recordEssay(argumentFeedbackEvent(meta,{...feedback,artifactId:artifact.id,at:meta.at}));
 }
 async savePractice(artifactId:string,findingIndex:number,text:string,options:{syntheticConfirmed:boolean;feedbackEventId:string}){
  if(this.busy)throw Error('A writing operation is already in progress.');
  if(this.view().transfer.active)throw Error('Finish or abandon the active independent writing task before using coaching.');
  if(options.syntheticConfirmed!==true)throw Error('Confirm this is invented test writing, not a real person’s work.');
  if(typeof text!=='string'||text.trim().length<20||text.length>4000)throw Error('Write your own response in 20–4,000 characters.');
  if(!this.view().artifacts.some(a=>a.artifact.id===artifactId))throw Error('Choose a concern from the current writing cycle.');
  const source=this.ledger.events.filter((e):e is EssayEvent=>e.kind==='essay'&&e.record.type==='argument_feedback'&&e.record.feedback.artifactId===artifactId).at(-1);
  if(!source||source.id!==options.feedbackEventId||source.record.type!=='argument_feedback'||source.record.feedback.status!=='observations_only'||!Number.isInteger(findingIndex)||findingIndex<0)throw Error('No validated coaching concern is available.');
  const finding=source.record.feedback.findings[findingIndex];if(!finding)throw Error('No validated coaching concern is available.');
  const token=++this.operation;this.lastStartedOperation=token;this.busy=true;
  try{
   const [meta]=await this.ledger.essayMeta(1);if(token!==this.operation)return this.view();
   const practice:ArgumentPractice={version:'argument-practice@1',id:`practice:${meta.id}`,at:meta.at,artifactId,feedbackEventId:source.id,findingIndex,finding:structuredClone(finding),prompt:ARGUMENT_COACHING[finding.area].practicePrompt,text:text.trim(),dataUse:'synthetic_test',assistance:'coached_practice'};
   await this.ledger.recordEssay({kind:'essay',...meta,record:{type:'argument_practice',practice}});
   if(token===this.operation)this.busy=false;return this.view();
  }finally{if(token===this.operation)this.busy=false;}
 }
 async retryAnalysis(artifactId:string){
  if(this.busy)throw Error('A writing operation is already in progress.');
  if(this.view().transfer.active)throw Error('Finish or abandon the active independent writing task before using coaching.');
  if(!this.view().analysisAvailable)throw Error('The configured argument evaluator is unavailable. No local assessment was substituted.');
  const artifact=this.records().artifacts.find(a=>a.id===artifactId&&(a.cycle===this.view().cycle||a.assistance==='independent_transfer'));if(!artifact)throw Error('No writing artifact in this cycle.');
  const token=++this.operation;this.lastStartedOperation=token;this.busy=true;try{await this.analyse(artifact,token);if(token===this.operation)this.busy=false;return this.view();}finally{if(token===this.operation)this.busy=false;}
 }
 cancel(){++this.operation;if(!this.committingTransfer)this.busy=false;}
 startNewCycle(){if(this.view().transfer.active)throw Error('Finish or abandon the independent writing task first.');if(this.busy)throw Error('Finish or cancel the current operation.');if(this.view().stage!==null)throw Error('Finish this writing cycle before starting another.');this.cycleNumber++;return this.view();}
}
