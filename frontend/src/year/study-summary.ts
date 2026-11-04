import {learnerState} from '../../../packages/learning/src/session';
import type {LearningRecord} from '../../../packages/learning/src/records';
import {topicCheck} from './topic-session';
/** Projections of existing evidence/recovery/planner results; no new diagnostic or mastery decisions. */
import {nextActivity} from '../../../packages/learning/src/plan';
import {investigateContext,familyOf} from '../../../packages/learning/src/intervention';
import {reason,nextFromReasoning} from '../../../packages/learning/src/reasoning';
import {rightAnswer} from '../../../packages/learning/src/evidence';
import type {CurriculumRelease} from '../../../packages/learning/src/curriculum';
import type {StudyAdvice} from '../../../packages/learning/src/study-session';
import type {Ctx} from './Learn';
export function studyAdvice(planId:string,release:CurriculumRelease,ctx:Ctx,initialGaps:StudyAdvice['gaps']=[]):StudyAdvice{
 const attempts=ctx.records.attempts.filter(a=>a.context===`study:${planId}`);
 const gaps:StudyAdvice['gaps']=[...initialGaps];
 for(const a of attempts.filter(a=>!rightAnswer(a))){
  const family=familyOf(a.questionId);if(!family||a.n!==1)continue;
  // Replay the existing investigation even after a helped retry solves the original problem.
  const follow=ctx.records.attempts.filter(p=>p.context===investigateContext(a.questionId)&&p.n===1);
  const finding=reason(family,[{questionId:family,response:a.response},...follow.map(p=>({questionId:p.questionId,response:p.response}))]);
  const next=finding&&nextFromReasoning(finding,a.competency);
  if(finding?.status==='established'&&finding.observed.length>1&&next?.kind==='support'&&!gaps.some(g=>g.competency===next.competency))gaps.push({competency:next.competency!,reason:next.why,sourceQuestion:a.questionId});
 }
 const ids=[...new Set([...attempts.map(a=>a.competency),...gaps.map(g=>g.competency)])];
 const next=nextActivity(release,ctx.evidence,ctx.records);
 return {gaps,morePractice:ids.filter(id=>!['independent','transfer','verified'].includes(ctx.evidence(id).status)),next:{competency:next.competency,reason:next.reason}};
}

/** Preserve findings from the diagnostic that produced this immutable plan, even after practice improves it. */
export function plannedFindings(learner:string,plan:Extract<LearningRecord,{record:'topic_session'}>,events:readonly {kind:string}[],ctx:Ctx):StudyAdvice['gaps']{
 const index=events.findIndex((e:any)=>e.id===plan.id);if(index<0)return [];
 const state=learnerState(learner,events.slice(0,index+1),Date.parse(plan.at));
 const check=topicCheck(plan.target,{...ctx,records:state.records,evidence:state.evidence,now:Date.parse(plan.at),session:plan.sessionId});
 const source=check.diagnosis?.asked.find(a=>!a.right)?.questionId;
 return source&&check.support&&check.recovery?.reasoning?.status==='established'&&check.recovery.reasoning.observed.length>1?[{competency:check.support,reason:`Earlier diagnostic: ${check.recovery.plan!.why}`,sourceQuestion:source}]:[];
}
