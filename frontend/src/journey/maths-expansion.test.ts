/**
 * Maths expansion (blueprints for template-only competencies): one learner path per domain through the app's own engine
 * (SliceSession → intervention.ts, the committed explanation-review registry; nothing injected):
 *   calculus      MATH.calculus.limits             lim      "zero-for-undefined"  (0 ⁄ 0 taken as 0)
 *   algebra       MATH.algebra.inequalities        lineq    "keep-sign-negative"  (no flip when dividing by a negative)
 *   trigonometry  MATH.trigonometry.equations      atprinc  "principal-only"      (only the calculator's value)
 * wrong answer → the engine's investigation → this module's explanation (pending educator review) → guided → a fresh unaided
 * check → save and reload; then, days later, the delayed check, and a wrong delayed answer recovered on the same module.
 * Synthetic learners only. The explanations are AI-assisted and await an educator: nothing here approves them.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { exposureKey, problemOf } from "../../../packages/learning/src/families";
import { contentEligibility } from "../../../packages/learning/src/explanation-review";
import { misconception, learners } from "./learners";
import { runScenario, type Run } from "./scenarios";
import { SliceSession } from "./session";

const SKILLS = [
  { domain: "calculus", competency: "MATH.calculus.limits", family: "lim", bug: "zero-for-undefined", strategies: ["difference_of_squares", "substitute_after", "check_factoring"] },
  { domain: "algebra", competency: "MATH.algebra.inequalities", family: "lineq", bug: "keep-sign-negative", strategies: ["flip_rule", "solve_steps", "test_number"] },
  { domain: "trigonometry", competency: "MATH.trigonometry.equations", family: "atprinc", bug: "principal-only", strategies: ["quadrant_diagram", "reference_then_place", "radians_check"] },
] as const;
type Skill = (typeof SKILLS)[number];
const at = Date.parse("2026-11-06T09:00:00Z");
const base = (id: string) => id.replace(/:(mc|w)$/, "");
const registry = () => JSON.parse(readFileSync(new URL("../../../content/learning/explanation-review.v1.json", import.meta.url), "utf8")).entries as { id: string; revisions: { status: string; provenance: { source: string } }[] }[];
/** the module's own practice question on which the modelled error predicts a wrong answer */
const startOf = (S: Skill) => {
  const m = moduleFor(S.competency)!;
  const id = [...m.practice, ...m.diagnostics].map(base).find((q) => problemOf(q)?.family === S.family && misconception(q, new Set([S.bug])) !== null);
  assert.ok(id, `${S.competency}: a start question on which ${S.bug} predicts an answer`);
  return id!;
};

for (const S of SKILLS) test(`${S.domain}: the runtime module is the blueprint (not shadowed), and every explanation is registered pending review`, () => {
  const m = moduleFor(S.competency)!;
  assert.deepEqual(m.strategies.map((s) => s.id), [...S.strategies], "the app loads these explanations");
  const recs = registry();
  for (const id of [...S.strategies, "chapter"]) {
    const r = recs.find((x) => x.id === `${S.competency}#${id}`);
    assert.ok(r, `${id} has a registry record`);
    const last = r!.revisions.at(-1)!;
    assert.equal(last.status, "pending_review", `${id} awaits an educator`);
    assert.notEqual(last.provenance.source, "educator");
  }
  // eligibility through the ordinary gate: shown (labelled) in the demonstration app, refused for supervised evaluation
  for (const s of m.strategies) {
    assert.equal(contentEligibility(m, s, { competency: S.competency, mode: "demonstration" }).eligible, true, `${s.id} demonstration`);
    assert.equal(contentEligibility(m, s, { competency: S.competency, mode: "supervised-evaluation" }).eligible, false, `${s.id} supervised-evaluation`);
  }
});

for (const S of SKILLS) test(`${S.domain}: a wrong answer leads to this module's teaching, guided work, a fresh unaided check, and survives a reload`, () => {
  const original = startOf(S);
  const L = new SliceSession(`mx-${S.family}`, S.competency, at);
  let taught = false;
  const answer = (id: string) => (!taught ? misconception(id, new Set([S.bug])) : null) ?? question(id).answer;
  const first = L.submit(original, answer(original), "practice");
  assert.equal(first.credit, false, "the modelled error's wrong answer");
  const seen = new Set([exposureKey(original)]);
  let r = L.recover(original);
  if (r.phase === "investigate") {
    assert.ok(!seen.has(exposureKey(r.question!)), "the investigation asks a new question");
    seen.add(exposureKey(r.question!));
    L.submit(r.question!, answer(r.question!), "diagnostic", { context: `investigate:${original}` });
    r = L.recover(original);
  }
  assert.equal(r.phase, "teach", r.reason);
  const lesson = L.next(S.competency, { inRecovery: true });
  assert.equal(lesson.phase, "chapter", lesson.reason);
  assert.ok((S.strategies as readonly string[]).includes(lesson.strategy!.id), `taught with this module's explanation: ${lesson.strategy!.id}`);
  assert.equal(lesson.contentReview?.status, "pending_review");
  assert.equal(lesson.contentReview?.educatorApproved, false);
  L.taught(lesson); taught = true;
  const g = L.next(S.competency, { inRecovery: true });
  assert.equal(g.phase, "guided", g.reason);
  assert.equal(problemOf(base(g.question!))!.family, S.family);
  seen.add(exposureKey(g.question!));
  assert.equal(L.submit(g.question!, answer(g.question!), "guided").credit, true);
  const c = L.next(S.competency, { inRecovery: true });
  assert.equal(c.phase, "check", c.reason);
  assert.equal(problemOf(base(c.question!))!.family, S.family, "the check is on the taught skill");
  assert.ok(!seen.has(exposureKey(c.question!)), "and is a question the learner has not seen");
  // save and reload: the saved records alone (JSON round trip) give the same next step
  const reloaded = new SliceSession(L.learnerId, S.competency, L.now);
  reloaded.events.push(...JSON.parse(JSON.stringify(L.events)));
  Object.assign(reloaded.decisions, JSON.parse(JSON.stringify(L.decisions)));
  reloaded.session = L.session;
  const c2 = reloaded.next(S.competency, { inRecovery: true });
  assert.deepEqual([c2.phase, c2.question, c2.strategy?.id], [c.phase, c.question, c.strategy?.id], "the same fresh question after reload");
  assert.equal(reloaded.submit(c2.question!, answer(c2.question!), "check").credit, true);
});

