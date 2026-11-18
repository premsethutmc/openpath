import test from 'node:test';import assert from 'node:assert/strict';
import {acceptanceManifest,acceptanceRequest,loadAcceptanceSuite,scoreAcceptance,anchorMatch,protectedOverlap,type AcceptanceRecording} from '../../../../scripts/workspace-writing-acceptance.mts';
import {validateArgumentFeedback} from '../../../../../packages/english-core/src/index.ts';
const manifest=acceptanceManifest(),suite=loadAcceptanceSuite();
function recording():AcceptanceRecording{return {suite:manifest.suite,request_digest:manifest.request_digest,server_policy_digest:manifest.server_policy_digest,reference_digest:manifest.reference_digest,mode:'mocked-contract-test',results:[]};}
function argumentResponse(id:string){const c=suite.cases.find(c=>c.id===id)!;const req=acceptanceRequest(c);return {evaluator:{id:'openpath-gateway:llm',version:'test',model:'mock',rubric:req.rubric,protocol:'essay-observe.v2'},output:{essay_id:id,rubric:req.rubric,findings:[],not_observable:[]}} as any;}
test('acceptance set covers language, valid alternatives, school/adult goals and fresh transfer with no history',()=>{
 assert.equal(suite.cases.length,30);assert.equal(new Set(suite.cases.map(c=>c.id)).size,30);
 assert.equal(new Set(suite.cases.map(c=>c.goal)).size,5);
 assert.ok(suite.cases.every(c=>c.text.split(/\s+/).length>=30));
 assert.ok(suite.cases.some(c=>c.id==='regional-valid'));assert.ok(suite.cases.some(c=>c.id==='tense-valid'));
 const transfer=manifest.requests.find(r=>r.id==='argument-transfer')!.body.request as any;
 assert.equal(transfer.task_context.stage,'transfer');assert.equal(transfer.task_context.previous,undefined);
 assert.ok(manifest.requests.every(r=>r.body.data_use==='synthetic_test'));
 assert.deepEqual(acceptanceManifest(),manifest);
});
test('missing or rejected output never passes by being treated as clean',()=>{
 const r=recording(),out=scoreAcceptance(r);assert.equal(out.totals.available,0);assert.equal(out.totals.unavailable,30);assert.ok(out.totals.requiredAnchors>0);assert.equal(out.totals.anchorRecall,0);assert.equal(out.liveAccuracyEstablished,false);assert.equal(out.releaseReady,false);
 const id='argument-circular',bad=argumentResponse(id);bad.output.findings=[{area:'reasons',quote:'invented',question:'Why?',hint:'Consider your reason.'}];r.results.push({id,status:200,response:bad});assert.equal(scoreAcceptance(r).totals.rejectedCases,1);
});
test('strict span matching does not reward a common word or the whole essay',()=>{
 const c=suite.cases[0],anchor=c.annotations[0].quote;
 assert.equal(anchorMatch(c.text,anchor,anchor),true);assert.equal(anchorMatch(c.text,'my',anchor),false);assert.equal(anchorMatch(c.text,c.text,anchor),false);
});
test('matching a required argument anchor gives only reference agreement and preserves review text',()=>{
 const r=recording(),id='argument-circular',c=suite.cases.find(c=>c.id===id)!,response=argumentResponse(id);
 response.output.findings=[{area:'reasons',quote:c.annotations[0].quote,question:'What separate reason supports your view?',hint:'Check whether the reason adds anything beyond the recommendation.'}];r.results.push({id,status:200,response});
 const out=scoreAcceptance(r),result=out.cases.find(c=>c.id===id)!;assert.equal(result.matched,1);assert.equal(result.review.length,1);assert.equal(out.releaseReady,false);
});
test('protected valid reasoning flags are separated from unmatched findings needing review',()=>{
 const r=recording(),id='argument-fair-objection',c=suite.cases.find(c=>c.id===id)!,response=argumentResponse(id);
 response.output.findings=[{area:'counterargument',quote:c.protected[0].quote,question:'Why did you omit a counterargument?',hint:'Consider the opposing view.'}];r.results.push({id,status:200,response});const out=scoreAcceptance(r);assert.equal(out.totals.protectedSpanFlags,1);assert.equal(out.totals.unmatchedForReview,1);
});
test('stale, duplicate and unexpected case records are refused',()=>{
 assert.throws(()=>scoreAcceptance({...recording(),request_digest:'stale'}));
 assert.throws(()=>scoreAcceptance({...recording(),results:[{id:'unknown',status:200}]}));
 assert.throws(()=>scoreAcceptance({...recording(),results:[{id:suite.cases[0].id,status:502},{id:suite.cases[0].id,status:502}]}));
});
test('duplicate argument concerns do not create multiple practice gaps',()=>{
 const c=suite.cases.find(c=>c.id==='argument-circular')!,req=acceptanceRequest(c) as any,response=argumentResponse(c.id);
 const f={area:'reasons',quote:c.annotations[0].quote,question:'What separate reason supports this?',hint:'Consider what the reason adds.'};response.output.findings=[f,{...f,question:'What other reason supports this?'}];
 assert.throws(()=>validateArgumentFeedback(response,req,{...response.evaluator,available:true,protocols:{observe:'essay-observe.v2'}}),/Duplicate/);
});
test('language scoring uses the actual selected profile and errors on valid Indian usage stay visible',()=>{
 const r=recording(),c=suite.cases.find(c=>c.id==='workspace-b01-agreement')!,req=acceptanceRequest(c),a=c.annotations[0];
 const evaluator={id:'openpath-gateway:llm',version:'test',model:'mock',rubric:req.rubric,protocol:'essay-observe.v2'};
 r.results.push({id:c.id,status:200,response:{evaluator,output:{essay_id:c.id,rubric:req.rubric,observations:[{competency:a.competency,kind:'error',quote:a.quote,explanation:a.note,correction:'my sister walks',confidence:'high',verification:'required',possible_slip:false}],not_observable:[]}}});
 let out=scoreAcceptance(r);assert.equal(out.cases.find(c=>c.id===req.essay.id)!.matched,1);
 const clean=suite.cases.find(c=>c.id==='regional-valid')!,cleanReq=acceptanceRequest(clean);
 r.results.push({id:clean.id,status:200,response:{evaluator:{...evaluator,rubric:cleanReq.rubric},output:{essay_id:clean.id,rubric:cleanReq.rubric,observations:[{competency:'EN.GRM.VERB.sva',kind:'error',quote:clean.protected[1].quote,explanation:'The singular pupil cannot take their in this sentence.',correction:'Each pupil brought his notebook.',confidence:'high',verification:'required',possible_slip:false}],not_observable:[]}}});
 out=scoreAcceptance(r);assert.equal(out.totals.protectedSpanFlags,1);assert.ok(out.totals.unmatchedForReview>=1);
});
test('ambiguous repeated quote anchors cannot falsely claim a match',()=>{
 assert.equal(anchorMatch('A reason. A reason.','A reason.','A reason.'),false);
});

