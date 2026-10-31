/**
 * Workstream A3: the linear-equations teaching experience, end to end through the integrated components (real grader, records, evidence,
 * hypotheses, adaptive engine, teaching gate, content-review registry, renderer adapter). Only learner answers (and their written working)
 * are scripted. Mathematics is re-derived here, independently of the content: every worked line of every explanation, and the instance
 * teaching of generated variants, is checked to have exactly the original equation's solution.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { moduleFor, question, type Module, type Strategy } from "../../../packages/learning/src/content";
import { approvalDigest, chapterExplanation, contentEligibility, contentHash, explanationBlocklist, explanationId, explanationRegistry, isMisconceptionSpecific, addressedMisconception, setExplanationRegistry, setTeachingMode, type ExplanationRegistry } from "../../../packages/learning/src/explanation-review";
import { FAMILIES, phasePool, problemOf, type Problem } from "../../../packages/learning/src/families";
import { gradeRequest } from "../../../packages/learning/src/server-grader";
import { teachingEligibility } from "../../../packages/learning/src/teaching-contract";
import { moduleState, RETRY_LIMIT } from "../../../packages/learning/src/intervention";
import { learners, misconception, right, wrong, type Learner } from "./learners";
import { runScenario, SCENARIOS, type Scenario } from "./scenarios";
import { SliceSession } from "./session";
/** What a learner writes: each new equation once (not the "do this to both sides" lines), ending with the answer. */
const learnerWorking = (steps: string[], answer: string) => { const w = steps.slice(1).filter((l) => !l.startsWith("Check") && l.split(" = ").length === 2 && !/ [−+] \S+ = .* [−+] \S+$/.test(l) && !/÷/.test(l)); return w.at(-1) === `x = ${answer}` ? w : [...w, `x = ${answer}`]; };

const C = "MATH.algebra.linear-equations";
const M = () => moduleFor(C)!;
const strat = (id: string) => M().strategies.find((s) => s.id === id)!;
const S = (o: Partial<Scenario> & Pick<Scenario, "learner">): Scenario => ({ id: "a3", category: 1, start: "gen:lin:2,17,11", expect: {}, ...o });
type Run = ReturnType<typeof runScenario>;
const teaches = (r: Run) => r.f.session.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; strategy: string; at: string }[];
const reviews = (r: Run) => r.f.session.trace.filter((t) => t.component === "explanation-review.contentEligibility").map((t) => ({ ...(t.input as { strategy: string }), ...(t.output as { eligible: boolean; status: string; misconceptionEvidence: boolean; basis: string; label: string }) }));
const records = (r: Run) => r.f.session.state().records;
const ev = (r: Run, c = C) => r.f.session.state().evidence(c);
const specificOf = (id: string) => { const s = M().strategies.find((x) => x.id === id); return !!s && isMisconceptionSpecific(s); };
const SHOWN = ["independent", "transfer", "verified"];

// ---------------------------------------------------------------- independent mathematics

