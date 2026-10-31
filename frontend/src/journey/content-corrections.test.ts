/**
 * Workstream A2, stage 4: regression tests for the four corrected explanations. The arithmetic is re-derived here, independently of the
 * content and of the families' own answer code (a rule is applied as the text states it, then compared with a separate computation).
 * Each corrected explanation's earlier revision stays BLOCKED in the registry and its new revision is pending review (not approved).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { moduleFor, modules } from "../../../packages/learning/src/content";
import { contentEligibility, contentHash, explanationBlocklist, explanationId, explanationRegistry } from "../../../packages/learning/src/explanation-review";
import { phasePool, problemOf } from "../../../packages/learning/src/families";

const strat = (c: string, id: string) => moduleFor(c)!.strategies.find((s) => s.id === id)!;
const text = (c: string, id: string) => strat(c, id).screens.flatMap((s) => [...s.text, ...(s.math ?? [])]).join("\n");
const MISS = "MATH.algebra.missing-number", RAT = "MATH.number.rational-numbers", TAB = "MATH.number.multiplication-tables";

test("A doubling: 7 × 8 by doubling — three doublings from 7, two from 14 (was: 'double three times' from 14)", () => {
  const t = text(TAB, "doubling");
  assert.ok(!/double three times: 28/.test(t), "the wrong sentence is gone");
  const chain = /7 → 14 → 28 → 56/.exec(t);
  assert.ok(chain, "the doubling chain is stated");
  const steps = [7, 14, 28, 56];
  for (let i = 1; i < steps.length; i++) assert.equal(steps[i], steps[i - 1] * 2);
  assert.equal(steps.length - 1, 3, "7 doubled three times");
  assert.equal(steps.slice(1).length - 1, 2, "14 doubled twice");
  assert.equal(56, 7 * 8);
  assert.match(t, /double twice more: 28, then 56/);
  for (const line of strat(TAB, "doubling").screens[0].math ?? []) { const [l, r] = line.split("="); const [a, b] = l.split("×").map((x) => Number(x.trim())); assert.equal(a * b, Number(r.trim()), line); }
});

/** The rule exactly as the corrected method states it, for each kind of sentence the family asks. */
function byStatedRule(sentence: string): number {
  const s = sentence.replace(/−/g, "-");
  let m: RegExpExecArray | null;
  if ((m = /□ \+ (\d+) = (\d+)/.exec(s))) return Number(m[2]) - Number(m[1]); // a number was added to the box: take it away
  if ((m = /□ - (\d+) = (\d+)/.exec(s))) return Number(m[2]) + Number(m[1]); // a number was taken away from the box: add it back
  if ((m = /(\d+) × □ = (\d+)/.exec(s))) return Number(m[2]) / Number(m[1]); // the box was multiplied by a number: divide
  if ((m = /(\d+) - □ = (\d+)/.exec(s))) return Number(m[1]) - Number(m[2]); // the box was taken away from a number: first number take away the answer
  throw new Error(`no rule for ${sentence}`);
}

test("B missing number: the stated inverse-operation rule gives the right box for every kind of sentence (27 − □ = 9 → 18)", () => {
  for (const id of ["worked_steps", "check_what_it_uses"]) {
    const t = text(MISS, id);
    assert.ok(!/Do the opposite to the other number/.test(t), `${id}: the wrong rule is gone`);
    for (const phrase of ["If a number was added to the box, take it away", "If a number was taken away from the box, add it back", "If the box was multiplied by a number, divide by that number", "If the box was taken away from a number, the box is the gap: the first number take away the answer"]) assert.ok(t.includes(phrase), `${id}: ${phrase}`);
  }
  const p = problemOf("gen:acmissing:1,18,9")!;
  assert.match(p.prompt, /27 − □ = 9/);
  assert.equal(byStatedRule(p.prompt), 18);
  assert.equal(Number(p.answer), 18);
  assert.equal(27 - 18, 9, "18 in the box makes the sentence true");
  // every question of the family, all four kinds, in every phase pool: the rule as stated, then the sentence checked by substitution
  let n = 0;
  const kinds = new Set<number>();
  for (const ph of ["practice", "check", "retention", "diagnostic"] as const)
    for (const qid of phasePool("acmissing", ph)) {
      const q = problemOf(qid.replace(/:mc$/, ""));
      if (!q) continue;
      const box = byStatedRule(q.prompt);
      assert.equal(box, Number(q.answer), q.prompt);
      const sentence = q.prompt.replace(/^.*\? /, "").replace(/−/g, "-").replace("□", String(box)).replace(/×/g, "*");
      const [l, r] = sentence.split("=");
      assert.equal(Function(`return (${l})`)(), Number(r), `substitution: ${sentence}`);
      kinds.add(q.params[0]);
      n++;
    }
  assert.deepEqual([...kinds].sort(), [0, 1, 2, 3], "all four kinds of sentence covered");
  assert.ok(n > 50, `${n} questions`);
});

