import test from 'node:test';import assert from 'node:assert/strict';
import {DEVELOPER_VERIFICATION,countedAnalyses,gapHypotheses,type EssayEvaluator,type EssayEvent} from '../../../../../packages/english-core/src/index.ts';
import {loadContent} from '../content.ts';import {Learner} from '../learner.ts';import {MemoryRepo} from '../store.ts';import {rightAnswer,wrongAnswer} from '../test-helpers.ts';
import {EssayStudio} from './studio.ts';import {createWorkspaceProfile} from './workspace-profiles.ts';import {withWorkspaceLessons} from './workspace-lessons.ts';import {withWorkspaceBank} from './workspace-bank.ts';
const content=withWorkspaceBank(withWorkspaceLessons(loadContent())),cap='EN.GRM.PUN.commas';
const text='After the match ended we walked home together. My mother had made dinner before we arrived. The game was exciting and our friends enjoyed watching it. We talked about the result while we ate our meal.';
function evaluator(options:{fail?:boolean;kind?:'error'|'style';confidence?:'high'|'low'}={}):EssayEvaluator{return {id:'openpath-gateway:llm',version:'synthetic-test@1',protocols:{observe:'essay-observe.v2',rewrite:'essay-rewrite.v2'},async observe(req){if(options.fail)throw Error('temporary unavailable');return {essay_id:req.essay.id,rubric:req.rubric,observations:[{competency:cap,kind:options.kind??'error',quote:'After the match ended we walked',correction:'After the match ended, we walked',confidence:options.confidence??'high',explanation:'Check where the opening clause ends.',verification:'required'}],not_observable:[]};},async rewrite(){throw Error('not requested');}};}
async function setup(ev:EssayEvaluator|null=evaluator()){
 let time=Date.UTC(2026,10,18,13);const clock=()=>new Date(time+=60000).toISOString();const repo=new MemoryRepo();const learner=await Learner.create(content,repo,'Synthetic writing','guardian',clock,'observation-loop');const profile=createWorkspaceProfile('general','developing',content).profile;const options={profile,failClosed:true,useFallback:false};const studio=new EssayStudio(learner,ev,undefined,DEVELOPER_VERIFICATION,options);return {repo,learner,clock,studio,options};
}
test('one tentative API observation → voluntary fresh check → lesson, without supplying replacement writing',async()=>{
 const {studio,repo,learner,clock,options}=await setup();let v=await studio.submit(text);
 assert.equal(v.hypotheses.length,0);assert.equal(v.nextDiagnostic,null);assert.equal(v.recommendation?.kind,'check_observation');assert.equal(v.essay?.text,text);
 v=await studio.checkObservation(cap);const request=v.nextDiagnostic!.request;assert.equal(request.observationCheck,true);assert.ok(request.minIndependent>=2);assert.equal(v.hypotheses[0].status,'suspected');assert.equal(v.hypotheses[0].exploratory,true);
 await assert.rejects(studio.checkObservation(cap),/already has a check/);
 v=(await studio.answerDiagnostic(wrongAnswer(v.nextDiagnostic!.item))).view;assert.notEqual(v.hypotheses[0].status,'confirmed','one answer cannot confirm difficulty');
 const reopened=await Learner.open(content,repo,learner.profileId,clock);const resumed=new EssayStudio(reopened,evaluator(),undefined,DEVELOPER_VERIFICATION,options);v=resumed.view();assert.equal(v.nextDiagnostic?.request.id,request.id);
 while(v.nextDiagnostic)v=(await resumed.answerDiagnostic(wrongAnswer(v.nextDiagnostic.item))).view;
 assert.equal(v.hypotheses[0].status,'confirmed');v=await resumed.plan();assert.ok(v.journey!.trees.some(t=>t.root===cap));
 const teaching=v.journey!.trees.flatMap(t=>t.nodes.flatMap(n=>n.steps)).find(s=>s.kind==='teach');assert.ok(teaching?.content.refs.length);
 const diagnosticIds=new Set(request.items.map(i=>i.id));
 assert.ok(v.journey!.trees.flatMap(t=>t.nodes.flatMap(n=>n.steps)).filter(s=>s.kind==='independent_check').every(s=>s.content.refs.every(id=>!diagnosticIds.has(id))));
 for(let n=0;n<30&&v.next;n++)v=v.next.lesson?await resumed.readLesson(v.next.lesson.id,true):(await resumed.answerStep(rightAnswer(v.next.item!))).view;
 assert.ok(resumed.events.some(e=>e.kind==='intervention'&&e.capability===cap));assert.equal(v.essay?.text,text);assert.equal(v.rewrite,null,'structured checks are not independent writing evidence');
});
test('right independent answers weaken a tentative concern rather than force teaching',async()=>{
 const {studio}=await setup();await studio.submit(text);let v=await studio.checkObservation(cap);while(v.nextDiagnostic)v=(await studio.answerDiagnostic(rightAnswer(v.nextDiagnostic.item))).view;
 assert.equal(v.hypotheses[0].status,'weakened');v=await studio.plan();assert.equal(v.journey?.trees.length,0);assert.equal(v.journey?.complete,false);assert.equal(v.journey?.progress?.percent,0);assert.equal(v.journey?.finalRewrite.available,false);
});
test('failed analysis stays unassessed; explicit retry preserves draft and cannot double-count or rerun success',async()=>{
 const options={fail:true};const {studio,repo,learner,clock,options:studioOptions}=await setup(evaluator(options));let v=await studio.submit(text);assert.equal(v.stage,'write');assert.match(v.recommendation!.reason,/unavailable/);
 v=await studio.plan();assert.equal(v.journey?.complete,false);assert.equal(v.journey?.progress?.percent,0);assert.equal(v.journey?.finalRewrite.available,false);
 options.fail=false;v=await studio.retryAnalysis();assert.equal(v.analysis?.status,'accepted');assert.equal(v.essays.length,1);assert.equal(v.hypotheses.length,0);assert.equal(v.essay?.text,text);await assert.rejects(studio.retryAnalysis(),/already has accepted/);
 const analysis=studio.events.find(e=>e.kind==='essay'&&e.record.type==='analysis'&&e.record.analysis.status==='accepted') as EssayEvent;
 const duplicate={...analysis,id:'duplicate-test'} as EssayEvent;assert.equal(countedAnalyses([...studio.events,duplicate]).length,1);assert.equal(gapHypotheses(studio.ectx,[...studio.events,duplicate]).length,0);
 const reopened=await Learner.open(content,repo,learner.profileId,clock);assert.equal(new EssayStudio(reopened,evaluator(),undefined,DEVELOPER_VERIFICATION,studioOptions).view().essays.length,1);
});
test('style, low-confidence and disconnected analysis cannot silently become confirmed targets',async()=>{
 for(const ev of [evaluator({kind:'style'}),evaluator({confidence:'low'}),null]){const {studio}=await setup(ev);await studio.submit(text);await assert.rejects(studio.checkObservation(cap));assert.equal(studio.view().hypotheses.length,0);}
 const {studio}=await setup(null);await studio.submit(text);await assert.rejects(studio.retryAnalysis(),/Reconnect/);
});
test('repeated writing does not offer an impossible check or count as new evidence',async()=>{
 const {studio}=await setup();await studio.submit(text);const v=await studio.submit(text);assert.ok(v.analysis?.repeatOf);assert.deepEqual(v.observationChecks,[]);assert.notEqual(v.recommendation?.kind,'check_observation');await assert.rejects(studio.checkObservation(cap));assert.equal(v.hypotheses.length,0);
});
test('a stale empty path can be rebuilt after exploratory answers establish a teaching target',async()=>{
 const {studio}=await setup();await studio.submit(text);let v=await studio.plan();assert.equal(v.journey!.trees.length,0);v=await studio.checkObservation(cap);while(v.nextDiagnostic)v=(await studio.answerDiagnostic(wrongAnswer(v.nextDiagnostic.item))).view;assert.equal(v.recommendation?.kind,'learn');v=await studio.plan();assert.ok(v.journey!.trees.some(t=>t.root===cap));
});
test('weakening one concern still offers another unchecked concern',async()=>{
 const base=evaluator();const ev:EssayEvaluator={...base,async observe(req){const raw=await base.observe(req) as any;raw.observations.push({competency:'EN.GRM.VERB.sva',kind:'error',quote:'My mother have dinner ready',correction:'My mother has dinner ready',confidence:'high',explanation:'Check agreement between the subject and verb.',verification:'required'});return raw;}};
 const {studio}=await setup(ev);await studio.submit(text.replace('My mother had made dinner before we arrived','My mother have dinner ready'));let v=await studio.checkObservation(cap);while(v.nextDiagnostic)v=(await studio.answerDiagnostic(rightAnswer(v.nextDiagnostic.item))).view;
 assert.equal(v.recommendation?.kind,'check_observation');assert.equal(v.recommendation?.competency,'EN.GRM.VERB.sva');assert.ok(v.observationChecks.includes('EN.GRM.VERB.sva'));
});
test('one studio refuses concurrent writing actions before a second model request',async()=>{
 let release!:()=>void;const wait=new Promise<void>(r=>release=r);let calls=0;const base=evaluator();const ev:EssayEvaluator={...base,async observe(req){calls++;await wait;return base.observe(req);}};const {studio}=await setup(ev);const pending=studio.submit(text);await assert.rejects(studio.submit(text),/already in progress/);release();await pending;assert.equal(calls,1);assert.equal(studio.view().essays.length,1);
});
