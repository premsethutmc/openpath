/**
 * Milestone 2 adaptive scenario suite: materially different learners through the integrated components (real grader, evidence, adaptive engine,
 * renderer adapter). A scenario scripts only the learner (learners.ts) and when they come back (days later); everything else is decided by the
 * real components. `checkScenario` verifies the ten required properties from the records and the trace, never from the script.
 */
import { moduleFor, question } from "../../../packages/learning/src/content";
import { INDEPENDENT_MIN } from "../../../packages/learning/src/evidence";
import { graph } from "../../../packages/learning/src/graph";
import { hypotheses } from "../../../packages/learning/src/hypotheses";
import { RETRY_LIMIT, UNREADABLE_LIMIT } from "../../../packages/learning/src/intervention";
import { exposureKey } from "../../../packages/learning/src/families";
import { teachingEligibility } from "../../../packages/learning/src/teaching-contract";
import { SliceFlow } from "./flow";
import { learners, UNREADABLE, type Learner, type LearnerView } from "./learners";
import { checkProvenance } from "./provenance";

export type Category = 1 | 2 | 3 | 4 | 5 | 6;
export const CATEGORY: Record<Category, string> = { 1: "strong learner, one isolated slip", 2: "same mathematical error repeated", 3: "missing prerequisite competency", 4: "succeeds only after hints", 5: "fails after the first teaching", 6: "forgets during delayed retention" };
export interface Expect {
  /** investigation (explore / recover / investigate) before the first teaching; "none": no investigation, recovery or teaching follows a slip */
  investigation?: "before-teaching" | "none-after-slip" | "any";
  teaching?: "none" | "some" | "two-or-more";
  /** forbidden: the target must not reach independent/transfer/verified */
  mastery?: "forbidden" | "required" | "any";
  ended?: string[];
  recovery?: "support";
  retention?: "scheduled" | "failed-then-new-cycle" | "passed" | "none-due";
}
export interface Scenario { id: string; category: Category; start: string; entry?: "diagnostic" | "practice"; retry?: boolean; learner: () => Learner; later?: number[]; expect: Expect; note?: string }
export const T0 = Date.parse("2026-10-01T09:00:00Z");
export const MAX_INTERACTIONS = 250;

const LIN = "gen:lin:2,17,11", LIN2 = "gen:lin:3,9,8", IADD = "gen:lneg:5,-5,9", DISC = "gen:disc:-2,-7", DISCMC = "gen:disc:-1,-6:mc";
const FD = ["forgot-divide"], ANS = ["added-not-subtracted"];
const MASTERY = new Set(["independent", "transfer", "verified"]);

