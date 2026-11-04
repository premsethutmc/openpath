/**
 * Which bank questions may be used for what, for one learner (assessment evidence and retention v1).
 *
 * Every question for a competency gets explicit role eligibility, from metadata the bank already has (content
 * status, difficulty b, family, passage) and the competency's provisional grade target:
 *
 *   diagnostic                 reviewed or candidate, code-scored: may be asked to test a suspected gap
 *   teaching                   any question may be shown while teaching (it is then used up for this learner)
 *   guided_practice            below the target band, or not fit to be evidence (provisional, unchecked
 *                              generated, or its answer appears in the teaching text)
 *   independent_verification   from the target band to 1.5 bands above it, reviewed or candidate, not leaked by
 *                              teaching (harder questions say little about the target and are kept for higher ones)
 *   delayed_retention          the same as independent verification
 *
 * Then, from this learner's record:
 *   used          answered, shown, or set aside by an earlier diagnostic, journey or check: never used again
 *   compromised   a variant (same family) or a question on the same reading passage as one met during teaching
 *                 or with help: may still be practised, never independent evidence
 *   reserved      unseen, uncompromised questions from the target band up, kept back: first for the delayed
 *                 retention check, then for independent verification. Diagnostics and practice never take them.
 *
 * Nothing is recycled: when there are not enough questions for a role, the shortfall is reported.
 * Deterministic: the same content and events give the same allocation (ties broken by item id).
 */
import { binaryParams, contentStatus, familyOf, type ContentStatus } from "../content.ts";
import { pCorrect } from "../model.ts";
import type { CapabilityId, CodeItem, LedgerEvent } from "../types.ts";
import { essayRecords } from "./analysis.ts";
import type { EssayContext, ItemPool } from "./competencies.ts";

export type ItemRole = "diagnostic" | "teaching" | "guided_practice" | "independent_verification" | "delayed_retention";
export const ITEM_ROLES: ItemRole[] = ["diagnostic", "teaching", "guided_practice", "independent_verification", "delayed_retention"];

export type BankItem = { kind: "code" } & CodeItem;

export interface ItemEligibility {
  item: string;
  version: number;
  b: number;
  status: ContentStatus;
  family: string;
  roles: ItemRole[];
  /** Why it is limited to these roles (empty when every role applies). */
  why: string;
  /** The words in the teaching text that give its answer away, if found. */
  leak?: string;
}

export interface Allocation {
  capability: CapabilityId;
  target: number | null;
  eligibility: ItemEligibility[];
  used: string[];
  compromised: { item: string; why: string }[];
  /** Unseen, uncompromised questions kept back, in the order they will be used. */
  reserved: { delayed_retention: string[]; independent_verification: string[] };
  /** What can be taken now for each role (reserved questions only for their own role). */
  available: Record<ItemRole, string[]>;
  /** Plain-language limitations: what the bank cannot supply for this learner. */
  shortfall: string[];
}

/** Questions up to this many bands above the target can check it; harder ones say little about the target. */
export const ABOVE_TARGET = 1.5;

const STATUS_RANK: Record<ContentStatus, number> = { validated: 0, candidate: 1, provisional: 2, practice: 9 };
const fitForEvidence = (s: ContentStatus) => s === "validated" || s === "candidate";

const words = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);

/** The correct answer as words, for the formats where one answer is shown in place. */
function answerWords(item: BankItem): string[] | null {
  const kind = item.format.split(":")[0];
  if (kind === "choice" && item.options && item.answer !== undefined) return words(item.options[item.answer]);
  if (kind === "typed" && item.answers?.length) return words(item.answers[0]);
  return null;
}

/**
 * Answer leakage from teaching text: the question's sentence with its answer filled in shares a run of three
 * words that includes the answer, or a run of four words, with what the lesson shows. Heuristic and
 * conservative: it finds lesson examples that contain the question's own answer, not every related example.
 */
