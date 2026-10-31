/**
 * explanation-review@1: the content-safety contract for EXPLANATIONS (a module's strategies: the teaching an
 * intervention shows). It extends the educator-review registry (review@2, review.ts), which locks question families and
 * whole modules, with one record per explanation, locked to an exact content revision (SHA-256 of its content).
 *
 *   record      explanation id (<competency>#<strategy>), subject, competency, intervention type, whether it is
 *               misconception-specific, and its revisions
 *   revision    content hash, review status, review provenance (who or what produced the status), reviewer role,
 *               reviewer and review date (educator decisions), known safety issues, allowed usage scope
 *
 * Statuses: approved | pending_review | revision_required | demo_only | blocked.
 *   - Only an EDUCATOR decision can approve: provenance "educator", reviewer role "educator", a reviewer listed in the
 *     registry's authorised reviewers, a review date, and an approval digest binding all of these to the content hash.
 *     AI screening, machine checks and engineering can set every other status, never "approved".
 *   - A decision applies to one content hash. Any edit of the content changes the hash, so the earlier decision no
 *     longer applies: the new revision must be registered (scripts/explanation-review.ts sync: pending_review) and
 *     reviewed again. A blocked revision stays blocked; restoring its content restores the block.
 *   - Content with no record for its current revision is refused in every mode (fail closed).
 *
 * Teaching modes (setTeachingMode): "demonstration" (default; the prototype app, labelled as such) may show approved,
 * pending_review, revision_required and demo_only content, always labelled as not educator-approved unless it is
 * approved; "supervised-evaluation" shows approved content only. Blocked content is refused in every mode.
 *
 * Nothing here decides WHAT to teach (intervention.ts does); it decides whether a chosen explanation may be shown.
 */
import registryData from "../../../content/learning/explanation-review.v1.json";
import blocklistData from "../../../content/learning/explanation-blocklist.v1.json";
import { question, type Module, type Strategy } from "./content";
import { sha256Hex } from "./digest";
import { problemOf } from "./families";

export const EXPLANATION_REVIEW = "explanation-review@1" as const;
export type ReviewStatus = "approved" | "pending_review" | "revision_required" | "demo_only" | "blocked";
export type TeachingMode = "demonstration" | "supervised-evaluation";
export type ProvenanceSource = "registry" | "ai-screening" | "machine-check" | "engineering" | "educator";
export interface ReviewProvenance { source: ProvenanceSource; by: string; at: string; note: string; ref?: string }
export interface ExplanationRevision {
  contentHash: string;
  status: ReviewStatus;
  provenance: ReviewProvenance;
  reviewerRole: "none" | "ai-reviewer" | "engineer" | "educator";
  /** An authorised reviewer's identifier (educator decisions only). */
  reviewer?: string;
  reviewedAt?: string;
  knownIssues: string[];
  scope: TeachingMode[];
  /** The content hash of the revision this one replaced. */
  supersedes?: string;
  /** sha256 over (id, contentHash, status, reviewer, reviewedAt, scope, provenance source): educator approvals only. */
  approvalDigest?: string;
}
export interface ExplanationRecord {
  id: string;
  subject: "mathematics";
  competency: string;
  strategy: string;
  intervention: Strategy["kind"];
  misconceptionSpecific: boolean;
  /** The misconception (family diagnosis id) a misconception-specific explanation is about, when it can be read from its content. */
  addresses: string | null;
  revisions: ExplanationRevision[];
}
/** Blocked revisions, kept apart from the registry: a revision listed here is refused in every mode whatever the registry says, and
 *  leaving it takes a deliberate, separate edit of this file (reviewed in a pull request). */
export interface Blocklist { schema: "explanation-blocklist@1"; note: string; entries: { id: string; contentHash: string; reason: string; blockedAt: string; by: string }[] }
export interface AuthorisedReviewer { id: string; role: "educator"; addedAt: string; addedBy: string; note: string }
export interface ExplanationRegistry { schema: typeof EXPLANATION_REVIEW; note: string; reviewers: AuthorisedReviewer[]; entries: ExplanationRecord[] }

