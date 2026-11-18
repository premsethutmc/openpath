/** Teaching progress only, following english-core's separation of intervention from evidence. */
import type {WritingSkill} from './verification.ts';
export interface WorkedExample {prompt:string;answer:string;steps:string[]}
export interface GuidedPractice {id:string;prompt:string;options:string[]}
export interface GuidedLesson {skill:WritingSkill;title:string;scope:string;workedExample:WorkedExample}
interface AuthoredLesson extends GuidedLesson {practice:GuidedPractice & {answer:number;hint:string;explanation:string}}
const lessons:Record<WritingSkill,AuthoredLesson>={
 subject_verb_agreement:{
  skill:'subject_verb_agreement',title:'Find the subject before choosing the verb',scope:'A narrow practice in singular/plural subject–verb agreement, not all verb grammar.',
  workedExample:{prompt:'The basket of ripe mangoes ___ beside the door. (stands / stand)',answer:'The basket of ripe mangoes stands beside the door.',steps:['Find what the sentence is about: the basket.','Of ripe mangoes describes the basket; mangoes is not the main subject.','Basket is singular. Choose stands, the singular present-tense verb.']},
  practice:{id:'guided-sva-1',prompt:'The lamps along the corridor ___ automatically at dusk.',options:['switches on','switch on'],answer:1,hint:'Which noun is the main subject: lamps or corridor? Set aside along the corridor.',explanation:'Lamps is the plural subject. Along the corridor only describes their location. Use the plural verb phrase switch on.'},
 },
 articles:{
  skill:'articles',title:'Listen to the next sound',scope:'Only a/an before a singular countable noun phrase; not definite or zero articles.',
  workedExample:{prompt:'It was ___ unusual request. (a / an)',answer:'It was an unusual request.',steps:['The phrase describes one request and calls for an indefinite article.','Listen to the word immediately after the article: unusual starts with a vowel sound.','Use an unusual request. The sound, not just the written letter, decides a or an.']},
  practice:{id:'guided-articles-1',prompt:'The doctor ordered ___ X-ray.',options:['a','an'],answer:1,hint:'Say X-ray aloud. The letter X is pronounced “eks”; listen to its first sound.',explanation:'X-ray starts with the vowel sound in “eks”, even though its first written character is X. Use an X-ray.'},
 },
 source_fidelity:{
  skill:'source_fidelity',title:'Keep the source’s limits',scope:'Preserving a stated qualification in a paraphrase, not broad writing quality.',
  workedExample:{prompt:'Source: “The roof coating reduced heat in the tested houses, but its winter effects are unknown.”',answer:'The coating reduced heat in the houses tested; its winter effects have not been established.',steps:['Identify the measured finding: reduced heat in the tested houses.','Keep the population limit: the result concerns those houses, not every building.','Retain the uncertainty about winter rather than turning an untested effect into a claim.']},
  practice:{id:'guided-source-1',prompt:'Source: “The new timetable helped morning passengers, although afternoon reliability did not improve.” Which paraphrase preserves both points?',options:['The timetable improved reliability for passengers throughout the day.','The timetable helped morning passengers, but afternoon reliability remained unimproved.'],answer:1,hint:'Look for both the morning benefit and the contrasting afternoon result.',explanation:'The second paraphrase keeps the morning benefit and the unchanged afternoon reliability. Throughout the day would extend the finding beyond the source.'},
 },
 evidence_reasoning:{
  skill:'evidence_reasoning',title:'Match the evidence to the claim',scope:'Distinguishing a measured activity from its intended outcome, not a general reasoning diagnosis.',
  workedExample:{prompt:'A town claims cycling became safer because it installed more bicycle racks.',answer:'More racks establish additional parking, not safer cycling. Compare injury rates per cycling trip before and after, considering other changes.',steps:['Name the claim: cycling became safer.','Name the observation: the number of racks increased. Parking capacity does not directly measure safety.','Look for an outcome measure such as injuries per trip. Even that comparison would need care about other changes before assigning a cause.']},
  practice:{id:'guided-reason-1',prompt:'A help desk says its answers are more useful because it sent more replies. Which additional measure most directly checks usefulness?',options:['The proportion of users whose problem was resolved, compared with before.','The total number of replies sent, counted again.'],answer:0,hint:'A reply is an activity. What outcome would show that the reply actually helped the user?',explanation:'Problem resolution addresses whether the help was useful. Counting replies again measures activity rather than the claimed outcome. This comparison alone would not establish what caused any change.'},
 },
};
export function guidedLesson(skill:WritingSkill):GuidedLesson{
 if(!Object.hasOwn(lessons,skill))throw Error('Unsupported teaching skill.');
 const content=lessons[skill];
 const {practice:_practice,...lesson}=content;return structuredClone(lesson);
}
export interface GuidedTeachingState {
 phase:'example'|'practice'|'feedback'|'complete';lesson:GuidedLesson;practice:GuidedPractice|null;
 hint:string|null;selected:number|null;
 feedback:{correct:boolean|null;expected:string|null;explanation:string;revealed:boolean}|null;
 completion:null|{kind:'supported';independentEvidence:false;message:string};
}
/** No persistence or assessment ledger. Even a first correct response here is supported practice. */
export class GuidedTeaching {
 private content:AuthoredLesson;
 private state:GuidedTeachingState;
 constructor(skill:WritingSkill){
  const lesson=guidedLesson(skill);this.content=structuredClone(lessons[skill]);
  this.state={phase:'example',lesson,practice:null,hint:null,selected:null,feedback:null,completion:null};
 }
 snapshot():GuidedTeachingState{return structuredClone(this.state);}
 startPractice(){
  if(this.state.phase!=='example')return;
  const {id,prompt,options}=this.content.practice;
  this.state={...this.state,phase:'practice',practice:{id,prompt,options:[...options]}};
 }
 showHint(){if(this.state.phase==='practice')this.state={...this.state,hint:this.content.practice.hint};}
 answer(index:number){
  if(this.state.phase!=='practice'||!Number.isInteger(index)||index<0||index>=this.content.practice.options.length)return;
  const q=this.content.practice;
  this.state={...this.state,phase:'feedback',selected:index,feedback:{correct:index===q.answer,expected:index===q.answer?q.options[q.answer]:null,explanation:index===q.answer?q.explanation:`Try again. ${q.hint}`,revealed:false}};
 }
 retry(){
  if(this.state.phase!=='feedback'||this.state.feedback?.correct!==false||this.state.feedback.revealed)return;
  this.state={...this.state,phase:'practice',selected:null,feedback:null};
 }
 revealAnswer(){
  if(!['practice','feedback'].includes(this.state.phase))return;
  const q=this.content.practice;
  this.state={...this.state,phase:'feedback',feedback:{correct:null,expected:q.options[q.answer],explanation:q.explanation,revealed:true}};
 }
 complete(){
  if(this.state.phase!=='feedback'||!(this.state.feedback?.correct===true||this.state.feedback?.revealed))return;
  this.state={...this.state,phase:'complete',completion:{kind:'supported',independentEvidence:false,message:'Completed with teaching support. This is not independent evidence, lasting learning, mastery or an exam score. Use a separate unseen reassessment for a new observation.'}};
 }
}
