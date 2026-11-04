import test from 'node:test';
import assert from 'node:assert/strict';
import { learnerState, make } from '../../../packages/learning/src/session';
import { recovery } from '../../../packages/learning/src/intervention';
import { boardFor } from '../../../packages/learning/src/curricula';
import { useReviewFixture } from '../../../packages/learning/src/evidence';
import type { LearningActivity, LearningRecord } from '../../../packages/learning/src/records';

test('persistent wrong retry teaches its own skill without recursively reopening recovery', () => {
  useReviewFixture({ items: [], all: true, releasedAt: '2020-01-01T00:00:00Z' });
  try {
    const learner = 'recovery-context', session = 'learn:recovery-context:1';
    let now = Date.parse('2026-01-01T00:00:00Z');
    const ctx = () => ({ learnerId: learner, sessionId: session, at: new Date(++now).toISOString() });
    const events: LearningRecord[] = [make.enrol(ctx(), 12, '2026-27', boardFor('cbse', 12)!)];
    // Reduced counterfactual: prerequisites are answered correctly, but the
    // original substitution error persists on the retry. No teaching is forged.
    const responses: [string, string, LearningActivity, string?][] = [
      ['gen:subst:0,1,1,1', '1', 'diagnostic'],
      ['gen:pow:5,4', '625', 'check'], ['gen:pow:5,3', '125', 'practice'],
      ['gen:subst:2,3,2,3', '65/4', 'diagnostic'], ['gen:subst:1,2,1,2', '7/3', 'diagnostic'],
      ['gen:pint:2,4,7,1', '42', 'diagnostic'], ['gen:pint:1,4,11,1', '165/2', 'diagnostic'],
      ['gen:linev:8,2,7', '58', 'diagnostic'], ['gen:linev:6,6,3', '24', 'diagnostic'],
      ['gen:dpow:6,4,3', '648', 'diagnostic'], ['gen:dpow:9,5,3', '3645', 'diagnostic'],
      ['fa-d1', '5/8', 'diagnostic'], ['fa-d2', '3/10', 'diagnostic'],
      ['gen:afletter:3,2,7', '2m + 7', 'diagnostic'], ['gen:afletter:2,10,1', '10n', 'diagnostic'],
      ['mt-d1', '56', 'diagnostic'], ['mt-d2', '42', 'diagnostic'],
      ['gen:subst:2,3,2,3', '65/4', 'original', 'recovery:gen:subst:2,3,2,3'],
    ];
    for (const [qid, response, activity, context] of responses) events.push(make.attempt(ctx(), qid, response, activity, { context }));
    const snapshot = structuredClone(events);
    const state = learnerState(learner, events, now, { currentSession: session });
    const r = recovery('gen:subst:2,3,2,3', state.records, state.evidence, now, session);
    assert.equal(r.phase, 'teach');
    assert.equal(r.active, 'MATH.calculus.integration-methods');
    assert.equal(state.module(r.active!).phase, 'recover', 'default historical selection is unchanged');
    const owned = state.module(r.active!, true);
    assert.equal(owned.phase, 'strategy');
    assert.ok(owned.question);
    assert.equal(state.records.teaching.length, 0);
    assert.deepEqual(events, snapshot);
    assert.deepEqual(learnerState(learner, structuredClone(events), now, { currentSession: session }).module(r.active!, true), owned);
  } finally { useReviewFixture(null); }
});
