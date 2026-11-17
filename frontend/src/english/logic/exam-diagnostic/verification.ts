import type { ModelWritingObservation } from './model.ts';
export type WritingSkill = ModelWritingObservation['skill'];
export interface WritingCheck {id:string;skill:WritingSkill;prompt:string;options:readonly string[];answer:number;explanation:string}
/** Fixed prototype bank, not calibrated exam items. A shown item must never be reused as fresh evidence. */
export const WRITING_CHECKS: readonly WritingCheck[] = [
  {id:'writing-sva-1',skill:'subject_verb_agreement',prompt:'Each of the proposals ___ a clear objective.',options:['has','have'],answer:0,explanation:'Each is singular, so it takes has.'},
  {id:'writing-sva-2',skill:'subject_verb_agreement',prompt:'The reports on the desk ___ ready.',options:['is','are'],answer:1,explanation:'The subject reports is plural; on the desk does not change it.'},
  {id:'writing-articles-1',skill:'articles',prompt:'The researcher proposed ___ useful alternative.',options:['an','a'],answer:1,explanation:'Useful begins with a consonant /y/ sound, so use a.'},
  {id:'writing-articles-2',skill:'articles',prompt:'We waited for ___ hour before the meeting.',options:['an','a'],answer:0,explanation:'Hour begins with a vowel sound because h is silent, so use an.'},
];
const LESSONS: Record<WritingSkill,string> = {
  subject_verb_agreement:'Find the main subject before choosing the verb. A singular subject such as each takes has or is; a plural subject such as reports takes have or are. Ignore intervening phrases when identifying the subject.',
  articles:'Choose a or an by the next spoken sound, not the first written letter: a useful idea, an hour. This check covers only the a/an distinction, not all article usage.',
};
export function planWritingChecks(observations:readonly ModelWritingObservation[], seen:readonly string[] = []): WritingCheck[] {
  const skills = new Set(observations.filter(o=>o.requiresCheck && o.kind === 'error' && o.confidence !== 'low').map(o=>o.skill));
  // Require a complete unseen pair; otherwise report insufficient fresh evidence rather than recycle items.
  return [...skills].flatMap(skill=>{
    const pair = WRITING_CHECKS.filter(q=>q.skill===skill);
    return pair.every(q=>!seen.includes(q.id)) ? pair.map(q=>({...q,options:[...q.options]})) : [];
  });
}
export function verifyWritingSkill(skill:WritingSkill, answers:Readonly<Record<string,number>>, previouslySeen:readonly string[] = []) {
  const pair = WRITING_CHECKS.filter(q=>q.skill===skill);
  const answered = pair.length===2 && pair.every(q=>!previouslySeen.includes(q.id) && Number.isInteger(answers[q.id]) && answers[q.id]>=0 && answers[q.id]<q.options.length);
  const correct = answered ? pair.filter(q=>answers[q.id]===q.answer).length : null;
  const outcome = correct===0 ? 'needs_practice' : correct===2 ? 'no_gap_shown' : 'inconclusive';
  return {skill,outcome,correct,total:2,calibrated:false as const,scope:skill==='articles' ? 'Only a/an by initial spoken sound; definite/zero articles and the original model concern remain unverified. Not mastery or an exam score.' : 'These two subject–verb agreement questions only; the original model concern remains unverified. Not mastery or an exam score.',lesson:outcome==='needs_practice' ? LESSONS[skill] : null};
}
