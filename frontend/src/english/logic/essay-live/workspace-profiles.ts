/** Self-selected practice references, not placement results or validated school/adult/exam standards. */
import type {CompetencyProfile} from '../../../../../packages/english-core/src/index.ts';
import baseJson from '../../../../../content/english/essay/g8-writing.json';
import type {AppContent} from '../content.ts';
export const WORKSPACE_GOALS=['grade7','general','cat','gre','gmat'] as const;
export const WORKSPACE_DIFFICULTIES=['foundation','developing','stretch'] as const;
export type WorkspaceGoal=typeof WORKSPACE_GOALS[number];
export type WorkspaceDifficulty=typeof WORKSPACE_DIFFICULTIES[number];
const bands:Record<WorkspaceDifficulty,number>={foundation:2,developing:4,stretch:6};
export interface WorkspaceCoverage {
 capability:string;name:string;specified:boolean;practiceTarget:number|null;
 lessonIds:string[];bankItems:number;itemsAtPracticeTarget:number;
 status:'observation_only'|'missing_lesson'|'missing_check'|'candidate_content';
}
export interface WorkspaceProfile {
 goal:WorkspaceGoal;difficulty:WorkspaceDifficulty;profile:CompetencyProfile;rubric:string;
 measured:false;validated:false;coverage:WorkspaceCoverage[];
 summary:{specified:number;observationOnly:number;withLessons:number;withoutLessons:number};
 taskGuidance:{initial:string;argumentChallenge:string;coaching:string};limitations:string[];
}
const contexts:Record<WorkspaceGoal,string>={
 grade7:'an age-appropriate school or community decision',general:'a practical everyday or workplace decision',
 cat:'a concise argument about a public or organisational decision',gre:'a qualified position on a debatable general issue',
 gmat:'a business or organisational recommendation and its assumptions',
};
export function createWorkspaceProfile(goal:WorkspaceGoal,difficulty:WorkspaceDifficulty,content:AppContent):WorkspaceProfile{
 if(!WORKSPACE_GOALS.includes(goal)||!WORKSPACE_DIFFICULTIES.includes(difficulty))throw Error('Choose a supported goal and starting difficulty.');
 const base=baseJson as unknown as CompetencyProfile,grade=goal==='grade7'?7:0,target=bands[difficulty];
 const limitations=[
  'Starting difficulty is self-selected, not measured ability. Targets are provisional practice references to existing descriptors, not validated Grade 7, adult or exam standards.',
  'Existing framework descriptors are reused; this does not validate a Grade 8-to-adult or school-to-exam mapping. No score, percentile, admission outcome or exam readiness is predicted.',
  'Grammar observations and articulation coaching are separate. These 20 writing competencies do not validate the structural integrity of an argument; claim, reasons, warrants, counterarguments and evidence need explicit task-based coaching.',
  'Question counts are inventory, not guaranteed fresh independent checks: exposure, difficulty, role, leakage and review rules still apply.',
 ];
 const profile:CompetencyProfile={
  id:`foundation-writing-${goal}-${difficulty}`,version:1,grade,subject:'english_writing',status:'candidate',
  rubric:{name:'Foundation writing practice references',source:'OpenPath framework descriptors, reused for provisional practice selection only'},
  note:`${limitations[0]} Grade 0 is a non-school sentinel, never a proficiency measurement.`,
  competencies:base.competencies.map(c=>({...c,grade,expectedBand:c.specified?target:null,
   ...(c.specified?{expectedBandStatus:'provisional' as const}:{}),
   curriculum:[{scheme:'openpath' as const,code:c.capability,note:'Existing OpenPath descriptor reference only. No curriculum, adult or exam equivalence validated.',validated:false as const}],
  })),
 };
 const coverage=profile.competencies.map(c=>{
  const lessonIds=[...content.lessons.values()].filter(l=>l.capability===c.capability).map(l=>l.id);
  const items=[...content.ctx.content.items.values()].filter(q=>q.kind==='code'&&q.target===c.capability);
  const atTarget=items.filter(q=>q.kind==='code'&&c.expectedBand!==null&&q.b>=c.expectedBand&&q.b<=c.expectedBand+1.5).length;
  const status:WorkspaceCoverage['status']=!c.specified?'observation_only':!lessonIds.length?'missing_lesson':!atTarget?'missing_check':'candidate_content';
  return {capability:c.capability,name:c.name,specified:c.specified,practiceTarget:c.expectedBand,lessonIds,bankItems:items.length,itemsAtPracticeTarget:atTarget,status};
 });
 return {goal,difficulty,profile,rubric:`${profile.id}@${profile.version}`,measured:false,validated:false,coverage,
  summary:{specified:coverage.filter(c=>c.specified).length,observationOnly:coverage.filter(c=>!c.specified).length,withLessons:coverage.filter(c=>c.lessonIds.length).length,withoutLessons:coverage.filter(c=>!c.lessonIds.length).length},
  taskGuidance:{initial:`Write naturally about ${contexts[goal]}. Explain your position and reasons in your own words.`,
   argumentChallenge:`After the initial analysis, argue for or against a proposition about ${contexts[goal]}. Connect each reason to your claim, consider an objection and state the limits of your evidence.`,
   coaching:'Use questions and optional hints to help the learner inspect and improve their own argument. Separate grammar from claim clarity, reason relevance, missing links, evidence limits and counterarguments. Do not supply a canned replacement or treat revision as independent improvement.'},limitations};
}
