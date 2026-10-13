/**
 * Content validation for generated spelling items (pilot readiness, 13 October 2026).
 *
 * A person approves a **generation rule** (one template of one generator version) from a reviewed sample,
 * or a **reviewed item set** (a fixed list of item versions). Problems found are recorded as
 * exceptions, and deterministic checks flag items that need a look before they can be offered. Not
 * every generated item has to be reviewed by hand.
 *
 * What an approval means, and what it does not:
 *   - it allows the items to be **offered as practice content** (word and pattern practice, reviews and
 *     transfer checks in the spelling module);
 *   - it does **not** set `generated.checked`, so it never makes generated items count towards the
 *     general capability estimates. That needs separate validation of their assessment quality
 *     (difficulty and discrimination from real answers), and separate approval. The composite updater is
 *     unchanged.
 *
 * Pure functions only: no file or network access (the CLI is tools/english/spelling/review.ts).
 */
import type { Item } from "./types.ts";
import { fnv1a } from "./model.ts";

export const REVIEW_SCOPE = "practice_content" as const;
export const REVIEW_STATEMENT =
  "Approval allows generated items to be offered as practice content. It does not mark them checked, and it never lets them change capability estimates; that needs separate validation of their assessment quality.";

/** A rule is approved only from a sample of at least this many items (or the whole rule, if smaller)… */
export const MIN_SAMPLE = 20;
/** …with at most this share of the sample found to have problems (each problem item becomes an exception). */
export const MAX_PROBLEM_RATE = 0.05;

export interface ItemRef {
  id: string;
  version: number;
}

export interface RuleApproval {
  id: string;
  generator: string;
  template: string;
  decision: "approved" | "not_approved";
  by: string;
  date: string;
  sample: { seed: string; size: number; population: number; items: ItemRef[]; problems: { id: string; note: string }[] };
  /** The filled review sheet kept as the record of what was looked at. */
  sheet?: { path: string; sha256: string };
  /** Fingerprint of the word bank the sample was drawn from (provenance). */
  wordbank?: string;
  note?: string;
}

export interface SetApproval {
  id: string;
  name: string;
  decision: "approved" | "not_approved";
  by: string;
  date: string;
  items: ItemRef[];
  problems: { id: string; note: string }[];
  sheet?: { path: string; sha256: string };
  note?: string;
}

export interface ReviewException {
  /** One item, or every item for one word. */
  item?: string;
  word?: string;
  action: "exclude" | "allow";
  reason: string;
  by: string;
  date: string;
}

export interface GeneratedReview {
  version: 1;
  scope: typeof REVIEW_SCOPE;
  statement: string;
  rules: RuleApproval[];
  sets: SetApproval[];
  exceptions: ReviewException[];
}

export const emptyReview = (): GeneratedReview => ({ version: 1, scope: REVIEW_SCOPE, statement: REVIEW_STATEMENT, rules: [], sets: [], exceptions: [] });

type Generated = Extract<Item, { kind: "code" }> & { generated: NonNullable<Extract<Item, { kind: "code" }>["generated"]> };
const isGen = (i: Item): i is Generated => i.kind === "code" && !!i.generated;

export const ruleId = (generator: string, template: string) => `${generator}/${template}`;
export const ruleOf = (i: Generated) => ruleId(i.generated.generator, i.generated.template);

/** Templates where the learner writes the word from memory (recall), rather than picking it (recognition). */
export const RECALL_TEMPLATES = new Set(["add_ending", "hear_spell", "meaning_first_letter"]);