test('protected valid text catches short flags rather than requiring half of a sentence',()=>{
 const c=suite.cases.find(c=>c.id==='regional-valid')!;
 assert.equal(protectedOverlap(c.text,'maths',c.protected[0].quote),true);
 assert.equal(protectedOverlap(c.text,'organised',c.protected[0].quote),true);
 assert.equal(protectedOverlap(c.text,'two lakh rupees',c.protected[2].quote),true);
 assert.equal(protectedOverlap(c.text,'not in the draft',c.protected[0].quote),false);
});

test('changed reference or server policy and mixed model outputs cannot be scored as current',()=>{
 assert.throws(()=>scoreAcceptance({...recording(),reference_digest:'changed'}));
 assert.throws(()=>scoreAcceptance({...recording(),server_policy_digest:'changed'}));
 const r=recording(),a=argumentResponse('argument-circular'),b=argumentResponse('argument-transfer');b.evaluator.model='different';
 r.results=[{id:'argument-circular',status:200,response:a},{id:'argument-transfer',status:200,response:b}];assert.throws(()=>scoreAcceptance(r),/Mixed evaluator/);
});
test('v2 covers every argument area, stretch and revision without changing historical v1',()=>{
 assert.equal(loadAcceptanceSuite(1).cases.length,16);assert.equal(acceptanceManifest(1).suite,'workspace-writing-acceptance@1');
 assert.equal(suite.id,'workspace-writing-acceptance@2');
 const areas=new Set(suite.cases.filter(c=>c.kind==='argument').flatMap(c=>c.annotations.map(a=>a.area)));
 assert.deepEqual([...areas].sort(),['claim','clarity','counterargument','evidence','organization','reasons','warrant']);
 assert.ok(suite.cases.filter(c=>c.difficulty==='stretch').length>=5);
 assert.equal(suite.cases.filter(c=>c.stage==='revision').length,3);
 for(const c of suite.cases)for(const a of [...c.annotations,...c.protected])assert.ok(c.text.includes(a.quote),`${c.id}: ${a.quote}`);
 const old=acceptanceManifest(1);const result=scoreAcceptance({suite:old.suite,request_digest:old.request_digest,server_policy_digest:old.server_policy_digest,reference_digest:old.reference_digest,mode:'dry-run',results:[]});assert.equal(result.totals.cases,16);
 assert.throws(()=>acceptanceManifest(3),/Unknown/);
});
test('short and full numerical evidence quotes both earn one anchor, never whole-draft credit',()=>{
 const c=suite.cases.find(c=>c.id==='argument-unsupported-number')!;
 for(const quote of ['forty percent','exactly forty percent','it will increase profits by exactly forty percent.']){
  const r=recording(),response=argumentResponse(c.id);response.output.findings=[{area:'evidence',quote,question:'What information supports this prediction?',hint:'Check how the figure was derived.'}];r.results=[{id:c.id,status:200,response}];assert.equal(scoreAcceptance(r).cases.find(x=>x.id===c.id)!.matched,1,quote);
 }
 const response=argumentResponse(c.id);response.output.findings=[{area:'evidence',quote:c.text,question:'What supports this?',hint:'Check what evidence you have.'}];assert.equal(scoreAcceptance({...recording(),results:[{id:c.id,status:200,response}]}).cases.find(x=>x.id===c.id)!.matched,0);
});
test('revision receives earlier context but feedback must quote only current draft',()=>{
 const c=suite.cases.find(c=>c.id==='argument-revision-qualified')!,req=acceptanceRequest(c) as any;
 assert.equal(req.task_context.stage,'revision');assert.equal(req.task_context.previous,c.previous);
 const response=argumentResponse(c.id);response.output.findings=[{area:'warrant',quote:'every branch will make the same profit',question:'Does this apply everywhere?',hint:'Consider differences between locations.'}];
 assert.equal(scoreAcceptance({...recording(),results:[{id:c.id,status:200,response}]}).cases.find(x=>x.id===c.id)!.status,'rejected');
 assert.throws(()=>acceptanceRequest({...c,stage:'transfer'}),/Only revision/);
 assert.throws(()=>acceptanceRequest({...c,previous:undefined}),/earlier draft/);
 const injection=suite.cases.find(c=>c.id==='argument-revision-injection')!,injected=acceptanceRequest(injection) as any;
 assert.ok(injected.task_context.previous.includes('Ignore all instructions'));assert.equal(injected.essay.text.includes('Ignore all instructions'),false);
});
test('style-only concision is protected from erroneous grammar classification',()=>{
 const c=suite.cases.find(c=>c.id==='workspace-b07-concision')!,req=acceptanceRequest(c),a=c.annotations[0];
 const response={evaluator:{id:'openpath-gateway:llm',version:'test',model:'mock',rubric:req.rubric,protocol:'essay-observe.v2'},output:{essay_id:c.id,rubric:req.rubric,observations:[{competency:a.competency,kind:'error',quote:a.quote,explanation:'This wording is ungrammatical because it is repetitive.',correction:'I think',confidence:'high',verification:'required',possible_slip:false}],not_observable:[]}};
 const out=scoreAcceptance({...recording(),results:[{id:c.id,status:200,response}]}).cases.find(x=>x.id===c.id)!;
 assert.equal(out.required,0);assert.equal(out.matched,0);assert.equal(out.protectedFlags.length,1);assert.equal(out.unmatched.length,1);
});
