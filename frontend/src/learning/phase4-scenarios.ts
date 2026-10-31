/**
 * phase4-scenarios@1: ten evaluation scenarios for the adaptive maths engine, authored from the SPECIFICATION only
 * (not from the engine's implementation), so they can judge it fairly.
 *
 * Each scenario scripts a synthetic learner by a MODEL of what they know (a modelled misconception id, when it holds,
 * slips). Answers are a function of that model and the question only: the misconception's prediction (bugValue) when
 * it predicts a distinct wrong answer, the right answer otherwise, a careless slip (slip) where the model says so.
 * The only records the learner "reads" are teaching records (having seen a lesson) and the session/day (time).
 *
 * `expect` is derived from the spec, never from running the engine. `final.facts` records what the run actually
 * presented (e.g. how many discriminating questions the learner met), so a reviewer can see whether the scenario was
 * constructed faithfully in a given run.
 *
 * Content choices (real ids; see the per-scenario notes):
 *   arithmetic-sequences (g10, family apn)        1 isolated-slip, 4 correct-discriminating (n-jumps)
 *   coordinate.distance (g10, family cdist)       2 repeated-misconception (added-sides), 7 delayed-check recovery
 *   quadratic-discriminant (g10, family disc)     3 correct-nondiscriminating (forgot-four), 9 unsupported-working
 *   linear-equations (g7, family lin)             5 wrong-after-teaching (forgot-divide)
 *   trigonometry.ratios (g7, family anstd)        6 no-probe-available (angles-combined)
 *   factorisation (g8, family ajfsq in pool)      8 practice-error-investigation (squares-in-brackets)
 *   square-roots (g8, family root)                10 conflicting-evidence-across-sessions (half-for-root)
 */
import { question } from "../../../packages/learning/src/content";
import { problemOf, show } from "../../../packages/learning/src/families";
import { canCheckWorking } from "../../../packages/learning/src/working";
import { bugValue, Journey, respond, slip, slippable } from "./adaptive-journey";

export interface LearnerTruth { misconception: string | null; heldAtEnd: boolean; taughtByEnd?: boolean; notes: string }
export interface SpecExpectation {
  investigation: "should-not" | "should" | "either";
  resolution: "must-not-resolve" | "may-resolve" | "n/a";
  establish: "must-not-establish" | "should-establish" | "either";
  retention?: "new-check-after-recovery" | "n/a";
  notes: string;
}
type Result = { id: string; competency: string; truth: LearnerTruth; expect: SpecExpectation; steps: unknown[]; final: unknown };

// ---------------------------------------------------------------- learner-model helpers (content only, no engine state)

/** The answer misconception `bug` makes the learner give on `q`, or null when it predicts no DISTINCT wrong answer
 * (no prediction, or the prediction is written the same way as the right answer). */
export function misconceived(q: string, bug: string): string | null {
  const v = bugValue(problemOf(q), new Set([bug])) as unknown;
  if (v === null || v === undefined) return null;
  const r = respond(q, typeof v === "number" || typeof v === "string" ? v : show(v as never));
  return r === respond(q, "right") ? null : r;
}
const right = (q: string) => respond(q, "right");
type TeachEvent = { record?: string; competency?: string; sessionId?: string };
const taught = (j: Journey, c?: string) => j.d.events.some((e) => (e as TeachEvent).record === "teach" && (!c || (e as TeachEvent).competency === c));
const teachCount = (j: Journey) => j.d.events.filter((e) => (e as TeachEvent).record === "teach").length;

/** What the learner was asked and how they answered (a log kept by the scenario, read-only to the learner). */
interface Seen { q: string; phase: string; session: string; discriminating: boolean; response: string; correct: boolean; showedMisconception: boolean; afterTeaching: boolean; working?: string[] }
class Log {
  seen: Seen[] = [];
  private j: Journey;
  private bug: string | null;
  constructor(j: Journey, bug: string | null) { this.j = j; this.bug = bug; }
  note(q: string, phase: string, response: string, working?: string[]) {
    const m = this.bug ? misconceived(q, this.bug) : null;
    this.seen.push({ q, phase, session: this.j.d.session, discriminating: m !== null, response, correct: response === right(q), showedMisconception: m !== null && response === m, afterTeaching: taught(this.j), ...(working ? { working } : {}) });
    return response;
  }
  facts() {
    const s = this.seen;
    return {
      answered: s.length,
      discriminatingMet: s.filter((x) => x.discriminating).length,
      showedMisconception: s.filter((x) => x.showedMisconception).length,
      discriminatingAfterTeaching: s.filter((x) => x.discriminating && x.afterTeaching).length,
      correctOnNonDiscriminatingAfterTeaching: s.filter((x) => !x.discriminating && x.afterTeaching && x.correct).length,
      wrong: s.filter((x) => !x.correct).map((x) => ({ q: x.q, phase: x.phase, session: x.session, misconception: x.showedMisconception })),
      phases: [...new Set(s.map((x) => x.phase))],
    };
  }
}

