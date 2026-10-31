import {test} from 'node:test';import assert from 'node:assert/strict';
import {Driver} from '../learning/driver';import {boardFor} from '../../../packages/learning/src/curricula';import {moduleFor,question} from '../../../packages/learning/src/content';import {problemOf,show} from '../../../packages/learning/src/families';import {topicCheck,topicPlan} from './topic-session';import {make,learnerState} from '../../../packages/learning/src/session';
for(const board of ['cbse','tn'] as const)test(`${board}: diagnostics and prerequisite recovery come from existing engines; budgets do not change evidence`,()=>{
 const d=new Driver(`synthetic-${board}-topic`,Date.parse('2026-10-21T12:00:00Z'));const release=boardFor(board,7)!;d.enrol(7,'2026-27',release);
 const target='MATH.algebra.variables';let seen=0,support:string|null=null;
 const ctx=()=>({records:d.state().records,evidence:d.state().evidence,now:d.now,session:d.session,saving:false,answer:async()=>true,teach:async()=>true});
 for(let i=0;i<15;i++){const c=topicCheck(target,ctx());support=c.support??support;if(!c.question)break;const p=problemOf(c.question);const bug=p?.bugs.find(b=>b.id==='add-for-multiply');const response=bug&&bug.predict!==null?show(Array.isArray(bug.predict)?bug.predict[0]:bug.predict):question(c.question).answer;d.answer(c.question,response,c.context?'probe':'diagnostic',c.context?{context:c.context}:{});seen++;}
 assert.ok(seen>=3);assert.equal(topicCheck(target,ctx()).question,null);assert.equal(support,'MATH.number.multiplication-tables');assert.ok(moduleFor(support!));assert.equal(d.events.filter(e=>e.record==='teach').length,0);
 const before=d.state().evidence(target);const copy=structuredClone(d.events);
 for(const minutes of [15,30,60] as const){const plan=topicPlan(target,release,ctx(),minutes);assert.ok(plan.estimatedMinutes<=minutes);assert.ok(plan.items.length);const meta=make.sessionPlan(d.ctx(),target,minutes,release,'2026-27');d.events.push(meta);assert.equal(d.state().evidence(target).status,before.status);assert.equal(meta.record,'topic_session');}
 assert.deepEqual(d.events.slice(0,copy.length),copy);assert.notEqual(d.state().evidence(target).status,'verified');
 const resumed=learnerState(d.learnerId,d.events,d.now);assert.equal(resumed.enrolment?.curriculum.id,release.id);assert.equal(resumed.enrolment?.academicYear,'2026-27');
});

test('saved session metadata and verified starting points cannot create or erase mastery',async()=>{
 const {useReviewFixture}=await import('../../../packages/learning/src/evidence');
 const {questions}=await import('../../../packages/learning/src/content');
 const {right}=await import('../learning/driver');
 useReviewFixture({items:questions.map(q=>q.id),all:true,releasedAt:'2020-01-01T00:00:00Z'});
 try{
 const d=new Driver('synthetic-verified-session',Date.parse('2026-10-21T12:00:00Z')),release=boardFor('cbse',7)!,target='MATH.number.equivalent-fractions';
 d.enrol(7,'2026-27',release);d.work(target,right);d.newSession(8);d.work(target,right);
 assert.equal(d.state().evidence(target).status,'verified');const before=structuredClone(d.events),e=d.state().evidence(target);
 d.events.push(make.topicStart(d.ctx(),target,release,'2026-27'));d.events.push(make.sessionPlan(d.ctx(),target,60,release,'2026-27'));
 const st=d.state(),ctx={records:st.records,evidence:st.evidence,now:d.now,session:d.session,saving:false,answer:async()=>true,teach:async()=>true};
 assert.equal(topicCheck(target,ctx).question,null);assert.deepEqual(st.evidence(target).independent,e.independent);assert.equal(st.evidence(target).status,'verified');assert.deepEqual(d.events.slice(0,before.length),before);
 }finally{useReviewFixture(null);}
});
