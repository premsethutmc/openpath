// R1: runs the INDEPENDENT verifier (verifier.ts: own parser, own polynomials, own restriction extraction) over the frozen adversarial transitions and claims.
// Same scoring as run-checker-eval.ts. Labels come from the SymPy oracle, never from this code.
import { readFileSync, writeFileSync } from "node:fs";
import { checkStep as checkStepText, checkClaim } from "../verifier/verifier.ts";
const [dir, out] = process.argv.slice(2);
const adv = JSON.parse(readFileSync(`${dir}/adversarial.json`, "utf8")) as any[];
const claims = JSON.parse(readFileSync(`${dir}/claims.json`, "utf8")) as any[];
const mism: any[] = []; let invTot = 0, invRej = 0, valTot = 0, valAcc = 0, reasonMatch = 0, reasonTot = 0, undecided = 0;
for (const t of adv) {
  let r; try { r = checkStepText(t.from, t.to); } catch (e) { undecided++; mism.push({ id: t.id, error: String(e) }); if (t.expectedValid) valTot++; else invTot++; continue; }
  if (t.expectedValid) { valTot++; if (r.valid) valAcc++; else mism.push({ id: t.id, kind: t.kind, expected: "valid", got: r.reasons }); }
  else { invTot++; if (!r.valid) invRej++; else mism.push({ id: t.id, kind: t.kind, expected: t.reasons, got: "accepted" });
    reasonTot++; const map: Record<string, string> = { "solution-set-changed": "solution-set-changed" };
    if (JSON.stringify([...r.reasons].sort()) === JSON.stringify([...t.reasons].sort())) reasonMatch++; }
}
let cInv = 0, cInvRej = 0, cVal = 0, cValAcc = 0;
for (const c of claims) {
  let r; try { r = checkClaim(c.text, c.claimed); } catch (e) { mism.push({ id: c.id, error: String(e) }); if (c.expectedValid) cVal++; else cInv++; continue; }
  if (c.expectedValid) { cVal++; if (r.valid) cValAcc++; else mism.push({ id: c.id, expected: "valid claim", got: "rejected" }); }
  else { cInv++; if (!r.valid) cInvRej++; else mism.push({ id: c.id, expected: "wrong claim", got: "accepted" }); }
}
const res = { transitions: { invalid: invTot, invalidRejected: invRej, valid: valTot, validAccepted: valAcc, reasonCodesExactMatch: `${reasonMatch}/${reasonTot}`, errors: undecided },
  claims: { wrong: cInv, wrongRejected: cInvRej, right: cVal, rightAccepted: cValAcc }, mismatches: mism.slice(0, 40), mismatchCount: mism.length };
writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ transitions: res.transitions, claims: res.claims, mismatchCount: res.mismatchCount }));
