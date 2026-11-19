/** Bounded school-baseline answer + evidence checks. Reuses the reading course; no ability estimate. */
import {COURSE as SOURCE_COURSE,type Course,type Question,questionsFor} from './course.ts';
import {progress,type ReadingRecord} from './session.ts';
export const EVIDENCE_UNIT={skill:'cause',level:1} as const;
/** Small reviewed wording variants for this flow only; canonical passage IDs keep shared exposure conservative. */
export function evidenceCourse(source:Course):Course{
 const course=structuredClone(source);
 const variants=[
  {id:'L1.C1',old:'At first it hid under the bed because it was scared.',text:'It was scared, so at first it hid under the bed.',evidence:'It was scared, so at first it hid under the bed.',extra:' Meena closed the window because the wind was cold.'},
  {id:'L1.C2',old:'He fell down because his shoelace was open.',text:'His open shoelace made him trip and fall down.',evidence:'His open shoelace made him trip and fall down.',extra:' The teacher carried an umbrella because rain was forecast.'},
 ];
 for(const v of variants){const p=course.passages.get(v.id),q=course.questions.find(q=>q.id===v.id+'.cause');if(!p||!q||!p.text.includes(v.old))throw Error('Review baseline wording variants after course changes.');p.text=p.text.replace(v.old,v.text)+v.extra;q.evidence=v.evidence;q.explain=v.text+' The other because sentence explains a different event, not the event in the question.';}
 return course;
}
export const EVIDENCE_COURSE=evidenceCourse(SOURCE_COURSE);
export type EvidenceAttempt={question:string;choice:number;sentences:number[]};
export type EvidenceFinding='matched'|'answer_only'|'evidence_only'|'neither';
export {sentenceChoices,evidenceKey} from "./sentences.ts";
import {sentenceChoices,evidenceKey} from "./sentences.ts";
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
/** A diagnostic cannot begin unless its distinct confirmation can also be reserved. */
export function evidencePair(course:Course,records:readonly ReadingRecord[]):[Question,Question]|null{
 const first=nextEvidenceCheck(course,records);if(!first)return null;
 const second=nextEvidenceCheck(course,records,[first.passage]);return second?[first,second]:null;
}
export type EvidenceState={version:1;phase:'initial'|'lesson'|'practice'|'practice_review'|'confirmation'|'done';initial:string;confirmation:string|null;draft:{choice:number|null;sentences:number[]};attempts:EvidenceAttempt[]};
export function newEvidenceState(question:string,confirmation:string|null=null):EvidenceState{return {version:1,phase:'initial',initial:question,confirmation,draft:{choice:null,sentences:[]},attempts:[]};}
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
