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
 *   status    no-evidence / exposure / assisted-only / emerging / shown / lapsed — the production "independent" rule applied to this
 *             sub-skill's own attempts only (INDEPENDENT_MIN distinct right first answers alone; two wrong of the last three undo it)
 *   retention the production delayed-check cycle (retention@2) applied to this sub-skill's own retention answers: passed / failed (kept in
 *             the history, never forgiven) / recovered and rescheduled / scheduled / due / never checked
 *   history   firstShownAt is kept once reached, whatever happens later
 *
 * Deterministic: a pure function of (events, now); events are ordered by (at, id) first, so input order does not matter; the digest is
 * sha256 of the canonical projection, so a replay from stored events can be compared exactly.
 */
import { DAY, INDEPENDENT_MIN, RETENTION_DAYS, independentAttempt, rightAnswer } from "./evidence.ts";
import { problemOf } from "./families.ts";
import { readRecords, type Attempt } from "./records.ts";
import { learnerState } from "./session.ts";
import { sha256Hex } from "./digest.ts";

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
/** the trusted working verdict for one attempt, read only from the server's stored decision (never from the client's working) */
function methodOf(a: Attempt, decision: { working?: StoredWorking } | undefined): Method {
  const w = decision?.working;
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
  method: Record<Method, number> & { correctWithInvalidMethod: number; correctWithVerifiedMethod: number };
  status: "no-evidence" | "exposure" | "assisted-only" | "emerging" | "shown" | "lapsed";
  firstShownAt: string | null;
  retention: "never-checked" | "scheduled" | "due" | "passed" | "failed" | "not-applicable";
  retentionHistory: RetentionCycle[];
  recoveryRequired: boolean;
  basis: string[];
}
export interface Projection {
  schema: typeof SUB_SKILL_EVIDENCE; authoritative: false; learnerId: string; at: string; events: number;
  subSkills: SubSkillProjection[];
  competencies: { competency: string; production: { status: string; verified: boolean; retention: string }; required: string[]; shown: string[]; missing: string[]; retained: string[]; supports: "none" | "partial" | "shown-all-required" | "retained-all-required"; leakage: { kind: string; missing: string[]; detail: string }[] }[];
  digest: string;
}

const MASTERY = new Set(["independent", "transfer", "verified"]);

