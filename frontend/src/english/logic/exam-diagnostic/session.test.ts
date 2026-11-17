import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSession,answer,submitWriting,revise,validSession,report,QUESTIONS,PASSAGE,CHECKS,LESSONS} from './session.ts';
const writing=Array(60).fill('example').join(' ');
function finished(wrong=false){let s=initialSession();for(const q of QUESTIONS)s=answer(s,q.id,wrong?(q.answer+1)%q.options.length:q.answer);return submitWriting(s,writing);}
test('reading and original writing survive round trip; report is bounded, revision does not regrade',()=>{
 const s=finished();assert.ok(validSession(JSON.parse(JSON.stringify(s))));assert.equal(report(s).filter(r=>r.status==='supported').length,4);
 const changed=revise(s,'A shorter revised explanation.');assert.equal(changed.writing,writing);assert.deepEqual(report(s),report(changed));
 assert.equal('score' in changed,false);assert.equal('mastery' in changed,false);
});
test('incorrect responses give possible gaps, not confirmed weakness; no finding before report',()=>{
 assert.deepEqual(report(initialSession()),[]);const s=finished(true);assert.equal(report(s).filter(r=>r.status==='possible_gap').length,4);
 for(const q of QUESTIONS){assert.ok(PASSAGE.includes(q.quote));assert.ok(LESSONS[q.skill]);assert.ok(CHECKS.some(c=>c.skill===q.skill));}
 for(const q of CHECKS){assert.ok(q.passage.includes(q.quote));assert.ok(q.answer>=0&&q.answer<q.options.length);}
});
test('stale, invalid and malicious states cannot advance; skipped writing handled',()=>{
 let s=initialSession();s=answer(s,QUESTIONS[0].id,0);assert.throws(()=>answer(s,QUESTIONS[0].id,1));assert.throws(()=>answer(s,'missing',0));assert.throws(()=>answer(s,QUESTIONS[1].id,Infinity));
 assert.equal(validSession({...s,phase:'report'}),false);assert.equal(validSession({...finished(),mastery:true}),false);
 assert.equal(validSession({...finished(),answers:{main:0}}),false);assert.equal(validSession({...finished(),writing:'short'}),false);
 for(const q of QUESTIONS.slice(1))s=answer(s,q.id,0);
 assert.throws(()=>submitWriting(s,'too short'));assert.throws(()=>submitWriting(s,Array(251).fill('word').join(' ')));
 const skipped=submitWriting(s,'');assert.ok(validSession(skipped));assert.throws(()=>revise(skipped,'not available'));
 assert.throws(()=>answer(finished(),'main',0));assert.throws(()=>submitWriting(finished(),writing));
});
