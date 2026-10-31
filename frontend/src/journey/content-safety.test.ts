/**
 * Workstream A2: end-to-end content-safety tests (explanation-review@1, misconception-evidence@1) through the integrated components
 * (real grader, records, evidence, adaptive engine, teaching gate and registry; only learner actions scripted).
 *
 * Approvals used here are IN-MEMORY TEST FIXTURES (reviewer "test-fixture-educator", never written to the registry): the committed registry
 * approves nothing. Each test restores the registry and the teaching mode.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { moduleFor, question, type Module, type Strategy } from "../../../packages/learning/src/content";
import {
  addressedMisconception, approvalDigest, chapterExplanation, contentEligibility, contentHash, explanationBlocklist, explanationId, explanationRegistry, isMisconceptionSpecific, setExplanationRegistry, setTeachingMode, teachingMode, validateRegistry,
  type ExplanationRegistry, type TeachingMode,
} from "../../../packages/learning/src/explanation-review";
import { modules } from "../../../packages/learning/src/content";
import { teachingLesson } from "../../../packages/learning/src/teaching-contract";
import { moduleState } from "../../../packages/learning/src/intervention";
import { learners, right, wrong } from "./learners";
import { runScenario, SCENARIOS, type Scenario } from "./scenarios";
import { SliceSession } from "./session";

const LIN = "gen:lin:2,17,11";
const LINC = question(LIN).competency;
const FIX = "test-fixture-educator";
const sc = (id: string) => SCENARIOS.find((s) => s.id === id)!;
const teaches = (r: ReturnType<typeof runScenario>) => r.f.session.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; strategy: string; at: string }[];
const reviews = (r: ReturnType<typeof runScenario>) => r.f.session.trace.filter((t) => t.component === "explanation-review.contentEligibility").map((t) => ({ ...(t.input as { strategy: string; mode: TeachingMode }), ...(t.output as { eligible: boolean; status: string; educatorApproved: boolean; label: string; misconceptionEvidence: boolean; basis: string }) }));
const strat = (m: Module, id: string) => m.strategies.find((s) => s.id === id)!;
const clone = (): ExplanationRegistry => JSON.parse(JSON.stringify(explanationRegistry()));

/** A registry in which a test-fixture educator approved the CURRENT revision of the given explanations. */
function approved(pick: (m: Module, s: Strategy) => boolean, edit?: (r: ExplanationRegistry) => void): ExplanationRegistry {
  const r = clone();
  r.reviewers = [{ id: FIX, role: "educator", addedAt: "2026-01-01T00:00:00.000Z", addedBy: "content-safety.test.ts (in memory only)", note: "test fixture, never committed" }];
  for (const m of modules)
    for (const s of [...m.strategies, ...(m.chapter.length ? [chapterExplanation(m)] : [])]) {
      if (!pick(m, s)) continue;
      const e = r.entries.find((x) => x.id === explanationId(m.competency, s.id))!;
      const cur = e.revisions.find((x) => x.contentHash === contentHash(m.competency, s))!;
      if (cur.status === "blocked") continue;
      Object.assign(cur, { status: "approved", provenance: { source: "educator", by: FIX, at: "2026-06-01T00:00:00.000Z", note: "fixture" }, reviewerRole: "educator", reviewer: FIX, reviewedAt: "2026-06-01T00:00:00.000Z", knownIssues: [], scope: ["demonstration", "supervised-evaluation"] });
      cur.approvalDigest = approvalDigest(e.id, cur);
    }
  edit?.(r);
  return r;
}
function within<T>(mode: TeachingMode, reg: ExplanationRegistry | null, fn: () => T): T {
  const pm = setTeachingMode(mode), pr = reg ? setExplanationRegistry(reg) : null;
  try { return fn(); } finally { setTeachingMode(pm); if (pr) setExplanationRegistry(pr); }
}
const lin = () => moduleFor(LINC)!;
const allLin = (m: Module) => m.competency === LINC;

