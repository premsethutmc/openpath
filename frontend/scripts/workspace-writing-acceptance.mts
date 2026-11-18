/** Offline acceptance evidence, not a linguistic gold standard or a release approval. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {argumentRequest,validateArgumentFeedback,buildObservationRequest,validateObservations,fingerprint,wordCount,type ArgumentArtifact,type ArgumentRequest,type EssaySubmission,type WorkspaceGoal,type WorkspaceDifficulty} from '../../packages/english-core/src/index.ts';
import {loadContent} from '../src/english/logic/content.ts';
import {essayContext} from '../src/english/logic/essay-live/studio.ts';
import {createWorkspaceProfile} from '../src/english/logic/essay-live/workspace-profiles.ts';
export interface AcceptanceCase {id:string;kind:'language'|'argument';goal:WorkspaceGoal;difficulty:WorkspaceDifficulty;stage?:ArgumentArtifact['stage'];prompt:string;text:string;annotations:{competency?:string;area?:string;kind?:string;quote:string;note:string;optional?:boolean;acceptAlso?:string[];acceptKinds?:string[]}[];protected:{quote:string;area?:string;why:string}[]}
export const SUITE_FILE=fileURLToPath(new URL('../../content/english/essay/benchmark/workspace-writing-acceptance-v1.json',import.meta.url));
export const serverPolicyDigest=()=>createHash('sha256').update(['backend/evaluation/argument.py','backend/evaluation/foundation.py','backend/evaluation/essay.py','backend/evaluation/gateway.py','content/english/prompts/essay-observe.v2.md'].map(p=>readFileSync(fileURLToPath(new URL('../../'+p,import.meta.url)),'utf8')).join('\n')).digest('hex');
export const suiteReferenceDigest=()=>createHash('sha256').update(readFileSync(SUITE_FILE)).digest('hex');
export const loadAcceptanceSuite=()=>JSON.parse(readFileSync(SUITE_FILE,'utf8')) as {id:string;status:string;limitations:string[];cases:AcceptanceCase[]};
const content=loadContent();
const at='2026-11-18T00:00:00.000Z';
function context(c:AcceptanceCase){return essayContext(content,undefined,createWorkspaceProfile(c.goal,c.difficulty,content).profile);}
function submission(c:AcceptanceCase):EssaySubmission{return {contract:'essay-contract@1',id:c.id,learner:'acceptance-synthetic',session:'acceptance',at,text:c.text,words:wordCount(c.text),fingerprint:fingerprint(c.text),source:{kind:'synthetic',prompt:c.prompt,grade:c.goal==='grade7'?7:0,profile:context(c).profile.key,dataUse:'synthetic_test'}};}
export function acceptanceRequest(c:AcceptanceCase){
 if(c.kind==='language')return buildObservationRequest(context(c),submission(c),'essay-observe.v2');
 const transfer=c.stage==='transfer';
 const artifact:ArgumentArtifact={version:'argument-artifact@1',id:c.id,cycle:'acceptance',at,goal:c.goal,difficulty:c.difficulty,stage:c.stage??'initial',topic:c.prompt,prompt:c.prompt,text:c.text,words:wordCount(c.text),dataUse:'synthetic_test',assistance:transfer?'independent_transfer':'initial_independent'};
 return argumentRequest(artifact,c.goal==='grade7'?7:0);
}
export function acceptanceManifest(){
 const suite=loadAcceptanceSuite();const requests=suite.cases.map(c=>({id:c.id,body:{task:'observe',data_use:'synthetic_test',request:acceptanceRequest(c)}}));
 const digest=createHash('sha256').update(JSON.stringify(requests)).digest('hex');
 return {suite:suite.id,data_use:'synthetic_test',request_digest:digest,server_policy_digest:serverPolicyDigest(),reference_digest:suiteReferenceDigest(),requests};
}
/** Strict matching: a finding must quote the annotated anchor, or be contained in it with >= 50% coverage.
 * This is only span/category agreement. A tiny shared word or a whole-draft quote cannot earn a match. */
export function anchorMatch(text:string,quote:string,anchor:string){
 if(!text.includes(quote)||!text.includes(anchor)||text.indexOf(quote)!==text.lastIndexOf(quote)||text.indexOf(anchor)!==text.lastIndexOf(anchor))return false;
 const q=text.indexOf(quote),a=text.indexOf(anchor),overlap=Math.max(0,Math.min(q+quote.length,a+anchor.length)-Math.max(q,a));
 return overlap>=anchor.length*.5&&overlap>=quote.length*.5;
}
/** A localized lexical edit, not a semantic correctness judgment. Unchanged
 * context is excluded only when a non-empty replacement has an unambiguous token diff. */
