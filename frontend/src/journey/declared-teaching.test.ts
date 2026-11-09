import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { synthesise, type Blueprint } from '../../../packages/learning/src/library';
import { moduleFor, question, type Strategy } from '../../../packages/learning/src/content';
import { problemOf, exposureKey } from '../../../packages/learning/src/families';
import { teachingScopeFor, strategyScopeProblems } from '../../../packages/learning/src/teaching-presentation';
import { lessonScreens, teachingEligibility } from '../../../packages/learning/src/teaching-contract';
import { contentHash, contentEligibility, addressedMisconception } from '../../../packages/learning/src/explanation-review';
import { IDENTITIES_CONFIG, connectedSkill } from '../../../packages/learning/src/skill-connections';
import { foundationPlan, FOUNDATION_POLICY, type FoundationPolicy } from '../../../packages/learning/src/foundation';
import { hypotheses, investigateContext, teachingMatchesMisconception, familyOf } from '../../../packages/learning/src/hypotheses';
import { probeReading, reason } from '../../../packages/learning/src/reasoning';
import { learnerState, make } from '../../../packages/learning/src/session';
import { withDecisions } from '../../../packages/learning/src/records';
import { projectFromEventsWith } from '../../../packages/learning/src/subskill-projection';
import { SliceSession } from './session';

const competency = 'MATH.algebra.identities';
const skill = 'identities.square-cross-term@1';
const at = Date.parse('2026-01-01T00:00:00Z');
const module = () => moduleFor(competency)!;
function candidate(id: string): Strategy {
  const strategy = module().strategies.find(s => s.id === id);
  assert.ok(strategy, `The generated identities module must serve ${id}`);
  return strategy;
}
const request = (misconceptionEvidence: boolean | readonly string[] = []) => ({ competency, mode: 'demonstration' as const, usage: 'intervention' as const, misconceptionEvidence });
const policy: FoundationPolicy = { version: FOUNDATION_POLICY, config: IDENTITIES_CONFIG, requirements: [{ skill, method: false }] };

test('runtime identity candidates are scoped, mechanically eligible and pending educator review', () => {
  const m = module();
  for (const id of ['ahid_concept', 'fix_middle_not_doubled', 'fix_middle_sign']) {
    const s = candidate(id);
    assert.equal(s.scope?.family, 'ahid');
    assert.equal(s.scope?.subSkill, skill);
    assert.deepEqual(strategyScopeProblems(m, s), []);
    assert.equal(teachingEligibility(m, s).eligible, true, JSON.stringify(teachingEligibility(m, s)));
    assert.ok(lessonScreens(m).some(x => x.strategy?.id === id));
    const target = addressedMisconception(s);
    const review = contentEligibility(m, s, request(target ? [target] : []));
    assert.equal(review.eligible, true, JSON.stringify(review));
    assert.equal(review.status, 'pending_review');
    assert.equal(review.educatorApproved, false);
    assert.equal(contentEligibility(m, s, { ...request(target ? [target] : []), mode: 'supervised-evaluation' }).eligible, false);
  }
});

test('declared scope refuses outside pools, another competency, parameter and subskill mismatches', () => {
  const m = module(), original = candidate('ahid_concept');
  const variants: Strategy[] = [
    { ...structuredClone(original), scope: { family: 'aaadd' } },
    { ...structuredClone(original), scope: { ...original.scope!, subSkill: 'identities.square-constant@1' } },
    { ...structuredClone(original), scope: { ...original.scope!, parameters: [{ index: 3, values: [2] }] } },
    { ...structuredClone(original), check: 'gen:ahid:0,2,3,2' },
    { ...structuredClone(original), screens: original.screens.map(s => ({ ...structuredClone(s), instance: 'gen:ahid:0,2,3,2' })) },
  ];
  for (const s of variants) {
    assert.ok(strategyScopeProblems(m, s).length);
    assert.equal(teachingScopeFor(m, s).accepts(problemOf(original.guided)!), false);
    assert.equal(teachingEligibility(m, s).eligible, false);
  }
  const outside = { ...m, pool: { family: 'expand', version: 'test' }, pools: [{ family: 'expand', version: 'test' }] };
  assert.equal(teachingEligibility(outside, original).eligible, false);
});

