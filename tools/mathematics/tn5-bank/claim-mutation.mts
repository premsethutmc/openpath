/** Corrupt the stated value of every claim-checked step in the released pool (several ways) and count how many corruptions
 *  a claim still confirms. A rewrite of the same number (0.1 / 0.10) or a whitespace-only change is not a corruption. */
import { pool } from "../../../packages/learning/src/families";
import { parseRational } from "../../../packages/learning/src/math-kernel";
import { STEP_CLAIMS, stepClaimHolds } from "../../../packages/learning/src/step-claims";
let tried = 0, accepted = 0; const bad: string[] = [];
for (const key of Object.keys(STEP_CLAIMS)) {
  const [fam, ...r] = key.split("/"), op = r.join("/");
  for (const p of pool(fam).items) for (const s of p.steps) if (s.op === op && stepClaimHolds(s, p) === true) {
    const v = s.value; const cands: unknown[] = [];
    if (typeof v === "number") cands.push(v + 1, v - 1, v * 10, -v - 7);
    else if (typeof v === "string") { cands.push(v + "0", v.replace(/\d/, (d) => String((+d + 1) % 10)), v.split("").reverse().join(""), "x" + v); }
    for (const c of cands) { if (c === v) continue; const a1 = parseRational(v as any), a2 = parseRational(c as any); if (a1 && a2 && a1.eq(a2)) continue; /* same number written differently is not a corruption */ tried++; if (stepClaimHolds({ ...s, value: c as any }, p) === true) { accepted++; if (bad.length < 20) bad.push(`${key} ${JSON.stringify(v)}→${JSON.stringify(c)}`); } }
  }
}
console.log(JSON.stringify({ tried, accepted, bad }));
