/**
 * M1: sub-skill-gated mastery for MATH.algebra.linear-equations (subskill-gated-mastery@1). PROPOSED POLICY, SHADOW ONLY.
 *
 * Nothing here is authoritative. It is computed beside the existing authoritative status (evidence.ts skillEvidence, unchanged) from the SAME
 * stored events, so both can be compared. It is not read by the adaptive engine, the plan, the app or the backend.
 *
 * Built entirely on E1's projection (subskill-evidence.ts projectFromEvents): the same family mapping (linear-equations-subskills@1), the same
 * per-sub-skill criteria (INDEPENDENT_MIN distinct generated variants right, first attempt, alone, not a probe; status@2; a right answer whose
 * trusted working has a false step is neutral; unknown families never count; historical method verdicts never upgraded; client claims never
 * read), and E1's per-sub-skill retention@2 cycle (a failed check needs NEW right answers alone on THAT sub-skill to recover).
 *
 * The gate: the competency is independently demonstrated only when EVERY core sub-skill is (two-step, both sides, brackets, modelling).
 * One-step stays the prerequisite competency MATH.algebra.linear-intro and is not gated here. Evidence earned in a sub-skill is kept across
 * sessions (E1 reads the whole history), so nothing has to be retested in every session.
 *
 * Unresolved policy choices are configurable SHADOW ALTERNATIVES (never an authoritative threshold): see VARIANTS.
 */
import { learnerState } from "./session";
import { question } from "./content";
import { phasePool, exposureKey } from "./families";
import { RETENTION_CHECK } from "./evidence";
import { canonicalOrder, classifyQuestion, projectFromEvents, SUBSKILLS, type Projection, type ProjectionOptions, type SubSkillId, type SubSkillStatus } from "./subskill-evidence";

export const GATED_MASTERY_VERSION = "subskill-gated-mastery@1" as const;
export const COMPETENCY = "MATH.algebra.linear-equations" as const;
/** the designated core sub-skills of the competency (M1) */
export const GATED_CORE: readonly SubSkillId[] = ["linear-equations.two-step@1", "linear-equations.both-sides@1", "linear-equations.brackets@1", "linear-equations.modelling@1"];

/**
 * Shadow alternatives for the choices M1 leaves open (each is a comparison, none is a recommendation):
 *   gated            E1's criteria as they are (multiple-choice answers count like typed ones; any wrong answer fails a delayed check)
 *   gated-typed      choice answers do not count as independent evidence (neither right nor wrong): a guessed option cannot demonstrate
 *                    a sub-skill. "Choice" is read from the question itself (it has options), not from the id: auleq ("choose the equation")
 *                    is a four-option choice item without a ":mc" suffix
 *   gated-method     each equation sub-skill also needs at least one independent right answer with trusted VERIFIED working (modelling has no
 *                    equation contract and is exempt)
 *   gated-slip       one wrong answer in a sub-skill's delayed check does not fail it; the check fails at the second wrong answer and passes
 *                    only with the needed distinct RIGHT answers (status@2's "one slip does not undo it", applied to the delayed check)
 */
export const VARIANTS = ["gated", "gated-typed", "gated-method", "gated-slip"] as const;
export type Variant = (typeof VARIANTS)[number];
export type GatedStatus = "not-started" | "insufficient-evidence" | "developing" | "independently-demonstrated" | "retention-due" | "recovery-required";
const SHOWN: readonly SubSkillStatus[] = ["independently-demonstrated", "retention-due"];

export interface SubSkillRecord {
  id: SubSkillId; status: SubSkillStatus;
  /** kept separately, as M1 requires */
  historicalAchievement: boolean; currentDemonstration: boolean;
  independent: { answers: number; right: number; distinctVariantsRight: number }; assisted: { answers: number; right: number };
  method: { verified: number; falseStep: number; status: string };
  retentionDue: boolean; recoveryRequired: boolean; retentionHistory: unknown[];
  evidence: string[]; note?: string;
}
export interface GatedResult {
  policy: typeof GATED_MASTERY_VERSION; variant: Variant; authoritative: false;
  status: GatedStatus; historicalAchievement: boolean;
  shown: SubSkillId[]; missing: SubSkillId[]; subSkills: SubSkillRecord[];
  retentionDue: SubSkillId[]; recoveryRequired: SubSkillId[]; unknown: number;
}

