/**
 * Workstream E1: sub-skill evidence for MATH.algebra.linear-equations (SHADOW, non-authoritative).
 *
 * A pure, deterministic projection over the learner's existing records (records.ts readRecords → LearnerRecords). It adds no event, no
 * competency, no ledger and no mastery decision: the authoritative learner state (evidence.ts skillEvidence / the shared engine) is read,
 * never changed, and every place where it claims more than the per-sub-skill evidence supports is reported as a discrepancy.
 *
 * Reused semantics (nothing re-invented):
 *   - an answer counts only through `rightAnswer` (the recorded server decision / educator mark; evidence.ts);
 *   - independent vs assisted through `independentAttempt` (first answer, no hints, no solution, not guided; evidence.ts);
 *   - "shown alone" through INDEPENDENT_MIN distinct right first answers and status@2 (two of the last three wrong undoes it);
 *   - the delayed check through retention@2 (RETENTION_DAYS after independent success, any wrong answer fails, recovery = INDEPENDENT_MIN
 *     distinct right answers alone outside the check, then a new check RETENTION_DAYS later; a failure is never forgotten);
 *   - method evidence through derivation-interface workingEvidence(authorizeWorking(...)) on the RECORDED working, computed here by the
 *     trusted authority, never read from a client field (assessment.derivationVerified is ignored).
 * The sub-skill of an answer comes ONLY from the trusted generator id in its question id (gen:<family>:<params>[:mc|:w]); question text is
 * never read for it. An unmapped or unreadable family is "unknown" and is never credited to any sub-skill.
 */
import { authorizeWorking, workingEvidence, type WorkingEvidence } from "./derivation-interface";
import { DAY, INDEPENDENT_MIN, RETENTION_CHECK, RETENTION_DAYS, independentAttempt, rightAnswer, type RetentionCycle, type SkillEvidence } from "./evidence";
import { FAMILIES, exposureKey, problemOf } from "./families";
import { moduleFor } from "./content";
import { readRecords, type Attempt, type LearnerRecords } from "./records";

export const SUBSKILL_PROJECTION_VERSION = "linear-equations-subskill-projection@1" as const;
export const SUBSKILL_MAPPING_VERSION = "linear-equations-subskills@1" as const;
export const COMPETENCY = "MATH.algebra.linear-equations" as const;
/** Bound: a history longer than this is not projected (fails safe as `resource-limit`, nothing is claimed). */
export const MAX_ATTEMPTS = 20_000;

export type SubSkillId =
  | "linear-equations.one-step@1"
  | "linear-equations.two-step@1"
  | "linear-equations.both-sides@1"
  | "linear-equations.brackets@1"
  | "linear-equations.modelling@1";
export interface SubSkillDef { id: SubSkillId; name: string; example: string; families: string[]; competency: string; note?: string }
/** linear-equations-subskills@1. Stable and versioned: a change of mapping is a new version, never an edit of this one. */
export const SUBSKILLS: readonly SubSkillDef[] = [
  { id: "linear-equations.one-step@1", name: "One-step equations", example: "x + 7 = 12", families: ["ahone"], competency: "MATH.algebra.linear-intro",
    note: "the competency has no one-step family: one-step equations are the prerequisite competency MATH.algebra.linear-intro (mandatory edge audit@1); its answers are read as that sub-skill's evidence, its own competency is unchanged" },
  { id: "linear-equations.two-step@1", name: "Two-step equations", example: "2x + 5 = 17", families: ["lin"], competency: COMPETENCY },
  { id: "linear-equations.both-sides@1", name: "Variables on both sides", example: "3x + 4 = x + 12", families: ["lboth"], competency: COMPETENCY },
  { id: "linear-equations.brackets@1", name: "Distribution and brackets", example: "3(x − 2) = 2x + 5", families: ["lbrk"], competency: COMPETENCY },
  { id: "linear-equations.modelling@1", name: "Modelling with an equation", example: "choose / form the equation of a story", families: ["auleq", "aulwp"], competency: COMPETENCY,
    note: "aulwp forms AND solves an equation; the solving kind depends on the story and is not stated by the generator, so it is credited to modelling only (never to a solving sub-skill)" },
];
/** Families of the competency that are deliberately left unmapped (and why). */
export const UNMAPPED: Readonly<Record<string, string>> = {
  meet: "tagged linear-equations but finds where a line meets y = x² (a quadratic set answer); not in the module's pools; not a linear-equation solving sub-skill",
};
const BY_FAMILY = new Map(SUBSKILLS.flatMap((s) => s.families.map((f) => [f, s] as const)));
/** The core solving sub-skills a broad "shown alone" claim on the competency implies. */
export const CORE: readonly SubSkillId[] = ["linear-equations.two-step@1", "linear-equations.both-sides@1", "linear-equations.brackets@1"];

