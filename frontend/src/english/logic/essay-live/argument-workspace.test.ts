import assert from 'node:assert/strict';import {test} from 'node:test';
import {ArgumentWorkspace,type ArgumentLedger} from './argument-workspace.ts';
import {ARGUMENT_RUBRIC,ARGUMENT_AREAS,ARGUMENT_COACHING,argumentTask,argumentRequest,validateArgumentFeedback,type ArgumentPost,type ArgumentGatewayInfo,type ArgumentArtifact,type EssayEvent} from '../../../../../packages/english-core/src/index.ts';
import type {AppEvent} from '../events.ts';import {loadContent} from '../content.ts';import {Learner} from '../learner.ts';import {MemoryRepo} from '../store.ts';import {EssayStudio} from './studio.ts';
const text='A community should improve its shared spaces because these places let people meet and learn together. A useful plan would explain who can use the space and how access will be maintained. Costs and competing needs should also be considered before a decision is made.';
const info:ArgumentGatewayInfo={available:true,id:'test-argument',version:'1',model:'fixture',rubric:ARGUMENT_RUBRIC,protocols:{observe:'essay-observe.v2'}};
const output=(body:Parameters<ArgumentPost>[0])=>({record:123,evaluator:{id:info.id,version:info.version,model:info.model,rubric:ARGUMENT_RUBRIC,protocol:'essay-observe.v2'},output:{essay_id:body.request.essay.id,rubric:ARGUMENT_RUBRIC,findings:[{area:'evidence',quote:'these places let people meet and learn together',question:'What evidence would show that the proposed space meets this need?',hint:'Choose an observation that would support this particular reason.'}],not_observable:['counterargument']}});
function ledger():ArgumentLedger{const events:AppEvent[]=[];let n=0;return {events,essayMeta:async()=>[{id:`meta:${++n}`,at:'2026-11-18T09:00:00Z',session:'s'}],recordEssay:async(...e:EssayEvent[])=>{events.push(...structuredClone(e));}};}
test('four-stage own-writing cycle persists without invented offline assessment and repeats are labelled',async()=>{
 const store=ledger();let flow=new ArgumentWorkspace(store,{goal:'gre',difficulty:'stretch'});
 for(const stage of ['initial','for','against','revision']){assert.equal(flow.view().stage,stage);const v=await flow.submit(text+(stage==='revision'?' This revision clarifies the claim.':''),{syntheticConfirmed:true});assert.equal(v.busy,false);assert.equal(v.artifacts.at(-1)?.feedback,null);}
 assert.equal(flow.view().stage,null);assert.equal(flow.view().artifacts[3].artifact.assistance,'supported_revision');assert.ok(flow.view().artifacts[3].artifact.revisionOf);
 flow=new ArgumentWorkspace(store,{goal:'gre',difficulty:'stretch'});assert.equal(flow.view().artifacts.length,4);flow.startNewCycle();assert.equal(flow.view().cycleNumber,2);assert.equal(flow.view().task.freshTopic,true);assert.equal(flow.view().history.length,4);const prior=JSON.stringify(flow.view().history);flow.cancel();assert.equal(JSON.stringify(flow.view().history),prior);
 for(const stage of ['initial','for','against','revision'])await flow.submit(text+(stage==='revision'?' A changed qualification is added.':''),{syntheticConfirmed:true});flow.startNewCycle();assert.equal(flow.view().task.freshTopic,false);
 assert.equal(store.events.filter(e=>e.kind==='essay'&&e.record.type==='argument_feedback').length,0);
});
test('validated coaching preserves own text, exact quotations and explicit unknown areas',async()=>{
 const flow=new ArgumentWorkspace(ledger(),{goal:'general',difficulty:'developing',info,post:async body=>output(body)});
 const v=await flow.submit(text,{syntheticConfirmed:true});const item=v.artifacts[0];assert.equal(item.artifact.text,text);assert.equal(item.feedback?.status,'observations_only');assert.deepEqual(item.feedback?.notObservable,['counterargument']);assert.equal(item.feedback?.findings[0].area,'evidence');assert.equal('record' in item.feedback!,false);assert.equal('score' in item.feedback!,false);assert.equal('correction' in item.feedback!.findings[0],false);
 assert.equal(v.stage,'for');assert.ok(Object.values(ARGUMENT_COACHING).every(x=>x.practicePrompt&&x.explanation));
});
test('consent, word limits, stage gates and unchanged revisions reject before dispatch',async()=>{
 let calls=0;const flow=new ArgumentWorkspace(ledger(),{goal:'grade7',difficulty:'foundation',info,post:async body=>{calls++;assert.equal(body.request.grade,7);return output(body);}});
 await assert.rejects(flow.submit(text,{syntheticConfirmed:false}));await assert.rejects(flow.submit('too short',{syntheticConfirmed:true}));assert.throws(()=>flow.startNewCycle());assert.equal(calls,0);
 for(let i=0;i<3;i++)await flow.submit(text,{syntheticConfirmed:true});await assert.rejects(flow.submit(text,{syntheticConfirmed:true}),/unchanged/);await assert.rejects(flow.submit(text+' changed',{syntheticConfirmed:true,revisionOf:'other'}));assert.equal(calls,3);
});
test('bad output fails closed, explicit retry succeeds without modifying artifacts or adding fake scores',async()=>{
 let bad=true;const store=ledger();const flow=new ArgumentWorkspace(store,{goal:'cat',difficulty:'developing',info,post:async b=>bad?{...output(b),score:99}:output(b)});
 let v=await flow.submit(text,{syntheticConfirmed:true});assert.equal(v.artifacts[0].feedback?.status,'unavailable');assert.deepEqual(v.artifacts[0].feedback?.findings,[]);
 bad=false;v=await flow.retryAnalysis(v.artifacts[0].artifact.id);assert.equal(v.busy,false);assert.equal(v.artifacts.length,1);assert.equal(v.artifacts[0].feedback?.status,'observations_only');
});
test('cancel discards late feedback and double submissions cannot dispatch twice',async()=>{
 let resolve!:(x:unknown)=>void;let entered!:()=>void;const started=new Promise<void>(r=>{entered=r;});let saved:Parameters<ArgumentPost>[0];let calls=0;
 const store=ledger();const flow=new ArgumentWorkspace(store,{goal:'general',difficulty:'foundation',info,post:b=>{calls++;saved=b;entered();return new Promise(r=>{resolve=r;});}});
 const pending=flow.submit(text,{syntheticConfirmed:true});await started;await assert.rejects(flow.submit(text,{syntheticConfirmed:true}),/already/);flow.cancel();resolve(output(saved!));await pending;assert.equal(calls,1);assert.equal(flow.view().busy,false);assert.equal(flow.view().artifacts.length,1);assert.equal(flow.view().artifacts[0].feedback,null);
});
test('schema rejects ungrounded quotes, replacement prose, unknown fields and conflicting coverage',()=>{
 const a:ArgumentArtifact={version:'argument-artifact@1',id:'a',cycle:'c',at:'now',goal:'general',difficulty:'foundation',stage:'initial',topic:'Topic',prompt:'Prompt',text,words:45,dataUse:'synthetic_test',assistance:'initial_independent'};
 const req=argumentRequest(a,0),body={task:'observe' as const,request:req,data_use:'synthetic_test' as const};
 for(const mutate of [(o:any)=>{o.output.findings[0].quote='invented quotation';},(o:any)=>{o.output.findings[0].correction='replacement sentence';},(o:any)=>{o.output.not_observable=['evidence'];},(o:any)=>{o.output.not_observable=['claim','claim'];},(o:any)=>{o.evaluator.model='other';},(o:any)=>{o.output.findings[0].area='mastery';},(o:any)=>{o.output.findings[0].question='Not a question';},(o:any)=>{o.output.findings[0].question='x'.repeat(600)+'?';},(o:any)=>{o.output.findings[0].hint='x'.repeat(601);}]){const raw=output(body);mutate(raw);assert.throws(()=>validateArgumentFeedback(raw,req,info));}
 const boundary=output(body);boundary.output.findings[0].question='x'.repeat(599)+'?';boundary.output.findings[0].hint='x'.repeat(600);assert.equal(validateArgumentFeedback(boundary,req,info).status,'observations_only');
 const trailing=output(body);trailing.output.findings[0].question='Why?  ';assert.equal(validateArgumentFeedback(trailing,req,info).status,'observations_only');
 assert.equal(ARGUMENT_AREAS.length,7);assert.notEqual(argumentTask('grade7','foundation',1,'for').prompt,argumentTask('gmat','stretch',1,'against').prompt);
});
test('existing learner ledger stores argument artifacts alongside core history without estimate changes',async()=>{
 const content=loadContent(),repo=new MemoryRepo();const clock=()=> '2026-11-18T09:00:00Z';const learner=await Learner.create(content,repo,'Synthetic argument workspace','learner',clock,'argument-workspace-test','this_device_only');
 const before=JSON.stringify(learner.state.ledger.composite.nodes);const flow=new ArgumentWorkspace(learner,{goal:'general',difficulty:'foundation',info,post:async b=>output(b)});await flow.submit(text,{syntheticConfirmed:true});
 assert.equal(JSON.stringify(learner.state.ledger.composite.nodes),before);const reloaded=await Learner.open(content,repo,'argument-workspace-test',clock);assert.equal(new ArgumentWorkspace(reloaded,{goal:'general',difficulty:'foundation'}).view().artifacts[0].artifact.text,text);assert.ok((await repo.load('argument-workspace-test')).some(e=>e.kind==='essay'&&e.record.type==='argument_feedback'));
});

test('initial writing link preserves its original prompt and cannot impersonate another artifact',async()=>{
 const content=loadContent(),repo=new MemoryRepo(),clock=()=> '2026-11-18T09:00:00Z';
 const learner=await Learner.create(content,repo,'Synthetic source test','learner',clock,'argument-source-test','this_device_only');
 const original=await new EssayStudio(learner).submit(text,{kind:'synthetic',prompt:'Explain a community proposal in your own words.'});
 const flow=new ArgumentWorkspace(learner,{goal:'gmat',difficulty:'developing'});
 await assert.rejects(flow.submit(text,{syntheticConfirmed:true,sourceEssayId:'not-mine'}));
 const result=await flow.submit(text,{syntheticConfirmed:true,sourceEssayId:original.essay!.id});
 assert.equal(result.artifacts[0].artifact.sourceEssayId,original.essay!.id);assert.equal(result.artifacts[0].artifact.prompt,original.essay!.source.prompt);assert.equal(result.artifacts[0].artifact.topic,'Initial writing sample');
 assert.equal(result.stage,'for');assert.ok(result.task.topic.includes('business'));
 assert.throws(()=>new ArgumentWorkspace(learner,{goal:'general',difficulty:'foundation',grade:7}));
});