/** What each mode may show. Intervention types are the strategy kinds. */
export const MODE_POLICY: Record<TeachingMode, { statuses: ReviewStatus[]; interventions: Strategy["kind"][] }> = {
  demonstration: { statuses: ["approved", "pending_review", "revision_required", "demo_only"], interventions: ["conceptual", "procedural", "recall", "prerequisite"] },
  "supervised-evaluation": { statuses: ["approved"], interventions: ["conceptual", "procedural", "recall", "prerequisite"] },
};

// ---------------------------------------------------------------- identity and revision

/** JSON with sorted keys, so a hash does not depend on key order. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
export const explanationId = (competency: string, strategy: string) => `${competency}#${strategy}`;
/** A module's concept section (its chapter), shown before or beside its explanations, reviewed as an explanation of its own. */
export const CHAPTER = "chapter";
export const chapterExplanation = (m: Module): Strategy => ({ id: CHAPTER, title: m.title, kind: "conceptual", needs: [], screens: m.chapter, guided: "", check: "" });
const questionText = (id: string) => { if (!id) return null; try { const q = question(id); return { prompt: q.prompt, answer: q.answer, options: q.options ?? null }; } catch { return null; } };
/** The content a review covers: everything the learner is shown, and the guided and independent recheck questions with their text. */
export const explanationContent = (competency: string, s: Strategy) => ({ competency, id: s.id, title: s.title, kind: s.kind, needs: s.needs, screens: s.screens, guided: s.guided, check: s.check, recheck: { guided: questionText(s.guided), check: questionText(s.check) } });
const hashCache = new Map<string, string>();
export function contentHash(competency: string, s: Strategy): string {
  const text = canonicalJson(explanationContent(competency, s));
  let h = hashCache.get(text);
  if (!h) hashCache.set(text, (h = `sha256:${sha256Hex(text)}`));
  return h;
}
/** Misconception-specific: a section that presents a particular wrong answer and why it is wrong (teaching-contract@1 role). */
export const isMisconceptionSpecific = (s: Strategy) => s.screens.some((sc) => sc.role === "misconception" || (!sc.role && s.id === "spot_the_mistake"));
/** Which misconception it is about: the diagnosis of its question whose explanation the section quotes (null when it cannot be read). */
export function addressedMisconception(s: Strategy): string | null {
  for (const sc of s.screens) {
    if (!(sc.role === "misconception" || (!sc.role && s.id === "spot_the_mistake")) || !sc.instance) continue;
    const b = problemOf(sc.instance)?.bugs.find((x) => !!x.says && sc.text.includes(x.says));
    if (b) return b.id;
  }
  return null;
}
export function approvalDigest(id: string, r: Pick<ExplanationRevision, "contentHash" | "status" | "reviewer" | "reviewedAt" | "scope" | "provenance">): string {
  return `sha256:${sha256Hex(canonicalJson({ id, contentHash: r.contentHash, status: r.status, reviewer: r.reviewer ?? null, reviewedAt: r.reviewedAt ?? null, scope: [...r.scope].sort(), source: r.provenance.source }))}`;
}

// ---------------------------------------------------------------- registry and mode