function gate(p: Projection, variant: Variant): GatedResult {
  const subs: SubSkillRecord[] = [];
  for (const id of GATED_CORE) {
    const s = p.subSkills.find((x) => x.id === id)!;
    let status = s.status, note: string | undefined;
    if (variant === "gated-method" && SHOWN.includes(status) && id !== "linear-equations.modelling@1" && s.method.verified < 1) { status = "developing"; note = "no independent right answer with verified working yet"; }
    subs.push({ id, status, historicalAchievement: s.historical.everDemonstrated, currentDemonstration: SHOWN.includes(status),
      independent: { answers: s.attempts.independent, right: s.attempts.independentRight, distinctVariantsRight: s.attempts.distinctVariantsRight }, assisted: { answers: s.attempts.assisted, right: s.attempts.assistedRight },
      method: { verified: s.method.verified, falseStep: s.method.falseStep, status: s.method.status },
      retentionDue: status === "retention-due", recoveryRequired: status === "recovery-required", retentionHistory: s.retention.history, evidence: s.evidence, ...(note ? { note } : {}) });
  }
  const shown = subs.filter((s) => s.currentDemonstration).map((s) => s.id), missing = subs.filter((s) => !s.currentDemonstration).map((s) => s.id);
  const rec = subs.filter((s) => s.recoveryRequired).map((s) => s.id), due = subs.filter((s) => s.retentionDue).map((s) => s.id);
  let status: GatedStatus;
  if (rec.length) status = "recovery-required";
  else if (!missing.length) status = due.length ? "retention-due" : "independently-demonstrated";
  else if (subs.every((s) => s.status === "not-attempted")) status = "not-started";
  else if (subs.some((s) => s.status === "developing" || SHOWN.includes(s.status))) status = "developing";
  else status = "insufficient-evidence";
  return { policy: GATED_MASTERY_VERSION, variant, authoritative: false, status, historicalAchievement: subs.every((s) => s.historicalAchievement), shown, missing, subSkills: subs, retentionDue: due, recoveryRequired: rec, unknown: p.unknown.count };
}
/** a choice item: the learner picks one of the shown options (a ":mc" variant, or a family whose question is itself a choice, e.g. auleq) */
export const isChoice = (qid: string) => /:mc$/.test(qid) || !!question(qid)?.options?.length;
/**
 * Provenance guard (all variants): an attempt that carries a decision which is NOT the server's (decidedBy other than "server", or another
 * schema) is left out of the sub-skill's independent evidence. Without it, replacing the server's decision (e.g. a trusted "invalid working")
 * with an untrusted one would make E1 read the answer as a record from before D1 (re-graded, method not recorded) and credit it. Records with
 * no decision at all (before D1, or the backend's shadow grading mode, which stores its verdict elsewhere) are read exactly as E1 reads them.
 */
function untrustedDecisions(events: readonly { kind: string }[]) {
  const ids = new Set<string>();
  for (const e of events as readonly { record?: string; id?: unknown; decision?: { schema?: unknown; decidedBy?: unknown } }[])
    if (e.record === "attempt" && typeof e.id === "string" && e.decision !== undefined && !(e.decision && e.decision.schema === "grading-decision@1" && e.decision.decidedBy === "server")) ids.add(e.id);
  return ids;
}
const optionsFor = (variant: Variant, untrusted: Set<string>): ProjectionOptions => {
  const out = (a: { id: string; questionId: string }) => untrusted.has(a.id) || (variant === "gated-typed" && isChoice(a.questionId));
  return { exclude: out, ...(variant === "gated-slip" ? { retentionSlips: 1 as const } : {}) };
};

/** the proposed status under one shadow variant, from the stored events */
export function gatedMastery(learnerId: string, events: readonly { kind: string }[], now: number, variant: Variant = "gated"): GatedResult {
  return gate(projectFromEvents(learnerId, events, now, null, optionsFor(variant, untrustedDecisions(events))), variant);
}

