// R1 runner for the independent adversarial suite. ENGINE_ROOT selects the code under test (pristine audit branch for the "before" evidence,
// the R1 branch for "after"). Nothing here tunes anything; the suite was written by a separate agent that had not seen the fixes.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const root = process.env.ENGINE_ROOT ?? "/home/claude/r1"; const out = process.env.OUT ?? "/home/claude/r1/tools/mathematics/r1/results/adversarial-after.json";
const dom = `${root}/packages/learning/src/reasoner/domain/`;
const { solve } = await import(dom + "domain-engine.ts"); const { checkStepText } = await import(dom + "domain-checker.ts");
const raw = readFileSync("/home/claude/r1/tools/mathematics/r1/adversarial/suite.json"); const cases = JSON.parse(raw.toString());
const same = (a: string[] | null, b: string[] | null) => { const x = [...(a ?? [])].sort(), y = [...(b ?? [])].sort(); return x.length === y.length && x.every((v, i) => v === y[i]); };
const rows: any[] = [];
for (const c of cases) {
  if (c.kind === "oracle") continue;
  let verdict = "", detail: unknown = null;
  if (c.kind === "equation") {
    let r: any, err = "";
    try { r = solve(c.text); } catch (e) { err = String(e).slice(0, 160); }
    if (err) { verdict = "CRASH"; detail = err; }
    else if (r.class === "refused") {
      const code = r.outcome ?? null; detail = { class: r.class, outcome: code, reasons: r.reasons };
      if (c.expect.refusal) verdict = code && c.expect.refusal.includes(code) ? "PASS" : code ? "WRONG-CODE" : "UNCODED-REFUSAL";
      else verdict = c.must_answer ? "FALSE-REFUSAL" : (code ? "PASS-REFUSED" : "UNCODED-REFUSAL");
    } else {
      detail = { class: r.class, solution: r.solution, restrictions: r.restrictions };
      if (c.expect.refusal) verdict = "ANSWERED-BUT-MUST-REFUSE";
      else verdict = r.class === c.expect.class && (r.class !== "unique" || same(r.solution, c.expect.solution)) && same(r.restrictions, c.expect.excluded) ? "PASS" : "WRONG-ANSWER";
    }
  } else if (c.kind === "step") {
    let r: any, err = "";
    try { r = checkStepText(c.from, c.to, c.effect ?? "equivalence"); } catch (e) { err = String(e).slice(0, 160); }
    if (err) { verdict = c.truth === "invalid" ? "REJECTED-BY-EXCEPTION" : "CRASH"; detail = err; }
    else { detail = r; verdict = (r.valid ? "valid" : "invalid") === c.truth ? "PASS" : (c.truth === "invalid" ? "ACCEPTED-INVALID" : "REJECTED-VALID"); }
  }
  rows.push({ id: c.id, defect: c.defect, kind: c.kind, text: c.text ?? `${c.from?.eq} -> ${c.to?.eq}`, truth: c.truth ?? c.expect, verdict, detail });
}
const tally: Record<string, Record<string, number>> = {}; for (const r of rows) { (tally[r.defect] ??= {})[r.verdict] = (tally[r.defect][r.verdict] ?? 0) + 1; }
const summary = { engineRoot: root, suiteSha256: createHash("sha256").update(raw).digest("hex"), cases: rows.length, byDefect: tally };
writeFileSync(out, JSON.stringify({ summary, rows }, null, 1)); console.log(JSON.stringify(summary, null, 1));