test("0 the committed registry covers every explanation, validates, and approves nothing", () => {
  const reg = explanationRegistry();
  assert.deepEqual(validateRegistry(reg, modules), []);
  assert.equal(reg.reviewers.length, 0, "no authorised reviewer is invented");
  assert.equal(reg.entries.flatMap((e) => e.revisions).filter((r) => r.status === "approved").length, 0, "nothing is approved");
  assert.equal(teachingMode(), "demonstration");
  const current = new Set(modules.flatMap((m) => [...m.strategies.map((s) => explanationId(m.competency, s.id)), ...(m.chapter.length ? [explanationId(m.competency, "chapter")] : [])]));
  assert.equal(reg.entries.filter((e) => current.has(e.id)).length, current.size, "every explanation and every concept section");
  // records of retired explanations stay as history (A3 replaced three linear-equations explanations); none of them can be shown
  for (const e of reg.entries.filter((x) => !current.has(x.id))) assert.ok(!moduleFor(e.competency)?.strategies.some((s) => s.id === e.strategy), e.id);
  assert.equal(explanationBlocklist().entries.length, 4, "the four known-invalid revisions are on the blocklist");
});

test("1 an approved explanation is shown when every eligibility condition passes", () => {
  const r = within("supervised-evaluation", approved(allLin), () => runScenario(sc("2a")));
  const t = teaches(r);
  assert.ok(t.length >= 1, "taught");
  const rv = reviews(r);
  assert.ok(rv.length && rv.every((x) => x.eligible && x.educatorApproved && x.status === "approved" && /Approved by an educator/.test(x.label)), JSON.stringify(rv));
});

test("2 a pending explanation is refused in supervised mode (and shown, labelled, in demonstration)", () => {
  const m = lin(), s = strat(m, "two_steps");
  const sup = contentEligibility(m, s, { competency: m.competency, mode: "supervised-evaluation" });
  assert.equal(sup.eligible, false);
  assert.ok(sup.failed.includes("approved-for-usage"), sup.failed.join());
  const demo = contentEligibility(m, s, { competency: m.competency, mode: "demonstration" });
  assert.equal(demo.eligible, true);
  assert.equal(demo.educatorApproved, false);
  assert.match(demo.label, /not been approved by an educator/);
});

test("3 a blocked explanation is refused in every mode, as intervention and on the lesson page, even if 'approved' alongside", () => {
  const m = moduleFor("MATH.number.multiplication-tables")!;
  const old = { ...strat(m, "doubling"), screens: [{ ...strat(m, "doubling").screens[0], text: ["Start from 7 × 2 = 14 and double three times: 28, then 56."] }] };
  const mod = { ...m, strategies: m.strategies.map((s) => (s.id === "doubling" ? old : s)) };
  for (const mode of ["demonstration", "supervised-evaluation"] as const) {
    const e = contentEligibility(mod, old, { competency: m.competency, mode });
    assert.equal(e.status, "blocked", "the earlier, wrong revision is recorded as blocked");
    assert.equal(e.eligible, false);
    assert.ok(e.failed.includes("not-blocked"));
    within(mode, null, () => assert.ok(!teachingLesson(mod, []).blocks.some((b) => b.text.join(" ").includes("double three times")), "not on the lesson page"));
  }
  // every one of the four known-invalid revisions is blocked, and none is the current content
  const blocked = explanationRegistry().entries.flatMap((e) => e.revisions.filter((r) => r.status === "blocked").map((r) => ({ e, r })));
  assert.equal(blocked.length, 4);
  for (const { e, r } of blocked) { const mm = moduleFor(e.competency)!; assert.notEqual(contentHash(mm.competency, strat(mm, e.strategy)), r.contentHash, `${e.id} current content is not the blocked revision`); }
  // relabelling the blocked revision in the registry does not unblock it: the blocklist still refuses it
  const reg = clone();
  Object.assign(reg.entries.find((x) => x.id === explanationId(m.competency, "doubling"))!.revisions.find((r) => r.status === "blocked")!, { status: "pending_review", knownIssues: [] });
  const e2 = contentEligibility(mod, old, { competency: m.competency, mode: "demonstration" }, reg);
  assert.equal(e2.eligible, false);
  assert.ok(e2.failed.includes("not-blocked"), e2.failed.join());
  assert.ok(validateRegistry(reg, modules).some((p) => p.includes("blocklisted revision not recorded as blocked")));
});

