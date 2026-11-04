import {plannedFindings} from './study-summary';
import type {SaveStudy} from "./useStudyTime";
import type {StudyRecord} from "../../../packages/learning/src/session";
import {StudySession} from "./StudySession";
import {useResume} from "./resume";
import {useState,useEffect,useRef,useMemo} from 'react';
import {AnswerInput,type Ctx} from './Learn';
import {question} from '../../../packages/learning/src/content';
import {DIAGNOSIS_TEXT} from '../../../packages/learning/src/diagnostic';
import {graph} from '../../../packages/learning/src/graph';
import type {CurriculumRelease} from '../../../packages/learning/src/curriculum';
import type {LearningRecord} from '../../../packages/learning/src/records';
import {reviewOf} from '../../../packages/learning/src/review';
import {REVIEW_WORD} from '../../../packages/learning/src/dashboard';
import {Figure} from './Figure';
import {topicCheck,topicPlan} from './topic-session';

type Props={academicYear:string;learner:string;target:string;ctx:Ctx;release:CurriculumRelease;events:readonly {kind:string}[];saveStudy:SaveStudy;saveStart:()=>Promise<boolean>;savePlan:(minutes:15|30|60)=>Promise<boolean>};
export function TopicSession({academicYear,learner,target,ctx,release,events,saveStart,savePlan,saveStudy}:Props){
 const label=REVIEW_WORD[reviewOf(target).state];
 const check=topicCheck(target,ctx),qid=check.question;
 const saved=[...events].reverse().find((e:any)=>e.record==='topic_session'&&e.academicYear===academicYear&&e.stage==='plan'&&e.target===target&&e.curriculum?.id===release.id&&e.curriculum?.hash===release.hash) as Extract<LearningRecord,{record:'topic_session'}>|undefined;
 // The plan ID fixes the diagnostic evidence prefix; subsequent answers must not rewrite its findings.
 const initialGaps=useMemo(()=>saved?plannedFindings(learner,saved,events,ctx):[],[saved?.id]);
 const starting=useRef(false);
 const started=events.some((e:any)=>e.record==='topic_session'&&e.academicYear===academicYear&&e.target===target&&e.curriculum?.hash===release.hash);
 useEffect(()=>{if(!started&&!starting.current){starting.current=true;void saveStart().then(ok=>{if(!ok)starting.current=false;});}},[started,target,release.hash]);
 const key=`openpath.topic-input:${learner}:${academicYear}:${ctx.records.enrolments.at(-1)?.curriculum.hash}:${target}`;
 const [value,setValue]=useState(()=>{try{const v=JSON.parse(sessionStorage.getItem(key)??'null');return v&&typeof v.qid==='string'&&typeof v.text==='string'?v:{qid:null,text:''};}catch{return {qid:null,text:''};}});
 const [showPlan,setShowPlan]=useState(!!saved);
 const [hideSummary,setHideSummary]=useState(false);
 const completed=saved&&events.some((e:any)=>e.record==="study_session"&&e.planId===saved.id&&e.phase==="ended");
 const executionKey=`openpath.study@1:${learner}:${academicYear}:${release.hash}:${saved?.id ?? target}`;
 const [active,setActive]=useResume(`${executionKey}:active`,false);
 if(saved&&(active||(completed&&!hideSummary)))return <StudySession key={saved.id} plan={topicPlan(target,release,ctx,saved.minutes!)} ctx={ctx} resumeKey={executionKey} planId={saved.id} learner={learner} release={release} latest={[...events].reverse().find((e:any)=>e.record==="study_session"&&e.planId===saved.id) as StudyRecord|undefined} saveStudy={saveStudy} initialGaps={initialGaps} onBack={()=>{setActive(false);setHideSummary(true);}}/>;
 if(qid&&!saved){const q=question(qid);return <section className="topic-session" aria-label="Topic diagnostic" data-qid={qid}><p className="eyebrow">Starting-point check</p><h1>{graph.get(target).name}</h1><p>{check.reason}</p><p className="muted">This checks one starting competency, not every skill in the topic. Module review: {label}. Questions retain their existing review gate.</p><h2>{q.prompt}</h2>{q.figure && <Figure v={q.figure}/>}<AnswerInput q={q} value={value.qid===qid?value.text:''} disabled={ctx.saving} setValue={text=>{const v={qid,text};setValue(v);try{sessionStorage.setItem(key,JSON.stringify(v));}catch{/* Checked answers still use the authenticated ledger. */}}}/><button className="primary" disabled={ctx.saving||value.qid!==qid||!value.text.trim()} onClick={async()=>{if(await ctx.answer(qid,value.text,check.context?'probe':'diagnostic',check.context?{context:check.context}:{})){try{sessionStorage.removeItem(key);}catch{}setValue({qid:null,text:''});setShowPlan(false);}}}>Check answer</button><p className="small muted">Checked answers are saved to your learner record. No teaching or answer reveal is given during this check.</p></section>;}
 const plan=saved&&showPlan?topicPlan(target,release,ctx,saved.minutes!):null;
 return <section className="topic-session" aria-label="Diagnostic results"><h1>Your starting point</h1><p className="muted small">Module review: {label}</p><p>{check.diagnosis?.result?DIAGNOSIS_TEXT[check.diagnosis.result]:check.reason}</p><p>Understanding: {ctx.evidence(target).status}. A short diagnostic does not grant verified mastery.</p>{check.support&&<aside aria-label="Supporting skill"><h2>{graph.get(check.support).name}</h2><p>{check.recovery?.plan?.why}</p><p>{check.supportDiagnosis?.result?`Supporting diagnostic: ${check.supportDiagnosis.result}.`:'Needs checking; a single wrong answer does not prove a gap.'}</p></aside>}
 {!plan?<><h2>How much time do you have?</h2><div className="actions session-duration" role="group" aria-label="Study duration">{([15,30,60] as const).map(n=><button key={n} className="secondary" disabled={ctx.saving} onClick={async()=>{if(await savePlan(n))setShowPlan(true);}}>{n} minutes</button>)}</div></>:<section aria-label="Study plan"><h2>Your {saved!.minutes}-minute study plan</h2><p>Estimated focused work: {plan.estimatedMinutes} minutes. Available time: {plan.availableMinutes} minutes.</p><p className="muted small">Provisional planning allowance: 15 minutes per focus block, not an estimate of time to mastery or a promise to finish the module. Remaining time is unallocated if the existing planner has no more recommendations.</p><ol>{plan.items.map(i=><li key={i.competency}><h3>{graph.get(i.competency).name} · about {i.minutes} minutes</h3><p>{i.reason}</p><ul>{(graph.get(i.competency).objectives ?? []).map(o=><li key={o}>{o}</li>)}</ul><p>Current understanding: {ctx.evidence(i.competency).status}</p></li>)}</ol>{!plan.items.length&&<p>No new module is recommended now. Existing mastery and delayed checks are preserved.</p>}<button className="link" onClick={()=>setShowPlan(false)}>Change session duration</button><button className="primary" onClick={()=>setActive(true)}>{completed?"View session summary":"Start or resume study"}</button></section>}
 </section>;
}
