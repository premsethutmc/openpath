/** Bounded migration: content-pinned method coverage, not an educator approval or mastery claim. */
import manifest from '../../../content/learning/method-alignment.v1.json';
import { FAMILIES, problemOf, problemKeyOf } from './families';
import { sha256Hex } from './digest';
import { independentAttempt, rightAnswer, nativeItem } from './evidence';
import { moduleFor as lookupModule, question, type Module, type Strategy } from './content';
import type { LearnerRecords } from './records';
export const ALIGNMENT_POLICY = 'method-alignment@1';
export const alignmentHash = (s: Strategy) => sha256Hex(JSON.stringify(s.screens));
export const alignmentEntry = (m: Module, s: Strategy) => manifest.lessons.find(x=>x.competency===m.competency && x.strategy===s.id);
/** A requirement is a method/case, not merely a competency or question family. */
export function methodRequirements(id: string): string[] | null {
  const p=problemOf(id.replace(/:(mc|w)$/,'')); if(!p)return null;
  if(p.family==='aqfp') {const name=['quadratic-expansion','rational-difference','conjugate','cubic-expansion',p.params[3]===0?'sine-limit':'cosine-limit'][p.params[0]];return name?['difference-quotient',name]:null;}
  if(p.family==='ahext')return [p.params[2]===0?'exterior-from-interiors':'far-interior-from-exterior'];
  if(p.family==='fmulw')return ['fraction-times-whole'];
  if(p.family==='avfwq')return [p.params[3]===0?'fraction-times-whole':'fraction-of-quantity'];
  if(p.family==='subst')return ['quadratic-substitution','change-integral-limits',`integrate-u-power-${p.params[3]}`];
  if(p.family==='ahtri')return ['triangle-angle-sum'];
  if(p.family==='ahiso')return ['triangle-angle-sum',p.params[1]===0?'isosceles-base':'isosceles-vertex'];
  // Pythagoras (2026-11-10): the converse test, and the two rules that generate triples, are methods of their own
  if(p.family==='ahconv')return ['pythagoras-converse'];
  if(p.family==='ahgen')return [p.params[0]<=1?'triple-rule-2m':'triple-rule-mn'];
  if(p.family==='faddu')return ['common-denominator-add'];
  if(p.family==='avfas')return [p.params[6]?'common-denominator-subtract':'common-denominator-add',...(p.params[0]||p.params[3]?['mixed-number-conversion']:[])];
  // Families that already declare teaching cases can supply precise requirements, but no lesson is
  // silently credited with them: an explicit content-pinned coverage entry is still needed.
  const c=FAMILIES.get(p.family)?.teach?.caseOf;return c?[`${p.family}:${c(p.params)}`]:null;
}
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
    for(const method of methodRequirements(a.questionId)??[])groups.set(method,[...(groups.get(method)??[]),a]);
  }
  const out=new Set<string>();for(const [method,as]of groups){as.sort((a,b)=>a.at.localeCompare(b.at));const latest=as.at(-1)!;
    const lastWrong=as.filter(a=>!rightAnswer(a)).at(-1)?.at??'';
    const rights=as.filter(a=>a.at>lastWrong&&rightAnswer(a));
    if(rightAnswer(latest)&&new Set(rights.map(a=>problemKeyOf(a.questionId))).size>=2)out.add(method);
  }return out;
}
export function methodCompatibility(m: Module,s: Strategy,id: string,known: ReadonlySet<string>=new Set(),usage:'follow-up'|'diagnostic'='follow-up'):{status:AlignmentStatus;missing:string[]} {
  if(usage==='diagnostic')return {status:'diagnostic',missing:[]};
  const e=alignmentEntry(m,s),req=methodRequirements(id);
  if(!e||e.contentHash!==alignmentHash(s)||!req)return {status:'unknown',missing:req??[]};
  const missing=req.filter(x=>!e.methods.includes(x)&&!known.has(x));return {status:missing.length?'incompatible':'covered',missing};
}
export function alignmentRecord(m: Module,s: Strategy): string|undefined {return alignmentEntry(m,s)?`${ALIGNMENT_POLICY}:${alignmentHash(s)}`:undefined;}
export function alignmentActive(m: Module,s: Strategy,records:LearnerRecords) {return records.teaching.filter(t=>t.competency===m.competency&&t.strategy===s.id).at(-1)?.methodAlignment?.startsWith(ALIGNMENT_POLICY+':')??false;}
export function followupCompatible(m:Module,s:Strategy,id:string,records:LearnerRecords):boolean {
  const t=records.teaching.filter(t=>t.competency===m.competency&&t.strategy===s.id).at(-1);
  if(!t?.methodAlignment)return true; // explicit legacy replay; not a claim of compatibility
  if(t.methodAlignment!==alignmentRecord(m,s))return false;
  const known=establishedMethods(records,t.at);
  for(const a of records.attempts)if(a.at>=t.at&&independentAttempt(a)&&!rightAnswer(a))for(const method of methodRequirements(a.questionId)??[])known.delete(method);
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
