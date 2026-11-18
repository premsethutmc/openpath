/** Argument coaching is a writing artifact and tentative feedback, never mastery evidence. */
import {scrubIdentifiers} from '../evaluation.ts';
import {instructionLike} from '../freeform.ts';
import type {EssayEvent,LedgerEvent} from '../types.ts';
import type {EventMeta} from './analysis.ts';
import {wordCount} from './text.ts';
export const ARGUMENT_RUBRIC='openpath.argument-coaching@1' as const;
export const ARGUMENT_AREAS=['claim','reasons','evidence','warrant','counterargument','organization','clarity'] as const;
export type ArgumentArea=typeof ARGUMENT_AREAS[number];
export type ArgumentStage='initial'|'for'|'against'|'revision';
export type WorkspaceGoal='grade7'|'general'|'cat'|'gre'|'gmat';
export type WorkspaceDifficulty='foundation'|'developing'|'stretch';
export interface WorkspacePreferences {version:'workspace-preferences@1';goal:WorkspaceGoal;difficulty:WorkspaceDifficulty;at:string}
export interface ArgumentArtifact {
 version:'argument-artifact@1';id:string;cycle:string;at:string;goal:WorkspaceGoal;difficulty:WorkspaceDifficulty;
 stage:ArgumentStage|'transfer';topic:string;prompt:string;text:string;words:number;dataUse:'synthetic_test';
 /** Revisions remain supported writing, even when no model feedback was available. */
 assistance:'initial_independent'|'perspective_prompt'|'supported_revision'|'independent_transfer';revisionOf?:string;sourceEssayId?:string;
 transferReservationId?:string;independenceDeclaration?:{unaided:true;proctored:false;at:string};
}
/** A finite authored task. IDs and families do not reset when a difficulty preference changes. */
export interface ArgumentTransferTask {id:string;version:number;family:string;topic:string;prompt:string;allowedGoals:readonly WorkspaceGoal[]}
export interface ArgumentTransferReservation {version:'argument-transfer-reservation@1';id:string;at:string;cycle:string;goal:WorkspaceGoal;difficulty:WorkspaceDifficulty;task:ArgumentTransferTask}
export const ARGUMENT_TRANSFER_LIMITATION='A new task in this learner’s recorded history. Writing is declared unaided but unproctored; outside assistance cannot be verified. Feedback is tentative and does not establish improvement, retained writing ability or an exam result.';
/** Exact normalized reuse detection only, not semantic plagiarism or authorship detection. */
export const normalizeArgumentWriting=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export interface ArgumentFinding {area:ArgumentArea;quote:string;question:string;hint:string}
export interface ArgumentFeedback {
 version:'argument-feedback@1';artifactId:string;at:string;status:'observations_only'|'unavailable';
 evaluator:{id:string;version:string;model:string}|null;findings:ArgumentFinding[];notObservable:ArgumentArea[];
 limitation:string;
}
/** A learner-authored response to coaching, not an answer key or assessment. */
export interface ArgumentPractice {
 version:'argument-practice@1';id:string;at:string;artifactId:string;feedbackEventId:string;findingIndex:number;
 finding:ArgumentFinding;prompt:string;text:string;dataUse:'synthetic_test';assistance:'coached_practice';
}
/** Teaching sequence, never an inferred severity ranking. */
export const ARGUMENT_PRACTICE_ORDER:readonly ArgumentArea[]=['claim','reasons','evidence','warrant','counterargument','organization','clarity'];
export interface ArgumentGatewayInfo {available:boolean;id:string;version:string;model:string;rubric:string;protocols:{observe:string;rewrite?:string}}
export interface ArgumentRequest {protocol:'essay-observe.v2';rubric:typeof ARGUMENT_RUBRIC;request_id:string;grade:0|7;essay:{id:string;text:string;words:number};max_observations:number;task_context:{stage:ArgumentStage|'transfer';topic:string;prompt:string;previous?:string}}
export type ArgumentPost=(body:{task:'observe';request:ArgumentRequest;data_use:'synthetic_test'})=>Promise<unknown>;
export const ARGUMENT_LIMITATION='Tentative questions about this writing, not confirmed learner gaps, an ability score, retained learning or an exam prediction.';
const object=(x:unknown,keys:readonly string[])=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!keys.includes(k)))throw Error('Invalid argument feedback schema');return x as Record<string,unknown>;};
const bounded=(x:unknown,max:number):x is string=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
/** Reject only recognizable copying directives, never claim this checks reasoning quality. */
export function overtArgumentAnswerDirective(text:string):boolean {
 return /(?:^|[.!?]\s+)(?:(?:please|you (?:can|could|should)|could you|would you)\s+)?(?:copy|write|use)\s+(?:this|the following)\s+(?:sentence|paragraph|answer|argument)\b|\b(?:model answer|suggested answer|replacement paragraph|a better version)\s*(?:is\s*)?:|\b(?:consider writing|write instead)\s*:/i.test(text.replace(/\s+/g,' ').trim());
}
export function validateArgumentFeedback(raw:unknown,request:ArgumentRequest,info:ArgumentGatewayInfo):Omit<ArgumentFeedback,'artifactId'|'at'> {
 // The gateway record identifier is transport metadata, never learner evidence.
 const envelope=object(raw,['evaluator','output','record']);const who=object(envelope.evaluator,['id','version','model','rubric','protocol']);
 if(who.id!==info.id||who.version!==info.version||who.model!==info.model||who.rubric!==ARGUMENT_RUBRIC||who.protocol!=='essay-observe.v2')throw Error('Argument evaluator provenance differs');
 const output=object(envelope.output,['essay_id','rubric','findings','not_observable']);
 if(output.essay_id!==request.essay.id||output.rubric!==ARGUMENT_RUBRIC||!Array.isArray(output.findings)||output.findings.length>request.max_observations||!Array.isArray(output.not_observable)||output.not_observable.length>ARGUMENT_AREAS.length)throw Error('Invalid argument feedback envelope');
 const seen=new Set<string>();
 const findings=output.findings.map(value=>{const f=object(value,['area','quote','question','hint']);
  if(!ARGUMENT_AREAS.includes(f.area as ArgumentArea)||!bounded(f.quote,1000)||!request.essay.text.includes(f.quote)||!bounded(f.question,600)||!f.question.trimEnd().endsWith('?')||!bounded(f.hint,600)||instructionLike(f.question)||instructionLike(f.hint)||overtArgumentAnswerDirective(f.question)||overtArgumentAnswerDirective(f.hint))throw Error('Invalid argument finding');
  const key=JSON.stringify([f.area,f.quote]);if(seen.has(key))throw Error('Duplicate argument finding');seen.add(key);
  return {area:f.area as ArgumentArea,quote:f.quote,question:f.question,hint:f.hint};
 });
 const notObservable=output.not_observable as ArgumentArea[];
 if(notObservable.some(x=>!ARGUMENT_AREAS.includes(x))||new Set(notObservable).size!==notObservable.length||notObservable.some(area=>findings.some(f=>f.area===area)))throw Error('Inconsistent argument coverage');
 return {version:'argument-feedback@1',status:'observations_only',evaluator:{id:info.id,version:info.version,model:info.model},findings,notObservable:[...notObservable],limitation:ARGUMENT_LIMITATION};
}
export function argumentRequest(artifact:ArgumentArtifact,grade:0|7,previous?:ArgumentArtifact):ArgumentRequest{
 const text=scrubIdentifiers(artifact.text);
 // Never let transfer retries accidentally include the earlier argument, revision or coaching.
 const transfer=artifact.assistance==='independent_transfer'||artifact.stage==='transfer';
 const prior=transfer?undefined:previous;
 return {protocol:'essay-observe.v2',rubric:ARGUMENT_RUBRIC,request_id:`argument:${artifact.id}`,grade,essay:{id:artifact.id,text,words:wordCount(text)},max_observations:8,task_context:{stage:transfer?'transfer':artifact.stage,topic:artifact.topic,prompt:artifact.prompt,...(prior?{previous:scrubIdentifiers(prior.text)}:{})}};
}
export function argumentArtifactEvent(meta:EventMeta,artifact:ArgumentArtifact):EssayEvent{return {kind:'essay',...meta,record:{type:'argument_artifact',artifact}};}
export function argumentFeedbackEvent(meta:EventMeta,feedback:ArgumentFeedback):EssayEvent{return {kind:'essay',...meta,record:{type:'argument_feedback',feedback}};}
export function argumentRecords(events:readonly LedgerEvent[]){
 const artifacts=events.flatMap(e=>e.kind==='essay'&&e.record.type==='argument_artifact'?[e.record.artifact]:[]);
 const feedback=events.flatMap(e=>e.kind==='essay'&&e.record.type==='argument_feedback'?[e.record.feedback]:[]);
 const reservations=events.flatMap(e=>e.kind==='essay'&&e.record.type==='argument_transfer_reserved'?[e.record.reservation]:[]);
 const abandoned=events.flatMap(e=>e.kind==='essay'&&e.record.type==='argument_transfer_abandoned'?[{reservationId:e.record.reservationId,at:e.at}]:[]);
 const practice=events.flatMap(e=>e.kind==='essay'&&e.record.type==='argument_practice'?[e.record.practice]:[]);
 return {artifacts:structuredClone(artifacts),feedback:structuredClone(feedback),practice:structuredClone(practice),reservations:structuredClone(reservations),abandoned:structuredClone(abandoned)};
}
export const SELF_REVIEW_QUESTIONS:Record<ArgumentArea,string>={
 claim:'What exactly are you asking the reader to accept, and where have you stated it?',
 reasons:'Why should that claim follow? Which reason does each paragraph develop?',
 evidence:'Which claim needs an example or evidence? What would count against it?',
 warrant:'How does your evidence support your reason, rather than merely mention the same topic?',
 counterargument:'What would a thoughtful opponent say, and how would you respond without dismissing them?',
 organization:'Can a reader follow the order from claim through reasons to conclusion?',
 clarity:'Which sentence could a reader interpret differently from what you intend? Explain it in your own words.',
};
export const GOAL_TOPICS:Record<WorkspaceGoal,readonly string[]>={
 grade7:['Should schools set aside one lesson each week for student-led projects?','Should school libraries lend books during holidays?'],
 general:['Should a community spend more on shared public spaces than on visitor attractions?','Should workplaces offer a regular day for learning new skills?'],
 cat:['A city should judge public services by user outcomes rather than activity counts.','Flexible working arrangements benefit organizations as well as employees.'],
 gre:['Institutions should prioritize long-term public benefit over immediately measurable results.','A policy that benefits the majority should still be revised when its costs fall heavily on a minority.'],
 gmat:['A business should prioritize retaining existing customers over attracting new ones.','A company should trial a major operational change before adopting it across all branches.'],
};
export function argumentTask(goal:WorkspaceGoal,difficulty:WorkspaceDifficulty,cycleNumber:number,stage:ArgumentStage){
 if(!Object.hasOwn(GOAL_TOPICS,goal)||!['foundation','developing','stretch'].includes(difficulty)||!Number.isInteger(cycleNumber)||cycleNumber<1)throw Error('Invalid writing task selection');
 const topic=GOAL_TOPICS[goal][(cycleNumber-1)%GOAL_TOPICS[goal].length];
 const depth=difficulty==='foundation'?'Use one clear reason and a concrete example.':difficulty==='developing'?'Develop two reasons and make the link from evidence to claim explicit.':'Develop a qualified argument, examine assumptions and address a plausible counterargument.';
 const action=stage==='initial'?'Explain your own view before receiving coaching.':stage==='for'?'Make the strongest fair case in favour, even if it is not your own view.':stage==='against'?'Make the strongest fair case against. Do not merely negate your earlier sentences.':'Improve your own earlier argument. Use the questions as prompts, not replacement sentences. Preserve what you mean and explain the changes in your own words.';
 return {topic,prompt:`${topic}\n${action} ${depth} Write 30–800 words. This is practice, not an official exam task.`,freshTopic:cycleNumber<=GOAL_TOPICS[goal].length};
}

