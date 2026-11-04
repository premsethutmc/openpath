/**
 * Two geometry skills taught inside their existing template modules (G5 / PR #95 finding: a learner reached transfer without
 * being taught or rechecked on the exterior-angle or vertically-opposite misconception):
 *   MATH.geometry.triangle-properties · triangle-properties.exterior-angle@1 (ahext)  → exterior_angle, exterior_via_third
 *   MATH.geometry.angle-pairs         · angle-pairs.opposite@2 (afcross mode 0)       → vertically_opposite, crossed_pencils
 * Text from the TP-GEO-01 / TP-GEO-02 review candidates (feat/math-teaching-content@4e655e73); pending educator review.
 * Synthetic learners only; the engine chooses what to ask and what to teach.
 *
 * Tests marked `todo` state a requirement the shared engine does not meet yet (they run and report, and do not fail the
 * suite); each names its reproducer. They are left for the integration owner of intervention.ts / the evidence engine.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { exposureKey, FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
import { isMisconceptionSpecific } from "../../../packages/learning/src/explanation-review";
import { reviewStrategy, teachable } from "../../../packages/learning/src/intervention";
import { connectedSkill, connectionConfig, strategyConnects } from "../../../packages/learning/src/skill-connections";
import { misconception, learners } from "./learners";
import { runScenario, type Run } from "./scenarios";
import { SliceSession } from "./session";
import { START_CROSS, START_EXT } from "./geometry-journeys";

const TRI = "MATH.geometry.triangle-properties", PAIRS = "MATH.geometry.angle-pairs";
const SKILLS = [
  { competency: TRI, skill: "triangle-properties.exterior-angle@1", family: "ahext", start: START_EXT, bugs: ["third-interior", "adjacent-interior", "exterior-as-interior"], first: "exterior_angle", strategies: ["exterior_angle", "exterior_via_third"], widget: "triangle" },
  { competency: PAIRS, skill: "angle-pairs.opposite@2", family: "afcross", start: START_CROSS, bugs: ["opposite-as-linear"], first: "vertically_opposite", strategies: ["vertically_opposite", "crossed_pencils"], widget: "angle" },
] as const;
const at = Date.parse("2026-11-04T09:00:00Z");
const base = (id: string) => id.replace(/:(mc|w)$/, "");
const skillOf = (c: string, id: string) => connectedSkill(connectionConfig(c)!, id);
const registry = () => (JSON.parse(readFileSync(new URL("../../../content/learning/explanation-review.v1.json", import.meta.url), "utf8")).entries as { competency: string; strategy: string; revisions: { status: string }[] }[]);

for (const S of SKILLS) test(`${S.skill}: general skill-scoped teaching exists, is eligible without misconception evidence, and is pending review`, () => {
  const m = moduleFor(S.competency)!, config = connectionConfig(S.competency)!;
  const scoped = m.strategies.filter((s) => s.scope?.subSkill === S.skill);
  assert.deepEqual(scoped.map((s) => s.id), [...S.strategies]);
  for (const s of scoped) {
    assert.equal(isMisconceptionSpecific(s), false, `${s.id} is general teaching, not a misconception fix`);
    assert.ok(teachable(m, s, []), `${s.id} needs no misconception evidence`);
    assert.ok(strategyConnects(config, S.skill, s), `${s.id} connects to ${S.skill}`);
    for (const id of [...s.screens.map((x) => x.instance!), s.guided, s.check]) assert.equal(skillOf(S.competency, id), S.skill, `${s.id}: ${id}`);
    assert.ok(s.screens.every((x) => (x.widget as { type?: string } | undefined)?.type === S.widget), `${s.id}: the existing visuals@2 picture`);
    const recs = registry().filter((r) => r.competency === S.competency && r.strategy === s.id);
    assert.equal(recs.length, 1); assert.equal(recs[0].revisions.at(-1)!.status, "pending_review", `${s.id} awaits an educator`);
  }
  // the template module is unchanged apart from the appended explanations
  assert.ok(m.strategies.slice(0, m.strategies.length - scoped.length).every((s) => !s.scope));
  // "Review a supported lesson" on a question of this skill opens this skill's lesson, not the main family's
  const q = pool(S.family).items.map((p) => p.id).find((id) => skillOf(S.competency, id) === S.skill)!;
  assert.equal(reviewStrategy(m, { attempts: [], unresolved: [], pending: [] } as never, q)?.id, S.first);
});

test("missing contrast checks: no misconception fix is published for these skills, because the families declare no contrast evidence", () => {
  // misconception-evidence: the families' modelled conceptual errors carry no `evidence.correctContrasts`, so two matching
  // answers cannot be told apart from a repeated slip or misreading. Only general teaching is added; TP-GEO-01/02's fix_*
  // screens stay unpublished until contrasts are declared (reported as a gap).
  for (const [fam, ids] of [["ahext", ["third-interior", "adjacent-interior", "exterior-as-interior"]], ["afcross", ["opposite-as-linear", "neighbour-equal"]]] as const) {
    const items = pool(fam).items.slice(0, 50);
    for (const id of ids) assert.ok(items.every((p) => p.bugs.filter((b) => b.id === id).every((b) => !b.evidence)), `${fam} ${id}: no contrast declared`);
  }
  for (const c of [TRI, PAIRS]) assert.ok(!moduleFor(c)!.strategies.some((s) => s.addresses), `${c}: no misconception-specific explanation`);
});

/** wrong answer → investigation → teaching → guided → fresh same-skill check → save and reload, through the app's recovery */
for (const S of SKILLS) test(`${S.skill}: a wrong answer leads to this skill's teaching, a fresh question on the same skill, and survives a reload`, () => {
  const original = base(S.start);
  const L = new SliceSession(`geo2-${S.family}`, S.competency, at);
  let taught = false;
  const answer = (id: string) => (!taught ? misconception(id, new Set(S.bugs)) : null) ?? question(id).answer;
  assert.equal(L.submit(original, answer(original), "practice").credit, false, "the misconception's wrong answer");
  const seen = new Set([exposureKey(original)]);
  // one wrong answer is not a diagnosis: the engine asks one more question on the same skill first
  let r = L.recover(original);
  assert.equal(r.phase, "investigate", r.reason);
  assert.equal(skillOf(S.competency, r.question!), S.skill); assert.ok(!seen.has(exposureKey(r.question!)));
  seen.add(exposureKey(r.question!));
  L.submit(r.question!, answer(r.question!), "diagnostic", { context: `investigate:${original}` });
  r = L.recover(original);
  assert.equal(r.phase, "teach", r.reason);
  const lesson = L.next(S.competency, { inRecovery: true });
  assert.equal(lesson.phase, "chapter"); assert.equal(lesson.strategy!.id, S.first, "this skill's general explanation");
  assert.equal(lesson.contentReview?.status, "pending_review"); assert.equal(lesson.contentReview?.educatorApproved, false);
  L.taught(lesson); taught = true;
  const g = L.next(S.competency, { inRecovery: true });
  assert.equal(g.phase, "guided"); assert.equal(skillOf(S.competency, g.question!), S.skill);
  seen.add(exposureKey(g.question!));
  assert.equal(L.submit(g.question!, answer(g.question!), "guided").credit, true);
  const c = L.next(S.competency, { inRecovery: true });
  assert.equal(c.phase, "check", c.reason);
  assert.equal(skillOf(S.competency, c.question!), S.skill, "the fresh question is on the same skill");
  assert.ok(!seen.has(exposureKey(c.question!)), "and has not been seen");
  // save and reload: the saved records alone (JSON round trip) give the same next step
  const reloaded = new SliceSession(L.learnerId, S.competency, L.now);
  reloaded.events.push(...JSON.parse(JSON.stringify(L.events)));
  Object.assign(reloaded.decisions, JSON.parse(JSON.stringify(L.decisions)));
  reloaded.session = L.session;
  const c2 = reloaded.next(S.competency, { inRecovery: true });
  assert.deepEqual([c2.phase, c2.question, c2.strategy?.id], [c.phase, c.question, c.strategy?.id], "the same fresh question after reload");
  assert.equal(reloaded.submit(c2.question!, answer(c2.question!), "check").credit, true);
});

