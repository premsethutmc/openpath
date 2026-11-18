import assert from 'node:assert/strict';import {test} from 'node:test';
import {ArgumentWorkspace,type ArgumentLedger} from './argument-workspace.ts';
import {ARGUMENT_RUBRIC,argumentRequest,type ArgumentArtifact,type ArgumentPost,type ArgumentGatewayInfo,type ArgumentTransferTask,type EssayEvent} from '../../../../../packages/english-core/src/index.ts';
import {ARGUMENT_TRANSFER_TASKS} from '../../../../../packages/english-core/src/essay/argument-transfer-bank.ts';
import type {AppEvent} from '../events.ts';import {loadContent} from '../content.ts';import {Learner} from '../learner.ts';import {MemoryRepo} from '../store.ts';
const text='A community should improve its shared spaces because these places let people meet and learn together. A useful plan would explain who can use the space and how access will be maintained. Costs and competing needs should also be considered before a decision is made.';
const fresh='The proposal should be tested for a short period before a permanent decision is made. A trial would allow the people involved to describe their experience and identify practical problems. The decision should consider who benefits and whether the remaining difficulties can be addressed fairly.';
const info:ArgumentGatewayInfo={available:true,id:'fixture',version:'1',model:'synthetic',rubric:ARGUMENT_RUBRIC,protocols:{observe:'essay-observe.v2'}};
function store():ArgumentLedger{const events:AppEvent[]=[];let n=0;return {events,essayMeta:async()=>[{id:`e${++n}`,at:'2026-11-18T09:00:00.000Z',session:'s'}],recordEssay:async(...rows)=>{events.push(...structuredClone(rows));}};}
const valid=(body:Parameters<ArgumentPost>[0])=>({record:1,evaluator:{...info,available:undefined,protocols:undefined,protocol:'essay-observe.v2'},output:{essay_id:body.request.essay.id,rubric:ARGUMENT_RUBRIC,findings:[],not_observable:['evidence']}});
function output(body:Parameters<ArgumentPost>[0]){const raw=valid(body);delete (raw.evaluator as any).available;delete (raw.evaluator as any).protocols;return raw;}
async function completed(ledger=store()){
 const flow=new ArgumentWorkspace(ledger,{goal:'general',difficulty:'foundation'});
 for(const stage of ['initial','for','against','revision'])await flow.submit(text+(stage==='revision'?' This changes the qualification.':''),{syntheticConfirmed:true});return {ledger,flow};
}
test('fresh task is reserved before display, reload stable, and coaching is unavailable while active',async()=>{
 const {ledger,flow}=await completed();assert.equal(flow.view().transfer.available,true);assert.equal('nextTask' in flow.view().transfer,false);
 const reserved=await flow.startTransfer();const active=reserved.transfer.active!;assert.ok(active);assert.equal(ledger.events.filter(e=>e.kind==='essay'&&e.record.type==='argument_transfer_reserved').length,1);
 const restored=new ArgumentWorkspace(ledger,{goal:'general',difficulty:'foundation'});assert.deepEqual(restored.view().transfer.active,active);
 await assert.rejects(restored.startTransfer());assert.throws(()=>restored.startNewCycle());await assert.rejects(restored.retryAnalysis(reserved.artifacts[0].artifact.id));await assert.rejects(restored.submit(text,{syntheticConfirmed:true}));
 active.task.prompt='mutated';assert.notEqual(restored.view().transfer.active!.task.prompt,'mutated');
 const saved=await restored.submitTransfer(active.reservation.id,fresh,{syntheticConfirmed:true,unaidedConfirmed:true});assert.equal(saved.transfer.active,null);assert.equal(saved.transfer.history[0].feedback,null);assert.equal(saved.transfer.history[0].artifact?.assistance,'independent_transfer');assert.equal(saved.transfer.history[0].artifact?.stage,'transfer');assert.deepEqual(saved.transfer.history[0].artifact?.independenceDeclaration,{unaided:true,proctored:false,at:'2026-11-18T09:00:00.000Z'});
 assert.equal(saved.artifacts.length,4);assert.equal(saved.transfer.available,false);await assert.rejects(restored.submitTransfer(active.reservation.id,fresh,{syntheticConfirmed:true,unaidedConfirmed:true}));
});
test('abandoned tasks and their families stay spent; prior coached topic and finite-bank exhaustion are honest',async()=>{
 const {ledger}=await completed();const base=ARGUMENT_TRANSFER_TASKS.filter(t=>t.allowedGoals.includes('general')).slice(0,2);
 const familyVariant:ArgumentTransferTask={...base[0],id:'new-id-same-family'};
 const coached:ArgumentTransferTask={...base[1],id:'already-coached',family:'coached-family',topic:'Should a community spend more on shared public spaces than on visitor attractions?'};
 const flow=new ArgumentWorkspace(ledger,{goal:'general',difficulty:'foundation',transferTasks:[coached,base[0],familyVariant,base[1]]});
 const first=(await flow.startTransfer()).transfer.active!;assert.equal(first.task.id,base[0].id);await flow.abandonTransfer(first.reservation.id);
 const second=(await flow.startTransfer()).transfer.active!;assert.equal(second.task.id,base[1].id);await flow.abandonTransfer(second.reservation.id);
 const exhausted=flow.view().transfer;assert.equal(exhausted.available,false);assert.match(exhausted.blockedReason!,/No unseen/);await assert.rejects(flow.startTransfer());
});
test('consent, own unaided declaration, word limits and normalized duplicate guards prevent dispatch',async()=>{
 const {ledger}=await completed();let calls=0;const flow=new ArgumentWorkspace(ledger,{goal:'general',difficulty:'foundation',info,post:async body=>{calls++;return output(body);}});
 const id=(await flow.startTransfer()).transfer.active!.reservation.id;
 await assert.rejects(flow.submitTransfer(id,fresh,{syntheticConfirmed:false,unaidedConfirmed:true}));await assert.rejects(flow.submitTransfer(id,fresh,{syntheticConfirmed:true,unaidedConfirmed:false}));await assert.rejects(flow.submitTransfer(id,'short',{syntheticConfirmed:true,unaidedConfirmed:true}));
 await assert.rejects(flow.submitTransfer(id,text.toUpperCase().replaceAll('.', '!!!'),{syntheticConfirmed:true,unaidedConfirmed:true}),/reuse/);assert.equal(calls,0);
 const result=await flow.submitTransfer(id,fresh,{syntheticConfirmed:true,unaidedConfirmed:true});assert.equal(calls,1);assert.equal(result.transfer.history[0].feedback?.status,'observations_only');
});
test('initial transfer and every retry send only the new task and response, never previous text or coaching',async()=>{
 const {ledger}=await completed();const requests:Parameters<ArgumentPost>[0][]=[];let broken=true;
 const flow=new ArgumentWorkspace(ledger,{goal:'general',difficulty:'foundation',info,post:async body=>{requests.push(body);if(broken)throw Error('provider unavailable');return output(body);}});
 const id=(await flow.startTransfer()).transfer.active!.reservation.id;let view=await flow.submitTransfer(id,fresh,{syntheticConfirmed:true,unaidedConfirmed:true});
 const artifact=view.transfer.history[0].artifact!;assert.equal(view.transfer.history[0].feedback?.status,'unavailable');broken=false;flow.startNewCycle();view=await flow.retryAnalysis(artifact.id);assert.equal(view.transfer.history[0].feedback?.status,'observations_only');
 for(const body of requests){assert.equal(body.request.task_context.stage,'transfer');assert.deepEqual(Object.keys(body.request.task_context).sort(),['prompt','stage','topic']);assert.equal(body.request.essay.text,fresh);assert.ok(!JSON.stringify(body).includes(text));assert.equal(body.data_use,'synthetic_test');}
 const poisoned={...artifact,revisionOf:'old',sourceEssayId:'old'};assert.equal('previous' in argumentRequest(poisoned,0,{...artifact,text} as ArgumentArtifact).task_context,false);
});
test('cancelled late model result cannot overwrite a newer retry or clear its busy state',async()=>{
 const {ledger}=await completed();const calls:{body:Parameters<ArgumentPost>[0];resolve:(value:unknown)=>void}[]=[];
 const flow=new ArgumentWorkspace(ledger,{goal:'general',difficulty:'foundation',info,post:body=>new Promise(resolve=>calls.push({body,resolve}))});
 const id=(await flow.startTransfer()).transfer.active!.reservation.id;const old=flow.submitTransfer(id,fresh,{syntheticConfirmed:true,unaidedConfirmed:true});while(calls.length<1)await new Promise(r=>setTimeout(r,0));
 flow.cancel();const artifact=flow.view().transfer.history[0].artifact!;const retry=flow.retryAnalysis(artifact.id);while(calls.length<2)await new Promise(r=>setTimeout(r,0));
 calls[0].resolve(output(calls[0].body));await old;assert.equal(flow.view().busy,true);assert.throws(()=>flow.startNewCycle(),/Finish/);calls[1].resolve(output(calls[1].body));await retry;
 assert.equal(flow.view().busy,false);assert.equal(ledger.events.filter(e=>e.kind==='essay'&&e.record.type==='argument_feedback').length,1);
});
test('reservation commits remain serialized across cancel and another controller; abandoned attempts never erase writing',async()=>{
 const {ledger,flow}=await completed();const append=ledger.recordEssay.bind(ledger);let release!:()=>void;
 ledger.recordEssay=async(...events)=>{await new Promise<void>(r=>{release=r;});await append(...events);};
 const pending=flow.startTransfer();while(!release)await new Promise(r=>setTimeout(r,0));flow.cancel();assert.equal(flow.view().busy,true);
 await assert.rejects(flow.startTransfer(),/progress/);const other=new ArgumentWorkspace(ledger,{goal:'general',difficulty:'foundation'});await assert.rejects(other.startTransfer(),/progress/);
 release();await pending;assert.equal(flow.view().busy,false);assert.ok(flow.view().transfer.active);assert.equal(flow.view().artifacts.length,4);
});
test('transfer reservations and writing persist on existing real ledger without changing engine estimates',async()=>{
 const content=loadContent(),repo=new MemoryRepo(),clock=()=> '2026-11-18T09:00:00.000Z';const learner=await Learner.create(content,repo,'Synthetic transfer','learner',clock,'transfer-test','this_device_only');
 const {flow}=await completed(learner),before=JSON.stringify(learner.state.ledger.composite.nodes);const id=(await flow.startTransfer()).transfer.active!.reservation.id;await flow.submitTransfer(id,fresh,{syntheticConfirmed:true,unaidedConfirmed:true});
 const reopened=await Learner.open(content,repo,'transfer-test',clock),resumed=new ArgumentWorkspace(reopened,{goal:'general',difficulty:'foundation'});assert.equal(resumed.view().transfer.history[0].artifact?.text,fresh);assert.equal(JSON.stringify(reopened.state.ledger.composite.nodes),before);
});
test('separately opened learners reject stale reservations and submissions and refresh current history',async()=>{
 const content=loadContent(),repo=new MemoryRepo(),clock=()=> '2026-11-18T09:00:00.000Z';
 const first=await Learner.create(content,repo,'Synthetic race','learner',clock,'transfer-race','this_device_only');
 const {flow}=await completed(first);
 const second=await Learner.open(content,repo,first.profileId,clock),other=new ArgumentWorkspace(second,{goal:'general',difficulty:'foundation'});
 const id=(await flow.startTransfer()).transfer.active!.reservation.id;
 await assert.rejects(other.startTransfer(),/another window/);
 assert.equal(other.view().transfer.history.length,1);assert.equal(other.view().transfer.active?.reservation.id,id);
 await flow.submitTransfer(id,fresh,{syntheticConfirmed:true,unaidedConfirmed:true});
 await assert.rejects(other.submitTransfer(id,fresh+' A separate final sentence.',{syntheticConfirmed:true,unaidedConfirmed:true}),/another window/);
 assert.equal(other.view().transfer.active,null);
 const events=await repo.load(first.profileId);
 assert.equal(events.filter(e=>e.kind==='essay'&&e.record.type==='argument_transfer_reserved').length,1);
 assert.equal(events.filter(e=>e.kind==='essay'&&e.record.type==='argument_artifact'&&e.record.artifact.stage==='transfer').length,1);
 assert.equal(new Set(events.map(e=>e.id)).size,events.length);
});
test('simultaneous separate learners save one reservation; unsupported stores refuse',async()=>{
 const content=loadContent(),repo=new MemoryRepo(),clock=()=> '2026-11-18T09:00:00.000Z';
 const first=await Learner.create(content,repo,'Synthetic race','learner',clock,'transfer-concurrent','this_device_only');
 const {flow}=await completed(first),second=await Learner.open(content,repo,first.profileId,clock);
 const other=new ArgumentWorkspace(second,{goal:'general',difficulty:'foundation'});
 const outcomes=await Promise.allSettled([flow.startTransfer(),other.startTransfer()]);
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await repo.load(first.profileId)).filter(e=>e.kind==='essay'&&e.record.type==='argument_transfer_reserved').length,1);
 const unsupported=Object.create(repo);unsupported.appendIfUnchanged=undefined;
 const learner=await Learner.open(content,unsupported,first.profileId,clock);
 const blocked=new ArgumentWorkspace(learner,{goal:'general',difficulty:'foundation'});
 await assert.rejects(blocked.abandonTransfer(blocked.view().transfer.active!.reservation.id),/cannot safely save/);
});
test('concurrent transfer metadata from non-essay sessions cannot append duplicate session events',async()=>{
 const content=loadContent(),repo=new MemoryRepo(),clock=()=> '2026-11-18T09:00:00.000Z';
 const first=await Learner.create(content,repo,'Synthetic session race','learner',clock,'transfer-session-race','this_device_only');
 await completed(first);await first.start({type:'explore'});
 const second=await Learner.open(content,repo,first.profileId,clock);
 const flows=[first,second].map(l=>new ArgumentWorkspace(l,{goal:'general',difficulty:'foundation'}));
 const result=await Promise.allSettled(flows.map(f=>f.startTransfer()));
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 const events=await repo.load(first.profileId);
 assert.equal(new Set(events.map(e=>e.id)).size,events.length);
 assert.equal(events.filter(e=>e.kind==='essay'&&e.record.type==='argument_transfer_reserved').length,1);
});
test('intervening write after successful session CAS stops stale transfer selection without pretending rollback',async()=>{
 const content=loadContent(),repo=new MemoryRepo(),clock=()=> '2026-11-18T09:00:00.000Z';
 const learner=await Learner.create(content,repo,'Synthetic post-CAS race','learner',clock,'transfer-post-cas','this_device_only');
 await completed(learner);await learner.start({type:'explore'});
 const before=await repo.load(learner.profileId),original=repo.appendIfUnchanged.bind(repo);let injected=false;
 repo.appendIfUnchanged=async(profile,expected,event)=>{
  const saved=await original(profile,expected,event);
  if(saved&&!injected){injected=true;await repo.append(profile,{kind:'settings',id:'other-window-unique-event',at:clock(),speech:false});}
  return saved;
 };
 const flow=new ArgumentWorkspace(learner,{goal:'general',difficulty:'foundation'});
 await assert.rejects(flow.startTransfer(),/Some changes may already be saved/);
 const after=await repo.load(learner.profileId);
 assert.equal(after.length,before.length+2); // own session end and intervening setting both remain
 assert.equal(after.filter(e=>e.kind==='essay'&&e.record.type==='argument_transfer_reserved').length,0);
 assert.equal(after.filter(e=>e.kind==='essay'&&e.record.type==='argument_artifact'&&e.record.artifact.stage==='transfer').length,0);
 assert.deepEqual(learner.events,after);assert.equal(flow.view().busy,false);
});
