import {useEffect,useRef,useState} from 'react';
import {ARGUMENT_CONCEPTS,ARGUMENT_CONCEPT_MAP,ARGUMENT_CONCEPT_LIMITATIONS,DEVELOPER_VERIFICATION,type ArgumentConcept,type Item} from '../../../../../packages/english-core/src/index.ts';
import type {Learner} from '../../logic/learner.ts';
import {openArgumentConceptLearner} from '../../logic/essay-live/argument-concept-learner.ts';
import {essayContext} from '../../logic/essay-live/studio.ts';
import {ArgumentConceptPlan} from '../../logic/essay-live/argument-plan.ts';
import {withArgumentConceptContent,createArgumentConceptProfile} from '../../logic/essay-live/argument-concept-content.ts';
import type {ArgumentWorkspace} from '../../logic/essay-live/argument-workspace.ts';
import type {WorkspaceSelection} from './EnglishWorkspace.tsx';
import {ItemView} from '../ItemView.tsx';

type View=ReturnType<ArgumentConceptPlan['view']>;
type Plan=View['plans'][number];
type Concern=ReturnType<ArgumentWorkspace['view']>['concerns'][number];
/** One engine, with concept evidence kept separate from the learner's own writing record. */
export function ArgumentConceptPlanView({source,selection,concerns,writingBusy}:{source:Learner;selection:WorkspaceSelection;concerns:Concern[];writingBusy:boolean}){
 const [controller,setController]=useState<ArgumentConceptPlan|null>(null);
 const [view,setView]=useState<View|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [shown,setShown]=useState<{plan:string;item:Item}|null>(null);
 const [feedback,setFeedback]=useState<{correct:boolean;explanation:string}|null>(null);
 const live=useRef(true),working=useRef(false);
 useEffect(()=>{live.current=true;let active=true;let plan:ArgumentConceptPlan|null=null;
  void(async()=>{try{
   const content=withArgumentConceptContent(source.content);
   const learner=await openArgumentConceptLearner(source,content);
   const profile=createArgumentConceptProfile(selection.goal,selection.difficulty,content);
   plan=new ArgumentConceptPlan(source,learner,essayContext(content,DEVELOPER_VERIFICATION,profile));
   if(active){setController(plan);setView(plan.view());}else plan.cancel();
  }catch(e){if(active)setError(e instanceof Error?e.message:'Could not open concept practice.');}})();
  return()=>{active=false;live.current=false;plan?.cancel();};
 },[source,selection]);
 async function run(action:()=>Promise<unknown>){
  if(!controller||working.current||writingBusy)return;
  working.current=true;setBusy(true);setError('');
  try{await action();if(live.current){const next=controller.view();setView(next);setShown(old=>old&&next.plans.some(p=>p.probe.id===old.plan&&p.nextItemId===old.item.id)?old:null);}}
  catch(e){if(live.current){setError(e instanceof Error?e.message:'Could not save this concept step.');const next=controller.view();setView(next);setShown(old=>old&&next.plans.some(p=>p.probe.id===old.plan&&p.nextItemId===old.item.id)?old:null);}}
  finally{working.current=false;if(live.current)setBusy(false);}
 }
 const locked=busy||writingBusy;
 const existing=new Set(view?.plans.map(p=>p.probe.capability)??[]);
 const priority:Record<Plan['phase'],number>={review:0,check:1,lesson:2,guided:3,probe:4,ready:5,waiting:6,blocked:7};
 const ordered=[...(view?.plans??[])].sort((a,b)=>priority[a.phase]-priority[b.phase]||a.probe.at.localeCompare(b.probe.at));
 return <section data-argument-concept-plan="1">
  <h3>My evidence-based concept plan</h3>
  <p>Check a related concept, then use the result to choose practice. These authored tasks do not grade your argument. Concept results stay separate from your writing ability record; your own revision remains your work.</p>
  {error&&<p role="alert">{error}</p>}
  {!view&&!error&&<p role="status">Opening saved concept practice…</p>}
  {controller&&view&&<>
   {concerns.length>0&&<details><summary>Concept checks suggested by my writing concerns</summary>
    <p>A related concept check is a referral, not confirmation that your writing is wrong. In particular, support questions do not test whether a warrant or real-world evidence is valid.</p>
    {concerns.map(c=><article key={`${c.feedbackEventId}:${c.findingIndex}`}><blockquote>{c.finding.quote}</blockquote><p>{c.finding.question}</p><p className="small">{ARGUMENT_CONCEPT_LIMITATIONS[c.finding.area]}</p>
     {ARGUMENT_CONCEPT_MAP[c.finding.area].length===0?<p>No specified concept check covers this concern. Use the own-word coaching below; no score is invented.</p>:ARGUMENT_CONCEPT_MAP[c.finding.area].map(cap=><button key={cap} type="button" disabled={locked||existing.has(cap)} onClick={()=>void run(()=>controller.startProbe({artifactId:c.artifactId,feedbackEventId:c.feedbackEventId,findingIndex:c.findingIndex,capability:cap}))}>{existing.has(cap)?'Continue saved plan below':`Check related concept: ${ARGUMENT_CONCEPTS[cap]}`}</button>)}
    </article>)}
   </details>}
   <details><summary>Choose concept practice without a diagnosis</summary><p>Choose a practice area yourself, including when no evaluator is connected. This choice is not a detected weakness or a placement result.</p>
    {(Object.entries(ARGUMENT_CONCEPTS) as [ArgumentConcept,string][]).map(([cap,label])=><button type="button" key={cap} disabled={locked||existing.has(cap)} onClick={()=>void run(()=>controller.startExploration(cap))}>{existing.has(cap)?`Saved plan: ${label}`:`Explore: ${label}`}</button>)}
   </details>
   {view.plans.length===0&&<p>No concept plan started yet. Choose a related check or a practice area. No weakness is inferred from an empty plan.</p>}
   {view.plans.length>1&&<p>Due checks and unfinished support appear first. This is a next-step order, not a ranking of your weaknesses.</p>}
   {ordered.map(p=><article key={p.probe.id} data-concept-phase={p.phase} data-concept-plan-id={p.probe.id}>
    <h4>{p.label}</h4><p>{p.probe.sourceKind==='self_selected'?'You chose this practice area; it was not diagnosed from your writing.':'Suggested by a saved writing concern; the concept results do not confirm that concern.'}</p><p>{p.reason}</p>
    <p>Initial concept probes: {p.answered}/{p.total} answered{p.answered===p.total?`; ${p.correct} correct`:". Results and explanations appear after the whole probe is complete"}. This result concerns these tasks, not the quality of your draft.</p>
    {p.probeReview.length>0&&<ResponseReview rows={p.probeReview} controller={controller} title="Review completed concept probes"/>}
    {p.phase==='lesson'&&p.lessons.filter(l=>!l.done&&l.content).slice(0,1).map(l=><ConceptLesson key={`${p.probe.id}:${l.id}`} lesson={l.content!} locked={locked} complete={correct=>run(()=>controller.finishLesson(p.probe.id,l.id,correct))}/>)}
    {p.nextItemId&&shown?.plan!==p.probe.id&&<button type="button" disabled={locked} onClick={()=>void run(async()=>{setFeedback(null);const item=await controller.presentNext(p.probe.id);if(live.current&&item)setShown({plan:p.probe.id,item});})}>{p.phase==='guided'?'Open supported concept practice':p.phase==='probe'?'Open next concept probe':'Open due independent concept check'}</button>}
    {shown?.plan===p.probe.id&&<div><ItemView key={shown.item.id} item={shown.item} voice={null} locked={locked} onSubmit={response=>void run(async()=>{const result=await controller.answerNext(p.probe.id,shown.item.id,response);if(live.current){setShown(null);const after=result.view.plans.find(next=>next.probe.id===p.probe.id);const complete=p.phase==='guided'||(p.phase==='probe'&&after?.answered===after?.total)||(p.phase==='check'&&after?.checks.some(check=>check.id===p.check?.id&&check.complete));setFeedback(complete&&result.feedback?{correct:result.feedback.correct,explanation:result.feedback.explanation}:null);}})}/></div>}
    {(p.phase==='ready'||p.phase==='review')&&<button type="button" disabled={locked} onClick={()=>void run(()=>controller.planNextCheck(p.probe.id))}>{p.phase==='review'?'Plan supported review':'Plan the next fresh concept check'}</button>}
    {p.phase==='waiting'&&p.check&&<p>Next check not before {new Date(p.check.notBefore).toLocaleString()}. It remains unavailable early. Returning does not reset your evidence or reuse old questions.</p>}
    {p.checks.length>0&&<details><summary>Saved concept-check results</summary><ul>{p.checks.map(check=><li key={check.id}>{check.kind==='retention'?'Delayed concept review':'Fresh concept check'}: {check.complete?`${check.correct} correct of ${check.counted} counted responses (${check.total} tasks)`:'Not completed yet'}.{check.passed!==null&&` Delayed concept evidence ${check.passed?'supported performance on these tasks':'did not support performance on these tasks'}.`}{check.invalidReasons.map((reason,i)=><p key={i}>Not counted: {reason}</p>)}{check.review.length>0&&<ResponseReview rows={check.review} controller={controller} title="Review completed check answers"/>}</li>)}</ul><p>These are authored concept-task outcomes, not scores for your prose or a verified writing level.</p></details>}
    <details><summary>What this plan records</summary><p>Lessons and guided answers are supported activity. Independent and later checks use separate unseen tasks. Even a retained concept result does not prove your own argument is sound.</p><p>Saved lesson activity: {p.lessons.filter(l=>l.done).length}/{p.lessons.length}. Return to your own writing above to apply what you learned; this plan never supplies a replacement paragraph.</p></details>
   </article>)}
   {feedback&&<p role="status">{feedback.correct?'Correct on that concept task.':'That concept answer needs attention.'} {feedback.explanation}</p>}
   <p className="small">{view.limitation}</p>
  </>}
 </section>;
}
function ConceptLesson({lesson,locked,complete}:{lesson:NonNullable<Plan['lessons'][number]['content']>;locked:boolean;complete:(correct:boolean)=>Promise<unknown>}){
 const [answer,setAnswer]=useState<number|null>(null);
 return <section data-concept-lesson={lesson.id}><h5>{lesson.title}</h5><p>{lesson.rule}</p>{lesson.examples.map((example,i)=><div key={i}><blockquote>{example.text}</blockquote>{example.note&&<p>{example.note}</p>}</div>)}{lesson.tip&&<p>{lesson.tip}</p>}
  <p>{lesson.check.prompt}</p>{lesson.check.options.map((option,i)=><button type="button" key={option} disabled={locked||answer!==null} onClick={()=>setAnswer(i)}>{option}</button>)}
  {answer!==null&&<><p>{answer===lesson.check.answer?'That fits this example.':'Compare your choice with the reasoning.'} {lesson.check.explain}</p><button type="button" disabled={locked} onClick={()=>void complete(answer===lesson.check.answer)}>Record supported lesson and continue</button></>}
 </section>;
}

function ResponseReview({rows,controller,title}:{rows:Plan['probeReview'];controller:ArgumentConceptPlan;title:string}){
 return <details><summary>{title}</summary>{rows.map(row=>{const item=controller.context.ctx.content.items.get(row.itemId),r=row.response;const answer=item?.kind==='code'&&r.kind==='choice'?item.options?.[r.choice]:item?.kind==='code'&&r.kind==='order'?r.order.map(i=>item.options?.[i]).join(' '):r.kind==='typed'?r.text:JSON.stringify(r);return <article key={row.itemId}><p>{row.prompt}</p><p>Your response: {answer}</p><p>{row.correct?'Correct on this task.':'Needs attention on this task.'}{row.assisted?' Supported answer, not independent evidence.':''} {row.explanation}</p></article>;})}</details>;
}
