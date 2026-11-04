/**
 * sub-skill-evidence@0 (Workstream E1): a NON-AUTHORITATIVE, read-only projection of a learner's existing events onto the sub-skills of
 * solving equations. It never changes, replaces or feeds a production decision: no production module imports it (a test enforces this), its
 * output says `authoritative: false`, and the production status it reports beside its own is read from the unchanged evidence engine.
 *
 * Why: production evidence for MATH.algebra.linear-equations is competency-level (evidence.ts skillEvidence). Success on one family of
 * equations (ax + b = c) can establish "independent" — and, after a delayed check on that same family, "verified" — for the whole
 * competency, with no evidence on equations with x on both sides or with brackets. This projection makes that visible, per sub-skill.
 *
 * Sub-skills are the question families the modules already use (problemOf(questionId).family); nothing is inferred from text. For each:
 *   answers   independent right / wrong and assisted right / wrong — the production rules (evidence.ts independentAttempt, rightAnswer)
 *   method    from the trusted grader's working verdict stored in the event's decision (D1 working-assessment@1) when present:
 *             verified / invalid / unsupported / partial / answer-only; "not recorded" when the decision carries none (every record before
 *             D1); working the learner wrote but no trusted verdict judged is "unverified" — never verified. Method never changes an answer.
 *   status    no-evidence / exposure / assisted-only / emerging / shown / lapsed / review — the production "independent" rule applied to
 *             this sub-skill's own attempts only (INDEPENDENT_MIN distinct right first answers alone, probes excluded; two wrong of the last
 *             three undo it); a failed delayed check not yet recovered is "review", as in production
 *   retention the production delayed-check cycle (retention@2) applied to this sub-skill's own retention answers, needing production's
 *             number of distinct answers: passed / failed (kept in the history, never forgiven) / recovered and rescheduled / scheduled /
 *             due / never checked / not in the delayed check (the module's check has no question of this sub-skill: a content gap)
 *   history   firstShownAt is kept once reached, whatever happens later
 *
 * Deterministic: a pure function of (events, now, marks, superseding decisions) and the grading mode (recorded in `inputs`); events are
 * ordered by (at, id, canonical content) with code-point comparison, so input order does not matter; the digest is sha256 of the canonical
 * projection, so a replay from stored events can be compared exactly.
 */
import { DAY, INDEPENDENT_MIN, RETENTION_CHECK, RETENTION_DAYS, independentAttempt, rightAnswer } from "./evidence.ts";
import { moduleFor } from "./content.ts";
import { problemOf } from "./families.ts";
import { readRecords, withDecisions, type Attempt, type ServerDecision } from "./records.ts";
import { learnerState } from "./session.ts";
import { sha256Hex } from "./digest.ts";
import { unifiedAuthoritative } from "./grading/mode.ts";
import type { WrittenMark } from "./written.ts";

export const SUB_SKILL_EVIDENCE = "sub-skill-evidence@0" as const;
export const LINEAR_EQUATIONS = "MATH.algebra.linear-equations";
export const ONE_STEP = "MATH.algebra.linear-intro";

export interface SubSkill { id: string; title: string; competency: string; families: string[]; role: "solving" | "supporting" }
/** the solving sub-skills, by the question families the modules use (content/learning modules; families.ts / fam/b08.ts / fam/b21.ts) */
export const SUB_SKILLS: readonly SubSkill[] = [
  { id: "one-step", title: "One-step equations (x + a = b, ax = b, x ÷ a = b)", competency: ONE_STEP, families: ["ahone"], role: "solving" },
  { id: "two-step", title: "Two-step equations (ax + b = c)", competency: LINEAR_EQUATIONS, families: ["lin"], role: "solving" },
  { id: "variables-both-sides", title: "Variables on both sides (ax + b = cx + d)", competency: LINEAR_EQUATIONS, families: ["lboth"], role: "solving" },
  { id: "brackets", title: "Equations with brackets (a(x + s) = cx + d)", competency: LINEAR_EQUATIONS, families: ["lbrk"], role: "solving" },
  { id: "forming-equations", title: "Forming an equation from a situation", competency: LINEAR_EQUATIONS, families: ["auleq", "aulwp"], role: "supporting" },
];
/** what "solve linear equations" needs, sub-skill by sub-skill, for a claim about the whole competency to be supported */
export const REQUIRED: Record<string, readonly string[]> = { [LINEAR_EQUATIONS]: ["two-step", "variables-both-sides", "brackets"], [ONE_STEP]: ["one-step"] };