function project(s: SubSkill, attempts: Attempt[], decisions: Map<string, { working?: StoredWorking }>, now: number): SubSkillProjection {
  const mine = attempts.filter((a) => s.families.includes(familyOf(a.questionId) ?? ""));
  const ind = mine.filter(independentAttempt), assisted = mine.filter((a) => !independentAttempt(a));
  const method = { verified: 0, invalid: 0, unsupported: 0, partial: 0, "answer-only": 0, "no-working": 0, unverified: 0, "not-recorded": 0, correctWithInvalidMethod: 0, correctWithVerifiedMethod: 0 };
  for (const a of mine) { const m = methodOf(a, decisions.get(a.id)); method[m]++; if (rightAnswer(a) && m === "invalid") method.correctWithInvalidMethod++; if (rightAnswer(a) && m === "verified") method.correctWithVerifiedMethod++; }
  // the production "independent" rule, on this sub-skill's own attempts
  const distinct = new Set<string>(); let shownAt: string | null = null;
  for (const a of ind) { if (rightAnswer(a)) distinct.add(a.questionId); if (!shownAt && distinct.size >= INDEPENDENT_MIN && rightAnswer(a)) shownAt = a.at; }
  const after = shownAt ? ind.filter((a) => a.at > shownAt!) : [];
  const lastInd = ind.at(-1);
  const still = !!shownAt && !!lastInd && (rightAnswer(lastInd) || after.slice(-3).filter((a) => !rightAnswer(a)).length < 2);
  // the production delayed-check cycle (retention@2) on this sub-skill's own retention answers; one answer is a check here
  const history: RetentionCycle[] = [];
  let due = shownAt ? new Date(Date.parse(shownAt) + RETENTION_DAYS * DAY).toISOString() : null;
  let retention: SubSkillProjection["retention"] = shownAt ? "never-checked" : "not-applicable";
  while (due) {
    const d = due;
    const answers = ind.filter((a) => a.activity === "retention" && a.at >= d);
    const firstWrong = answers.find((a) => !rightAnswer(a));
    if (!firstWrong) {
      retention = answers.length ? "passed" : now >= Date.parse(d) ? "due" : "scheduled";
      history.push({ due: d, result: answers.length ? "passed" : "pending", checkedBy: answers.map((a) => a.id), failedAt: null, recoveredAt: null });
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
  const status: SubSkillProjection["status"] = !mine.length ? "no-evidence" : still ? "shown" : shownAt ? "lapsed" : ind.some(rightAnswer) ? "emerging" : assisted.some(rightAnswer) ? "assisted-only" : "exposure";
  return {
    id: s.id, title: s.title, competency: s.competency, role: s.role, families: s.families,
    questions: [...new Set(mine.map((a) => a.questionId))].sort(),
    answers: { independentRight: ind.filter(rightAnswer).length, independentWrong: ind.filter((a) => !rightAnswer(a)).length, assistedRight: assisted.filter(rightAnswer).length, assistedWrong: assisted.filter((a) => !rightAnswer(a)).length },
    method, status, firstShownAt: shownAt, retention, retentionHistory: history, recoveryRequired: retention === "failed", basis: mine.map((a) => a.id),
  };
}

const canon = (v: unknown): string => (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}` : JSON.stringify(v));

/** The projection for one learner from their stored events (as the server keeps them, decisions inside), at `now`. Read-only. */
export function subSkillProjection(learnerId: string, events: readonly { kind: string }[], now: number): Projection {
  const ordered = [...events].sort((x, y) => { const a = x as { at?: string; id?: string }, b = y as { at?: string; id?: string }; return (a.at ?? "").localeCompare(b.at ?? "") || (a.id ?? "").localeCompare(b.id ?? ""); });
  const records = readRecords(learnerId, ordered);
  const decisions = new Map<string, { working?: StoredWorking }>();
  for (const e of ordered) { const r = e as { record?: string; id?: string; decision?: { working?: StoredWorking } }; if (r.record === "attempt" && r.id && r.decision) decisions.set(r.id, r.decision); }
  const subSkills = SUB_SKILLS.map((s) => project(s, records.attempts, decisions, now));
  const st = learnerState(learnerId, ordered, now);
  const competencies = Object.entries(REQUIRED).map(([competency, required]) => {
    const e = st.evidence(competency);
    const by = (id: string) => subSkills.find((x) => x.id === id)!;
    const shown = required.filter((id) => by(id).status === "shown");
    const missing = required.filter((id) => by(id).status !== "shown");
    const retained = required.filter((id) => by(id).retention === "passed");
    const leakage: Projection["competencies"][number]["leakage"] = [];
    if (MASTERY.has(e.status) && missing.length) leakage.push({ kind: "competency-status-without-sub-skill-evidence", missing, detail: `production status "${e.status}" for ${competency}; not shown on their own: ${missing.join(", ")}` });
    if (e.retention === "passed" && retained.length < required.length) leakage.push({ kind: "delayed-check-passed-without-sub-skill-check", missing: required.filter((id) => !retained.includes(id)), detail: `production delayed check passed for ${competency}; no passed delayed check on: ${required.filter((id) => !retained.includes(id)).join(", ")}` });
    if (e.verified && retained.length < required.length) leakage.push({ kind: "verified-without-sub-skill-retention", missing: required.filter((id) => !retained.includes(id)), detail: `production verified ${competency}; no passed delayed check on: ${required.filter((id) => !retained.includes(id)).join(", ")}` });
    const supports = retained.length === required.length ? "retained-all-required" : shown.length === required.length ? "shown-all-required" : shown.length ? "partial" : "none";
    return { competency, production: { status: e.status, verified: e.verified, retention: e.retention }, required: [...required], shown, missing, retained, supports, leakage } as Projection["competencies"][number];
  });
  const body = { schema: SUB_SKILL_EVIDENCE, authoritative: false as const, learnerId, at: new Date(now).toISOString(), events: ordered.length, subSkills, competencies };
  return { ...body, digest: sha256Hex(canon(body)) };
}