const PROMPT_MAX = 170;
const words = (s: string): string[] => s.toLowerCase().match(/[a-z']+/g) ?? [];

/**
 * Deterministic checks that flag an item for a person to look at. A flagged item is not offered until a
 * reviewer records an "allow" exception for it (or the generator is fixed).
 */
export function automaticFlags(item: Item): string[] {
  if (!isGen(item)) return [];
  const out: string[] = [];
  const g = item.generated;
  const prompt = item.prompt ?? "";
  const ws = words(prompt);
  const answers = (item.answers ?? []).map((a) => a.toLowerCase());
  if (RECALL_TEMPLATES.has(g.template)) {
    if (!answers.length) out.push("no accepted answer");
    if (answers.some((a) => ws.includes(a))) out.push("the prompt contains the answer");
    if (g.template === "meaning_first_letter") {
      const w = g.word.toLowerCase();
      const stem = w.slice(0, Math.max(4, Math.min(6, w.length - 2)));
      const clue = words(prompt.replace(/It sounds like .*$/i, ""));
      if (w.length >= 6 && clue.some((x) => x !== w && x.length >= stem.length && x.startsWith(stem))) out.push(`the clue contains a word sharing the stem "${stem}"`);
    }
    if (g.template === "hear_spell" && !item.speak) out.push("a dictation item with nothing to read aloud");
  } else {
    const opts = (item.options ?? []).map((o) => o.toLowerCase().trim());
    if (opts.length < 2) out.push("fewer than two options");
    if (new Set(opts).size !== opts.length) out.push("two options are the same");
    if (item.answer === undefined || item.answer < 0 || item.answer >= opts.length) out.push("the answer is not one of the options");
    if (g.template === "homophone_context") {
      const frame = prompt.split("?").slice(1).join("?");
      const others = opts.filter((_, k) => k !== item.answer);
      if (others.some((o) => words(frame).includes(o))) out.push("another option already appears in the sentence");
      if (!frame.includes("___")) out.push("the sentence has no gap");
    }
  }
  if (prompt.length > PROMPT_MAX) out.push(`the prompt is long for a young reader (${prompt.length} characters)`);
  if (/[;[\]{}<>|\\]/.test(prompt)) out.push("the prompt has unusual punctuation from the source");
  if (!item.explain) out.push("no explanation for feedback");
  if (!g.sources?.length) out.push("no lexical sources recorded");
  return out;
}

export type ReviewStatus = "approved" | "unreviewed" | "flagged" | "excluded";

export interface ItemReview {
  status: ReviewStatus;
  /** The approval that covers it (rule or set id), if any. */
  by?: string;
  /** Why it is flagged or excluded. */
  reasons: string[];
}

/** The review status of every generated item. Exclusions win; then flags (unless allowed); then approvals. */
export function reviewStatus(items: Item[], review: GeneratedReview): Map<string, ItemReview> {
  const exItem = new Map<string, ReviewException>();
  const exWord = new Map<string, ReviewException>();
  for (const e of review.exceptions) {
    if (e.item) exItem.set(e.item, e); // later records win
    if (e.word) exWord.set(e.word.toLowerCase(), e);
  }
  const rules = new Map<string, RuleApproval>();
  for (const r of review.rules) rules.set(ruleId(r.generator, r.template), r); // the latest record for a rule wins
  const inSet = new Map<string, SetApproval>();
  for (const s of review.sets) for (const ref of s.items) inSet.set(`${ref.id}@${ref.version}`, s);
  const out = new Map<string, ItemReview>();
  for (const item of items) {
    if (!isGen(item)) continue;
    const ex = exItem.get(item.id) ?? exWord.get(item.generated.word.toLowerCase());
    if (ex?.action === "exclude") {
      out.set(item.id, { status: "excluded", reasons: [ex.reason] });
      continue;
    }
    const flags = automaticFlags(item);
    const allowed = exItem.get(item.id)?.action === "allow";
    if (flags.length && !allowed) {
      out.set(item.id, { status: "flagged", reasons: flags });
      continue;
    }
    const set = inSet.get(`${item.id}@${item.version}`);
    if (set?.decision === "approved") {
      out.set(item.id, { status: "approved", by: set.id, reasons: [] });
      continue;
    }
    const rule = rules.get(ruleOf(item));
    if (rule?.decision === "approved") out.set(item.id, { status: "approved", by: rule.id, reasons: [] });
    else out.set(item.id, { status: "unreviewed", reasons: [] });
  }
  return out;
}

/**
 * A review sample for one rule: deterministic, spread across ladder steps (round robin, each step's
 * items in a seeded order), skipping flagged items (reviewed separately) and items already excluded.
 */
export function sampleRule(items: Item[], generator: string, template: string, size: number, seed: string, review?: GeneratedReview): Generated[] {
  const status = review ? reviewStatus(items, review) : null;
  const pool = items
    .filter(isGen)
    .filter((i) => i.generated.generator === generator && i.generated.template === template && !automaticFlags(i).length && status?.get(i.id)?.status !== "excluded");
  const bySteps = new Map<string, Generated[]>();
  for (const i of pool) bySteps.set(`${i.target}#${i.step}`, [...(bySteps.get(`${i.target}#${i.step}`) ?? []), i]);
  const queues = [...bySteps.keys()].sort().map((k) => bySteps.get(k)!.sort((a, b) => fnv1a(seed + a.id).localeCompare(fnv1a(seed + b.id)) || a.id.localeCompare(b.id)));
  const out: Generated[] = [];
  for (let round = 0; out.length < Math.min(size, pool.length); round++)
    for (const q of queues) if (q[round] && out.length < size) out.push(q[round]);
  return out;
}

/** Whether a sample result is enough to approve a rule. */
export function ruleDecision(population: number, size: number, problems: number): { decision: "approved" | "not_approved"; reason: string } {
  const needed = Math.min(MIN_SAMPLE, population);
  if (size < needed) return { decision: "not_approved", reason: `the sample has ${size} items; at least ${needed} are needed` };
  if (problems / size > MAX_PROBLEM_RATE) return { decision: "not_approved", reason: `${problems} of ${size} sampled items had problems (more than ${MAX_PROBLEM_RATE * 100}%); fix the rule and review a new sample` };
  return { decision: "approved", reason: `${problems} of ${size} sampled items had problems (each is excluded)` };
}

/**
 * With no problems in a sample of n, the share of problem items in the whole rule is below about 3/n
 * with 95% confidence (the "rule of three"); a guide to what an approval does and does not show.
 */
export const problemRateBound = (n: number, problems: number) => (n ? Math.min(1, (problems + 3) / n) : 1);

/** Consistency of the review record against the content (run in CI). */
export function reviewProblems(review: GeneratedReview, items: Item[], retired: Item[] = []): string[] {
  const p: string[] = [];
  if (review.version !== 1) p.push("unknown review record version");
  if (review.scope !== REVIEW_SCOPE) p.push(`the review scope must be ${REVIEW_SCOPE}`);
  if (review.statement !== REVIEW_STATEMENT) p.push("the review statement has been changed");
  const known = new Map<string, Set<number>>();
  for (const i of [...items, ...retired]) known.set(i.id, (known.get(i.id) ?? new Set()).add(i.version));
  const gen = items.filter(isGen);
  const genWords = new Set(gen.map((i) => i.generated.word.toLowerCase()));
  const ids = new Set<string>();
  const date = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
  for (const r of review.rules) {
    if (ids.has(r.id)) p.push(`review id ${r.id} is used twice`);
    ids.add(r.id);
    if (!r.by?.trim()) p.push(`${r.id}: no reviewer`);
    if (!date(r.date)) p.push(`${r.id}: invalid date`);
    for (const ref of r.sample.items) if (!known.get(ref.id)?.has(ref.version)) p.push(`${r.id}: sampled item ${ref.id} v${ref.version} is unknown`);
    if (r.sample.size !== r.sample.items.length) p.push(`${r.id}: sample size does not match its items`);
    for (const pr of r.sample.problems) if (!r.sample.items.some((x) => x.id === pr.id)) p.push(`${r.id}: problem item ${pr.id} is not in the sample`);
    const d = ruleDecision(r.sample.population, r.sample.size, r.sample.problems.length);
    if (r.decision === "approved" && d.decision !== "approved") p.push(`${r.id}: recorded as approved, but ${d.reason}`);
    for (const pr of r.sample.problems)
      if (!review.exceptions.some((e) => e.item === pr.id && e.action === "exclude")) p.push(`${r.id}: problem item ${pr.id} has no exclude exception`);
  }
  for (const s of review.sets) {
    if (ids.has(s.id)) p.push(`review id ${s.id} is used twice`);
    ids.add(s.id);
    if (!s.by?.trim()) p.push(`${s.id}: no reviewer`);
    if (!date(s.date)) p.push(`${s.id}: invalid date`);
    for (const ref of s.items) if (!known.get(ref.id)?.has(ref.version)) p.push(`${s.id}: item ${ref.id} v${ref.version} is unknown`);
  }
  for (const e of review.exceptions) {
    const what = e.item ?? e.word ?? "?";
    if (!!e.item === !!e.word) p.push(`exception ${what}: name exactly one item or one word`);
    if (e.item && !known.has(e.item)) p.push(`exception ${e.item}: unknown item`);
    if (e.word && !genWords.has(e.word.toLowerCase())) p.push(`exception ${e.word}: no generated item has this word`);
    if (e.word && e.action === "allow") p.push(`exception ${e.word}: "allow" applies to one item, not a whole word`);
    if (!e.reason?.trim() || !e.by?.trim() || !date(e.date)) p.push(`exception ${what}: needs a reason, a reviewer and a date`);
  }
  return p;
}

/** Counts by rule and status, for the review report. */
export function reviewSummary(items: Item[], status: Map<string, ItemReview>): { rule: string; approved: number; unreviewed: number; flagged: number; excluded: number; total: number }[] {
  const rows = new Map<string, { rule: string; approved: number; unreviewed: number; flagged: number; excluded: number; total: number }>();
  for (const i of items.filter(isGen)) {
    const r = ruleOf(i);
    const row = rows.get(r) ?? { rule: r, approved: 0, unreviewed: 0, flagged: 0, excluded: 0, total: 0 };
    row[status.get(i.id)?.status ?? "unreviewed"]++;
    row.total++;
    rows.set(r, row);
  }
  return [...rows.values()].sort((a, b) => a.rule.localeCompare(b.rule));
}
