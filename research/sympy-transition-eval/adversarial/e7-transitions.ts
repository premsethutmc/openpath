// Engine A on the adversarial transition suite (read-only use of production entry points).
// solve-type: assessAnswerFirst (the student-facing path), problem = prev statement, working = next line; per-transition status.
// expression-type: assessMathematicalWorking symbolic route, start = prev, one step = next (typed JSON produced by to_e7_json.py).
// Usage (repo root): bun research/sympy-transition-eval/adversarial/e7-transitions.ts
import { readFileSync, writeFileSync } from "node:fs";
const { assessAnswerFirst } = await import("../../../packages/learning/src/answer-first.ts");
const { assessMathematicalWorking } = await import("../../../packages/learning/src/unified-math-engine.ts");
const here = new URL("./", import.meta.url).pathname;
const cases = JSON.parse(readFileSync(here + "transitions.json", "utf8"));
const out: any[] = [];
for (const c of cases) {
  const t0 = performance.now(); let verdict = "unresolved", detail = "";
  try {
    if (c.task === "solve") {
      if (c.assumptions.length) { detail = "assumptions cannot be passed to answer-first"; }
      else {
        const r: any = assessAnswerFirst({ domain: "algebra", statement: c.prev }, { format: "natural", text: c.next }, { diagnose: "always" });
        const t = r.diagnosis?.transitions?.[0];
        detail = t ? `${t.status}: ${t.detail}` : `answer ${r.answer?.status}`;
        verdict = !t ? "unresolved" : t.status === "equivalent" ? "equivalent" : t.status === "implied" ? "implication" : (t.status === "invalid" || t.status === "narrowing") ? "invalid" : "unresolved";
      }
    } else if (c.e7?.start && c.e7?.next && !c.assumptions.length) {
      const m: any = await assessMathematicalWorking({ domain: "symbolic", start: c.e7.start } as any, [{ id: "s0", expression: c.e7.next }] as any, {});
      detail = `${m.classification}: ${String(m.justification).slice(0, 160)}`;
      verdict = m.classification === "verified" ? "equivalent" : m.classification === "invalid" ? "invalid" : m.classification === "missing-assumption" ? "conditional" : "unresolved";
    } else detail = "input not representable for the E7 symbolic route";
  } catch (e) { detail = "error: " + String(e).slice(0, 120); }
  out.push({ id: c.id, verdict, detail, ms: +(performance.now() - t0).toFixed(3) });
}
writeFileSync(here + "e7-transitions-out.json", JSON.stringify(out, null, 1));
console.log(out.length, "rows"); process.exit(0);