export function correctionFocus(quote:string,correction?:string):string|null{
 if(!correction||correction===quote)return null;
 const a=[...quote.matchAll(/\S+/g)],b=[...correction.matchAll(/\S+/g)];
 let first=0,last=a.length,end=b.length;
 while(first<last&&first<end&&a[first][0]===b[first][0])first++;
 while(last>first&&end>first&&a[last-1][0]===b[end-1][0]){last--;end--;}
 if(first===last||first===end)return null; // pure insertion/deletion remains conservative
 const focus=quote.slice(a[first].index!,a[last-1].index!+a[last-1][0].length);
 return /[A-Za-z]{2}/.test(focus)?focus:null;
}
export function correctionAnchorMatch(text:string,quote:string,anchor:string,correction?:string){
 if(anchorMatch(text,quote,anchor))return true;
 const focus=correctionFocus(quote,correction);
 // Only localized edits wholly inside a reference anchor, with unique source spans.
 // Broad/full-draft rewrites and adjacent edits must not gain reference credit.
 if(!focus||!quote.includes(anchor)||quote.length>Math.max(120,anchor.length*4)||
    (quote===text&&quote.length>anchor.length*2)||
    text.indexOf(quote)!==text.lastIndexOf(quote)||text.indexOf(anchor)!==text.lastIndexOf(anchor)||
    quote.indexOf(focus)!==quote.lastIndexOf(focus))return false;
 const q=text.indexOf(quote),a=text.indexOf(anchor),f=q+quote.indexOf(focus);
 return q>=0&&a>=0&&f>=a&&f+focus.length<=a+anchor.length;
}
/** Protected spans are a conservative review alarm: even one short alleged error inside valid text matters.
 * Unlike required-anchor credit, ambiguity cannot suppress an alarm. */
