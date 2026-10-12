/**
 * Item-bank checks (E2): content linting, coverage gates, difficulty-progression checks and the
 * retention-runway sweep. Pure functions over a loaded Context; main.ts runs them and report.ts renders them.
 *
 * Difficulty labels are expert estimates. These checks make sure the estimates are internally
 * consistent (each item sits on its step of an explicit, candidate difficulty ladder, variants agree, the range is
 * covered without large gaps). They cannot show the estimates are empirically right.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT } from "../load.ts";
import {
  type CapabilityId,
  type CodeItem,
  type Context,
  type Framework,
  type Item,
  LOW_GUESSING,
  familyOf,
  formatKind,
  guessingFloor,
  itemParams,
  normaliseAnswer,
  pCorrect,
  targetsOf,
} from "../../../packages/english-core/src/index.ts";

export type Code = Extract<Item, { kind: "code" }>;

/** Thresholds, stated once. Changing any of them is a decision to report, not a tweak. */
export const GATES = {
  minItems: 12,
  minFamilies: 4,
  /** The highest item must reach at least this band. */
  minTop: 7.5,
  maxGap: 0.75,
  minFormats: 2,
  minLowGuessing: 1,
  /** An item may sit at most this far from the band of its ladder step. */
  maxStepDistance: 0.75,
  /** A ladder step may sit at most this far from the band descriptor it belongs to. */
  maxDescriptorDistance: 1,
  /** Variants of one family must lie within this range of each other. */
  maxFamilySpread: 0.5,
} as const;

/** The retention-runway sweep (E2-5). Assumptions stated here, reported with the results. */
export const RUNWAY = {
  levels: [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5],
  /** Items a learner uses on one capability in "typical" assessment and learning before checks begin (the frozen simulation uses about 7 per capability in its first three weeks). */
  typicalUse: 6,
  /** Learning and assessment pick items near this predicted success. */
  useTarget: 0.7,
  /** Retention checks aim for this, as in selection.ts. */
  checkTarget: 0.65,
  /** An item counts as suitable for a retention check only if its predicted success at the retained level is in this window. */
  checkWindow: [0.35, 0.9] as [number, number],
  checksWanted: 4,
};

export const CANDIDATE_REVIEW = new Set(["candidate-unvalidated", "draft-unreviewed"]);

export interface Problem {
  item?: string;
  capability?: string;
  message: string;
}

/**
 * A capability's difficulty ladder: the features that make its items harder, in order, each at a band
 * and under one of the capability's band descriptors. Candidate content for review (D-4). Items name
 * their step; the checks hold items to their step, so progression is explicit and reviewable.
 */
export interface Step {
  id: string;
  band: number;
  descriptor: string;
  feature: string;
}
export interface Progressions {
  review: string;
  note: string;
  capabilities: Record<CapabilityId, { steps: Step[] }>;
}

export const PROGRESSIONS_FILE = join(CONTENT, "items", "progressions.json");
export const loadProgressions = (): Progressions => JSON.parse(readFileSync(PROGRESSIONS_FILE, "utf8"));

/** Problems with the ladders themselves. */
export function lintLadders(ctx: Context, prog: Progressions): Problem[] {
  const out: Problem[] = [];
  if (!CANDIDATE_REVIEW.has(prog.review)) out.push({ message: "progressions.json must be marked as candidate content" });
  for (const [cap, { steps }] of Object.entries(prog.capabilities)) {
    const c = ctx.index.leaves.get(cap);
    const bad = (message: string) => out.push({ capability: cap, message });
    if (!c?.bands) {
      bad("ladder for a capability that is not specified");
      continue;
    }
    const ids = new Set<string>();
    steps.forEach((s, k) => {
      if (ids.has(s.id)) bad(`step ${s.id} appears twice`);
      ids.add(s.id);
      if (k > 0 && s.band <= steps[k - 1].band) bad(`step ${s.id} (band ${s.band}) is not harder than the step before it`);
      if (!c.bands![s.descriptor]) bad(`step ${s.id} names descriptor ${s.descriptor}, which ${cap} does not have`);
      else if (Math.abs(s.band - Number(s.descriptor)) > GATES.maxDescriptorDistance) bad(`step ${s.id} (band ${s.band}) is more than ${GATES.maxDescriptorDistance} band from its descriptor ${s.descriptor}`);
      if (!s.feature || s.feature.length < 15) bad(`step ${s.id} needs a feature description`);
    });
    for (const d of Object.keys(c.bands)) if (!steps.some((s) => s.descriptor === d)) bad(`no step sits under band descriptor ${d}`);
  }
  return out;
}

