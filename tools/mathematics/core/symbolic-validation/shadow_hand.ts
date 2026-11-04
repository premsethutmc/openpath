// Hand-labelled shadow cases: agreement is reported per dimension (correctness, completeness, domain status, skill evidence).
import { readFileSync } from "node:fs";
import { assessForEducator } from "../../../../packages/learning/src/core/educator-evidence.ts";
const cs = JSON.parse(readFileSync(new URL("shadow-hand.json", import.meta.url), "utf8")).cases as any[];
const D: Record<string, [number, number]> = { correctness: [0, 0], "first-invalid": [0, 0], completeness: [0, 0], domain: [0, 0], skills: [0, 0] }; const fails: string[] = [];
const rec = (k: string, ok: boolean, id: string, why: string) => { D[k][1]++; if (ok) D[k][0]++; else fails.push(`${id} [${k}] ${why}`); };
for (const c of cs) {
  const ev = assessForEducator({ problem: c.problem, lines: c.lines, objective: c.opts }); const e = c.expect; const r = ev.derivation;
  const cls = (x: string) => (x === "mathematically-invalid" || x === "unsupported-or-undecidable" ? x : "correct");
  rec("correctness", cls(ev.category) === cls(e.category), c.id, `got ${ev.category}, expected ${e.category}`);
  if (e.firstInvalid !== null) rec("first-invalid", ev.firstInvalidStep === e.firstInvalid, c.id, `got ${ev.firstInvalidStep}`);
  if (cls(e.category) === "correct") rec("completeness", ev.category === e.category, c.id, `got ${ev.category}, expected ${e.category}`);
  if (cls(e.category) === "correct") {
    const got = r.outstandingObligations.length ? "outstanding" : r.narrowing.length ? "narrowed" : r.obligations.some((o) => o.status === "discharged") ? "discharged" : r.restrictionsCarried.length ? "carried" : "none";
    rec("domain", got === e.domain, c.id, `got ${got}, expected ${e.domain}`);
  }
  if (e.skillsDemonstrated.length || e.skillsMissing.length) rec("skills", e.skillsDemonstrated.every((s: string) => r.objective.skillsDemonstrated.includes(s)) && e.skillsMissing.every((s: string) => r.objective.skillsMissing.includes(s)), c.id, `got +${r.objective.skillsDemonstrated} -${r.objective.skillsMissing}`);
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(D).map(([k, [a, n]]) => [k, `${a}/${n}`])))); console.log(fails.join("\n") || "no disagreements");
