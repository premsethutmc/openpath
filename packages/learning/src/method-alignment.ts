/** method-alignment@1 with computed coverage (method-sections@2, 2026-11-10): an explanation covers the method kinds of the questions
 *  its sections work through (method-kinds.ts shownKinds); no hand-written map. A lesson's record pins the explanation's content
 *  hash, so a follow-up is refused if the content changed since. Not an approval or mastery claim. The old hand map
 *  (content/learning/method-alignment.v1.json) is kept as history only: alignmentEntry reads it for reports. */
import manifest from '../../../content/learning/method-alignment.v1.json';
import { problemOf, problemKeyOf } from './families';
import { sha256Hex } from './digest';
import { independentAttempt, rightAnswer, nativeItem } from './evidence';
import { moduleFor as lookupModule, question, type Module, type Strategy } from './content';
import type { LearnerRecords } from './records';
import { methodKinds, methodRequirements, shownKinds } from './method-kinds';
import { teachingScopeFor } from './teaching-presentation';
export { methodKinds, methodRequirements };
export const ALIGNMENT_POLICY = 'method-alignment@1';
export const alignmentHash = (s: Strategy) => sha256Hex(JSON.stringify(s.screens));
export const alignmentEntry = (m: Module, s: Strategy) => manifest.lessons.find(x=>x.competency===m.competency && x.strategy===s.id);
export type AlignmentStatus='covered'|'incompatible'|'unknown'|'diagnostic';
/** Require two distinct validated first unaided answers; latest failure invalidates that method.
 * Evidence must predate the lesson/check under consideration: the answer cannot qualify itself. */
export function establishedMethods(records: LearnerRecords, before: string): Set<string> {
  const groups=new Map<string, typeof records.attempts>();
  for(const a of records.attempts)if(a.at<before && independentAttempt(a) && !a.context && !['guided','check'].includes(a.activity) && nativeItem(question(a.questionId)).evidence_status==='validated'){
    const firstPrinciples=problemOf(a.questionId.replace(/:(mc|w)$/, ''))?.family;
    const workingRequired=firstPrinciples==='aqfp'||firstPrinciples==='subst';
    // A correct derivative could have used a memorised rule: it does not establish first-principles working.
    if(workingRequired && rightAnswer(a) && !(a.assessment?.methodExamined && a.assessment.derivationVerified))continue;
    for(const method of methodKinds(a.questionId))groups.set(method,[...(groups.get(method)??[]),a]);
  }
  const out=new Set<string>();for(const [method,as]of groups){as.sort((a,b)=>a.at.localeCompare(b.at));const latest=as.at(-1)!;
    const lastWrong=as.filter(a=>!rightAnswer(a)).at(-1)?.at??'';
    const rights=as.filter(a=>a.at>lastWrong&&rightAnswer(a));
    if(rightAnswer(latest)&&new Set(rights.map(a=>problemKeyOf(a.questionId))).size>=2)out.add(method);
  }return out;
}
export function methodCompatibility(m: Module,s: Strategy,id: string,known: ReadonlySet<string>=new Set(),usage:'follow-up'|'diagnostic'='follow-up'):{status:AlignmentStatus;missing:string[]} {
  if(usage==='diagnostic')return {status:'diagnostic',missing:[]};
  const req=methodKinds(id),shown=shownKinds(s);
  const missing=req.filter(x=>!shown.has(x)&&!known.has(x));return {status:missing.length?'incompatible':'covered',missing};
}
export function alignmentRecord(_m: Module,s: Strategy): string|undefined {return `${ALIGNMENT_POLICY}:${alignmentHash(s)}`;}
export function alignmentActive(m: Module,s: Strategy,records:LearnerRecords) {return records.teaching.filter(t=>t.competency===m.competency&&t.strategy===s.id).at(-1)?.methodAlignment?.startsWith(ALIGNMENT_POLICY+':')??false;}
export function followupCompatible(m:Module,s:Strategy,id:string,records:LearnerRecords):boolean {
  const t=records.teaching.filter(t=>t.competency===m.competency&&t.strategy===s.id).at(-1);
  if(!t?.methodAlignment)return true; // explicit legacy replay; not a claim of compatibility
  // a scoped explanation (skill-units) teaches its unit: a question of another unit is not its follow-up (that unit's own
  // teaching and evidence govern it), so this lesson neither covers nor refuses it
  if(s.scope){const p=id.startsWith('gen:')?problemOf(id.replace(/:(mc|w)$/,'')):null;if(!p||!teachingScopeFor(m,s).accepts(p))return true;}
  if(t.methodAlignment!==alignmentRecord(m,s))return false;
  const known=establishedMethods(records,t.at);
  for(const a of records.attempts)if(a.at>=t.at&&independentAttempt(a)&&!rightAnswer(a))for(const method of methodKinds(a.questionId))known.delete(method);
  return methodCompatibility(m,s,id,known).status==='covered';
}
export function selectAligned(m:Module,s:Strategy,ids:string[],seen:ReadonlySet<string>,known:ReadonlySet<string>=new Set()) {
  const classified=ids.map(id=>({id,...methodCompatibility(m,s,id,known)}));
  const fresh=classified.find(x=>x.status==='covered'&&!seen.has(problemKeyOf(x.id)));
  return {question:fresh?.id??null,status:fresh?'covered':classified.some(x=>x.status==='covered')?'no-fresh-question':classified.some(x=>x.status==='unknown')?'unknown':'incompatible',classified};
}
/** Correctness stays in the immutable answer record. This only qualifies lesson-follow-up evidence. */
export function qualifiedFollowup(a: LearnerRecords['attempts'][number],records:LearnerRecords):boolean {
  if(!['guided','check','practice','transfer','retention'].includes(a.activity))return true;
  const t=records.teaching.filter(t=>t.competency===a.competency&&t.at<a.at).at(-1);
  if(!t?.methodAlignment)return true;
  const m=lookupModule(a.competency),s=m?.strategies.find(s=>s.id===t.strategy);
  return !!m&&!!s&&followupCompatible(m,s,a.questionId,{...records,attempts:records.attempts.filter(x=>x.at<a.at),teaching:records.teaching.filter(t=>t.at<a.at)});
}
