import type {EssayGatewayInfo} from '../../../../../packages/english-core/src/essay/evaluators.ts';
import {analyseSyntheticWriting, EXAM_WRITING_RUBRIC, type SyntheticWritingPost, type ModelWritingObservation} from './model.ts';
import {initialSession,answer,submitWriting,revise,words,type Session} from './session.ts';
import {planWritingChecks,verifyWritingSkill,JOURNEY_WRITING_CHECKS,WRITING_LESSONS,type WritingCheck,type WritingSkill} from './verification.ts';
import {reassessmentFor} from './reassessment.ts';

export type JourneyPhase='reading'|'writing'|'analysing'|'checks'|'teaching'|'reassessment'|'complete'|'error';
export interface JourneyState {
 phase:JourneyPhase; session:Session; observations:ModelWritingObservation[]; notObservable:WritingSkill[]; checks:WritingCheck[];
 answers:Record<string,number>; results:ReturnType<typeof verifyWritingSkill>[];
 lessons:WritingSkill[]; taught:WritingSkill[]; fresh:WritingCheck[]; freshAnswers:Record<string,number>;
 seen:string[]; error:string; mode:'simulated'|'server';
}
export const SIMULATED_INFO:EssayGatewayInfo={available:true,id:'exam-journey-fixture',version:'fixture@2',model:'simulated-not-a-model',rubric:EXAM_WRITING_RUBRIC,protocols:{observe:'essay-observe.v2',rewrite:'essay-rewrite.v2'}};
export const EXAMPLE_WRITING='The researcher write a report about the library each month. The council waited for a hour before announcing success. More loans prove that all library services improved. The author believes that lending books is worthless. I would count loans again to decide whether readers received better research help. The count will show how many books people borrowed, but it cannot tell us how much assistance specialist readers received.';
/** Fixed fixture, never a pattern-based assessor for arbitrary text. */
export const simulatedPost:SyntheticWritingPost=async body=>{
 const req=body.request as {essay:{id:string;text:string}};
 if(req.essay.text!==EXAMPLE_WRITING)throw Error('Use the fixed invented sample in simulated mode.');
 const mk=(competency:string,quote:string,correction:string,explanation:string)=>({competency,quote,correction,explanation,kind:'error',confidence:'medium',verification:'required'});
 return {evaluator:{...SIMULATED_INFO,protocol:'essay-observe.v2'},output:{essay_id:req.essay.id,rubric:EXAM_WRITING_RUBRIC,not_observable:[],observations:[
 mk('EN.GRM.VERB.sva','researcher write','researcher writes','The fixture proposes checking agreement, not diagnosing a learner.'),
 mk('EN.GRM.NOUN.articles','a hour','an hour','Hour begins with a vowel sound.'),
 mk('EN.WRITE.source_fidelity','lending books is worthless','loan counts are useful but incomplete','The source accepts lending as useful; this claim reverses that qualification.'),
 mk('EN.WRITE.evidence_reasoning','More loans prove that all library services improved.','More loans show more borrowing, not improvement in every service.','The measure does not establish the broader outcome.'),
 ]}};
};
/** One in-memory synthetic sitting. Model responses select checks; only fixed answer keys score them. */
export class ExamJourney {
 private generation=0;
 private priorSeen:string[]=[];
 private state:JourneyState;
 private info:EssayGatewayInfo;
 private post:SyntheticWritingPost;
 constructor(info:EssayGatewayInfo=SIMULATED_INFO,post:SyntheticWritingPost=simulatedPost,seen:readonly string[]=[],mode:'simulated'|'server'='simulated'){
  this.info=info;this.post=post;
  this.state={phase:'reading',session:initialSession(),observations:[],notObservable:[],checks:[],answers:{},results:[],lessons:[],taught:[],fresh:[],freshAnswers:{},seen:[...new Set(seen)],error:'',mode};
 }
 snapshot(){
  const {checks,fresh,...rest}=structuredClone(this.state);
  const publicItem=({answer:_answer,explanation:_explanation,...item}:WritingCheck)=>item;
  return {...rest,checks:checks.map(publicItem),fresh:fresh.map(publicItem)};
 }
 reading(id:string,index:number){if(this.state.phase!=='reading')return;this.state.session=answer(this.state.session,id,index);this.state.phase=this.state.session.phase==='writing'?'writing':'reading';}
 async analyse(text:string,syntheticConfirmed:boolean){
  if(!['writing','error'].includes(this.state.phase))return;
  if(!syntheticConfirmed)throw Error('Confirm this is invented test writing, not a real learner sample.');
  if(this.state.mode==='simulated'&&text!==EXAMPLE_WRITING)throw Error('Simulated mode only supports the fixed invented sample.');
  const session=submitWriting({...this.state.session,phase:'writing',writing:'',revision:''},text);
  const generation=++this.generation; this.priorSeen=[...this.state.seen];
  this.state={...this.state,session,phase:'analysing',error:'',observations:[],notObservable:[],checks:[],results:[],lessons:[],taught:[],fresh:[],answers:{},freshAnswers:{}};
  try{
   const output=await analyseSyntheticWriting(session.writing,this.info,this.post);
   if(generation!==this.generation)return;
   const checks=planWritingChecks(output.observations,this.priorSeen,JOURNEY_WRITING_CHECKS);
   this.state={...this.state,observations:output.observations,notObservable:output.notObservable,checks,seen:[...new Set([...this.state.seen,...checks.map(q=>q.id)])],phase:checks.length?'checks':'complete'};
  }catch{if(generation===this.generation)this.state={...this.state,phase:'error',error:'Analysis unavailable or rejected. No writing gap, lesson or improvement was inferred. Your draft remains here; retry explicitly.'};}
 }
 answer(id:string,index:number){
  const field=this.state.phase==='checks'?'answers':this.state.phase==='reassessment'?'freshAnswers':null;
  if(!field)return;const q=(field==='answers'?this.state.checks:this.state.fresh).find(q=>q.id===id);
  if(!q||Object.hasOwn(this.state[field],id)||!Number.isInteger(index)||index<0||index>=q.options.length)return;
  this.state={...this.state,[field]:{...this.state[field],[id]:index}};
 }
 finishChecks(){
  if(this.state.phase!=='checks'||!this.state.checks.every(q=>Object.hasOwn(this.state.answers,q.id)))return;
  const skills=[...new Set(this.state.checks.map(q=>q.skill))];
  const results=skills.map(skill=>verifyWritingSkill(skill,this.state.answers,this.priorSeen,JOURNEY_WRITING_CHECKS));
  // Mixed evidence warrants practice too, but is explicitly inconclusive, never a confirmed gap.
  const lessons=results.filter(r=>r.outcome!=='no_gap_shown').map(r=>r.skill);
  this.state={...this.state,results,lessons,phase:lessons.length?'teaching':'complete'};
 }
 lesson(skill:WritingSkill){return this.state.lessons.includes(skill)?WRITING_LESSONS[skill]:null;}
 markTaught(skill:WritingSkill){if(this.state.phase==='teaching'&&this.state.lessons.includes(skill)&&!this.state.taught.includes(skill))this.state={...this.state,taught:[...this.state.taught,skill]};}
 startReassessment(){
  if(this.state.phase!=='teaching'||!this.state.lessons.every(s=>this.state.taught.includes(s)))return;
  const fresh=reassessmentFor(this.state.lessons,this.state.seen);
  this.state={...this.state,fresh,seen:[...new Set([...this.state.seen,...fresh.map(q=>q.id)])],phase:fresh.length?'reassessment':'complete'};
 }
 finish(){if(this.state.phase==='reassessment'&&this.state.fresh.every(q=>Object.hasOwn(this.state.freshAnswers,q.id)))this.state={...this.state,phase:'complete'};}
 cancel(){++this.generation;if(this.state.phase==='analysing')this.state={...this.state,phase:'writing',error:'Analysis cancelled locally. A dispatched server call may still finish and consume its reserved quota.'};}
 /** Explanations are only available after the entire independent sitting ends. */
 review(){
  if(this.state.phase!=='complete')return [];
  return [...this.state.checks.map(q=>({q,stage:'verification' as const,answer:this.state.answers[q.id]})),...this.state.fresh.map(q=>({q,stage:'reassessment' as const,answer:this.state.freshAnswers[q.id]}))]
   .filter(x=>Number.isInteger(x.answer)).map(({q,stage,answer})=>({id:q.id,skill:q.skill,stage,prompt:q.prompt,selected:q.options[answer],expected:q.options[q.answer],correct:answer===q.answer,explanation:q.explanation}));
 }
 coverage(){
  if(this.state.phase!=='complete')return [];
  const skills=[...new Set(this.state.observations.filter(o=>o.requiresCheck).map(o=>o.skill))];
  return skills.map(skill=>({skill,checksAvailable:this.state.checks.some(q=>q.skill===skill),retestAvailable:this.state.fresh.some(q=>q.skill===skill),taught:this.state.taught.includes(skill)}));
 }
 saveRevision(text:string){
  if(this.state.phase!=='complete')throw Error('Finish the independent checks before revising.');
  if(words(text)<50||words(text)>250||text.trim()===this.state.session.writing.trim())throw Error('Write a changed 50–250 word explanation. This practice is saved, not assessed.');
  this.state={...this.state,session:revise(this.state.session,text)};
 }
 practicePlan(){
  if(this.state.phase!=='complete')return [];
  return this.summary().map(r=>({...r,next:r.after===null?(r.outcome==='no_gap_shown'?'No gap shown on these two checks. Try explaining the idea in your own writing; broader ability is still unknown.':'Fresh reassessment was unavailable. Revisit the lesson, then seek an unseen check before drawing a conclusion.'):
   r.after<2?'Revisit the explanation for each missed fresh item. Try the idea in a new paragraph; the original concern remains unresolved.':'Both fresh items were correct. Try using the idea in a new paragraph; retention and independent writing transfer remain untested.'}));
 }
 summary(){return this.state.results.map(r=>{
  const items=this.state.fresh.filter(q=>q.skill===r.skill);
  const done=items.length===2&&items.every(q=>Object.hasOwn(this.state.freshAnswers,q.id));
  return {...r,after:done?items.filter(q=>this.state.freshAnswers[q.id]===q.answer).length:null,interpretation:done?'Immediate fresh-item performance only; not retention, exam readiness or proof the lesson caused improvement.':'No completed fresh reassessment for this area.'};
 });}
}
