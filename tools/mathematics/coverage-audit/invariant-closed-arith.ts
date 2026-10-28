// Stage 4/5: ONE generic rule (a closed numeric expression written in the prompt) + the EXISTING exact checker, tried on every family.
// No per-family code. Usage: bun invariant-closed-arith.ts out.json [perFamily=60]
import { writeFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
import { closedExpression } from "../../../packages/learning/src/closed-arithmetic.ts";
import { answerText } from "../../../packages/learning/src/assessment.ts";
import { assessAnswerFirst } from "../../../packages/learning/src/answer-first.ts";
const N = Number(process.argv[3] ?? 60), out: any[] = [];
for (const [fam] of FAMILIES) {
  const items = pool(fam).items.filter((i) => !i.id.endsWith(":mc")), step = Math.max(1, Math.floor(items.length / N));
  const r = { family: fam, released: pool(fam).items.length, sampled: 0, extracted: 0, reproduces: 0, disagrees: 0, unreadableAnswer: 0, unsupported: 0, notes: [] as string[] };
  for (let i = 0; i < items.length && r.sampled < N; i += step) {
    const pr = problemOf(items[i].id)!; r.sampled++;
    const st = closedExpression(pr.prompt); if (!st) continue; r.extracted++;
    const a = answerText("value", null, pr.answer); if (!a.ok) { r.unreadableAnswer++; continue; }
    try { const x = assessAnswerFirst({ domain: "algebra", statement: st }, null, { finalAnswer: a.text, diagnose: false }); const k = x.answer.status;
      if (k === "correct") r.reproduces++; else if (k === "incorrect" || k === "incomplete") { r.disagrees++; if (r.notes.length < 2) r.notes.push(`${st} | ${pr.answer} -> ${k}`); } else r.unsupported++;
    } catch { r.unsupported++; }
  }
  out.push(r);
}
writeFileSync(process.argv[2], JSON.stringify(out));
const ex = out.filter((r) => r.extracted > 0);
console.log(JSON.stringify({ families: out.length, withExtraction: ex.length, fullyReproduced: ex.filter((r) => r.reproduces === r.sampled).length, anyDisagree: ex.filter((r) => r.disagrees > 0).length }));