test('malformed declared scopes fail closed in runtime and synthesis instead of falling back to legacy', () => {
  const m = module(), original = candidate('ahid_concept');
  const data = JSON.parse(readFileSync(new URL('../../../content/learning/blueprints.v1.json', import.meta.url), 'utf8')) as { version: string; blueprints: Blueprint[] };
  const source = data.blueprints.find(bp => bp.competency === competency)!;
  assert.ok(source);
  for (const malformed of [null, false, 'ahid', {}, { family: 42 }]) {
    const s = { ...structuredClone(original), scope: malformed as unknown as Strategy['scope'] };
    assert.ok(strategyScopeProblems(m, s).includes('invalid declared strategy scope'));
    assert.equal(teachingScopeFor(m, s).accepts(problemOf(original.guided)!), false);
    assert.equal(teachingEligibility(m, s).eligible, false);
    const bp = structuredClone(source);
    bp.strategies = [{ ...s }];
    assert.throws(() => synthesise(bp, data.version), /invalid declared scope/);
  }
});

test('declared independent check cannot repeat guided or displayed exposure in another answer format', () => {
  const m = module(), original = candidate('ahid_concept');
  const displayed = original.screens.find(s => s.instance)?.instance;
  assert.ok(displayed);
  for (const shown of [original.guided, displayed]) {
    for (const suffix of ['', ':mc']) {
      const s = { ...structuredClone(original), check: shown.replace(/:(mc|w)$/, '') + suffix };
      assert.equal(exposureKey(s.check), exposureKey(shown));
      assert.ok(strategyScopeProblems(m, s).includes('declared check repeats a taught exposure'));
      assert.equal(teachingEligibility(m, s).eligible, false);
      assert.equal(teachingScopeFor(m, s).accepts(problemOf(original.guided)!), false);
    }
  }
  assert.equal(teachingEligibility(m, original).eligible, true);
});

test('declared target requires exact established ID; unknown, unrelated and boolean evidence fail closed', () => {
  const m = module(), s = candidate('fix_middle_not_doubled');
  assert.equal(addressedMisconception(s), 'middle-not-doubled');
  for (const evidence of [true, false, [], ['middle-sign'], ['unknown']] as const) {
    const gate = contentEligibility(m, s, request(evidence));
    assert.equal(gate.eligible, false);
    assert.ok(gate.failed.includes('misconception-evidence'), JSON.stringify(gate));
  }
  assert.equal(contentEligibility(m, s, request(['middle-not-doubled'])).eligible, true);
  const unknown = { ...structuredClone(s), addresses: 'not-a-real-diagnosis' };
  assert.equal(addressedMisconception(unknown), null);
  assert.equal(contentEligibility(m, unknown, request(['not-a-real-diagnosis'])).eligible, false);
});

test('scope and misconception-target edits invalidate the registered revision', () => {
  const m = module(), s = candidate('fix_middle_not_doubled'), hash = contentHash(competency, s);
  const changedScope = { ...structuredClone(s), scope: { ...s.scope!, parameters: [{ index: 0, values: [0] }, { index: 3, values: [1] }] } };
  const changedTarget = { ...structuredClone(s), addresses: 'middle-sign' };
  // Use a structurally different scope even when its semantic extension is equivalent.
  if (contentHash(competency, changedScope) === hash) changedScope.scope.parameters.reverse();
  for (const changed of [changedScope, changedTarget]) {
    assert.notEqual(contentHash(competency, changed), hash);
    const review = contentEligibility(m, changed, request(['middle-not-doubled', 'middle-sign']));
    assert.equal(review.eligible, false);
    assert.ok(review.failed.includes('revision'), JSON.stringify(review));
  }
});

test('teaching checks remain correct with colliding titles and mutation under the same strategy ID', () => {
  const m = module(), s = structuredClone(candidate('ahid_concept'));
  const collision = { ...m, chapter: [{ ...structuredClone(m.chapter[0]), title: s.screens[0].title }] };
  assert.equal(teachingEligibility(collision, s).eligible, true);
  const original = s.check;
  s.check = 'gen:ahid:0,2,3,2';
  assert.equal(teachingEligibility(collision, s).eligible, false, 'old eligible cache must not survive a scope mismatch');
  s.check = original;
  assert.equal(teachingEligibility(collision, s).eligible, true);
});

