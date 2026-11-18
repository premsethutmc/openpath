import type { ModelWritingObservation } from './model.ts';
export type WritingSkill = ModelWritingObservation['skill'];
export interface WritingCheck {form?:string;id:string;skill:WritingSkill;prompt:string;options:readonly string[];answer:number;explanation:string}
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
/** Journey-only grammar items: the legacy synthetic demo exposed the original bank without tracking it. */
export const JOURNEY_WRITING_CHECKS: readonly WritingCheck[] = [
  {id:'journey-writing-sva-1',skill:'subject_verb_agreement',prompt:'Every visitor to these galleries ___ a ticket.',options:['needs','need'],answer:0,explanation:'Every visitor is singular; to these galleries does not change the subject.'},
  {id:'journey-writing-sva-2',skill:'subject_verb_agreement',prompt:'The keys beside the notebook ___ to the caretaker.',options:['belongs','belong'],answer:1,explanation:'Keys is the plural subject, so use belong.'},
  {id:'journey-writing-articles-1',skill:'articles',prompt:'The committee reached ___ unanimous decision.',options:['an','a'],answer:1,explanation:'Unanimous starts with the consonant /y/ sound, so use a.'},
  {id:'journey-writing-articles-2',skill:'articles',prompt:'The team appointed ___ experienced guide.',options:['an','a'],answer:0,explanation:'Experienced starts with a vowel sound, so use an.'},
  ...WRITING_CHECKS.filter(q=>q.skill==='source_fidelity'||q.skill==='evidence_reasoning'),
  {form:'2',id:'journey-writing-sva-3',skill:'subject_verb_agreement',prompt:'One of the runners ___ water before the race.',options:['drink','drinks'],answer:1,explanation:'One is the singular subject, despite the plural runners in the following phrase.'},
  {form:'2',id:'journey-writing-sva-4',skill:'subject_verb_agreement',prompt:'The windows above the entrance ___ cleaning.',options:['need','needs'],answer:0,explanation:'Windows is plural; the phrase above the entrance does not change it.'},
  {form:'2',id:'journey-writing-articles-3',skill:'articles',prompt:'The reporter interviewed ___ eyewitness.',options:['a','an'],answer:1,explanation:'Eyewitness begins with a vowel sound, so use an.'},
  {form:'2',id:'journey-writing-articles-4',skill:'articles',prompt:'The camera captured ___ one-off event.',options:['a','an'],answer:0,explanation:'One starts with the consonant /w/ sound, so use a.'},
  {form:'2',id:'journey-writing-source-3',skill:'source_fidelity',prompt:'“The new route shortened weekday trips; weekend journeys were not studied.” Which summary preserves the finding?',options:['The route shortened trips on every day.','Weekday trips were shorter; weekend effects remain unknown.'],answer:1,explanation:'Keep the tested time period and the untested limitation.'},
  {form:'2',id:'journey-writing-source-4',skill:'source_fidelity',prompt:'“Insulation reduces heat loss, although some buildings also need repairs.” What does the author claim?',options:['Insulation helps, but some buildings need additional work.','Insulation is ineffective whenever repairs are needed.'],answer:0,explanation:'The qualification does not cancel the stated benefit.'},
  {form:'2',id:'journey-writing-reason-3',skill:'evidence_reasoning',prompt:'A shop tracks customer satisfaction by counting purchases. Which added evidence most directly checks satisfaction?',options:['Count all purchases a second time.','Collect customers’ ratings of their shopping experience.'],answer:1,explanation:'Purchases show activity; reported experiences more directly address satisfaction.'},
  {form:'2',id:'journey-writing-reason-4',skill:'evidence_reasoning',prompt:'Fewer roads flooded after new drains were installed during a much drier year. What limits the claim that drains caused all the change?',options:['Lower rainfall is another possible explanation.','Nothing: any reduction proves the drains caused it.'],answer:0,explanation:'The weather changed too, so the drains’ separate contribution is not established.'},
];
JOURNEY_WRITING_CHECKS.forEach(q=>{Object.freeze(q.options);Object.freeze(q);});Object.freeze(JOURNEY_WRITING_CHECKS);
export const WRITING_LESSONS: Record<WritingSkill,string> = {
  subject_verb_agreement:'Find the main subject before choosing the verb. A singular subject such as each takes has or is; a plural subject such as reports takes have or are. Ignore intervening phrases when identifying the subject.',
  source_fidelity:'Keep the source’s qualifications. The library passage says loans are useful but insufficient, not worthless. Before paraphrasing, separate the author’s claim from examples and from your own proposal. Compare each claim with the exact source.',
  evidence_reasoning:'A measure and an outcome are not the same. More loans measure borrowing, not whether research help improved. Explain the missing link, consider another explanation, then propose evidence that could distinguish the possibilities.',
  articles:'Choose a or an by the next spoken sound, not the first written letter: a useful idea, an hour. This check covers only the a/an distinction, not all article usage.',
};
/** Select one authored form as a unit. Exposure to either item retires that whole form. */
export function firstUnseenPair(bank:readonly WritingCheck[],skill:WritingSkill,seen:readonly string[]):WritingCheck[]{
 const forms=new Map<string,WritingCheck[]>();
 for(const q of bank){if(q.skill!==skill)continue;const form=q.form??'1';forms.set(form,[...(forms.get(form)??[]),q]);}
 for(const pair of forms.values()){
  if(pair.length===2&&new Set(pair.map(q=>q.id)).size===2&&pair.every(q=>!seen.includes(q.id)))return pair.map(q=>({...q,options:[...q.options]}));
 }
 return [];
}
export function planWritingChecks(observations:readonly ModelWritingObservation[], seen:readonly string[] = [], bank:readonly WritingCheck[] = WRITING_CHECKS): WritingCheck[] {
  const skills = new Set(observations.filter(o=>o.requiresCheck && o.kind === 'error' && o.confidence !== 'low').map(o=>o.skill));
  // Require a complete unseen pair; otherwise report insufficient fresh evidence rather than recycle items.
  return [...skills].flatMap(skill=>{
    const pair = firstUnseenPair(bank,skill,seen);
    return pair.length===2 && pair.every(q=>!seen.includes(q.id)) ? pair.map(q=>({...q,options:[...q.options]})) : [];
  });
}
export function verifyWritingSkill(skill:WritingSkill, answers:Readonly<Record<string,number>>, previouslySeen:readonly string[] = [], bank:readonly WritingCheck[] = WRITING_CHECKS) {
  const pair = firstUnseenPair(bank,skill,previouslySeen);
  const answered = pair.length===2 && pair.every(q=>!previouslySeen.includes(q.id) && Number.isInteger(answers[q.id]) && answers[q.id]>=0 && answers[q.id]<q.options.length);
  const correct = answered ? pair.filter(q=>answers[q.id]===q.answer).length : null;
  const outcome = correct===0 ? 'needs_practice' : correct===2 ? 'no_gap_shown' : 'inconclusive';
  return {skill,outcome,correct,total:2,calibrated:false as const,scope:skill==='articles' ? 'Only a/an by initial spoken sound; definite/zero articles and the original model concern remain unverified. Not mastery or an exam score.' : skill==='subject_verb_agreement' ? 'These two subject–verb agreement questions only; the original model concern remains unverified. Not mastery or an exam score.' : 'These two source/reasoning checks only. The original model concern remains a hypothesis; not broad writing proficiency or an exam score.',lesson:outcome==='needs_practice' ? WRITING_LESSONS[skill] : null};
}
