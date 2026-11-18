import test from 'node:test';import assert from 'node:assert/strict';
import {extendContent,scoreCode,type LedgerEvent,type Item} from '../../../../../packages/english-core/src/index.ts';
import {allocateItems,itemEligibility,teachingLeak} from '../../../../../packages/english-core/src/essay/allocation.ts';
import {contentStatus} from '../../../../../packages/english-core/src/content.ts';
import {loadContent} from '../content.ts';import {rightAnswer,wrongAnswer} from '../test-helpers.ts';import {feedbackFor} from '../feedback.ts';
import {essayContext} from './studio.ts';import {createWorkspaceProfile} from './workspace-profiles.ts';import {withWorkspaceLessons} from './workspace-lessons.ts';import {withWorkspaceBank,workspaceBankInventory} from './workspace-bank.ts';
const base=loadContent(),content=withWorkspaceBank(withWorkspaceLessons(base));
const capabilities=['EN.GRM.VERB.sva','EN.GRM.NOUN.articles','EN.SEN.COH.connectives','EN.WRT.ORG.sequencing'];
const difficulties=['foundation','developing','stretch'] as const;
const normal=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const inventory=workspaceBankInventory();
const context=(difficulty:typeof difficulties[number])=>essayContext(content,undefined,createWorkspaceProfile('general',difficulty,content).profile);
const seen=(ids:string[],purpose:'assessment'|'practice'='assessment'):LedgerEvent[]=>ids.map((id,i)=>({kind:'presented',id:`seen:${i}`,at:'2026-11-18T12:00:00.000Z',session:'synthetic',item:{id,version:1},purpose}));
test('12 bounded cells have authored role inventory, keys, explanations and genuine response-format diversity',()=>{
 assert.equal(inventory.length,192);assert.equal(new Set(inventory.map(r=>r.item.id)).size,192);
 assert.equal(new Set(inventory.map(r=>normal(r.item.prompt))).size,192);
 const oldPrompts=new Set([...base.ctx.content.items.values()].map(i=>normal(i.prompt)));
 for(const cap of capabilities)for(const difficulty of difficulties){
  const rows=inventory.filter(r=>r.item.target===cap&&r.difficulty===difficulty);
  assert.deepEqual(Object.fromEntries(['diagnosis','practice','confirmation','retention'].map(pool=>[pool,rows.filter(r=>r.pool===pool).length])),{diagnosis:3,practice:3,confirmation:8,retention:2});
  for(const pool of ['confirmation','retention'])assert.ok(new Set(rows.filter(r=>r.pool===pool).map(r=>r.item.format.split(':')[0])).size>=2,`${cap} ${difficulty} ${pool}: actual response formats`);
 }
 for(const row of inventory){const i=row.item;assert.equal(i.kind,'code');if(i.kind!=='code')continue;
  assert.equal(contentStatus(i),'candidate');assert.ok(!i.released_at&&!i.evidence_status);assert.ok(row.independenceNote.length>25);assert.ok(row.explanation.length>30);assert.ok(!oldPrompts.has(normal(i.prompt)));
  assert.equal(scoreCode(i,rightAnswer(i)).correct,true);assert.equal(scoreCode(i,wrongAnswer(i)).correct,false);assert.equal(feedbackFor(content,i,wrongAnswer(i)).explanation,row.explanation);
  assert.match(i.rationale!,/not measured ability or an exam standard/);
 }
});
test('candidate extension is workspace-only, preserves legacy/pilot inputs and is deterministic/idempotent',()=>{
 assert.equal(base.ctx.content.items.size+192,content.ctx.content.items.size);assert.equal(content.pilot,base.pilot);assert.equal(base.pilot.pools.size,loadContent().pilot.pools.size);
 for(const [id,item]of base.ctx.content.items)assert.equal(content.ctx.content.items.get(id),item);
 const again=withWorkspaceBank(content);assert.equal(again.ctx.content.items.size,content.ctx.content.items.size);assert.deepEqual([...again.workspacePools],[...content.workspacePools]);
 assert.throws(()=>withWorkspaceBank({...base,contentMode:'pilot'}),/unavailable/);
 const copy=workspaceBankInventory();copy[0].item.prompt='mutated';assert.notEqual(workspaceBankInventory()[0].item.prompt,'mutated');
 const conflict={...content,workspacePools:new Map(content.workspacePools)};conflict.workspacePools.set(inventory[0].item.id,'retention');assert.throws(()=>withWorkspaceBank(conflict),/conflict/);
});
test('all12cells support diagnosis/guided/full four independent pairs while reserving distinct retention',()=>{
 for(const difficulty of difficulties){const ctx=context(difficulty);for(const cap of capabilities){
  const rows=inventory.filter(r=>r.item.target===cap&&r.difficulty===difficulty),a=allocateItems(ctx,[],cap);
  const expected={diagnosis:'diagnostic',practice:'guided_practice',confirmation:'independent_verification',retention:'delayed_retention'} as const;
  const eligibility=itemEligibility(ctx,cap);
  for(const row of rows){assert.deepEqual(eligibility.find(e=>e.item===row.item.id)?.roles,[expected[row.pool]],`${row.key}: role/leakage`);}
  assert.ok(a.available.diagnostic.length>=3);assert.ok(a.available.guided_practice.length>=3);assert.ok(a.available.independent_verification.length>=8);assert.equal(a.reserved.delayed_retention.length,2);
  const reserved=new Set([...a.reserved.independent_verification,...a.reserved.delayed_retention]);assert.ok(a.available.diagnostic.every(id=>!reserved.has(id)));assert.ok(a.available.guided_practice.every(id=>!reserved.has(id)));
  // A full writing journey can spend the confirmation allocation only; retention stays reserved and unseen.
  const used=a.available.independent_verification.slice(0,8);const after=allocateItems(ctx,seen(used),cap);
  assert.ok(used.every(id=>!after.available.independent_verification.includes(id)));assert.deepEqual(after.reserved.delayed_retention,a.reserved.delayed_retention);
 }}
});
test('exposed unanswered and assisted items cannot reappear; same-family variants never masquerade as new evidence',()=>{
 const row=inventory.find(r=>r.pool==='confirmation'&&r.difficulty==='developing')!,ctx=context('developing');
 for(const purpose of ['assessment','practice'] as const){const a=allocateItems(ctx,seen([row.item.id],purpose),row.item.target);assert.ok(Object.values(a.available).every(ids=>!ids.includes(row.item.id)));}
 const variant={...structuredClone(row.item),id:'test-only-same-family',prompt:'A test-only surface variant, never shipped.'} as Item;
 const amended={...ctx,ctx:{...ctx.ctx,content:extendContent(ctx.ctx.content,[variant],ctx.ctx.index)}};
 const a=allocateItems(amended,seen([row.item.id],'practice'),row.item.target);assert.ok(a.compromised.some(x=>x.item===variant.id));assert.ok(!a.available.independent_verification.includes(variant.id));assert.ok(!a.available.delayed_retention.includes(variant.id));
});
test('teaching leakage remains enforced and option positions do not repeat the authored cycle',()=>{
 for(const difficulty of difficulties){const ctx=context(difficulty);for(const row of inventory.filter(r=>r.difficulty===difficulty&&r.pool!=='practice')){
  assert.equal(teachingLeak(row.item as Extract<Item,{kind:'code'}>,ctx.teachingText?.get(row.item.target)??[]),null,row.key);
 }}
 const row=inventory.find(r=>r.pool==='confirmation'&&r.item.kind==='code'&&r.item.format.startsWith('typed:'))!;const item=row.item as Extract<Item,{kind:'code'}>;
 const teaching=item.prompt.replace(/_{3,}/,item.answers![0]);const ctx=context(row.difficulty);const contaminated={...ctx,teachingText:new Map(ctx.teachingText)};contaminated.teachingText.set(item.target,[teaching]);
 assert.ok(!itemEligibility(contaminated,item.target).find(e=>e.item===item.id)?.roles.includes('independent_verification'));
 const positions=inventory.filter(r=>r.item.kind==='code'&&r.item.format.startsWith('choice:')).map(r=>(r.item as Extract<Item,{kind:'code'}>).answer!);
 assert.ok(new Set(positions).size===3);assert.ok(positions.some((p,i)=>i>=3&&p!==positions[i-3]));
});

