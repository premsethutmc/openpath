/** Sentence membership is grounded in exact editorial spans, never keyword scoring. */
import type {Course,Question} from './course.ts';
import {evidenceKey,sentenceChoices} from './sentences.ts';
export type SentenceFinding='complete'|'partial'|'mixed'|'unmatched';
export function supportingSets(course:Course,q:Question):number[][] {
 const spans=q.evidenceAlternatives??[[q.evidence]];
 if(!spans.length||spans.some(set=>!set.length))throw Error(`Empty evidence sets: ${q.id}`);
 return spans.map(set=>[...new Set(set.flatMap(evidence=>evidenceKey(course,{...q,evidence})))].sort((a,b)=>a-b));
}
export function validateSentenceSelection(course:Course,q:Question,selected:readonly number[],allowEmpty=false):void {
 const n=sentenceChoices(course.passages.get(q.passage)!.text).length;
 if((!allowEmpty&&!selected.length)||new Set(selected).size!==selected.length||selected.some(i=>!Number.isInteger(i)||i<0||i>=n))throw Error('Select valid sentence numbers.');
}
export function assessSentences(course:Course,q:Question,selected:readonly number[]):SentenceFinding {
 validateSentenceSelection(course,q,selected);
 const sets=supportingSets(course,q);
 if(sets.some(set=>set.length===selected.length&&set.every(i=>selected.includes(i))))return 'complete';
 if(sets.some(set=>selected.every(i=>set.includes(i))))return 'partial';
 return selected.some(i=>sets.some(set=>set.includes(i)))?'mixed':'unmatched';
}
export const SENTENCE_FEEDBACK:Record<SentenceFinding,string>={
 complete:'Your selected sentences support the answer together.',
 partial:'These sentences are relevant, but another part of the support is missing.',
 mixed:'Some support is present, but the selection includes an extra detail or misses part of the link.',
 unmatched:'These sentences do not support the keyed answer to this question.'
};