export function protectedOverlap(text:string,quote:string,protectedQuote:string){
 if(!quote||!protectedQuote)return false;
 for(let q=text.indexOf(quote);q>=0;q=text.indexOf(quote,q+1)){
  for(let a=text.indexOf(protectedQuote);a>=0;a=text.indexOf(protectedQuote,a+1)){
   if(q<a+protectedQuote.length&&a<q+quote.length)return true;
  }
 }
 return false;
}
export interface AcceptanceRecording {suite:string;request_digest:string;server_policy_digest:string;reference_digest:string;mode:string;results:{id:string;status:number;response?:unknown}[]}
export function scoreAcceptance(recording:AcceptanceRecording){
 const suite=loadAcceptanceSuite(),manifest=acceptanceManifest();
 if(recording.suite!==suite.id||recording.request_digest!==manifest.request_digest||recording.reference_digest!==manifest.reference_digest||recording.server_policy_digest!==manifest.server_policy_digest)throw Error('Recording does not match current acceptance requests, references and server policy sources. Re-run rather than score stale evidence.');
 if(!Array.isArray(recording.results)||new Set(recording.results.map(r=>r.id)).size!==recording.results.length||recording.results.some(r=>!suite.cases.some(c=>c.id===r.id)))throw Error('Duplicate or unknown recording cases.');
 const evaluators=new Set(recording.results.filter(r=>r.status===200).map(r=>{const e=(r.response as any)?.evaluator;return JSON.stringify([e?.id,e?.version,e?.model]);}));
 if(evaluators.size>1)throw Error('Mixed evaluator identities cannot be aggregated. Score separate runs.');
 const cases=suite.cases.map(c=>{
  const run=recording.results.find(r=>r.id===c.id);const req=acceptanceRequest(c);const required=c.annotations.filter(a=>!a.optional&&(c.kind==='argument'||a.kind==='error'));
  const base={id:c.id,kind:c.kind,goal:c.goal,required:required.length,matched:0,missed:required.map(a=>a.quote),protectedFlags:[] as string[],contextOnlyProtectedOverlaps:[] as string[],strictMatched:0,unmatched:[] as string[],rejected:0,review:[] as unknown[]};
  if(!run||run.status!==200)return {...base,status:'unavailable',accepted:0};
  const envelope=run.response as any;
  let observations:{area:string;quote:string;kind:string;correction?:string;review:unknown}[]=[];
  try{
   if(c.kind==='argument'){
    const who=envelope?.evaluator;
    if(!who||!['openpath-gateway:llm','openpath-gateway:replay'].includes(who.id)||typeof who.version!=='string'||typeof who.model!=='string')throw Error('Missing evaluator provenance');
    const feedback=validateArgumentFeedback(envelope,req as ArgumentRequest,{...who,available:true,protocols:{observe:'essay-observe.v2'}});
    observations=feedback.findings.map(f=>({area:f.area,quote:f.quote,kind:'finding',review:f}));
   }else{
    const who=envelope?.evaluator;
    if(!who||!['openpath-gateway:llm','openpath-gateway:replay'].includes(who.id)||typeof who.version!=='string'||typeof who.model!=='string'||who.rubric!==req.rubric||who.protocol!=='essay-observe.v2')throw Error('Wrong evaluator provenance');
    const result=validateObservations(context(c),submission(c),envelope.output,{id:who.id,version:who.version,model:who.model,protocol:who.protocol},`acceptance:${c.id}`);
    base.rejected=result.rejected.length;
    if(result.status!=='accepted')return {...base,status:'rejected',accepted:0};
    observations=result.observations.map(o=>({area:o.competency,quote:o.span.quote,kind:o.kind??'error',correction:o.correction,review:o}));
   }
  }catch{return {...base,status:'rejected',accepted:0,rejected:Math.max(base.rejected,1)};}
  const relevant=observations.filter(o=>c.kind==='argument'||o.kind==='error');
  const matches=(o:typeof relevant[number],a:AcceptanceCase['annotations'][number])=>(c.kind==='argument'||a.kind==='error')&&[(a.area??a.competency),...(a.acceptAlso??[])].includes(o.area)&&correctionAnchorMatch(c.text,o.quote,a.quote,o.correction);
  const strictUsed=new Set<number>();
  const strictMatched=required.filter(a=>{const i=relevant.findIndex((o,i)=>!strictUsed.has(i)&&matches(o,a)&&anchorMatch(c.text,o.quote,a.quote));if(i<0)return false;strictUsed.add(i);return true;}).length;
  const used=new Set<number>();
  const missed=required.filter(a=>{const i=relevant.findIndex((o,i)=>!used.has(i)&&matches(o,a));if(i<0)return true;used.add(i);return false;});
  // Unmatched findings need review, not an automatic false-positive verdict: references are incomplete.
  const unmatched=relevant.filter(o=>!c.annotations.some(a=>matches(o,a))).map(o=>`${o.area}: ${o.quote}`);
  const overlaps=relevant.filter(o=>c.protected.some(p=>(!p.area||p.area===o.area)&&protectedOverlap(c.text,o.quote,p.quote)));
  const contextOnly=(o:typeof relevant[number])=>{
   const focus=correctionFocus(o.quote,o.correction);
   return !!focus&&o.quote.indexOf(focus)===o.quote.lastIndexOf(focus)&&
    c.text.indexOf(o.quote)===c.text.lastIndexOf(o.quote)&&
    !c.protected.some(p=>(!p.area||p.area===o.area)&&protectedOverlap(c.text,focus,p.quote));
  };
  const protectedFlags=overlaps.filter(o=>!contextOnly(o)).map(o=>`${o.area}: ${o.quote}`);
  const contextOnlyProtectedOverlaps=overlaps.filter(contextOnly).map(o=>`${o.area}: ${o.quote}`);
  return {...base,status:'accepted',accepted:observations.length,matched:required.length-missed.length,missed:missed.map(a=>a.quote),unmatched,protectedFlags,contextOnlyProtectedOverlaps,strictMatched,review:observations.map(o=>o.review)};
 });
 const sum=(key:'required'|'matched'|'accepted'|'rejected')=>cases.reduce((n,c)=>n+c[key],0);
 return {suite:suite.id,scorerVersion:2,mode:recording.mode,evaluator:evaluators.size?JSON.parse([...evaluators][0]):null,serverPolicyDigest:recording.server_policy_digest,referenceDigest:recording.reference_digest,referenceStatus:suite.status,releaseReady:false,liveAccuracyEstablished:false,
  limits:[...suite.limitations,'Correction-aware matches use localized changed tokens; neither strict nor correction-aware agreement proves the correction is right. Unchanged protected context remains listed for review.','Accepted means app schema/provenance accepted, not correct teaching. Every successful response still requires qualitative review.','Missing/rejected responses stay in the required-anchor denominator; they cannot inflate recall.'],
  totals:{cases:cases.length,available:cases.filter(c=>c.status==='accepted').length,unavailable:cases.filter(c=>c.status==='unavailable').length,rejectedCases:cases.filter(c=>c.status==='rejected').length,acceptedObservations:sum('accepted'),rejectedObservations:sum('rejected'),requiredAnchors:sum('required'),matchedRequiredAnchors:sum('matched'),strictMatchedRequiredAnchors:cases.reduce((n,c)=>n+c.strictMatched,0),contextOnlyProtectedOverlaps:cases.reduce((n,c)=>n+c.contextOnlyProtectedOverlaps.length,0),anchorRecall:sum('required')?sum('matched')/sum('required'):null,protectedSpanFlags:cases.reduce((n,c)=>n+c.protectedFlags.length,0),unmatchedForReview:cases.reduce((n,c)=>n+c.unmatched.length,0)},cases};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const args=process.argv.slice(2),i=args.indexOf('--recorded');
 console.log(JSON.stringify(i>=0?scoreAcceptance(JSON.parse(readFileSync(args[i+1],'utf8'))):acceptanceManifest(),null,2));
}