test("C rational numbers, spot the mistake: the question is quoted in full and the worked values are consistent with it", () => {
  const s = strat(RAT, "spot_the_mistake"), sc = s.screens[0];
  const q = problemOf(sc.instance!)!;
  assert.equal(q.prompt.replace(/ \([^()]*\)$/, ""), "Work out 2/5 × (−7/9).");
  assert.ok(sc.text[0].includes("“Work out 2/5 × (−7/9).”"), sc.text[0]);
  // independent arithmetic: 2/5 × (−7/9) = −14/45; the quoted wrong answer is the sign error 14/45
  const [n, d] = [2 * -7, 5 * 9];
  assert.equal(`${n}/${d}`, "-14/45");
  assert.equal(q.answer.replace("−", "-"), "-14/45");
  assert.match(sc.text[0], /A common wrong answer is 14\/45\./);
  assert.deepEqual(sc.math, ["Not 14/45, but −14/45"]);
});

test("C' no quoted question in any 'spot the mistake' explanation is cut off (the same defect elsewhere)", () => {
  let n = 0;
  for (const m of modules)
    for (const s of m.strategies.filter((x) => x.id === "spot_the_mistake")) {
      const quoted = /“([^”]*)”/.exec(s.screens[0].text[0])?.[1];
      if (!quoted) continue;
      const prompt = problemOf(s.screens[0].instance!)?.prompt;
      if (!prompt) continue;
      // the quoted question is the question's own prompt, or that prompt without a final note in brackets ("(A fraction is fine.)")
      assert.ok(quoted === prompt || (prompt.startsWith(quoted) && /^ \((?:[^()]|\([^()]*\))*[.!?]\)$/.test(prompt.slice(quoted.length))), `${m.competency}: quoted “${quoted}” is not the question “${prompt}”`);
      n++;
    }
  assert.ok(n > 100, `${n} explanations checked`);
});

test("the four corrections: earlier revision blocked, new revision pending review or flagged for revision, nothing approved", () => {
  for (const [c, id] of [[TAB, "doubling"], [MISS, "worked_steps"], [MISS, "check_what_it_uses"], [RAT, "spot_the_mistake"]]) {
    const e = explanationRegistry().entries.find((x) => x.id === explanationId(c, id))!;
    const cur = e.revisions.find((r) => r.contentHash === contentHash(c, strat(c, id)))!;
    assert.ok(cur, `${c}#${id}: current revision registered`);
    assert.ok(["pending_review", "revision_required"].includes(cur.status), `${c}#${id}: ${cur.status} (not approved)`);
    const prev = e.revisions.find((r) => r.contentHash === cur.supersedes)!;
    assert.equal(prev.status, "blocked", `${c}#${id}: earlier revision blocked`);
    assert.ok(explanationBlocklist().entries.some((b) => b.id === e.id && b.contentHash === prev.contentHash), `${c}#${id}: earlier revision on the blocklist`);
    assert.ok(prev.knownIssues.length);
    const el = contentEligibility(moduleFor(c), strat(c, id), { competency: c, mode: "supervised-evaluation", misconceptionEvidence: true });
    assert.equal(el.eligible, false, "not usable in supervised evaluation until an educator approves it");
    assert.equal(el.educatorApproved, false);
  }
});
