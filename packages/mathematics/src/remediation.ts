/**
 * The unit's help branch: what to do when a learner does not understand, decided by the shared planner.
 *
 * Nothing here is a new learner model. Each "rule" of the unit (a prerequisite such as squaring a bracket, a procedure
 * such as writing (x + p)² + q, or a transfer demand such as reading a minimum from the completed form) is turned into
 * the planner's own RuleState from the learner's records, and english-core's planRule decides:
 *
 *   one wrong observation     a possible slip: the unit's own feedback, a similar worked example and one similar
 *                             question (no branch; the planner keeps assessing)
 *   two or more               teach the first strategy, then one guided question (assisted), then one fresh check alone
 *   that check wrong          a different strategy (the planner never repeats a failed one); for a procedure the second
 *                             strategy goes back to its prerequisite
 *   strategies used up        recommend a person: a calm pause, and back to the lesson (no loop)
 *   check right               improved after teaching (not mastery), and back to the lesson
 *
 * A wrong answer on an unfamiliar (transfer) problem is diagnosed before anything is taught. An answer that by itself
 * shows what went wrong (a misconception tagged with a signal) is used directly. Otherwise quick questions on the parts
 * decide it: procedure wrong → procedure teaching; the translation wrong → translation teaching; all parts right → the
 * demand itself (recognising the structure, or interpreting the result). Ambiguous answers are never read as a specific
 * misconception.
 *
 * The branch is temporary: the nine-step program, its completion and its resume point are untouched. Everything is
 * derived from the records, so a branch resumes after closing the browser. Help can be set aside ("skip"), and that is
 * shown as unsupported progress, never as understanding.
 */
import { PLANNER_POLICY_DRAFT, planRule, type PlannerDecision, type PlannerPolicy } from "../../english-core/src/planner";
import { rateOf, type InterventionSummary, type MisconceptionRecord, type RuleState } from "../../english-core/src/rule-evidence";
import { competencies } from "./curriculum";
import { misconception, question, stageOfQuestion, unit, type Rule, type Strategy, type UnitState } from "./unit";

