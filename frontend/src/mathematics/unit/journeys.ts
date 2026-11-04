/**
 * Synthetic learner journeys through the Completing the square unit, played end to end the way the screens play them:
 * every step in order, each question answered by the synthetic learner's rule, the similar extra question after a
 * wrong answer, and every help branch the program opens (teach → guided → check, diagnosis, pause). Each decision is
 * recorded with the planner's own reason.
 *
 * These test what the program does. They are not evidence that anyone learns: the learners are rules, not people.
 */
import { activeBranch, branches, explain, firstDifficultyExample, outcome, rules, transferFindings, type Branch } from "../../../../packages/mathematics/src/remediation";
import { canComplete, question, replay, resumePoint, standing, unit, type UnitActivity, type UnitState } from "../../../../packages/mathematics/src/unit";

export interface TraceEntry {
  visit: number;
  stage: string;
  /** What happened: an answer in the program, the first-difficulty help, or a step of a help branch. */
  event: "answer" | "first-difficulty" | "teach" | "guided" | "check" | "diagnose" | "pause" | "skip";
  question?: string;
  response?: string;
  correct?: boolean;
  rule?: string;
  strategy?: string;
  /** What the learner is told, in the unit's words. */
  reason?: string;
  /** The shared planner's own action and reason (audit). */
  planner?: string;
}
export interface Journey {
  id: string;
  title: string;
  expected: string;
  /** The synthetic learner's answer to a question (default: the right answer). */
  answers?: Record<string, string>;
  /** Leave the session when this returns true (the next visit starts days later). */
  leaveWhen?: (t: TraceEntry[]) => boolean;
  returnAfterDays?: number;
}
export interface JourneyResult {
  journey: Journey;
  events: UnitActivity[];
  trace: TraceEntry[];
  state: UnitState;
  profileStatus: string;
  /** The help branch open at the moment the learner came back, and where the program was then. */
  resumedWith?: { branch: string | null; stage: string; part: number };
  outcomes: Record<string, string>;
}

const L = "learner:journey";
const T0 = Date.parse("2026-10-19T09:00:00Z");