const flows = new Map<string, Run>();
const flow = (S: (typeof SKILLS)[number], untilTaught: number, bugs: readonly string[] = S.bugs) => {
  const key = `${S.skill}:${untilTaught}:${bugs.join("+")}`;
  if (!flows.has(key)) flows.set(key, runScenario({ id: `geo2-${S.family}-${untilTaught}-${bugs.length}`, category: 2, start: S.start, learner: () => learners.misconception([...bugs], untilTaught), later: [8], expect: {} }));
  return flows.get(key)!;
};
/** the saved records in order: teaching events and answers (the app's own records) */
type Step = { kind: "teach"; strategy: string } | { kind: "attempt"; q: string; activity: string; right: boolean };
const timeline = (r: Run): Step[] => r.f.session.events.flatMap((e): Step[] => {
  const x = e as { record?: string; strategy?: string; questionId?: string; activity?: string; response?: string };
  if (x.record === "teach") return [{ kind: "teach", strategy: x.strategy! }];
  if (x.record === "attempt" && x.questionId!.startsWith("gen:")) return [{ kind: "attempt", q: x.questionId!, activity: x.activity!, right: String(question(x.questionId!).answer) === x.response }];
  return [];
});
const taughtIn = (r: Run) => timeline(r).flatMap((s) => (s.kind === "teach" ? [s.strategy] : []));
/** the first answer on the learner's own (not guided) after the first teaching */
const afterTeaching = (r: Run) => { const t = timeline(r); const i = t.findIndex((s) => s.kind === "teach"); return { before: t.slice(0, i), next: t.slice(i + 1).find((s): s is Extract<Step, { kind: "attempt" }> => s.kind === "attempt" && s.activity !== "guided") }; };

