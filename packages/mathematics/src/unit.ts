/**
 * A reference teaching unit (first: Completing the square, within JEE Main Quadratic Equations), with teaching kept
 * apart from assessment:
 *
 *   teaching (prerequisites, the picture)  →  worked examples (and the derivation of the formula)  →  guided practice
 *   (hints)  →  independent practice  →  application and error analysis  →  transfer  →  delayed retention (7 days)
 *
 * The unit is one fixed, assigned program: it never rewrites itself. When a learner struggles, the program offers what
 * it already contains (a misconception-specific explanation, the teaching screens to revisit, one similar extra
 * question), chosen by pure rules from the learner's own records (`advice`).
 *
 * Three different things are tracked and never mixed up:
 *   completion     steps finished (activity), from the account records
 *   demonstrated   unassisted, correct first answers in the independent, application, transfer and retention steps
 *                  (provisional content: a sign of progress in this unit, not a claim of proficiency)
 *   verified       only the shared engine's one verification definition (verification@2, H-V1 to H-V4). Provisional
 *                  content is never eligible, so this unit can never verify mastery.
 *
 * Evidence semantics are the shared ledger's own: teaching and worked-example predictions are recorded as assisted
 * responses (never an estimate change); hints and worked solutions are hint events; answers after a hint carry them in
 * their provenance (assisted@1). No separate mastery engine.
 *
 * Versions: the content has a version; the server accepts new records for the current version only. Replay also reads
 * records of the versions listed in `compatibleVersions` (question ids are never reused with a different meaning), so
 * an upgrade never erases history. See docs/mathematics/CONTENT_VERSIONING.md.
 */
import spec from "../../../content/mathematics/programs/completing-the-square.v1.json";
import { indexContent, scoreCode } from "../../english-core/src/content";
import type { AssistedResponseEvent, EvidenceEvent, EvidenceUse, HintEvent, Item } from "../../english-core/src/types";
import { sharedProfile } from "./canonical";
import { mathematicsLedger } from "./registration";

export type QuestionType = "choice" | "integer" | "fraction" | "values";
export interface UnitQuestion {
  id: string;
  type: QuestionType;
  difficulty: number;
  skill: string;
  prompt: string;
  answer: string;
  solution: string;
  options?: string[];
  fields?: string[];
  unordered?: boolean;
  hint?: string;
  /** signal: what this wrong answer shows on its own (used only when it is unambiguous; see remediation.ts). */
  misconceptions?: { when: string; says: string; signal?: string }[];
  support?: string;
  /** "remediation": asked only inside a help branch (never part of a step). */
  role?: "remediation";
  /** The competency this question is about, when it is not the unit's own (prerequisite questions). */
  competency?: string;
  revisit?: { stage: string; section: string };
}
export interface Screen {
  title: string;
  text?: string[];
  math?: string[];
  mathAt?: number;
  tip?: string;
  widget?: { type: "tiles" | "balance" | "minimum"; b?: number; mode?: "show" | "split" | "build"; choose?: boolean; p?: number; q?: number };
  predict?: string;
  reveal?: { text?: string[]; math?: string[]; mathAt?: number; tip?: string };
}
export interface Section {
  id: string;
  title: string;
  screens: Screen[];
  check?: string;
  remediate?: { screens: Screen[]; support?: string };
}
export interface Step {
  text: string;
  math?: string[];
  why?: string;
  predict?: string;
}
export interface Example {
  id: string;
  title: string;
  problem: string;
  steps: Step[];
}
export type Phase = "teaching" | "worked" | "guided" | "independent" | "application" | "transfer" | "retention";
export interface UnitStage {
  id: string;
  title: string;
  phase: Phase;
  kind: "teach" | "worked" | "questions";
  hints: boolean;
  questions: string[];
  support: string[];
  sections?: Section[];
  examples?: Example[];
  check?: string;
  intro?: { id: string; screens: Screen[] };
}
export interface Strategy {
  id: string;
  title: string;
  screens: Screen[];
  /** One guided question (hints; recorded as assisted) and one fresh independent check. */
  guided: string;
  reassess: string;
  /** Also show this (prerequisite) rule's first strategy as the teaching. */
  teachFrom?: string;
}
export interface Rule {
  id: string;
  kind: "prerequisite" | "procedure" | "transfer";
  /** For transfer rules: which kind of transfer demand. */
  category?: "interpret" | "recognise" | "translate";
  /** A competency of the curriculum graph. */
  competency: string;
  name: string;
  /** Shown to the learner: why this help is offered. */
  why: string;
  /** Main questions whose wrong first answers count as observations of this rule. */
  observe: string[];
  prerequisite?: string;
  /** A similar worked example, shown with the first wrong answer (procedure rules). */
  example?: { problem: string; steps: { text: string }[]; tip?: string };
  strategies: Strategy[];
}
export interface TransferDiagnosis {
  question: string;
  /** The rule taught when the parts are right but the whole is not. */
  demand: string;
  /** The procedure rule taught when the procedure itself is what failed. */
  procedure: string;
  probes: { question: string; tests: "procedure" | "translate" }[];
}
export interface UnitSpec {
  id: string;
  version: string;
  compatibleVersions: string[];
  title: string;
  track: string;
  competencyId: string;
  reviewNote: string;
  retentionAfter: string;
  retentionDelayDays: number;
  stages: UnitStage[];
  questions: UnitQuestion[];
  remediation: { policy: { guidedItems: number; reassessItems: number; reassessPassMin: number; reassessContrastItems: number }; rules: Rule[]; transfer: TransferDiagnosis[] };
}
export const unit = spec as unknown as UnitSpec;