export function run(j: Journey): JourneyResult {
  const events: UnitActivity[] = [];
  const trace: TraceEntry[] = [];
  let n = 0;
  let day = 0;
  let visit = 1;
  let resumedWith: JourneyResult["resumedWith"];
  const at = () => new Date(T0 + day * 86_400_000 + ++n * 1000).toISOString();
  const session = () => `math:${L}:visit${visit}`;
  const push = (action: UnitActivity["action"], stage: string, extra: Partial<UnitActivity> = {}) =>
    events.push({ kind: "math_activity", program: unit.id, id: `j${++n}`, at: at(), learnerId: L, journey: "jee-main", lessonVersion: unit.version, action, stage, elapsedMs: 1000, sessionId: session(), ...extra });
  const now = () => new Date(T0 + day * 86_400_000 + (n + 1) * 1000).toISOString();
  const state = () => replay(L, events, now()).state;
  const respond = (qid: string) => j.answers?.[qid] ?? question(qid).answer;
  const answer = (stage: string, qid: string, kind: TraceEntry["event"], extra: Partial<TraceEntry> = {}) => {
    const response = respond(qid);
    push("answer", stage, { questionId: qid, response });
    trace.push({ visit, stage, event: kind, question: qid, response, correct: state().answers[qid]?.correct, ...extra });
  };
  let left = false;
  const maybeLeave = () => {
    if (!left && j.leaveWhen?.(trace)) {
      left = true;
      day += j.returnAfterDays ?? 3;
      visit++;
      const s = state();
      resumedWith = { branch: activeBranch(s, now(), session())?.kind ?? null, stage: resumePoint(s).stage, part: resumePoint(s).part };
    }
  };
  /** Play every open help branch to its end, as the learner would (bounded: the program itself is bounded). */
  const settle = (stage: string) => {
    for (let guard = 0; guard < 40; guard++) {
      maybeLeave();
      const b: Branch | null = activeBranch(state(), now(), session());
      if (!b) return;
      const told = explain(b, state());
      const planner = "decision" in b ? `${b.decision.action}${b.decision.strategy ? `(${b.decision.strategy})` : ""}: ${b.decision.diagnosis.kind}; ${b.decision.reason}` : undefined;
      if (b.kind === "teach") {
        push("teach", stage, { response: `${b.rule.id}:${b.strategy.id}` });
        trace.push({ visit, stage, event: "teach", rule: b.rule.id, strategy: b.strategy.id, reason: told, planner });
      } else if (b.kind === "guided" || b.kind === "check") answer(stage, b.question, b.kind, { rule: b.rule.id, strategy: b.strategy.id, reason: told, planner });
      else if (b.kind === "diagnose") answer(stage, b.question, "diagnose", { reason: told });
      else {
        trace.push({ visit, stage, event: "pause", rule: b.rule.id, reason: told, planner });
        push("skip", stage, { response: b.target });
      }
    }
    throw new Error("help did not end: the program must be bounded");
  };
  for (const s of unit.stages) {
    if (s.id === unit.stages.at(-1)!.id) {
      day += 7.2;
      visit++;
    }
    push("open", s.id);
    for (const qid of s.questions) {
      if (state().answers[qid]) continue;
      answer(s.id, qid, "answer");
      const st = state();
      if (!st.answers[qid].correct) {
        const ex = firstDifficultyExample(st, qid);
        // exactly what the screen offers: the question's own similar question, or (for a check that ends a teaching
        // part) the part's re-explanation with its similar question
        const section = s.sections?.find((sec) => sec.check === qid);
        const offered = question(qid).support ?? section?.remediate?.support;
        const support = offered && !st.answers[offered] ? offered : undefined;
        if (ex || support) trace.push({ visit, stage: s.id, event: "first-difficulty", question: qid, rule: ex?.id, reason: [ex ? "a similar worked example" : null, support ? `a similar question (${support})` : null].filter(Boolean).join(" and ") });
        if (support) answer(s.id, support, "answer");
      }
      settle(s.id);
    }
    if (canComplete(state(), s.id, Date.parse(now()))) {
      push("complete", s.id, s.id === unit.retentionAfter ? { retentionDueAt: new Date(T0 + (day + 7) * 86_400_000).toISOString() } : {});
      settle(s.id);
    }
  }
  const final = replay(L, events, now());
  return {
    journey: j,
    events,
    trace,
    state: final.state,
    profileStatus: final.profile.status,
    resumedWith,
    outcomes: Object.fromEntries(rules.map((r) => [r.id, outcome(final.state, r, now(), session())])),
  };
}

const W = (o: Record<string, string>) => o;
export const JOURNEYS: Journey[] = [
  {
    id: "weak-foundations",
    title: "Weak algebra foundations",
    expected: "Receives prerequisite teaching before or alongside completing the square",
    answers: W({ p1: "5", d1: "A", ds1: "7", d2: "-5,5", ds2: "-4,4", prc1: "-2,2" }),
  },
  {
    id: "same-mistake",
    title: "Repeatedly makes the same mistake (adds b instead of (b/2)²)",
    expected: "Receives a different explanation and suitable additional practice",
    answers: W({ e2: "10", es1: "12", ftg1: "49", ftc1: "12" }),
  },
  {
    id: "transfer",
    title: "Understands the procedure but fails transfer",
    expected: "Receives application-specific teaching",
    answers: W({ t1: "13", t3: "-3,-1", t5: "5", tp5: "-7,3", t6: "-10" }),
  },
  { id: "strong", title: "Strong student", expected: "Advances without unnecessary remediation" },
  {
    id: "returning",
    title: "Returning learner (leaves in the middle of help, back 3 days later)",
    expected: "Resumes the correct stage, including unfinished remediation",
    answers: W({ d2: "-5,5", ds2: "-4,4", prc1: "-2,2" }),
    leaveWhen: (t) => t.some((e) => e.event === "guided" && e.question === "pr1"),
    returnAfterDays: 3,
  },
  {
    id: "still-struggling",
    title: "Still struggling after support",
    expected: "Gets a clear, non-punitive next step without an infinite loop",
    answers: W({ p1: "5", d1: "A", ds1: "7", px1: "2,4", pxc1: "9", px2: "-3,9", pxc2: "A" }),
  },
];

export { branches, transferFindings, standing };
