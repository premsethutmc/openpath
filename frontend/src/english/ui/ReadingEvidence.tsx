import {useRef,useState} from 'react';
import {lessonFor,questionsFor,type Question} from '../logic/reading/course.ts';
import {EVIDENCE_COURSE as COURSE,evidencePair,checkEvidence,EVIDENCE_UNIT,evidenceKey,FINDINGS,newEvidenceState,restoreEvidence,sentenceChoices,type EvidenceAttempt,type EvidenceState} from '../logic/reading/evidence.ts';
import type {Learner} from '../logic/learner.ts';
import {PassageView} from './Reading.tsx';
/** Uses the existing learner ledger for passage exposure; this candidate's paired responses stay on this device. */
export function ReadingEvidence({learner,onBack,onChanged}:{learner:Learner;onBack:()=>void;onChanged:()=>void}){
 const key=`openpath-reading-evidence-v1:${learner.profileId}`;
 const [loaded]=useState(()=>{try{const raw=localStorage.getItem(key);return {state:raw?restoreEvidence(raw,COURSE):null,error:''};}catch{return {state:null,error:'Saved work cannot be read. It has not been overwritten. Return to reading; do not clear browser data if you need this record.'};}});
 const [state,setState]=useState<EvidenceState|null>(loaded.state),[error,setError]=useState(loaded.error),[busy,setBusy]=useState(false),[exhausted,setExhausted]=useState(false);const lock=useRef(false);
 const lesson=lessonFor(COURSE,EVIDENCE_UNIT),practice=questionsFor(COURSE,EVIDENCE_UNIT,'practice')[0];
 function save(next:EvidenceState){try{localStorage.setItem(key,JSON.stringify(next));setState(next);setError('');return true;}catch{setError('This step could not be saved. Your previous saved work is unchanged. Retry after browser storage is available.');return false;}}
 async function reserve(initial:boolean){if(lock.current||loaded.error)return;lock.current=true;setBusy(true);try{
  if(!initial){if(!state?.confirmation){setError('This older attempt has no reserved confirmation. Its work is preserved; it cannot be called a new complete check.');return;}save({...state,phase:'confirmation',draft:{choice:null,sentences:[]}});return;}
  const pair=evidencePair(COURSE,learner.readingRecords());if(!pair){setExhausted(true);return;}
  // Reserve both passages before the diagnostic is displayed. A returning reader with only one left stops here.
  await learner.recordReading(pair.map(q=>({type:'shown' as const,unit:EVIDENCE_UNIT,question:q.id,use:'check' as const})));onChanged();
  save(newEvidenceState(pair[0].id,pair[1].id));
 }catch{setError('The passage could not be reserved safely. No new passage is shown. Please retry.');}finally{lock.current=false;setBusy(false);}}
 async function startPractice(){if(!state||lock.current)return;lock.current=true;setBusy(true);try{await learner.recordReading([{type:'lesson_done',unit:EVIDENCE_UNIT},{type:'shown',unit:EVIDENCE_UNIT,question:practice.id,use:'practice'}]);onChanged();save({...state,phase:'practice',draft:{choice:null,sentences:[]}});}catch{setError('The teaching step could not be saved. Please retry.');}finally{lock.current=false;setBusy(false);}}
 function submit(q:Question){if(!state||state.draft.choice===null)return;const a={question:q.id,choice:state.draft.choice,sentences:[...state.draft.sentences]};checkEvidence(COURSE,a);save({...state,attempts:[...state.attempts,a],draft:{choice:null,sentences:[]},phase:state.phase==='initial'?'lesson':state.phase==='practice'?'practice_review':'done'});}
 function review(a:EvidenceAttempt){const q=COURSE.questions.find(q=>q.id===a.question)!,r=checkEvidence(COURSE,a),sentences=sentenceChoices(COURSE.passages.get(q.passage)!.text);return <section className="tile lilac" key={q.id}><h2>{COURSE.passages.get(q.passage)!.title}</h2><p>{FINDINGS[r.finding].observation}</p><p>You chose: {q.options[a.choice]}</p><p>Supporting sentences you selected: {a.sentences.map(i=>i+1).join(', ')}</p><p>Authored answer: {q.options[q.answer]}</p><blockquote>{evidenceKey(COURSE,q).map(i=>sentences[i]).join(' ')}</blockquote><p>{q.explain}</p></section>;}
 const phase=state?.phase??'ready';
 let q:Question|null=null;if(state&&['initial','practice','confirmation'].includes(phase))q=phase==='practice'?practice:COURSE.questions.find(q=>q.id===(phase==='initial'?state.initial:state.confirmation))!;
 return <main className="page reading" data-evidence-phase={phase}>
 <button className="link" onClick={onBack} disabled={busy}>Back to reading skills</button><h1 className="hero">Answer and show why</h1>
 <p>School baseline: find a reason in a short text, then select the sentence that supports it. No timer, model calls or exam score.</p>
 <p className="small">This is candidate practice. Responses are kept on this device; passage exposure uses your reading record. A match is evidence for this item, not mastery or lasting improvement.</p>
 {error&&<p role="alert">{error}</p>}
 {phase==='ready'&&!loaded.error&&<><p>First try without help. Then study a short lesson and practise before a different, unseen passage.</p><button className="primary" disabled={busy||exhausted} onClick={()=>void reserve(true)}>Start my independent attempt</button></>}
 {exhausted&&<p role="status">Two distinct unseen passages are needed before starting this loop; fewer than two remain at this baseline. A different question on an already read passage will not count as fresh. Your existing work is preserved.</p>}
 {q&&state&&<><p className="pill">{phase==='practice'?'Supported practice':phase==='initial'?'Initial independent attempt':'New passage confirmation · no hints'}</p>
  {phase==='practice'&&<p className="rule">{FINDINGS[checkEvidence(COURSE,state.attempts[0]).finding].lesson} {lesson.tip}</p>}
  <PassageView passage={COURSE.passages.get(q.passage)!}/><h2 id="evidence-prompt">{q.prompt}</h2>
  <fieldset><legend>Choose your answer</legend>{q.options.map((o,i)=><label key={o} style={{display:'block'}}><input type="radio" name="evidence-answer" checked={state.draft.choice===i} onChange={()=>save({...state,draft:{...state.draft,choice:i}})}/>{o}</label>)}</fieldset>
  <fieldset><legend>Which sentence supports your answer? Select only the sentence(s) you need.</legend>{sentenceChoices(COURSE.passages.get(q.passage)!.text).map((s,i)=><label key={s} style={{display:'block'}}><input type="checkbox" checked={state.draft.sentences.includes(i)} onChange={()=>save({...state,draft:{...state.draft,sentences:state.draft.sentences.includes(i)?state.draft.sentences.filter(n=>n!==i):[...state.draft.sentences,i]}})}/>{i+1}. {s}</label>)}</fieldset>
  <button className="primary" disabled={state.draft.choice===null||!state.draft.sentences.length} onClick={()=>submit(q!)}>Lock answer and evidence</button></>}
 {phase==='lesson'&&state&&<>{review(state.attempts[0])}<h2>Your next learning step</h2><p>{FINDINGS[checkEvidence(COURSE,state.attempts[0]).finding].lesson}</p><p>These observations come from your selected answer and sentences. They do not establish why you made a mistake or how fast you read.</p><h2>{lesson.title}</h2><p>Find the event and its stated reason. A reason can use because, so, made, or other wording. A because sentence about a different event is not support.</p><PassageView passage={COURSE.passages.get(lesson.worked.passage)!}/><p>{lesson.worked.prompt}</p><ol>{lesson.worked.steps.map(s=><li key={s}>{s}</li>)}</ol><p>Worked answer: {lesson.worked.answer}</p><button className="primary" disabled={busy} onClick={()=>void startPractice()}>Try the supported practice</button></>}
 {phase==='practice_review'&&state&&<>{review(state.attempts[1])}<p>This was supported practice. The next check uses a different passage with no hints, even if this practice answer did not match.</p><button className="primary" disabled={busy||exhausted} onClick={()=>void reserve(false)}>Try an unseen passage</button></>}
 {phase==='done'&&state&&<><h2>What this attempt shows</h2>{review(state.attempts[2])}<p>{checkEvidence(COURSE,state.attempts[2]).finding==='matched'?'You matched both answer and evidence on one new passage after teaching.':'The new-passage result still needs work. Revisit the reason-to-evidence connection with more practice.'} This is not a mastery, retention or reading-speed result.</p><details><summary>Compare the first attempt and supported practice</summary>{state.attempts.slice(0,2).map(review)}</details><p>Repeat attempts are not presented as new independent evidence. More unseen items and a later retention check are needed.</p></>}
 </main>;
}
