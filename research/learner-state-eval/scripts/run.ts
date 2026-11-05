/** node --import tsx ../research/learner-state-eval/scripts/run.ts <variant: baseline|coverage-gate> <subject> <seedFrom> <seedTo> > out.jsonl  (run from frontend/) */
import { KINDS, metrics, simulate, type Variant } from "../src/harness";
const [variant, subject, from, to] = process.argv.slice(2);
for (let seed = Number(from); seed <= Number(to); seed++) for (const k of KINDS) {
  const r = simulate(k, subject, seed, variant as Variant);
  process.stdout.write(JSON.stringify({ variant, kind: k, subject, seed, unknownUnit: r.unknownUnit, ...metrics(r), steps: r.steps.map((x) => [x.sess, x.phase, x.unit ?? null, x.right ?? null, x.truth, x.status, x.retention]) }) + "\n");
}
