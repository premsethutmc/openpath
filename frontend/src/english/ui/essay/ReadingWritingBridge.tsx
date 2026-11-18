import {useEffect,useState} from 'react';
import type {WorkspaceDifficulty,WorkspaceGoal} from '../../logic/essay-live/workspace-profiles.ts';
import {readingSequence,writingGuidance,restoreReadingDraft,startIndependent,submitReading,READING_REVIEW,type ReadingDraft} from '../../logic/essay-live/reading-writing.ts';
export function ReadingWritingBridge({goal,level,onBack}:{goal:WorkspaceGoal;level:WorkspaceDifficulty;onBack:()=>void}){
 const key=`openpath-reading-writing-v1:${goal}:${level}`;
 const [storageError,setStorageError]=useState(false);
 const [draft,setDraft]=useState<ReadingDraft>(()=>{try{return restoreReadingDraft(localStorage.getItem(key),goal,level);}catch{return restoreReadingDraft(null,goal,level);}});
 const [example,setExample]=useState(false);
 const [priorPractice,setPriorPractice]=useState<ReadingDraft|null>(()=>{try{const raw=localStorage.getItem(`${key}:practice`);return raw?restoreReadingDraft(raw,goal,level):null;}catch{return null;}});
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(draft));setStorageError(false);}catch{setStorageError(true);}},[key,draft]);
 const [worked,practice,independent]=readingSequence(level),text=draft.phase==='practice'?practice:independent;
 const guidance=writingGuidance(goal,level);
 const seenKey=`openpath-reading-writing-seen:${independent.id}`;
 const [previouslyOpened,setPreviouslyOpened]=useState(()=>{try{return localStorage.getItem(`openpath-reading-writing-seen:${readingSequence(level)[2].id}`)==='yes';}catch{return true;}});
 const options=draft.phase==='practice'?[text.distractors[0],text.main,text.distractors[1]]:[text.distractors[0],text.distractors[1],text.main];
 const correct=draft.phase==='practice'?1:2;
 function begin(){try{if(localStorage.getItem(seenKey)==='yes'){setPreviouslyOpened(true);return;}localStorage.setItem(seenKey,'yes');localStorage.setItem(`${key}:practice`,JSON.stringify(draft));setPriorPractice(draft);setDraft(startIndependent(draft));setExample(false);}catch{setStorageError(true);}}
 return <main className="welcome" data-reading-writing="bridge">
  <button onClick={onBack}>Back to workspace choices</button>
  <h1>Read, summarise, make your own case</h1>
  <p>Candidate practice for {goal}, {level}. Your chosen challenge changes passage complexity and support, not a measured age or ability level. Use invented test work only.</p>
  <p>Drafts stay in this browser, separately for each goal and challenge. Nothing here is sent to a model. Only the main-idea choice is checked. Your summary and argument are saved, not automatically assessed. No mastery, exam readiness or improvement is claimed.</p>
  {storageError&&<p role="alert">Browser saving is unavailable. Keep a copy of your writing before leaving. Starting a fresh check requires the practice record to be saved.</p>}
  {draft.phase==='practice'&&<section><h2>Learn the method</h2><ol><li>Find the central point. Ask what the details support.</li><li>Separate an observation from an explanation. Preserve uncertainty.</li><li>Summarise the source before adding your own view.</li><li>Build your recommendation from a reason and a source detail. Explain the connection.</li></ol>
   <button onClick={()=>setExample(!example)} aria-expanded={example}>Study a different worked example</button>
   {example&&<article><h3>{worked.title}</h3><p>{worked.text}</p><p><strong>Model summary of this example only:</strong> {worked.main} {worked.limit}</p><ol><li>The summary keeps the recommendation rather than listing every detail.</li><li>It preserves the limit: {worked.limit}</li><li>A next-step response could ask for another trial that addresses that limit. Explain why the new evidence matters, rather than copying the summary as your opinion.</li></ol><p>Now write about a different passage below. There is no model answer for your own response.</p></article>}</section>}
  <section><h2>{draft.phase==='practice'?'Supported practice':'Fresh independent check'}</h2>
   <p>{draft.phase==='independent'?'This passage is reserved for this first attempt. No worked example or answer feedback is shown before submission. It checks transfer to a new passage, not retention or proficiency. Returning resumes the same attempt, not a new unseen check.':'Use the method and worked example if useful. This is supported learning, not independent evidence.'}</p>
   <h3>{text.title}</h3><p>{text.text}</p>
   <fieldset disabled={draft.submitted}><legend>Which main idea best preserves the passage?</legend>{options.map((option,index)=><label key={option} style={{display:'block'}}><input type="radio" name="reading-main" checked={draft.answer===index} onChange={()=>setDraft({...draft,answer:index})}/>{option}</label>)}</fieldset>
   <label htmlFor="reading-summary">Your source summary. {guidance.summary}</label><textarea id="reading-summary" rows={5} maxLength={6000} value={draft.summary} disabled={draft.submitted} onChange={e=>setDraft({...draft,summary:e.target.value})}/>
   <label htmlFor="reading-response">Your own response. {guidance.response}</label><textarea id="reading-response" rows={7} maxLength={6000} value={draft.response} disabled={draft.submitted} onChange={e=>setDraft({...draft,response:e.target.value})}/>
   {!draft.submitted&&<button disabled={draft.answer===null||!draft.summary.trim()||!draft.response.trim()} onClick={()=>setDraft(submitReading(draft))}>Save attempt and review</button>}
  </section>
  {draft.submitted&&<section aria-live="polite"><h2>Review, not a writing score</h2><p>{draft.answer===correct?'Your main-idea choice matches the authored key. This single choice does not establish reading mastery.':'Revisit the main idea before trying a harder challenge. A detail or an absolute claim can lose the passage’s qualification.'}</p><p>Main idea: {text.main}</p><p>Evidence limit: {text.limit}</p><p>Your two written responses remain unassessed. Use these questions to identify your own revisions:</p><ul>{READING_REVIEW.map(q=><li key={q}>{q}</li>)}</ul>
   <label htmlFor="reading-revision">Rewrite in your own words after reviewing (supported revision, not independent evidence)</label><Revision key={text.id} storageKey={`${key}:${text.id}:revision`} onError={()=>setStorageError(true)}/>
   {draft.phase==='practice'?<><p>Keep this attempt and your revision, then try a different passage without hints. The next passage is available once across goals in this browser. Changing the goal does not make a seen passage fresh.</p>{previouslyOpened?<p>This check passage has already been opened under a goal in this browser. There is no further unseen check at this challenge.</p>:<button onClick={begin}>Start the fresh passage</button>}</>:<><details><summary>Compare with your earlier supported attempt</summary>{priorPractice?.submitted?<><h3>Earlier source summary</h3><p>{priorPractice.summary}</p><h3>Earlier own response</h3><p>{priorPractice.response}</p><p>These passages differ. A side-by-side comparison is reflection, not a measured gain.</p></>:<p>No earlier saved practice is available in this browser.</p>}</details><p>Fresh check completed. This small bank has no further unseen passage at this challenge. Review your work or choose another challenge; repeating this passage must not count as fresh evidence. A later unseen retention check and reliable feedback on free writing are still needed.</p></>}
  </section>}
 </main>;
}
function Revision({storageKey,onError}:{storageKey:string;onError:()=>void}){
 const [text,setText]=useState(()=>{try{return localStorage.getItem(storageKey)??'';}catch{return '';}});
 return <textarea id="reading-revision" rows={6} maxLength={6000} value={text} onChange={e=>{setText(e.target.value);try{localStorage.setItem(storageKey,e.target.value);}catch{onError();}}}/>;
}