/** existing (authoritative, unchanged) and proposed (shadow) side by side, for one event history */
export interface Comparison {
  existing: { status: string; verified: boolean; claimsCompetence: boolean; retention: string; retentionDueAt: string | null; recoveryRequired: boolean; independent: { right: number; total: number } };
  proposed: Record<Variant, GatedResult>;
  disagreements: { variant: Variant; existing: string; proposed: GatedStatus; why: string }[];
}
const CLAIM = new Set(["independent", "transfer", "verified"]);
export function compareMastery(learnerId: string, events: readonly { kind: string }[], now: number): Comparison {
  // both policies read the same events in E1's canonical order (the store's order is time order for server-stamped records, so the existing
  // status is the one the app shows; the canonical order only removes a dependence on delivery order)
  events = canonicalOrder(events);
  const ev = learnerState(learnerId, events, now).evidence(COMPETENCY);
  const existing = { status: ev.status, verified: ev.verified, claimsCompetence: CLAIM.has(ev.status) || ev.verified, retention: ev.retention, retentionDueAt: ev.retentionDueAt, recoveryRequired: ev.recoveryRequired, independent: ev.independent };
  const proposed = Object.fromEntries(VARIANTS.map((v) => [v, gatedMastery(learnerId, events, now, v)])) as Record<Variant, GatedResult>;
  const disagreements: Comparison["disagreements"] = [];
  for (const v of VARIANTS) {
    const p = proposed[v], pc = p.status === "independently-demonstrated" || p.status === "retention-due";
    if (existing.claimsCompetence && !pc) disagreements.push({ variant: v, existing: ev.status, proposed: p.status, why: p.recoveryRequired.length ? `recovery required on ${p.recoveryRequired.join(", ")}` : `not shown: ${p.missing.join(", ")}` });
    else if (!existing.claimsCompetence && pc) disagreements.push({ variant: v, existing: ev.status, proposed: p.status, why: existing.recoveryRequired ? "the existing policy requires recovery (competency-wide); every sub-skill is currently shown" : "every core sub-skill is shown" });
    else if (existing.recoveryRequired !== (p.status === "recovery-required")) disagreements.push({ variant: v, existing: `${ev.status}${existing.recoveryRequired ? " (recovery required)" : ""}`, proposed: p.status, why: existing.recoveryRequired ? "recovered on the sub-skill that failed, or the failure was on another sub-skill" : `recovery required on ${p.recoveryRequired.join(", ")} (an unrelated sub-skill does not clear it)` });
  }
  // both claim, but the proposed claim rests on a sub-skill whose delayed check is due and has never been answered (no evidence that it lasted)
  for (const v of VARIANTS) { const p = proposed[v]; const unchecked = p.subSkills.filter((s) => s.retentionDue && !s.retentionHistory.some((h) => (h as { result: string }).result !== "pending")).map((s) => s.id);
    if (existing.claimsCompetence && unchecked.length && (p.status === "retention-due")) disagreements.push({ variant: v, existing: ev.status, proposed: p.status, why: `claim rests on sub-skills never delayed-checked: ${unchecked.join(", ")}` }); }
  return { existing, proposed, disagreements };
}

/**
 * The proposed sub-skill delayed check (shadow): for every core sub-skill whose check is due, `need` fresh questions from that sub-skill's own
 * families' retention pools (never one already met). A sub-skill whose generator has no fresh retention item is reported UNCHECKED, never passed.
 */
export interface RetentionPlanItem { subSkill: SubSkillId; questions: string[]; unchecked: boolean; reason: string }
export function proposedRetentionPlan(learnerId: string, events: readonly { kind: string }[], now: number, o: { pool?: (fam: string, phase: "retention") => string[] } = {}): RetentionPlanItem[] {
  const source = o.pool ?? phasePool;
  const p = projectFromEvents(learnerId, events, now);
  const seen = new Set((events as readonly { record?: string; questionId?: string }[]).filter((e) => e.record === "attempt" && e.questionId).map((e) => exposureKey(e.questionId!)));
  const out: RetentionPlanItem[] = [];
  for (const id of GATED_CORE) {
    const s = p.subSkills.find((x) => x.id === id)!;
    if (s.status !== "retention-due") continue;
    const need = Math.max(1, Math.min(RETENTION_CHECK, s.retention.need));
    const fams = SUBSKILLS.find((x) => x.id === id)!.families;
    // typed items first: a choice item can be guessed, so it is used only when the sub-skill has no fresh typed item left (for modelling:
    // typed aulwp, form-and-solve, before auleq, choose-the-equation)
    const typedFirst = (qs: string[]) => [...qs.filter((q) => !isChoice(q) && !/:w$/.test(q)), ...qs.filter((q) => isChoice(q) || /:w$/.test(q))];
    const pool = typedFirst(fams.flatMap((f) => source(f, "retention"))).filter((q) => { const c = classifyQuestion(q); return c.kind === "mapped" && c.subSkill.id === id && !seen.has(exposureKey(q)); });
    const pick: string[] = []; const keys = new Set<string>();
    for (const q of pool) { const k = exposureKey(q); if (keys.has(k)) continue; keys.add(k); pick.push(q); if (pick.length >= need) break; }
    out.push({ subSkill: id, questions: pick, unchecked: pick.length < need, reason: pick.length < need ? `only ${pick.length} fresh retention item(s) for ${need} needed: reported unchecked, never passed` : `${need} fresh retention item(s) from ${fams.join("/")}` });
  }
  return out;
}
