import test from 'node:test';import assert from 'node:assert/strict';
import {ExamJourney,EXAMPLE_WRITING,SIMULATED_INFO,simulatedPost} from './journey.ts';
import {QUESTIONS} from './session.ts';
import {REASSESSMENT} from './reassessment.ts';
import {WRITING_CHECKS,JOURNEY_WRITING_CHECKS} from './verification.ts';
const key=(id:string)=>[...JOURNEY_WRITING_CHECKS,...REASSESSMENT].find(q=>q.id===id)!.answer;
function ready(flow=new ExamJourney()){for(const q of QUESTIONS)flow.reading(q.id,q.answer);return flow;}
test('reading and writing -> validated contextual/grammar hypotheses -> checks -> teaching -> fresh retest',async()=>{
 const f=ready();await f.analyse(EXAMPLE_WRITING,true);assert.equal(f.snapshot().checks.length,8);
 assert.ok(f.snapshot().observations.some(o=>o.skill==='source_fidelity'));
 f.startReassessment();assert.equal(f.snapshot().phase,'checks');
 for(const q of f.snapshot().checks)f.answer(q.id,1-key(q.id));f.finishChecks();assert.equal(f.snapshot().phase,'teaching');
 f.startReassessment();assert.equal(f.snapshot().phase,'teaching');
 for(const s of f.snapshot().lessons){assert.ok(f.lesson(s));f.markTaught(s);}f.startReassessment();assert.equal(f.snapshot().phase,'reassessment');
 assert.ok(f.snapshot().fresh.every(q=>!('answer' in q)&&!('explanation' in q)));
 const ids=f.snapshot().checks.map(q=>q.id);assert.ok(f.snapshot().fresh.every(q=>!ids.includes(q.id)));
 f.finish();assert.equal(f.snapshot().phase,'reassessment');for(const q of f.snapshot().fresh)f.answer(q.id,key(q.id));f.finish();
 assert.equal(f.snapshot().phase,'complete');assert.ok(f.summary().every(r=>r.correct===0&&r.after===2));
 assert.ok(f.summary().every(r=>/not retention/.test(r.interpretation)));
});
test('consent and fixed fixture boundary prevent dispatch; no fabricated pattern fallback',async()=>{
 let calls=0;const f=ready(new ExamJourney(SIMULATED_INFO,async b=>{calls++;return simulatedPost(b);}));
 await assert.rejects(f.analyse(EXAMPLE_WRITING,false));await assert.rejects(f.analyse('another sample',true));assert.equal(calls,0);
});
test('correct independent checks weaken hypotheses and do not manufacture teaching',async()=>{
 const f=ready();await f.analyse(EXAMPLE_WRITING,true);for(const q of f.snapshot().checks)f.answer(q.id,key(q.id));f.finishChecks();
 assert.equal(f.snapshot().phase,'complete');assert.deepEqual(f.snapshot().lessons,[]);assert.ok(f.summary().every(r=>r.after===null&&r.outcome==='no_gap_shown'));
});
test('partial mixed checks are inconclusive, repeated answer cannot alter outcome',async()=>{
 const f=ready();await f.analyse(EXAMPLE_WRITING,true);const checks=f.snapshot().checks;
 f.answer(checks[0].id,1-key(checks[0].id));f.answer(checks[0].id,key(checks[0].id));f.finishChecks();assert.equal(f.snapshot().phase,'checks');
 for(const q of checks.slice(1))f.answer(q.id,key(q.id));f.finishChecks();assert.equal(f.snapshot().results[0].outcome,'inconclusive');
});
test('exposure survives new controller; revealed checks or retests are never reused as fresh',async()=>{
 const f=ready();await f.analyse(EXAMPLE_WRITING,true);const g=ready(new ExamJourney(undefined,undefined,f.snapshot().seen));await g.analyse(EXAMPLE_WRITING,true);assert.equal(g.snapshot().checks.length,0);
 const h=ready(new ExamJourney(undefined,undefined,REASSESSMENT.map(q=>q.id)));await h.analyse(EXAMPLE_WRITING,true);
 for(const q of h.snapshot().checks)h.answer(q.id,1-key(q.id));h.finishChecks();for(const s of h.snapshot().lessons)h.markTaught(s);h.startReassessment();assert.equal(h.snapshot().phase,'complete');assert.ok(h.summary().every(r=>r.after===null));
});
test('late result and repeated clicks cannot revive cancelled analysis or double-send',async()=>{
 let resolve!:(x:unknown)=>void,calls=0,body:Parameters<typeof simulatedPost>[0];
 const f=ready(new ExamJourney(SIMULATED_INFO,b=>{calls++;body=b;return new Promise(r=>{resolve=r;});}));
 const p=f.analyse(EXAMPLE_WRITING,true);await f.analyse(EXAMPLE_WRITING,true);assert.equal(calls,1);f.cancel();resolve(await simulatedPost(body!));await p;assert.equal(f.snapshot().phase,'writing');assert.equal(f.snapshot().checks.length,0);
});
test('outage has no diagnostic inference; explicit retry succeeds',async()=>{
 let fail=true;const f=ready(new ExamJourney(SIMULATED_INFO,b=>fail?Promise.reject(Error('SECRET')):simulatedPost(b)));
 await f.analyse(EXAMPLE_WRITING,true);assert.equal(f.snapshot().phase,'error');assert.ok(!f.snapshot().error.includes('SECRET'));assert.equal(f.snapshot().observations.length,0);
 fail=false;await f.analyse(EXAMPLE_WRITING,true);assert.equal(f.snapshot().phase,'checks');
});
test('snapshot mutation and invalid submissions cannot change keys or teaching gates',async()=>{
 const f=ready();await f.analyse(EXAMPLE_WRITING,true);const s=f.snapshot();assert.equal('answer' in s.checks[0],false);assert.equal('explanation' in s.checks[0],false);s.checks[0].prompt='changed';s.seen.length=0;
 f.answer(s.checks[0].id,NaN);f.answer('unknown',0);assert.deepEqual(f.snapshot().answers,{});assert.equal(f.snapshot().seen.length,8);
});

test('legacy synthetic grammar exposure cannot be recycled as journey evidence',async()=>{
 const legacy=WRITING_CHECKS.filter(q=>q.skill==='articles'||q.skill==='subject_verb_agreement');
 const f=ready(new ExamJourney(undefined,undefined,legacy.map(q=>q.id)));await f.analyse(EXAMPLE_WRITING,true);
 assert.equal(f.snapshot().checks.length,8);
 const grammar=f.snapshot().checks.filter(q=>q.skill==='articles'||q.skill==='subject_verb_agreement');
 assert.equal(grammar.length,4);
 assert.ok(grammar.every(q=>legacy.every(old=>old.id!==q.id&&old.prompt!==q.prompt)));
 assert.deepEqual(grammar.map(q=>key(q.id)),[0,1,1,0]);
 for(const q of f.snapshot().checks)f.answer(q.id,1-key(q.id));f.finishChecks();
 assert.ok(f.summary().every(r=>r.correct===0));
});
