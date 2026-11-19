/** Bounded school-baseline answer + evidence checks. Reuses the reading course; no ability estimate. */
import {type Course,type Question,questionsFor} from './course.ts';
import {progress,type ReadingRecord} from './session.ts';
export const EVIDENCE_UNIT={skill:'cause',level:1} as const;
export type EvidenceAttempt={question:string;choice:number;sentences:number[]};
export type EvidenceFinding='matched'|'answer_only'|'evidence_only'|'neither';
export function sentenceChoices(text:string):string[]{return text.match(/[^.!?]+[.!?]+(?:[”"']?)(?:\s+|$)|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)??[];}
export function evidenceKey(course:Course,q:Question):number[]{
 const text=course.passages.get(q.passage)!.text,at=text.indexOf(q.evidence);
 if(at<0)throw Error('Missing authored evidence.');
 let cursor=0;const hits:number[]=[];
 for(const [i,s] of sentenceChoices(text).entries()){const start=text.indexOf(s,cursor),end=start+s.length;if(start<at+q.evidence.length&&end>at)hits.push(i);cursor=end;}
 if(!hits.length)throw Error('No evidence sentence.');return hits;
}
export function checkEvidence(course:Course,a:EvidenceAttempt){
 const q=course.questions.find(q=>q.id===a.question&&q.skill===EVIDENCE_UNIT.skill&&q.level===1);
 if(!q)throw Error('Unsupported question.');
 const n=sentenceChoices(course.passages.get(q.passage)!.text).length;
 if(!Number.isInteger(a.choice)||a.choice<0||a.choice>=q.options.length||!a.sentences.length||new Set(a.sentences).size!==a.sentences.length||a.sentences.some(i=>!Number.isInteger(i)||i<0||i>=n))throw Error('Choose an answer and valid evidence.');
 const key=evidenceKey(course,q),answerCorrect=a.choice===q.answer;
 const evidenceCorrect=key.length===a.sentences.length&&key.every(i=>a.sentences.includes(i));
 const finding:EvidenceFinding=answerCorrect?(evidenceCorrect?'matched':'answer_only'):(evidenceCorrect?'evidence_only':'neither');
 return {finding,answerCorrect,evidenceCorrect,key};
}
export const FINDINGS:Record<EvidenceFinding,{observation:string;lesson:string}>={
 matched:{observation:'Your answer and selected sentence(s) match this question’s authored key.',lesson:'Keep the link clear: name the event, find its stated reason, then connect that reason to your answer.'},
 answer_only:{observation:'Your answer matches, but your selected sentence(s) do not match the supporting evidence key. We cannot tell whether you guessed.',lesson:'Find the event named in the why question. Select the sentence that states its reason, not a nearby detail. Selecting every sentence is not the same as identifying support.'},
 evidence_only:{observation:'You selected the supporting sentence(s), but your answer does not match the reason stated there.',lesson:'Read the reason in your selected sentence again. Compare each answer with those exact words. Do not replace the stated reason with something that could have happened.'},
 neither:{observation:'Neither your answer nor your selected sentence(s) matches the authored key on this question.',lesson:'First find the event in the question. Next look for the reason given in the text. Then choose the answer and the sentence that support one another.'}
};
/** Strictly unseen PASSAGES, not merely new questions about a previously read passage. */
export function nextEvidenceCheck(course:Course,records:readonly ReadingRecord[],extraSeen:readonly string[]=[]):Question|null{
 const p=progress(course,records),seen=new Set([...p.seenPassages,...extraSeen]);
 return questionsFor(course,EVIDENCE_UNIT,'check').find(q=>!seen.has(q.passage))??null;
}
export type EvidenceState={version:1;phase:'initial'|'lesson'|'practice'|'practice_review'|'confirmation'|'done';initial:string;confirmation:string|null;draft:{choice:number|null;sentences:number[]};attempts:EvidenceAttempt[]};
export function newEvidenceState(question:string):EvidenceState{return {version:1,phase:'initial',initial:question,confirmation:null,draft:{choice:null,sentences:[]},attempts:[]};}
export function restoreEvidence(raw:string,course:Course):EvidenceState{
 const s=JSON.parse(raw) as EvidenceState;
 if(s?.version!==1||!['initial','lesson','practice','practice_review','confirmation','done'].includes(s.phase)||!Array.isArray(s.attempts)||s.attempts.length>3||!s.draft||!Array.isArray(s.draft.sentences))throw Error('Unreadable evidence record.');
 const initial=course.questions.find(q=>q.id===s.initial&&q.role==='check'&&q.skill==='cause'&&q.level===1);
 const confirm=s.confirmation===null?null:course.questions.find(q=>q.id===s.confirmation&&q.role==='check'&&q.skill==='cause'&&q.level===1);
 if(!initial||(s.confirmation!==null&&(!confirm||confirm.passage===initial.passage)))throw Error('Invalid passage record.');
 const count=s.phase==='initial'?0:s.phase==='lesson'||s.phase==='practice'?1:s.phase==='confirmation'||s.phase==='practice_review'?2:3;
 if(s.attempts.length!==count||(['confirmation','done'].includes(s.phase)&&!confirm))throw Error('Invalid phase history.');
 const practice=questionsFor(course,EVIDENCE_UNIT,'practice')[0];
 const expected=[initial.id,practice.id,confirm?.id];
 s.attempts.forEach((a,i)=>{if(a.question!==expected[i])throw Error('Invalid attempt history.');checkEvidence(course,a);});
 const current=s.phase==='initial'?initial:s.phase==='practice'||s.phase==='practice_review'?practice:confirm??initial;
 if(s.draft.choice!==null&&(!Number.isInteger(s.draft.choice)||s.draft.choice<0||s.draft.choice>=current.options.length))throw Error('Invalid choice.');
 const n=sentenceChoices(course.passages.get(current.passage)!.text).length;
 if(new Set(s.draft.sentences).size!==s.draft.sentences.length||s.draft.sentences.some(i=>!Number.isInteger(i)||i<0||i>=n))throw Error('Invalid evidence draft.');
 return s;
}
