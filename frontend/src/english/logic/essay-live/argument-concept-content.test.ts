import test from 'node:test';import assert from 'node:assert/strict';
import {scoreCode,validateCompetencyProfile,type LedgerEvent,type Item} from '../../../../../packages/english-core/src/index.ts';
import {allocateItems,pickForRole,itemEligibility,teachingLeak} from '../../../../../packages/english-core/src/essay/allocation.ts';
import {contentStatus,guessingFloor} from '../../../../../packages/english-core/src/content.ts';
import {loadContent} from '../content.ts';import {rightAnswer,wrongAnswer} from '../test-helpers.ts';
import {essayContext} from './studio.ts';import {withWorkspaceBank} from './workspace-bank.ts';import {withWorkspaceLessons} from './workspace-lessons.ts';
import {withArgumentConceptContent,createArgumentConceptProfile,argumentConceptInventory,ARGUMENT_CONCEPT_CAPABILITIES} from './argument-concept-content.ts';
const source=withWorkspaceBank(withWorkspaceLessons(loadContent())),content=withArgumentConceptContent(source),rows=argumentConceptInventory();
const difficulties=['foundation','developing','stretch'] as const;
const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const ctx=(d:typeof difficulties[number])=>essayContext(content,undefined,createArgumentConceptProfile('general',d,content));
const seen=(ids:string[]):LedgerEvent[]=>ids.map((id,i)=>({kind:'presented',id:`seen:${i}:${id}`,at:'2026-11-18T12:00:00.000Z',session:'synthetic',item:{id,version:1},purpose:'assessment'}));
test('separate candidate profiles identify concept recognition, never replace backend writing rubric',()=>{
 for(const goal of ['grade7','general','cat','gre','gmat'] as const)for(const d of difficulties){
  const p=createArgumentConceptProfile(goal,d,content);assert.deepEqual(validateCompetencyProfile(p,content.index),[]);
  assert.match(p.id,/^argument-concepts-/);assert.equal(p.competencies.length,4);assert.equal(p.grade,goal==='grade7'?7:0);
  assert.ok(p.competencies.every(c=>c.name.includes('concept recognition')&&c.expectedBandStatus==='provisional'&&c.curriculum.every(r=>!r.validated)));
  assert.match(p.note!,/not assessment of the learner/);
 }
});
test('dedicated content isolates source items and lessons without mutating the shared framework or source view',()=>{
 assert.equal(content.index,source.index);assert.equal(content.ctx.index,source.ctx.index);
 assert.equal(content.ctx.content.items.size,192);assert.equal(content.lessons.size,4);
 assert.ok([...content.ctx.content.items.keys()].every(id=>!source.ctx.content.items.has(id)));
 assert.ok([...content.lessons.keys()].every(id=>!source.lessons.has(id)));
 assert.ok(source.ctx.content.items.size>192);assert.equal(source.lessons.size,loadContent().lessons.size+13);
 const again=withArgumentConceptContent(content);assert.deepEqual([...again.ctx.content.items],[...content.ctx.content.items]);
 assert.throws(()=>withArgumentConceptContent({...source,contentMode:'pilot'}),/unavailable/);
});
test('12 candidate cells have unique scenarios, correct scoring, honest choice/order formats and isolated roles',()=>{
 assert.equal(rows.length,192);assert.equal(new Set(rows.map(r=>r.item.id)).size,192);assert.equal(new Set(rows.map(r=>normalize(r.item.prompt))).size,192);
 const previous=new Set([...source.ctx.content.items.values()].map(i=>normalize(i.prompt)));
 for(const cap of ARGUMENT_CONCEPT_CAPABILITIES)for(const difficulty of difficulties){
  const cell=rows.filter(r=>r.item.target===cap&&r.difficulty===difficulty);
  assert.deepEqual(Object.fromEntries(['diagnosis','practice','confirmation','retention'].map(pool=>[pool,cell.filter(r=>r.pool===pool).length])),{diagnosis:3,practice:3,confirmation:8,retention:2});
  for(const pool of ['confirmation','retention'])assert.ok(new Set(cell.filter(r=>r.pool===pool).map(r=>r.item.format.split(':')[0])).size>=2,`${cap}/${difficulty}/${pool}`);
 }
 for(const row of rows){const item=row.item as Extract<Item,{kind:'code'}>;assert.equal(contentStatus(item),'candidate');assert.ok(!previous.has(normalize(item.prompt)));
  assert.ok(row.explanation.length>30&&row.independenceNote.length>25);assert.ok(guessingFloor(item)>0);assert.ok(!item.format.startsWith('typed:'));
  assert.equal(scoreCode(item,rightAnswer(item)).correct,true);assert.equal(scoreCode(item,wrongAnswer(item)).correct,false);
  assert.match(item.rationale!,/not assessment of the learner/);
  if(item.answer_order)assert.notDeepEqual(item.answer_order,[0,1,2]);
 }
});
test('new and source teaching remain distinct from every formal concept question',()=>{
 const leaks:string[]=[];
 for(const difficulty of difficulties){const context=ctx(difficulty);
  for(const row of rows.filter(r=>r.difficulty===difficulty&&r.pool!=='practice')){
   const oldText=[...source.lessons.values()].filter(l=>l.capability===row.item.target).flatMap(l=>[l.rule,l.tip??'',l.check.prompt,...l.check.options,l.check.explain,...l.examples.flatMap(e=>[e.text,e.note??''])]);
   const leak=teachingLeak(row.item as Extract<Item,{kind:'code'}>,[...oldText,...(context.teachingText?.get(row.item.target)??[])]);if(leak)leaks.push(`${row.key}: ${leak}`);
  }
 }
 assert.deepEqual(leaks,[]);
 for(const lesson of content.lessons.values()){
  assert.equal(lesson.examples.length,2);assert.ok(lesson.examples.every(e=>e.note&&e.note.length>20));assert.ok(lesson.tip&&lesson.tip.length>30);
  assert.equal(lesson.check.options.length,3);assert.ok(lesson.check.answer>=0&&lesson.check.answer<3);
 }
});
test('actual diagnostic/guided/four later pairs preserve unseen retention and accumulate real format diversity',()=>{
 for(const difficulty of difficulties)for(const cap of ARGUMENT_CONCEPT_CAPABILITIES){
  const context=ctx(difficulty),eligibility=itemEligibility(context,cap);
  const poolRoles={diagnosis:'diagnostic',practice:'guided_practice',confirmation:'independent_verification',retention:'delayed_retention'};
  for(const row of rows.filter(r=>r.item.target===cap&&r.difficulty===difficulty))assert.deepEqual(eligibility.find(e=>e.item===row.item.id)?.roles,[poolRoles[row.pool]],row.key);
  let events:LedgerEvent[]=[];const initial=allocateItems(context,events,cap);assert.equal(initial.reserved.delayed_retention.length,2);
  for(const role of ['diagnostic','guided_practice'] as const){const selected=pickForRole(context,events,cap,role,3);assert.equal(selected.length,3,`${cap}/${difficulty}/${role}`);events.push(...seen(selected.map(i=>i.id)));}
  const used:string[]=[];for(let n=0;n<4;n++){
   const selected=pickForRole(context,events,cap,'independent_verification',2);assert.equal(selected.length,2,`${cap}/${difficulty}/check${n}`);
   used.push(...selected.map(i=>i.id));events.push(...seen(selected.map(i=>i.id)));
  }
  assert.equal(new Set(used).size,8);assert.ok(new Set(used.map(id=>content.ctx.content.items.get(id)!.format)).size>=2);
  const after=allocateItems(context,events,cap);assert.deepEqual(after.reserved.delayed_retention,initial.reserved.delayed_retention);
  assert.equal(after.available.independent_verification.length,0);assert.ok(initial.reserved.delayed_retention.every(id=>!used.includes(id)));
 }
});
test('shared conceptual variants remain spent across references and interrupted presentations',()=>{
 const pairs=rows.flatMap((r,i)=>rows.slice(i+1).filter(s=>s.item.family===r.item.family).map(s=>[r,s] as const));
 assert.ok(pairs.length>0,'authored near-variants must acknowledge their shared family');
 for(const [a,b]of pairs){
  const result=allocateItems(ctx(b.difficulty),seen([a.item.id]),b.item.target);
  assert.ok(result.compromised.some(r=>r.item===b.item.id),`${a.key} -> ${b.key}`);
  assert.ok(!result.available.independent_verification.includes(b.item.id));assert.ok(!result.available.delayed_retention.includes(b.item.id));
 }
 const row=rows.find(r=>r.pool==='confirmation')!;
 const after=allocateItems(ctx(row.difficulty),seen([row.item.id]),row.item.target);
 assert.ok(Object.values(after.available).every(ids=>!ids.includes(row.item.id)),'unanswered exposure is not fresh');
});
