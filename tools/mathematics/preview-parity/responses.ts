/** Preview-vs-server grading parity, step 1: responses for the curated Grade 10 practice pools with the preview (browser) credit.
 *  bun tools/mathematics/preview-parity/responses.ts OUT.json; then python3 manage.py shell < tools/mathematics/preview-parity/compare.py (PARITY=OUT.json). */
import { writeFileSync } from "node:fs";
import { moduleFor, needsMarking, question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { teachingLesson } from "../../../packages/learning/src/teaching-contract";
import { teachingScopeFor } from "../../../packages/learning/src/teaching-presentation";
import { creditOf, decide } from "../../../packages/learning/src/grade";
const out: any[] = [];
for (const c of ["MATH.number.euclid-algorithm","MATH.algebra.relations","MATH.algebra.arithmetic-sequences","MATH.algebra.quadratic-discriminant","MATH.geometry.pythagoras","MATH.probability.classical"]) {
  const m = moduleFor(c)!, scope = teachingScopeFor(m);
  const cand = [...new Set([...modulePhasePool(m, "practice"), ...m.practice, ...m.transfer])].filter((id) => !needsMarking(question(id)) && !!problemOf(id) && scope.accepts(problemOf(id)!));
  for (const id of teachingLesson(m, cand).practice.slice(0, 60)) {
    const q = question(id); const a = q.answer;
    const resp = new Set<string>([a, ` ${a} `]);
    if (q.type === "choice") for (const l of "ABCD") resp.add(l);
    else if (/^-?\d+$/.test(a)) { resp.add(String(Number(a) + 1)); resp.add(`${a}.0`); resp.add(`${a} cm`); }
    else if (/^\d+\/\d+$/.test(a)) { const [n, d] = a.split("/").map(Number); resp.add(`${n * 2}/${d * 2}`); resp.add(String(+(n / d).toFixed(4))); resp.add(`${n}/${d + 1}`); resp.add(`${n} / ${d}`); }
    for (const r of resp) out.push({ id, competency: q.competency, type: q.type, response: r, preview: creditOf(id, r), unifiedTs: decide(id, r).credit });
  }
}
writeFileSync("process.argv[2] ?? "/tmp/preview-parity.json"", JSON.stringify(out)); console.log(out.length);
