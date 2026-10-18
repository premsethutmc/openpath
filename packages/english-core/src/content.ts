/**
 * Content: items, reading passages, writing tasks with rubrics and anchors,
 * goals, and the small word lists used for code-checkable signals.
 */
import type { FrameworkIndex } from "./framework.ts";
import { misconceptionIds } from "./framework.ts";
import type { ItemParams } from "./model.ts";
import type { AnchorReview, CapabilityId, CodeItem, Goal, Guard, Item, Passage, Response, ShortItem, WritingTask } from "./types.ts";

export interface ContentBundle {
  items: Item[];
  passages: Passage[];
  goals: Goal[];
  /** Common misspellings (lower case) → correct spelling. */
  misspellings: Record<string, string>;
  /**
   * Earlier versions of code-scored items that have since been revised. They are never selected; they
   * exist so that evidence recorded against an earlier version is still scored exactly as it was
   * answered (a choice index means the option the learner saw).
   */
  retired?: Item[];
}

export interface ContentIndex {
  items: Map<string, Item>;
  passages: Map<string, Passage>;
  goals: Map<string, Goal>;
  misspellings: Map<string, string>;
  byCapability: Map<CapabilityId, Item[]>;
  /** Retired item versions, keyed `id@version` (see ContentBundle.retired). */
  retired?: Map<string, Item>;
}

export const versionKey = (id: string, version: number) => `${id}@${version}`;

/** The item exactly as a learner saw it: the current version, or a retired earlier one. */
export function itemVersion(content: ContentIndex, id: string, version: number): Item | undefined {
  const current = content.items.get(id);
  if (current && current.version === version) return current;
  return content.retired?.get(versionKey(id, version));
}

export function targetsOf(item: Item): CapabilityId[] {
  return item.kind === "writing" ? item.targets : [item.target];
}

/** The family an item belongs to: variants of one another share it. */
export const familyOf = (item: { id: string; family?: string }): string => item.family ?? item.id;

export function contextOf(item: Item): string {
  return item.kind === "code" ? item.format : `${item.format}`;
}

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
/** Ordered selections of k from n: n! / (n − k)!. */
const arrangements = (n: number, k: number): number => factorial(n) / factorial(n - k);
const combinations = (n: number, k: number): number => arrangements(n, k) / factorial(k);

/** The format family: "choice", "typed", "order", "match" or "multi". */
export const formatKind = (format: string): string => format.split(":")[0];

/**
 * Chance of a right answer by blind guessing, used as the item's guessing floor (c). It follows from
 * the format: one of n options 1/n; an order of n options 1/n!; matching k entries to n options
 * 1/(n!/(n−k)!); choosing the right k of n options 1/C(n, k); a typed answer 0.
 */
export function guessingFloor(item: CodeItem): number {
  const n = item.options?.length ?? 4;
  switch (formatKind(item.format)) {
    case "choice":
      return 1 / n;
    case "order":
      return 1 / factorial(n);
    case "match":
      return 1 / arrangements(n, item.left?.length ?? n);
    case "multi":
      return 1 / combinations(n, item.answer_set?.length ?? 1);
    default:
      return 0;
  }
}

/** Formats with a guessing floor at or below this are counted as non-guessable in coverage gates. */
export const LOW_GUESSING = 0.1;

export function itemParams(item: CodeItem): ItemParams {
  return { a: item.a, b: item.b, c: guessingFloor(item) };
}

/**
 * The index with some items added (model-written questions recorded in a learner's own ledger). The added items are
 * validated exactly as bank items are; an id already in the bank is refused. The original index is not changed.
 */
export function extendContent(content: ContentIndex, items: Item[], index: FrameworkIndex): ContentIndex {
  if (!items.length) return content;
  const clash = items.find((i) => content.items.has(i.id));
  if (clash) throw new Error(`Invalid content:\n- added item ${clash.id} has the id of an existing item`);
  const problems = validateContent({ items, passages: [...content.passages.values()], goals: [], misspellings: {} }, index);
  if (problems.length) throw new Error(`Invalid content:\n- ${problems.join("\n- ")}`);
  const byCapability = new Map(content.byCapability);
  for (const item of items) for (const t of targetsOf(item)) byCapability.set(t, [...(byCapability.get(t) ?? []), item]);
  const all = new Map(content.items);
  for (const i of items) all.set(i.id, i);
  return { ...content, items: all, byCapability };
}