test('accepted grammatical wording is not falsely described as a British spelling variant',()=>{
 const i=inventory.map(r=>r.item).find(i=>i.kind==='code'&&i.format==='typed:grammar'&&i.answers?.includes('no article'))!;
 assert.ok(i);const feedback=feedbackFor(content,i,{kind:'typed',text:'no article'});assert.equal(feedback.correct,true);assert.equal(feedback.variantNote,null);
});

test('actual journey and three later check selections accumulate real format diversity without spending retention',async()=>{
 const {pickForRole}=await import('../../../../../packages/english-core/src/essay/allocation.ts');
 for(const difficulty of difficulties)for(const cap of capabilities){
  const ctx=context(difficulty);const events:LedgerEvent[]=[];
  // Spend the real diagnostic and guided selections first, as the journey does.
  for(const [role,purpose] of [['diagnostic','assessment'],['guided_practice','practice']] as const){
   const selected=pickForRole(ctx,events,cap,role,3);assert.equal(selected.length,3);
   events.push(...seen(selected.map(q=>q.id),purpose).map((e,i)=>({...e,id:`${role}:${i}`})));
  }
  const reserved=pickForRole(ctx,events,cap,'delayed_retention',2).map(q=>q.id);
  const formats=new Set<string>(),used=new Set<string>();
  for(let check=0;check<4;check++){
   const pair=pickForRole(ctx,events,cap,'independent_verification',2);assert.equal(pair.length,2,`${cap}/${difficulty}/check${check}`);
   for(const q of pair){assert.ok(!used.has(q.id)&&!reserved.includes(q.id));used.add(q.id);formats.add(q.format.split(':')[0]);}
   events.push(...seen(pair.map(q=>q.id)).map((e,i)=>({...e,id:`check:${check}:${i}`,session:`check:${check}`})));
  }
  assert.ok(formats.size>=2,`${cap}/${difficulty}: diversity across actual four checks, not merely bank inventory`);
  assert.deepEqual(pickForRole(ctx,events,cap,'delayed_retention',2).map(q=>q.id),reserved);
 }
});