const codeItems = (ctx: Context): Code[] => [...ctx.content.items.values()].filter((i): i is Code => i.kind === "code");

/** Item-level problems. Any of these fails CI. */
export function lint(ctx: Context, prog: Progressions): Problem[] {
  const out: Problem[] = lintLadders(ctx, prog);
  const bad = (item: string, message: string) => out.push({ item, message });
  const items = codeItems(ctx);
  for (const i of items) {
    if (!CANDIDATE_REVIEW.has(i.review ?? "")) bad(i.id, `review status must mark it as candidate content (is "${i.review ?? "missing"}")`);
    if (i.difficulty_source !== "expert_estimate") bad(i.id, `difficulty_source must be "expert_estimate" (difficulty is not calibrated)`);
    const step = prog.capabilities[i.target]?.steps.find((s) => s.id === i.step);
    if (!step) bad(i.id, `step must name a step of ${i.target}'s difficulty ladder (is "${i.step ?? "missing"}")`);
    else if (Math.abs(i.b - step.band) > GATES.maxStepDistance) bad(i.id, `difficulty ${i.b} is more than ${GATES.maxStepDistance} band from its step ${step.id} (band ${step.band})`);
    if (!i.rationale || i.rationale.trim().length < 20) bad(i.id, "needs a rationale saying what makes it this difficult");
    if (!(i.a >= 0.5 && i.a <= 2)) bad(i.id, `discrimination ${i.a} is outside 0.5–2`);
    if (i.passage) {
      const p = ctx.content.passages.get(i.passage)!;
      if (Math.abs(i.b - p.band) > 2) bad(i.id, `difficulty ${i.b} is more than 2 bands from its passage's band ${p.band}`);
    }
    if (formatKind(i.format) === "typed" && (i.answers ?? []).some((a) => normaliseAnswer(a) === "")) bad(i.id, "has an empty accepted answer");
  }
  // redundancy: the same question twice
  const seen = new Map<string, string>();
  for (const i of items) {
    const key = [i.target, i.passage ?? "", normaliseAnswer(i.prompt), (i.options ?? []).map(normaliseAnswer).join("|"), (i.left ?? []).join("|")].join("§");
    if (seen.has(key)) bad(i.id, `duplicates ${seen.get(key)}`);
    else seen.set(key, i.id);
  }
  // families: variants test the same thing at about the same difficulty
  for (const [fam, members] of families(ctx)) {
    if (members.length < 2) continue;
    const first = members[0];
    for (const m of members) {
      if (m.target !== first.target) bad(m.id, `family ${fam} mixes capabilities (${m.target}, ${first.target})`);
      if (formatKind(m.format) !== formatKind(first.format)) bad(m.id, `family ${fam} mixes formats (${m.format}, ${first.format})`);
      if (m.step !== first.step) bad(m.id, `family ${fam} mixes ladder steps (${m.step}, ${first.step})`);
    }
    const bs = members.map((m) => m.b);
    if (Math.max(...bs) - Math.min(...bs) > GATES.maxFamilySpread) bad(first.id, `family ${fam} spans ${Math.min(...bs)}–${Math.max(...bs)}, more than ${GATES.maxFamilySpread} band`);
  }
  const ids = new Set(items.map((i) => i.id));
  for (const i of items) if (i.family && i.family !== i.id && ids.has(i.family)) bad(i.id, `family id ${i.family} is also an item id`);
  // E3: short written responses sit on the same ladders, with the same candidate marking
  for (const i of shortItems(ctx)) {
    if (!CANDIDATE_REVIEW.has(i.review ?? "")) bad(i.id, `review status must mark it as candidate content (is "${i.review ?? "missing"}")`);
    if (i.difficulty_source !== "expert_estimate") bad(i.id, `difficulty_source must be "expert_estimate" (difficulty is not calibrated)`);
    const step = prog.capabilities[i.target]?.steps.find((s) => s.id === i.step);
    if (!step) bad(i.id, `step must name a step of ${i.target}'s difficulty ladder (is "${i.step ?? "missing"}")`);
    else if (Math.abs(i.b - step.band) > GATES.maxStepDistance) bad(i.id, `difficulty ${i.b} is more than ${GATES.maxStepDistance} band from its step ${step.id} (band ${step.band})`);
    if (!i.rationale || i.rationale.trim().length < 20) bad(i.id, "needs a rationale saying what makes it this difficult");
    if (i.passage) {
      const p = ctx.content.passages.get(i.passage)!;
      if (Math.abs(i.b - p.band) > 2) bad(i.id, `difficulty ${i.b} is more than 2 bands from its passage's band ${p.band}`);
    }
  }
  return out;
}

