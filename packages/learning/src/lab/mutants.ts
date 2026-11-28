/**
 * child-lab@2: mutants — each breaks one engine behaviour on purpose, at the lab's boundary with the engine, so the lab can
 * show that the checks claiming to protect that behaviour notice when it goes. A mutant that no scenario notices means the
 * lab's checks do not protect what they say. Used only by the mutation tests and the lab script; never by the app.
 */
import { question } from "../content";
import { graph } from "../graph";
import type { Mutant } from "./drive";

const SHOWN = ["independent", "transfer", "verified"];
const target = (c: string) => (graph.byId.has(c) ? graph.evidenceTarget(c) : c);

export const MUTANTS: Mutant[] = [
  { id: "answer-leak", says: "the child's response is replaced by the question's answer key",
    respond: (qid, own) => ({ ...own, text: question(qid).answer }) },
  { id: "premature-mastery", says: "a skill counts as shown on your own as soon as its lesson is given",
    evidence: (c, ev, run) => (!SHOWN.includes(ev.status) && run.rows.some((r) => r.prompt.startsWith("LESSON") && r.active && target(r.active) === target(c)) ? { ...ev, status: "independent" } : ev) },
  { id: "ignore-recent-errors", says: "the engine is not shown wrong practice answers",
    records: (events) => events.filter((e) => !(e.record === "attempt" && (e as { activity?: string }).activity === "practice" && (e as { assessment?: { answerCorrect?: boolean } }).assessment?.answerCorrect === false)) },
  { id: "repeat-transfer", says: "after a lesson, the check that should be a new question repeats one already asked",
    recovery: (r, run) => {
      const taught = run.rows.some((x) => x.prompt.startsWith("LESSON"));
      const before = run.rows.find((x) => x.qid && x.phase === "investigate");
      return taught && r.phase === "investigate" && before ? { ...r, question: before.qid } : r;
    },
    module: (ms, c, run) => {
      const lesson = run.rows.findIndex((x) => x.prompt.startsWith("LESSON") && x.active === c);
      const first = run.rows.find((x) => x.qid && x.active === c);
      return lesson >= 0 && first && ms.question && (ms.phase === "check" || ms.phase === "verify") ? { ...ms, question: first.qid } : ms;
    } },
  { id: "skip-retention", says: "the delayed check is never asked, and a failed one is not recorded",
    module: (ms) => (ms.phase === "retention" ? { ...ms, phase: "done" as typeof ms.phase, question: null } : ms),
    evidence: (_c, ev) => (ev.retention === "failed" ? { ...ev, retention: "passed", recoveryRequired: false, status: ev.status === "review" ? "independent" : ev.status } : ev) },
  { id: "incomplete-recovery", says: "recovery counts the problem solved as soon as one lesson has been given",
    recovery: (r, run) => (run.rows.some((x) => x.prompt.startsWith("LESSON")) && !["solved", "solved_on_retry", "solved_after_help", "escalate"].includes(r.phase) ? { ...r, phase: "solved_after_help", question: null, active: null, reason: "mutant: solved after one lesson" } : r) },
];
export const mutant = (id: string): Mutant => { const m = MUTANTS.find((x) => x.id === id); if (!m) throw new Error(`child-lab: unknown mutant ${id}`); return m; };
