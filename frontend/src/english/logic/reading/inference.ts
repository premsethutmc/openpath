/** Authored multi-clue reasoning overlays on existing course texts. No free-text/model assessment. */
import {COURSE,type Course,type Question} from './course.ts';
import {sentenceChoices} from './evidence.ts';
import {progress,type ReadingRecord} from './session.ts';
export const INFERENCE_UNIT={skill:'cause',level:3} as const;
export interface ClueItem {question:string;passage:string;answer:string;sets:number[][];anchors:Record<number,string>;link:string;limit:string;}
export const CLUE_ITEMS:ClueItem[]=[
 {question:'L2.C2.cause',passage:'L2.C2',answer:'The lake had been cleaned, so more fish live in it.',sets:[[7,9],[8,9],[7,8,9]],anchors:{7:'The club leader said the lake was cleaner now.',8:'Last March, people from the town had removed the weeds and rubbish from the water.',9:'More fish live in clean water, and birds come where the fish are.'},link:'Connect a cleaner lake (reported by the leader or described by the clean-up) with the stated food link: clean water supports fish, and birds come where fish are.',limit:'This is the passage’s supported explanation. A bird count alone would not prove that cleaning caused the change.'},
 {question:'L2.C4.cause',passage:'L2.C4',answer:'Nila had cut the blades thinner.',sets:[[6,7],[3,6,7]],anchors:{3:'On Wednesday, the blades would not turn.',6:'She cut the blades again, thinner this time, and tested them in front of the table fan until midnight.',7:'On Friday morning, the windmill turned and lit a tiny bulb.'},link:'Connect the changed and tested blades to the later working model. The earlier failure can also help show the contrast.',limit:'This is the best-supported explanation among the choices, not proof that blade thickness was the only factor. Testing happened too.'},
 {question:'L2.P1.cause',passage:'L2.P1',answer:'There were far fewer bottles to pick up.',sets:[[1,7,8],[1,4,7,8]],anchors:{1:'The gardener, Mr Das, filled three sacks with them every week.',4:'Children had to bring a steel bottle from home, and the shop inside the school stopped selling water in plastic bottles.',7:'After a month, Mr Das filled only half a sack a week.',8:'He started using his free time to plant a row of sunflowers along the wall.'},link:'Compare three sacks with half a sack, then connect that reduced collection work to the free time used for planting. The bottle rule may be included to explain the earlier change.',limit:'The passage supports this explanation; it does not measure exactly how many minutes were saved.'}
];
export const CHECK_CLUES=CLUE_ITEMS.slice(0,2),PRACTICE_CLUES=CLUE_ITEMS[2];
export function validateClueItems(course:Course,items=CLUE_ITEMS):void{
 for(const item of items){const q=course.questions.find(q=>q.id===item.question),p=course.passages.get(item.passage);if(!q||!p||q.passage!==item.passage||q.level!==3||q.skill!=='cause'||q.options[q.answer]!==item.answer)throw Error('Multi-clue course reference changed.');const sentences=sentenceChoices(p.text);for(const [i,text] of Object.entries(item.anchors))if(sentences[Number(i)]!==text)throw Error('Review multi-clue annotations after text changes.');for(const set of item.sets)if(set.length<2||new Set(set).size!==set.length||set.some(i=>!Object.hasOwn(item.anchors,i)))throw Error('Invalid authored multi-clue set.');}
}
validateClueItems(COURSE);
export interface ClueAttempt {question:string;choice:number;sentences:number[];}
export type ClueResult={answerCorrect:boolean;evidence:'complete'|'partial'|'mixed'|'unmatched';};
export function assessClues(a:ClueAttempt,course:Course=COURSE):ClueResult{
 const item=CLUE_ITEMS.find(i=>i.question===a.question),q=course.questions.find(q=>q.id===a.question);if(!item||!q)throw Error('Unknown multi-clue item.');const n=sentenceChoices(course.passages.get(item.passage)!.text).length;
 if(!Number.isInteger(a.choice)||a.choice<0||a.choice>=q.options.length||!a.sentences.length||new Set(a.sentences).size!==a.sentences.length||a.sentences.some(i=>!Number.isInteger(i)||i<0||i>=n))throw Error('Choose a valid answer and clue sentences.');
 const exact=item.sets.some(set=>set.length===a.sentences.length&&set.every(i=>a.sentences.includes(i)));
 const subset=item.sets.some(set=>a.sentences.every(i=>set.includes(i)));
 const overlap=a.sentences.some(i=>item.sets.some(set=>set.includes(i)));
 return {answerCorrect:a.choice===q.answer,evidence:exact?'complete':subset?'partial':overlap?'mixed':'unmatched'};
}
export const CLUE_FEEDBACK:Record<ClueResult['evidence'],string>={complete:'Your selected sentences support the answer together.',partial:'You selected relevant clues, but the set is incomplete. Another link is needed.',mixed:'Your selection includes relevant clues but is not one of the supporting combinations for this question. Check for a missing link or unnecessary selections.',unmatched:'Your selected sentences do not include a clue from the supporting combinations for this question.'};
export function clueLesson(r:ClueResult):string{
 if(r.evidence==='partial')return 'One clue can describe a change without showing what followed. Find the sentence that completes the connection.';
 if(r.evidence==='mixed'||r.evidence==='unmatched')return 'Match each selected sentence to the event in the question. A nearby detail or the word because is not enough. Keep the smallest set that connects the change to the outcome.';
 return r.answerCorrect?'Explain how the clues connect, and keep the conclusion no stronger than the passage supports.':'Your clues connect, but the chosen answer does not match their explanation. Compare each answer with the whole clue set, not just one word.';
}
/** Both equivalent-role passages must still be unseen across ALL reading skills; reserve before display. */
export function unseenCluePair(records:readonly ReadingRecord[],course:Course=COURSE):[Question,Question]|null{
 const seen=progress(course,records).seenPassages;
 if(CHECK_CLUES.some(i=>seen.has(i.passage)))return null;
 return CHECK_CLUES.map(i=>course.questions.find(q=>q.id===i.question)!) as [Question,Question];
}
export type CluePhase='initial'|'lesson'|'practice'|'practice_review'|'confirmation'|'done';
export interface ClueState {version:1;phase:CluePhase;initial:string;confirmation:string;draft:{choice:number|null;sentences:number[]};attempts:ClueAttempt[];}
export function newClueState(pair:[Question,Question]):ClueState{return {version:1,phase:'initial',initial:pair[0].id,confirmation:pair[1].id,draft:{choice:null,sentences:[]},attempts:[]};}
export function restoreClueState(raw:string,course:Course=COURSE):ClueState{
 const s=JSON.parse(raw) as ClueState;if(s?.version!==1||s.initial!==CHECK_CLUES[0].question||s.confirmation!==CHECK_CLUES[1].question||!Array.isArray(s.attempts)||!s.draft||!Array.isArray(s.draft.sentences))throw Error('Unreadable multi-clue record.');
 const counts:Record<CluePhase,number>={initial:0,lesson:1,practice:1,practice_review:2,confirmation:2,done:3};if(!Object.hasOwn(counts,s.phase)||s.attempts.length!==counts[s.phase])throw Error('Invalid phase history.');
 const ids=[s.initial,PRACTICE_CLUES.question,s.confirmation];s.attempts.forEach((a,i)=>{if(a.question!==ids[i])throw Error('Invalid attempt order.');assessClues(a,course);});
 const id=s.phase==='practice'||s.phase==='practice_review'?PRACTICE_CLUES.question:s.phase==='confirmation'||s.phase==='done'?s.confirmation:s.initial;
 const q=course.questions.find(q=>q.id===id)!;const n=sentenceChoices(course.passages.get(q.passage)!.text).length;
 if(s.draft.choice!==null&&(!Number.isInteger(s.draft.choice)||s.draft.choice<0||s.draft.choice>=q.options.length))throw Error('Invalid draft choice.');if(new Set(s.draft.sentences).size!==s.draft.sentences.length||s.draft.sentences.some(i=>!Number.isInteger(i)||i<0||i>=n))throw Error('Invalid draft clues.');return s;
}

/** A reservation is one shown event; any additional exposure invalidates fresh confirmation. */
export function confirmationStillFresh(question:string,records:readonly ReadingRecord[],course:Course=COURSE):boolean {
 const target=course.questions.find(q=>q.id===question);if(!target)return false;
 const exposures=records.filter(r=>r.type==='shown'&&course.questions.find(q=>q.id===r.question)?.passage===target.passage);
 return exposures.length===1&&exposures[0].type==='shown'&&exposures[0].question===question;
}