/** teach: a help branch's teaching block was started (response "rule:strategy"); skip: help was set aside (response: the rule, or "transfer:<question>"). */
export type UnitAction = "open" | "hint" | "solution" | "answer" | "complete" | "teach" | "skip";
export interface UnitActivity {
  kind: "math_activity";
  program: string;
  id: string;
  at: string;
  learnerId: string;
  journey: string;
  lessonVersion: string;
  action: UnitAction;
  stage: string;
  questionId?: string;
  response?: string;
  elapsedMs: number;
  sessionId?: string;
  savedAt?: string;
  retentionDueAt?: string;
}

export interface Answer {
  response: string;
  correct: boolean;
  /** Given in teaching, after a hint or after the worked solution was shown. */
  assisted: boolean;
  at: string;
  stage: string;
}
export interface UnitState {
  completed: string[];
  current: string;
  /** The first answer to each question (later answers to the same question are never counted). */
  answers: Record<string, Answer>;
  hints: string[];
  solutions: string[];
  /** Every answer, in order, including later attempts at a question (only the first one counts). */
  attempts: { questionId: string; response: string; correct: boolean; at: string }[];
  /** Help-branch teaching blocks started, and help set aside. */
  teaching: { rule: string; strategy: string; at: string; session: string }[];
  skips: { target: string; at: string }[];
  /** First record time of each visit (session). */
  sessions: Record<string, string>;
  retentionDueAt: string | null;
  timeMs: number;
  /** Distinct visits (sessions), and the time of the latest record. */
  visits: number;
  lastAt: string | null;
}

