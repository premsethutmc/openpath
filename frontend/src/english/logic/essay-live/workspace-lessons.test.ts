import test from 'node:test';import assert from 'node:assert/strict';
import {loadContent} from '../content.ts';
import {withWorkspaceLessons} from './workspace-lessons.ts';
import {createWorkspaceProfile} from './workspace-profiles.ts';
import {essayContext} from './studio.ts';
const original=loadContent();
const normal=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
test('workspace adds exactly 13 missing specified mini-lessons without claiming the unspecified three',()=>{
 const extended=withWorkspaceLessons(original),workspace=createWorkspaceProfile('general','developing',extended);
 assert.equal(extended.lessons.size-original.lessons.size,13);
 assert.deepEqual(workspace.summary,{specified:17,observationOnly:3,withLessons:17,withoutLessons:3});
 assert.ok(workspace.coverage.filter(c=>c.specified).every(c=>c.lessonIds.length>0));
 assert.ok(workspace.coverage.filter(c=>!c.specified).every(c=>c.lessonIds.length===0&&c.status==='observation_only'));
 assert.deepEqual(createWorkspaceProfile('general','developing',original).summary,{specified:17,observationOnly:3,withLessons:4,withoutLessons:16});
});
test('existing lessons, items, context and pilot settings are unchanged; extension is idempotent',()=>{
 const snapshot=JSON.stringify([...original.lessons]),extended=withWorkspaceLessons(original),again=withWorkspaceLessons(extended);
 assert.notEqual(extended.lessons,original.lessons);assert.equal(JSON.stringify([...original.lessons]),snapshot);assert.equal(again.lessons.size,extended.lessons.size);
 for(const [key,value] of Object.entries(original))if(key!=='lessons')assert.equal((extended as unknown as Record<string,unknown>)[key],value);
 for(const [id,lesson] of original.lessons)assert.equal(extended.lessons.get(id),lesson);
});
test('new content has valid distinct guided checks, worked reasoning and learner-owned revision prompts',()=>{
 const extended=withWorkspaceLessons(original),newLessons=[...extended.lessons.values()].filter(l=>!original.lessons.has(l.id));
 const prompts=new Set([...original.ctx.content.items.values()].filter(i=>i.kind==='code').map(i=>normal(i.prompt)));
 const ids=new Set<string>(),checks=new Set<string>();
 for(const l of newLessons){
  assert.equal(l.id,`${l.capability}#workspace-foundation`);ids.add(l.id);assert.match(l.rule,/Candidate supported practice/);
  assert.equal(l.examples.length,2);assert.ok(l.examples.every(e=>e.text.length>20&&(e.note?.length??0)>20));assert.ok((l.tip?.length??0)>40);
  assert.equal(l.check.options.length,3);assert.equal(new Set(l.check.options.map(o=>o.trim().toLowerCase())).size,3);assert.ok(Number.isInteger(l.check.answer)&&l.check.answer>=0&&l.check.answer<3);assert.ok(l.check.explain.length>40);
  assert.ok(!prompts.has(normal(l.check.prompt)),`guided check repeats bank prompt: ${l.id}`);checks.add(normal(l.check.prompt));
 }assert.equal(ids.size,13);assert.equal(checks.size,13);
});
test('new objects are isolated across workspace instances and existing capability teaching wins',()=>{
 const a=withWorkspaceLessons(original),b=withWorkspaceLessons(original),id='EN.SEN.CMP.fragments#workspace-foundation';
 a.lessons.get(id)!.check.options[0]='tampered';assert.notEqual(b.lessons.get(id)!.check.options[0],'tampered');
 const custom={...original,lessons:new Map(original.lessons)};
 const lesson={...b.lessons.get(id)!,id:'custom-fragment-lesson'};custom.lessons.set(lesson.id,lesson);
 const extended=withWorkspaceLessons(custom);assert.ok(!extended.lessons.has(id));assert.equal(extended.lessons.get(lesson.id),lesson);
});
test('existing essay context discovers added lessons and includes their content in leakage protection',()=>{
 const content=withWorkspaceLessons(original),profile=createWorkspaceProfile('grade7','foundation',content).profile,ctx=essayContext(content,undefined,profile);
 for(const row of profile.competencies.filter(c=>c.specified))assert.ok((ctx.lessons.get(row.capability)?.length??0)>0);
 const lesson=content.lessons.get('EN.WRT.ORG.paragraphing#workspace-foundation')!;
 assert.ok(lesson.examples.every(e=>!e.note||ctx.teachingText?.get(lesson.capability)?.includes(e.note)));assert.ok(ctx.teachingText?.get(lesson.capability)?.includes(lesson.check.explain));assert.ok(ctx.teachingText?.get(lesson.capability)?.includes(lesson.check.options[lesson.check.answer]));
});