export type Unknown = { kind: "unknown"; reason: "not-a-generated-question" | "malformed-question-id" | "unmapped-family" | "unknown-family" | "excluded-by-existing-reader"; family: string | null };
export type Classified = { kind: "mapped"; family: string; subSkill: SubSkillDef; format: "typed" | "mc" | "w" } | Unknown;
/** The sub-skill of a question, from the trusted generator id only. */
export function classifyQuestion(questionId: unknown): Classified {
  if (typeof questionId !== "string") return { kind: "unknown", reason: "malformed-question-id", family: null };
  if (!questionId.startsWith("gen:")) return { kind: "unknown", reason: "not-a-generated-question", family: null };
  const m = /^gen:([a-z0-9]+):(-?\d+(?:,-?\d+)*)(?::(mc|w))?$/.exec(questionId);
  if (!m) return { kind: "unknown", reason: "malformed-question-id", family: null };
  if (!FAMILIES.has(m[1])) return { kind: "unknown", reason: "unknown-family", family: m[1] };
  const s = BY_FAMILY.get(m[1]);
  if (!s) return { kind: "unknown", reason: "unmapped-family", family: m[1] };
  // the generator itself must accept the parameters and the answer format (an id a family would never produce is not its evidence)
  const def = FAMILIES.get(m[1])!;
  if (!problemOf(`gen:${m[1]}:${m[2]}`) || (m[3] === "mc" && !def.mc) || (m[3] === "w" && !def.word)) return { kind: "unknown", reason: "malformed-question-id", family: m[1] };
  return { kind: "mapped", family: m[1], subSkill: s, format: (m[3] as "mc" | "w" | undefined) ?? "typed" };
}

export type Method = WorkingEvidence | "no-working" | "not-applicable";
export interface ProjectedAttempt {
  id: string; at: string; questionId: string; family: string; subSkill: SubSkillId; variant: string; format: "typed" | "mc" | "w"; activity: string;
  correct: boolean; independent: boolean; assisted: boolean;
  /** method evidence from the recorded working, judged by the trusted derivation authority (never a client claim) */
  method: Method;
  /** a right answer whose working has a false step: contradictory evidence, never counted as shown */
  contradicted: boolean;
}
export type SubSkillStatus = "not-attempted" | "insufficient-evidence" | "developing" | "independently-demonstrated" | "retention-due" | "recovery-required";
export interface SubSkillProjection {
  id: SubSkillId; name: string; families: string[]; competency: string;
  status: SubSkillStatus;
  attempts: { total: number; independent: number; independentRight: number; assisted: number; assistedRight: number; distinctVariantsRight: number; contradicted: number };
  method: { verified: number; falseStep: number; noMethodEvidence: number; noWorking: number; status: "verified" | "contradicted" | "not-established" };
  rechecks: { at: string; questionId: string; correct: boolean }[];
  retention: { state: SkillEvidence["retention"]; dueAt: string | null; need: number; sampledByModuleCheck: boolean; history: RetentionCycle[] };
  /** historical achievement: kept whatever happens later */
  historical: { everDemonstrated: boolean; firstDemonstratedAt: string | null };
  freshness: { lastIndependentAt: string | null; daysSince: number | null; fresh: boolean | null };
  /** evidence from another sub-skill that the competency graph explicitly relates (never changes `status`) */
  prerequisiteSupport: { from: SubSkillId; relation: string }[];
  evidence: string[];
}
export interface Discrepancy { authoritative: { status: string; verified: boolean }; claim: string; unsupported: { id: SubSkillId; status: SubSkillStatus }[] }
export interface Projection {
  version: typeof SUBSKILL_PROJECTION_VERSION; mapping: typeof SUBSKILL_MAPPING_VERSION; competency: typeof COMPETENCY; authoritative: false;
  outcome: "projected" | "resource-limit" | "unreadable-events";
  subSkills: SubSkillProjection[];
  unknown: { count: number; byReason: Record<string, number>; attempts: { id: string; questionId: string; reason: string }[] };
  rejected: { id: string | null; reason: string }[];
  discrepancies: Discrepancy[];
}

