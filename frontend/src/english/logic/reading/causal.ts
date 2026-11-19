/** Anonymous authored-task evidence, not a language ability or clinical diagnosis. */
import {fnv1a} from '../../../../../packages/english-core/src/model.ts';
const fingerprint=(text:string)=>`${fnv1a(text)}-${text.length}`;
import {assessAuthoredClues} from './inference.ts';
export type CausalDimension='word'|'literal'|'integration';
export type CausalRoute=CausalDimension|'mixed';
export interface CausalItem {id:string;family:string;dimension:CausalDimension;passage:string[];prompt:string;options:string[];answer:number;sets:number[][];explanation:string;}
export interface CausalLesson {title:string;explanation:string;steps:string[];workedExample:CausalItem;}
export interface CausalPack {id:string;version:1;title:string;language:{vocabulary:string;syntax:string};integrationDemand:string;context:string;battery:CausalItem[];lessons:Record<CausalRoute,CausalLesson>;practice:Record<CausalRoute,CausalItem[]>;immediate:CausalItem[];delayed:CausalItem[];languageChecks?:Record<'word'|'literal',{immediate:CausalItem;delayed:CausalItem}>;}
export type CausalPhase='battery'|'lesson'|'practice'|'practice_review'|'immediate'|'waiting'|'delayed'|'done';
export type CausalAction={type:'reserve'}|{type:'help'}|{type:'answer';item:string;choice:number|null;sentences:number[];helped:boolean;skipped:boolean}|{type:'lesson_complete'}|{type:'start_immediate'};
export interface CausalSession {version:1;protocol?:2;pack:string;contentFingerprint:string;events:{at:string;action:CausalAction}[];}
const DAY=86400000,dimensions:CausalDimension[]=['word','literal','integration'];
export function causalItems(p:CausalPack):CausalItem[]{return [...p.battery,...Object.values(p.lessons).map(l=>l.workedExample),...Object.values(p.practice).flat(),...p.immediate,...p.delayed,...(p.languageChecks?Object.values(p.languageChecks).flatMap(c=>[c.immediate,c.delayed]):[])];}
export function validateCausalPack(p:CausalPack){
 if(p.version!==1||!p.id||p.battery.length!==6||p.battery.slice(0,2).some(i=>i.dimension!=='integration')||dimensions.some(d=>p.battery.filter(i=>i.dimension===d).length!==2)||p.immediate.length!==2||p.delayed.length!==2)throw Error('Invalid causal pack roles.');
 const all=causalItems(p);if(new Set(all.map(i=>i.id)).size!==all.length||new Set(all.map(i=>i.family)).size!==all.length)throw Error('Causal tasks require unique exposure families.');
 for(const i of all){if(!i.id||!i.family||!dimensions.includes(i.dimension)||!i.passage.length||i.passage.some(s=>!s.trim())||i.options.length<2||!Number.isInteger(i.answer)||i.answer<0||i.answer>=i.options.length||!i.prompt||!i.explanation)throw Error('Invalid causal task.');if(i.dimension==='integration'){if(!i.sets.length||i.sets.some(s=>s.length<2||new Set(s).size!==s.length||s.some(n=>!Number.isInteger(n)||n<0||n>=i.passage.length)))throw Error('Invalid supporting clue sets.');}else if(i.sets.length)throw Error('Non-integration task cannot require clues.');}
 for(const r of [...dimensions,'mixed'] as CausalRoute[])if(!p.practice[r]?.length||!p.lessons[r]?.steps.length)throw Error('Missing targeted practice.');
 if(p.languageChecks){if(Object.keys(p.languageChecks).sort().join(',')!=='literal,word')throw Error('Invalid language check roles.');for(const d of ['word','literal'] as const)for(const phase of ['immediate','delayed'] as const)if(p.languageChecks[d]?.[phase]?.dimension!==d)throw Error('Language check dimension mismatch.');}
 if([...p.immediate,...p.delayed].some(i=>i.dimension!=='integration'))throw Error('Transfer checks must integrate clues.');
}
function time(s:string){const n=Date.parse(s);if(!Number.isFinite(n)||new Date(n).toISOString()!==s)throw Error('Invalid saved time.');return n;}
function contentFingerprint(pack:CausalPack,protocol?:2){const {languageChecks,...legacy}=pack;return fingerprint(JSON.stringify(protocol===2?pack:legacy));}
function checkQueue(p:CausalPack,protocol:2|undefined,route:string|null,phase:'immediate'|'delayed'):CausalItem[]{const extra=protocol===2&&(route==='word'||route==='literal')?p.languageChecks?.[route]?.[phase]:undefined;return [...(extra?[extra]:[]),...p[phase]];}
export function newCausalSession(pack:CausalPack):CausalSession{validateCausalPack(pack);return {version:1,protocol:2,pack:pack.id,contentFingerprint:contentFingerprint(pack,2),events:[]};}
type Answer=Extract<CausalAction,{type:'answer'}>;
function answerCorrect(item:CausalItem,a:Answer){return !a.skipped&&a.choice===item.answer&&(item.dimension!=='integration'||assessAuthoredClues(true,a.sentences,item.sets).evidence==='complete');}
function score(item:CausalItem,a:Answer){return !a.helped&&answerCorrect(item,a);}
function diagnose(p:CausalPack,answers:Answer[]):CausalRoute|'insufficient'|'secure'{
 if(answers.some(a=>a.helped||a.skipped))return 'insufficient';
 const counts=Object.fromEntries(dimensions.map(d=>[d,p.battery.filter(i=>i.dimension===d).filter(i=>score(i,answers.find(a=>a.item===i.id)!)).length]));
 if(dimensions.every(d=>counts[d]===2))return 'secure';
 const failures=dimensions.filter(d=>counts[d]===0);if(failures.length===1&&dimensions.filter(d=>d!==failures[0]).every(d=>counts[d]===2))return failures[0];
 return 'mixed';
}
function replay(s:CausalSession,p:CausalPack){
 if(s.version!==1||s.pack!==p.id||(s.protocol!==undefined&&s.protocol!==2)||s.contentFingerprint!==contentFingerprint(p,s.protocol)||!Array.isArray(s.events)||s.events.length>100)throw Error('Invalid causal record.');
 if(Object.keys(s).some(k=>!['version','protocol','pack','contentFingerprint','events'].includes(k)))throw Error('Unknown saved fields.');
 let phase:CausalPhase='battery',route:CausalRoute|'insufficient'|'secure'|null=null,active:CausalItem|null=null,index=0,due:string|null=null,last=0,helped=false;
 const answers:Answer[]=[],exposed:string[]=[];let queue=p.battery;
 for(const event of s.events){const now=time(event.at);if(now<last)throw Error('Saved time moved backwards.');last=now;const a=event.action;if(Object.keys(event).some(k=>!['at','action'].includes(k))||!a||Object.keys(a).some(k=>!(a.type==='answer'?['type','item','choice','sentences','helped','skipped']:['type']).includes(k)))throw Error('Invalid saved action fields.');
  if(phase==='waiting'&&now>=time(due!)){phase='delayed';queue=checkQueue(p,s.protocol,route,'delayed');index=0;}
  if(a.type==='reserve'){
   if(active||!['battery','practice','immediate','delayed'].includes(phase))throw Error('No question can be reserved now.');
   const item=queue[index];if(!item||exposed.includes(item.family))throw Error('No unseen task remains.');exposed.push(item.family);active=item;helped=phase==='practice';
  }else if(a.type==='help'){
   if(!active||!['battery','practice'].includes(phase))throw Error('Help is unavailable during independent transfer checks.');helped=true;
  }else if(a.type==='answer'){
   if(!active||a.item!==active.id||typeof a.helped!=='boolean'||typeof a.skipped!=='boolean'||!Array.isArray(a.sentences)||new Set(a.sentences).size!==a.sentences.length||a.sentences.some(n=>!Number.isInteger(n)||n<0||n>=active!.passage.length))throw Error('Answer does not match the reserved task.');
   if(a.skipped){if(a.choice!==null||a.sentences.length)throw Error('Skipped task must have no answer.');}else if(!Number.isInteger(a.choice)||a.choice!<0||a.choice!>=active.options.length||(active.dimension==='integration'&&!a.sentences.length)||(active.dimension!=='integration'&&a.sentences.length))throw Error('Choose an answer and the required clues.');
   if(['immediate','delayed'].includes(phase)&&a.helped)throw Error('Independent checks do not offer help.');
   answers.push({...structuredClone(a),helped:a.helped||helped||phase==='practice'});active=null;helped=false;index++;
   if(index===queue.length){index=0;if(phase==='battery'){route=diagnose(p,answers);phase='lesson';const lesson=p.lessons[route==='secure'||route==='insufficient'?'mixed':route].workedExample;if(exposed.includes(lesson.family))throw Error('Lesson overlaps independent evidence.');exposed.push(lesson.family);}else if(phase==='practice'){phase='practice_review';}else if(phase==='immediate'){phase='waiting';due=new Date(now+3*DAY).toISOString();}else if(phase==='delayed')phase='done';}
  }else if(a.type==='start_immediate'){
   if(phase!=='practice_review')throw Error('Review guided practice before the new texts.');phase='immediate';queue=checkQueue(p,s.protocol,route,'immediate');index=0;
  }else if(a.type==='lesson_complete'){
   if(phase!=='lesson')throw Error('Lesson is not active.');phase='practice';queue=p.practice[route==='secure'||route==='insufficient'?'mixed':route!];index=0;
  }else throw Error('Unknown causal action.');
 }
 return {phase,route,active,index,due,answers,exposed,last,helped};
}
export function restoreCausalSession(raw:string,p:CausalPack):CausalSession{validateCausalPack(p);const s=JSON.parse(raw);replay(s,p);return structuredClone(s);}
export function transitionCausal(s:CausalSession,p:CausalPack,action:CausalAction,now:string):CausalSession{const next={...s,events:[...s.events,{at:now,action:structuredClone(action)}]};replay(next,p);return next;}
function publicItem(i:CausalItem){const {answer,sets,explanation,...visible}=i;return structuredClone(visible);}
export function causalView(s:CausalSession,p:CausalPack,now:string){
 const r=replay(s,p);if(time(now)<r.last)throw Error('Device clock moved backwards. Check its date before continuing.');const phase=r.phase==='waiting'&&time(now)>=time(r.due!)?'delayed':r.phase;
 const route=r.route;const lesson=route?p.lessons[route==='secure'||route==='insufficient'?'mixed':route]:null;
 const review=(items:CausalItem[])=>items.every(i=>r.answers.some(a=>a.item===i.id))?items.map(item=>{const response=r.answers.find(a=>a.item===item.id)!;return {item:structuredClone(item),response,correct:answerCorrect(item,response),independent:!response.helped&&!response.skipped};}):[];
 const independentActive=['battery','immediate','delayed'].includes(phase);
 const immediate=checkQueue(p,s.protocol,route,'immediate'),delayed=checkQueue(p,s.protocol,route,'delayed');
 return {legacyProtocol:s.protocol!==2,languageCheckDimension:s.protocol===2&&p.languageChecks&&(route==='word'||route==='literal')?route:null,checkCounts:{immediate:immediate.length,delayed:delayed.length},phase,route,helped:r.helped,active:r.active?publicItem(r.active):null,canReserve:!r.active&&['battery','practice','immediate','delayed'].includes(phase),due:r.due,batteryAnswered:r.answers.filter(a=>p.battery.some(i=>i.id===a.item)).length,
 lesson:phase==='lesson'?structuredClone(lesson):null,
 review:{battery:independentActive?[]:review(p.battery),practice:independentActive?[]:lesson?review(p.practice[route==='secure'||route==='insufficient'?'mixed':route!]):[],immediate:independentActive?[]:review(immediate),delayed:independentActive?[]:review(delayed)},
 limitation:'These are results on authored reading tasks, not a diagnosis, grade level or proof of mastery. Help and skipped tasks are not independent evidence. Delayed checks use this device’s clock.'};
}
