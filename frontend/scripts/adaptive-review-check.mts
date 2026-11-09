/** Read-only focused release checks and review manifest; never changes a registry. Run from frontend with node --import tsx. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { moduleFor, question } from '../../packages/learning/src/content';
import { FAMILIES, phasePool, type Phase } from '../../packages/learning/src/families';
import { familyReviewOf } from '../../packages/learning/src/review';
import { validateFamily } from '../../packages/learning/src/spec';
import { currentRevision, contentEligibility } from '../../packages/learning/src/explanation-review';
const out = new URL('../../docs/adaptive-evaluation-review/', import.meta.url);
const gcd = (a: bigint, b: bigint): bigint => b ? gcd(b, a % b) : a < 0n ? -a : a;
const rational = (n: bigint, d = 1n) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
const parse = (s: string) => { const [n, d = '1'] = s.replace(/\s/g, '').replace(/⁄/g, '/').split('/'); return rational(BigInt(n), BigInt(d)); };
const checks = ['subst', 'pint', 'pow'].map(id => {
  const def = FAMILIES.get(id)!;
  const validation = validateFamily(id); assert.equal(validation.ok, true);
  const review = familyReviewOf(id); assert.equal(review.stale, false);
  const phases: Phase[] = ['diagnostic', 'practice', 'check', 'retention'];
  const ids = [...new Set(phases.flatMap(p => phasePool(id, p)))];
  let choices = 0;
  for (const qid of ids) {
    const p = qid.split(':')[2].split(',').map(BigInt);
    let expected: string;
    if (id === 'pow') expected = rational(p[0] ** p[1]);
    else { const [a,b,k,n] = p, power = n + 1n;
      expected = id === 'pint' ? rational(k * (b ** power - a ** power), power) : rational((b*b+k) ** power - (a*a+k) ** power, power);
    }
    const q = question(qid);
    let answer = q.answer;
    if (q.type === 'choice') { choices++; answer = q.options!['ABCD'.indexOf(answer)]; }
    assert.equal(parse(answer), expected, qid);
    assert.equal(parse(question(qid.replace(/:mc$/, '')).answer), expected, `${qid} direct`);
  }
  return { id, title: def.title, competency: def.competency, domain: def.domain, review, validation, independent: { method: 'BigInt closed-form arithmetic independent of the family solver; direct and choice-answer agreement', servedItems: ids.length, choiceItems: choices, failures: 0 }, phases: Object.fromEntries(phases.map(p => [p, phasePool(id,p).length])) };
});
writeFileSync(new URL('FAMILY-CHECKS.json', out), JSON.stringify(checks,null,2)+'\n');
const competencies = ['MATH.calculus.integration-methods','MATH.calculus.indefinite-integrals','MATH.number.exponents'];
const explanations = competencies.flatMap(c => { const m = moduleFor(c)!; return m.strategies.map(s => {
  const current = currentRevision(m,s)!;
  const eligibility = contentEligibility(m,s,{competency:c, mode:'supervised-evaluation',usage:'lesson'});
  assert.equal(current.revision.status,'pending_review');
  assert.equal(eligibility.eligible,false);
  assert.deepEqual(eligibility.failed,['approved-for-usage']);
  const ids = [...new Set([...m.diagnostics,...s.screens.map(x=>x.instance).filter((x): x is string=>!!x),s.guided,s.check].filter(Boolean))];
  return { id:current.record.id, hash:current.revision.contentHash, status:current.revision.status, scope:current.revision.scope, requiredDecision:'Educator: approve exact revision for supervised evaluation, request revision, demonstration only, or block; do not infer approval from machine checks.', eligibility, questions:ids.map(id=>({id,...question(id)})), decision:null, reviewer:null, reviewedAt:null, note:null };
}); });
assert.equal(explanations.length,9);
writeFileSync(new URL('REVIEW-MANIFEST.json',out),JSON.stringify(explanations,null,2)+'\n');
writeFileSync(new URL('CHOICE-QUESTIONS.md',out),'# Choice questions accompanying the explanations\n\nExact options and answer letters; nothing is approved.\n\n'+[...new Map(explanations.flatMap(e=>e.questions).filter(q=>q.type==='choice').map(q=>[q.id,q])).values()].map(q=>`## ${q.id}\n\n${q.prompt}\n\n${q.options!.map((o,i)=>`${'ABCD'[i]}. ${o}`).join('\n')}\n\nRecorded answer: **${q.answer}**.\n`).join('\n'));
console.log(JSON.stringify({families:checks.map(c=>({id:c.id,validation:c.validation.ok,...c.independent})),explanations:explanations.length,approvalChanges:0}));
