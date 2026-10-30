/** UI adapter only: all diagnostic, prerequisite and next-activity decisions remain in the shared engine. */
import {moduleFor} from '../../../packages/learning/src/content';
import {diagnose} from '../../../packages/learning/src/diagnostic';
import {familyOf,investigateContext,moduleState,recovery} from '../../../packages/learning/src/intervention';
import {nextActivity} from '../../../packages/learning/src/plan';
import {assigned,type CurriculumRelease,type Chapter,type Section} from '../../../packages/learning/src/curriculum';
import type {Ctx} from './Learn';

export function topicCheck(target:string,ctx:Ctx){
 const m=moduleFor(target);if(!m)return {question:null,reason:'No diagnostic is available for this competency.',support:null,diagnosis:null};
 if(ctx.evidence(target).status==='verified')return {question:null,reason:'Your existing verified understanding is preserved.',support:null,diagnosis:null};
 const d=diagnose(m,ctx.records.attempts);
 const fresh=(id:string|null)=>id&&!ctx.records.attempts.some(a=>a.questionId===id)?id:null;
 if(d.next)return {question:fresh(d.next),reason:fresh(d.next)?'A short starting-point check.':'Fresh diagnostic evidence is unavailable; earlier answers are preserved.',support:null,diagnosis:d};
 const wrong=d.asked.find(a=>!a.right);
 const r=wrong&&familyOf(wrong.questionId)?recovery(wrong.questionId,ctx.records,ctx.evidence,ctx.now,ctx.session):null;
 if(r?.phase==='investigate'&&r.question)return {question:fresh(r.question),context:investigateContext(wrong!.questionId),reason:r.reason,support:null,diagnosis:d,recovery:r};
 const support=r?.plan?.kind==='support'?r.plan.competency:null;
 const supporting=support&&ctx.evidence(support).status!=='verified'?moduleFor(support):null;
 const sd=supporting?diagnose(supporting,ctx.records.attempts):null;
 return {question:sd?.next?fresh(sd.next):null,reason:sd?.next?'Check the supporting skill before assuming a gap.':r?.reason??'Starting-point check recorded.',support,diagnosis:d,supportDiagnosis:sd,recovery:r};
}

/** Budget envelope over repeated calls to the existing planner, not a new ranking or inference policy. */
export function topicPlan(target:string,release:CurriculumRelease,ctx:Ctx,minutes:15|30|60){
 const result=topicCheck(target,ctx);const chapter=assigned(release).find(a=>a.competency===target)?.chapter.id;
 let scope={...release,subjects:release.subjects.map(s=>({...s,chapters:s.chapters.filter(c=>c.id===chapter)}))};
 const items:{competency:string;reason:string;minutes:number}[]=[];
 const support=result.support;
 if(support&&result.recovery?.active===support&&moduleFor(support))items.push({competency:support,reason:result.recovery?.plan?.why??'Check this supporting skill.',minutes:15});
 // findings@1: when the target's own module has teaching pending (e.g. a misunderstanding the check established), the target comes next
 const tm=moduleFor(target)?moduleState(target,ctx.records,ctx.evidence(target),ctx.now,ctx.session):null;
 if(tm&&['strategy','chapter','guided','check'].includes(tm.phase)&&!items.some(i=>i.competency===target))items.push({competency:target,reason:tm.reason,minutes:15});
 while(items.length*15<minutes){
  const next=nextActivity(scope,ctx.evidence,ctx.records);
  if(!next.competency||items.some(i=>i.competency===next.competency))break;
  items.push({competency:next.competency,reason:next.reason,minutes:15});
  // Filter the presentation scope only. Never fabricate success or modify the learner's evidence.
  const picked=next.competency;
  const strip=<T extends Chapter|Section>(c:T):T=>({...c,outcomes:c.outcomes.map(o=>({...o,mapping:{...o.mapping,competencies:o.mapping.competencies.filter(m=>m.id!==picked)}})),sections:c.sections?.map(s=>strip(s))});
  scope={...scope,subjects:scope.subjects.map(s=>({...s,chapters:s.chapters.map(strip)}))};
 }
 return {items,estimatedMinutes:items.reduce((n,i)=>n+i.minutes,0),availableMinutes:minutes};
}