// the registry in use and the teaching mode live on globalThis, so that every copy of this module (ESM and CJS loads of the same file in
// one process) sees one state, as review.ts and evidence.ts do
// the app's mode is fixed at build time (frontend scripts/build.mjs defines __OPENPATH_TEACHING_MODE__); never set from the page
declare const __OPENPATH_TEACHING_MODE__: string | undefined;
const buildMode = (): TeachingMode => (typeof __OPENPATH_TEACHING_MODE__ !== "undefined" && __OPENPATH_TEACHING_MODE__ === "supervised-evaluation" ? "supervised-evaluation" : "demonstration");
const G = globalThis as { __openpathExplanationReview?: { registry: ExplanationRegistry; index: Map<string, ExplanationRecord>; mode: TeachingMode; blocked: Set<string> } };
const state = (G.__openpathExplanationReview ??= (() => { const r = registryData as unknown as ExplanationRegistry; return { registry: r, index: new Map(r.entries.map((e) => [e.id, e])), mode: buildMode(), blocked: new Set((blocklistData as Blocklist).entries.map((b) => `${b.id}@${b.contentHash}`)) }; })());
export const explanationBlocklist = () => blocklistData as Blocklist;
const isBlocklisted = (id: string, hash: string) => state.blocked.has(`${id}@${hash}`);
export const explanationRegistry = () => state.registry;
/** Replace the registry (tests, and the review tooling); returns the previous one. */
export function setExplanationRegistry(r: ExplanationRegistry): ExplanationRegistry {
  const prev = state.registry;
  state.registry = r;
  state.index = new Map(r.entries.map((e) => [e.id, e]));
  return prev;
}
export const teachingMode = () => state.mode;
/** Set the teaching mode for this process (the app is a demonstration unless configured otherwise); returns the previous. */
export function setTeachingMode(m: TeachingMode): TeachingMode {
  if (m !== "demonstration" && m !== "supervised-evaluation") throw new Error(`${EXPLANATION_REVIEW}: unknown teaching mode ${m}`);
  const prev = state.mode;
  state.mode = m;
  return prev;
}

/** Whether an educator approval is genuine as far as the registry can tell (who, role, date, scope, digest). */
export function approvalIntegrity(rec: ExplanationRecord, rev: ExplanationRevision, reg: ExplanationRegistry = state.registry): string[] {
  const problems: string[] = [];
  if (rev.status !== "approved") {
    if (rev.scope.includes("supervised-evaluation")) problems.push("only an approved revision may be used in supervised evaluation");
    if (rev.reviewerRole === "educator" && rev.provenance.source !== "educator") problems.push("educator role without educator provenance");
    return problems;
  }
  if (rev.provenance.source !== "educator") problems.push(`approved by ${rev.provenance.source}, not by an educator`);
  if (rev.reviewerRole !== "educator") problems.push(`reviewer role ${rev.reviewerRole}, not educator`);
  const who = reg.reviewers.find((r) => r.id === rev.reviewer);
  if (!rev.reviewer || !who || who.role !== "educator") problems.push(`reviewer ${rev.reviewer ?? "(none)"} is not an authorised educator`);
  if (!rev.reviewedAt || Number.isNaN(Date.parse(rev.reviewedAt))) problems.push("no review date");
  else if (who && Date.parse(rev.reviewedAt) < Date.parse(who.addedAt)) problems.push("reviewed before the reviewer was authorised");
  if (rev.approvalDigest !== approvalDigest(rec.id, rev)) problems.push("approval digest does not match the revision");
  return problems;
}

// ---------------------------------------------------------------- eligibility

export interface EligibilityCheck { check: "exists" | "record" | "revision" | "not-blocked" | "integrity" | "approved-for-usage" | "competency" | "intervention" | "misconception-evidence"; ok: boolean; detail: string }
export interface ContentEligibility {
  contract: typeof EXPLANATION_REVIEW;
  id: string;
  mode: TeachingMode;
  usage: "intervention" | "lesson";
  eligible: boolean;
  /** The status of the current revision; "unreviewed" when there is no record of it. */
  status: ReviewStatus | "unreviewed";
  /** An educator approval of this exact revision, verified. */
  educatorApproved: boolean;
  contentHash: string | null;
  checks: EligibilityCheck[];
  failed: EligibilityCheck["check"][];
  /** What may be said to the learner about this explanation (never "approved" unless educatorApproved). */
  label: string;
}
export interface EligibilityRequest {
  /** The skill being taught. */
  competency: string;
  mode?: TeachingMode;
  /** The misconceptions established for this learner in this skill (misconception-evidence.ts: ids), or true when one is
   *  established but its id is not known (a finding passed in by recovery). A misconception-specific explanation needs the one it
   *  addresses (or, when that cannot be read from its content, any established misconception). */
  misconceptionEvidence?: boolean | readonly string[];
  /** An intervention chosen for this learner, or a general lesson page (no diagnosis implied). */
  usage?: "intervention" | "lesson";
}

