/**
 * Sub-skill evidence projection, domain-neutral (G5: extracted from Workstream E1 without changing its behaviour). SHADOW, non-authoritative.
 *
 * Everything that names a subject lives in a configuration (SubSkillConfig): the competency, the sub-skills and the generator families
 * that are their evidence, the families deliberately left unmapped, the "core" sub-skills a broad competency claim implies, and the one
 * explicit prerequisite relation listed as support. This file contains no competency, family or sub-skill identifier.
 *
 * Reused semantics (nothing re-invented; each subject configuration documents its rationale):
 *   - credit: `rightAnswer` (the recorded server decision / educator mark); independent vs assisted: `independentAttempt`;
 *   - "shown alone": INDEPENDENT_MIN distinct right first answers and status@2; the delayed check: retention@2;
 *   - method evidence: ONLY the trusted grader's working verdict recorded by the SERVER (grading-decision@1, working-assessment@1);
 *   - identity: ONLY the trusted generator id (gen:<family>:<params>[:mc|:w]); question text is never read; unknown is never credited.
 */
import { expectedWorkingAuthority, taskStatement, type WorkingProvenance } from "./grading/working";
import { question } from "./content";
import { AUTHORITY_VERSION } from "./derivation-authority";
import { DAY, INDEPENDENT_MIN, RETENTION_CHECK, RETENTION_DAYS, independentAttempt, rightAnswer, type RetentionCycle, type SkillEvidence } from "./evidence";
import { FAMILIES, exposureKey, problemOf } from "./families";
import { moduleFor } from "./content";
import { readRecords, type Attempt, type LearnerRecords } from "./records";