const MODULE_RETENTION = () => moduleFor(COMPETENCY)?.retention ?? [];
const methodOf = (a: Attempt, family: string, format: string): Method => {
  if (format === "mc" || !FAMILIES.get(family)?.contract?.statement) return "not-applicable";
  if (!a.working?.length) return "no-working";
  const p = problemOf(a.questionId.replace(/:(mc|w)$/, ""));
  const stmt = p ? FAMILIES.get(family)!.contract!.statement!(p.params) : null;
  if (!stmt) return "not-applicable";
  return workingEvidence(authorizeWorking(stmt, a.working));
};
const validAttempt = (a: unknown): a is Attempt => {
  const x = a as Attempt;
  return !!x && typeof x.id === "string" && typeof x.at === "string" && !Number.isNaN(Date.parse(x.at)) && typeof x.questionId === "string" && typeof x.activity === "string" && typeof x.hints === "number" && typeof x.n === "number";
};

/**
 * retention@2 scoped to one sub-skill: the same cycle rule as evidence.ts skillEvidence, over this sub-skill's answers only. `need` is the
 * number of distinct delayed-check answers required (evidence.ts: min(RETENTION_CHECK, the skill's retention questions)).
 */
export function retentionCycles(ind: Attempt[], from: string | null, need: number, now: number, right: (a: Attempt) => boolean = rightAnswer) {
  const history: RetentionCycle[] = [];
  let cycleDue = from ? new Date(Date.parse(from) + RETENTION_DAYS * DAY).toISOString() : null;
  let retention: SkillEvidence["retention"] = "none";
  while (cycleDue) {
    const dueAt = cycleDue;
    const answers = ind.filter((a) => a.activity === "retention" && Date.parse(a.at) >= Date.parse(dueAt));
    const firstWrong = answers.find((a) => !right(a));
    if (!firstWrong) {
      retention = new Set(answers.map((a) => a.questionId)).size >= need ? "passed" : now >= Date.parse(dueAt) ? "due" : "scheduled";
      history.push({ due: dueAt, result: retention === "passed" ? "passed" : "pending", failedAt: null, recoveredAt: null });
      break;
    }
    const seen = new Set<string>();
    let recoveredAt: string | null = null;
    for (const a of ind) if (Date.parse(a.at) > Date.parse(firstWrong.at) && a.activity !== "retention" && right(a)) { seen.add(a.questionId); if (seen.size >= INDEPENDENT_MIN) { recoveredAt = a.at; break; } }
    history.push({ due: dueAt, result: "failed", failedAt: firstWrong.at, recoveredAt });
    retention = "failed";
    cycleDue = recoveredAt ? new Date(Date.parse(recoveredAt) + RETENTION_DAYS * DAY).toISOString() : null;
  }
  return { retention, history, due: history.at(-1)?.due ?? null };
}

