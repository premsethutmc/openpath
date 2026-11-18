import type { ModelWritingObservation } from './model.ts';
export type WritingSkill = ModelWritingObservation['skill'];
export interface WritingCheck {id:string;skill:WritingSkill;prompt:string;options:readonly string[];answer:number;explanation:string}
/** Fixed prototype bank, not calibrated exam items. A shown item must never be reused as fresh evidence. */
export const WRITING_CHECKS: readonly WritingCheck[] = [
  {id:'writing-sva-1',skill:'subject_verb_agreement',prompt:'Each of the proposals ___ a clear objective.',options:['has','have'],answer:0,explanation:'Each is singular, so it takes has.'},
  {id:'writing-sva-2',skill:'subject_verb_agreement',prompt:'The reports on the desk ___ ready.',options:['is','are'],answer:1,explanation:'The subject reports is plural; on the desk does not change it.'},
  {id:'writing-articles-1',skill:'articles',prompt:'The researcher proposed ___ useful alternative.',options:['an','a'],answer:1,explanation:'Useful begins with a consonant /y/ sound, so use a.'},
  {id:'writing-articles-2',skill:'articles',prompt:'We waited for ___ hour before the meeting.',options:['an','a'],answer:0,explanation:'Hour begins with a vowel sound because h is silent, so use an.'},
  {id:'writing-source-1',skill:'source_fidelity',prompt:'A report says: “The trial suggests the filter may help, but it has not been tested outdoors.” Which paraphrase is faithful?',options:['The filter works outdoors.','The filter may help; outdoor performance remains unknown.'],answer:1,explanation:'Retain both the tentative result and the limitation.'},
  {id:'writing-source-2',skill:'source_fidelity',prompt:'An author writes: “Buses are valuable, but adding buses alone will not solve every delay.” Which claim belongs to the author?',options:['Buses are useless.','Buses help, but delays may need other measures too.'],answer:1,explanation:'Not sufficient does not mean not valuable.'},
  {id:'writing-reason-1',skill:'evidence_reasoning',prompt:'A website gets more visits after a redesign and an advertising campaign. What follows?',options:['The redesign alone caused the increase.','The two changes make the redesign’s separate effect uncertain.'],answer:1,explanation:'The advertising campaign is an alternative explanation.'},
  {id:'writing-reason-2',skill:'evidence_reasoning',prompt:'A training course counts attendance as evidence of learning. Which extra check best tests learning?',options:['Ask participants to solve a new relevant task independently.','Count the same attendance again.'],answer:0,explanation:'A new task checks the intended outcome rather than repeating the proxy.'},
];
// Prevent consumers changing the answer key used for deterministic scoring.
WRITING_CHECKS.forEach(q => { Object.freeze(q.options); Object.freeze(q); });
Object.freeze(WRITING_CHECKS);
export const WRITING_LESSONS: Record<WritingSkill,string> = {
  subject_verb_agreement:'Find the main subject before choosing the verb. A singular subject such as each takes has or is; a plural subject such as reports takes have or are. Ignore intervening phrases when identifying the subject.',
  source_fidelity:'Keep the source’s qualifications. The library passage says loans are useful but insufficient, not worthless. Before paraphrasing, separate the author’s claim from examples and from your own proposal. Compare each claim with the exact source.',
  evidence_reasoning:'A measure and an outcome are not the same. More loans measure borrowing, not whether research help improved. Explain the missing link, consider another explanation, then propose evidence that could distinguish the possibilities.',
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
  return {skill,outcome,correct,total:2,calibrated:false as const,scope:skill==='articles' ? 'Only a/an by initial spoken sound; definite/zero articles and the original model concern remain unverified. Not mastery or an exam score.' : skill==='subject_verb_agreement' ? 'These two subject–verb agreement questions only; the original model concern remains unverified. Not mastery or an exam score.' : 'These two source/reasoning checks only. The original model concern remains a hypothesis; not broad writing proficiency or an exam score.',lesson:outcome==='needs_practice' ? WRITING_LESSONS[skill] : null};
}