/** Plan the target, then work each planned skill's module (and the target's, if not planned), bounded. */
async function workPlan(j: Journey, target: string, answer: (q: string, phase: string) => { response: string; working?: string[] }, max = 20) {
  const plan = j.plan(target);
  const skills = plan.items.map((i) => i.competency);
  if (!skills.includes(target)) skills.push(target);
  for (const c of [...new Set(skills)]) await j.module(c, (q, ms) => answer(q, ms.phase), max);
  return skills;
}
const endState = (j: Journey, c: string, extra: Record<string, unknown> = {}) => ({ ...extra, snap: j.snap(c), next: j.next(), ...j.summary() });

// ---------------------------------------------------------------- 1 isolated-slip

const AP = "MATH.algebra.arithmetic-sequences";
const DIST = "MATH.coordinate.distance";
const DISC = "MATH.algebra.quadratic-discriminant";
const LIN = "MATH.algebra.linear-equations";
const TRIG = "MATH.trigonometry.ratios";
const FACT = "MATH.algebra.factorisation";
const ROOT = "MATH.number.square-roots";

/** Knows the skill. Right on everything except ONE careless slip (no modelled misconception predicts it), on the first
 * slippable question answered alone after at least five independent right answers (three diagnostics + two module). */
async function isolatedSlip(): Promise<Result> {
  const j = new Journey("p4-isolated-slip", undefined, 10);
  const log = new Log(j, null);
  let slipped: string | null = null;
  const aloneRight = () => log.seen.filter((x) => x.correct && x.phase !== "guided").length;
  const learner = (q: string, phase: string) => {
    if (!slipped && phase !== "guided" && aloneRight() >= 5 && slippable(q)) { slipped = q; return log.note(q, phase, slip(q)); }
    return log.note(q, phase, right(q));
  };
  await j.topicCheck(AP, (q) => learner(q, "diagnostic"));
  await workPlan(j, AP, (q, p) => ({ response: learner(q, p) }), 20);
  const afterSession1 = j.snap(AP);
  j.newSession(1);
  await j.module(AP, (q, ms) => ({ response: learner(q, ms.phase) }), 8);
  return j.stable({
    id: "isolated-slip", competency: AP,
    truth: { misconception: null, heldAtEnd: false, taughtByEnd: taught(j), notes: "knows arithmetic sequences (apn); exactly one careless slip, off by one / a wrong choice, matching no modelled misconception" },
    expect: { investigation: "should-not", resolution: "n/a", establish: "must-not-establish", notes: "one unexplained error after strong independent evidence is a slip: no misconception should be established or investigated, and the skill should not lose its secure/independent standing on one slip" },
    steps: j.steps, final: endState(j, AP, { slipped, afterSession1, facts: log.facts() }),
  });
}

// ---------------------------------------------------------------- 2 repeated-misconception

/** Holds added-sides (adds |dx|+|dy| instead of Pythagoras) throughout, taught or not. */
async function repeatedMisconception(): Promise<Result> {
  const BUG = "added-sides";
  const j = new Journey("p4-repeated", undefined, 10);
  const log = new Log(j, BUG);
  const learner = (q: string, phase: string) => log.note(q, phase, misconceived(q, BUG) ?? right(q));
  await j.topicCheck(DIST, (q) => learner(q, "diagnostic"));
  await workPlan(j, DIST, (q, p) => ({ response: learner(q, p) }), 15);
  return j.stable({
    id: "repeated-misconception", competency: DIST,
    truth: { misconception: BUG, heldAtEnd: true, taughtByEnd: taught(j), notes: "coordinate distance (cdist): adds the horizontal and vertical gaps on every question where that predicts a distinct answer, before and after any teaching" },
    expect: { investigation: "should", resolution: "must-not-resolve", establish: "should-establish", notes: "the same modelled wrong answer repeated across independent questions is the textbook case for investigating and establishing the misconception; nothing the learner does is evidence it has gone" },
    steps: j.steps, final: endState(j, DIST, { facts: log.facts() }),
  });
}