export const familyOf = (qid: string): string | null => problemOf(qid.replace(/:(mc|w)$/, ""))?.family ?? null;
export const subSkillOf = (qid: string): string | null => { const f = familyOf(qid); return f ? SUB_SKILLS.find((s) => s.families.includes(f))?.id ?? null : null; };

type Method = "verified" | "invalid" | "unsupported" | "partial" | "answer-only" | "no-working" | "unverified" | "not-recorded";
interface StoredWorking { schema?: string; status?: string; methodEvidence?: string }
type StoredDecision = { schema?: string; decidedBy?: string; working?: StoredWorking };
/** the trusted working verdict for one attempt, read only from the SERVER's stored decision (records.ts serverVerdict's guard); never from
 *  the client's working or from a decision the server did not record */
function methodOf(a: Attempt, decision: StoredDecision | undefined): Method {
  const w = decision && decision.schema === "grading-decision@1" && decision.decidedBy === "server" ? decision.working : undefined;
  if (w && w.schema === "working-assessment@1") {
    if (w.methodEvidence === "method-verified" && w.status === "verified") return "verified";
    if (w.status === "invalid") return "invalid";
    if (w.status === "partial") return "partial";
    if (w.status === "answer-only") return "answer-only";
    if (w.status === "none") return "no-working";
    return "unsupported";
  }
  return a.working?.length ? "unverified" : "not-recorded";
}

export interface RetentionCycle { due: string; result: "passed" | "failed" | "pending"; checkedBy: string[]; failedAt: string | null; recoveredAt: string | null }
export interface SubSkillProjection {
  id: string; title: string; competency: string; role: SubSkill["role"]; families: string[];
  questions: string[];
  answers: { independentRight: number; independentWrong: number; assistedRight: number; assistedWrong: number };
  /** every attempt's trusted method verdict (answers alone and assisted together) */
  method: Record<Method, number>;
  /** answers given alone only: right answers whose trusted working verdict was verified / invalid */
  alone: { correctWithVerifiedMethod: number; correctWithInvalidMethod: number; verified: number; invalid: number };
  /** review: the production rule for a failed delayed check (shown before, the check failed, not yet recovered) */
  status: "no-evidence" | "exposure" | "assisted-only" | "emerging" | "shown" | "lapsed" | "review";
  firstShownAt: string | null;
  /** not-in-delayed-check: the module's delayed check has no question of this sub-skill, so it can never be checked (a content gap) */
  retention: "never-checked" | "scheduled" | "due" | "passed" | "failed" | "not-applicable" | "not-in-delayed-check";
  /** distinct delayed-check answers needed to pass, as production: min(RETENTION_CHECK, the module's retention questions of this sub-skill) */
  checkNeeds: number;
  retentionHistory: RetentionCycle[];
  recoveryRequired: boolean;
  basis: string[];
}
export interface Projection {
  schema: typeof SUB_SKILL_EVIDENCE; authoritative: false; learnerId: string; at: string; events: number;
  subSkills: SubSkillProjection[];
  competencies: { competency: string; production: { status: string; verified: boolean; retention: string }; required: string[]; shown: string[]; missing: string[]; retained: string[]; notInDelayedCheck: string[]; supports: "none" | "partial" | "shown-all-required" | "retained-all-required"; leakage: { kind: string; missing: string[]; detail: string }[] }[];
  /** what else the result depends on (it is part of the digest): the grading mode for records without a stored decision, marks supplied */
  inputs: { gradingAuthoritative: boolean; marks: number; supersedingDecisions: number };
  digest: string;
}

const MASTERY = new Set(["independent", "transfer", "verified"]);

