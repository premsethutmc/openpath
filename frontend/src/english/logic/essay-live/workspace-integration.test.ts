import test from 'node:test';import assert from 'node:assert/strict';
import {DEVELOPER_VERIFICATION,type EssayEvaluator} from '../../../../../packages/english-core/src/index.ts';
import {allocateItems} from '../../../../../packages/english-core/src/essay/allocation.ts';
import {loadContent} from '../content.ts';import {Learner} from '../learner.ts';import {MemoryRepo} from '../store.ts';import {rightAnswer,wrongAnswer} from '../test-helpers.ts';
import {EssayStudio,essayContext} from './studio.ts';import {createWorkspaceProfile} from './workspace-profiles.ts';import {withWorkspaceLessons} from './workspace-lessons.ts';
const content=withWorkspaceLessons(loadContent()),cap='EN.GRM.PUN.commas';
const text='After the match ended we walked home together. When we reached my house my mother had made dinner. Because it was late we ate quickly and went to bed. In the morning my brother asked about the game and I told him everything.';
const evaluator:EssayEvaluator={id:'openpath-gateway:llm',version:'synthetic-test@1',protocols:{observe:'essay-observe.v2',rewrite:'essay-rewrite.v2'},async observe(req){
 return {essay_id:req.essay.id,rubric:req.rubric,observations:['After the match ended we walked','When we reached my house my mother','Because it was late we ate'].map(quote=>({competency:cap,kind:'error',quote,correction:quote.replace(/ (we|my) /,', $1 '),confidence:'high',explanation:'An introductory dependent clause needs a separating comma in this sentence.',verification:'required'})),not_observable:[]};
},async rewrite(){throw Error('not requested');}};
test('workspace uses existing grammar journey, lesson ledger and reserved later-check scheduler',async()=>{
 let time=Date.UTC(2026,10,18,13);const clock=()=>new Date(time+=60000).toISOString();
 const repo=new MemoryRepo(),learner=await Learner.create(content,repo,'Synthetic workspace','guardian',clock,'workspace-integrated-check');
 const profile=createWorkspaceProfile('general','developing',content),studio=new EssayStudio(learner,evaluator,undefined,DEVELOPER_VERIFICATION,{profile:profile.profile,failClosed:true,useFallback:false});
 let v=await studio.submit(text);assert.equal(v.analysis?.status,'accepted');assert.equal(v.hypotheses.find(h=>h.competency===cap)?.status,'suspected');
 while(v.nextDiagnostic)v=(await studio.answerDiagnostic(wrongAnswer(v.nextDiagnostic.item))).view;
 v=await studio.plan();const node=v.journey!.trees.find(t=>t.root===cap)!.nodes.find(n=>n.competency===cap)!;
 assert.ok(node.steps.some(s=>s.kind==='teach'&&s.content.refs.includes(`${cap}#workspace-foundation`)));
 for(let guard=0;guard<30&&v.next;guard++)v=v.next.lesson?await studio.readLesson(v.next.lesson.id,true):(await studio.answerStep(rightAnswer(v.next.item!))).view;
 assert.ok(studio.events.some(e=>e.kind==='intervention'&&e.capability===cap));
 assert.ok(studio.events.some(e=>e.kind==='essay'&&e.record.type==='journey'));
 v=await studio.planLaterChecks();const later=v.checks.find(c=>c.competency===cap);
 assert.ok(later,'existing core reserves a later verification or retention check');assert.equal(v.laterCheck,null,'later check is not offered early');
 const answered=new Set(studio.events.flatMap(e=>(e.kind==='evidence'||e.kind==='assisted_response')?[e.item.id]:[]));
 assert.ok(later.items.every(q=>!answered.has(q.id)));
 time=Date.parse(later.notBefore)+60000;v=studio.view();assert.equal(v.laterCheck?.check.id,later.id);
 while(v.laterCheck?.check.id===later.id)v=(await studio.answerLaterCheck(rightAnswer(v.laterCheck.item))).view;
 const reopened=await Learner.open(content,repo,learner.profileId,clock);assert.ok(reopened.state.ledger.events.some(e=>e.kind==='essay'&&e.record.type==='check'));
});
test('mini-lesson availability does not erase formal-check shortages or retention reservations',()=>{
 for(const difficulty of ['foundation','developing','stretch'] as const){
  const profile=createWorkspaceProfile('general',difficulty,content),ctx=essayContext(content,DEVELOPER_VERIFICATION,profile.profile);
  const allocations=profile.profile.competencies.filter(c=>c.specified).map(c=>allocateItems(ctx,[],c.capability));
  assert.ok(allocations.some(a=>a.available.independent_verification.length<2),'the current bank is not represented as complete');
  for(const a of allocations){
   assert.ok(a.reserved.delayed_retention.every(id=>!a.available.diagnostic.includes(id)&&!a.available.guided_practice.includes(id)));
   if(a.available.independent_verification.length<2)assert.ok(a.shortfall.length>0);
  }
 }
});