// ---------------------------------------------------------------- 3 correct-nondiscriminating

/** Holds forgot-four (b² − c for b² − 4ac) throughout, even after teaching. On disc questions where forgot-four predicts
 * no distinct answer (most of the family: 128/960 items carry it) the learner is right; where it does, wrong. */
async function correctNondiscriminating(): Promise<Result> {
  const BUG = "forgot-four";
  const j = new Journey("p4-nondiscriminating", undefined, 10);
  const log = new Log(j, BUG);
  const learner = (q: string, phase: string) => log.note(q, phase, misconceived(q, BUG) ?? right(q));
  await j.topicCheck(DISC, (q) => learner(q, "diagnostic"));
  await workPlan(j, DISC, (q, p) => ({ response: learner(q, p) }), 20);
  const end1 = j.snap(DISC);
  j.newSession(1);
  await j.module(DISC, (q, ms) => ({ response: learner(q, ms.phase) }), 10);
  return j.stable({
    id: "correct-nondiscriminating", competency: DISC,
    truth: { misconception: BUG, heldAtEnd: true, taughtByEnd: taught(j), notes: "quadratic discriminant (disc): forgets the 4 in b² − 4ac whenever that changes the answer; right answers after teaching come only from questions on which forgot-four predicts nothing distinct" },
    expect: { investigation: "either", resolution: "must-not-resolve", establish: "either", notes: "a right answer on a question the misconception cannot be seen on is no evidence it has gone: the engine must not resolve it on such answers (and any discriminating question after teaching is answered wrong)" },
    steps: j.steps, final: endState(j, DISC, { endOfSession1: end1, facts: log.facts() }),
  });
}

// ---------------------------------------------------------------- 4 correct-discriminating

/** Holds n-jumps (a + n·d for the nth term) until taught arithmetic sequences; afterwards right on everything. */
async function correctDiscriminating(): Promise<Result> {
  const BUG = "n-jumps";
  const j = new Journey("p4-discriminating", undefined, 10);
  const log = new Log(j, BUG);
  const learner = (q: string, phase: string) => log.note(q, phase, taught(j, AP) ? right(q) : misconceived(q, BUG) ?? right(q));
  await j.topicCheck(AP, (q) => learner(q, "diagnostic"));
  await workPlan(j, AP, (q, p) => ({ response: learner(q, p) }), 20);
  j.newSession(1);
  await j.module(AP, (q, ms) => ({ response: learner(q, ms.phase) }), 10);
  return j.stable({
    id: "correct-discriminating", competency: AP,
    truth: { misconception: BUG, heldAtEnd: false, taughtByEnd: taught(j, AP), notes: "arithmetic sequences (apn): n-jumps predicts a distinct wrong answer on every apn item; the learner shows it until a lesson on the skill, then is right on discriminating questions alone" },
    expect: { investigation: "either", resolution: "may-resolve", establish: "either", notes: "after teaching, right answers on questions where the misconception would have shown are genuine evidence it has gone: the engine may resolve it (it need not, if it wants more evidence)" },
    steps: j.steps, final: endState(j, AP, { facts: log.facts() }),
  });
}

// ---------------------------------------------------------------- 5 wrong-after-teaching

