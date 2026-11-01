import { afterAll, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { assessMathematicalWorking, type MathematicalProblem, type StudentWorking } from './unified-math-engine';
import { stopGeometryWorkers } from './geometry-worker';
import ledger from '../../../tools/mathematics/method-contract-v2/migration-ledger.v2.json';
import { fixture as historicalD2 } from '../../../tools/mathematics/reasoning-depth-d2/benchmark-fixtures';
import { methodFixture } from '../../../tools/mathematics/method-contract-v2/d2-method-fixtures';
import d2 from '../../../tools/mathematics/reasoning-depth-d2/frozen-external-benchmark.v1.json';

type Case = { id: string; problem: MathematicalProblem; working: StudentWorking; options: Record<string, unknown>; expected: {classification: string; firstInvalidStep: number | null} };
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')).cases as Case[];
const oldU1 = read('tools/mathematics/unified-u1/independent-cases.v1.json');
const oldU2 = read('tools/mathematics/unified-u2/independent-cases.v2.json');
const methods = read('tools/mathematics/method-contract-v2/u2.method.v2.json');
afterAll(stopGeometryWorkers);

test('historical corpora are unchanged and every case has an explicit migration record', () => {
  for (const [path, sha] of Object.entries(ledger.sources)) expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(sha);
  expect(ledger.cases.length).toBe(650);
  for (const [corpus, cases] of [['u1', oldU1], ['u2', oldU2], ['d2', d2.cases]] as const) {
    expect(ledger.cases.filter(c => c.corpus === corpus).map(c => c.id)).toEqual(cases.map(c => c.id));
  }
});

test('all 120 formerly accepted bare geometry conclusions remain non-method evidence', async () => {
  const bare = oldU2.filter(c => c.expected.classification === 'verified');
  expect(bare.length).toBe(120);
  for (const c of bare) {
    const a = await assessMathematicalWorking(c.problem, c.working, c.options);
    expect([c.id, a.classification, a.correct, a.complete, a.firstInvalidStep]).toEqual([c.id, 'unsupported', null, false, null]);
    expect(a.certification?.integrity.provenDerivations ?? 0).toBe(0);
  }
});

test('missing assumptions, unsupported citations and exhausted budgets never invent an invalid step', async () => {
  const cases = [...oldU1.filter(c => ['missing-assumption', 'contradictory', 'unsupported', 'resource-exhausted'].includes(c.expected.classification)), ...oldU2.filter(c => c.expected.classification === 'invalid' && c.expected.firstInvalidStep === 0)];
  expect(cases.length).toBeGreaterThan(30);
  for (const c of cases) {
    const a = await assessMathematicalWorking(c.problem, c.working, c.options);
    expect(a.classification).not.toBe('invalid'); expect(a.correct).toBeNull(); expect(a.firstInvalidStep).toBeNull();
  }
});

test('a new explicit method is verified, but a false step still fails despite the correct final calculation', async () => {
  const c = structuredClone(methods.find(c => c.id === 'u2-angle-00')!);
  expect((await assessMathematicalWorking(c.problem, c.working)).classification).toBe('verified');
  if (!('geometry' in c.working)) throw new Error('mixed fixture required');
  const step = c.working.geometry.steps[0];
  const statement = step.statement as {value: number}; statement.value += 1;
  const a = await assessMathematicalWorking(c.problem, c.working);
  expect(a.classification).toBe('invalid'); expect(a.correct).toBe(false); expect(a.firstInvalidStep).toBe(0);
});

test('D2 method stages are explicit; its historical fixture builder retains the uncited input', () => {
  const row = d2.cases.find(c => c.category === 'geometry' && c.selectedRoute === 'reference-long')!;
  const original = historicalD2(row), current = methodFixture(row);
  const geometry = (x: typeof original) => x.working.stages.filter(s => !Array.isArray(s.working) && 'geometry' in s.working);
  expect(geometry(original).length).toBeGreaterThan(0);
  for (const s of geometry(original)) if ('geometry' in s.working) expect(s.working.geometry.steps[0].cited_theorem).toBeUndefined();
  for (const s of geometry(current)) if ('geometry' in s.working) expect(s.working.geometry.steps[0].cited_theorem).toBe('triangle-sum');
  expect(historicalD2(row)).toEqual(original);
});
