/** Executes a saved planner queue using existing lessons, module decisions and keyboard question controls. */
import {Lesson,Module,type Ctx,STATUS_WORD} from './Learn';
import {useResume} from './resume';
import {moduleFor} from '../../../packages/learning/src/content';
import {diagnose} from '../../../packages/learning/src/diagnostic';
import {orderStrategies} from '../../../packages/learning/src/intervention';
import {graph} from '../../../packages/learning/src/graph';
import {reviewOf} from '../../../packages/learning/src/review';
import {REVIEW_WORD} from '../../../packages/learning/src/dashboard';
import type {topicPlan} from './topic-session';
type Plan=ReturnType<typeof topicPlan>;
function StudyBlock({competency,ctx,resumeKey,onNext}:{competency:string;ctx:Ctx;resumeKey:string;onNext:()=>void}){
 const m=moduleFor(competency);
 // The shared engine supplies strategy ordering; no new teaching selection or mathematical scoring policy.
 const [strategyId]=useResume(`${resumeKey}:strategy`,m?orderStrategies(m,diagnose(m,ctx.records.attempts),ctx.records)[0]?.id:null);
 const strategy=m?.strategies.find(s=>s.id===strategyId);
 const [intro,setIntro]=useResume(`${resumeKey}:intro`,false);
 const alreadyTaught=ctx.records.teaching.some(t=>t.competency===competency&&t.strategy===strategyId);
 const verified=ctx.evidence(competency).status==='verified';
 if(!m)return <><p>This module is unavailable.</p><button onClick={onNext}>Next planned competency</button></>;
 if(!intro&&!alreadyTaught&&!verified&&strategy){
  const screens=[...m.chapter,...strategy.screens];
  return <section aria-label="Concept teaching"><h2>{graph.get(competency).name}</h2><Lesson key={strategy.id} s={{title:strategy.title,screens}} resumeKey={`${resumeKey}:introduction-screen`} saving={ctx.saving} onDone={async()=>{if(await ctx.teach(competency,strategy.id,'session-concept'))setIntro(true);}}/></section>;
 }
 return <Module competency={competency} ctx={ctx} resumeKey={resumeKey} sessionMode onExit={onNext}/>;
}
export function StudySession({plan,ctx,resumeKey,onBack}:{plan:Plan;ctx:Ctx;resumeKey:string;onBack:()=>void}){
 // Freeze the selected planner recommendations for this saved session. Practice must not rewrite its queue.
 const [queue]=useResume(`${resumeKey}:queue`,plan.items);
 const [stored,setIndex]=useResume(`${resumeKey}:index`,0);
 const index=Number.isInteger(stored)&&stored>=0&&stored<=queue.length?stored:0;
 const current=queue[index];
 return <section className="study-session" aria-label="Study session">
  <p className="eyebrow">Your study session</p><h1>{current?'Learn, then try it':'Planned work visited'}</h1>
  <p role="status">{index} of {queue.length} planned focus blocks visited · {queue.slice(index).reduce((n,i)=>n+i.minutes,0)} estimated minutes remaining</p>
  <progress aria-label="Session activities visited" value={index} max={Math.max(1,queue.length)}/>
  <p className="small muted">Activity progress is separate from understanding. Time allowances are provisional; this is not a mastery score.</p>
  {current?<><p className="small">Module review: {REVIEW_WORD[reviewOf(current.competency).state]} · Understanding: {STATUS_WORD[ctx.evidence(current.competency).status]}</p><StudyBlock key={current.competency} competency={current.competency} ctx={ctx} resumeKey={`${resumeKey}:${current.competency}`} onNext={()=>setIndex(index+1)}/><details><summary>Remaining planned work</summary><ul>{queue.slice(index+1).map(i=><li key={i.competency}>{graph.get(i.competency).name} · about {i.minutes} minutes</li>)}</ul></details></>:<p>Your answers and teaching are saved. Visiting this plan does not verify mastery. Delayed reassessment is not started here.</p>}
  <button className="link" onClick={onBack}>Back to study plan</button>
 </section>;
}