const byId = new Map(unit.questions.map((q) => [q.id, q]));
export const question = (id: string): UnitQuestion => {
  const q = byId.get(id);
  if (!q) throw new Error(`Unknown unit question ${id}`);
  return q;
};
export const stageOf = (id: string): UnitStage => {
  const s = unit.stages.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown unit stage ${id}`);
  return s;
};
export const LETTERS = ["A", "B", "C", "D"] as const;

// ---------------------------------------------------------------- answers

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** An integer or a fraction n/d (d ≠ 0), reduced: "−6/4" → [−3, 2]. Anything else is not a number here. */
export function rational(raw: string): [number, number] | null {
  const m = raw.trim().replace(/−/g, "-").replace(/\s+/g, "").match(/^([+-]?\d{1,6})(?:\/([+-]?\d{1,6}))?$/);
  if (!m) return null;
  let n = Number(m[1]);
  let d = m[2] === undefined ? 1 : Number(m[2]);
  if (d === 0) return null;
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}
const show = ([n, d]: [number, number]) => (d === 1 ? String(n) : `${n}/${d}`);

/** The canonical text of an answer, or null when it is not an answer of this question's kind. */
export function normalise(q: UnitQuestion, raw: string): string | null {
  const t = raw.trim().replace(/−/g, "-");
  if (q.type === "choice") return /^[A-D]$/i.test(t) ? t.toUpperCase() : null;
  if (q.type === "integer") return /^[+-]?\d{1,9}(\.\d{0,9})?$/.test(t) ? String(Number(t)) : null;
  if (q.type === "fraction") {
    const r = rational(t);
    return r && show(r);
  }
  const parts = t.split(",");
  if (parts.length !== (q.fields?.length ?? 0)) return null;
  const values = parts.map(rational);
  if (values.some((v) => !v)) return null;
  const sorted = q.unordered ? [...(values as [number, number][])].sort((a, b) => a[0] / a[1] - b[0] / b[1]) : (values as [number, number][]);
  return sorted.map(show).join(",");
}
export const isCorrect = (q: UnitQuestion, raw: string) => normalise(q, raw) !== null && normalise(q, raw) === normalise(q, q.answer);

/** What this particular wrong answer usually means: the feedback written for that misconception, if there is one. */
export function misconception(q: UnitQuestion, raw: string): string | null {
  const n = normalise(q, raw);
  if (n === null || n === normalise(q, q.answer)) return null;
  return q.misconceptions?.find((m) => normalise(q, m.when) === n)?.says ?? null;
}

/** Item ids stay those of 1.0.0 across content versions: a question id never changes meaning (CONTENT_VERSIONING.md). */
const ITEM_NAMESPACE = "1.0.0";
export function nativeItem(q: UnitQuestion): Item & { kind: "code" } {
  return {
    kind: "code",
    id: `math:${unit.id}:${ITEM_NAMESPACE}:${q.id}`,
    version: 1,
    family: `math:${unit.id}:${q.skill}@1`,
    target: q.competency ?? unit.competencyId,
    format: "typed:math-unit@1",
    prompt: q.prompt,
    answers: [`${q.type}:${normalise(q, q.answer)}`],
    a: 1,
    b: 4,
    evidence_status: "provisional",
    review: unit.reviewNote,
    explain: q.solution,
  };
}

// ---------------------------------------------------------------- replay

const stageIndex = (id: string) => unit.stages.findIndex((s) => s.id === id);
const retentionStage = () => unit.stages.at(-1)!;
const versions = () => [unit.version, ...unit.compatibleVersions];
/** Which stage a question is answered in (a main question, or a stage's extra practice). */
export const stageOfQuestion = (qid: string) => unit.stages.find((s) => s.questions.includes(qid) || s.support.includes(qid));
const USE: Record<Phase, EvidenceUse | null> = { teaching: null, worked: null, guided: "practice", independent: "assessment", application: "assessment", transfer: "assessment", retention: "retention" };

function empty(): UnitState {
  return { completed: [], current: unit.stages[0].id, answers: {}, hints: [], solutions: [], attempts: [], teaching: [], skips: [], sessions: {}, retentionDueAt: null, timeMs: 0, visits: 0, lastAt: null };
}

const rulesById = new Map(unit.remediation.rules.map((r) => [r.id, r]));
/** Where a remediation question sits: its rule and strategy, and whether it is the guided question, the check or a probe. */
export function remediationRole(qid: string): { rule: string; strategy: string; role: "guided" | "reassess" } | { probe: string } | null {
  for (const r of unit.remediation.rules) for (const st of r.strategies) if (st.guided === qid || st.reassess === qid) return { rule: r.id, strategy: st.id, role: st.guided === qid ? "guided" : "reassess" };
  for (const t of unit.remediation.transfer) if (t.probes.some((p) => p.question === qid)) return { probe: t.question };
  return null;
}

/** Steps that can be finished now: the earlier ones are done, each main question is answered, and the revision is due. */
export function canComplete(state: UnitState, stageId: string, now = Date.now()): boolean {
  const i = stageIndex(stageId);
  if (i < 0 || !unit.stages.slice(0, i).every((s) => state.completed.includes(s.id))) return false;
  if (stageId === retentionStage().id && !(state.retentionDueAt && now >= Date.parse(state.retentionDueAt))) return false;
  return unit.stages[i].questions.every((q) => state.answers[q]);
}

/** The pure replay of the unit's own records (other programs' records are skipped). */
export function replay(learnerId: string, events: readonly { kind: string; program?: string }[], now = new Date().toISOString()) {
  const ledger = mathematicsLedger(learnerId);
  ledger.ctx.content = indexContent({ items: unit.questions.map(nativeItem), passages: [], goals: [], misspellings: {} }, ledger.ctx.index);
  const state = empty();
  const seen = new Set<string>();
  const sessions = new Set<string>();
  const hintIds: Record<string, string[]> = {};
  for (const raw of events) {
    if (raw.kind !== "math_activity" || raw.program !== unit.id) continue;
    const ev = raw as UnitActivity;
    if (seen.has(ev.id) || ev.learnerId !== learnerId || !versions().includes(ev.lessonVersion) || !Number.isFinite(Date.parse(ev.at))) continue;
    const stage = unit.stages.find((s) => s.id === ev.stage);
    if (!stage) continue;
    seen.add(ev.id);
    if (ev.sessionId) {
      sessions.add(ev.sessionId);
      state.sessions[ev.sessionId] ??= ev.at;
    }
    state.lastAt = ev.at;
    state.timeMs += Math.max(0, Math.min(ev.elapsedMs || 0, 3_600_000));
    const session = ev.sessionId ?? `legacy-unknown:${unit.id}`;
    const qid = ev.questionId;
    const remedial = qid ? remediationRole(qid) : null;
    const known = qid && (stage.questions.includes(qid) || stage.support.includes(qid) || !!remedial);
    if (ev.action === "teach" && ev.response) {
      const [rule, strategy] = ev.response.split(":");
      const r = rulesById.get(rule);
      const st = r?.strategies.find((x) => x.id === strategy);
      if (r && st) {
        state.teaching.push({ rule, strategy, at: ev.at, session });
        // the shared ledger's own record of teaching: the guided question is displayed as part of it (assisted@1)
        ledger.apply({ kind: "intervention", id: `native-teach:${ev.id}`, at: ev.at, session, capability: r.competency, strategy, content: `${unit.id}:${rule}`, items: [nativeItem(question(st.guided)).id], reason: r.why });
      }
    }
    if (ev.action === "skip" && ev.response) state.skips.push({ target: ev.response, at: ev.at });
    if ((ev.action === "hint" || ev.action === "solution") && known && !state.answers[qid]) {
      const item = nativeItem(question(qid));
      const hint: HintEvent = { kind: "hint", id: `native-hint:${ev.id}`, at: ev.at, session, item: { id: item.id, version: item.version }, level: ev.action === "hint" ? 1 : 2, hintType: ev.action === "hint" ? "rule_reminder" : "worked_solution", ...(ev.action === "solution" ? { revealsAnswer: true as const } : {}) };
      ledger.apply(hint);
      (hintIds[qid] ??= []).push(hint.id);
      (ev.action === "hint" ? state.hints : state.solutions).push(qid);
    }
    if (ev.action === "answer" && known && state.answers[qid]) {
      const text = normalise(question(qid), ev.response ?? "");
      if (text !== null) state.attempts.push({ questionId: qid, response: text, correct: text === normalise(question(qid), question(qid).answer), at: ev.at });
    }
    if (ev.action === "answer" && known && !state.answers[qid]) {
      const q = question(qid);
      const text = normalise(q, ev.response ?? "");
      if (text === null) continue;
      const item = nativeItem(q);
      const response = { kind: "typed" as const, text: `${q.type}:${text}` };
      // help-branch questions: the guided one is assisted (as the planner says); checks and probes are independent
      const use = remedial ? ("role" in remedial && remedial.role === "guided" ? null : "assessment") : USE[stage.phase];
      const assisted = use === null || !!hintIds[qid]?.length;
      if (use === null) {
        // a prediction or check inside teaching: the item was met as part of the teaching, so it is recorded as an
        // assisted response and never changes an estimate
        const taught: AssistedResponseEvent = { kind: "assisted_response", id: `native:${ev.id}`, at: ev.at, session, item: { id: item.id, version: item.version }, response, attempt: 1, hints: [], afterFeedback: false };
        ledger.apply(taught);
      } else {
        const evidence: EvidenceEvent = {
          kind: "evidence",
          id: `native:${ev.id}`,
          at: ev.at,
          session,
          item: { id: item.id, version: item.version },
          response,
          use,
          provenance: { schema: "provenance@1", attempt: 1, hints: hintIds[qid] ?? [], afterFeedback: false, policies: ["assisted@1"] },
        };
        ledger.apply(evidence);
      }
      state.answers[qid] = { response: text, correct: scoreCode(item, response).correct, assisted, at: ev.at, stage: stage.id };
      state.attempts.push({ questionId: qid, response: text, correct: state.answers[qid].correct, at: ev.at });
    }
    if (ev.action === "complete" && canComplete(state, stage.id, Date.parse(ev.at)) && !state.completed.includes(stage.id)) {
      state.completed.push(stage.id);
      if (ev.retentionDueAt && !state.retentionDueAt) state.retentionDueAt = ev.retentionDueAt;
    }
  }
  state.visits = sessions.size;
  state.current = unit.stages.find((s) => !state.completed.includes(s.id))?.id ?? retentionStage().id;
  return { state, ledger, profile: sharedProfile({ learnerId }, ledger, unit.competencyId, now) };
}

// ---------------------------------------------------------------- where to continue

/** Where a returning learner continues: the step, and inside it the first section, example or question not done. */
export function resumePoint(state: UnitState): { stage: string; part: number } {
  const s = stageOf(state.current);
  const open = (ids: string[]) => ids.findIndex((id) => !state.answers[id]);
  if (s.kind === "teach") {
    const i = s.sections!.findIndex((sec) => [...sec.screens.map((sc) => sc.predict).filter(Boolean), sec.check].filter(Boolean).some((id) => !state.answers[id as string]));
    return { stage: s.id, part: i < 0 ? s.sections!.length - 1 : i };
  }
  if (s.kind === "worked") {
    const i = s.examples!.findIndex((e) => e.steps.some((st) => st.predict && !state.answers[st.predict]));
    // after the last example comes the stage's own check, when it has one (part = number of examples)
    if (i >= 0) return { stage: s.id, part: i };
    return { stage: s.id, part: s.check && !state.answers[s.check] ? s.examples!.length : s.examples!.length - 1 };
  }
  const i = open(s.questions);
  return { stage: s.id, part: i < 0 ? s.questions.length - 1 : i };
}

// ---------------------------------------------------------------- advice: more help from inside the program

export interface Advice {
  stage: string;
  questionId: string;
  /** The misconception-specific explanation of the learner's answer (null: no written match). */
  says: string | null;
  /** Teaching to revisit (a section of a teaching stage, a worked example, or a stage introduction). */
  revisit: { stage: string; section: string } | null;
  /** One similar extra question, while it is still unanswered. */
  support: string | null;
}

/** For every wrong first answer: what it suggests, what to revisit and one similar question to try. Pure and stable. */
export function advice(state: UnitState): Advice[] {
  const out: Advice[] = [];
  for (const s of unit.stages)
    for (const id of s.questions) {
      const a = state.answers[id];
      if (!a || a.correct) continue;
      const q = question(id);
      const section = s.sections?.find((sec) => sec.check === id || sec.screens.some((sc) => sc.predict === id));
      const support = q.support ?? section?.remediate?.support ?? null;
      out.push({ stage: s.id, questionId: id, says: misconception(q, a.response), revisit: q.revisit ?? (section ? { stage: s.id, section: section.id } : null), support: support && !state.answers[support] ? support : null });
    }
  return out;
}

/** A step is a struggle when two or more of its main answers are wrong: the program then recommends its extra practice. */
export function struggling(state: UnitState, stageId: string): boolean {
  return stageOf(stageId).questions.filter((id) => state.answers[id] && !state.answers[id].correct).length >= 2;
}

// ---------------------------------------------------------------- where the learner stands

const DEMONSTRATED: Phase[] = ["independent", "application", "transfer", "retention"];
export interface Standing {
  /** Steps finished, out of all steps (activity). */
  completion: number;
  /** Unassisted correct first answers in the independent, application, transfer and retention steps, out of answered. */
  demonstrated: { correct: number; answered: number };
  byPhase: Record<Phase, { correct: number; answered: number }>;
  /** The shared engine's status for the competency; never "verified" for provisional content. */
  verified: boolean;
  status: string;
}
export function standing(state: UnitState, profile: { status: string }): Standing {
  const byPhase = Object.fromEntries((["teaching", "worked", "guided", "independent", "application", "transfer", "retention"] as Phase[]).map((p) => [p, { correct: 0, answered: 0 }])) as Standing["byPhase"];
  for (const s of unit.stages)
    for (const id of s.questions) {
      const a = state.answers[id];
      if (!a) continue;
      byPhase[s.phase].answered++;
      if (a.correct && (s.phase === "teaching" || s.phase === "worked" || !a.assisted)) byPhase[s.phase].correct++;
    }
  const demonstrated = DEMONSTRATED.reduce((t, p) => ({ correct: t.correct + byPhase[p].correct, answered: t.answered + byPhase[p].answered }), { correct: 0, answered: 0 });
  return { completion: Math.round((100 * state.completed.length) / unit.stages.length), demonstrated, byPhase, verified: profile.status === "verified", status: profile.status };
}