export function canonicalOrder<T>(events: readonly T[]): T[] {
  // canonical order before the existing reader counts first exposures: the instant of each record, then its id (code-unit order). The store's
  // own order (seq) is the same as time order for server-stamped records; this makes the projection independent of delivery order.
  const at = (e: unknown) => { const v = Date.parse(String((e as { at?: unknown })?.at)); return Number.isNaN(v) ? Infinity : v; };
  const idOf = (e: unknown) => String((e as { id?: unknown })?.id ?? "");
  // D1 integration (from the alternative E1): equal (instant, id) pairs are ordered by their canonical content, so duplicates cannot reorder by
  // delivery position
  const canon = (v: unknown): string => (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}` : JSON.stringify(v) ?? "null");
  const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return Array.isArray(events) ? events.map((e) => ({ e, t: at(e), i: idOf(e), c: canon(e) })).sort((x, y) => x.t - y.t || cmp(x.i, y.i) || cmp(x.c, y.c)).map((x) => x.e) : [];
}

export interface SubSkillDef<Id extends string = string> {
  id: Id; name: string; example: string; families: string[]; competency: string; note?: string;
  /** All conditions must hold on validated generator parameters. */
  parameters?: readonly { index: number; values: readonly number[] }[];
  /** At least one nonempty conjunction must hold, in addition to parameters. */
  parameterCases?: readonly (readonly { index: number; values: readonly number[] }[])[];
}
/** A subject's evidence dimensions, as configuration. */
export interface SubSkillConfig<Id extends string = string> {
  /** projection contract and mapping versions (a new mapping is a new version, never an edit) */
  version: string;
  mapping: string;
  /** the competency the projection is about (unchanged; sub-skills are not competencies or graph nodes) */
  competency: string;
  subSkills: readonly SubSkillDef<Id>[];
  /** families of the competency deliberately left unmapped, with the reason */
  unmapped: Readonly<Record<string, string>>;
  /** the sub-skills a broad "shown alone" claim on the competency implies (the discrepancy check) */
  core: readonly Id[];
  /** at most one explicit graph relation: demonstrated `from` sub-skills are listed as support for `to` (never a status change) */
  prerequisiteSupport?: { to: Id; from: readonly Id[]; relation: string };
  /** how the discrepancy is worded (the claim the authoritative competency status makes) */
  broadClaim: (label: string) => string;
}
/** Bound: a history longer than this is not projected (fails safe as `resource-limit`, nothing is claimed). */
export const MAX_ATTEMPTS = 20_000;

export type Unknown = { kind: "unknown"; reason: "not-a-generated-question" | "malformed-question-id" | "unmapped-family" | "unknown-family" | "excluded-by-existing-reader"; family: string | null };
export type Classified<Id extends string = string> = { kind: "mapped"; family: string; subSkill: SubSkillDef<Id>; format: "typed" | "mc" | "w" } | Unknown;
/** The sub-skill of a question under a configuration, from the trusted generator id only. */
export function classifyQuestionWith<Id extends string>(config: SubSkillConfig<Id>, questionId: unknown): Classified<Id> {
  if (typeof questionId !== "string") return { kind: "unknown", reason: "malformed-question-id", family: null };
  if (!questionId.startsWith("gen:")) return { kind: "unknown", reason: "not-a-generated-question", family: null };
  const m = /^gen:([a-z0-9]+):(-?\d+(?:,-?\d+)*)(?::(mc|w))?$/.exec(questionId);
  if (!m) return { kind: "unknown", reason: "malformed-question-id", family: null };
  if (!FAMILIES.has(m[1])) return { kind: "unknown", reason: "unknown-family", family: m[1] };
  const params = m[2].split(",").map(Number);
  const validConditions = (value: unknown): value is NonNullable<SubSkillDef["parameters"]> => Array.isArray(value) && Array.from(value).every((p: unknown) => {
    if (!p || typeof p !== "object" || Array.isArray(p)) return false;
    const c = p as { index?: unknown; values?: unknown };
    return typeof c.index === "number" && Number.isInteger(c.index) && c.index >= 0 && c.index < params.length
      && Array.isArray(c.values) && c.values.length > 0 && Array.from(c.values).every((v: unknown) => typeof v === "number" && Number.isFinite(v));
  });
  const candidates = config.subSkills.filter((s) => s.families.includes(m[1]));
  // Validate every branch first: a matching case must not hide malformed alternatives.
  if (candidates.some((s) => (s.parameters !== undefined && !validConditions(s.parameters))
      || (s.parameterCases !== undefined && (!Array.isArray(s.parameterCases) || !s.parameterCases.length
        || !Array.from(s.parameterCases).every((c) => validConditions(c) && c.length > 0))))) {
    return { kind: "unknown", reason: "unmapped-family", family: m[1] };
  }
  const accepts = (conditions: NonNullable<SubSkillDef["parameters"]>) => conditions.every((p) => p.values.includes(params[p.index]));
  const matches = candidates.filter((s) => (s.parameters === undefined || accepts(s.parameters))
    && (s.parameterCases === undefined || s.parameterCases.some(accepts)));
  // Ambiguous metadata must never silently credit one of two skills.
  if (matches.length !== 1) return { kind: "unknown", reason: "unmapped-family", family: m[1] };
  const s = matches[0];
  // the generator itself must accept the parameters and the answer format (an id a family would never produce is not its evidence)
  const def = FAMILIES.get(m[1])!;
  if (def.competency !== s.competency) return { kind: "unknown", reason: "unmapped-family", family: m[1] };
  if (!problemOf(`gen:${m[1]}:${m[2]}`) || (m[3] === "mc" && !def.mc) || (m[3] === "w" && !def.word)) return { kind: "unknown", reason: "malformed-question-id", family: m[1] };
  return { kind: "mapped", family: m[1], subSkill: s, format: (m[3] as "mc" | "w" | undefined) ?? "typed" };
}

/** the trusted method verdict of one answer, as the server recorded it (D1 working-assessment@1 status), or why there is none */
export type Method = "method-verified" | "method-false-step" | "unsupported" | "no-method-evidence" | "partial" | "no-working" | "not-recorded" | "not-applicable";
/** the server's stored decision, as far as this projection reads it */
export interface StoredDecision { schema?: unknown; decidedBy?: unknown; questionId?: unknown; attemptId?: unknown; response?: { raw?: unknown; working?: unknown }; working?: { provenance?: WorkingProvenance; schema?: unknown; status?: unknown; methodEvidence?: unknown; versions?: { authority?: unknown } } }
/** the working verdict the SERVER recorded (records.ts serverVerdict's guard), else null */
export function trustedWorking(d: StoredDecision | undefined | null) {
  if (!d || d.schema !== "grading-decision@1" || d.decidedBy !== "server") return null;
  const w = d.working;
  return w && w.schema === "working-assessment@1" ? w : null;
}
const methodFrom = (w: NonNullable<ReturnType<typeof trustedWorking>>): Method =>
  w.status === "verified" && w.methodEvidence === "method-verified" ? "method-verified"
  : w.status === "invalid" ? "method-false-step"
  : w.status === "partial" ? "partial"
  : w.status === "answer-only" ? "no-method-evidence"
  : w.status === "none" ? "no-working"
  : "unsupported";
export interface ProjectedAttempt<Id extends string = string> {
  id: string; at: string; questionId: string; family: string; subSkill: Id; variant: string; format: "typed" | "mc" | "w"; activity: string;
  correct: boolean; independent: boolean; assisted: boolean;
  /** method evidence: the server-recorded trusted verdict (never a client claim, never recomputed) */
  method: Method;
  /** the authority version the verdict was recorded under; historical = not the current authority (kept as recorded, never upgraded) */
  methodAuthority: string | null; historicalMethod: boolean;
  /** a right answer whose working has a false step: contradictory evidence, never counted as shown */
  contradicted: boolean;
}
export type SubSkillStatus = "not-attempted" | "insufficient-evidence" | "developing" | "independently-demonstrated" | "retention-due" | "recovery-required";
export interface SubSkillProjection<Id extends string = string> {
  id: Id; name: string; families: string[]; competency: string;
  status: SubSkillStatus;
  attempts: { total: number; independent: number; independentRight: number; assisted: number; assistedRight: number; distinctVariantsRight: number; contradicted: number };
  /** verified: right answers given alone with a current verified method; the other counts are over all answers of the sub-skill.
   *  partialWorking: valid partial derivations submitted with no final answer (unresolved: never an attempt, never credit). */
  method: { verified: number; falseStep: number; unsupported: number; noMethodEvidence: number; noWorking: number; partial: number; partialWorking: number; notRecorded: number; historical: number; historicalVerified: number; status: "verified" | "contradicted" | "not-established" };
  rechecks: { at: string; questionId: string; correct: boolean }[];
  retention: { state: SkillEvidence["retention"]; dueAt: string | null; need: number; sampledByModuleCheck: boolean; history: RetentionCycle[] };
  /** historical achievement: kept whatever happens later */
  historical: { everDemonstrated: boolean; firstDemonstratedAt: string | null };
  freshness: { lastIndependentAt: string | null; daysSince: number | null; fresh: boolean | null };
  /** evidence from another sub-skill that the competency graph explicitly relates (never changes `status`) */
  prerequisiteSupport: { from: Id; relation: string }[];
  evidence: string[];
}
export interface Discrepancy<Id extends string = string> { authoritative: { status: string; verified: boolean }; claim: string; unsupported: { id: Id; status: SubSkillStatus }[] }
export interface Projection<Id extends string = string, V extends string = string, M extends string = string, C extends string = string> {
  version: V; mapping: M; competency: C; authoritative: false;
  outcome: "projected" | "resource-limit" | "unreadable-events";
  subSkills: SubSkillProjection<Id>[];
  unknown: { count: number; byReason: Record<string, number>; attempts: { id: string; questionId: string; reason: string }[] };
  rejected: { id: string | null; reason: string }[];
  discrepancies: Discrepancy<Id>[];
}

const methodFrom2 = (d: StoredDecision | undefined): Method | null => { const w = trustedWorking(d); return w ? methodFrom(w) : null; };
const methodOf = (a: Attempt, family: string, format: string, d: StoredDecision | undefined): { method: Method; authority: string | null } => {
  let w = trustedWorking(d);
  if (w) {
    const p = w.provenance;
    // Old records remain readable only on the authority's original equation contract.
    // A server label alone cannot turn geometry entailment into method evidence.
    const geometryBound = p?.checker !== 'geometry-reasoner' || (d?.questionId === a.questionId && d?.attemptId === a.id && !!d?.response);
    const bound = geometryBound && (!d?.questionId || d.questionId === a.questionId)
      && (!d?.attemptId || d.attemptId === a.id)
      && (!d?.response || (d.response.raw === a.response && JSON.stringify(d.response.working ?? []) === JSON.stringify(a.working ?? [])));
    const authority = expectedWorkingAuthority(a.questionId);
    const expected = !!authority;
    const provenance = p ? p.schema === "working-provenance@1" && p.questionId === a.questionId
      && p.competency === question(a.questionId).competency && p.checker === authority?.checker
      && p.version === w.versions?.authority
      && (w.status !== "verified" || p.reasoning === "demonstrated")
      && (w.status !== "invalid" || p.reasoning === "refuted") : !!taskStatement(a.questionId);
    if (!bound || !expected || !provenance) return { method: "unsupported", authority: null };
  }
  if (w) return { method: methodFrom(w), authority: typeof w.versions?.authority === "string" ? w.versions.authority : null };
  if (format === "mc" || !FAMILIES.get(family)?.contract?.statement) return { method: "not-applicable", authority: null };
  // no trusted verdict was recorded (a record from before D1, or one the server did not decide): not re-judged here
  return { method: a.working?.length ? "not-recorded" : "no-working", authority: null };
};
const validAttempt = (a: unknown): a is Attempt => {
  const x = a as Attempt;
  return !!x && typeof x.id === "string" && typeof x.at === "string" && !Number.isNaN(Date.parse(x.at)) && typeof x.questionId === "string" && typeof x.activity === "string" && typeof x.hints === "number" && typeof x.n === "number";
};

/**
 * retention@2 scoped to one sub-skill: the same cycle rule as evidence.ts skillEvidence, over this sub-skill's answers only. `need` is the
 * number of distinct delayed-check answers required (evidence.ts: min(RETENTION_CHECK, the skill's retention questions)).
 */
export function retentionCycles(ind: Attempt[], from: string | null, need: number, now: number, right: (a: Attempt) => boolean = rightAnswer, slips = 0) {
  const history: RetentionCycle[] = [];
  let cycleDue = from ? new Date(Date.parse(from) + RETENTION_DAYS * DAY).toISOString() : null;
  let retention: SkillEvidence["retention"] = "none", slipPending = false;
  while (cycleDue) {
    const dueAt = cycleDue;
    const answers = ind.filter((a) => a.activity === "retention" && Date.parse(a.at) >= Date.parse(dueAt));
    // slips = 0 is retention@2 exactly (any wrong answer fails the check). M1 shadow alternative only: slips = 1 tolerates one wrong answer in
    // the check (the check then fails at the second wrong answer, and passes only with `need` distinct RIGHT answers)
    const wrongs = answers.filter((a) => !right(a)), firstWrong = wrongs[slips];
    if (!firstWrong) {
      retention = new Set(answers.filter((a) => !slips || right(a)).map((a) => a.questionId)).size >= need ? "passed" : now >= Date.parse(dueAt) ? "due" : "scheduled";
      // a tolerated slip in a check that has not (yet) passed: the sub-skill is not shown until the check passes or fails
      if (wrongs.length && retention !== "passed") slipPending = true;
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
  return { retention, history, due: history.at(-1)?.due ?? null, slipPending };
}

export interface ProjectionOptions {
  /** answers left out of a sub-skill's independent evidence (neither right nor wrong); they stay in its record and history */
  exclude?: (a: { id: string; questionId: string }) => boolean;
  /** 0 (default): retention@2 exactly. 1: one wrong answer in a delayed check is tolerated (see retentionCycles) */
  retentionSlips?: 0 | 1;
}
/** The projection under a configuration. `authoritative` is the existing learner state for the competency (read only, to expose broader claims). */
export function projectSubSkillsWith<Id extends string>(config: SubSkillConfig<Id>, records: Pick<LearnerRecords, "attempts"> & Partial<Pick<LearnerRecords, "unresolved">>, now: number, authoritative?: { status: string; verified: boolean } | null, decisions?: ReadonlyMap<string, StoredDecision>, opts: ProjectionOptions = {}): Projection<Id> {
  const classifyQuestion = (q: unknown) => classifyQuestionWith(config, q);
  const base: Projection<Id> = { version: config.version, mapping: config.mapping, competency: config.competency, authoritative: false, outcome: "projected", subSkills: [], unknown: { count: 0, byReason: {}, attempts: [] }, rejected: [], discrepancies: [] };
  const all = Array.isArray(records?.attempts) ? records.attempts : [];
  if (all.length > MAX_ATTEMPTS) return { ...base, outcome: "resource-limit", rejected: [{ id: null, reason: `more than ${MAX_ATTEMPTS} attempts: not projected` }] };
  // deterministic order: time, then record id (the store's order is not relied on)
  const t = (x: unknown) => { const v = Date.parse(String((x as { at?: unknown })?.at)); return Number.isNaN(v) ? Infinity : v; };
  const code = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const sorted = [...all].sort((x, y) => t(x) - t(y) || code(String(x?.id), String(y?.id)));
  const projected: ProjectedAttempt<Id>[] = [];
  const byId = new Map<string, Attempt>();
  for (const a of sorted) {
    if (!validAttempt(a)) { base.rejected.push({ id: typeof (a as { id?: unknown })?.id === "string" ? (a as { id: string }).id : null, reason: "malformed attempt record" }); continue; }
    const c = classifyQuestion(a.questionId);
    if (c.kind === "unknown") {
      // only answers recorded for this competency (or its one-step prerequisite) are reported as unknown here
      if (a.competency === config.competency) { base.unknown.count++; base.unknown.byReason[c.reason] = (base.unknown.byReason[c.reason] ?? 0) + 1; base.unknown.attempts.push({ id: a.id, questionId: a.questionId, reason: c.reason }); }
      continue;
    }
    const correct = rightAnswer(a), independent = independentAttempt(a), mo = methodOf(a, c.family, c.format, decisions?.get(a.id)), method = mo.method;
    byId.set(a.id, a);
    projected.push({ id: a.id, at: a.at, questionId: a.questionId, family: c.family, subSkill: c.subSkill.id, variant: exposureKey(a.questionId), format: c.format, activity: a.activity, correct, independent, assisted: !independent, method, methodAuthority: mo.authority, historicalMethod: mo.authority !== null && mo.authority !== expectedWorkingAuthority(a.questionId)?.version, contradicted: correct && method === "method-false-step" });
  }
  const moduleRetention = moduleFor(config.competency)?.retention ?? [];
  for (const s of config.subSkills) {
    const mine = projected.filter((p) => p.subSkill === s.id);
    // as evidence.ts: a probe is evidence for its own micro-skill, never for showing the skill alone
    // a right answer whose own working has a false step is contradictory evidence: it is neither credited nor counted as a wrong answer
    // (it is reported, and makes the method "contradicted"); every other answer counts exactly as its recorded credit
    const ind = mine.filter((p) => p.independent && p.activity !== "probe" && !p.contradicted && !opts.exclude?.(p));
    const credited = (p: ProjectedAttempt<Id>) => p.correct;
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
    const cyc = retentionCycles(indAttempts, independentAt, need, now, (a) => credited(byAttempt.get(a.id)!), opts.retentionSlips ?? 0);
    let status: SubSkillStatus;
    if (!mine.length) status = "not-attempted";
    else if (cyc.retention === "failed") status = "recovery-required";
    else if (cyc.slipPending) status = "developing";
    else if (shown && cyc.retention === "due") status = "retention-due";
    else if (shown) status = "independently-demonstrated";
    else if (ind.length < INDEPENDENT_MIN) status = "insufficient-evidence";
    else status = "developing";
    // a verified method counts only when recorded under the current authority; an older authority's verdict stays historical (never upgraded)
    const mv = mine.filter((p) => p.independent && p.method === "method-verified" && p.correct && !p.historicalMethod).length;
    const mf = mine.filter((p) => p.method === "method-false-step").length;
    // valid partial derivations with no final answer: the reader keeps them out of the attempts (unresolved), so they are counted here only
    const partialWorking = (records?.unresolved ?? []).filter((u) => { const c = classifyQuestion(u.questionId); return c.kind === "mapped" && c.subSkill.id === s.id && (() => { const d = decisions?.get(u.id); const w = trustedWorking(d); return !!taskStatement(u.questionId) && (!d?.questionId || d.questionId === u.questionId) && (!d?.attemptId || d.attemptId === u.id) && (!w?.provenance || (w.provenance.schema === "working-provenance@1" && w.provenance.version === w.versions?.authority && w.provenance.questionId === u.questionId && w.provenance.competency === question(u.questionId).competency && w.provenance.checker === "derivation-authority")) && methodFrom2(d) === "partial"; })(); }).length;
    const lastIndependentAt = ind.at(-1)?.at ?? null;
    const daysSince = lastIndependentAt ? Math.floor((now - Date.parse(lastIndependentAt)) / DAY) : null;
    base.subSkills.push({
      id: s.id, name: s.name, families: s.families, competency: s.competency, status,
      attempts: { total: mine.length, independent: ind.length, independentRight: ind.filter(credited).length, assisted: mine.filter((p) => p.assisted).length, assistedRight: mine.filter((p) => p.assisted && p.correct).length, distinctVariantsRight: distinct.size, contradicted: mine.filter((p) => p.contradicted).length },
      method: { verified: mv, falseStep: mf, unsupported: mine.filter((p) => p.method === "unsupported").length, noMethodEvidence: mine.filter((p) => p.method === "no-method-evidence").length, noWorking: mine.filter((p) => p.method === "no-working").length,
        partial: mine.filter((p) => p.method === "partial").length, partialWorking, notRecorded: mine.filter((p) => p.method === "not-recorded").length,
        historical: mine.filter((p) => p.historicalMethod).length, historicalVerified: mine.filter((p) => p.historicalMethod && p.method === "method-verified").length,
        status: mf ? "contradicted" : mv ? "verified" : "not-established" },
      rechecks: mine.filter((p) => p.independent && p.activity === "check").map((p) => ({ at: p.at, questionId: p.questionId, correct: credited(p) })),
      retention: { state: cyc.retention, dueAt: cyc.due, need, sampledByModuleCheck: sampled > 0, history: cyc.history },
      historical: { everDemonstrated: !!independentAt, firstDemonstratedAt: independentAt },
      freshness: { lastIndependentAt, daysSince, fresh: daysSince === null ? null : daysSince < RETENTION_DAYS },
      prerequisiteSupport: [],
      evidence: mine.map((p) => p.id),
    });
  }
  // the one explicit relation of the configuration (a graph edge): demonstrated `from` sub-skills are listed as support for `to`; never a status change
  const rel = config.prerequisiteSupport;
  if (rel) {
    const to = base.subSkills.find((x) => x.id === rel.to);
    if (to) for (const x of base.subSkills) if (rel.from.includes(x.id) && x.historical.everDemonstrated) to.prerequisiteSupport.push({ from: x.id, relation: rel.relation });
  }
  if (authoritative) {
    const broad = authoritative.verified || ["independent", "transfer", "verified"].includes(authoritative.status);
    const unsupported = base.subSkills.filter((x) => config.core.includes(x.id) && x.status !== "independently-demonstrated").map((x) => ({ id: x.id, status: x.status }));
    if (broad && unsupported.length) base.discrepancies.push({ authoritative: { status: authoritative.status, verified: authoritative.verified }, claim: config.broadClaim(authoritative.verified ? "verified" : authoritative.status), unsupported });
  }
  return base;
}

/**
 * The projection from the stored events (the same events the authoritative state reads). Attempt records for this competency that the existing
 * reader (records.ts readRecords) does not admit as attempts (a question id it does not know, e.g. a record from before generator ids, or a
 * retired family) are reported as unknown, "excluded-by-existing-reader": nothing is credited to any sub-skill for them, and they are not
 * reinterpreted. Quarantined, unresolved and pending answers are excluded exactly as the reader excludes them.
 */
export function projectFromEventsWith<Id extends string>(config: SubSkillConfig<Id>, learnerId: string, events: readonly { kind: string }[], now: number, authoritative?: { status: string; verified: boolean } | null, opts: ProjectionOptions = {}): Projection<Id> {
  const ordered = canonicalOrder(events);
  let recs: LearnerRecords;
  try { recs = readRecords(learnerId, ordered); }
  catch (e) { return { version: config.version, mapping: config.mapping, competency: config.competency, authoritative: false, outcome: "unreadable-events", subSkills: [], unknown: { count: 0, byReason: {}, attempts: [] }, rejected: [{ id: null, reason: `the existing reader could not read the events (${String((e as Error)?.message ?? e).slice(0, 80)}): nothing is projected` }], discrepancies: [] }; }
  // the server's decision behind each record the reader admitted (this learner's, first occurrence): the only source of method verdicts
  const admittedIds = new Set([...recs.attempts.map((a) => a.id), ...recs.unresolved.map((u) => u.id)]);
  const decisions = new Map<string, StoredDecision>();
  for (const e of ordered) { const r = e as { kind?: string; record?: string; id?: unknown; learnerId?: unknown; decision?: StoredDecision }; if (r.kind === "learning_record" && r.record === "attempt" && r.learnerId === learnerId && typeof r.id === "string" && admittedIds.has(r.id) && r.decision && !decisions.has(r.id)) decisions.set(r.id, r.decision); }
  const p = projectSubSkillsWith(config, recs, now, authoritative, decisions, opts);
  if (p.outcome !== "projected") return p;
  const admitted = new Set([...recs.attempts.map((a) => a.id), ...recs.unresolved.map((a) => a.id), ...recs.pending.map((a) => a.id)]);
  const seen = new Set<string>();
  for (const e of ordered) {
    const r = e as { kind?: string; record?: string; id?: unknown; learnerId?: unknown; competency?: unknown; questionId?: unknown };
    if (r.kind !== "learning_record" || r.record !== "attempt" || r.learnerId !== learnerId || r.competency !== config.competency) continue;
    const id = typeof r.id === "string" ? r.id : null;
    if (id && (admitted.has(id) || seen.has(id))) continue;
    if (id) seen.add(id);
    p.unknown.count++; p.unknown.byReason["excluded-by-existing-reader"] = (p.unknown.byReason["excluded-by-existing-reader"] ?? 0) + 1;
    p.unknown.attempts.push({ id: id ?? "(no id)", questionId: typeof r.questionId === "string" ? r.questionId : "(none)", reason: "excluded-by-existing-reader" });
  }
  return p;
}
