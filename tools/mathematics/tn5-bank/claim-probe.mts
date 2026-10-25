/** For each (family/step) key given (default: all listed claims): how many released steps the claim confirms, how many
 *  it contradicts (MISMATCH: a stated value that disagrees with the independent computation), and how many it cannot read.
 *    node --experimental-strip-types --import <loader> tools/mathematics/tn5-bank/claim-probe.mts [family/step ...]
 */
import { pool } from "../../../packages/learning/src/families";
import { STEP_CLAIMS, stepClaimHolds } from "../../../packages/learning/src/step-claims";
const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(STEP_CLAIMS);
for (const key of keys) {
  const [fam, ...r] = key.split("/"), op = r.join("/");
  let yes = 0, no = 0, na = 0, ex = "";
  for (const p of pool(fam).items) for (const s of p.steps) if (s.op === op) {
    const v = stepClaimHolds(s, p);
    if (v === true) yes++; else if (v === false) { no++; ex ||= JSON.stringify({ in: s.inputs, v: s.value, q: p.prompt.slice(0, 60) }); } else na++;
  }
  console.log(key.padEnd(24), "holds", yes, "MISMATCH", no, "unreadable", na, ex);
}