export const SCENARIOS: Scenario[] = [
  // 1. strong learner, one isolated slip
  { id: "1a", category: 1, start: LIN, learner: () => learners.oneSlip(1), expect: { mastery: "any", ended: ["done"] }, note: "slip on the very first answer (no earlier evidence of competence)" },
  { id: "1b", category: 1, start: LIN, learner: () => learners.oneSlip(3), expect: { investigation: "none-after-slip", teaching: "none", mastery: "required", ended: ["done"] } },
  { id: "1c", category: 1, start: LIN, learner: () => learners.oneSlip(5), expect: { investigation: "none-after-slip", teaching: "none", mastery: "required", ended: ["done"] } },
  { id: "1d", category: 1, start: LIN2, learner: () => learners.oneSlip(4), expect: { investigation: "none-after-slip", teaching: "none", mastery: "required", ended: ["done"] } },
  { id: "1e", category: 1, start: IADD, learner: () => learners.oneSlip(4), expect: { investigation: "none-after-slip", teaching: "none", mastery: "required", ended: ["done"] }, note: "another competency (linear-rational)" },
  { id: "1f", category: 1, start: LIN, entry: "practice", learner: () => learners.oneSlip(3), expect: { teaching: "none", mastery: "required", ended: ["done"] }, note: "practice entry" },
  { id: "1g", category: 1, start: LIN, learner: () => learners.strong(), expect: { teaching: "none", mastery: "required", ended: ["done"] }, note: "control: no slip" },
  // 2. repeated same error
  { id: "2a", category: 2, start: LIN, learner: () => learners.misconception(FD, 1), expect: { investigation: "before-teaching", teaching: "some", mastery: "required", ended: ["done"] } },
  { id: "2b", category: 2, start: LIN, learner: () => learners.misconception(FD, Infinity, "wrong"), expect: { investigation: "before-teaching", teaching: "some", mastery: "forbidden", ended: ["pause"] } },
  { id: "2c", category: 2, start: LIN, learner: () => learners.misconception(ANS, 1), expect: { investigation: "before-teaching", teaching: "some", mastery: "any", ended: ["done", "pause"] } },
  { id: "2d", category: 2, start: LIN, retry: true, learner: () => learners.retriesWrong(FD), expect: { mastery: "forbidden", ended: ["done", "pause"] }, note: "study-session retries, wrong each time" },
  { id: "2e", category: 2, start: LIN, retry: true, learner: () => learners.rightOnRetry(), expect: { mastery: "any", ended: ["done", "pause"] }, note: "right only on the retry" },
  { id: "2f", category: 2, start: LIN, learner: () => learners.unreadable(), expect: { teaching: "none", mastery: "forbidden", ended: ["pause"] }, note: "unreadable input, always" },
  { id: "2g", category: 2, start: LIN, learner: () => learners.unreadable(1), expect: { teaching: "none", mastery: "any", ended: ["done", "pause"] }, note: "one unreadable answer, then right" },
  { id: "2h", category: 2, start: DISCMC, learner: () => learners.misconception(["minus-c-sign"], Infinity, "wrong"), expect: { mastery: "forbidden", ended: ["pause", "done"] }, note: "choice questions" },
  // 3. missing prerequisite
  { id: "3a", category: 3, start: DISC, entry: "practice", learner: () => learners.lacksSkill("MATH.number.integer-add", ["minus-c-sign", "minus-negative-as-minus"]), expect: { recovery: "support", teaching: "some", mastery: "any", ended: ["done"] } },
  { id: "3b", category: 3, start: IADD, entry: "practice", learner: () => learners.lacksSkill("MATH.number.integer-add", ["move-keep-sign"]), expect: { recovery: "support", teaching: "some", mastery: "any", ended: ["done", "pause"] } },
  { id: "3c", category: 3, start: "gen:addr:36,24", entry: "practice", learner: () => learners.lacksSkill("MATH.number.place-value-tens", ["no-regroup"]), expect: { recovery: "support", teaching: "some", mastery: "any", ended: ["done", "pause"] } },
  { id: "3d", category: 3, start: "gen:mmul:25,6", entry: "practice", learner: () => learners.lacksSkill("MATH.number.multiplication-tables", ["fact-slip:5x6"]), expect: { recovery: "support", teaching: "some", mastery: "any", ended: ["done", "pause"] } },
  { id: "3e", category: 3, start: "gen:ahlike:9,-9,-5,-3", entry: "practice", learner: () => learners.lacksSkill("MATH.number.integer-add", ["sign-dropped"]), expect: { recovery: "support", teaching: "some", mastery: "any", ended: ["done", "pause"] } },
  { id: "3f", category: 3, start: DISC, entry: "practice", learner: () => learners.misconception(["minus-c-sign", "minus-negative-as-minus"], Infinity, "wrong"), expect: { mastery: "forbidden", ended: ["pause", "done"] }, note: "the prerequisite is never learnt" },
  { id: "3h", category: 3, start: "gen:ahlike:9,-9,-5,-3", entry: "practice", learner: () => learners.misconception(["sign-dropped"], Infinity), expect: { teaching: "none", mastery: "any", ended: ["pause", "done"] }, note: "the error shows only on the original problem: recovery finds no gap and stops after 3 tries (bounded)" },
  { id: "3g", category: 3, start: DISC, entry: "diagnostic", learner: () => learners.lacksSkill("MATH.number.integer-add", ["minus-c-sign", "minus-negative-as-minus"]), expect: { teaching: "some", mastery: "any", ended: ["done", "pause"] }, note: "module entry instead of practice" },
  // 4. succeeds only after hints
  { id: "4a", category: 4, start: LIN, learner: () => learners.onlyWithHints(), expect: { mastery: "forbidden", ended: ["pause"] } },
  { id: "4b", category: 4, start: LIN, learner: () => learners.hintThenIndependent(), expect: { mastery: "any", ended: ["done", "pause"] } },
  { id: "4c", category: 4, start: LIN, learner: () => learners.hintButWrong(), expect: { mastery: "any", ended: ["done", "pause"] } },
  { id: "4d", category: 4, start: LIN, learner: () => learners.hintSeeker(), expect: { teaching: "none", mastery: "required", ended: ["done"] }, note: "asks for hints where none is offered" },
  { id: "4e", category: 4, start: IADD, learner: () => learners.onlyWithHints(), expect: { mastery: "forbidden", ended: ["pause"] }, note: "another competency" },
  { id: "4f", category: 4, start: LIN, learner: () => learners.guidedOnly(), expect: { mastery: "forbidden", ended: ["pause"] }, note: "right with help, wrong alone" },
  // 5. fails after the first teaching
  { id: "5a", category: 5, start: LIN, learner: () => learners.misconception(FD, 2), expect: { teaching: "two-or-more", mastery: "any", ended: ["done", "pause"] } },
  { id: "5b", category: 5, start: LIN, learner: () => learners.alwaysWrong(), expect: { teaching: "some", mastery: "forbidden", ended: ["pause"] } },
  { id: "5c", category: 5, start: LIN, learner: () => learners.learnsButSlipsCheck(FD), expect: { teaching: "some", mastery: "any", ended: ["done", "pause"] } },
  { id: "5d", category: 5, start: LIN, retry: true, learner: () => learners.misconception(FD, 2), expect: { teaching: "two-or-more", mastery: "any", ended: ["done", "pause"] }, note: "with study-session retries" },
  { id: "5e", category: 5, start: IADD, learner: () => learners.misconception(["move-keep-sign"], 2), expect: { mastery: "any", ended: ["done", "pause"] }, note: "another competency" },
  { id: "5f", category: 5, start: LIN, learner: () => learners.misconception(FD, 3), expect: { mastery: "any", ended: ["done", "pause"] }, note: "needs a third explanation (more than exist?)" },
  // 6. forgets during delayed retention
  { id: "6a", category: 6, start: LIN, learner: () => learners.slipOnRetention(), later: [8], expect: { retention: "failed-then-new-cycle", mastery: "any" } },
  { id: "6b", category: 6, start: LIN, learner: () => learners.strong(), later: [3], expect: { retention: "none-due", mastery: "required" }, note: "back before the check is due" },
  { id: "6c", category: 6, start: LIN, learner: () => learners.strong(), later: [8], expect: { retention: "passed", mastery: "required" }, note: "control: remembers" },
  { id: "6d", category: 6, start: LIN, learner: () => learners.misconception(FD, 1), later: [8, 8], expect: { retention: "passed", mastery: "any" }, note: "taught, then remembers twice" },
  { id: "6e", category: 6, start: DISC, entry: "practice", learner: () => learners.slipOnRetention(), later: [8], expect: { retention: "failed-then-new-cycle", mastery: "any" }, note: "after a prerequisite recovery" },
  { id: "6f", category: 6, start: IADD, learner: () => learners.slipOnRetention(), later: [8], expect: { retention: "failed-then-new-cycle", mastery: "any" }, note: "another competency" },
];