export type Short = Extract<Item, { kind: "short" }>;
export const shortItems = (ctx: Context): Short[] => [...ctx.content.items.values()].filter((i): i is Short => i.kind === "short");

export function families(ctx: Context): Map<string, Code[]> {
  const out = new Map<string, Code[]>();
  for (const i of codeItems(ctx)) out.set(familyOf(i), [...(out.get(familyOf(i)) ?? []), i]);
  return out;
}

export interface Gate {
  id: string;
  label: string;
  pass: boolean;
  value: string;
}

export interface Coverage {
  capability: CapabilityId;
  name: string;
  tier: string;
  /** Capabilities mainly evidenced by extended writing: code items are proxies. */
  writingPrimary: boolean;
  items: number;
  families: number;
  familiesWithVariants: number;
  formats: string[];
  lowGuessing: number;
  difficulties: number[];
  maxGap: number;
  /** Items per ladder step, easiest step first. */
  steps: { id: string; band: number; descriptor: string; feature: string; items: number }[];
  gates: Gate[];
  runway: { level: number; checks: number; byVariant: number }[];
  /** For information only (an E4 option, not the engine's behaviour): the same sweep if assessment and learning used one item per family, keeping variants for retention. */
  runwayIfVariantsReserved: { level: number; checks: number; byVariant: number }[];
}

export function coverage(ctx: Context, cap: CapabilityId, prog: Progressions): Coverage {
  const c = ctx.index.leaves.get(cap)!;
  const its = codeItems(ctx).filter((i) => i.target === cap);
  const fams = new Map<string, Code[]>();
  for (const i of its) fams.set(familyOf(i), [...(fams.get(familyOf(i)) ?? []), i]);
  const bs = [...new Set(its.map((i) => i.b))].sort((a, b) => a - b);
  const gaps = bs.slice(1).map((b, k) => b - bs[k]);
  const maxGap = gaps.length ? Math.max(...gaps) : Infinity;
  const formats = [...new Set(its.map((i) => i.format))].sort();
  const lowGuessing = its.filter((i) => guessingFloor(i) <= LOW_GUESSING).length;
  const bandKeys = Object.keys(c.bands ?? {}).sort((a, b) => Number(a) - Number(b));
  const steps = (prog.capabilities[cap]?.steps ?? []).map((s) => ({ ...s, items: its.filter((i) => i.step === s.id).length }));
  const lowest = bandKeys.length ? Number(bandKeys[0]) : 2;
  const runway = runwaySweep(its);
  const gates: Gate[] = [
    { id: "G1", label: `at least ${GATES.minItems} items`, pass: its.length >= GATES.minItems, value: String(its.length) },
    { id: "G2", label: `at least ${GATES.minFamilies} families`, pass: fams.size >= GATES.minFamilies, value: String(fams.size) },
    { id: "G3", label: `easiest item at or below band ${lowest}`, pass: bs.length > 0 && bs[0] <= lowest, value: bs.length ? String(bs[0]) : "—" },
    { id: "G4", label: `hardest item at band ${GATES.minTop} or above`, pass: bs.length > 0 && bs.at(-1)! >= GATES.minTop, value: bs.length ? String(bs.at(-1)) : "—" },
    { id: "G5", label: `no gap wider than ${GATES.maxGap} band`, pass: maxGap <= GATES.maxGap, value: Number.isFinite(maxGap) ? maxGap.toFixed(2) : "—" },
    { id: "G6", label: `at least ${GATES.minFormats} formats, one with guessing floor ≤ ${LOW_GUESSING}`, pass: formats.length >= GATES.minFormats && lowGuessing >= GATES.minLowGuessing, value: `${formats.length} formats, ${lowGuessing} low-guessing` },
    { id: "G7", label: "every step of the difficulty ladder has an item", pass: steps.length > 0 && steps.every((s) => s.items > 0), value: steps.length ? steps.map((s) => `${s.id}:${s.items}`).join(" ") : "no ladder" },
    {
      id: "G8",
      label: `retention runway: ${RUNWAY.checksWanted} checks on unseen items at every level ${RUNWAY.levels[0]}–${RUNWAY.levels.at(-1)}`,
      pass: runway.every((r) => r.checks >= RUNWAY.checksWanted),
      value: `minimum ${Math.min(...runway.map((r) => r.checks))}`,
    },
  ];
  return {
    capability: cap,
    name: c.name,
    tier: c.tier,
    writingPrimary: (c.observable_through ?? [])[0] === "writing",
    items: its.length,
    families: fams.size,
    familiesWithVariants: [...fams.values()].filter((f) => f.length > 1).length,
    formats,
    lowGuessing,
    difficulties: its.map((i) => i.b).sort((a, b) => a - b),
    maxGap,
    steps,
    gates,
    runway,
    runwayIfVariantsReserved: runwaySweep(its, true),
  };
}