test("3b the concept section is gated like an explanation: refused in supervised mode until approved", () => {
  const m = lin();
  within("supervised-evaluation", null, () => {
    assert.equal(contentEligibility(m, chapterExplanation(m), { competency: m.competency, usage: "lesson" }).eligible, false);
    assert.equal(teachingLesson(m, []).blocks.length, 0, "nothing unapproved on the lesson page");
  });
  within("supervised-evaluation", approved(allLin), () => {
    const l = teachingLesson(m, []);
    assert.ok(l.blocks.length > 0);
    assert.equal(l.contentLabel, "Approved by an educator for supervised evaluation.");
  });
  assert.match(teachingLesson(m, []).contentLabel, /^Demonstration/);
});

test("4 modified content is refused when its approval no longer matches the content", () => {
  const reg = approved(allLin);
  const m = lin(), s = strat(m, "two_steps");
  const edited = { ...s, screens: s.screens.map((x, i) => (i === 0 ? { ...x, text: [...x.text, "An extra sentence added after review."] } : x)) };
  const mod = { ...m, strategies: m.strategies.map((x) => (x.id === s.id ? edited : x)) };
  for (const mode of ["demonstration", "supervised-evaluation"] as const) {
    assert.equal(contentEligibility(m, s, { competency: m.competency, mode }, reg).eligible, true, `unchanged: eligible in ${mode}`);
    const e = contentEligibility(mod, edited, { competency: m.competency, mode }, reg);
    assert.equal(e.eligible, false);
    assert.ok(e.failed.includes("revision"), e.failed.join());
    assert.equal(e.educatorApproved, false);
  }
});

test("5 a missing explanation is handled safely (no substitute, structured result)", () => {
  const m = lin();
  for (const [mod, s] of [[m, undefined], [null, strat(m, "two_steps")], [m, { ...strat(m, "two_steps"), id: "not_in_module" }], [m, { ...strat(m, "two_steps"), screens: [] }]] as const) {
    const e = contentEligibility(mod as Module | null, s as Strategy | undefined, { competency: m.competency });
    assert.equal(e.eligible, false);
    assert.deepEqual(e.failed, ["exists"]);
    assert.equal(e.status, "unreviewed");
  }
});

test("6 an explanation for another skill is refused", () => {
  const m = lin(), s = strat(m, "two_steps");
  const e = contentEligibility(m, s, { competency: "MATH.number.integer-add" });
  assert.equal(e.eligible, false);
  assert.ok(e.failed.includes("competency"));
  const reg = clone();
  reg.entries.find((x) => x.id === explanationId(m.competency, s.id))!.competency = "MATH.number.integer-add";
  assert.ok(contentEligibility(m, s, { competency: m.competency }, reg).failed.includes("integrity"), "a record re-pointed at another skill is refused");
});

test("7 an unverified misconception never triggers misconception-specific teaching; an established one does", () => {
  for (const id of ["4a", "4c", "5b", "4f", "2b", "2c", "5a", "5c", "2a", "3h"]) {
    const r = runScenario(sc(id));
    for (const x of reviews(r)) {
      const m = moduleFor(teaches(r)[0]?.competency ?? LINC);
      const s = m?.strategies.find((y) => y.id === x.strategy);
      if (s && isMisconceptionSpecific(s)) assert.ok(x.misconceptionEvidence, `${id}: ${x.strategy} taught without an established misconception (${x.basis})`);
    }
    if (["4a", "4c", "5b"].includes(id)) assert.ok(!teaches(r).some((t) => { const mm = moduleFor(t.competency); const st = mm?.strategies.find((y) => y.id === t.strategy); return !!st && isMisconceptionSpecific(st); }), `${id}: no misconception-specific explanation without evidence`);
  }
  assert.ok(teaches(runScenario(sc("2a"))).some((t) => t.strategy === "fix_finish"), "control: established forgot-divide is taught with its own explanation");
  const m = lin(), s = strat(m, "fix_finish");
  const about = addressedMisconception(s);
  assert.ok(about, "the misconception it is about is read from its content");
  assert.ok(contentEligibility(m, s, { competency: m.competency, misconceptionEvidence: false }).failed.includes("misconception-evidence"));
  assert.ok(contentEligibility(m, s, { competency: m.competency, misconceptionEvidence: ["some-other-misconception"] }).failed.includes("misconception-evidence"), "a different established misconception does not license it");
  assert.equal(contentEligibility(m, s, { competency: m.competency, misconceptionEvidence: [about!] }).eligible, true);
  assert.ok(contentEligibility(m, s, { competency: m.competency, usage: "lesson" }).eligible, "a general lesson page claims no diagnosis");
});