/** Holds forgot-divide (solves ax + b = c as c − b, never dividing by a) before and after teaching. */
async function wrongAfterTeaching(): Promise<Result> {
  const BUG = "forgot-divide";
  const j = new Journey("p4-wrong-after-teaching", undefined, 7);
  const log = new Log(j, BUG);
  const learner = (q: string, phase: string) => log.note(q, phase, misconceived(q, BUG) ?? right(q));
  await j.topicCheck(LIN, (q) => learner(q, "diagnostic"));
  await workPlan(j, LIN, (q, p) => ({ response: learner(q, p) }), 25);
  const end1 = j.snap(LIN);
  j.newSession(1);
  await j.module(LIN, (q, ms) => ({ response: learner(q, ms.phase) }), 10);
  return j.stable({
    id: "wrong-after-teaching", competency: LIN,
    truth: { misconception: BUG, heldAtEnd: true, taughtByEnd: taught(j, LIN), notes: "linear equations, grade 7 (lin): forgot-divide predicts a distinct answer on every lin item; teaching does not change it" },
    expect: { investigation: "either", resolution: "must-not-resolve", establish: "should-establish", notes: "the modelled wrong answer persists after the lesson: the misconception is established and must not be marked resolved; teaching should be revised or escalated, not counted as success" },
    steps: j.steps, final: endState(j, LIN, { endOfSession1: end1, teachings: teachCount(j), facts: log.facts() }),
  });
}

// ---------------------------------------------------------------- 6 no-probe-available

/** angles-combined (trigonometry.ratios, family anstd): carried by only 48 of 400 anstd items and predicting a distinct
 * answer on 13; in this module's fixed questions only the diagnostic gen:anstd:0,3,0,1,1 discriminates it (the guided,
 * check, practice and retention questions carry other bugs). Chosen by surveying every module's pool for the bug with
 * the fewest discriminating items in the module's MAIN family. Held throughout. */
async function noProbeAvailable(): Promise<Result> {
  const BUG = "angles-combined";
  const j = new Journey("p4-no-probe", undefined, 7);
  const log = new Log(j, BUG);
  const learner = (q: string, phase: string) => log.note(q, phase, misconceived(q, BUG) ?? right(q));
  await j.topicCheck(TRIG, (q) => learner(q, "diagnostic"));
  await workPlan(j, TRIG, (q, p) => ({ response: learner(q, p) }), 20);
  j.newSession(1);
  await j.module(TRIG, (q, ms) => ({ response: learner(q, ms.phase) }), 10);
  return j.stable({
    id: "no-probe-available", competency: TRIG,
    truth: { misconception: BUG, heldAtEnd: true, taughtByEnd: taught(j), notes: "trigonometric ratios, grade 7 (anstd): combines the angles (sin A + sin B as sin(A+B)); almost no question the engine can ask shows it, so the learner is right on nearly everything" },
    expect: { investigation: "either", resolution: "must-not-resolve", establish: "either", notes: "with no discriminating question available the misconception can be neither confirmed nor ruled out by later right answers: the engine must not resolve it on non-discriminating evidence, and should say it cannot probe rather than ask uninformative questions" },
    steps: j.steps, final: endState(j, TRIG, { facts: log.facts() }),
  });
}

// ---------------------------------------------------------------- 7 failed-delayed-check-then-recovery

/** Knows distance; by 8 days later has forgotten: the FIRST question after the gap is answered wrong (a slip, no
 * misconception); having seen that, the learner recovers and is right alone; 10 days later right again. */
async function failedDelayedCheck(): Promise<Result> {
  const j = new Journey("p4-delayed-check", undefined, 10);
  const log = new Log(j, null);
  await j.topicCheck(DIST, (q) => log.note(q, "diagnostic", right(q)));
  await workPlan(j, DIST, (q, p) => ({ response: log.note(q, p, right(q)) }), 20);
  const afterIndependent = j.snap(DIST);
  j.newSession(8);
  const gapStart = log.seen.length;
  let failedOn: { q: string; phase: string } | null = null;
  let evidenceAfterFailure: unknown = null;
  const forgetful = (q: string, phase: string) => {
    if (log.seen.length === gapStart) { failedOn = { q, phase }; return log.note(q, phase, slippable(q) ? slip(q) : misconceived(q, "no-root") ?? right(q)); }
    if (!evidenceAfterFailure) evidenceAfterFailure = j.snap(DIST);
    return log.note(q, phase, right(q));
  };
  await j.module(DIST, (q, ms) => ({ response: forgetful(q, ms.phase) }), 12);
  const recoveredAlone = () => log.seen.slice(gapStart + 1).some((x) => x.correct && x.phase !== "guided");
  if (!recoveredAlone()) { j.newSession(0); await j.module(DIST, (q, ms) => ({ response: forgetful(q, ms.phase) }), 12); }
  const afterRecovery = j.snap(DIST);
  const nextAfterRecovery = j.next();
  j.newSession(10);
  const laterStart = log.seen.length;
  await j.module(DIST, (q, ms) => ({ response: log.note(q, ms.phase, right(q)) }), 8);
  const later = log.seen.slice(laterStart).map((x) => ({ q: x.q, phase: x.phase, correct: x.correct }));
  return j.stable({
    id: "failed-delayed-check-then-recovery", competency: DIST,
    truth: { misconception: null, heldAtEnd: false, taughtByEnd: taught(j), notes: "coordinate distance (cdist): independent success, forgot by day 8 (first question after the gap wrong, a slip), recovered alone the same day, right on a check 10 days after that" },
    expect: { investigation: "either", resolution: "n/a", establish: "must-not-establish", retention: "new-check-after-recovery", notes: "the failed delayed check must count against retention; recovering in the same session is not retention, so a NEW delayed check must be scheduled after recovery, and only passing that later check restores retained status. Forgetting is not a misconception" },
    steps: j.steps,
    final: endState(j, DIST, { afterIndependent, failedOn, evidenceAfterFailure, afterRecovery, nextAfterRecovery, recoveredAlone: recoveredAlone(), laterSession: later, facts: log.facts() }),
  });
}