/**
 * Whether this explanation may be shown as teaching now. Every check is evaluated and reported; it is eligible only
 * when all pass. A refusal never substitutes other content: the caller chooses another eligible explanation or pauses.
 */
export function contentEligibility(module: Module | null | undefined, strategy: Strategy | null | undefined, req: EligibilityRequest, reg: ExplanationRegistry = state.registry): ContentEligibility {
  const m = req.mode ?? state.mode, usage = req.usage ?? "intervention";
  const checks: EligibilityCheck[] = [];
  const add = (check: EligibilityCheck["check"], ok: boolean, detail: string) => { checks.push({ check, ok, detail }); return ok; };
  const id = module && strategy ? explanationId(module.competency, strategy.id) : `${req.competency}#${strategy?.id ?? "?"}`;
  const out = (status: ContentEligibility["status"], hash: string | null, approved: boolean): ContentEligibility => {
    const failed = checks.filter((c) => !c.ok).map((c) => c.check);
    const eligible = !failed.length;
    const label = !eligible ? "Not shown: this explanation is not cleared for use here."
      : approved ? "Approved by an educator for supervised evaluation."
      : "Demonstration: this explanation has not been approved by an educator.";
    return { contract: EXPLANATION_REVIEW, id, mode: m, usage, eligible, status, educatorApproved: approved && eligible, contentHash: hash, checks, failed, label };
  };
  const inModule = !!module && !!strategy && (strategy.id === CHAPTER ? canonicalJson(strategy.screens) === canonicalJson(module.chapter) : module.strategies.some((x) => x === strategy || x.id === strategy.id));
  const exists = inModule && strategy!.screens.length > 0 && strategy!.screens.every((sc) => sc.text.join("").trim().length > 0);
  if (!add("exists", exists, exists ? "content present" : "no such explanation, or it has no text")) return out("unreviewed", null, false);
  const hash = contentHash(module!.competency, strategy!);
  const listed = isBlocklisted(id, hash);
  const rec = reg === state.registry ? state.index.get(id) : reg.entries.find((e) => e.id === id);
  if (!add("record", !!rec, rec ? "review record found" : "no review record: unreviewed content is not shown")) return out("unreviewed", hash, false);
  const rev = rec!.revisions.find((r) => r.contentHash === hash);
  if (!add("revision", !!rev, rev ? "the review applies to this exact revision" : "the content changed since its review: the earlier decision no longer applies")) return out("unreviewed", hash, false);
  add("not-blocked", rev!.status !== "blocked" && !listed, rev!.status === "blocked" || listed ? `blocked${listed ? " (blocklist)" : ""}: ${rev!.knownIssues.join("; ") || "see the blocklist"}` : "not blocked");
  const meta = [
    rec!.competency !== module!.competency && "record competency differs from the content",
    rec!.strategy !== strategy!.id && "record strategy differs from the content",
    rec!.intervention !== strategy!.kind && "record intervention type differs from the content",
    rec!.misconceptionSpecific !== isMisconceptionSpecific(strategy!) && "record misconception flag differs from the content",
    (rec!.addresses ?? null) !== addressedMisconception(strategy!) && "record addressed misconception differs from the content",
  ].filter((x): x is string => !!x);
  const integrity = [...meta, ...approvalIntegrity(rec!, rev!, reg)];
  add("integrity", !integrity.length, integrity.length ? integrity.join("; ") : "review metadata consistent");
  const allowed = MODE_POLICY[m].statuses.includes(rev!.status) && (m === "demonstration" || rev!.scope.includes(m));
  add("approved-for-usage", allowed, allowed ? `${rev!.status} may be shown in ${m}` : `${rev!.status} may not be shown in ${m}`);
  const sameSkill = req.competency === module!.competency && rec!.competency === req.competency;
  add("competency", sameSkill, sameSkill ? "explanation is for the skill being taught" : `explanation is for ${module!.competency}, not ${req.competency}`);
  add("intervention", MODE_POLICY[m].interventions.includes(strategy!.kind), `${strategy!.kind} ${MODE_POLICY[m].interventions.includes(strategy!.kind) ? "is" : "is not"} permitted in ${m}`);
  const needsEvidence = usage === "intervention" && isMisconceptionSpecific(strategy!);
  const about = needsEvidence ? addressedMisconception(strategy!) : null, ev = req.misconceptionEvidence;
  const evidenced = !needsEvidence || (Array.isArray(ev) ? (about ? ev.includes(about) : ev.length > 0) : ev === true);
  add("misconception-evidence", evidenced, !needsEvidence ? "no misconception claimed"
    : evidenced ? `established for this learner: ${about ?? "a misconception (the one addressed is not recorded)"}`
    : `about ${about ?? "a misconception"}, which is not established for this learner${Array.isArray(ev) && ev.length ? ` (established: ${ev.join(", ")})` : ""}`);
  return out(rev!.status, hash, rev!.status === "approved" && !integrity.length);
}

