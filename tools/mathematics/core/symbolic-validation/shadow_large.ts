// Shadow evidence #2: the educator adapter over the oracle-labelled cases (3 seeds). Correctness and domain status are judged against the ORACLE
// (independent of production code); the production marker is not used as an oracle. Reports agreement per dimension.
import { readFileSync, writeFileSync } from "node:fs";
import { assessForEducator } from "../../../../packages/learning/src/core/educator-evidence.ts";
const files = process.argv.slice(2); const T: Record<string, Record<string, number>> = {}; const bump = (k: string, f: string) => { (T[k] ??= {})[f] = (T[k][f] ?? 0) + 1; };
const bad: any[] = []; let marks = 0;
for (const f of files) for (const c of JSON.parse(readFileSync(f, "utf8")) as any[]) {
  const ev = assessForEducator({ problem: c.problem, lines: c.lines }); if ((ev as any).mark !== undefined || ev.markingEffect !== "none") marks++;
  const o = c.oracle; const kind = c.kind;
  const expInvalid = o.first_invalid !== null; const cat = ev.category;
  // correctness
  if (cat === "unsupported-or-undecidable") bump("correctness", "undecided"); else {
    const gotInvalid = cat === "mathematically-invalid";
    if (gotInvalid === expInvalid) bump("correctness", "agree"); else { bump("correctness", expInvalid ? "FALSE-ACCEPT" : "FALSE-REJECT"); bad.push({ id: c.id, dim: "correctness", cat, oracle: o }); }
    if (expInvalid && gotInvalid) bump("first-invalid-step", ev.firstInvalidStep === o.first_invalid ? "agree" : "DISAGREE");
    if (!expInvalid && !gotInvalid) {   // domain status
      const stillMissing = ev.outstandingObligations.length > 0; const expMissing = !!o.final.missing;
      bump("domain-obligation", stillMissing === expMissing ? "agree" : stillMissing ? "spurious-open" : "MISSED-OPEN"); if (stillMissing !== expMissing) bad.push({ id: c.id, dim: "domain", cat, oracle: o });
      const narrowed = ev.derivation.narrowing.length > 0; bump("domain-narrowing", narrowed === !!o.final.narrowed ? "agree" : "DISAGREE");
      if (stillMissing) bump("completeness-category", cat === "valid-with-outstanding-obligations" ? "consistent" : "INCONSISTENT");
      else bump("completeness-category", cat === "correct-and-complete" || cat === "correct-but-incomplete" ? "consistent" : "INCONSISTENT");
    }
  }
  if (kind === "unsupported" && cat === "mathematically-invalid") bump("unknown-as-wrong", "VIOLATION");
}
console.log(JSON.stringify({ T, marksProduced: marks }, null, 1)); writeFileSync(new URL("data/shadow-large.json", import.meta.url), JSON.stringify({ T, bad: bad.slice(0, 50) }));