// ---------------------------------------------------------------- 8 practice-error-investigation

/** squares-in-brackets (family ajfsq, a pool family of factorisation): predicts nothing distinct on the module's
 * diagnostics (factor family) but does on later questions (gen:ajfsq:2,3,7,0, gen:ajfsq:1,11,9,0:mc). Held throughout,
 * so the learner looks secure at the start and errs only on practice / verification / retention questions. */
async function practiceErrorInvestigation(): Promise<Result> {
  const BUG = "squares-in-brackets";
  const j = new Journey("p4-practice-errors", undefined, 8);
  const log = new Log(j, BUG);
  const learner = (q: string, phase: string) => log.note(q, phase, misconceived(q, BUG) ?? right(q));
  await j.topicCheck(FACT, (q) => learner(q, "diagnostic"));
  await workPlan(j, FACT, (q, p) => ({ response: learner(q, p) }), 25);
  j.newSession(8);
  await j.module(FACT, (q, ms) => ({ response: learner(q, ms.phase) }), 12);
  return j.stable({
    id: "practice-error-investigation", competency: FACT,
    truth: { misconception: BUG, heldAtEnd: true, taughtByEnd: taught(j), notes: "factorisation, grade 8: writes a² − b² style factors as squares in brackets; invisible on the diagnostics, shown on every later question where it predicts a distinct answer" },
    expect: { investigation: "should", resolution: "must-not-resolve", establish: "either", notes: "repeated practice/verification errors matching one modelled misconception should trigger investigation even though the starting check looked secure; with two or more matching errors establishing is reasonable but not required by the spec" },
    steps: j.steps, final: endState(j, FACT, { facts: log.facts() }),
  });
}

// ---------------------------------------------------------------- 9 unsupported-working

/** Knows the discriminant. Once, on a question answered alone whose family does not support step checking, writes
 * working lines that LOOK like forgot-four and gives a wrong answer that is a slip (no modelled prediction). */
async function unsupportedWorking(): Promise<Result> {
  const j = new Journey("p4-unsupported-working", undefined, 10);
  const log = new Log(j, "forgot-four");
  let withWorking: string | null = null;
  await j.topicCheck(DISC, (q) => log.note(q, "diagnostic", right(q)));
  const learner = (q: string, phase: string) => {
    const p = problemOf(q);
    if (!withWorking && phase !== "guided" && p && !canCheckWorking(p) && slippable(q) && !question(q).options?.length) {
      withWorking = q;
      const working = ["D = b^2 - c", "b^2 = " + show(Number(right(q)) + 3), "D = " + slip(q)];
      return { response: log.note(q, phase, slip(q), working), working };
    }
    return { response: log.note(q, phase, right(q)) };
  };
  await workPlan(j, DISC, learner, 20);
  const traced = j.steps.find((s) => (s as { question?: string }).question === withWorking && (s as { working?: string[] }).working) as { stepFindings?: unknown } | undefined;
  return j.stable({
    id: "unsupported-working", competency: DISC,
    truth: { misconception: null, heldAtEnd: false, taughtByEnd: taught(j), notes: "quadratic discriminant (disc, step checking unsupported): knows the skill; one wrong answer (a slip) submitted with working lines that read like the forgot-four misconception" },
    expect: { investigation: "either", resolution: "n/a", establish: "must-not-establish", notes: "working the engine cannot check is not evidence of anything: it must not establish forgot-four (or any finding) from the lines, nor credit/penalise process; the wrong answer alone is one slip" },
    steps: j.steps, final: endState(j, DISC, { withWorking, stepFindingsOnThatStep: traced?.stepFindings ?? null, facts: log.facts() }),
  });
}