test("8 an approved general explanation is used when no misconception is established", () => {
  const r = within("supervised-evaluation", approved(allLin), () => runScenario(sc("4a")));
  const t = teaches(r);
  assert.ok(t.length >= 1, "taught");
  for (const x of t) assert.ok(!isMisconceptionSpecific(strat(lin(), x.strategy)), `general: ${x.strategy}`);
  assert.ok(reviews(r).every((x) => x.educatorApproved && !x.misconceptionEvidence));
});

test("9 no eligible explanation: a bounded pause, no teaching, no mastery", () => {
  for (const id of ["2a", "4a", "5b"]) {
    const r = within("supervised-evaluation", null, () => runScenario(sc(id)));
    assert.equal(teaches(r).length, 0, `${id}: nothing taught`);
    assert.ok(r.terminated, `${id}: the run ends`);
    assert.equal(r.f.ended?.phase, "pause", `${id}: ${r.f.ended?.phase}`);
    const ev = r.f.session.state().evidence(r.f.session.competency);
    assert.ok(!["independent", "transfer", "verified"].includes(ev.status), `${id}: no mastery (${ev.status})`);
    const pauses = r.f.session.trace.filter((t) => t.component === "intervention.moduleState" && (t.output as { phase: string }).phase === "pause").map((t) => (t.output as { reason: string }).reason);
    assert.ok(pauses.some((p) => /educator-approved explanation|teacher or parent/.test(p)), pauses.join(" | "));
  }
});

test("10 a failed delayed check still requires recovery under the content gate (supervised, nothing approved)", () => {
  within("supervised-evaluation", null, () => {
    const r = runScenario({ id: "cs10", category: 6, start: LIN, learner: () => learners.strong(), expect: {} } as Scenario);
    r.f.later(8);
    assert.equal(r.f.currentPhase, "retention");
    r.f.on({ type: "answer_submitted", value: wrong(r.f.currentQuestion!), timestamp: 0 });
    const st = r.f.session.state(), ev = st.evidence(r.f.session.competency);
    assert.equal(ev.recoveryRequired, true);
    assert.equal(ev.verified, false);
    const ms = moduleState(r.f.session.competency, st.records, ev, r.f.session.now, r.f.session.session, null, st.evidence);
    assert.notEqual(ms.phase, "done");
    assert.ok(ms.phase !== "chapter", "no unapproved teaching");
  });
});

test("11 teaching displayed is not success: only a right answer alone after it counts", () => {
  const r = runScenario(sc("5b"));
  assert.ok(teaches(r).length >= 1, "taught");
  const st = r.f.session.state(), ev = st.evidence(r.f.session.competency);
  assert.ok(!["independent", "transfer", "verified"].includes(ev.status), `never right alone: ${ev.status}`);
  const after = st.records.attempts.filter((a) => a.at > teaches(r)[0].at && a.activity === "check");
  assert.ok(after.length >= 1 && after.every((a) => a.credit === false), "the recheck after teaching was asked and stayed wrong");
});

test("12 a restart preserves evidence, the recovery requirement and the content decision", () => {
  const r = runScenario({ id: "cs12", category: 6, start: LIN, learner: () => learners.strong(), expect: {} } as Scenario);
  r.f.later(8);
  r.f.on({ type: "answer_submitted", value: wrong(r.f.currentQuestion!), timestamp: 0 });
  const s0 = r.f.session, ev0 = s0.state().evidence(s0.competency);
  const restored = SliceSession.fromEvents(s0.learnerId, s0.competency, JSON.parse(JSON.stringify(s0.events)), s0.now, s0.session);
  const ev1 = restored.state().evidence(s0.competency);
  for (const k of ["status", "verified", "recoveryRequired", "independentAt", "retention"] as const) assert.deepEqual(ev1[k], ev0[k], k);
  assert.deepEqual(ev1.retentionHistory, ev0.retentionHistory);
  const st0 = s0.state(), st1 = restored.state();
  const ms0 = moduleState(s0.competency, st0.records, ev0, s0.now, s0.session, null, st0.evidence), ms1 = moduleState(s0.competency, st1.records, ev1, s0.now, s0.session, null, st1.evidence);
  assert.deepEqual([ms1.phase, ms1.question, ms1.strategy?.id ?? null, ms1.contentReview?.status ?? null], [ms0.phase, ms0.question, ms0.strategy?.id ?? null, ms0.contentReview?.status ?? null], "the next step after restart is the same");
});