/** The projection. `authoritative` is the existing learner state for the competency (read only, to expose broader claims). */
export function projectSubSkills(records: Pick<LearnerRecords, "attempts">, now: number, authoritative?: { status: string; verified: boolean } | null): Projection {
  const base: Projection = { version: SUBSKILL_PROJECTION_VERSION, mapping: SUBSKILL_MAPPING_VERSION, competency: COMPETENCY, authoritative: false, outcome: "projected", subSkills: [], unknown: { count: 0, byReason: {}, attempts: [] }, rejected: [], discrepancies: [] };
  const all = Array.isArray(records?.attempts) ? records.attempts : [];
  if (all.length > MAX_ATTEMPTS) return { ...base, outcome: "resource-limit", rejected: [{ id: null, reason: `more than ${MAX_ATTEMPTS} attempts: not projected` }] };
  // deterministic order: time, then record id (the store's order is not relied on)
  const t = (x: unknown) => { const v = Date.parse(String((x as { at?: unknown })?.at)); return Number.isNaN(v) ? Infinity : v; };
  const code = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const sorted = [...all].sort((x, y) => t(x) - t(y) || code(String(x?.id), String(y?.id)));
  const projected: ProjectedAttempt[] = [];
  const byId = new Map<string, Attempt>();
  for (const a of sorted) {
    if (!validAttempt(a)) { base.rejected.push({ id: typeof (a as { id?: unknown })?.id === "string" ? (a as { id: string }).id : null, reason: "malformed attempt record" }); continue; }
    const c = classifyQuestion(a.questionId);
    if (c.kind === "unknown") {
      // only answers recorded for this competency (or its one-step prerequisite) are reported as unknown here
      if (a.competency === COMPETENCY) { base.unknown.count++; base.unknown.byReason[c.reason] = (base.unknown.byReason[c.reason] ?? 0) + 1; base.unknown.attempts.push({ id: a.id, questionId: a.questionId, reason: c.reason }); }
      continue;
    }
    const correct = rightAnswer(a), independent = independentAttempt(a), method = methodOf(a, c.family, c.format);
    byId.set(a.id, a);
    projected.push({ id: a.id, at: a.at, questionId: a.questionId, family: c.family, subSkill: c.subSkill.id, variant: exposureKey(a.questionId), format: c.format, activity: a.activity, correct, independent, assisted: !independent, method, contradicted: correct && method === "method-false-step" });
  }
  const moduleRetention = MODULE_RETENTION();
  for (const s of SUBSKILLS) {
    const mine = projected.filter((p) => p.subSkill === s.id);
    // as evidence.ts: a probe is evidence for its own micro-skill, never for showing the skill alone
    // a right answer whose own working has a false step is contradictory evidence: it is neither credited nor counted as a wrong answer
    // (it is reported, and makes the method "contradicted"); every other answer counts exactly as its recorded credit
    const ind = mine.filter((p) => p.independent && p.activity !== "probe" && !p.contradicted);
    const credited = (p: ProjectedAttempt) => p.correct;
    const distinct = new Set<string>();
    let independentAt: string | null = null;
    for (const p of ind) { if (credited(p)) distinct.add(p.variant); if (!independentAt && distinct.size >= INDEPENDENT_MIN && credited(p)) independentAt = p.at; }
    const after = independentAt ? ind.filter((p) => Date.parse(p.at) > Date.parse(independentAt!)) : [];
    const recentWrong = after.slice(-3).filter((p) => !credited(p)).length;
    const lastInd = ind.at(-1);
    const shown = !!independentAt && !!lastInd && (credited(lastInd) || recentWrong < 2);
    const sampled = moduleRetention.filter((q) => { const c = classifyQuestion(q); return c.kind === "mapped" && c.subSkill.id === s.id; }).length;
    // evidence.ts: min(RETENTION_CHECK, the skill's retention questions). A sub-skill the module's delayed check does not sample keeps the
    // competency's own bar (RETENTION_CHECK); it is never lowered to one item.
    const need = sampled > 0 ? Math.min(RETENTION_CHECK, sampled) : RETENTION_CHECK;
    const indAttempts = ind.map((p) => byId.get(p.id)!);
    const byAttempt = new Map(ind.map((p) => [p.id, p] as const));
    const cyc = retentionCycles(indAttempts, independentAt, need, now, (a) => credited(byAttempt.get(a.id)!));
    let status: SubSkillStatus;
    if (!mine.length) status = "not-attempted";
    else if (cyc.retention === "failed") status = "recovery-required";
    else if (shown && cyc.retention === "due") status = "retention-due";
    else if (shown) status = "independently-demonstrated";
    else if (ind.length < INDEPENDENT_MIN) status = "insufficient-evidence";
    else status = "developing";
    const mv = mine.filter((p) => p.independent && p.method === "method-verified" && p.correct).length;
    const mf = mine.filter((p) => p.method === "method-false-step").length;
    const lastIndependentAt = ind.at(-1)?.at ?? null;
    const daysSince = lastIndependentAt ? Math.floor((now - Date.parse(lastIndependentAt)) / DAY) : null;
    base.subSkills.push({
      id: s.id, name: s.name, families: s.families, competency: s.competency, status,
      attempts: { total: mine.length, independent: ind.length, independentRight: ind.filter(credited).length, assisted: mine.filter((p) => p.assisted).length, assistedRight: mine.filter((p) => p.assisted && p.correct).length, distinctVariantsRight: distinct.size, contradicted: mine.filter((p) => p.contradicted).length },
      method: { verified: mv, falseStep: mf, noMethodEvidence: mine.filter((p) => p.method === "no-method-evidence").length, noWorking: mine.filter((p) => p.method === "no-working").length, status: mf ? "contradicted" : mv ? "verified" : "not-established" },
      rechecks: mine.filter((p) => p.independent && p.activity === "check").map((p) => ({ at: p.at, questionId: p.questionId, correct: credited(p) })),
      retention: { state: cyc.retention, dueAt: cyc.due, need, sampledByModuleCheck: sampled > 0, history: cyc.history },
      historical: { everDemonstrated: !!independentAt, firstDemonstratedAt: independentAt },
      freshness: { lastIndependentAt, daysSince, fresh: daysSince === null ? null : daysSince < RETENTION_DAYS },
      prerequisiteSupport: [],
      evidence: mine.map((p) => p.id),
    });
  }
  // the one explicit relation: MATH.algebra.linear-intro (one-step) is a MANDATORY prerequisite of MATH.algebra.linear-equations (audit@1,
  // "multi-step linear equations build on one-step equations"). A demonstrated multi-step sub-skill is listed as supporting evidence for
  // one-step; it never changes one-step's status. No relation exists between the multi-step sub-skills, so none is listed.
  const one = base.subSkills.find((x) => x.id === "linear-equations.one-step@1")!;
  for (const x of base.subSkills) if (CORE.includes(x.id) && x.historical.everDemonstrated) one.prerequisiteSupport.push({ from: x.id, relation: "mandatory prerequisite edge MATH.algebra.linear-intro → MATH.algebra.linear-equations (audit@1)" });
  if (authoritative) {
    const broad = authoritative.verified || ["independent", "transfer", "verified"].includes(authoritative.status);
    const unsupported = base.subSkills.filter((x) => CORE.includes(x.id) && x.status !== "independently-demonstrated").map((x) => ({ id: x.id, status: x.status }));
    if (broad && unsupported.length) base.discrepancies.push({ authoritative: { status: authoritative.status, verified: authoritative.verified }, claim: `the competency reads "${authoritative.verified ? "verified" : authoritative.status}" (shown alone) for every kind of linear equation`, unsupported });
  }
  return base;
}

