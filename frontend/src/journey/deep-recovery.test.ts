/**
 * deep-recovery@0 (research prototype) against the shipped two-level recovery, on a real integral:
 *   gen:aupfr:1,-3,3,-2,-4  "Find ∫ (x² − 6x − 15)/(x² − 9) dx"  (MATH.calculus.integration-methods)
 * Synthetic learners only (structuredLearner: a gap skill is learnt only when taught after what it rests on). Real grader,
 * records, evidence and module teaching throughout; nothing here authors or approves content.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { questionSupports, RECOVERY_DEPTH } from "../../../packages/learning/src/intervention";
import { readRecords, withDecisions } from "../../../packages/learning/src/records";
import { exposureKey } from "../../../packages/learning/src/families";
import { runDeep, structuredLearner, traceOf, type Answerer } from "./deep-recovery-journey";
import { runScenario } from "./scenarios";
import { SliceSession } from "./session";

const P = "MATH.";
const ORIG = "gen:aupfr:1,-3,3,-2,-4";
const OWN = P + "calculus.integration-methods", PF = P + "algebra.partial-fractions", LS = P + "algebra.linear-systems", L2V = P + "algebra.linear-two-variables";
const FACT = P + "algebra.factorisation", IDS = P + "algebra.identities", IADD = P + "number.integer-add", INTS = P + "number.integers";
const T0 = Date.parse("2026-11-05T09:00:00Z");
const deepGap = (slips?: (q: string, n: number) => boolean) => structuredLearner({ "fam:aupfr": [PF], [PF]: [LS], [LS]: [L2V] }, [PF, LS, L2V], slips);
const noContent = () => structuredLearner({ "fam:aupfr": [PF], [PF]: [FACT], [FACT]: [IDS], [IDS]: [IADD], [IADD]: [INTS] }, [PF, FACT, IDS, IADD, INTS]);
const slipOnly = structuredLearner({}, [], (_q, n) => n === 0);
const session = (id: string) => new SliceSession(`synthetic-deep-${id}`, OWN, T0);
const taught = (s: SliceSession) => s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as { competency: string }).competency);
const asAnswerer = (a: Answerer) => (v: { q: string; taughtSkills: string[]; answered: number; activity: string }) => ({ answer: a(v.q, v) });

test("shipped recovery: the candidate list for the integral stops at depth 2 (linear-two-variables and integers never listed)", () => {
  assert.equal(question(ORIG).competency, OWN);
  const sup = questionSupports(ORIG, readRecords("x", []));
  assert.equal(RECOVERY_DEPTH, 2);
  assert.ok(sup.every((s) => s.depth <= 2));
  for (const id of [L2V, INTS, IADD, IDS]) assert.ok(!sup.some((s) => s.id === id), `${id} is beyond the shipped depth`);
});

test("shipped recovery, deep gap: escalates at partial fractions without assessing the depth-3 root", () => {
  const r = runScenario({ id: "deep-baseline", category: 3, start: ORIG, entry: "practice", expect: {}, learner: () => ({ name: "deep gap", act: asAnswerer(deepGap()) }) } as never);
  const qs = r.f.session.replies.length;
  const skills = r.f.session.trace.filter((t) => t.component === "server-grader.gradeRequest").map((t) => question(String((t.input as { qid: string }).qid).replace(/:(mc|w)$/, "")).competency);
  assert.ok(!skills.includes(L2V) && !skills.includes(LS), "never asks about linear systems or what they rest on");
  const rec = r.f.session.trace.filter((t) => t.component === "intervention.recovery").map((t) => t.output as { phase: string; active: string | null });
  assert.ok(rec.some((x) => x.phase === "escalate" && x.active === PF), JSON.stringify(rec.at(-1)));
  assert.ok(qs > 0);
});

test("prototype, genuine deep gap: finds the depth-3 root, teaches bottom-up, returns to a FRESH integral", () => {
  const s = session("deep");
  const { steps, final } = runDeep(s, ORIG, deepGap());
  const tr = traceOf(steps);
  assert.equal(final!.phase, "solved_after_help", tr);
  assert.deepEqual(taught(s), [L2V, LS, PF], `taught bottom-up: ${tr}`);
  const last = steps.filter((x) => x.kind === "ask").at(-1)!;
  assert.equal(last.phase, "return");
  assert.notEqual(exposureKey(last.qid!), exposureKey(ORIG), "a fresh integral, not the same one again");
  assert.equal(question(last.qid!.replace(/:(mc|w)$/, "")).competency, OWN);
  assert.ok(last.correct);
  // no question is ever asked twice
  const asked = steps.filter((x) => x.kind === "ask").map((x) => exposureKey(x.qid!));
  assert.equal(new Set(asked).size, asked.length, tr);
  assert.ok(steps.some((x) => x.path.split(">").length === 4), "the diagnosis path reached depth 3 below the integral");
});

test("prototype, slip on the integral: one fresh integral, no prerequisite detour", () => {
  const s = session("slip");
  const { steps, final } = runDeep(s, ORIG, slipOnly);
  assert.equal(final!.phase, "solved", traceOf(steps));
  assert.equal(s.replies.length, 2, "the original and one fresh one");
  assert.ok(steps.every((x) => x.kind !== "ask" || x.skill === OWN), "nothing asked on a prerequisite");
  assert.equal(taught(s).length, 0);
  assert.match(final!.reason, /most likely a slip/);
});

test("shipped recovery, same slip: walks five prerequisite skills before returning (the detour the prototype avoids)", () => {
  const r = runScenario({ id: "slip-baseline", category: 3, start: ORIG, entry: "practice", expect: {}, learner: () => ({ name: "slip", act: asAnswerer(slipOnly) }) } as never);
  const firstReturn = r.f.session.trace.filter((t) => t.component === "server-grader.gradeRequest").findIndex((t, i) => i > 0 && (t.input as { qid: string }).qid === ORIG);
  assert.ok(firstReturn >= 6, `prerequisite questions before the return: ${firstReturn - 1}`);
});

test("prototype, knows a prerequisite but slips on it: one more question, no descent into it", () => {
  // the real gap is as above; the learner slips on the first factorisation question it is asked
  let slipped = false;
  const L = deepGap((q) => { if (!slipped && question(q.replace(/:(mc|w)$/, "")).competency === FACT) { slipped = true; return true; } return false; });
  const s = session("slip-prereq");
  const { steps, final } = runDeep(s, ORIG, L);
  assert.ok(slipped, "the slip happened");
  assert.equal(final!.phase, "solved_after_help", traceOf(steps));
  assert.ok(!steps.some((x) => x.path.split(">").includes("algebra.factorisation")), "factorisation never entered the diagnosis path");
  assert.ok(!taught(s).includes(FACT), "factorisation not taught");
  assert.equal(steps.filter((x) => x.kind === "ask" && x.skill === FACT).length, 2, "exactly one extra question on it");
});

test("prototype, prerequisite already shown in the records: not asked again", () => {
  const s = session("shown");
  // prior independent work on polynomials, earlier in the year
  const m = moduleFor(P + "algebra.polynomials")!;
  for (const q of [...m.diagnostics, ...m.practice].slice(0, 3)) s.submit(q, question(q).answer, "practice");
  s.wait(5);
  assert.equal(s.state().evidence(P + "algebra.polynomials").status, "independent");
  const { steps, final } = runDeep(s, ORIG, deepGap());
  assert.equal(final!.phase, "solved_after_help");
  assert.ok(!steps.some((x) => x.kind === "ask" && x.skill === P + "algebra.polynomials"), traceOf(steps));
});

test("prototype, missing prerequisite content: stops honestly at the unteachable root (number.integers)", () => {
  const s = session("nocontent");
  const { steps, final } = runDeep(s, ORIG, noContent());
  assert.equal(final!.phase, "blocked", traceOf(steps));
  assert.equal(final!.blocked!.skill, INTS);
  assert.match(final!.reason, /gap in OpenPath's content, not in you/);
  assert.match(final!.blocked!.why, /teaching checks and content review/);
  assert.ok(!taught(s).length, "nothing taught over the missing content; nothing above it is taught first");
  assert.ok(final!.path.length >= 5, `path ${final!.path.join(">")}`);
});

test("prototype, cycle in the relations (injected): terminates, never revisits a skill on the path", () => {
  const cyc: Record<string, string[]> = { [OWN]: [PF], [PF]: [LS], [LS]: [PF, L2V], [L2V]: [PF, LS, OWN] };
  const s = session("cycle");
  const { steps, final } = runDeep(s, ORIG, deepGap(), { supportsOf: (id) => cyc[id] ?? [] });
  assert.ok(final && ["solved_after_help", "escalate", "blocked"].includes(final.phase), traceOf(steps));
  for (const x of steps) { const p = x.path.split(">"); assert.equal(new Set(p).size, p.length, `cycle in path ${x.path}`); }
  assert.equal(final!.phase, "solved_after_help");
});

test("prototype, saved state: a rebuilt session days later resumes at the same place and finishes the same way", () => {
  const s = session("resume");
  const first = runDeep(s, ORIG, deepGap(), { stopAfter: 9 });
  const pathBefore = first.steps.filter((x) => x.kind === "ask").at(-1)!.path;
  const later = SliceSession.fromEvents(s.learnerId, OWN, withDecisions(s.events, s.decisions), s.now + 3 * 86_400_000, "s2");
  const second = runDeep(later, ORIG, deepGap());
  assert.equal(second.steps[0].path, pathBefore, "resumes on the saved diagnosis path");
  assert.equal(second.final!.phase, "solved_after_help", traceOf(second.steps));
  assert.deepEqual(taught(later), [L2V, LS, PF]);
  const asked = [...first.steps, ...second.steps].filter((x) => x.kind === "ask").map((x) => exposureKey(x.qid!));
  assert.equal(new Set(asked).size, asked.length, "nothing repeated across the break");
});

test("prototype, honest uncertainty: a small question budget ends in an 'unsure' hand-over, never a claimed cause", () => {
  const s = session("budget");
  const { final } = runDeep(s, ORIG, deepGap(), { budget: 5 });
  assert.equal(final!.phase, "escalate");
  assert.equal(final!.confidence, "unsure");
  assert.match(final!.reason, /teacher or parent/);
});