const runs = new Map<string, Run>();
const flow = (S: Skill) => {
  if (!runs.has(S.competency)) runs.set(S.competency, runScenario({ id: `mx-${S.family}`, category: 2, start: startOf(S), learner: () => learners.misconception([S.bug], 1), later: [8], expect: {} }));
  return runs.get(S.competency)!;
};
for (const S of SKILLS) test(`${S.domain}: in the module flow the error is taught, and a delayed check on the module is asked days later`, () => {
  const r = flow(S);
  const taught = r.f.session.events.flatMap((e) => ((e as { record?: string }).record === "teach" ? [(e as { strategy: string }).strategy] : []));
  assert.ok(taught.length > 0 && taught.every((s) => (S.strategies as readonly string[]).includes(s) || s === "chapter"), `taught: ${taught}`);
  const ret = r.actions.filter((a) => a.activity === "retention").map((a) => a.q);
  assert.ok(ret.length > 0, "a delayed check was asked");
  assert.ok(ret.every((q) => question(q).competency === S.competency), `delayed questions: ${ret}`);
});

/**
 * After a WRONG delayed answer the failure is kept and recovery starts. What recovery does next is the shared engine's
 * (intervention.ts) and differs by module at this base: inequalities and trigonometry equations investigate with a fresh
 * question on the same competency; limits checks a mandatory graph prerequisite (MATH.algebra.functions) and then shows this
 * module's prerequisite explanation. Teaching the same skill again after a lapse is the engine change in PR #115 (e1d5ed7),
 * not part of this branch: these tests pin today's behaviour so the integration shows the difference.
 */
const AFTER_LAPSE: Record<string, { active: string | null; next: "investigate" | "prerequisite-teaching" }> = {
  "MATH.calculus.limits": { active: "MATH.algebra.functions", next: "prerequisite-teaching" },
  "MATH.algebra.inequalities": { active: null, next: "investigate" },
  "MATH.trigonometry.equations": { active: null, next: "investigate" },
};
for (const S of SKILLS) test(`${S.domain}: a wrong delayed answer is kept as failed and starts recovery (behaviour pinned at this base)`, () => {
  const r = flow(S);
  const evs = r.f.session.events;
  const i = evs.findIndex((e) => (e as { record?: string; activity?: string }).record === "attempt" && (e as { activity?: string }).activity === "retention");
  assert.ok(i > 0, "the run reached a delayed check");
  const when = Date.parse((evs[i] as { at: string }).at);
  const L = SliceSession.fromEvents(r.f.session.learnerId, S.competency, evs.slice(0, i), when, (evs[i] as { sessionId: string }).sessionId);
  assert.equal(L.state().evidence(S.competency).retention, "due");
  const n = L.next(S.competency);
  assert.equal(n.phase, "retention");
  const wrong = misconception(base(n.question!), new Set([S.bug])) ?? (n.question!.endsWith(":mc") ? ["A", "B", "C", "D"].find((x) => x !== String(question(n.question!).answer))! : "0");
  assert.equal(L.submit(n.question!, wrong, "retention").credit, false);
  assert.equal(L.state().evidence(S.competency).retentionHistory[0]?.result, "failed", "the failed delayed check stays failed");
  assert.ok(!["verified"].includes(L.state().evidence(S.competency).status), "not verified after a failed delayed check");
  const seen = new Set(L.state().records.attempts.map((a) => exposureKey(a.questionId)));
  const rc = L.recover(n.question!);
  const want = AFTER_LAPSE[S.competency];
  assert.equal(rc.active ?? null, want.active, rc.reason);
  if (want.next === "investigate") {
    // the investigation question comes with the recovery decision, or as its first step
    const q = rc.phase === "investigate" && rc.question ? rc.question : L.next(S.competency, { inRecovery: true }).question;
    assert.ok(q, rc.reason);
    assert.equal(question(q!).competency, S.competency, `investigation question ${q}`);
    assert.ok(!seen.has(exposureKey(q!)), "a fresh question");
  } else {
    const v = L.next(S.competency, { inRecovery: true });
    assert.equal(v.phase, "chapter", v.reason);
    assert.equal(v.strategy?.kind, "prerequisite");
    assert.ok((S.strategies as readonly string[]).includes(v.strategy!.id), "this module's prerequisite explanation");
  }
});
