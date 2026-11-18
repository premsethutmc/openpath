/** Authoring metadata; no calibrated proficiency or exam-equivalence claim. */
export interface WorkspaceBankDraft {
 key:string;capability:string;difficulty:'foundation'|'developing'|'stretch';
 pool:'diagnosis'|'practice'|'confirmation'|'retention';
 prompt:string;options:[string,string,string];answer:0|1|2;explanation:string;
 /** Substantive scenario/task family. Variants of a shared scenario must share this value. */
 /** Optional genuine typed cloze accepted answers, or sentence-order task. */
 typedAnswers?:string[];order?:number[];
 family:string;
 independenceNote:string;
}