export function teachingLeak(item: BankItem, teaching: string[]): string | null {
  if (!teaching.length) return null;
  const ans = answerWords(item);
  const filled = ans ? (item.prompt.includes("___") ? item.prompt.replace(/_{3,}/, ans.join(" ")) : `${item.prompt} ${ans.join(" ")}`) : item.prompt;
  const w = words(filled);
  const blank = item.prompt.includes("___") && ans ? words(item.prompt.split(/_{3,}/)[0]).length : -1;
  const lesson = ` ${teaching.map((t) => words(t).join(" ")).join(" | ")} `;
  for (const n of [4, 3]) {
    for (let i = 0; i + n <= w.length; i++) {
      // a run of three must contain the filled-in answer; a run of four may be anywhere in the sentence
      if (n === 3 && !(blank >= 0 && i <= blank + (ans!.length - 1) && blank < i + n)) continue;
      const gram = w.slice(i, i + n).join(" ");
      if (lesson.includes(` ${gram} `)) return gram;
    }
  }
  return null;
}

/** The role each pilot pool allows (pilot-content@2): one use only. */
export const POOL_ROLE: Record<ItemPool, ItemRole> = { diagnosis: "diagnostic", practice: "guided_practice", confirmation: "independent_verification", retention: "delayed_retention" };

/** Role eligibility of every live code-scored question for a competency (no learner data). */
export function itemEligibility(ectx: EssayContext, capability: CapabilityId): ItemEligibility[] {
  return baseEligibility(ectx, capability).map((e) => {
    const pool = ectx.pools?.get(e.item);
    if (!pool) return e;
    // existing metadata wins: a question reserved for one use is never taken for another. Practice questions may be
    // practised at any difficulty; the other pools keep the evidence rules above (fit, target band, leakage).
    const role = POOL_ROLE[pool];
    const roles = role === "guided_practice" || e.roles.includes(role) ? [role] : [];
    return { ...e, roles, why: `pilot pool "${pool}" (reserved for one use)${roles.length ? "" : `; not usable here: ${e.why}`}` };
  });
}

function baseEligibility(ectx: EssayContext, capability: CapabilityId): ItemEligibility[] {
  const target = ectx.profile.byCapability.get(capability)?.expectedBand ?? null;
  const teaching = ectx.teachingText?.get(capability) ?? [];
  return (ectx.ctx.content.byCapability.get(capability) ?? [])
    .filter((i): i is BankItem => i.kind === "code")
    .map((i) => {
      const status = contentStatus(i);
      const leak = teachingLeak(i, teaching);
      const base = { item: i.id, version: i.version, b: i.b, status, family: familyOf(i), ...(leak ? { leak } : {}) };
      if (!fitForEvidence(status))
        return { ...base, roles: ["teaching", "guided_practice"] as ItemRole[], why: status === "practice" ? "a generated question not yet checked by a person: practice only" : "provisional content: its answers never change an estimate, so practice only" };
      if (leak) return { ...base, roles: ["teaching", "guided_practice"] as ItemRole[], why: `its answer appears in the teaching text ("${leak}"): practice only` };
      if (target === null) return { ...base, roles: ["diagnostic", "teaching", "guided_practice"] as ItemRole[], why: "no grade target: not used to verify a target" };
      if (i.b > target + ABOVE_TARGET) return { ...base, roles: ["teaching"] as ItemRole[], why: `more than ${ABOVE_TARGET} bands above the target: too hard to check the target fairly, kept for higher targets` };
      if (i.b >= target) return { ...base, roles: ["diagnostic", "teaching", "independent_verification", "delayed_retention"] as ItemRole[], why: "at or above the target band: kept for independent evidence, never for practice" };
      return { ...base, roles: ["diagnostic", "teaching", "guided_practice"] as ItemRole[], why: "below the target band: cannot show the target, so diagnostic or practice" };
    })
    .sort((a, b) => a.b - b.b || a.item.localeCompare(b.item));
}

/** Items the learner has met in any way, and items set aside by an earlier plan. */
export function usedItems(events: readonly LedgerEvent[]): Set<string> {
  const used = new Set<string>();
  for (const e of events) if (e.kind === "evidence" || e.kind === "presented" || e.kind === "assisted_response") used.add(e.item.id);
  for (const e of events) if (e.kind === "intervention") for (const i of e.items ?? []) used.add(i);
  for (const { record } of essayRecords(events, "diagnostic")) for (const i of record.request.items) used.add(i.id);
  for (const { record } of essayRecords(events, "journey"))
    for (const t of record.journey.trees) for (const n of t.nodes) for (const s of n.steps) if (s.kind !== "teach") for (const ref of s.content.refs) used.add(ref);
  for (const { record } of essayRecords(events, "check")) for (const i of [...record.check.items.map((x) => x.id), ...(record.check.review?.practice ?? [])]) used.add(i);
  return used;
}

