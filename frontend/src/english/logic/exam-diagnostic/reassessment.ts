import type {WritingCheck, WritingSkill} from './verification.ts';
/** These items never appear in the diagnostic or worked examples. Still uncalibrated. */
export const REASSESSMENT:readonly WritingCheck[] = [
 {id:'fresh-sva-1',skill:'subject_verb_agreement',prompt:'The list of required documents ___ on the desk.',options:['is','are'],answer:0,explanation:'List is singular; of documents does not change the subject.'},
 {id:'fresh-sva-2',skill:'subject_verb_agreement',prompt:'Several members of the committee ___ ready.',options:['is','are'],answer:1,explanation:'Members is plural.'},
 {id:'fresh-article-1',skill:'articles',prompt:'She joined ___ university near her home.',options:['a','an'],answer:0,explanation:'University begins with a consonant /y/ sound.'},
 {id:'fresh-article-2',skill:'articles',prompt:'They gave ___ honest account of the event.',options:['a','an'],answer:1,explanation:'Honest begins with a vowel sound.'},
 {id:'fresh-source-1',skill:'source_fidelity',prompt:'“Some coastal towns benefited, though inland effects are unknown.” Which summary is faithful?',options:['All towns benefited.','Some coastal benefits were observed; inland effects are unknown.'],answer:1,explanation:'Preserve the limited group and uncertainty.'},
 {id:'fresh-source-2',skill:'source_fidelity',prompt:'“Exercise helps sleep, but cannot resolve every cause of sleeplessness.” Which summary is faithful?',options:['Exercise helps but may not solve all sleep problems.','Exercise does not help sleep.'],answer:0,explanation:'A limit does not negate a benefit.'},
 {id:'fresh-reason-1',skill:'evidence_reasoning',prompt:'A factory makes more items but has not checked faults. Which evidence would test whether useful output improved?',options:['Count the items again.','Compare the number of items meeting the same quality standard.'],answer:1,explanation:'Usable output requires evidence of quality as well as volume.'},
 {id:'fresh-reason-2',skill:'evidence_reasoning',prompt:'Sales rose after prices fell and a rival closed. Can the price cut alone be credited?',options:['No; the rival’s closure is another possible cause.','Yes; any rise proves the price change worked.'],answer:0,explanation:'The simultaneous change limits a single-cause conclusion.'},
];
REASSESSMENT.forEach(q=>{Object.freeze(q.options);Object.freeze(q);});Object.freeze(REASSESSMENT);
export function reassessmentFor(skills:readonly WritingSkill[],seen:readonly string[]) {
 return [...new Set(skills)].flatMap(skill=>{
  const pair=REASSESSMENT.filter(q=>q.skill===skill);
  return pair.every(q=>!seen.includes(q.id))?pair.map(q=>({...q,options:[...q.options]})):[];
 });
}