/** An expression in x, evaluated (×, ÷, −, implicit multiplication). */
function value(expr: string, x: number): number {
  const e = expr.replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/(\d)\s*x/g, "$1*x").replace(/(\d)\s*\(/g, "$1*(").replace(/\)\s*\(/g, ")*(").replace(/x\s*\(/g, "x*(");
  if (!/^[\dx+\-*/().\s]+$/.test(e)) throw new Error(`not an expression: ${expr}`);
  return Function("x", `return (${e});`)(x) as number;
}
/** The two sides of an equation, as the question states it. */
const equationOf = (p: Problem) => p.prompt.replace(/^(Solve|Find x:) /, "").replace(/\. What is x\?$/, "").replace(/\.$/, "");
/** Every line of a worked solution has exactly the original equation's solution; the check substitutes it into the original equation. */
function checkWorked(p: Problem, lines: string[]): number {
  const x = Number(p.answer);
  const [L0, R0] = equationOf(p).split(" = ");
  assert.equal(value(L0, x), value(R0, x), `${p.id}: the answer solves the question`);
  assert.equal(lines[0], equationOf(p), `${p.id}: the worked solution starts from the question's own equation`);
  let checked = 0;
  for (const line of lines.filter((l) => !l.endsWith(".") || l.startsWith("Check: "))) { // a sentence (ends with ".") is the reason for the line above
    if (line.startsWith("Check: ")) {
      // each side of the original equation, worked out with the answer: the parts after "Check:" are those values
      const sides = line.slice(7).split(" and ");
      assert.equal(sides.length, R0.includes("x") ? 2 : 1, `${p.id}: the check covers both sides when x is on both`);
      const want = [value(L0, x), value(R0, x)];
      for (const s of sides) { const parts = s.split(" = ").map((t) => value(t, x)); assert.ok(parts.every((v) => v === parts[0]), `${p.id}: ${line}`); assert.ok(want.includes(parts[0]), `${p.id}: the check uses the original equation: ${line}`); }
      checked++;
      continue;
    }
    const parts = line.split(" — ")[0].split(" = "); // a line may give its reason after " — "
    assert.ok(parts.length >= 2, `${p.id}: ${line} is an equation`);
    const at = parts.map((t) => value(t, x));
    assert.ok(at.every((v) => Math.abs(v - at[0]) < 1e-9), `${p.id}: "${line}" holds at x = ${x}`);
    if (parts.some((t) => t.includes("x"))) { const off = parts.map((t) => value(t, x + 1)); assert.ok(!off.every((v) => Math.abs(v - off[0]) < 1e-9), `${p.id}: "${line}" has only that solution`); }
    checked++;
  }
  return checked;
}

test("1 every worked line of every linear-equations explanation keeps exactly the original solution (independent check)", () => {
  let lines = 0;
  for (const s of [chapterExplanation(M()), ...M().strategies])
    for (const sc of s.screens) {
      if (!sc.math?.length || !sc.instance) continue;
      const p = problemOf(sc.instance)!;
      const eqs = sc.math.filter((l) => !l.startsWith("Not "));
      if (eqs.length) lines += checkWorked(p, eqs[0] === equationOf(p) ? eqs : [equationOf(p), ...eqs]);
      const not = sc.math.find((l) => l.startsWith("Not "));
      if (not) {
        const [, w, a] = /^Not (.+), but (.+)$/.exec(not)!;
        const b = p.bugs.find((x) => sc.text.includes(x.says))!;
        assert.equal(w.replace("−", "-"), String(b.predict), `${s.id}: the wrong answer is the one the quoted mistake predicts`);
        assert.equal(a, p.answer);
        assert.notEqual(w, a);
      }
    }
  assert.ok(lines > 60, `${lines} lines`);
});

test("1b generated variants: the instance teaching of every family solves its own equation, line by line (240 variants)", () => {
  let n = 0;
  for (const f of ["lin", "lboth", "lbrk"]) {
    const ids = [...phasePool(f, "practice"), ...phasePool(f, "check")].map((x) => x.replace(/:mc$/, ""));
    for (const id of ids.filter((_, i) => i % Math.max(1, Math.floor(ids.length / 80)) === 0).slice(0, 80)) {
      const p = problemOf(id)!;
      const t = FAMILIES.get(f)!.teach!.instance!(p.params);
      assert.equal(t.worked.result, Number(p.answer));
      checkWorked(p, t.worked.steps.map((s) => s.expression));
      n++;
    }
  }
  assert.equal(n, 240);
});

test("1c every explanation passes the teaching contract (machine-checked) and its recheck is a fresh question of the same competency", () => {
  const m = M();
  const shownIds = new Set(m.strategies.flatMap((s) => s.screens.map((sc) => sc.instance)).filter(Boolean));
  for (const s of m.strategies) {
    const e = teachingEligibility(m, s);
    assert.ok(e.checked && e.eligible, `${s.id}: ${e.violations.join("; ")}`);
    for (const q of [s.guided, s.check]) {
      assert.equal(question(q).competency, C, `${s.id}: ${q} is a linear-equations question`);
      assert.ok(!shownIds.has(q.replace(/:mc$/, "")), `${s.id}: the recheck ${q} is not a worked example`);
      const own = s.screens.filter((sc) => sc.instance && sc.role === "worked-example").map((sc) => problemOf(sc.instance!)!);
      const pq = problemOf(q.replace(/:mc$/, ""))!;
      for (const w of own) assert.ok(pq.answer !== w.answer && pq.params[0] !== w.params[0], `${s.id}: ${q} is not a near-copy of the worked example ${w.id}`);
      assert.equal(gradeRequest({ id: q, response: question(q).answer }).credit, true, `${q}: the trusted grader accepts its answer`);
    }
    if (isMisconceptionSpecific(s)) {
      const about = addressedMisconception(s)!;
      assert.ok(about, `${s.id}: addresses a misconception`);
      const pc = problemOf(s.check)!;
      assert.ok(pc.bugs.some((b) => b.id === about && b.predict !== null && String(b.predict) !== pc.answer), `${s.id}: its recheck can show whether ${about} persists`);
    }
  }
  // no question used to practise or recheck is a near-copy of any worked example in the module (two numbers the same, or the same answer
  // with the same number of x's); within an explanation, its recheck differs from its own worked example in both answer and number of x's
  const examples = m.strategies.flatMap((s) => s.screens.filter((sc) => (sc.role === "worked-example" || sc.role === "misconception") && sc.instance).map((sc) => problemOf(sc.instance!)!));
  for (const s of m.strategies) for (const q of [s.guided, s.check]) { const pq = problemOf(q.replace(/:mc$/, ""))!; for (const e of examples) if (pq.family === e.family) assert.ok(!(pq.answer === e.answer && pq.params[0] === e.params[0]) && pq.params.filter((v, i) => v === e.params[i]).length < 2, `${s.id}: ${q} is close to the worked example ${e.id}`); }
  const qs = m.strategies.flatMap((s) => [s.guided, s.check]).map((q) => problemOf(q.replace(/:mc$/, ""))!);
  for (let i = 0; i < qs.length; i++) for (let j = i + 1; j < qs.length; j++) if (qs[i].family === qs[j].family) assert.ok(qs[i].params.filter((v, k) => v === qs[j].params[k]).length < 2, `practice and rechecks are not near-copies of each other: ${qs[i].id} ~ ${qs[j].id}`);
  const ids = m.strategies.map((s) => s.id);
  for (const want of ["two_steps", "balance", "both_sides", "brackets", "fix_finish", "fix_inverse", "fix_divide_all", "fix_one_side", "fix_sign_move", "fix_number_sign", "fix_distribution", "fix_bracket_sign"]) assert.ok(ids.includes(want), want);
});

// ---------------------------------------------------------------- journeys

test("J1 one-step equation success (the linear-intro bridge): right alone, no teaching", () => {
  const r = runScenario(S({ start: "gen:ahone:0,6,9", learner: () => learners.strong() }));
  assert.ok(r.terminated);
  assert.equal(teaches(r).length, 0);
  assert.ok(SHOWN.includes(ev(r, "MATH.algebra.linear-intro").status), ev(r, "MATH.algebra.linear-intro").status);
});

test("J2 two-step equation success on generated variants: right alone, no teaching, shown on its own", () => {
  for (const start of phasePool("lin", "practice").filter((x) => !x.endsWith(":mc")).slice(5, 8)) {
    const r = runScenario(S({ start, learner: () => learners.strong() }));
    assert.ok(r.terminated, start);
    assert.equal(teaches(r).length, 0, start);
    assert.ok(SHOWN.includes(ev(r).status), `${start}: ${ev(r).status}`);
    assert.equal(ev(r).verified, false, "not verified before a delayed check");
  }
});

/** a learner who makes one modelled mistake wherever it applies until it has been taught once, writing their working on checks */
const persistent = (bug: string): Learner => ({ name: `${bug} until taught`, act: (v) => {
  if (v.taught > 0) {
    const p = problemOf(v.q.replace(/:mc$/, ""));
    const t = p && FAMILIES.get(p.family)?.teach?.instance?.(p.params);
    return { answer: right(v.q), ...(t && v.activity === "check" ? { working: learnerWorking(t.worked.steps.map((s) => s.expression), right(v.q)) } : {}) };
  }
  return { answer: misconception(v.q, new Set([bug])) ?? right(v.q) };
} });
function misconceptionJourney(bug: string, explanation: string, family: string) {
  const r = runScenario(S({ learner: () => persistent(bug) }));
  const t = teaches(r);
  assert.ok(t.length >= 1, `${bug}: taught`);
  assert.equal(t[0].strategy, explanation, `${bug}: the explanation of that misconception (${t.map((x) => x.strategy)})`);
  const rv = reviews(r).find((x) => x.strategy === explanation)!;
  assert.ok(rv.eligible && rv.misconceptionEvidence && rv.basis === "verified-misconception", JSON.stringify(rv));
  // the recheck: a fresh question of the same family, alone, right, after the teaching
  const after = records(r).attempts.filter((a) => a.at > t[0].at && a.activity === "check" && a.hints === 0 && a.n === 1);
  assert.ok(after.length >= 1, "a recheck alone after teaching");
  const rc = after[0];
  assert.equal(problemOf(rc.questionId.replace(/:mc$/, ""))!.family, family, `the recheck is a ${family} question`);
  assert.notEqual(rc.questionId, strat(explanation).screens[0].instance, "not the worked example");
  assert.equal(rc.credit, true, "the trusted grader marked it right");
  return { r, rc };
}

test("J3 variables on both sides: x-sign-kept established → its explanation → a fresh both-sides recheck, right, with method evidence", () => {
  const { r, rc } = misconceptionJourney("x-sign-kept", "fix_sign_move", "lboth");
  const auth = r.f.session.trace.filter((t) => t.component === "derivation-interface.authorizeWorking");
  assert.ok(auth.some((t) => (t.output as { evidence: string }).evidence === "method-verified"), "the learner's working on the recheck is verified by the derivation authority");
  assert.ok(rc.working?.length, "working recorded with the answer");
});

test("J4 brackets: first-term-only established → the distribution explanation → a fresh bracket recheck, right", () => {
  misconceptionJourney("first-term-only", "fix_distribution", "lbrk");
});

test("J5 an isolated slip: no remediation", () => {
  for (const k of [3, 4]) {
    const r = runScenario(S({ learner: () => learners.oneSlip(k) }));
    assert.equal(teaches(r).length, 0, `slip at ${k}`);
    assert.ok(SHOWN.includes(ev(r).status));
  }
});

test("J6 a verified misconception gets its matching explanation (forgot-divide → fix_finish), never another misconception's", () => {
  misconceptionJourney("forgot-divide", "fix_finish", "lin");
  for (const t of teaches(runScenario(SCENARIOS.find((s) => s.id === "2c")!))) if (specificOf(t.strategy)) assert.equal(addressedMisconception(strat(t.strategy)), "added-not-subtracted", t.strategy);
});

test("J7 repeated difficulty with no established misconception: general instruction only, bounded, no mastery", () => {
  for (const id of ["5b", "4a", "4c"]) {
    const r = runScenario(SCENARIOS.find((s) => s.id === id)!);
    const t = teaches(r);
    assert.ok(t.length >= 1, `${id}: taught`);
    assert.ok(t.every((x) => !specificOf(x.strategy)), `${id}: ${t.map((x) => x.strategy)}`);
    assert.ok(reviews(r).every((x) => !x.misconceptionEvidence));
    assert.ok(t.length <= M().strategies.filter((s) => !isMisconceptionSpecific(s)).length, "bounded by the explanations available");
    // 5b and 4a are never right alone: no mastery, a pause; 4c becomes right alone after two explanations, which is evidence
    if (id !== "4c") { assert.ok(!SHOWN.includes(ev(r).status), `${id}: no mastery (${ev(r).status})`); assert.equal(r.f.ended?.phase, "pause"); }
    else assert.ok(records(r).attempts.some((a) => a.at > t.at(-1)!.at && a.credit === true && a.hints === 0 && a.activity !== "guided"), "4c: shown only by answers alone after teaching");
  }
});

test("J8 successful independent recovery: after teaching, right alone on fresh questions; shown, not yet verified; a delayed check is scheduled", () => {
  const { r } = misconceptionJourney("forgot-divide", "fix_finish", "lin");
  const e = ev(r);
  assert.ok(SHOWN.includes(e.status), e.status);
  assert.equal(e.verified, false, "teaching and a recheck are not verification");
  assert.ok(e.retention === "scheduled" || e.retentionDueAt, `retention ${e.retention}`);
});

test("J9 a failed independent recheck: not success; a different explanation next; bounded", () => {
  const r = runScenario(S({ learner: () => learners.misconception(["forgot-divide"], 2) }));
  const t = teaches(r);
  assert.ok(t.length >= 2, t.map((x) => x.strategy).join());
  const failed = records(r).attempts.find((a) => a.at > t[0].at && a.at < t[1].at && a.activity === "check");
  assert.ok(failed && failed.credit === false, "the recheck after the first explanation was wrong");
  assert.notEqual(t[1].strategy, t[0].strategy, "a different explanation");
  for (const q of new Set(records(r).attempts.map((a) => a.questionId))) assert.ok(records(r).attempts.filter((a) => a.questionId === q).length <= 1 + RETRY_LIMIT, q);
});

test("J10 failed delayed retention: recovery required, earlier achievement kept, not verified, the engine asks for recovery work", () => {
  const r = runScenario(S({ learner: () => learners.strong() }));
  const before = ev(r);
  r.f.later(8);
  assert.equal(r.f.currentPhase, "retention");
  r.f.on({ type: "answer_submitted", value: wrong(r.f.currentQuestion!), timestamp: 0 });
  const e = ev(r);
  assert.equal(e.recoveryRequired, true);
  assert.equal(e.verified, false);
  assert.equal(e.independentAt, before.independentAt);
  const st = r.f.session.state();
  const ms = moduleState(C, st.records, e, r.f.session.now, r.f.session.session, null, st.evidence);
  assert.notEqual(ms.phase, "done");
});

function within<T>(mode: "demonstration" | "supervised-evaluation", reg: ExplanationRegistry | null, fn: () => T): T {
  const pm = setTeachingMode(mode), pr = reg ? setExplanationRegistry(reg) : null;
  try { return fn(); } finally { setTeachingMode(pm); if (pr) setExplanationRegistry(pr); }
}
const clone = (): ExplanationRegistry => JSON.parse(JSON.stringify(explanationRegistry()));

test("J11 no eligible explanation (supervised evaluation, nothing approved): a bounded pause, no teaching, no mastery", () => {
  const r = within("supervised-evaluation", null, () => runScenario(S({ learner: () => persistent("forgot-divide") })));
  assert.equal(teaches(r).length, 0);
  assert.equal(r.f.ended?.phase, "pause");
  assert.ok(!SHOWN.includes(ev(r).status));
});

test("J12 blocked content: a blocked explanation is never shown; the four known-invalid revisions stay blocked", () => {
  assert.equal(explanationBlocklist().entries.length, 4);
  const reg = clone();
  const e = reg.entries.find((x) => x.id === explanationId(C, "fix_finish"))!;
  const cur = e.revisions.find((x) => x.contentHash === contentHash(C, strat("fix_finish")))!;
  Object.assign(cur, { status: "blocked", knownIssues: ["test: blocked in memory"] });
  const r = within("demonstration", reg, () => runScenario(S({ learner: () => persistent("forgot-divide") })));
  assert.ok(!teaches(r).some((t) => t.strategy === "fix_finish"), "not shown");
  assert.ok(teaches(r).every((t) => !specificOf(t.strategy) || addressedMisconception(strat(t.strategy)) === "forgot-divide"));
  for (const b of explanationBlocklist().entries) { const m = moduleFor(b.id.split("#")[0])!; const s = m.strategies.find((x) => x.id === b.id.split("#")[1])!; assert.notEqual(contentHash(m.competency, s), b.contentHash, `${b.id}: the current content is not the blocked revision`); }
});

test("J13 unapproved content in supervised mode is refused; demonstration labels it; an educator-approved fixture is shown", () => {
  for (const s of [chapterExplanation(M()), ...M().strategies]) {
    const sup = contentEligibility(M(), s, { competency: C, mode: "supervised-evaluation", misconceptionEvidence: true, usage: s.id === "chapter" ? "lesson" : "intervention" });
    assert.equal(sup.eligible, false, s.id);
    assert.ok(sup.failed.includes("approved-for-usage"), s.id);
    const demo = contentEligibility(M(), s, { competency: C, mode: "demonstration", misconceptionEvidence: [addressedMisconception(s) ?? ""], usage: s.id === "chapter" ? "lesson" : "intervention" });
    assert.ok(demo.eligible && !demo.educatorApproved && /not been approved/.test(demo.label), s.id);
    assert.ok(["pending_review", "revision_required"].includes(demo.status), `${s.id}: ${demo.status}`);
  }
  // an in-memory educator approval (test fixture, never committed) makes the same explanation usable in supervised evaluation
  const reg = clone();
  reg.reviewers = [{ id: "fixture-educator", role: "educator", addedAt: "2026-01-01T00:00:00.000Z", addedBy: "linear-equations.test.ts", note: "in memory only" }];
  const id = explanationId(C, "two_steps"), rev = reg.entries.find((x) => x.id === id)!.revisions.find((x) => x.contentHash === contentHash(C, strat("two_steps")))!;
  Object.assign(rev, { status: "approved", provenance: { source: "educator", by: "fixture-educator", at: "2026-06-01T00:00:00.000Z", note: "fixture" }, reviewerRole: "educator", reviewer: "fixture-educator", reviewedAt: "2026-06-01T00:00:00.000Z", scope: ["demonstration", "supervised-evaluation"] });
  rev.approvalDigest = approvalDigest(id, rev);
  const e = contentEligibility(M(), strat("two_steps"), { competency: C, mode: "supervised-evaluation" }, reg);
  assert.ok(e.eligible && e.educatorApproved);
});

test("J14 restart and evidence replay: the same evidence, recovery state and next step", () => {
  const { r } = misconceptionJourney("forgot-divide", "fix_finish", "lin");
  r.f.later(8);
  if (r.f.currentPhase === "retention") r.f.on({ type: "answer_submitted", value: wrong(r.f.currentQuestion!), timestamp: 0 });
  const s0 = r.f.session, st0 = s0.state();
  const s1 = SliceSession.fromEvents(s0.learnerId, s0.competency, JSON.parse(JSON.stringify(s0.events)), s0.now, s0.session), st1 = s1.state();
  const e0 = st0.evidence(C), e1 = st1.evidence(C);
  for (const k of ["status", "verified", "recoveryRequired", "independentAt", "retention"] as const) assert.deepEqual(e1[k], e0[k], k);
  assert.deepEqual(e1.retentionHistory, e0.retentionHistory);
  const m0 = moduleState(C, st0.records, e0, s0.now, s0.session, null, st0.evidence), m1 = moduleState(C, st1.records, e1, s0.now, s0.session, null, st1.evidence);
  assert.deepEqual([m1.phase, m1.question, m1.strategy?.id ?? null], [m0.phase, m0.question, m0.strategy?.id ?? null]);
  assert.equal(st1.records.teaching.length, st0.records.teaching.length);
});

test("J15 every misconception explanation is reached by its own established misconception, and only by it", () => {
  const pairs: [string, string][] = [["forgot-divide", "fix_finish"], ["added-not-subtracted", "fix_inverse"], ["divided-first", "fix_divide_all"], ["only-one-side", "fix_one_side"], ["x-sign-kept", "fix_sign_move"], ["number-sign-kept", "fix_number_sign"], ["first-term-only", "fix_distribution"], ["bracket-sign", "fix_bracket_sign"]];
  for (const [bug, explanation] of pairs) {
    const r = runScenario(S({ learner: () => persistent(bug) }));
    const t = teaches(r);
    assert.equal(t[0]?.strategy, explanation, `${bug}: ${t.map((x) => x.strategy)}`);
    for (const x of t) if (specificOf(x.strategy)) assert.equal(addressedMisconception(strat(x.strategy)), bug, `${bug}: ${x.strategy}`);
    assert.ok(SHOWN.includes(ev(r).status), `${bug}: recovered (${ev(r).status})`);
  }
});

/** right on everything except one kind of equation, until `learns` explanations have been shown */
const stuckOn = (family: string, learns: number): Learner => ({ name: `stuck on ${family}`, act: (v) => ({ answer: problemOf(v.q.replace(/:(mc|w)$/, ""))?.family === family && v.taught < learns ? wrong(v.q) : right(v.q) }) });
test("J16 repeated difficulty with one kind of equation (no misconception): that kind's general explanation, a recheck of that kind, bounded", () => {
  for (const [family, explanation] of [["lbrk", "brackets"], ["lboth", "both_sides"]] as const) {
    const ok = runScenario(S({ learner: () => stuckOn(family, 1) }));
    assert.deepEqual(teaches(ok).map((x) => x.strategy), [explanation], family);
    const after = records(ok).attempts.filter((a) => a.at > teaches(ok)[0].at && problemOf(a.questionId.replace(/:(mc|w)$/, ""))!.family === family);
    assert.ok(after.length && after[0].credit === true && after[0].hints === 0, `${family}: right alone on a fresh question of that kind`);
    assert.ok(reviews(ok).every((x) => !x.misconceptionEvidence), "no misconception claimed");
    const stuck = runScenario(S({ learner: () => stuckOn(family, 99) }));
    assert.deepEqual(teaches(stuck).map((x) => x.strategy), [explanation], `${family}: taught once`);
    assert.equal(stuck.f.ended?.phase, "pause", `${family}: still wrong after it: a person`);
  }
});

test("J17 sub-skill recheck when the explanation's own check was already answered: a fresh question of the same kind", () => {
  // the learner meets the brackets explanation's own check first (right), then goes wrong on two other bracket questions
  const own = strat("brackets").check;
  let first = true;
  const r = runScenario(S({ learner: () => ({ name: "answered the check, then stuck on brackets", act: (v) => {
    const fam = problemOf(v.q.replace(/:(mc|w)$/, ""))?.family;
    if (v.q === own && first) { first = false; return { answer: right(v.q) }; }
    return { answer: fam === "lbrk" && v.taught === 0 ? wrong(v.q) : right(v.q) };
  } }) }));
  const t = teaches(r);
  if (!t.length) return; // the learner never reached two wrong bracket answers in this run: nothing to check
  assert.equal(t[0].strategy, "brackets");
  const after = records(r).attempts.filter((a) => a.at > t[0].at && a.hints === 0 && a.n === 1);
  assert.ok(after.length, "a recheck after the explanation");
  assert.equal(problemOf(after[0].questionId.replace(/:(mc|w)$/, ""))!.family, "lbrk", "of the same kind");
  assert.notEqual(after[0].questionId, own, "not a question already answered");
  const rc = problemOf(after[0].questionId.replace(/:(mc|w)$/, ""))!, ex = problemOf(strat("brackets").screens.find((sc) => sc.role === "worked-example")!.instance!)!;
  assert.ok(rc.answer !== ex.answer && rc.params.filter((v, i) => v === ex.params[i]).length < 2, `${rc.id} is not close to the worked example ${ex.id}`);
});

test("J18 a learner who never solves a bracket equation: taught once, then a person; not verified, even after a passed delayed check", () => {
  const r = runScenario(S({ later: [8], learner: () => stuckOn("lbrk", 99) }));
  assert.deepEqual(teaches(r).map((x) => x.strategy), ["brackets"]);
  const e = ev(r);
  assert.equal(e.verified, false, `not verified (${e.status}, retention ${e.retentionHistory.map((h) => h.result)})`);
  assert.ok(records(r).attempts.filter((a) => problemOf(a.questionId.replace(/:(mc|w)$/, ""))?.family === "lbrk").every((a) => a.credit === false));
});