/** Items met during teaching or with help (shown in a lesson, presented for teaching or practice, or answered with help). */
export function assistedItems(events: readonly LedgerEvent[]): Set<string> {
  const out = new Set<string>();
  for (const e of events) {
    if (e.kind === "assisted_response") out.add(e.item.id);
    else if (e.kind === "presented" && (e.purpose === "teaching" || e.purpose === "practice")) out.add(e.item.id);
    else if (e.kind === "intervention") for (const i of e.items ?? []) out.add(i);
  }
  // practice steps of a journey count once planned: their questions are for practice, whether answered yet or not
  for (const { record } of essayRecords(events, "journey"))
    for (const t of record.journey.trees) for (const n of t.nodes) for (const s of n.steps) if (s.kind === "guided_practice") for (const ref of s.content.refs) out.add(ref);
  return out;
}

/**
 * The allocation for one learner now. `exclude` removes questions already chosen in the same planning pass.
 * `level` (the learner's current estimate) orders practice by predicted success; without it, by difficulty.
 */
export function allocateItems(ectx: EssayContext, events: readonly LedgerEvent[], capability: CapabilityId, opts: { exclude?: Set<string>; level?: number } = {}): Allocation {
  const target = ectx.profile.byCapability.get(capability)?.expectedBand ?? null;
  const eligibility = itemEligibility(ectx, capability);
  const byId = new Map(eligibility.map((e) => [e.item, e]));
  const items = ectx.ctx.content.items;
  const used = usedItems(events);
  for (const x of opts.exclude ?? []) used.add(x);
  const seenFamilies = new Set<string>();
  for (const id of used) {
    const it = items.get(id);
    if (it) seenFamilies.add(familyOf(it));
  }
  const helped = assistedItems(events);
  const helpedFamilies = new Set<string>();
  const helpedPassages = new Set<string>();
  for (const id of helped) {
    const it = items.get(id);
    if (!it) continue;
    helpedFamilies.add(familyOf(it));
    if (it.kind === "code" && it.passage) helpedPassages.add(it.passage);
  }
  const compromised: Allocation["compromised"] = [];
  const unusedEligible: ItemEligibility[] = [];
  for (const e of eligibility) {
    if (used.has(e.item)) continue;
    const it = items.get(e.item) as BankItem;
    const why = helpedFamilies.has(e.family) ? "a variant of a question met during teaching or with help" : it.passage && helpedPassages.has(it.passage) ? "on the same reading passage as a question met during teaching or with help" : seenFamilies.has(e.family) ? "a variant of a question already used" : null;
    if (why) {
      compromised.push({ item: e.item, why });
      continue;
    }
    unusedEligible.push(e);
  }
  // one question per family in each pool, so two variants never both count
  const onePerFamily = (xs: ItemEligibility[]) => {
    const fam = new Set<string>();
    return xs.filter((x) => (fam.has(x.family) ? false : (fam.add(x.family), true)));
  };
  const statusThen = (score: (x: ItemEligibility) => number) => (a: ItemEligibility, b: ItemEligibility) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || score(a) - score(b) || a.item.localeCompare(b.item);
  const has = (r: ItemRole) => (x: ItemEligibility) => x.roles.includes(r);

  // Reserves, from the unseen questions eligible for independent verification, closest to the target first:
  //   1. the delayed retention check (the closest ones: they stay the same until they are used)
  //   2. independent verification: the journey's check and each later check (checkItems × (1 + followUpChecks))
  //   3. any question left over within a band of the target may be one diagnostic question at the target
  const near = (xs: ItemEligibility[]) => onePerFamily([...xs].sort(statusThen((x) => Math.abs(x.b - target!))));
  const retention = target === null ? [] : near(unusedEligible.filter(has("delayed_retention"))).slice(0, ectx.policy.retentionItems);
  const retentionSet = new Set(retention.map((x) => x.item));
  const retentionFamilies = new Set(retention.map((x) => x.family));
  const independentLeft = target === null ? [] : near(unusedEligible.filter((x) => has("independent_verification")(x) && !retentionSet.has(x.item) && !retentionFamilies.has(x.family)));
  const needed = ectx.policy.checkItems * (1 + ectx.policy.followUpChecks);
  const spare = independentLeft.slice(needed).filter((x) => x.b <= target! + 1);
  const diagnosticAtTarget = spare.slice(0, 1);
  const verification = independentLeft.filter((x) => !diagnosticAtTarget.includes(x));
  const reservedSet = new Set([...retentionSet, ...verification.map((x) => x.item)]);
  const reservedFamilies = new Set([...retention, ...verification].map((x) => x.family));

  // diagnostics: the one question at the target allowed above, then questions below it, closest to the target first
  const below = unusedEligible.filter((x) => has("diagnostic")(x) && !has("independent_verification")(x) && !has("delayed_retention")(x) && !reservedSet.has(x.item) && !reservedFamilies.has(x.family));
  const diagnostic = onePerFamily([...diagnosticAtTarget, ...[...below].sort(statusThen((x) => Math.abs(x.b - (target ?? 5))))]);
  // practice: unseen practice-eligible questions (compromised ones may be practised), pitched at about 70% success
  const practicePool = eligibility.filter((x) => !used.has(x.item) && x.roles.includes("guided_practice") && !reservedFamilies.has(x.family));
  const fit = (x: ItemEligibility) => {
    if (opts.level === undefined) return x.b;
    const it = items.get(x.item) as BankItem;
    const p = binaryParams(it);
    return Math.abs((p ? pCorrect(opts.level, p) : 0.5) - 0.7);
  };
  const practice = onePerFamily([...practicePool].sort((a, b) => fit(a) - fit(b) || a.item.localeCompare(b.item)));
  const teaching = eligibility.filter((x) => !used.has(x.item) && !reservedSet.has(x.item)).map((x) => x.item);

  const shortfall: string[] = [];
  const name = ectx.profile.byCapability.get(capability)?.name ?? capability;
  if (target !== null) {
    if (retention.length < ectx.policy.retentionItems) shortfall.push(`${name}: only ${retention.length} unseen question${retention.length === 1 ? "" : "s"} between band ${target} and ${target + ABOVE_TARGET} left for the delayed retention check (${ectx.policy.retentionItems} needed)`);
    if (verification.length < needed) shortfall.push(`${name}: ${verification.length} unseen question${verification.length === 1 ? "" : "s"} between band ${target} and ${target + ABOVE_TARGET} for independent checks; the journey's check and ${ectx.policy.followUpChecks} later check${ectx.policy.followUpChecks === 1 ? "" : "s"} need ${needed}`);
    if (!diagnosticAtTarget.length && independentLeft.length && !below.some((x) => x.b >= target)) shortfall.push(`${name}: no question at band ${target} or above can be spared for diagnosis (all are kept for checks); diagnostic questions are below the target band, so right answers there cannot rule out a gap at the target`);
    if (verification.length < ectx.policy.checkItems) shortfall.push(`${name}: only ${verification.length} unseen question${verification.length === 1 ? "" : "s"} between band ${target} and ${target + ABOVE_TARGET} left for an independent check (${ectx.policy.checkItems} needed)`);
  }
  if (practice.length < ectx.policy.guidedItems) shortfall.push(`${name}: only ${practice.length} unseen practice question${practice.length === 1 ? "" : "s"} below the target band`);
  return {
    capability,
    target,
    eligibility: eligibility.map((e) => byId.get(e.item)!),
    used: eligibility.filter((e) => used.has(e.item)).map((e) => e.item),
    compromised,
    reserved: { delayed_retention: retention.map((x) => x.item), independent_verification: verification.map((x) => x.item) },
    available: {
      diagnostic: diagnostic.map((x) => x.item),
      teaching,
      guided_practice: practice.map((x) => x.item),
      independent_verification: verification.map((x) => x.item),
      delayed_retention: retention.map((x) => x.item),
    },
    shortfall,
  };
}

/** The first `n` questions available for a role, as bank items. */
export function pickForRole(ectx: EssayContext, events: readonly LedgerEvent[], capability: CapabilityId, role: ItemRole, n: number, opts: { exclude?: Set<string>; level?: number } = {}): BankItem[] {
  return allocateItems(ectx, events, capability, opts)
    .available[role].slice(0, n)
    .map((id) => ectx.ctx.content.items.get(id) as BankItem);
}
