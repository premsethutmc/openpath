import test from 'node:test';import assert from 'node:assert/strict';
import {CAUSAL_PACKS} from './causal-packs.ts';
import {causalItems,validateCausalPack,newCausalSession,transitionCausal,causalView,type CausalPack,type CausalSession} from './causal.ts';
import {assessAuthoredClues} from './inference.ts';
const now='2026-11-19T12:00:00.000Z',later='2026-11-22T12:00:00.000Z';
const all=CAUSAL_PACKS.flatMap(causalItems);
test('two interchangeable demand contexts contain 36 role-separated candidate tasks, not grades',()=>{
 assert.equal(CAUSAL_PACKS.length,2);assert.equal(all.length,36);
 assert.equal(new Set(all.map(i=>i.id)).size,36);assert.equal(new Set(all.map(i=>i.family)).size,36);
 assert.equal(new Set(all.map(i=>i.passage.join(' '))).size,36);
 for(const p of CAUSAL_PACKS){validateCausalPack(p);assert.equal(causalItems(p).length,18);assert.ok(p.context&&p.language.vocabulary&&p.language.syntax&&p.integrationDemand);
  assert.equal(p.battery.length,6);assert.deepEqual(p.battery.slice(0,2).map(i=>i.dimension),['integration','integration']);
  assert.ok(!('grade' in p)&&!('score' in p));
  for(const lesson of Object.values(p.lessons)){assert.ok(lesson.steps.length>=3);assert.ok(lesson.explanation.length>60);}
 }
 assert.notEqual(CAUSAL_PACKS[0].language.syntax,CAUSAL_PACKS[1].language.syntax);
 assert.ok(all.every(i=>!(/\b(lake|windmill|bottles|library)\b/i.test(i.passage.join(' ')))));
});
test('integration requires two relevant clues among distractors, with varied authored positions',()=>{
 const integration=all.filter(i=>i.dimension==='integration');assert.equal(integration.length,20);
 for(const i of integration){assert.equal(i.passage.length,3,i.id);assert.equal(i.sets.length,1);assert.equal(i.sets[0].length,2);
  assert.equal(assessAuthoredClues(true,i.sets[0],i.sets).evidence,'complete');
  assert.notEqual(assessAuthoredClues(true,[0,1,2],i.sets).evidence,'complete');
  for(const clue of i.sets[0])assert.equal(assessAuthoredClues(true,[clue],i.sets).evidence,'partial');
  assert.equal(assessAuthoredClues(false,i.sets[0],i.sets).answerCorrect,false);
  assert.ok(!/sentence [123]|first sentence|second sentence|third sentence/i.test(i.explanation),`${i.id}: explanation must survive layout`);
 }
 assert.equal(new Set(integration.map(i=>i.sets[0].join(','))).size,3);
 assert.equal(new Set(all.map(i=>i.answer)).size,3);
});
function answer(s:CausalSession,p:CausalPack,wrong=false,at=now){
 s=transitionCausal(s,p,{type:'reserve'},at);const shown=causalView(s,p,at).active!;assert.ok(!('answer' in shown)&&!('sets' in shown)&&!('explanation'in shown));
 const i=causalItems(p).find(i=>i.id===shown.id)!;
 return transitionCausal(s,p,{type:'answer',item:i.id,choice:wrong?(i.answer+1)%i.options.length:i.answer,sentences:i.sets[0]??[],helped:false,skipped:false},at);
}
test('identical response patterns route identically through real packs and preserve unseen delayed evidence',()=>{
 for(const p of CAUSAL_PACKS)for(const [wrong,route] of [[[0,1],'integration'],[[2,3],'word'],[[4,5],'literal'],[[2],'mixed']] as [number[],string][]){
  let s=newCausalSession(p);for(let n=0;n<6;n++){s=answer(s,p,wrong.includes(n));if(n<5){assert.equal(causalView(s,p,now).route,null);assert.deepEqual(causalView(s,p,now).review.battery,[]);}}
  assert.equal(causalView(s,p,now).route,route);assert.ok(causalView(s,p,now).lesson);
  s=transitionCausal(s,p,{type:'lesson_complete'},now);s=answer(s,p);assert.equal(causalView(s,p,now).review.practice[0].independent,false);
  s=transitionCausal(s,p,{type:'start_immediate'},now);assert.equal(causalView(s,p,now).lesson,null);
  s=answer(s,p);s=answer(s,p);assert.equal(causalView(s,p,now).phase,'waiting');assert.equal(causalView(s,p,now).due,later);
  const saved=JSON.stringify(s);assert.ok(p.delayed.every(i=>!saved.includes(i.id)),'reserved delayed content not exposed before due');
  assert.throws(()=>transitionCausal(s,p,{type:'reserve'},'2026-11-22T11:59:59.999Z'));
  s=answer(s,p,false,later);s=answer(s,p,false,later);const v=causalView(s,p,later);assert.equal(v.phase,'done');assert.ok(v.review.delayed.every(r=>r.correct&&r.independent));assert.throws(()=>transitionCausal(s,p,{type:'reserve'},later));
 }
});