/** Targeted coaching prompts are not replacement prose, correct answers or a new assessment. */
export const ARGUMENT_COACHING:Record<ArgumentArea,{title:string;explanation:string;practicePrompt:string}>={
 claim:{title:'Make the claim precise',explanation:'A claim tells the reader what you want them to accept. Its scope should match what your reasons can support.',practicePrompt:'Write your claim in one sentence using your own words. Underline any word such as all, always or should. Which of those words can your reasons justify?'},
 reasons:{title:'Give each reason a job',explanation:'Reasons explain why the claim deserves acceptance. Repeating the claim with different words does not add a reason.',practicePrompt:'List your reasons without looking at the paragraph. For each, ask: why does this support my claim? Combine duplicates and develop the weakest link in your own words.'},
 evidence:{title:'Support rather than decorate',explanation:'An example or observation needs to bear on the particular reason. An invented illustration can explain an idea but must not be presented as a verified fact.',practicePrompt:'Choose one factual claim in your argument. What evidence would a skeptical reader request? Add a truthful qualification or explain what evidence you would need; do not invent statistics.'},
 warrant:{title:'Explain the missing link',explanation:'The warrant is the connection between evidence and the conclusion. Readers may accept your observation yet disagree about what follows.',practicePrompt:'After one piece of evidence, explain in your own words why it supports your reason. Then name one assumption that connection depends on and decide whether to qualify it.'},
 counterargument:{title:'Answer a fair objection',explanation:'A strong response considers the best plausible objection, not an easy caricature. You can concede part of it while explaining why your conclusion still follows.',practicePrompt:'State the strongest fair objection to your argument in your own words. What part would you concede? Revise your response so it addresses that objection directly.'},
 organization:{title:'Make the route visible',explanation:'Each paragraph needs a purpose and an intelligible relationship to the others. A transition should express that relationship, not merely announce another point.',practicePrompt:'Give each paragraph a short purpose label. Read only those labels. Reorder or revise any step whose connection to the claim is missing, using your own writing.'},
 clarity:{title:'Say exactly what you mean',explanation:'Clarity comes from precise references and manageable sentences, not longer words. Preserve your meaning when you simplify a sentence.',practicePrompt:'Choose one sentence a reader could misunderstand. Explain it aloud or in plain words, then rewrite that sentence yourself. Check that the revised sentence still says what you intend.'},
};
