import {useEffect,useRef,useState} from 'react';
import {Api} from '../logic/account.ts';
import {ExamJourney as Journey,EXAMPLE_WRITING} from '../logic/exam-diagnostic/journey.ts';
import {QUESTIONS,PASSAGE,WRITING_PROMPT,report} from '../logic/exam-diagnostic/session.ts';
import {ReadingFollowUp} from '../logic/exam-diagnostic/reading-follow-up.ts';
import {EXPOSURE_KEY,exposureStore} from '../logic/exam-diagnostic/exposure.ts';
const label=(s:string)=>s.replaceAll('_',' ');
/** No writing/answers are persisted. Only exposed item IDs are retained to avoid repeated evidence. */
export function ExamJourney(){
 const [flow,setFlow]=useState<Journey|null>(null);
 const [state,setState]=useState<ReturnType<Journey['snapshot']>|null>(null);
 const [supportedWriting,setSupportedWriting]=useState(false);
 const [reading,setReading]=useState<ReadingFollowUp|null>(null);
 const [readingState,setReadingState]=useState<ReturnType<ReadingFollowUp['snapshot']>|null>(null);
 const [revision,setRevision]=useState('');const [draft,setDraft]=useState(EXAMPLE_WRITING);const [confirmed,setConfirmed]=useState(false);
 const [error,setError]=useState('');const [blocked,setBlocked]=useState(false);const [connecting,setConnecting]=useState(false);
 const [server,setServer]=useState(false);const [resetAsked,setResetAsked]=useState(false);const generation=useRef(0);
 const ledger=useRef<ReturnType<typeof exposureStore>|null>(null);
 const active=useRef<Journey|null>(null);const conflict=useRef(false);
 useEffect(()=>{
  const changed=(event:StorageEvent)=>{
   if(!ledger.current||event.storageArea!==localStorage||(event.key!==null&&event.key!==EXPOSURE_KEY))return;
   conflict.current=true;generation.current++;active.current?.cancel();setConnecting(false);setBlocked(true);
   setError('Exposure history changed in another tab. This sitting cannot report fresh evidence. Close other diagnostic tabs, then discard and restart.');
  };
  window.addEventListener('storage',changed);
  return ()=>{generation.current++;active.current?.cancel();window.removeEventListener('storage',changed);};
 },[]);
 function expose(ids:string[]){if(conflict.current||!ledger.current)throw Error('Exposure conflict');ledger.current.claim(ids);}
 function sync(f:Journey){try{const next=f.snapshot();expose(next.seen);setState(next);}catch{setBlocked(true);setError('Exposure history could not be saved. Stop here and restore browser storage before restarting; this sitting cannot report fresh evidence.');}}
 async function start(){
  if(connecting||blocked||conflict.current)return;setConnecting(true);setError('');const token=++generation.current;
  try{
   ledger.current=exposureStore(localStorage);conflict.current=false;const seen=ledger.current.read();expose(seen);
   let f:Journey;
   if(server){const api=new Api();const info=await api.examEvaluatorStatus();if(!info.available||!info.synthetic_only)throw Error('The synthetic exam evaluator is unavailable. A signed-in developer account and configured server are required.');f=new Journey(info,b=>api.essayEvaluate(b),seen,'server');}
   else f=new Journey(undefined,undefined,seen);
   if(token!==generation.current)return;active.current=f;setFlow(f);sync(f);
  }catch{if(token===generation.current)setError('Could not start. Check browser storage. Server mode also needs a signed-in developer account and a configured exam evaluator; no offline fallback was substituted.');}
  finally{if(token===generation.current)setConnecting(false);}
 }
 function act(fn:()=>void){if(blocked||conflict.current)return;try{fn();setError('');if(flow)sync(flow);}catch(e){setError(e instanceof Error?e.message:'Could not continue.');}}
 async function analyse(){if(!flow||blocked||conflict.current)return;const token=generation.current;const pending=flow.analyse(draft,confirmed);sync(flow);try{await pending;}catch(e){if(token!==generation.current)return;setError(e instanceof Error?e.message:'Could not analyse.');}if(token===generation.current)sync(flow);}
 function startReading(){if(!state||blocked||conflict.current)return;try{const r=new ReadingFollowUp(state.session,ledger.current!.read());setReading(r);setReadingState(r.snapshot());if(state.phase!=='complete')setSupportedWriting(true);}catch{setBlocked(true);setError('Could not read exposure history. Reading follow-up is paused.');}}
 function readingAct(fn:()=>void){if(!reading||blocked||conflict.current)return;try{fn();const next=reading.snapshot();expose(next.seenIds);setReadingState(next);}catch{setBlocked(true);setError('Could not save exposure history. This sitting is paused.');}}
 function reset(){generation.current++;flow?.cancel();active.current=null;ledger.current=null;conflict.current=false;setFlow(null);setState(null);setReading(null);setReadingState(null);setSupportedWriting(false);setConfirmed(false);setDraft(EXAMPLE_WRITING);setRevision('');setResetAsked(false);setConnecting(false);setBlocked(false);setError('');}
 const q=state?.phase==='reading'?QUESTIONS.find(q=>state.session.answers[q.id]===undefined):null;
 const bank=state?.phase==='checks'?state.checks:state?.phase==='reassessment'?state.fresh:[];
 const answers=state?.phase==='checks'?state.answers:state?.freshAnswers??{};
 const current=bank.find(q=>!Object.hasOwn(answers,q.id));
 return <main className="welcome" data-exam-journey="1"><h1>English diagnostic: complete synthetic journey</h1>
 <p>Reading and a short written explanation, then targeted checks, teaching and fresh reassessment. Allow about ten minutes for the initial exercises; follow-up practice takes longer.</p>
 <p>This developer rehearsal is not a real-learner assessment or a CAT, GRE, UPSC or TNPSC score predictor. Speaking is not assessed.</p>
 <p>Writing and answers stay in memory and disappear on reload or exit. Only exposed question IDs are saved on this device. Use one diagnostic tab at a time; freshness is device-local, not cross-device. Repeated initial reading questions are practice, not new evidence. Do not enter personal details or real learner writing.</p>
 {error&&<p role="alert">{error}</p>}
 {state?.error&&<p role="alert">{state.error}</p>}
 {!flow&&<section><label><input type="checkbox" checked={server} disabled={connecting} onChange={e=>setServer(e.target.checked)}/>Use configured server evaluator (developer account; invented writing only)</label><p>{server?'Only after you explicitly submit, the invented writing and source task are sent to OpenPath’s server and its configured model provider. No provider key is used in the browser.':'Default: fixed invented writing and a simulated response. No API or model call.'}</p><button disabled={connecting||blocked} onClick={()=>void start()}>{connecting?'Checking configuration…':'Start synthetic journey'}</button></section>}
 {flow&&state&&!blocked&&<>
 <p role="status">Mode: {state.mode==='server'?'configured server; synthetic only':'offline simulation; no model call'} · Step: {state.phase}</p>
 {q&&<section><h2>Read and reason</h2><p>{PASSAGE}</p><fieldset key={q.id}><legend>{q.prompt}</legend>{q.options.map((o,i)=><button key={i} onClick={()=>act(()=>flow.reading(q.id,i))}>{o}</button>)}</fieldset></section>}
 {['writing','error'].includes(state.phase)&&<section><h2>Invented written explanation</h2><p>{PASSAGE}</p><p>{WRITING_PROMPT}</p><label htmlFor="synthetic-exam-text">Synthetic writing (50–250 words)</label><textarea id="synthetic-exam-text" rows={9} readOnly={state.mode==='simulated'} value={draft} onChange={e=>setDraft(e.target.value)}/><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>This is invented test text, not a real learner’s work.</label><button disabled={!confirmed} onClick={()=>void analyse()}>Analyse invented writing</button></section>}
 {supportedWriting&&<p>Reading help has been opened. Any retried writing is supported practice, not a new independent writing sample.</p>}
 {state.phase==='analysing'&&<button onClick={()=>act(()=>flow.cancel())}>Cancel analysis</button>}
 {['checks','teaching','reassessment','complete'].includes(state.phase)&&<p>Model observations are hypotheses. Independent questions, not the model, decide which practice to offer.</p>}
 {(state.phase==='checks'||state.phase==='reassessment')&&<section><h2>{state.phase==='checks'?'Check possible writing gaps':'Fresh reassessment without help'}</h2>{current?<fieldset key={current.id}><legend>{current.prompt}</legend>{current.options.map((o,i)=><button key={i} onClick={()=>act(()=>flow.answer(current.id,i))}>{o}</button>)}</fieldset>:<button onClick={()=>act(()=>state.phase==='checks'?flow.finishChecks():flow.finish())}>{state.phase==='checks'?'Choose targeted teaching':'Finish reassessment'}</button>}</section>}
 {state.phase==='teaching'&&<section><h2>Targeted teaching</h2><p>Mixed evidence remains inconclusive. These short lessons offer practice, not a diagnosis.</p>{state.lessons.map(skill=>{const lesson=flow.teachingSnapshot(skill);if(!lesson)return null;return <article key={skill} data-guided-skill={skill}><h3>{label(skill)}</h3><p>{lesson.lesson.title}. {lesson.lesson.scope}</p><p>{flow.lesson(skill)}</p><p>Supported learning only. Finishing this lesson does not establish understanding or change your independent results.</p>
 {lesson.phase==='example'&&<section><h4>Worked example</h4><p>{lesson.lesson.workedExample.prompt}</p><p>{lesson.lesson.workedExample.answer}</p><ol>{lesson.lesson.workedExample.steps.map((step,i)=><li key={i}>{step}</li>)}</ol><button onClick={()=>act(()=>flow.guidedAction(skill,'start'))}>Try guided practice</button></section>}
 {lesson.practice&&lesson.phase!=='complete'&&<section><fieldset disabled={lesson.phase!=='practice'}><legend>{lesson.practice.prompt}</legend>{lesson.practice.options.map((option,i)=><button key={i} onClick={()=>act(()=>flow.guidedAction(skill,'answer',i))}>{option}</button>)}</fieldset>{lesson.hint&&<p>Hint: {lesson.hint}</p>}{lesson.phase==='practice'&&<><button onClick={()=>act(()=>flow.guidedAction(skill,'hint'))}>Show a hint</button><button onClick={()=>act(()=>flow.guidedAction(skill,'reveal'))}>Show the worked answer</button></>}</section>}
 {lesson.feedback&&lesson.phase==='feedback'&&<section><p>{lesson.feedback.explanation}</p>{lesson.feedback.expected&&<p>Worked answer: {lesson.feedback.expected}</p>}{!lesson.feedback.correct&&!lesson.feedback.expected?<><button onClick={()=>act(()=>flow.guidedAction(skill,'retry'))}>Try again with support</button><button onClick={()=>act(()=>flow.guidedAction(skill,'reveal'))}>Show the worked answer</button></>:<button onClick={()=>act(()=>flow.guidedAction(skill,'complete'))}>Finish supported lesson</button>}</section>}
 {lesson.phase==='complete'&&<p>Supported lesson complete. Now use unseen questions to check the idea without hints.</p>}
 </article>;})}<button disabled={!state.lessons.every(s=>state.taught.includes(s))} onClick={()=>act(()=>flow.startReassessment())}>Start fresh questions</button></section>}
 {state.phase==='complete'&&<section><h2>Evidence from this sitting</h2>{state.observations.length===0&&<p>No validated concerns returned. This is not proof that writing has no gaps.</p>}{state.results.length===0&&state.observations.length>0&&<p>No eligible fresh check pair was available, or observations did not justify checks. Writing ability remains unresolved.</p>}{flow.practicePlan().map(r=><article key={r.skill}><h3>{label(r.skill)}</h3><p>Initial checks: {r.correct??'unavailable'} / {r.total}. {r.outcome.replaceAll('_',' ')}.</p><p>Fresh reassessment: {r.after===null?'not completed':`${r.after} / 2`}. {r.interpretation}</p><p>{r.scope}</p><p>Next: {r.next}</p></article>)}
 {flow.coverage().filter(r=>!r.checksAvailable||(r.taught&&!r.retestAvailable)).map(r=><p key={r.skill} role="status">{label(r.skill)}: {!r.checksAvailable?'The fresh verification bank is exhausted. No result was inferred.':'The fresh reassessment bank is exhausted. Teaching is not proof of improvement.'}</p>)}
 <details><summary>Review independent answers and explanations</summary>{flow.review().map(r=><article key={r.id}><h3>{label(r.skill)} · {r.stage}</h3><p>{r.prompt}</p><p>Your answer: {r.selected}. {r.correct?'Correct on this item.':'Not correct on this item.'}</p><p>Expected answer: {r.expected}</p><p>{r.explanation}</p></article>)}</details>
 <section><h2>Put it back into your own writing</h2><p>Optional invented-writing practice, not a scored reassessment. Rewrite the original explanation in 50–250 words: preserve the author’s qualifications, connect evidence to your claim, and check subjects and a/an. Your revision stays in memory and is not sent to a model. Saving does not establish improvement.</p><label htmlFor="synthetic-revision">Revised invented explanation</label><textarea id="synthetic-revision" rows={8} value={revision} onChange={e=>setRevision(e.target.value)}/><button onClick={()=>act(()=>flow.saveRevision(revision))}>Save unassessed revision</button>{state.session.revision&&<p role="status">Revision saved for this sitting, not assessed. Reload or restart discards it.</p>}</section>
 {state.notObservable.length>0&&<p>Not observable from this sample: {state.notObservable.map(label).join(', ')}. No ability conclusion was drawn for these areas.</p>}
 <details><summary>Review tentative model observations</summary>{state.observations.map((o,i)=><article key={i}><h3>{label(o.skill)}</h3><blockquote>{o.quote}</blockquote><p>Suggested change: {o.correction??'none'}</p><p>{o.explanation}</p></article>)}</details>
 <p>Grammar breadth, vocabulary, organisation, lasting learning and exam scores remain unmeasured. This small prototype is not a complete English proficiency assessment.</p></section>}
 {(state.phase==='complete'||state.phase==='error')&&<section> <h2>Reading evidence</h2>{report(state.session).map(r=><p key={r.skill}>{label(r.skill)}: {r.status==='supported'?'supported on this question':'possible gap'}. {r.detail}</p>)}
 {!reading&&<button onClick={startReading}>Teach and recheck reading gaps</button>}
 {reading&&readingState&&<section><h3>Reading follow-up</h3>{readingState.lesson&&<><p>{readingState.lesson.text}</p><button onClick={()=>readingAct(()=>reading.completeLesson())}>Try a new reading question</button></>}{readingState.question&&<><p>{readingState.question.passage}</p><fieldset disabled={readingState.phase!=='check'}><legend>{readingState.question.prompt}</legend>{readingState.question.options.map((o,i)=><button key={i} onClick={()=>readingAct(()=>reading.answer(readingState.question!.id,i))}>{o}</button>)}</fieldset></>}{readingState.phase==='feedback'&&<><p>{readingState.results.at(-1)?.explanation}</p><button onClick={()=>readingAct(()=>reading.next())}>Continue reading follow-up</button></>}{readingState.phase==='complete'&&<><p>Reading follow-up complete. {readingState.skills.length===0?'No incorrect initial responses means no targeted reading lesson was needed.':'The outcomes below cover only these immediate follow-up questions.'}</p>{readingState.results.map(r=><p key={r.skill}>{label(r.skill)}: {r.outcome.replaceAll('_',' ')}. {r.scope}</p>)}</>}</section>}
 </section>}
 </>}
 {(flow||connecting||blocked)&&<>{resetAsked?<section><p>Discard this sitting and unsaved writing? Question exposure history will be kept.</p><button onClick={()=>setResetAsked(false)}>Keep this sitting</button><button onClick={reset}>Discard and restart</button></section>:<button onClick={()=>setResetAsked(true)}>Restart journey</button>}</>}
 <p><a href="?experience=exam-diagnostic">Return to local reading/writing preview</a></p></main>;
}