// ---------------------------------------------------------------- 10 conflicting-evidence-across-sessions

/** half-for-root (square-roots, family root). Session 1 (the starting check) shows it; session 2 (next day) does not
 * (right on discriminating questions); session 3 (a day later) shows it again. The learner's state depends only on the
 * session (time), never on teaching or engine state: the session-2 change is NOT caused by a lesson. The engine's module
 * may still teach at the start of session 2 (the harness has no question-asking path without that); the scenario
 * records it (teachingsInSession2, session2FirstDiscriminatingAfterTeaching). */
async function conflictingEvidence(): Promise<Result> {
  const BUG = "half-for-root";
  const j = new Journey("p4-conflicting", undefined, 8);
  const log = new Log(j, BUG);
  const holds = () => j.d.session !== "s2";
  const learner = (q: string, phase: string) => log.note(q, phase, holds() ? misconceived(q, BUG) ?? right(q) : right(q));
  // session 1: the starting check only. (Working the module in session 1 while holding the misconception exhausts every
  // strategy and the module pauses for good, so session 2 would ask nothing: tried and rejected.)
  await j.topicCheck(ROOT, (q) => learner(q, "diagnostic"));
  const s1 = j.snap(ROOT);
  const teachBeforeS2 = teachCount(j);
  j.newSession(1);
  j.plan(ROOT);
  await j.module(ROOT, (q, ms) => ({ response: learner(q, ms.phase) }), 10);
  const s2 = j.snap(ROOT);
  const s2Teach = j.d.events.filter((e) => (e as TeachEvent).record === "teach" && (e as TeachEvent).sessionId === "s2").length;
  const s2FirstDiscriminating = log.seen.find((x) => x.session === "s2" && x.discriminating);
  j.newSession(1);
  await j.module(ROOT, (q, ms) => ({ response: learner(q, ms.phase) }), 10);
  return j.stable({
    id: "conflicting-evidence-across-sessions", competency: ROOT,
    truth: { misconception: BUG, heldAtEnd: true, taughtByEnd: taught(j), notes: "square roots, grade 8 (root): shows half-for-root in session 1, answers discriminating questions right in session 2 (not because of any lesson), shows it again in session 3" },
    expect: { investigation: "either", resolution: "must-not-resolve", establish: "either", notes: "evidence conflicts across sessions and the latest evidence shows the misconception: whatever the engine concluded in session 2, it must not end with the misconception resolved; ideally it treats the hypothesis as uncertain/active rather than flip-flopping" },
    steps: j.steps,
    final: endState(j, ROOT, { afterSession1: s1, afterSession2: s2, teachBeforeS2, teachingsInSession2: s2Teach, session2DiscriminatingMet: log.seen.filter((x) => x.session === "s2" && x.discriminating).length, session3DiscriminatingMet: log.seen.filter((x) => x.session === "s3" && x.discriminating).length, session2FirstDiscriminatingAfterTeaching: s2FirstDiscriminating?.afterTeaching ?? null, facts: log.facts() }),
  });
}

export const PHASE4_SCENARIOS: Record<string, () => Promise<Result>> = {
  "isolated-slip": isolatedSlip,
  "repeated-misconception": repeatedMisconception,
  "correct-nondiscriminating": correctNondiscriminating,
  "correct-discriminating": correctDiscriminating,
  "wrong-after-teaching": wrongAfterTeaching,
  "no-probe-available": noProbeAvailable,
  "failed-delayed-check-then-recovery": failedDelayedCheck,
  "practice-error-investigation": practiceErrorInvestigation,
  "unsupported-working": unsupportedWorking,
  "conflicting-evidence-across-sessions": conflictingEvidence,
};
