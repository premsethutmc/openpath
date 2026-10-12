/**
 * Content: items, reading passages, writing tasks with rubrics and anchors,
 * goals, and the small word lists used for code-checkable signals.
 */
import type { FrameworkIndex } from "./framework.ts";
import { misconceptionIds } from "./framework.ts";
import type { ItemParams } from "./model.ts";
import type { CapabilityId, CodeItem, Goal, Item, Passage, Response, WritingTask } from "./types.ts";

export interface ContentBundle {
  items: Item[];
  passages: Passage[];
  goals: Goal[];
  /** Common misspellings (lower case) → correct spelling. */
  misspellings: Record<string, string>;
}

export interface ContentIndex {
  items: Map<string, Item>;
  passages: Map<string, Passage>;
  goals: Map<string, Goal>;
  misspellings: Map<string, string>;
  byCapability: Map<CapabilityId, Item[]>;
}

export function targetsOf(item: Item): CapabilityId[] {
  return item.kind === "code" ? [item.target] : item.targets;
}

/** The family an item belongs to: variants of one another share it. */
export const familyOf = (item: Item): string => item.family ?? item.id;

export function contextOf(item: Item): string {
  return item.kind === "code" ? item.format : `${item.format}`;
}

export function itemParams(item: CodeItem): ItemParams {
  const c = item.format.startsWith("choice:") ? 1 / (item.options?.length ?? 4) : 0;
  return { a: item.a, b: item.b, c };
}

export const normaliseAnswer = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^[\s"']+|[\s.!?"']+$/g, "");

export function scoreCode(item: CodeItem, response: Response): { correct: boolean; misconceptions: string[] } {
  if (item.format.startsWith("choice:")) {
    if (response.kind !== "choice") throw new Error(`item ${item.id} expects a choice`);
    const correct = response.choice === item.answer;
    const tag = correct ? undefined : item.distractor_tags?.[String(response.choice)];
    return { correct, misconceptions: tag ? [tag] : [] };
  }
  if (response.kind !== "typed") throw new Error(`item ${item.id} expects a typed answer`);
  const given = normaliseAnswer(response.text);
  const correct = (item.answers ?? []).some((a) => normaliseAnswer(a) === given);
  const tag = correct ? undefined : item.wrong?.[given];
  return { correct, misconceptions: tag ? [tag] : [] };
}

export function validateContent(bundle: ContentBundle, index: FrameworkIndex): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const passages = new Set(bundle.passages.map((p) => p.id));
  for (const item of bundle.items) {
    if (ids.has(item.id)) problems.push(`duplicate item id ${item.id}`);
    ids.add(item.id);
    for (const t of targetsOf(item)) if (!index.leaves.has(t)) problems.push(`item ${item.id} targets unknown capability ${t}`);
    if (item.kind === "code") {
      if (!(item.b >= 1 && item.b <= 8)) problems.push(`item ${item.id} difficulty outside 1–8`);
      if (!(item.a > 0)) problems.push(`item ${item.id} needs a positive discrimination`);
      if (item.passage && !passages.has(item.passage)) problems.push(`item ${item.id} uses unknown passage ${item.passage}`);
      const allowed = misconceptionIds(index, item.target);
      for (const tag of [...Object.values(item.distractor_tags ?? {}), ...Object.values(item.wrong ?? {}), ...(item.addresses ?? [])])
        if (!allowed.has(tag)) problems.push(`item ${item.id} uses misconception ${tag}, which ${item.target} does not list`);
      if (item.format.startsWith("choice:")) {
        if (!item.options || item.options.length < 2) problems.push(`choice item ${item.id} needs options`);
        if (item.answer === undefined || item.answer < 0 || item.answer >= (item.options?.length ?? 0)) problems.push(`choice item ${item.id} has no valid answer`);
      } else if (item.format.startsWith("typed:")) {
        if (!item.answers?.length) problems.push(`typed item ${item.id} needs accepted answers`);
      } else problems.push(`item ${item.id} has unknown format ${item.format}`);
    } else {
      const w = item as WritingTask;
      if (!w.targets.length) problems.push(`writing task ${w.id} has no targets`);
      for (const t of w.secondary) if (!index.leaves.has(t)) problems.push(`writing task ${w.id} lists unknown secondary capability ${t}`);
      for (const t of w.targets) if (!w.rubric[t]?.length) problems.push(`writing task ${w.id} has no rubric criteria for ${t}`);
      if (w.anchors.length < 3) problems.push(`writing task ${w.id} needs at least 3 anchor responses`);
      for (const a of w.anchors)
        for (const [cap, band] of Object.entries(a.scores)) {
          if (![...w.targets, ...w.secondary].includes(cap)) problems.push(`anchor ${a.id} scores ${cap}, which task ${w.id} does not target`);
          if (!(band >= 1 && band <= 8)) problems.push(`anchor ${a.id} has a score outside 1–8`);
        }
    }
  }
  for (const g of bundle.goals)
    for (const key of Object.keys(g.weights))
      if (!index.leaves.has(key) && !index.children.has(key)) problems.push(`goal ${g.id} weights unknown node ${key}`);
  return problems;
}

export function indexContent(bundle: ContentBundle, index: FrameworkIndex): ContentIndex {
  const problems = validateContent(bundle, index);
  if (problems.length) throw new Error(`Invalid content:\n- ${problems.join("\n- ")}`);
  const byCapability = new Map<string, Item[]>();
  for (const item of bundle.items) for (const t of targetsOf(item)) byCapability.set(t, [...(byCapability.get(t) ?? []), item]);
  return {
    items: new Map(bundle.items.map((i) => [i.id, i])),
    passages: new Map(bundle.passages.map((p) => [p.id, p])),
    goals: new Map(bundle.goals.map((g) => [g.id, g])),
    misspellings: new Map(Object.entries(bundle.misspellings)),
    byCapability,
  };
}

/** Per-leaf weights for a goal: the most specific id given wins (capability over sub-strand over strand). */
export function goalWeights(goal: Goal, index: FrameworkIndex): Map<CapabilityId, number> {
  const out = new Map<string, number>();
  for (const id of index.leafIds) {
    let node: string | undefined = id;
    while (node) {
      if (goal.weights[node] !== undefined) {
        out.set(id, goal.weights[node]);
        break;
      }
      node = index.parent.get(node);
    }
  }
  return out;
}

export const wordCount = (text: string): number => (text.match(/[A-Za-z’']+/g) ?? []).length;
