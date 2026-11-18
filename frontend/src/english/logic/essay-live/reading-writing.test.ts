import test from 'node:test';
import assert from 'node:assert/strict';
import {readingSequence,writingGuidance,newReadingDraft,restoreReadingDraft,startIndependent,submitReading} from './reading-writing.ts';
import {WORKSPACE_GOALS,WORKSPACE_DIFFICULTIES} from './workspace-profiles.ts';
test('all practice references provide original disjoint worked, supported and fresh passages',()=>{
 const ids=new Set<string>();
 for(const level of WORKSPACE_DIFFICULTIES){const texts=readingSequence(level);assert.equal(texts.length,3);for(const t of texts){assert.ok(!ids.has(t.id));ids.add(t.id);assert.ok(t.text.length>150);assert.equal(new Set([t.main,...t.distractors]).size,3);assert.ok(t.limit);}}
 assert.equal(ids.size,9);
 const modified=readingSequence('foundation');modified[0].main='mutation';assert.notEqual(readingSequence('foundation')[0].main,'mutation');
});
test('goal and level adjust prompts without generating proficiency claims',()=>{for(const goal of WORKSPACE_GOALS)for(const level of WORKSPACE_DIFFICULTIES){const g=writingGuidance(goal,level);assert.ok(g.summary&&g.response);}assert.notEqual(writingGuidance('grade7','foundation').response,writingGuidance('gmat','foundation').response);assert.notEqual(writingGuidance('general','foundation').summary,writingGuidance('general','stretch').summary);});
test('fresh check requires finished practice, clears answers, and cannot be reset as fresh',()=>{
 let d=newReadingDraft('general','developing');assert.throws(()=>startIndependent(d));assert.throws(()=>submitReading(d));
 d=submitReading({...d,summary:'My summary',response:'My own reason',answer:1});assert.throws(()=>submitReading(d));
 d=startIndependent(d);assert.equal(d.phase,'independent');assert.equal(d.summary,'');assert.equal(d.response,'');assert.equal(d.answer,null);assert.equal(d.seenIndependent,true);assert.equal(d.submitted,false);assert.throws(()=>startIndependent(d));
 d=submitReading({...d,summary:'New summary',response:'New reason',answer:2});assert.throws(()=>startIndependent(d));assert.deepEqual(restoreReadingDraft(JSON.stringify(d),'general','developing'),d);
});
test('draft recovery isolates goals and levels and rejects malformed state',()=>{
 const d={...newReadingDraft('grade7','foundation'),summary:'Unsubmitted draft'};
 assert.deepEqual(restoreReadingDraft(JSON.stringify(d),'grade7','foundation'),d);
 for(const bad of ['bad',JSON.stringify({...d,submitted:true}),JSON.stringify({...d,phase:'independent'}),JSON.stringify({...d,answer:6}),JSON.stringify({...d,summary:'x'.repeat(6001)})])assert.deepEqual(restoreReadingDraft(bad,'grade7','foundation'),newReadingDraft('grade7','foundation'));
 assert.equal(restoreReadingDraft(JSON.stringify(d),'general','foundation').summary,'');assert.equal(restoreReadingDraft(JSON.stringify(d),'grade7','stretch').summary,'');
});
