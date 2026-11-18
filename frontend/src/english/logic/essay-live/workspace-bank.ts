/** Candidate workspace content only. Existing evidence and allocation policy remain authoritative. */
import {extendContent,type Item} from '../../../../../packages/english-core/src/index.ts';
import type {ItemPool} from '../../../../../packages/english-core/src/essay/competencies.ts';
import type {AppContent} from '../content.ts';
import type {WorkspaceBankDraft} from './workspace-bank-types.ts';
import {SVA_DRAFTS} from './workspace-bank-sva.ts';
import {ARTICLE_DRAFTS} from './workspace-bank-articles.ts';
import {COHESION_DRAFTS} from './workspace-bank-cohesion.ts';
export interface WorkspaceBankContent extends AppContent {workspacePools:Map<string,ItemPool>}
const bands={foundation:2,developing:4,stretch:6};
const drafts:WorkspaceBankDraft[]=[...SVA_DRAFTS,...ARTICLE_DRAFTS,...COHESION_DRAFTS];
/** Stable per-version permutation prevents a repeating author key sequence. Not learner-specific randomness. */
function permutation(key:string):number[]{
 let h=2166136261;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];return orders[h%orders.length];
}
const counters=new Map<string,number>();
const authored=drafts.map(d=>{
 const group=`${d.capability}.${d.difficulty}.${d.pool}`,ordinal=(counters.get(group)??0)+1;counters.set(group,ordinal);
 const id=`workspace.bank.${group}.${String(ordinal).padStart(2,'0')}.${d.key}`;
 let perm=permutation(id);
 // An ordering exercise must not be displayed already solved.
 if(d.order&&d.order.every((original,i)=>perm[i]===original))perm=[...perm.slice(1),perm[0]];
 const options=perm.map(i=>d.options[i]);
 const base={kind:'code' as const,id,version:1,target:d.capability,family:`workspace.family.${d.family}`,
  b:bands[d.difficulty],a:1.1,prompt:d.prompt,explain:d.explanation,review:'candidate-unvalidated; authored workspace practice, not calibrated',
  difficulty_source:'expert_estimate' as const,rationale:`Candidate ${d.difficulty} practice reference, not measured ability or an exam standard. ${d.explanation} Independence rationale: ${d.independenceNote}`};
 const item:Item=d.typedAnswers?{...base,format:'typed:grammar',answers:[...d.typedAnswers]}
  :d.order?{...base,format:'order:sentences',options,answer_order:d.order.map(i=>perm.indexOf(i))}
  :{...base,format:'choice:grammar',options,answer:perm.indexOf(d.answer)};
 return {item,pool:d.pool,difficulty:d.difficulty,explanation:d.explanation,independenceNote:d.independenceNote,key:d.key};
});
/** Return defensive copies for audit/tests, not an in-assessment answer-key surface. */
export function workspaceBankInventory(){return structuredClone(authored);}
/** Only the workspace calls this. Pilot builds refuse expansion, and existing IDs must match exactly. */
export function withWorkspaceBank(content:AppContent):WorkspaceBankContent{
 if(content.gate||content.contentMode==='pilot')throw Error('Workspace candidate questions are unavailable in the reviewed pilot.');
 const prior=(content as Partial<WorkspaceBankContent>).workspacePools;
 const pools=new Map(prior??[]),additions:Item[]=[];
 for(const row of authored){
  const existing=content.ctx.content.items.get(row.item.id);
  if(existing){if(JSON.stringify(existing)!==JSON.stringify(row.item)||pools.get(row.item.id)!==row.pool)throw Error('Workspace bank content or role conflict.');}
  else additions.push(structuredClone(row.item));
  pools.set(row.item.id,row.pool);
 }
 return {...content,ctx:{...content.ctx,content:extendContent(content.ctx.content,additions,content.index)},workspacePools:pools};
}