/** Registry validation (scripts/explanation-review.ts check; tests): structural rules every committed registry meets. */
export function validateRegistry(reg: ExplanationRegistry, modules: Module[], blocklist: Blocklist = explanationBlocklist()): string[] {
  const problems: string[] = [];
  if (reg.schema !== EXPLANATION_REVIEW) problems.push(`schema ${reg.schema}`);
  const ids = new Set<string>();
  for (const e of reg.entries) {
    if (ids.has(e.id)) problems.push(`${e.id}: duplicate record`);
    ids.add(e.id);
    if (e.id !== explanationId(e.competency, e.strategy)) problems.push(`${e.id}: id does not match competency and strategy`);
    const hashes = new Set<string>();
    for (const r of e.revisions) {
      if (hashes.has(r.contentHash)) problems.push(`${e.id}: two decisions for one revision`);
      hashes.add(r.contentHash);
      if (!["approved", "pending_review", "revision_required", "demo_only", "blocked"].includes(r.status)) problems.push(`${e.id}: unknown status ${r.status}`);
      if (r.status === "blocked" && !r.knownIssues.length) problems.push(`${e.id}: blocked without a recorded issue`);
      for (const p of approvalIntegrity(e, r, reg)) problems.push(`${e.id} ${r.contentHash.slice(7, 19)}: ${p}`);
    }
  }
  // blocked revisions and the blocklist agree, both ways
  const listed = new Set(blocklist.entries.map((b) => `${b.id}@${b.contentHash}`));
  for (const e of reg.entries) for (const r of e.revisions) if (r.status === "blocked" && !listed.has(`${e.id}@${r.contentHash}`)) problems.push(`${e.id}: blocked revision missing from the blocklist`);
  for (const b of blocklist.entries) if (!reg.entries.some((e) => e.id === b.id && e.revisions.some((r) => r.contentHash === b.contentHash && r.status === "blocked"))) problems.push(`${b.id}: blocklisted revision not recorded as blocked`);
  for (const m of modules)
    for (const s of [...m.strategies, ...(m.chapter.length ? [chapterExplanation(m)] : [])]) {
      const e = reg.entries.find((x) => x.id === explanationId(m.competency, s.id));
      if (!e) { problems.push(`${explanationId(m.competency, s.id)}: no record`); continue; }
      if (!e.revisions.some((r) => r.contentHash === contentHash(m.competency, s))) problems.push(`${e.id}: current revision not registered`);
      if (e.intervention !== s.kind) problems.push(`${e.id}: record intervention ${e.intervention}, content ${s.kind}`);
      if (e.misconceptionSpecific !== isMisconceptionSpecific(s)) problems.push(`${e.id}: record misconception flag differs from the content`);
      if ((e.addresses ?? null) !== addressedMisconception(s)) problems.push(`${e.id}: record addressed misconception differs from the content`);
    }
  return problems;
}

/** The current revision's record, for display and tooling. */
export function currentRevision(m: Module, s: Strategy, reg: ExplanationRegistry = state.registry): { record: ExplanationRecord; revision: ExplanationRevision } | null {
  const record = reg.entries.find((e) => e.id === explanationId(m.competency, s.id));
  const revision = record?.revisions.find((r) => r.contentHash === contentHash(m.competency, s));
  return record && revision ? { record, revision } : null;
}
