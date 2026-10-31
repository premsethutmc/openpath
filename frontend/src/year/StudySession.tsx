import type {StudyAdvice} from '../../../packages/learning/src/study-session';
import {useRef,useState,useEffect} from 'react';
import {useStudyTime,type SaveStudy} from './useStudyTime';
import {studyAdvice} from './study-summary';
import {creditOf} from '../../../packages/learning/src/grade';
import {unifiedAuthoritative} from '../../../packages/learning/src/grading/mode';
import type {StudyRecord} from '../../../packages/learning/src/session';
import type {CurriculumRelease} from '../../../packages/learning/src/curriculum';
/** Executes a saved planner queue using existing lessons, module decisions and keyboard question controls. */
import {Lesson,Module,type Ctx,STATUS_WORD} from './Learn';
import {useResume} from './resume';
import {moduleFor} from '../../../packages/learning/src/content';
import {diagnose} from '../../../packages/learning/src/diagnostic';
import {contentReviewOf,establishedIds,failsChecks,orderStrategies} from '../../../packages/learning/src/intervention';
import {chapterExplanation,contentEligibility} from '../../../packages/learning/src/explanation-review';
import {graph} from '../../../packages/learning/src/graph';
import {reviewOf} from '../../../packages/learning/src/review';
import {REVIEW_WORD} from '../../../packages/learning/src/dashboard';
import type {topicPlan} from './topic-session';
type Plan=ReturnType<typeof topicPlan>;
function StudyBlock({competency,ctx,resumeKey,onNext}:{competency:string;ctx:Ctx;resumeKey:string;onNext:()=>void}){
 const m=moduleFor(competency);
 // The shared engine supplies strategy ordering; no new teaching selection or mathematical scoring policy.
 const [strategyId]=useResume(`${resumeKey}:strategy`,m?orderStrategies(m,diagnose(m,ctx.records.attempts),ctx.records)[0]?.id:null);
 // explanation-review@1: a saved choice is checked again now (it may have been blocked, or the mode changed, since it was saved)
 const chosen=m?.strategies.find(s=>s.id===strategyId);
 const review=m&&chosen?contentReviewOf(m,chosen,establishedIds(competency,ctx.records)):null;
 const strategy=m&&chosen&&!failsChecks(m,chosen)&&review?.eligible?chosen:undefined;
 const chapterOk=!!m&&contentEligibility(m,chapterExplanation(m),{competency:m.competency,usage:'lesson'}).eligible;
 const [intro,setIntro]=useResume(`${resumeKey}:intro`,false);
 const alreadyTaught=ctx.records.teaching.some(t=>t.competency===competency&&t.strategy===strategyId);
 const verified=ctx.evidence(competency).status==='verified';
 if(!m)return <><p>This module is unavailable.</p><button onClick={onNext}>Next planned competency</button></>;
 if(!intro&&!alreadyTaught&&!verified&&strategy){
  const screens=[...(chapterOk?m.chapter:[]),...strategy.screens];
  return <section aria-label="Concept teaching"><h2>{graph.get(competency).name}</h2><p className="small muted" role="note" data-content-review={review?.status}>{review?.label}</p><Lesson key={strategy.id} s={{title:strategy.title,screens}} resumeKey={`${resumeKey}:introduction-screen`} saving={ctx.saving} onDone={async()=>{if(await ctx.teach(competency,strategy.id,'session-concept'))setIntro(true);}}/></section>;
 }
 return <Module competency={competency} ctx={ctx} resumeKey={resumeKey} sessionMode onExit={onNext}/>;
}
const duration=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
export function StudySession({plan,ctx,resumeKey,onBack,planId,learner,release,latest,saveStudy,initialGaps}:{plan:Plan;ctx:Ctx;resumeKey:string;onBack:()=>void;planId:string;learner:string;release:CurriculumRelease;latest?:StudyRecord;saveStudy:SaveStudy;initialGaps:StudyAdvice['gaps']}){
 const root=useRef<HTMLElement>(null);
 const timer=useStudyTime(planId,latest,saveStudy,root);
 const [finishCurrent,setFinishCurrent]=useState(false);
 const [finishAfterStep,setFinishAfterStep]=useState(false);
 const finish=()=>timer.finish(studyAdvice(planId,release,ctx,initialGaps));
 useEffect(()=>{if(finishAfterStep&&!ctx.saving){setFinishAfterStep(false);void finish();}},[finishAfterStep,ctx.saving,ctx.records]);
 const studyCtx:Ctx={...ctx,saving:ctx.saving||!timer.ready||timer.ending||timer.closing||finishAfterStep,
  answer:async(qid,response,activity,o)=>{const ok=await ctx.answer(qid,response,activity,{...o,context:`study:${planId}`});if(ok&&finishCurrent&&(ctx.recorded?.()?.verdict??(unifiedAuthoritative()&&creditOf(qid,response)===true?'correct':null))==='correct')setFinishAfterStep(true);return ok;},
  teach:async(...args)=>{const ok=await ctx.teach(...args);if(ok&&finishCurrent)setFinishAfterStep(true);return ok;}};

 // Freeze the selected planner recommendations for this saved session. Practice must not rewrite its queue.
 const [queue]=useResume(`${resumeKey}:queue`,plan.items);
 const [stored,setIndex]=useResume(`${resumeKey}:index`,0);
 const index=Number.isInteger(stored)&&stored>=0&&stored<=queue.length?stored:0;
 const current=queue[index];
 const totalMs=plan.availableMinutes*60_000,expired=timer.time.activeMs>=totalMs;
 if(latest?.phase==='ended'&&latest.summary){const summary=latest.summary;return <section className="study-session" aria-label="Session summary"><h1>Your session summary</h1><p>Planned: {plan.availableMinutes} minutes · Active learning: {duration(latest.time.activeMs)} · Problem solving (within active time): {duration(latest.time.solvingMs)} · Idle: {duration(latest.time.idleMs)}</p><p>{summary.correctIds.length} correct · {summary.incorrectIds.length} incorrect · {summary.pendingIds.length} awaiting educator marking</p><h2>Competencies attempted</h2>{summary.competencies.length?<ul>{summary.competencies.map(id=><li key={id}>{graph.get(id).name}</li>)}</ul>:<p>No answers were submitted in this study session.</p>}<h2>Prerequisite findings</h2>{summary.gaps.length?<ul>{summary.gaps.map(g=><li key={g.competency}>{graph.get(g.competency).name}: {g.reason}</li>)}</ul>:<p>No prerequisite gap was established. A wrong answer alone does not prove a missing skill.</p>}<h2>More practice</h2>{summary.morePractice.length?<ul>{summary.morePractice.map(id=><li key={id}>{graph.get(id).name}</li>)}</ul>:<p>No additional practice requirement was identified from these attempts.</p>}<h2>Next recommended step</h2><p>{summary.next.competency&&<strong>{graph.get(summary.next.competency).name}. </strong>}{summary.next.reason}</p><p className="small muted">This is a performance summary, not verified mastery. Correct answers may include help. Existing review and evidence rules still apply.</p><div className="actions"><a className="primary" href={`/year/?learner=${encodeURIComponent(learner)}`}>Back to My Learning Year</a></div><button className="link" onClick={onBack}>Back to study plan</button></section>;}
 return <section ref={root} className="study-session" aria-label="Study session">
  <div className="study-timer"><output aria-label="Remaining session time" aria-live="off">{duration(Math.max(0,totalMs-timer.time.activeMs))} remaining of {plan.availableMinutes} min</output><button className="link" disabled={ctx.saving||timer.ending||!timer.ready} onClick={()=>void finish()}>End session</button></div>
  <details className="small"><summary>Time details</summary><dl><dt>Active learning</dt><dd data-time="active">{duration(timer.time.activeMs)}</dd><dt>Problem solving (part of active learning)</dt><dd data-time="solving">{duration(timer.time.solvingMs)}</dd><dt>Visible idle time</dt><dd data-time="idle">{duration(timer.time.idleMs)}</dd></dl><p>After a minute without activity, time is idle. Background tabs and time away from the app are excluded. Time is not mastery.</p></details>
  {timer.error&&<p role="alert">{timer.error} <button onClick={()=>void (timer.closing?finish():timer.checkpoint())}>Retry save</button></p>}
  {!timer.ready&&<p>Saving your session start…</p>}
  {timer.ending&&<p role="status">Saving your session summary…</p>}
  {expired&&<aside aria-label="Planned time finished"><p>Your planned study time is up. You can finish this {root.current?.querySelector('.qcard')?'problem':'activity'}, or stop now.</p>{!finishCurrent&&<button className="secondary" onClick={()=>setFinishCurrent(true)}>Finish current problem or activity</button>}<button className="link" disabled={ctx.saving||timer.ending} onClick={()=>void finish()}>End now</button>{finishCurrent&&<p>Keep your working. We will save your summary after you finish.</p>}</aside>}

  <p className="eyebrow">Your study session</p><h1>{current?'Learn, then try it':'Planned work visited'}</h1>
  <p role="status">{index} of {queue.length} planned focus blocks visited · {queue.slice(index).reduce((n,i)=>n+i.minutes,0)} estimated minutes remaining</p>
  <progress aria-label="Session activities visited" value={index} max={Math.max(1,queue.length)}/>
  <p className="small muted">Activity progress is separate from understanding. Time allowances are provisional; this is not a mastery score.</p>
  {current?<><p className="small">Module review: {REVIEW_WORD[reviewOf(current.competency).state]} · Understanding: {STATUS_WORD[ctx.evidence(current.competency).status]}</p><StudyBlock key={current.competency} competency={current.competency} ctx={studyCtx} resumeKey={`${resumeKey}:${current.competency}`} onNext={()=>setIndex(index+1)}/><details><summary>Remaining planned work</summary><ul>{queue.slice(index+1).map(i=><li key={i.competency}>{graph.get(i.competency).name} · about {i.minutes} minutes</li>)}</ul></details></>:<p>Your answers and teaching are saved. Visiting this plan does not verify mastery. Delayed reassessment is not started here.</p>}
  <button className="link" disabled={timer.ending} onClick={async()=>{await timer.checkpoint();onBack();}}>Back to study plan</button>
 </section>;
}