/** Response-model parameters for anything scored right or wrong: a code item, or a short written answer (no guessing floor). */
export function binaryParams(item: Item): ItemParams | null {
  if (item.kind === "code") return itemParams(item);
  if (item.kind === "short") return { a: item.a, b: item.b, c: 0 };
  return null;
}

/** The key a wrong answer is looked up by in `wrong`. */
export function responseKey(response: Response): string {
  switch (response.kind) {
    case "choice":
      return String(response.choice);
    case "typed":
      return normaliseAnswer(response.text);
    case "order":
      return response.order.join(",");
    case "match":
      return response.pairs.join(",");
    case "multi":
      return [...response.choices].sort((a, b) => a - b).join(",");
    default:
      return "";
  }
}

export const normaliseAnswer = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^[\s"']+|[\s.!?"']+$/g, "");

const sameList = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function scoreCode(item: CodeItem, response: Response): { correct: boolean; misconceptions: string[] } {
  const kind = formatKind(item.format);
  const expects = kind === "typed" ? "typed" : kind;
  if (response.kind !== expects) throw new Error(`item ${item.id} expects a${expects === "order" ? "n" : ""} ${expects} answer`);
  let correct: boolean;
  switch (response.kind) {
    case "choice":
      correct = response.choice === item.answer;
      if (!correct) {
        const tag = item.distractor_tags?.[String(response.choice)];
        return { correct, misconceptions: tag ? [tag] : [] };
      }
      return { correct, misconceptions: [] };
    case "typed":
      correct = (item.answers ?? []).some((a) => normaliseAnswer(a) === normaliseAnswer(response.text));
      break;
    case "order":
      correct = sameList(response.order, item.answer_order ?? []);
      break;
    case "match":
      correct = sameList(response.pairs, item.answer_pairs ?? []);
      break;
    case "multi":
      correct = sameList([...new Set(response.choices)].sort((a, b) => a - b), [...(item.answer_set ?? [])].sort((a, b) => a - b));
      break;
    default:
      throw new Error(`item ${item.id} cannot score a ${response.kind} response`);
  }
  const tag = correct ? undefined : item.wrong?.[responseKey(response)];
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
      if (item.generated) {
        if (item.difficulty_source !== "feature_estimate") problems.push(`generated item ${item.id} must say its difficulty is a feature_estimate`);
        if (!item.generated.sources?.length) problems.push(`generated item ${item.id} must name its lexical sources`);
        if (!item.generated.word) problems.push(`generated item ${item.id} must name its word`);
      } else if (item.difficulty_source === "feature_estimate") problems.push(`item ${item.id} has a feature_estimate difficulty but no generation record`);
      // H-V3: a validated (educator-approved) version says when it was released; nothing else may claim a release
      if (item.evidence_status === "validated" && !(typeof item.released_at === "string" && Number.isFinite(Date.parse(item.released_at))))
        problems.push(`validated item ${item.id} needs released_at (when this version was approved and released)`);
      if (item.released_at !== undefined && item.evidence_status !== "validated") problems.push(`item ${item.id} has released_at but is not validated`);
      // a model-written question is provisional by construction: it can never change an estimate
      if (item.model_generated) {
        if (item.evidence_status !== "provisional") problems.push(`model-generated item ${item.id} must be provisional`);
        if (item.difficulty_source !== "model_estimate") problems.push(`model-generated item ${item.id} must say its difficulty is a model_estimate`);
        if (item.generated) problems.push(`model-generated item ${item.id} cannot also carry a spelling generation record`);
      } else if (item.difficulty_source === "model_estimate") problems.push(`item ${item.id} has a model_estimate difficulty but no model generation record`);
      for (const tag of [...Object.values(item.distractor_tags ?? {}), ...Object.values(item.wrong ?? {}), ...(item.addresses ?? [])])
        if (!allowed.has(tag)) problems.push(`item ${item.id} uses misconception ${tag}, which ${item.target} does not list`);
      const n = item.options?.length ?? 0;
      const isIndex = (i: unknown) => Number.isInteger(i) && (i as number) >= 0 && (i as number) < n;
      const kind = formatKind(item.format);
      if (kind === "choice") {
        if (n < 2) problems.push(`choice item ${item.id} needs options`);
        if (!isIndex(item.answer)) problems.push(`choice item ${item.id} has no valid answer`);
      } else if (kind === "typed") {
        if (!item.answers?.length) problems.push(`typed item ${item.id} needs accepted answers`);
      } else if (kind === "order") {
        const o = item.answer_order ?? [];
        if (n < 3) problems.push(`order item ${item.id} needs at least 3 options`);
        if (o.length !== n || new Set(o).size !== n || !o.every(isIndex)) problems.push(`order item ${item.id} needs answer_order: every option index exactly once`);
        if (o.every((x, i) => x === i)) problems.push(`order item ${item.id} shows its options already in the right order`);
      } else if (kind === "match") {
        const k = item.left?.length ?? 0;
        const p = item.answer_pairs ?? [];
        if (k < 3 || n < k) problems.push(`match item ${item.id} needs at least 3 entries and at least as many options`);
        if (p.length !== k || new Set(p).size !== k || !p.every(isIndex)) problems.push(`match item ${item.id} needs answer_pairs: one distinct option per entry`);
      } else if (kind === "multi") {
        const set = item.answer_set ?? [];
        if (n < 4) problems.push(`multi item ${item.id} needs at least 4 options`);
        if (!set.length || set.length >= n || new Set(set).size !== set.length || !set.every(isIndex)) problems.push(`multi item ${item.id} needs a valid answer_set (some, not all, options)`);
      } else problems.push(`item ${item.id} has unknown format ${item.format}`);
    } else if (item.kind === "short") {
      problems.push(...validateShort(item, index, passages));
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
      for (const a of w.anchors) problems.push(...anchorReviewProblems(a, `anchor ${a.id} (task ${w.id})`));
    }
  }
  for (const g of bundle.goals)
    for (const key of Object.keys(g.weights))
      if (!index.leaves.has(key) && !index.children.has(key)) problems.push(`goal ${g.id} weights unknown node ${key}`);
  return problems;
}