/** The shared planner's draft policy with this unit's block size (one guided question, one fresh check, no contrast items). */
export const UNIT_PLANNER_POLICY: PlannerPolicy = { ...PLANNER_POLICY_DRAFT, ...unit.remediation.policy, version: `${PLANNER_POLICY_DRAFT.version}+${unit.id}@${unit.version}` };
export const rules = unit.remediation.rules;
export const rule = (id: string): Rule => {
  const r = rules.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown rule ${id}`);
  return r;
};

// ---------------------------------------------------------------- transfer diagnosis

export type TransferFinding =
  | { question: string; status: "pending"; probe: string }
  | { question: string; status: "classified"; rule: string; basis: "signal" | "probe" | "parts-right"; evidence: string[]; at: string };

/** For each wrong transfer answer: the next quick question to ask, or what the evidence shows. */
export function transferFindings(state: UnitState): TransferFinding[] {
  const out: TransferFinding[] = [];
  for (const t of unit.remediation.transfer) {
    const a = state.answers[t.question];
    if (!a || a.correct) continue;
    const q = question(t.question);
    const signal = q.misconceptions?.find((m) => m.signal && misconception(q, m.when) !== null && misconception(q, a.response) === m.says)?.signal;
    if (signal) {
      out.push({ question: t.question, status: "classified", rule: signal, basis: "signal", evidence: [t.question], at: a.at });
      continue;
    }
    let found: TransferFinding | null = null;
    for (const p of t.probes) {
      const pa = state.answers[p.question];
      if (!pa) {
        found = { question: t.question, status: "pending", probe: p.question };
        break;
      }
      if (!pa.correct) {
        found = { question: t.question, status: "classified", rule: p.tests === "procedure" ? t.procedure : "translate", basis: "probe", evidence: [t.question, p.question], at: pa.at };
        break;
      }
    }
    const last = t.probes.at(-1)!;
    out.push(found ?? { question: t.question, status: "classified", rule: t.demand, basis: "parts-right", evidence: [t.question, ...t.probes.map((p) => p.question)], at: state.answers[last.question].at });
  }
  return out;
}

// ---------------------------------------------------------------- the planner's view of one rule

export interface Observation {
  question: string;
  correct: boolean;
  at: string;
  /** Where it came from: a main question of the unit, a quick diagnostic question, or a transfer finding. */
  source: "unit" | "probe" | "transfer";
}

/** The answers that say something about this rule: unaided first answers only (a hinted answer is not a clean observation). */
export function observations(state: UnitState, r: Rule): Observation[] {
  const out: Observation[] = [];
  const add = (id: string, source: Observation["source"]) => {
    const a = state.answers[id];
    if (a && !state.hints.includes(id) && !state.solutions.includes(id)) out.push({ question: id, correct: a.correct, at: a.at, source });
  };
  for (const id of r.observe) add(id, "unit");
  // a prerequisite is also observed by the prerequisite questions inside procedure help that goes back to it
  if (r.kind === "prerequisite")
    for (const p of rules) for (const st of p.strategies) if (st.teachFrom === r.id) add(st.guided, "probe");
  // a quick question that came out wrong, with the transfer answer it explains: two observations of the same gap
  for (const f of transferFindings(state))
    if (f.status === "classified" && f.rule === r.id && f.basis === "probe") for (const id of f.evidence) out.push({ question: id, correct: false, at: f.at, source: id === f.question ? "transfer" : "probe" });
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

function blocks(state: UnitState, r: Rule): InterventionSummary[] {
  const taught = state.teaching.filter((t) => t.rule === r.id);
  return taught.map((t, i) => {
    const st = r.strategies.find((s) => s.id === t.strategy)!;
    const until = taught[i + 1]?.at ?? "9999";
    const within = (id: string) => {
      const a = state.answers[id];
      return a && a.at >= t.at && a.at < until ? a : null;
    };
    const g = within(st.guided);
    const c = within(st.reassess);
    const cleanCheck = c && !c.assisted ? c : null;
    return {
      id: `${r.id}:${t.strategy}:${t.at}`,
      at: t.at,
      strategy: t.strategy,
      content: r.id,
      during: { right: g?.correct ? 1 : 0, total: g ? 1 : 0, hints: g && state.hints.includes(st.guided) ? 1 : 0, items: 1, rightFirstTry: g?.correct && !state.hints.includes(st.guided) ? 1 : 0, rightWithHelp: g?.correct && state.hints.includes(st.guided) ? 1 : 0 },
      independentAfter: { right: cleanCheck?.correct ? 1 : 0, total: cleanCheck ? 1 : 0, newWordRight: cleanCheck?.correct ? 1 : 0, newWordTotal: cleanCheck ? 1 : 0, contrastRight: 0, contrastTotal: 0, lastAt: cleanCheck?.at ?? null },
    };
  });
}

/** The planner's RuleState for one rule of the unit, built only from the learner's records. */
export function ruleState(state: UnitState, r: Rule): RuleState {
  const obs = observations(state, r);
  const ivs = blocks(state, r);
  const passedAt = ivs.filter((b) => b.independentAfter.newWordRight > 0).at(-1)?.independentAfter.lastAt ?? "";
  // errors after the last block that worked: help that worked is not undone by old mistakes
  const errors = obs.filter((o) => !o.correct && o.at > passedAt);
  // an unambiguous answer (a signal), or the parts right and the whole wrong: the gap is located in this demand, which
  // the planner treats like an active misconception (teach now), never inferred from an ambiguous answer alone
  const signals = transferFindings(state).filter((f) => f.status === "classified" && f.rule === r.id && f.basis !== "probe" && f.at > passedAt);
  const misconceptions: MisconceptionRecord[] = signals.map((f) => ({ rule: r.id, tag: r.id, state: "active", errors: [f.question], practiceErrors: [], recurrences: 0, sinceLastError: { correctNewWords: 0, sessions: 0, contrastsCorrect: 0 }, history: [] }));
  const right = obs.filter((o) => o.correct).length;
  const status = errors.length >= 2 ? "weak" : errors.length === 1 ? "emerging" : "insufficient_evidence";
  const last = [...obs.map((o) => o.at), ...ivs.map((b) => b.at)].sort().at(-1) ?? null;
  return {
    rule: r.id,
    capability: r.competency,
    name: r.name,
    requiredFromBand: 1,
    status,
    reasons: errors.map((o) => `wrong: ${o.question}`),
    current: rateOf(right, obs.length),
    allTime: rateOf(right, obs.length),
    contrast: { right: 0, total: 0, lastCorrect: null },
    practice: { right: 0, total: 0 },
    assisted: { right: 0, total: 0, hints: 0 },
    unknown: { right: 0, total: 0 },
    succeedsWithHelp: false,
    interventions: ivs,
    lastEvidenceAt: last,
    evidenceBasis: { validated: 0, candidate: 0, provisional: obs.length },
    repeats: 0,
    slips: 0,
    inconsistent: false,
    transferGap: false,
    retention: { state: "not_checked", checks: [] },
    history: { firstEmergingAt: null, firstDemonstratedAt: null, firstVerifiedAt: null, lastVerifiedAt: null, statusChanges: [] },
    misconceptions,
  };
}

/** The shared planner's decision for one rule, now. */
export function decide(state: UnitState, r: Rule, now: string, session: string): PlannerDecision {
  const rs = ruleState(state, r);
  const taught = state.teaching.filter((t) => t.rule === r.id);
  const current = taught.at(-1);
  const st = current && r.strategies.find((s) => s.id === current.strategy);
  const guidedThisBlock = st && state.answers[st.guided] && state.answers[st.guided].at >= current!.at ? 1 : 0;
  const d = planRule({
    rule: rs,
    strategies: r.strategies.map((s) => s.id),
    now,
    sessionStartedAt: state.sessions[session] ?? now,
    session,
    available: {
      apply: r.strategies.filter((s) => !state.answers[s.reassess]).length,
      contrast: 0,
      guided: st && !state.answers[st.guided] ? 1 : 0,
    },
    answeredThisSession: observations(state, r).filter((o) => o.at >= (state.sessions[session] ?? now)).length,
    guidedThisBlock,
    policy: UNIT_PLANNER_POLICY,
  });
  // a strategy is taught once per learner: when the planner returns to one whose questions are used (help worked
  // before and the gap came back), take the next strategy with fresh questions; with none left, it is a pause
  if (d.action === "teach" && d.strategy && state.answers[r.strategies.find((x) => x.id === d.strategy)!.reassess]) {
    const fresh = r.strategies.find((x) => !state.answers[x.reassess] && !taught.some((t) => t.strategy === x.id));
    return fresh
      ? { ...d, strategy: fresh.id, reason: `${d.reason} (A different approach, so that the questions are new.)` }
      : { ...d, action: "content_gap", outcome: "content_gap", reason: "Every approach in this unit has been used for this. Pausing it: a teacher or parent can help, and it comes back in the revision." };
  }
  return d;
}

// ---------------------------------------------------------------- the branch the learner sees

export type Branch =
  | { kind: "diagnose"; target: string; question: string; transfer: string; why: string; since: string }
  | { kind: "teach"; target: string; rule: Rule; strategy: Strategy; decision: PlannerDecision; since: string; inProgress: false }
  | { kind: "guided" | "check"; target: string; rule: Rule; strategy: Strategy; question: string; decision: PlannerDecision; since: string; inProgress: true }
  | { kind: "pause"; target: string; rule: Rule; decision: PlannerDecision; since: string };

const ORDER: Rule["kind"][] = ["prerequisite", "procedure", "transfer"];
const skippedSince = (state: UnitState, target: string, since: string) => state.skips.some((s) => s.target === target && s.at >= since);

/** Every help branch that is open now, the one to show first at the front (an unfinished block, then the oldest). */
export function branches(state: UnitState, now: string, session: string): Branch[] {
  const out: Branch[] = [];
  for (const f of transferFindings(state))
    if (f.status === "pending") {
      const since = state.answers[f.question].at;
      if (!skippedSince(state, `transfer:${f.question}`, since))
        out.push({ kind: "diagnose", target: `transfer:${f.question}`, question: f.probe, transfer: f.question, since, why: "Before any more teaching, one quick question on a part of that problem shows which part needs help." });
    }
  for (const r of [...rules].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))) {
    const d = decide(state, r, now, session);
    const obs = observations(state, r).filter((o) => !o.correct);
    const since = [obs.at(-1)?.at, state.teaching.filter((t) => t.rule === r.id).at(-1)?.at].filter(Boolean).sort().at(-1) ?? now;
    const strategy = (id?: string) => r.strategies.find((s) => s.id === id)!;
    const rs = ruleState(state, r);
    const gapNow = rs.status === "weak" || rs.misconceptions.length > 0;
    // a pause is said once: once acknowledged it is not repeated for the same help (new mistakes are still recorded)
    const lastTaught = state.teaching.filter((t) => t.rule === r.id).at(-1)?.at ?? "";
    if (d.action === "recommend_human" || d.action === "content_gap") {
      if (gapNow && !skippedSince(state, r.id, lastTaught)) out.push({ kind: "pause", target: r.id, rule: r, decision: d, since });
      continue;
    }
    if (skippedSince(state, r.id, since)) continue;
    if (d.action === "teach" && d.strategy) out.push({ kind: "teach", target: r.id, rule: r, strategy: strategy(d.strategy), decision: d, since, inProgress: false });
    else if (d.action === "guided_practice") out.push({ kind: "guided", target: r.id, rule: r, strategy: strategy(d.strategy), question: strategy(d.strategy).guided, decision: d, since, inProgress: true });
    else if (d.action === "reassess") out.push({ kind: "check", target: r.id, rule: r, strategy: strategy(d.strategy), question: strategy(d.strategy).reassess, decision: d, since, inProgress: true });
  }
  return out.sort((a, b) => Number("inProgress" in b && b.inProgress) - Number("inProgress" in a && a.inProgress) || a.since.localeCompare(b.since));
}

/** What the learner is told about a planner decision, in this unit's words (the planner's reason is kept for audit). */
export function explain(b: Branch, state: UnitState): string {
  if (b.kind === "diagnose") return b.why;
  // a different explanation only when an earlier one for this rule ended in a wrong check
  const current = "strategy" in b ? b.strategy.id : "";
  const failed = state.teaching.some((t) => t.rule === b.rule.id && t.strategy !== current && state.answers[b.rule.strategies.find((s) => s.id === t.strategy)!.reassess]?.correct === false);
  if (b.kind === "teach")
    return failed
      ? `That way of explaining did not lead to a right answer on your own, so here is a different one. ${b.strategy.teachFrom ? `It goes back to something this step depends on: ${rule(b.strategy.teachFrom).name.toLowerCase()}.` : ""}`.trim()
      : b.rule.why;
  if (b.kind === "guided") return "Practise it once, with a hint if you want one. This answer counts as practice with help, not as work on your own.";
  if (b.kind === "check") return "Now one new question on your own, with no hints. This is the one that shows whether the help worked.";
  return b.decision.action === "content_gap"
    ? "Every explanation in this unit has been tried for this. That is fine: carry on with the lesson, and ask a teacher or parent to go through it with you. It comes back in the revision check."
    : "Two different explanations have not clicked yet. That happens, and it is not a failure: carry on with the lesson, and ask a teacher or parent to go through this with you. It comes back in the revision check.";
}

/** The help to show now, if any. */
export const activeBranch = (state: UnitState, now: string, session: string): Branch | null => branches(state, now, session)[0] ?? null;

/** The rules a wrong first answer to this question is evidence about. */
export const rulesObserving = (qid: string) => rules.filter((r) => r.observe.includes(qid));

/** A similar worked example for the first difficulty with a procedure (shown with the feedback, before any branch). */
export function firstDifficultyExample(state: UnitState, qid: string): Rule | null {
  const r = rulesObserving(qid).find((x) => x.kind === "procedure" && x.example);
  if (!r) return null;
  return observations(state, r).filter((o) => !o.correct).length <= 1 ? r : null;
}

// ---------------------------------------------------------------- where each rule stands (for the learner and for reports)

export type RuleOutcome = "none" | "one-slip" | "help-open" | "improved-after-help" | "help-skipped" | "paused-ask-a-person";
export function outcome(state: UnitState, r: Rule, now: string, session: string): RuleOutcome {
  const d = decide(state, r, now, session);
  const ivs = blocks(state, r);
  const errors = observations(state, r).filter((o) => !o.correct);
  const open = d.action === "teach" || d.action === "guided_practice" || d.action === "reassess";
  const since = [errors.at(-1)?.at, state.teaching.filter((t) => t.rule === r.id).at(-1)?.at].filter(Boolean).sort().at(-1) ?? "";
  if (d.action === "recommend_human") return "paused-ask-a-person";
  if (open && skippedSince(state, r.id, since)) return "help-skipped";
  if (open) return "help-open";
  if (ivs.some((b) => b.independentAfter.newWordRight > 0)) return "improved-after-help";
  return errors.length === 1 ? "one-slip" : "none";
}

/** Which competencies of the curriculum graph the unit's rules point to, and whether the graph lists each one upstream of the unit's own competency. */
export function graphLinks(): { rule: string; competency: string; name: string; upstreamOfUnit: boolean }[] {
  const byId = new Map(competencies.map((c) => [c.id, c]));
  const upstream = new Set<string>();
  const walk = (id: string) => {
    for (const p of byId.get(id)?.prerequisites ?? []) if (!upstream.has(p)) (upstream.add(p), walk(p));
  };
  walk(unit.competencyId);
  return rules.filter((r) => r.kind === "prerequisite").map((r) => ({ rule: r.id, competency: r.competency, name: byId.get(r.competency)?.name ?? "(not in the graph)", upstreamOfUnit: upstream.has(r.competency) }));
}

/** Where the learner will be taken back to after the branch: the step and its title (the program itself never moves). */
export const returnPoint = (state: UnitState) => {
  const s = unit.stages.find((x) => x.id === state.current)!;
  return { stage: s.id, title: s.title, number: unit.stages.indexOf(s) + 1 };
};
export { stageOfQuestion };