for (const [target, strategyId] of [['middle-not-doubled', 'fix_middle_not_doubled'], ['middle-sign', 'fix_middle_sign']] as const) {
  test(`actual pathway diagnoses ${target}, teaches its declared candidate and replays a fresh resolution`, () => {
    const s = new SliceSession(`declared-${target}`, competency, at);
    s.events.push(make.pathway({ learnerId: s.learnerId, sessionId: s.session, at: new Date(at - 1000).toISOString() }, competency));
    const original = 'gen:ahid:0,2,3,1', follow = 'gen:ahid:1,3,4,1';
    for (const [i, id] of [original, follow].entries()) {
      const prediction = probeReading(id, target).predicted[0];
      assert.ok(prediction);
      s.submit(id, prediction, i ? 'diagnostic' : 'check', i ? { context: investigateContext(original) } : {});
    }
    const before = hypotheses(s.state().selectionRecords).find(h => h.claim?.explanation === target);
    assert.equal(before?.status, 'established');
    let next = s.state().module(competency);
    assert.equal(next.phase, 'chapter', JSON.stringify(next));
    assert.equal(next.strategy?.id, strategyId);
    assert.equal(next.contentReview?.educatorApproved, false);
    s.taught(next);
    next = s.state().module(competency);
    assert.equal(next.phase, 'check', JSON.stringify(next));
    assert.ok(next.question);
    assert.equal(connectedSkill(IDENTITIES_CONFIG, next.question), skill);
    const displayed = new Set([candidate(strategyId).guided, ...candidate(strategyId).screens.map(x => x.instance), original, follow].filter((id): id is string => !!id).map(exposureKey));
    assert.equal(displayed.has(exposureKey(next.question)), false);
    assert.equal(probeReading(next.question, target).discriminates, true);
    const saved = JSON.parse(JSON.stringify(withDecisions(s.events, s.decisions)));
    assert.deepEqual(learnerState(s.learnerId, saved, s.now, { currentSession: s.session }).module(competency), next);
    s.submit(next.question, question(next.question).answer, 'check');
    const resolved = hypotheses(s.state().selectionRecords).find(h => h.claim?.explanation === target);
    assert.equal(resolved?.status, 'resolved');
    const replay = learnerState(s.learnerId, JSON.parse(JSON.stringify(withDecisions(s.events, s.decisions))), s.now, { currentSession: s.session });
    assert.deepEqual(hypotheses(replay.selectionRecords), hypotheses(s.state().selectionRecords));
  });
}

test('declared square lesson keeps assisted practice separate from same-skill delayed evidence', () => {
  const s = new SliceSession('declared-retention', competency, at), strategy = candidate('ahid_concept');
  s.events.push(make.pathway({ learnerId: s.learnerId, sessionId: s.session, at: new Date(at - 1000).toISOString() }, competency));
  s.events.push(make.teach({ learnerId: s.learnerId, sessionId: s.session, at: new Date(++s.now).toISOString() }, competency, strategy.id, 'foundation-lesson-review@1'));
  let next = s.state().module(competency);
  assert.equal(next.phase, 'guided');assert.equal(next.question, strategy.guided);
  s.submit(next.question!, question(next.question!).answer, 'guided');
  next = s.state().module(competency);
  assert.equal(next.phase, 'check');assert.ok(next.question);
  assert.equal(connectedSkill(IDENTITIES_CONFIG, next.question), skill);
  s.submit(next.question, question(next.question).answer, 'check');
  assert.equal(s.state().records.attempts.at(-1)?.solution, false, "solution-scope@1: check answer is independent");
  const saved = () => withDecisions(s.events, s.decisions);
  assert.equal(projectFromEventsWith(IDENTITIES_CONFIG, s.learnerId, saved(), s.now).subSkills.find(x => x.id === skill)?.attempts.independentRight, 1, "solution-scope@1: correct independent check counts");
  s.wait(1);
  let plan = foundationPlan(policy, s.learnerId, saved(), s.now);
  for (let i = 0; i < 6 && plan.status !== 'shown'; i++) {
    assert.ok(plan.question, JSON.stringify(plan));
    assert.equal(connectedSkill(IDENTITIES_CONFIG, plan.question), skill);
    s.submit(plan.question, question(plan.question).answer, 'check');
    plan = foundationPlan(policy, s.learnerId, saved(), s.now);
  }
  assert.equal(plan.status, 'shown', 'only the configured coefficient task has evidence, not the whole identities curriculum');
  s.wait(8);
  plan = foundationPlan(policy, s.learnerId, saved(), s.now);
  assert.equal(plan.status, 'retention');assert.ok(plan.question);
  assert.equal(connectedSkill(IDENTITIES_CONFIG, plan.question), skill);
  assert.deepEqual(foundationPlan(policy, s.learnerId, JSON.parse(JSON.stringify(saved())), s.now), plan);
  s.submit(plan.question, '-999', 'retention');
  plan = foundationPlan(policy, s.learnerId, saved(), s.now);
  assert.equal(plan.status, 'recovery');assert.equal(plan.skill, skill);
});