for (const S of SKILLS) test(`${S.skill}: in the app's module flow the misconception is taught with this skill's explanation`, () => {
  assert.deepEqual(taughtIn(flow(S, 1)), [S.first]);
});

test("triangle-properties.exterior-angle@1: a later delayed (retention) question on the same skill is selected", () => {
  const r = flow(SKILLS[0], 1);
  const ret = r.actions.filter((a) => a.activity === "retention").map((a) => a.q);
  assert.ok(ret.some((q) => skillOf(TRI, q) === SKILLS[0].skill), `retention asked: ${ret}`);
});

test("angle-pairs.opposite@2: a later delayed (retention) question on the same skill is selected", { todo: "GAP: module retention is [gen:afpair:0,34, gen:afcross:89,1:mc]; 89,1 is angle-pairs.adjacent@2. The retention partition holds opposite items (e.g. gen:afcross:42,0) but neither the template synthesis (library.ts subSkills: first afcross retention item) nor the retention selector is skill-scoped" }, () => {
  const r = flow(SKILLS[1], 1);
  const ret = r.actions.filter((a) => a.activity === "retention").map((a) => a.q);
  assert.ok(ret.some((q) => skillOf(PAIRS, q) === SKILLS[1].skill), `retention asked: ${ret}`);
});

for (const S of SKILLS) test(`${S.skill}: the first question on the learner's own after teaching is a fresh question on the taught skill`, S.family === "afcross" ? { todo: "BLOCKED (shared engine, intervention.ts): the strategy's own check (gen:afcross:158,0:mc) was already served before teaching as an untaught strategy's check; the fallback fromPool(m, \"check\") is not skill-scoped and serves gen:afcross:149,2 (angle-pairs.other-three@2)" } : {}, () => {
  const { before, next } = afterTeaching(flow(S, 1));
  assert.ok(next, "a question follows the teaching");
  assert.equal(skillOf(S.competency, next!.q), S.skill, next!.q);
  assert.ok(!before.some((s) => s.kind === "attempt" && exposureKey(s.q) === exposureKey(next!.q)), "fresh");
  assert.equal(next!.right, true);
});

/**
 * Transfer gate (the PR #95 finding). BLOCKED for integration: both need the shared engine (intervention.ts moduleState order of
 * practice → transfer → checks, owned by the integration worker; and the competency evidence status, which reads competency-level
 * answers, not the mapped skills). Reproducer: `runScenario` with START_EXT / START_CROSS and learners.misconception([...], n).
 */
const TRANSFER_TODO = "BLOCKED (shared engine): moduleState serves transfer questions after a wrong, unrechecked answer on a mapped skill of the competency";
for (const S of SKILLS) test(`${S.skill}: no transfer question while the skill's latest independent answer is wrong and not rechecked`, { todo: TRANSFER_TODO }, () => {
  // from the first wrong answer on the skill until the first right answer on it on the learner's own AFTER teaching
  const t = timeline(flow(S, 1));
  const wrongAt = t.findIndex((s) => s.kind === "attempt" && !s.right && skillOf(S.competency, s.q) === S.skill);
  const taughtAt = t.findIndex((s) => s.kind === "teach");
  const okAt = t.findIndex((s, k) => k > taughtAt && s.kind === "attempt" && s.right && s.activity !== "guided" && skillOf(S.competency, s.q) === S.skill);
  assert.ok(wrongAt >= 0 && taughtAt > wrongAt && okAt > taughtAt);
  const served = t.slice(wrongAt + 1, okAt).flatMap((s) => (s.kind === "attempt" && s.activity === "transfer" ? [s.q] : []));
  assert.deepEqual(served, [], "transfer questions served while the skill was weak");
});
const STATUS_TODO = "BLOCKED (shared engine): the competency evidence status reaches transfer from other skills' answers while this skill is paused (PR #95 P2; sub-skill-gated mastery PR #93 is shadow only)";
for (const S of SKILLS) test(`${S.skill}: a learner who never learns the skill does not reach transfer`, { todo: STATUS_TODO }, () => {
  // PR #95 G-03 / G-06: the learner makes the first modelled error wherever it applies and never learns
  const r = flow(S, Infinity, [S.bugs[0]]);
  assert.equal(r.f.ended?.phase, "pause", "the skill pauses after its explanations were tried");
  const status = r.f.session.state().evidence(S.competency).status;
  assert.ok(!["transfer", "verified"].includes(status), `competency status ${status}`);
});

test("the shown pictures are the existing renderer's data (exterior angle with vertices; crossing lines labelled θ and ?)", () => {
  const ext = moduleFor(TRI)!.strategies.find((s) => s.id === "exterior_angle")!.screens[0];
  assert.deepEqual(ext.widget, FAMILIES.get("ahext")!.teach!.visual!(problemOf(ext.instance!)!.params));
  const opp = moduleFor(PAIRS)!.strategies.find((s) => s.id === "vertically_opposite")!.screens[0];
  assert.deepEqual(opp.widget, { type: "angle", deg: 128, cross: true, labels: ["128°", "", "?", ""] });
});
