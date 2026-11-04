import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateWorking } from "./student.ts";
const ev = (p: string, l: string[]) => evaluateWorking(p, l, { route: false, engine: false });

test("glyphs: ⋅ ∙ ∗ ∕ ⁄ and the minus variants read like their ASCII forms", () => {
  const a = ev("7-2*x = -1-7*x", ["7−2⋅x = −1−7∗x", "8 = −5∙x", "x = −8∕5"]);
  const b = ev("7-2*x = -1-7*x", ["7-2*x = -1-7*x", "8 = -5*x", "x = -8/5"]);
  assert.equal(a.status, b.status); assert.equal(a.status, "valid-complete");
  assert.equal(ev("x/2=3", ["x⁄2 = 3", "x = 6"]).status, "valid-complete");
});
test("ambiguous p/qx is detected with or without spaces, and with every division glyph", () => {
  for (const l of ["–52 ÷ 4  x = −6", "-52/4x=-6", "−52∕4 x = −6"]) assert.equal(ev("-52/(4*x) = -6", [l, "x=13/6"]).status, "ambiguous", l);
  assert.equal(ev("-52/(4*x) = -6", ["-52/(4*x)=-6", "x=13/6"]).status, "valid-complete");   // fully bracketed: not ambiguous
});
test("an unsupported line breaks the evidence chain: the following step is not judged, later independent steps are", () => {
  const q = ev("2*x+1=7", ["√4*x+1=7", "2*x=6", "x=3"]);
  assert.deepEqual(q.steps.map((s) => s.status), ["unsupported", "unsupported", "valid"]); assert.equal(q.status, "unsupported");
  assert.deepEqual(q.steps[2].reasons, ["assessed-independently-of-the-broken-chain"]);
});
test("after a broken chain a later step is invalid only when it is invalid in every context", () => {
  assert.equal(ev("2*x+1=7", ["√4*x+1=7", "2*x=6", "x=4"]).status, "invalid");          // 2x=6 -> x=4 changes the solution: invalid regardless of the missing line
  // 'x=3 or x=-1 -> x=3' could be a legitimate discharge of an obligation the unreadable line created: not judged
  const q = ev("2*x+1=7", ["√4*x+1=7", "x=3 or x=-1", "x=3"]);
  assert.notEqual(q.status, "valid-complete"); assert.notEqual(q.steps[2].status, "invalid");
});