/** Retired versions: well formed, code-scored, older than the current version of the same item, and unique. */
export function validateRetired(bundle: ContentBundle, index: FrameworkIndex): string[] {
  const retired = bundle.retired ?? [];
  const problems: string[] = [];
  const current = new Map(bundle.items.map((i) => [i.id, i]));
  const seen = new Set<string>();
  for (const r of retired) {
    const key = versionKey(r.id, r.version);
    if (seen.has(key)) problems.push(`retired version ${key} appears twice`);
    seen.add(key);
    if (r.kind !== "code" && r.kind !== "short") problems.push(`retired version ${key}: only code-scored items and short written responses can be retired`);
    const c = current.get(r.id);
    if (!c) problems.push(`retired version ${key} has no current item`);
    else {
      if (!(r.version < c.version)) problems.push(`retired version ${key} is not older than the current version ${c.version}`);
      if (r.kind !== "writing" && c.kind !== "writing" && r.target !== c.target) problems.push(`retired version ${key} targets a different capability from the current item`);
    }
    // each retired version is validated as an item in its own right
    for (const p of validateContent({ ...bundle, items: [r], retired: [] }, index)) if (!p.startsWith("goal ")) problems.push(`retired ${key}: ${p}`);
  }
  return problems;
}

/** A trusted anchor must carry the record of independent scoring by at least two educators (E3). */
export function anchorReviewProblems(a: { trusted: boolean; review?: AnchorReview }, label: string): string[] {
  if (!a.trusted) return [];
  const r = a.review;
  if (!r) return [`${label} is marked trusted without a review record (two independent educator scorings)`];
  const out: string[] = [];
  if (new Set(r.scorers).size < 2) out.push(`${label} is marked trusted with fewer than two independent scorers`);
  for (const s of r.scorers) if (!r.independent?.[s]) out.push(`${label}: scorer ${s} has no independent scores`);
  if (!r.rubric_version || !r.date) out.push(`${label}: review record needs a rubric version and a date`);
  return out;
}

