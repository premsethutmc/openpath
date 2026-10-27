// Student evaluator vs the frozen, SymPy-labelled transition set (2,884 transitions, labels never produced by this code).
// Each transition is presented as a one-step student working; expected validity comes from the frozen oracle labels.
import { readFileSync, writeFileSync } from "node:fs";
import { evaluateWorking } from "../../../packages/learning/src/core/student.ts";
const dir = process.argv[2], out = process.argv[3];
const adv = JSON.parse(readFileSync(`${dir}/adversarial.json`, "utf8")) as any[];
let n = 0, agree = 0, obligation = 0, unsound = 0, falseReject = 0; const bad: any[] = []; const byKind: Record<string, { n: number; ok: number }> = {}; const ms: number[] = [];
for (const t of adv) {
  const t0 = performance.now();
  const r = evaluateWorking(t.from.eq, [{ eq: t.to.eq, excluded: t.to.excluded }], { route: false, engine: false });
  ms.push(performance.now() - t0);
  const st = r.steps[0]?.status;
  const judgedValid = st === "valid" || st === "no-change", judgedInvalid = st === "invalid";
  const ok = t.expectedValid ? judgedValid : judgedInvalid;
  // a step the oracle labels "not an equivalence" may legitimately be judged "valid-with-obligation" (the previous solutions are kept, new candidates appear)
  if (!t.expectedValid && st === "valid-with-obligation") obligation++;
  if (!t.expectedValid && judgedValid) unsound++;
  if (t.expectedValid && !judgedValid) falseReject++;
  n++; (byKind[t.kind] ??= { n: 0, ok: 0 }).n++; if (ok || (!t.expectedValid && st === "valid-with-obligation")) { agree++; byKind[t.kind].ok++; } else bad.push({ id: t.id, kind: t.kind, expectedValid: t.expectedValid, got: st, from: t.from, to: t.to, summary: r.summary });
}
ms.sort((a, b) => a - b);
const summary = { transitions: n, agree, disagree: n - agree, judgedValidWhileOracleSaysInvalid: unsound, judgedNotValidWhileOracleSaysValid: falseReject, oracleInvalidButImplicationFlagged: obligation, medianMs: +ms[Math.floor(ms.length / 2)].toFixed(2), p95Ms: +ms[Math.floor(ms.length * 0.95)].toFixed(2) };
writeFileSync(out, JSON.stringify({ summary, byKind, mismatches: bad }, null, 1)); console.log(JSON.stringify(summary), bad.slice(0, 5).map((b) => `${b.id} ${b.kind} exp=${b.expectedValid} got=${b.got}`));