function project(s: SubSkill, attempts: Attempt[], decisions: Map<string, StoredDecision>, now: number): SubSkillProjection {
  const mine = attempts.filter((a) => s.families.includes(familyOf(a.questionId) ?? ""));
  // as production for a competency: a probe is evidence for a micro-skill only, never for the skill (evidence.ts skillEvidence)
  const ind = mine.filter((a) => independentAttempt(a) && a.activity !== "probe"), assisted = mine.filter((a) => !independentAttempt(a));
  const method: Record<Method, number> = { verified: 0, invalid: 0, unsupported: 0, partial: 0, "answer-only": 0, "no-working": 0, unverified: 0, "not-recorded": 0 };
  const alone = { correctWithVerifiedMethod: 0, correctWithInvalidMethod: 0, verified: 0, invalid: 0 };
  for (const a of mine) {
    const m = methodOf(a, decisions.get(a.id)); method[m]++;
    if (ind.includes(a)) { if (m === "verified") { alone.verified++; if (rightAnswer(a)) alone.correctWithVerifiedMethod++; } if (m === "invalid") { alone.invalid++; if (rightAnswer(a)) alone.correctWithInvalidMethod++; } }
  }
  // the production "independent" rule, on this sub-skill's own attempts
  const distinct = new Set<string>(); let shownAt: string | null = null;
  for (const a of ind) { if (rightAnswer(a)) distinct.add(a.questionId); if (!shownAt && distinct.size >= INDEPENDENT_MIN && rightAnswer(a)) shownAt = a.at; }
  const after = shownAt ? ind.filter((a) => a.at > shownAt!) : [];
  const lastInd = ind.at(-1);
  const still = !!shownAt && !!lastInd && (rightAnswer(lastInd) || after.slice(-3).filter((a) => !rightAnswer(a)).length < 2);
  // the production delayed-check cycle (retention@2) on this sub-skill's own retention answers, needing as many distinct answers as
  // production would from this sub-skill's share of the module's delayed check (none: this sub-skill is never in the check)
  const checkNeeds = Math.min(RETENTION_CHECK, (moduleFor(s.competency)?.retention ?? []).filter((q) => s.families.includes(familyOf(q) ?? "")).length);
  const history: RetentionCycle[] = [];
  let due = shownAt ? new Date(Date.parse(shownAt) + RETENTION_DAYS * DAY).toISOString() : null;
  let retention: SubSkillProjection["retention"] = shownAt ? "never-checked" : "not-applicable";
  while (due) {
    const d = due;
    const answers = ind.filter((a) => a.activity === "retention" && a.at >= d);
    const firstWrong = answers.find((a) => !rightAnswer(a));
    if (!firstWrong) {
      const passed = checkNeeds > 0 && new Set(answers.map((a) => a.questionId)).size >= checkNeeds;
      retention = passed ? "passed" : now >= Date.parse(d) ? "due" : "scheduled";
      history.push({ due: d, result: passed ? "passed" : "pending", checkedBy: answers.map((a) => a.id), failedAt: null, recoveredAt: null });
      break;
    }
    const seen = new Set<string>(); let recoveredAt: string | null = null;
    for (const a of ind) if (a.at > firstWrong.at && a.activity !== "retention" && rightAnswer(a)) { seen.add(a.questionId); if (seen.size >= INDEPENDENT_MIN) { recoveredAt = a.at; break; } }
    history.push({ due: d, result: "failed", checkedBy: answers.filter((a) => a.at <= firstWrong.at).map((a) => a.id), failedAt: firstWrong.at, recoveredAt });
    retention = "failed";
    due = recoveredAt ? new Date(Date.parse(recoveredAt) + RETENTION_DAYS * DAY).toISOString() : null;
  }
  // "never checked": shown, the check is due or scheduled, but no retention question of this sub-skill was ever answered
  if (retention === "due" && !ind.some((a) => a.activity === "retention")) retention = "never-checked";
  if (shownAt && checkNeeds === 0 && retention !== "failed") retention = "not-in-delayed-check";
  // a failed delayed check, not yet recovered, is "review" (production's status for it); the first success stays in firstShownAt and the history
  const status: SubSkillProjection["status"] = !mine.length ? "no-evidence" : retention === "failed" ? "review" : still ? "shown" : shownAt ? "lapsed" : ind.some(rightAnswer) ? "emerging" : assisted.some(rightAnswer) ? "assisted-only" : "exposure";
  return {
    id: s.id, title: s.title, competency: s.competency, role: s.role, families: s.families,
    questions: [...new Set(mine.map((a) => a.questionId))].sort(),
    answers: { independentRight: ind.filter(rightAnswer).length, independentWrong: ind.filter((a) => !rightAnswer(a)).length, assistedRight: assisted.filter(rightAnswer).length, assistedWrong: assisted.filter((a) => !rightAnswer(a)).length },
    method, alone, status, firstShownAt: shownAt, retention, checkNeeds, retentionHistory: history, recoveryRequired: retention === "failed", basis: mine.map((a) => a.id),
  };
}

