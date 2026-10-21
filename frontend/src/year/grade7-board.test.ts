import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Driver,right} from '../learning/driver';
import {boardFor} from '../../../packages/learning/src/curricula';
import {questions} from '../../../packages/learning/src/content';
import {useReviewFixture} from '../../../packages/learning/src/evidence';

test('changing Grade 7 board preserves verified competency evidence, history and academic year',()=>{
 // Synthetic review fixture only: no content approvals or stored learner records are changed.
 useReviewFixture({items:questions.map(q=>q.id),releasedAt:'2020-01-01T00:00:00Z',all:true});
 try {
 const d=new Driver('synthetic-grade7-board',Date.parse('2026-10-21T10:00:00Z'));
 const skill='MATH.number.equivalent-fractions';
 d.enrol(7,'2026-27',boardFor('cbse',7)!);d.work(skill,right);d.newSession(8);d.work(skill,right);
 assert.equal(d.state().evidence(skill).status,'verified');
 const before=structuredClone(d.events);const evidence=d.state().evidence(skill);
 d.enrol(7,'2026-27',boardFor('tn',7)!);
 assert.deepEqual(d.events.slice(0,before.length),before);
 assert.equal(d.state().evidence(skill).status,'verified');
 assert.deepEqual(d.state().evidence(skill).independent,evidence.independent);
 assert.equal(d.state().enrolment?.academicYear,'2026-27');
 assert.equal(d.state().release?.id,boardFor('tn',7)!.id);
 } finally {useReviewFixture(null);}
});
