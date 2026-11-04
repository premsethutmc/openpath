import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StudyClock,STUDY_IDLE_MS} from '../../../packages/learning/src/study-session';
import {Driver} from '../learning/driver';
import {make} from '../../../packages/learning/src/session';
import {boardFor} from '../../../packages/learning/src/curricula';
import {studyAdvice} from './study-summary';

test('visible active, solving subset, idle and hidden time partition without wall-clock catch-up',()=>{
 const c=new StudyClock(0);c.advance(10_000);c.mode(10_000,true);c.advance(30_000);c.advance(90_000);
 assert.deepEqual(c.snapshot(),{activeMs:60_000,solvingMs:50_000,idleMs:30_000});
 c.visibility(90_000,false);c.advance(3_690_000);assert.deepEqual(c.snapshot(),{activeMs:60_000,solvingMs:50_000,idleMs:30_000});
 c.visibility(3_690_000,true);c.advance(3_700_000);assert.deepEqual(c.snapshot(),{activeMs:70_000,solvingMs:60_000,idleMs:30_000});
 const resumed=new StudyClock(5,c.snapshot());resumed.advance(1005);assert.deepEqual(resumed.snapshot(),{activeMs:71_000,solvingMs:60_000,idleMs:30_000});
});
for(const minutes of [15,30,60] as const)test(`${minutes}-minute budget expires on active learning, not idle or background`,()=>{
 const c=new StudyClock(0);let now=0;c.mode(now,true);
 for(let i=0;i<minutes*2;i++){c.touch(now);now+=30_000;c.advance(now);}
 assert.equal(c.snapshot().activeMs,minutes*60_000);assert.equal(c.snapshot().solvingMs,c.snapshot().activeMs);
 c.advance(now+STUDY_IDLE_MS*2);assert.equal(c.snapshot().idleMs,90_000);
 const paused=c.snapshot();c.visibility(now+STUDY_IDLE_MS*2,false);c.advance(now+86_400_000);assert.deepEqual(c.snapshot(),paused);
});
test('submillisecond samples retain cumulative integer invariants across mode switches (reproducible)',()=>{
 const c=new StudyClock(0);let t=0,seed=42,last=c.snapshot();
 for(let i=0;i<1000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;t+=(seed%1000)/10;c.mode(t,!!(seed%2));if(seed%7===0)c.touch(t);const next=c.snapshot();assert.ok(next.solvingMs-last.solvingMs<=next.activeMs-last.activeMs);assert.ok(next.idleMs>=last.idleMs);last=next;}
});
test('session metadata does not alter ability; summary recommendations reuse the canonical planner',()=>{
 const d=new Driver('synthetic-time',Date.parse('2026-10-21T12:00:00Z')),release=boardFor('cbse',7)!;d.enrol(7,'2026-27',release);
 const before=d.state().evidence('MATH.algebra.variables');
 d.events.push(make.study(d.ctx(),{planId:'synthetic-plan',revision:0,phase:'start',time:{activeMs:0,solvingMs:0,idleMs:0}}));
 d.events.push(make.study(d.ctx(),{planId:'synthetic-plan',revision:1,phase:'active',time:{activeMs:900000,solvingMs:700000,idleMs:100000}}));
 assert.deepEqual(d.state().evidence('MATH.algebra.variables'),before);
 const st=d.state();const advice=studyAdvice('synthetic-plan',release,{records:st.records,evidence:st.evidence,now:d.now,session:d.session,saving:false,answer:async()=>true,teach:async()=>true});
 assert.deepEqual(advice.gaps,[]);assert.deepEqual(advice.morePractice,[]);assert.equal(advice.next.competency,st.next?.competency);
 assert.equal(make.study(d.ctx(),{planId:'synthetic-plan',revision:2,phase:'ended',time:{activeMs:1,solvingMs:0,idleMs:0},advice}).id,make.study(d.ctx(),{planId:'synthetic-plan',revision:3,phase:'ended',time:{activeMs:2,solvingMs:0,idleMs:0},advice}).id,'one deterministic completion identity');
});

test('an existing established prerequisite finding survives a successful helped retry',async()=>{
 const {investigateContext,recovery}=await import('../../../packages/learning/src/intervention');
 const d=new Driver('synthetic-established-gap',Date.parse('2026-10-21T12:00:00Z')),release=boardFor('cbse',7)!;d.enrol(7,'2026-27',release);
 // Reuse the shared engine's existing fact-slip investigation fixture; not a new learner-facing lesson.
 d.answer('ai-original','54','original',{context:'study:p'});
 let st=d.state(),ctx={records:st.records,evidence:st.evidence,now:d.now,session:d.session,saving:false,answer:async()=>true,teach:async()=>true};
 assert.deepEqual(studyAdvice('p',release,ctx).gaps,[],'one wrong answer is insufficient');
 const {question}=await import('../../../packages/learning/src/content');
 for(let i=0;i<6;i++){const state=d.state(),r=recovery('ai-original',state.records,state.evidence,d.now,d.session);if(r.phase!=='investigate'||!r.question)break;d.answer(r.question,r.question==='gen:mul:7,8'?'54':question(r.question).answer,'diagnostic',{context:investigateContext('ai-original')});}
 d.answer('ai-original','56','original',{context:'study:p',hints:1});
 st=d.state();ctx={...ctx,records:st.records,evidence:st.evidence,now:d.now};
 assert.ok(studyAdvice('p',release,ctx).gaps.some(g=>g.competency==='MATH.number.multiplication-tables'));
});

test('the plan retains established diagnostic prerequisite findings without counting diagnostic answers twice',async()=>{
 const {topicCheck}=await import('./topic-session');const {plannedFindings}=await import('./study-summary');
 const {question}=await import('../../../packages/learning/src/content');const {problemOf,show}=await import('../../../packages/learning/src/families');
 const d=new Driver('synthetic-plan-findings',Date.parse('2026-10-21T12:00:00Z')),release=boardFor('cbse',7)!,target='MATH.algebra.variables';d.enrol(7,'2026-27',release);
 const ctx=()=>{const st=d.state();return {records:st.records,evidence:st.evidence,now:d.now,session:d.session,saving:false,answer:async()=>true,teach:async()=>true};};
 for(let i=0;i<15;i++){const check=topicCheck(target,ctx());if(!check.question)break;const q=question(check.question),bug=problemOf(check.question)?.bugs.find(b=>b.id==='add-for-multiply');const answer=bug&&bug.predict!==null?show(Array.isArray(bug.predict)?bug.predict[0]:bug.predict):q.answer;d.answer(check.question,answer,check.context?'probe':'diagnostic',check.context?{context:check.context}:{});}
 const plan=make.sessionPlan(d.ctx(),target,30,release,'2026-27');assert.equal(plan.record,'topic_session');if(plan.record!=='topic_session')return;d.events.push(plan);
 const before=plannedFindings(d.learnerId,plan,d.events,ctx());assert.ok(before.some(g=>g.competency==='MATH.number.multiplication-tables'));
 const source=before[0].sourceQuestion;d.answer(source,question(source).answer,'guided',{hints:1,context:`study:${plan.id}`});
 assert.deepEqual(plannedFindings(d.learnerId,plan,d.events,ctx()),before,'later correction cannot erase an earlier finding');
 assert.deepEqual(studyAdvice(plan.id,release,ctx(),before).gaps,before);
});