test('engine requires accumulated qualifying contexts, not two formats anew in every pair or delayed check',async()=>{
 const {createComposite,applyDirect,demonstratedLevel}=await import('../../../../../packages/english-core/src/composite.ts');
 const {checkPassed}=await import('../../../../../packages/english-core/src/retention.ts');
 const cap=capabilities[0],composite=createComposite(content.index,'format-rule-unit-test'),node=composite.nodes[cap];
 // Hold the estimate fixed and sufficiently precise to isolate the context gate, not simulate learning.
 node.direct={mean:6,variance:0.01};node.combined={...node.direct};
 const apply=(n:number,format:string,session:string)=>applyDirect(composite,content.index,{capability:cap,at:`2026-11-18T12:00:0${n}.000Z`,session,context:format,decisionId:`unit:${n}`,misconceptions:[],update:e=>e});
 for(let n=0;n<4;n++)apply(n,'choice:grammar','first-sitting');
 assert.equal(demonstratedLevel(node,content.index.framework.policy,cap),null,'many answers in one format do not satisfy diversity');
 apply(4,'typed:grammar','later-sitting');
 assert.ok(demonstratedLevel(node,content.index.framework.policy,cap)!>=4,'the later sitting can add the missing context to accumulated evidence');
 apply(5,'typed:grammar','later-sitting');
 assert.ok(node.sessions?.find(s=>s.session==='later-sitting')?.level!==null,'a later all-typed pair does not erase earlier qualifying context');
 assert.equal(checkPassed([{kind:'binary',b:4,a:1.1,c:0,correct:true,exposure:'fresh'},{kind:'binary',b:4,a:1.1,c:0,correct:true,exposure:'fresh'}],4,null),true,'delayed fresh evidence uses likelihood, not a new format-diversity gate');
});