test("13 demonstration teaching cannot promote content into approved instruction", () => {
  const before = JSON.stringify(explanationRegistry());
  const r = runScenario(sc("2a"));
  assert.ok(teaches(r).length >= 1);
  assert.equal(JSON.stringify(explanationRegistry()), before, "the registry is unchanged by use");
  for (const x of reviews(r)) { assert.equal(x.educatorApproved, false); assert.match(x.label, /^Demonstration/); }
  for (const t of teaches(r)) { const m = moduleFor(t.competency)!; assert.equal(contentEligibility(m, strat(m, t.strategy), { competency: m.competency, mode: "supervised-evaluation", misconceptionEvidence: true }).eligible, false, `${t.strategy} still not usable in supervised evaluation`); }
});

test("14 forged or altered review metadata cannot bypass eligibility", () => {
  const m = lin(), s = strat(m, "two_steps"), id = explanationId(m.competency, s.id), h = contentHash(m.competency, s);
  const rev = (r: ExplanationRegistry) => r.entries.find((x) => x.id === id)!.revisions.find((x) => x.contentHash === h)!;
  const forgeries: [string, (r: ExplanationRegistry) => void][] = [
    ["approved by AI screening", (r) => { const v = rev(r); v.provenance = { ...v.provenance, source: "ai-screening" }; v.approvalDigest = approvalDigest(id, v); }],
    ["approved by an unlisted reviewer", (r) => { const v = rev(r); v.reviewer = "someone-else"; v.provenance.by = "someone-else"; v.approvalDigest = approvalDigest(id, v); }],
    ["reviewer listed without the educator role", (r) => { (r.reviewers[0] as { role: string }).role = "engineer"; }],
    ["digest left from another revision", (r) => { rev(r).approvalDigest = approvalDigest(id, { ...rev(r), contentHash: "sha256:0" }); }],
    ["no digest", (r) => { delete rev(r).approvalDigest; }],
    ["reviewed before the reviewer was authorised", (r) => { const v = rev(r); v.reviewedAt = "2025-01-01T00:00:00.000Z"; v.approvalDigest = approvalDigest(id, v); }],
    ["intervention type altered", (r) => { r.entries.find((x) => x.id === id)!.intervention = "recall"; }],
    ["misconception flag cleared", (r) => { const sm = r.entries.find((x) => x.id === explanationId(m.competency, "fix_finish"))!; sm.misconceptionSpecific = false; }],
    ["addressed misconception altered", (r) => { r.entries.find((x) => x.id === id)!.addresses = "forgot-divide"; }],
    ["supervised scope on a pending revision", (r) => { const v = rev(r); Object.assign(v, { status: "pending_review", reviewer: undefined, reviewerRole: "none", provenance: { source: "registry", by: "x", at: "2026-01-01", note: "" }, approvalDigest: undefined, scope: ["demonstration", "supervised-evaluation"] }); }],
    ["blocked revision relabelled approved without an educator", (r) => { const v = rev(r); Object.assign(v, { status: "approved", reviewerRole: "ai-reviewer", reviewer: undefined, approvalDigest: undefined }); }],
  ];
  for (const [name, forge] of forgeries) {
    const reg = approved(allLin, forge);
    const target = name === "misconception flag cleared" ? strat(m, "fix_finish") : s;
    const e = contentEligibility(m, target, { competency: m.competency, mode: "supervised-evaluation", misconceptionEvidence: true }, reg);
    assert.equal(e.eligible, false, `${name}: refused in supervised evaluation`);
    assert.equal(e.educatorApproved, false, name);
    assert.ok(validateRegistry(reg, modules).length > 0, `${name}: the registry check reports it`);
    // and end to end: the engine teaches nothing from the forged record
    const r = within("supervised-evaluation", reg, () => runScenario(sc("4a")));
    assert.ok(!teaches(r).some((t) => t.strategy === target.id), `${name}: not taught`);
  }
});
