/** Candidate concept recognition only. Never attach this view to the source writing learner. */
import {indexContent, type CompetencyProfile, type Item} from '../../../../../packages/english-core/src/index.ts';
import type {ItemPool} from '../../../../../packages/english-core/src/essay/competencies.ts';
import type {AppContent} from '../content.ts';
import type {WorkspaceBankDraft} from './workspace-bank-types.ts';
import type {WorkspaceBankContent} from './workspace-bank.ts';
import {WORKSPACE_GOALS,WORKSPACE_DIFFICULTIES,type WorkspaceGoal,type WorkspaceDifficulty} from './workspace-profiles.ts';
import {RESPONSE_DRAFTS} from './argument-concept-bank-response.ts';
import {DEVELOPMENT_DRAFTS} from './argument-concept-bank-development.ts';
import {RESPONSE_LESSONS} from './argument-concept-lessons-response.ts';
import {DEVELOPMENT_LESSONS} from './argument-concept-lessons-development.ts';
export const ARGUMENT_CONCEPT_CAPABILITIES=['EN.WRT.TSK.task_response','EN.WRT.TSK.idea_development','EN.WRT.ORG.paragraphing','EN.WRT.GEN.persuasive'] as const;
const bands:Record<WorkspaceDifficulty,number>={foundation:2,developing:4,stretch:6};
const labels=['Task fit','Relevant support and explanation','Paragraph focus and purpose','Position and relevant reasons'];
export const ARGUMENT_CONCEPT_LIMITATION='Candidate concept recognition and arrangement only, not assessment of the learner’s written argument, warrant quality, counterargument mastery, school level or exam readiness. Self-selected references are provisional, not measured proficiency.';
export function createArgumentConceptProfile(goal:WorkspaceGoal,difficulty:WorkspaceDifficulty,content:AppContent):CompetencyProfile{
 if(!WORKSPACE_GOALS.includes(goal)||!WORKSPACE_DIFFICULTIES.includes(difficulty))throw Error('Unsupported argument concept practice reference.');
 for(const cap of ARGUMENT_CONCEPT_CAPABILITIES)if(!content.index.leaves.has(cap))throw Error(`Missing framework concept ${cap}`);
 const grade=goal==='grade7'?7:0;
 return {id:`argument-concepts-${goal}-${difficulty}`,version:1,grade,subject:'english_writing',status:'candidate',
  rubric:{name:'Argument concepts: bounded recognition practice',source:'OpenPath candidate concept tasks, isolated from writing analysis and writing proficiency'},note:ARGUMENT_CONCEPT_LIMITATION,
  competencies:ARGUMENT_CONCEPT_CAPABILITIES.map((capability,i)=>({capability,name:`${labels[i]} (concept recognition)`,area:'coherence',trait:i===2?'organization':'ideas',grade,
   expectedBand:bands[difficulty],expectedBandStatus:'provisional',specified:true,
   curriculum:[{scheme:'openpath',code:capability,note:ARGUMENT_CONCEPT_LIMITATION,validated:false}]}))};
}
function permutation(key:string):number[]{
 let h=2166136261;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 return [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]][h%6];
}
const drafts:WorkspaceBankDraft[]=[...RESPONSE_DRAFTS,...DEVELOPMENT_DRAFTS];
const counters=new Map<string,number>();
const authored=drafts.map(d=>{
 if(d.typedAnswers)throw Error('Concept selection tasks must not receive a zero-guessing typed-response model.');
 const group=`${d.capability}.${d.difficulty}.${d.pool}`,ordinal=(counters.get(group)??0)+1;counters.set(group,ordinal);
 const id=`argument.concept.${group}.${String(ordinal).padStart(2,'0')}.${d.key}`;
 let perm=permutation(id);if(d.order&&d.order.every((original,i)=>perm[i]===original))perm=[...perm.slice(1),perm[0]];
 const base={kind:'code' as const,id,version:1,target:d.capability,family:`argument.concept.family.${d.family}`,
  b:bands[d.difficulty],a:1.1,prompt:d.prompt,explain:d.explanation,review:'candidate-unvalidated; bounded concept recognition only, not written argument quality',difficulty_source:'expert_estimate' as const,
  rationale:`${ARGUMENT_CONCEPT_LIMITATION} Independence rationale: ${d.independenceNote}`};
 const options=perm.map(i=>d.options[i]);
 const item:Item=d.order?{...base,format:'order:argument_concept',options,answer_order:d.order.map(i=>perm.indexOf(i))}
 :{...base,format:'choice:argument_concept',options,answer:perm.indexOf(d.answer)};
 return {item,pool:d.pool,difficulty:d.difficulty,explanation:d.explanation,independenceNote:d.independenceNote,key:d.key};
});
/** Audit/test surface; do not expose its answer keys to an active practice view. */
export function argumentConceptInventory(){return structuredClone(authored);}
/**
 * A dedicated view for a dedicated concept-only Learner and essayContext. Deliberately excludes
 * legacy writing items/lessons, so role reservations cannot select an old prose-assessment item.
 * Framework and shared engine stay unchanged; source content and source learner are untouched.
 */
export function withArgumentConceptContent(content:AppContent):WorkspaceBankContent{
 if(content.gate||content.contentMode==='pilot')throw Error('Candidate argument concepts are unavailable in the reviewed pilot.');
 const lessons=[...RESPONSE_LESSONS,...DEVELOPMENT_LESSONS];
 const items=authored.map(row=>structuredClone(row.item));
 const goal={id:'argument-concepts',name:'Argument concept recognition only',weights:Object.fromEntries(ARGUMENT_CONCEPT_CAPABILITIES.map(cap=>[cap,1]))};
 const conceptIndex=indexContent({items,passages:[],goals:[goal],misspellings:{}},content.index);
 const workspacePools=new Map<string,ItemPool>(authored.map(row=>[row.item.id,row.pool]));
 return {...content,ctx:{...content.ctx,content:conceptIndex},lessons:new Map(lessons.map(l=>[l.id,structuredClone(l)])),
  feedback:new Map(authored.map(row=>[row.item.id,row.explanation])),review:new Map(),ladders:new Map(),goals:new Map([[goal.id,goal]]),guidedGoal:goal,overallGoal:goal,
  pilot:{version:'argument-concepts@1-candidate',capabilities:[...ARGUMENT_CONCEPT_CAPABILITIES],pools:new Map()},workspacePools};
}