/**
 * The projection from the stored events (the same events the authoritative state reads). Attempt records for this competency that the existing
 * reader (records.ts readRecords) does not admit as attempts (a question id it does not know, e.g. a record from before generator ids, or a
 * retired family) are reported as unknown, "excluded-by-existing-reader": nothing is credited to any sub-skill for them, and they are not
 * reinterpreted. Quarantined, unresolved and pending answers are excluded exactly as the reader excludes them.
 */
export function projectFromEvents(learnerId: string, events: readonly { kind: string }[], now: number, authoritative?: { status: string; verified: boolean } | null): Projection {
  // canonical order before the existing reader counts first exposures: the instant of each record, then its id (code-unit order). The store's
  // own order (seq) is the same as time order for server-stamped records; this makes the projection independent of delivery order.
  const at = (e: unknown) => { const v = Date.parse(String((e as { at?: unknown })?.at)); return Number.isNaN(v) ? Infinity : v; };
  const idOf = (e: unknown) => String((e as { id?: unknown })?.id ?? "");
  const ordered = Array.isArray(events) ? [...events].sort((x, y) => at(x) - at(y) || (idOf(x) < idOf(y) ? -1 : idOf(x) > idOf(y) ? 1 : 0)) : [];
  let recs: LearnerRecords;
  try { recs = readRecords(learnerId, ordered); }
  catch (e) { return { version: SUBSKILL_PROJECTION_VERSION, mapping: SUBSKILL_MAPPING_VERSION, competency: COMPETENCY, authoritative: false, outcome: "unreadable-events", subSkills: [], unknown: { count: 0, byReason: {}, attempts: [] }, rejected: [{ id: null, reason: `the existing reader could not read the events (${String((e as Error)?.message ?? e).slice(0, 80)}): nothing is projected` }], discrepancies: [] }; }
  const p = projectSubSkills(recs, now, authoritative);
  if (p.outcome !== "projected") return p;
  const admitted = new Set([...recs.attempts.map((a) => a.id), ...recs.unresolved.map((a) => a.id), ...recs.pending.map((a) => a.id)]);
  const seen = new Set<string>();
  for (const e of ordered) {
    const r = e as { kind?: string; record?: string; id?: unknown; learnerId?: unknown; competency?: unknown; questionId?: unknown };
    if (r.kind !== "learning_record" || r.record !== "attempt" || r.learnerId !== learnerId || r.competency !== COMPETENCY) continue;
    const id = typeof r.id === "string" ? r.id : null;
    if (id && (admitted.has(id) || seen.has(id))) continue;
    if (id) seen.add(id);
    p.unknown.count++; p.unknown.byReason["excluded-by-existing-reader"] = (p.unknown.byReason["excluded-by-existing-reader"] ?? 0) + 1;
    p.unknown.attempts.push({ id: id ?? "(no id)", questionId: typeof r.questionId === "string" ? r.questionId : "(none)", reason: "excluded-by-existing-reader" });
  }
  return p;
}