/**
 * For a learner at each level: use `typicalUse` items as assessment and learning would (those predicted
 * nearest `useTarget`), then take retention checks at the same level on unseen items (fresh, or unseen
 * variants of seen families), each the suitable item nearest `checkTarget`. Counts checks served before
 * none is left; after that, the engine falls back to a flagged repeat (at least 14 days later).
 * The sweep models the engine as it is: assessment and learning do not hold variants back for retention.
 */
export function runwaySweep(its: CodeItem[], reserveVariants = false): { level: number; checks: number; byVariant: number }[] {
  const p = (i: CodeItem, theta: number) => pCorrect(theta, itemParams(i));
  return RUNWAY.levels.map((level) => {
    const used = new Set<string>();
    const usedFamilies = new Set<string>();
    const take = (i: CodeItem) => {
      used.add(i.id);
      usedFamilies.add(familyOf(i));
    };
    const byNearness = (target: number) => (a: CodeItem, b: CodeItem) => Math.abs(p(a, level) - target) - Math.abs(p(b, level) - target) || a.id.localeCompare(b.id);
    for (const i of [...its].sort(byNearness(RUNWAY.useTarget))) {
      if (used.size >= RUNWAY.typicalUse) break;
      if (reserveVariants && usedFamilies.has(familyOf(i))) continue;
      take(i);
    }
    let checks = 0;
    let byVariant = 0;
    while (checks < RUNWAY.checksWanted) {
      const pick = its
        .filter((i) => !used.has(i.id) && p(i, level) >= RUNWAY.checkWindow[0] && p(i, level) <= RUNWAY.checkWindow[1])
        .sort(byNearness(RUNWAY.checkTarget))[0];
      if (!pick) break;
      if (usedFamilies.has(familyOf(pick))) byVariant++;
      take(pick);
      checks++;
    }
    return { level, checks, byVariant };
  });
}

export interface PassageStats {
  id: string;
  title: string;
  band: number;
  words: number;
  wordsPerSentence: number;
  longWordShare: number;
}

export function passageStats(ctx: Context): PassageStats[] {
  return [...ctx.content.passages.values()]
    .map((p) => {
      const words = p.text.match(/[A-Za-z’']+/g) ?? [];
      const sentences = Math.max(1, (p.text.match(/[.!?]+(\s|$)/g) ?? []).length);
      return {
        id: p.id,
        title: p.title,
        band: p.band,
        words: words.length,
        wordsPerSentence: words.length / sentences,
        longWordShare: words.filter((w) => w.replace(/['’]/g, "").length >= 7).length / Math.max(1, words.length),
      };
    })
    .sort((a, b) => a.band - b.band || a.id.localeCompare(b.id));
}

/** Words a reviewer should look at in content for 10–15-year-olds. A prompt for review, not a filter. */
const SCREEN = /\b(kill(ed|ing)?|blood|dead|die[ds]?|drunk|alcohol|beer|wine|cigarette|smok(e|ing)|gun|knife|stab|suicide|sex|naked|drug|gambl\w*|bet(ting)?)\b/i;

export function ageScreen(ctx: Context): Problem[] {
  const out: Problem[] = [];
  for (const i of codeItems(ctx)) {
    const text = [i.prompt, ...(i.options ?? []), ...(i.left ?? [])].join(" ");
    const m = text.match(SCREEN);
    if (m) out.push({ item: i.id, message: `contains "${m[0]}": check it is suitable for ages 10–15` });
  }
  for (const p of ctx.content.passages.values()) {
    const m = p.text.match(SCREEN);
    if (m) out.push({ item: p.id, message: `passage contains "${m[0]}": check it is suitable for ages 10–15` });
  }
  return out;
}

export function specifiedCapabilities(fw: Framework): CapabilityId[] {
  return fw.strands.flatMap((s) => s.substrands.flatMap((ss) => ss.capabilities.filter((c) => c.bands).map((c) => c.id)));
}

export function itemsFor(ctx: Context, cap: CapabilityId): Code[] {
  return codeItems(ctx)
    .filter((i) => targetsOf(i).includes(cap))
    .sort((a, b) => a.b - b.b || a.id.localeCompare(b.id));
}