export interface Run { s: Scenario; f: SliceFlow; interactions: number; terminated: boolean; actions: { q: string; act: string; phase: string; activity: string }[] }

export function runScenario(s: Scenario): Run {
  const f = new SliceFlow(s.start, `synthetic-m2-${s.id}`, T0, { retry: !!s.retry, entry: s.entry ?? "diagnostic" });
  const L = s.learner();
  const actions: Run["actions"] = [];
  let interactions = 0, asked = new Set<string>();
  const drive = () => {
    for (let i = 0; i < MAX_INTERACTIONS && f.stage !== "summary"; i++, interactions++) {
      const ev = f.session.state().evidence(f.session.competency);
      const view = (): LearnerView => ({ q: f.currentQuestion!, phase: f.currentPhase, activity: f.currentActivity, taught: f.session.events.filter((e) => (e as { record?: string }).record === "teach").length, answered: f.session.replies.length, hintShown: f.hintsShown > 0, hintAsked: asked.has(`${f.frames.length}:${f.currentQuestion}`), session: f.session.session, retentionFails: (ev.retentionHistory ?? []).filter((c) => c.result === "failed").length, taughtSkills: f.session.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => graph.evidenceTarget((e as { competency: string }).competency)) });
      if (f.stage === "question") {
        const v = view();
        const a = L.act(v);
        if ("hint" in a) { asked.add(`${f.frames.length + 1}:${v.q}`); f.on({ type: "hint_requested", level: 1, timestamp: 0 }); asked.add(`${f.frames.length}:${v.q}`); actions.push({ q: v.q, act: "hint", phase: v.phase, activity: v.activity }); continue; }
        actions.push({ q: v.q, act: a.answer, phase: v.phase, activity: v.activity });
        f.on({ type: "answer_submitted", value: a.answer, timestamp: 0 });
      } else if (f.stage === "feedback" && f.spec.nav.canGoBack && L.retry?.(view())) { actions.push({ q: "", act: "retry", phase: f.currentPhase, activity: f.currentActivity }); f.on({ type: "back_requested", timestamp: 0 }); }
      else f.on({ type: "skip_requested", timestamp: 0 });
    }
  };
  drive();
  let terminated = f.stage === "summary";
  for (const d of s.later ?? []) { f.later(d); drive(); terminated = terminated && f.stage === "summary"; }
  return { s, f, interactions, terminated, actions };
}