const words = (s: string) => (s.match(/[A-Za-z0-9’']+/g) ?? []).length;

/** Is a guard's condition met by this text (so the key point it names cannot be present)? */
export function guardBlocks(g: Guard, text: string): boolean {
  if (g.forbids && new RegExp(g.forbids, "i").test(text)) return true;
  if (g.requires && !new RegExp(g.requires, "i").test(text)) return true;
  return false;
}

export function validateShort(item: ShortItem, index: FrameworkIndex, passages: Set<string>): string[] {
  const problems: string[] = [];
  const p = (m: string) => problems.push(`short item ${item.id}: ${m}`);
  if (!(item.b >= 1 && item.b <= 8)) p("difficulty outside 1–8");
  if (!(item.a > 0)) p("needs a positive discrimination");
  if (!item.format.startsWith("short:")) p(`format must start with short: (is ${item.format})`);
  if (item.passage && !passages.has(item.passage)) p(`unknown passage ${item.passage}`);
  const allowed = misconceptionIds(index, item.target);
  for (const t of item.addresses ?? []) if (!allowed.has(t)) p(`misconception ${t} is not listed for ${item.target}`);
  const ids = item.key_points.map((k) => k.id);
  if (!ids.length) p("needs key points");
  if (new Set(ids).size !== ids.length) p("key point ids must be unique");
  if (!item.key_points.some((k) => k.required)) p("needs at least one required key point");
  if (!item.model_answers.length) p("needs a model answer");
  if (!(item.max_words >= 5 && item.max_words <= 80)) p("max_words must be between 5 and 80 (one to three sentences)");
  for (const m of item.model_answers) if (words(m) > item.max_words) p(`model answer longer than ${item.max_words} words: "${m}"`);
  for (const g of item.guards ?? []) {
    if (!ids.includes(g.key_point)) p(`guard ${g.id} names unknown key point ${g.key_point}`);
    if (!g.requires && !g.forbids) p(`guard ${g.id} needs requires or forbids`);
    try {
      if (g.requires) new RegExp(g.requires, "i");
      if (g.forbids) new RegExp(g.forbids, "i");
    } catch {
      p(`guard ${g.id} has an invalid pattern`);
      continue;
    }
    // a guard must never contradict the item's own model answers
    for (const m of item.model_answers) if (guardBlocks(g, m)) p(`guard ${g.id} blocks the model answer "${m}"`);
  }
  if (item.anchors.length < 3) p("needs at least 3 anchor responses");
  for (const a of item.anchors) {
    const marked = Object.keys(a.marks).sort();
    if (marked.join() !== [...ids].sort().join()) p(`anchor ${a.id} must mark every key point exactly once`);
    // the agreed marks must agree with the deterministic guards
    for (const g of item.guards ?? []) if (a.marks[g.key_point] && guardBlocks(g, a.text)) p(`anchor ${a.id} marks ${g.key_point} present, but guard ${g.id} rules it out`);
    problems.push(...anchorReviewProblems(a, `anchor ${a.id} (short item ${item.id})`));
  }
  return problems;
}

export function indexContent(bundle: ContentBundle, index: FrameworkIndex): ContentIndex {
  const problems = [...validateContent(bundle, index), ...validateRetired(bundle, index)];
  if (problems.length) throw new Error(`Invalid content:\n- ${problems.join("\n- ")}`);
  const byCapability = new Map<string, Item[]>();
  for (const item of bundle.items) for (const t of targetsOf(item)) byCapability.set(t, [...(byCapability.get(t) ?? []), item]);
  return {
    items: new Map(bundle.items.map((i) => [i.id, i])),
    passages: new Map(bundle.passages.map((p) => [p.id, p])),
    goals: new Map(bundle.goals.map((g) => [g.id, g])),
    misspellings: new Map(Object.entries(bundle.misspellings)),
    byCapability,
    retired: new Map((bundle.retired ?? []).map((i) => [versionKey(i.id, i.version), i])),
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

/**
 * What an item's answers can stand for. validated: educator-approved; candidate: the existing unreviewed bank
 * (updates estimates, as since E1); provisional: unreviewed demonstration content (never updates estimates);
 * practice: a generated item not yet checked by a person.
 */
export type ContentStatus = "validated" | "candidate" | "provisional" | "practice";
export function contentStatus(item: Item): ContentStatus {
  if (item.kind !== "code") return "candidate";
  if (item.generated && !item.generated.checked) return "practice";
  if (item.evidence_status === "provisional") return "provisional";
  if (item.evidence_status === "validated") return "validated";
  return "candidate";
}
