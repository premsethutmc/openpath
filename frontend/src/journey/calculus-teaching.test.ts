import { teachingEligibility } from '../../../packages/learning/src/teaching-contract';
import { contentEligibility } from '../../../packages/learning/src/explanation-review';
import test from 'node:test';
import assert from 'node:assert/strict';
import { question, moduleFor } from '../../../packages/learning/src/content';
import { problemOf, problemKeyOf } from '../../../packages/learning/src/families';

// Independent arithmetic for the authored examples, rather than the solver's validator.
test('first-principles examples: expansion, cancellation and derivative agree', () => {
  for (const [k, q, c] of [[1, -5, -4], [2, 4, -1]]) {
    for (const x of [-3, 0, 2, 7]) for (const h of [-2, -1, 1, 3]) {
      const f = (t: number) => k*t*t + q*t + c;
      assert.ok(f(x+h)-f(x) === h*(2*k*x+k*h+q));
      assert.ok((f(x+h)-f(x))/h === 2*k*x+k*h+q);
    }
    assert.equal(question(`gen:aqfp:0,${k},${q},${c}`).answer, k === 1 ? '2x − 5' : '4x + 4');
  }
});
test('substitution: transformed endpoints and independent polynomial integration', () => {
  // 2x(x²+1)² = 2x⁵+4x³+2x; integrate its terms from 0 to 1.
  assert.equal(2 + 6 + 6, 7 * 2); // common denominator 6, exact integer arithmetic
  assert.equal(((1*1+1)**3-(0*0+1)**3)/3, 7/3);
  assert.equal(question('gen:subst:0,1,1,2').answer, '7/3');
});
test('guided and independent checks are separate from displayed examples', () => {
  for (const cid of ['MATH.calculus.derivatives', 'MATH.calculus.integration-methods']) {
    const m = moduleFor(cid)!;
    for (const s of m.strategies) {
      assert.notEqual(problemKeyOf(s.guided), problemKeyOf(s.check));
      for (const sc of s.screens) if (sc.instance) {
        assert.ok(problemOf(sc.instance), sc.instance);
        assert.notEqual(problemKeyOf(sc.instance), problemKeyOf(s.check), `${s.id}: shown example is not fresh`);
        assert.notEqual(problemKeyOf(sc.instance), problemKeyOf(s.guided), `${s.id}: guided question was shown`);
      }
    }
  }
});

test('authored expansion replaces rejected automatic steps without moving the assessment draw', () => {
  const m = moduleFor('MATH.calculus.derivatives')!;
  const s = m.strategies.find(s => s.id === 'expand_cancel')!;
  assert.equal(s.guided, 'gen:aqfp:2,1,3,0');
  assert.equal(s.check, 'gen:aqfp:0,2,4,-4:mc');
  assert.equal(s.screens.length, 4);
  assert.ok(s.screens.every(sc => sc.instance === 'gen:aqfp:0,1,-5,-4'));
  assert.equal(teachingEligibility(m,s).eligible, true);
  assert.equal(contentEligibility(m,s,{competency:m.competency,usage:'lesson',mode:'supervised-evaluation'}).educatorApproved, false);
});