test('legacy authored questions retain their supported family teaching match', () => {
  const original = 'eq-d2', canonical = familyOf(original)!;
  assert.equal(canonical, 'gen:eqfrac:1,3,6');
  const m = moduleFor(question(original).competency)!;
  const strategy: Strategy = { id: 'legacy-match-fixture', title: 'Equivalent fractions', kind: 'conceptual', needs: [], screens: [{ title: 'Scale both parts', text: ['Scale numerator and denominator by the same factor.'] }], guided: canonical, check: canonical };
  assert.equal(teachingMatchesMisconception(strategy, canonical, 'additive-scaling', m.competency, m.competency), true);
  assert.equal(teachingMatchesMisconception(strategy, original, 'additive-scaling', m.competency, m.competency), true);
});


test('saved area/perimeter hypotheses cannot be settled by the same bug ID on another task', () => {
  const original = 'gen:aeperar:0,3,5,0', follow = 'gen:aeperar:0,4,7,0', target = 'two-sides';
  const c = question(original).competency, s = new SliceSession('area-task-scope', c, at);
  const observations = [original, follow].map(questionId => ({ questionId, response: probeReading(questionId, target).predicted[0] }));
  for (const [i, observation] of observations.entries()) s.submit(observation.questionId, observation.response, i ? 'diagnostic' : 'check', i ? { context: investigateContext(original) } : {});
  const contrast = reason(original, observations)!.next!;
  assert.ok(contrast);assert.equal(problemOf(contrast)!.params[0], 1);
  s.submit(contrast, question(contrast).answer, 'diagnostic', { context: investigateContext(original) });
  s.events.push(make.pathway({ learnerId: s.learnerId, sessionId: s.session, at: new Date(++s.now).toISOString() }, c));
  const current = () => hypotheses(s.state().selectionRecords).find(h => h.claim?.explanation === target)!;
  assert.equal(current().status, 'established');
  const otherTasks = ['gen:aeperar:1,6,9,0', 'gen:aeperar:1,7,11,0', 'gen:aeperar:0,6,9,1', 'gen:aeperar:0,7,11,1'];
  for (const id of otherTasks) {
    assert.equal(probeReading(id, target).discriminates, true, 'the bug ID alone would otherwise admit this answer');
    s.submit(id, question(id).answer, 'check');
  }
  assert.equal(current().status, 'established');
  assert.ok(current().probes.every(p => !otherTasks.includes(p.question)));
  const saved = JSON.parse(JSON.stringify(withDecisions(s.events, s.decisions)));
  assert.deepEqual(hypotheses(learnerState(s.learnerId, saved, s.now, { currentSession: s.session }).selectionRecords), hypotheses(s.state().selectionRecords));
  // Genuine fresh evidence on the original task can still contest the claim.
  for (const id of ['gen:aeperar:0,6,9,0', 'gen:aeperar:0,7,11,0']) s.submit(id, question(id).answer, 'check');
  assert.equal(current().status, 'contested');
});