export interface Verdict { property: string; ok: boolean; detail: string }
const isTeach = (e: unknown): e is { record: "teach"; competency: string; strategy: string; at: string } => (e as { record?: string }).record === "teach";

export function checkScenario(r: Run): Verdict[] {
  const { f, s } = r, out: Verdict[] = [];
  const add = (property: string, ok: boolean, detail = "") => out.push({ property, ok, detail });
  const st = f.session.state(), recs = st.records;
  const target = graph.evidenceTarget(question(s.start).competency);
  const ev = st.evidence(target);
  const teaches = (f.session.events as unknown[]).filter(isTeach);
  const phases = f.session.trace.filter((t) => t.component === "intervention.moduleState" || t.component === "intervention.recovery").map((t) => ({ comp: t.component, phase: (t.output as { phase: string }).phase, n: t.n }));
  const unreadable = r.actions.filter((a) => a.act === UNREADABLE).length;

  // 1 grading authority: every shown verdict is the grader's; every correctness decision is the trusted grader's
  const prov = checkProvenance(f);
  const graded = f.session.trace.filter((t) => t.decides === "correctness");
  add("1 grading authority", prov.length === 0 && graded.every((t) => t.authority === "mathematical-grader" && t.component === "server-grader.gradeRequest") && f.session.replies.every((x) => x.decision?.schema === "grading-decision@1"), prov.slice(0, 3).join("; "));
  // 2 evidence recording: one record per submission (readable -> attempt, unreadable -> unresolved), hints kept on the attempt
  const hinted = f.session.events.filter((e) => (e as { record?: string; hints?: number }).record === "attempt" && ((e as { hints?: number }).hints ?? 0) > 0).length;
  add("2 evidence recording", recs.attempts.length + recs.unresolved.length + recs.pending.length === f.session.replies.length && recs.unresolved.length === f.session.replies.filter((x) => x.verdict === "unresolved").length && recs.attempts.filter((a) => a.hints > 0).length === hinted,
    `attempts ${recs.attempts.length} + unresolved ${recs.unresolved.length} + awaiting a teacher ${recs.pending.length} vs submissions ${f.session.replies.length}`);
  // 3 honest uncertainty: nothing established without a supporting investigation; nothing at all from unreadable input or a lone slip
  const hs = hypotheses(recs);
  const est = hs.filter((h) => h.status === "established");
  const honest = est.every((h) => h.claim !== null && h.supporting.length >= 1) && (s.category !== 1 || est.length === 0) && (unreadable === 0 || s.id !== "2f" || hs.length === 0);
  add("3 honest uncertainty", honest, `hypotheses ${hs.map((h) => h.status).join(",") || "none"}`);
  // 4 investigation decision
  const firstTeach = phases.find((p) => p.phase === "chapter");
  const invest = phases.filter((p) => ["explore", "recover", "investigate"].includes(p.phase));
  let invOk = true, invDetail = `${invest.length} investigation step(s)`;
  if (s.expect.investigation === "before-teaching") invOk = !!firstTeach && invest.some((p) => p.n < firstTeach.n);
  if (s.expect.investigation === "none-after-slip") {
    // investigation = diagnostic@2 on the wrong answer (recovery: recover / investigate, or an investigate: question); teaching = a chapter.
    // The module resuming its own unfinished starting check (explore) when the evidence status drops is counted and reported, not treated as
    // an investigation of the slip (docs/milestone-2/02-RELIABILITY.md, policy note).
    const slipAt = f.session.trace.find((t) => t.decides === "correctness" && (t.output as { verdict: string }).verdict === "incorrect")?.n ?? Infinity;
    const after = phases.filter((p) => p.n > slipAt);
    invOk = !after.some((p) => ["recover", "chapter", "investigate"].includes(p.phase)) && !f.session.trace.some((t) => t.n > slipAt && t.component === "intervention.moduleState" && String((t.output as { context?: string | null }).context ?? "").startsWith("investigate:"));
    invDetail = `after the slip: ${after.filter((p) => p.phase === "explore").length} starting-check question(s) resumed, no diagnosis of the slip, no teaching`;
  }
  add("4 investigation decision", invOk, invDetail);
  // 5 eligible teaching: every delivered explanation passes the teaching-eligibility gate; and the expected amount
  const elig = teaches.every((t) => { const m = moduleFor(t.competency); const st0 = m?.strategies.find((x) => x.id === t.strategy); if (!m || !st0) return false; const e = teachingEligibility(m, st0); return !(e.checked && !e.eligible); });
  const amount = s.expect.teaching === "none" ? teaches.length === 0 : s.expect.teaching === "some" ? teaches.length >= 1 : s.expect.teaching === "two-or-more" ? teaches.length >= 2 : true;
  add("5 eligible teaching", elig && amount, `${teaches.length} explanation(s): ${teaches.map((t) => t.strategy).join(",")}`);
  // 6 independent recheck: mastery after teaching only via a later first, unaided, correct answer
  const lastTeach = teaches.filter((t) => graph.evidenceTarget(t.competency) === target).at(-1);
  const unaidedRight = recs.attempts.filter((a) => graph.evidenceTarget(a.competency) === target && a.n === 1 && a.hints === 0 && a.activity !== "guided" && a.credit === true);
  const recheckOk = !MASTERY.has(ev.status) || !lastTeach || unaidedRight.some((a) => a.at > lastTeach.at);
  add("6 independent recheck", recheckOk, `status ${ev.status}`);
  // 7 assistance history: help (hint, guided, retry) never counts as independent
  const candidates = recs.attempts.filter((a) => graph.evidenceTarget(a.competency) === target && a.n === 1 && a.hints === 0 && a.activity !== "guided");
  const own = recs.attempts.filter((a) => graph.evidenceTarget(a.competency) === target);
  const assisted = own.filter((a) => a.hints > 0 || a.activity === "guided" || a.n > 1).length;
  // every assisted answer on the target is kept out of the independent count (a retry, n > 1, is neither independent nor "assisted" in evidence.ts)
  add("7 assistance history", ev.independent.total <= candidates.length && (own.filter((a) => a.hints > 0 || a.activity === "guided").length === 0 || ev.assisted.total >= 1), `independent ${ev.independent.right}/${ev.independent.total} of ${candidates.length} unaided first answers; ${assisted} assisted`);
  // 8 no false mastery
  const mastered = MASTERY.has(ev.status);
  const enoughAlone = unaidedRight.length >= INDEPENDENT_MIN;
  const mOk = (!mastered || enoughAlone) && (s.expect.mastery !== "forbidden" || !mastered) && (s.expect.mastery !== "required" || mastered);
  add("8 no false mastery", mOk, `status ${ev.status}; ${unaidedRight.length} unaided right`);
  // 9 retention or recovery decision
  const hist = ev.retentionHistory ?? [];
  let rOk = true; let rDetail = `retention ${ev.retention}; cycles ${hist.map((c) => c.result).join(",") || "none"}`;
  if (s.expect.recovery === "support") rOk = f.session.trace.some((t) => t.component === "intervention.recovery" && (t.output as { phase: string }).phase === "support");
  if (s.expect.retention === "failed-then-new-cycle") rOk = hist.some((c) => c.result === "failed") && hist.at(-1)!.result !== "failed" && Date.parse(hist.at(-1)!.due) > Date.parse(hist.find((c) => c.result === "failed")!.failedAt ?? hist[0].due) && ev.status !== "verified";
  if (s.expect.retention === "passed") rOk = hist.some((c) => c.result === "passed");
  if (s.expect.retention === "none-due") rOk = !phases.some((p) => p.phase === "retention") && hist.every((c) => c.result === "pending");
  if (s.expect.retention === "scheduled") rOk = ev.retention === "scheduled";
  add("9 retention / recovery decision", rOk, rDetail);
  // 10 bounded termination
  const perQ = new Map<string, number>();
  for (const a of recs.attempts) perQ.set(exposureKey(a.questionId), (perQ.get(exposureKey(a.questionId)) ?? 0) + 1);
  const perU = new Map<string, number>();
  for (const u of recs.unresolved) perU.set(exposureKey(u.questionId), (perU.get(exposureKey(u.questionId)) ?? 0) + 1);
  const bounded = r.terminated && [...perQ.values()].every((n) => n <= 1 + RETRY_LIMIT) && [...perU.values()].every((n) => n <= UNREADABLE_LIMIT) && (!s.expect.ended || s.expect.ended.includes(f.ended?.phase ?? "?"));
  add("10 bounded termination", bounded, `ended ${f.ended?.phase ?? "running"} after ${r.interactions} interactions`);
  return out;
}
