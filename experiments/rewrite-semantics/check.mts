/** Offline only: exports requests or scores recorded responses. Never calls a provider. */
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {buildRewriteRequest,validateRewrite,rewriteQuestion,wordCount,REWRITE_DIMENSIONS,type EssaySubmission,type RewriteSubmission,type RewriteRating} from '../../packages/english-core/src/index.ts';
import {loadEssayContext} from '../../tools/english/essay-load.ts';
const root=new URL('../../',import.meta.url);const context=loadEssayContext();
export const suite=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url),'utf8')) as {id:string;status:string;cases:{id:string;pair:string;kind:string;original:string;rewrite:string;expected:RewriteRating[];idea:string;match:string|null;minor?:string;rationale:string}[]};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export const referenceDigest=hash(JSON.stringify(suite));
export const scoringDigest=hash(readFileSync(new URL('./check.mts',import.meta.url),'utf8')+readFileSync(new URL('../../packages/english-core/src/essay/rewrite.ts',import.meta.url),'utf8'));
export const promptDigest=hash(readFileSync(new URL('content/english/prompts/essay-rewrite.v2.md',root),'utf8'));
export function artifacts(c:typeof suite.cases[number]){const original:EssaySubmission={contract:'essay-contract@1',id:`original:${c.id}`,learner:'synthetic-semantic-test',at:'2026-11-19T00:00:00Z',session:'fixture',text:c.original,words:wordCount(c.original),fingerprint:'synthetic',source:{kind:'typed',grade:8,profile:context.profile.key,dataUse:'synthetic_test',prompt:'Summarise this proposal, preserving its purpose and essential conditions. You may omit incidental meeting details.'}};const rewrite:RewriteSubmission={contract:'essay-contract@1',id:c.id,essay:original.id,at:original.at,session:'fixture',text:c.rewrite,words:wordCount(c.rewrite),limit:50};return {original,rewrite};}
export function manifest(){return {suite:suite.id,data_use:'synthetic_test',referenceDigest,promptDigest,requests:suite.cases.map(c=>{const {original,rewrite}=artifacts(c);return {id:c.id,body:{task:'rewrite',data_use:'synthetic_test',request:buildRewriteRequest(original,rewrite,'essay-rewrite.v2',context.profile.key)}};})};}
export const requestDigest=hash(JSON.stringify(manifest().requests));
export function fixture(c:typeof suite.cases[number],mode:'reference'|'false-preservation'|'false-omission'='reference'){
 const match=mode==='false-preservation'?c.rewrite.split('. ')[0]:mode==='false-omission'?null:c.match;
 const kept=match!==null;const secondaryNeeded=!kept&&c.expected.includes('mostly');
 // A second retained idea makes partial ratings internally coherent with the application's ratio check.
 const secondary=c.original.split('. ')[0],secondaryRewrite=c.rewrite.split('. ')[0];
 return {rewrite_id:c.id,rubric:context.profile.key,dimensions:REWRITE_DIMENSIONS.map(d=>({dimension:d,rating:d==='meaning_preservation'?(kept?'fully':secondaryNeeded?'partly':'not_yet'):'fully',quotes:[secondaryRewrite],note:'Synthetic fixture, not a model result.'})),key_ideas:[{original_quote:c.idea,rewrite_quote:match},...(secondaryNeeded?[{original_quote:secondary,rewrite_quote:secondaryRewrite}]:[])]};
}
export interface Recording {suite:string;referenceDigest:string;promptDigest:string;requestDigest:string;mode:'mock-contract'|'provider-recording';provenance?:{provider:string;model:string;version:string;capturedAt:string};results:{id:string;output:unknown}[]}
export function score(record:Recording){
 if(record.suite!==suite.id||record.referenceDigest!==referenceDigest||record.promptDigest!==promptDigest||record.requestDigest!==requestDigest)throw Error('Stale or mismatched corpus, prompt or requests.');
 if(!['mock-contract','provider-recording'].includes(record.mode))throw Error('Unknown recording mode.');
 if(record.mode==='provider-recording'&&(!record.provenance||Object.values(record.provenance).some(v=>typeof v!=='string'||!v.trim())||!record.provenance.provider||!record.provenance.model||!record.provenance.version||!record.provenance.capturedAt))throw Error('Provider recordings require declared provenance; this does not authenticate it.');
 const ids=new Set<string>();for(const r of record.results){if(ids.has(r.id)||!suite.cases.some(c=>c.id===r.id))throw Error('Duplicate or unknown result.');ids.add(r.id);}
 const cases=suite.cases.map(c=>{const row=record.results.find(r=>r.id===c.id);if(!row)return {id:c.id,status:'missing'};
 const {original,rewrite}=artifacts(c);const evaluation=validateRewrite(context,original,rewrite,row.output,{id:record.mode,version:'1',protocol:'essay-rewrite.v2',rubric:context.profile.key});
 const meaning=evaluation.dimensions.find(d=>d.dimension==='meaning_preservation')!;
 const mappings=evaluation.keyIdeas.filter(k=>k.original===c.idea);const mapping=mappings.length===1?mappings[0]:undefined;
 // Exact anchors are a conservative reproducible annotation check, not an entailment classifier.
 const mappingAgreement=!!mapping&&(c.match===null?mapping.rewrite===null:mapping.rewrite!==null&&mapping.rewrite.includes(c.match));
 const ratingAgreement=meaning.status==='accepted'&&c.expected.includes(meaning.rating!);
 const question=rewriteQuestion(evaluation);
 const otherQuestion=evaluation.keyIdeas.every(k=>k.rewrite!==null)&&evaluation.dimensions.some(d=>d.dimension!=='meaning_preservation'&&d.status==='accepted'&&d.rating!=='fully');
 const questionAgreement=otherQuestion?null:c.match===null?!!question&&question.includes(c.idea):question===null;
 const unnecessaryMinorOmission=!!c.minor&&evaluation.keyIdeas.some(k=>k.original.includes(c.minor!)&&k.rewrite===null);
 return {id:c.id,status:'scored',contract:evaluation.status,meaningStatus:meaning.status,rating:meaning.rating,ratingAgreement,mappingAgreement,questionAgreement,unnecessaryMinorOmission,question,additionalMappingsForReview:evaluation.keyIdeas.filter(k=>k.original!==c.idea),duplicateFocalMappings:mappings.length>1,reference:c.rationale,reviewRequired:true};
 });
 return {suite:suite.id,mode:record.mode,scoringDigest,declaredProvenance:record.provenance??null,provenanceAuthenticated:false,releaseReady:false,semanticAccuracyEstablished:false,coverage:{total:cases.length,recorded:record.results.length,missing:cases.filter(c=>c.status==='missing').length},cases,limitation:'Agreement with AI-authored synthetic references only. Exact mapping anchors can undercount valid alternative spans. Coaching entailment, intent and pedagogy require independent review; mock results measure plumbing, never model quality.'};
}
export function mockReport(){const base={suite:suite.id,referenceDigest,promptDigest,requestDigest,mode:'mock-contract' as const};return {reference:score({...base,results:suite.cases.map(c=>({id:c.id,output:fixture(c)}))}),adversarialFalsePreservation:score({...base,results:suite.cases.filter(c=>c.match===null).map(c=>({id:c.id,output:fixture(c,'false-preservation')}))}),adversarialFalseOmission:score({...base,results:suite.cases.filter(c=>c.match!==null).map(c=>({id:c.id,output:fixture(c,'false-omission')}))})};}
if(process.argv[1]===fileURLToPath(import.meta.url)){const arg=process.argv[2];console.log(JSON.stringify(arg==='--requests'?{...manifest(),requestDigest}:arg==='--recorded'?score(JSON.parse(readFileSync(process.argv[3],'utf8'))):mockReport(),null,2));}