const canon = (v: unknown): string => (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}` : JSON.stringify(v));

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);   // code points: no locale
/**
 * The projection for one learner from their stored events (as the server keeps them, decisions inside), at `now`. Read-only.
 * `marks` (educator marks of written answers) and `decisions` (the server's superseding decisions: attempt id -> decision, as GET .../events
 * returns them) are the same inputs production evidence reads; pass them when the caller has them.
 */
export function subSkillProjection(learnerId: string, events: readonly { kind: string }[], now: number, o: { marks?: readonly WrittenMark[]; decisions?: Record<string, ServerDecision> } = {}): Projection {
  // deterministic order: time, then id, then the event's own canonical text (so duplicates cannot reorder by input position)
  const keyed = withDecisions(events as { kind: string }[], o.decisions).map((e) => ({ e, a: String((e as { at?: string }).at ?? ""), i: String((e as { id?: string }).id ?? ""), c: canon(e) }));
  const ordered = keyed.sort((x, y) => cmp(x.a, y.a) || cmp(x.i, y.i) || cmp(x.c, y.c)).map((x) => x.e);
  const records = readRecords(learnerId, ordered, o.marks ?? []);
  // the decision behind each ACCEPTED attempt only (this learner's, as readRecords accepted it): the first stored event with that id
  const accepted = new Set(records.attempts.map((a) => a.id));
  const decisions = new Map<string, StoredDecision>();
  for (const e of ordered) { const r = e as { kind?: string; learnerId?: string; record?: string; id?: string; decision?: StoredDecision }; if (r.kind === "learning_record" && r.learnerId === learnerId && r.record === "attempt" && r.id && accepted.has(r.id) && r.decision && !decisions.has(r.id)) decisions.set(r.id, r.decision); }
  const subSkills = SUB_SKILLS.map((s) => project(s, records.attempts, decisions, now));
  const st = learnerState(learnerId, ordered, now, { marks: o.marks ?? [] });
  const competencies = Object.entries(REQUIRED).map(([competency, required]) => {
    const e = st.evidence(competency);
    const by = (id: string) => subSkills.find((x) => x.id === id)!;
    const shown = required.filter((id) => by(id).status === "shown");
    const missing = required.filter((id) => by(id).status !== "shown");
    const retained = required.filter((id) => by(id).retention === "passed");
    // a content gap, not a learner finding: the module's delayed check has no question of these sub-skills
    const notInDelayedCheck = required.filter((id) => by(id).checkNeeds === 0);
    const leakage: Projection["competencies"][number]["leakage"] = [];
    if (MASTERY.has(e.status) && missing.length) leakage.push({ kind: "competency-status-without-sub-skill-evidence", missing, detail: `production status "${e.status}" for ${competency}; not shown on their own: ${missing.join(", ")}` });
    const unchecked = required.filter((id) => !retained.includes(id));
    if ((e.retention === "passed" || e.verified) && unchecked.length) leakage.push({ kind: e.verified ? "verified-without-sub-skill-check" : "delayed-check-passed-without-sub-skill-check", missing: unchecked, detail: `production ${e.verified ? "verified" : "delayed check passed for"} ${competency}; no passed delayed check on: ${unchecked.join(", ")}${notInDelayedCheck.length ? ` (the module's delayed check has no question of: ${notInDelayedCheck.join(", ")})` : ""}` });
    const supports = retained.length === required.length ? "retained-all-required" : shown.length === required.length ? "shown-all-required" : shown.length ? "partial" : "none";
    return { competency, production: { status: e.status, verified: e.verified, retention: e.retention }, required: [...required], shown, missing, retained, notInDelayedCheck, supports, leakage } as Projection["competencies"][number];
  });
  const inputs = { gradingAuthoritative: unifiedAuthoritative(), marks: o.marks?.length ?? 0, supersedingDecisions: Object.keys(o.decisions ?? {}).length };
  const body = { schema: SUB_SKILL_EVIDENCE, authoritative: false as const, learnerId, at: new Date(now).toISOString(), events: ordered.length, subSkills, competencies, inputs };
  return { ...body, digest: sha256Hex(canon(body)) };
}
