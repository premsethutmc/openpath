/**
 * Misconceptions as hypotheses with an evidence status, and what kind of error a misspelling was.
 *
 * The engine keeps a strength for each misconception (composite.ts; unchanged here). This module reads the same
 * recorded evidence and says how well each one is supported, so that one wrong answer is never presented as a
 * confirmed learning problem. Two things are kept apart:
 *
 *   support (how strong the evidence FOR it was)
 *     suspected        one independent error that matches it
 *     supported        errors that match it on two or more different questions
 *
 *   status (where it stands now, after the last matching error)
 *     suspected / supported   nothing since points the other way
 *     improving        right answers since, but not yet enough to resolve it (for example only straight after the
 *                      error, on the same day, or only one)
 *     resolved_below   right on easier questions that test it (one on a later day), but the harder form (the
 *                      difficulty of the error) is not yet shown: "resolved below level X"
 *     resolved         at least RESOLUTION.minRight right answers since, on different questions that test it, each
 *                      at difficulty ≥ (the hardest matching error − RESOLUTION.belowHardest), with at least one on a
 *                      later calendar day than the last error; and no matching error since
 *
 * Only independent first answers count (the ledger's accepted decisions, not after teaching, not repeated questions);
 * a word already answered on another question does not count again. Errors in practice, with help or after teaching
 * are listed apart and never support a misconception. Every status lists the answers that produced it.
 *
 * Nothing is stored: the statuses are recomputed from the record, so historical evidence keeps its meaning.
 * Calendar days are the pupil's when the record holds a time zone, otherwise UTC (calendar.ts). The thresholds are drafts.
 */
import type { Decision } from "../../../../packages/english-core/src/index.ts";
import type { AppContent, Code } from "./content.ts";
import { type DayBasis, basisWords, calendarDay, dayBasis } from "./calendar.ts";
import { RESOLUTION } from "./mastery-policy.ts";
import type { AppState } from "./state.ts";

export type MisconceptionSupport = "suspected" | "supported";
export type MisconceptionStatus = MisconceptionSupport | "improving" | "resolved_below" | "resolved";

/** One answer behind a finding, traceable to the ledger decision and the question. */
export interface FindingAnswer {
  decision: string;
  item: string;
  at: string;
  /** The question's difficulty (provisional, author-estimated). */
  b: number;
  /** For later right answers: at the difficulty needed to resolve it (≥ hardest error − 0.5). */
  atLevel?: boolean;
}

export interface MisconceptionFinding {
  capability: string;
  misconception: string;
  /** The evidence for it: one error (suspected) or errors on different questions (supported). Kept whatever the status. */
  support: MisconceptionSupport;
  status: MisconceptionStatus;
  /** Independent errors that match it. */
  errors: FindingAnswer[];
  /** Independent right answers, after the last error, on different questions that test it. */
  laterRight: FindingAnswer[];
  /** The difficulty a right answer needs to count towards resolving it (hardest error − 0.5); null with no counted error. */
  needed: number | null;
  /** For resolved_below: the difficulty of the harder form not yet shown (the hardest matching error). */
  below: number | null;
  /** Matching errors that cannot support it (practice, help, after teaching, repeated question). */
  notCounted: number;
  /** Why it has this status, in words. */
  reason: string;
  /** How "a later day" was judged: the pupil's time zone, or UTC as the fallback. */
  days: DayBasis;
}

const independent = (d: Decision) => d.verdict === "accepted" && d.observation?.kind === "binary" && d.observation.setting !== "after_teaching" && d.observation.exposure !== "repeat";

/** Does this question test the misconception (a wrong answer it lists, or one it is designed to address)? */
export function probes(item: Code | undefined, tag: string): boolean {
  if (!item) return false;
  return Object.values(item.wrong ?? {}).includes(tag) || Object.values(item.distractor_tags ?? {}).includes(tag) || (item.addresses ?? []).includes(tag);
}

const fmt = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));

export function misconceptionFindings(s: AppState, c: AppContent, opts: { timeZone?: string | null } = {}): MisconceptionFinding[] {
  const basis = dayBasis(s, opts.timeZone);
  const dayOf = (iso: string) => calendarDay(iso, basis);
  const item = (id: string) => c.ctx.content.items.get(id) as Code | undefined;
  const bOf = (d: Decision) => item(d.observation!.item)?.b ?? 0;
  const ans = (d: Decision, extra: Partial<FindingAnswer> = {}): FindingAnswer => ({ decision: d.id, item: d.observation!.item, at: d.at, b: bOf(d), ...extra });
  const wordOf = (d: Decision) => {
    const it = item(d.observation!.item);
    return d.capability?.startsWith("EN.FND.SPL.") && it?.format.startsWith("typed") && it.answers?.[0] ? it.answers[0].toLowerCase() : d.observation!.item;
  };
  const byKey = new Map<string, { capability: string; tag: string; errors: Decision[]; notCounted: number }>();
  for (const d of s.ledger.decisions) {
    const o = d.observation;
    if (!o || !d.capability || !o.misconceptions.length || o.value !== 0) continue;
    for (const tag of o.misconceptions) {
      const key = `${d.capability}#${tag}`;
      const rec = byKey.get(key) ?? { capability: d.capability, tag, errors: [], notCounted: 0 };
      if (independent(d)) rec.errors.push(d);
      else rec.notCounted++;
      byKey.set(key, rec);
    }
  }
  const out: MisconceptionFinding[] = [];
  for (const { capability, tag, errors, notCounted } of byKey.values()) {
    if (!errors.length) {
      out.push({ capability, misconception: tag, support: "suspected", status: "suspected", errors: [], laterRight: [], needed: null, below: null, notCounted, days: basis, reason: `seen only in practice, with help or after teaching (${notCounted}): not counted as evidence of a misconception` });
      continue;
    }
    const last = errors.reduce((a, b) => (a.at >= b.at ? a : b));
    const distinctErrors = new Set(errors.map((d) => d.observation!.item));
    const support: MisconceptionSupport = distinctErrors.size >= 2 ? "supported" : "suspected";
    const hardest = Math.max(...errors.map(bOf));
    const needed = hardest - RESOLUTION.belowHardest;
    // later right answers on questions that test it: one per question and per word (a word met again is not new)
    const seen = new Set<string>();
    const laterRight: FindingAnswer[] = [];
    for (const d of s.ledger.decisions) {
      if (!independent(d) || d.observation!.value !== 1 || d.at <= last.at || d.capability !== capability || !probes(item(d.observation!.item), tag)) continue;
      const w = wordOf(d);
      if (seen.has(d.observation!.item) || seen.has(w)) continue;
      seen.add(d.observation!.item);
      seen.add(w);
      laterRight.push(ans(d, { atLevel: bOf(d) >= needed - 1e-9 }));
    }
    const atLevel = laterRight.filter((a) => a.atLevel);
    const laterDay = atLevel.some((a) => dayOf(a.at) > dayOf(last.at));
    const what = support === "supported" ? `errors on ${distinctErrors.size} different questions` : "one error";
    let status: MisconceptionStatus;
    let reason: string;
    let below: number | null = null;
    if (atLevel.length >= RESOLUTION.minRight && (!RESOLUTION.laterDay || laterDay)) {
      status = "resolved";
      reason = `${what} (hardest at difficulty ${fmt(hardest)}), then ${atLevel.length} right answers on different questions at difficulty ${fmt(needed)} or harder, including on a later day, with no matching error since`;
    } else if (laterRight.length >= RESOLUTION.minRight && atLevel.length < RESOLUTION.minRight && (!RESOLUTION.laterDay || laterRight.some((a) => dayOf(a.at) > dayOf(last.at)))) {
      status = "resolved_below";
      below = hardest;
      reason = `${what} at difficulty up to ${fmt(hardest)}; since then right on ${laterRight.length} questions that test it, but only ${atLevel.length} at difficulty ${fmt(needed)} or harder: resolved below level ${fmt(hardest)}, the harder form is not yet shown`;
    } else if (laterRight.length) {
      status = "improving";
      reason =
        laterRight.length >= RESOLUTION.minRight
          ? `${what}, then ${laterRight.length} right answers (${atLevel.length} at the difficulty of the error), but all on the same day as the error: improving, not yet resolved (it needs a right answer on a later day)`
          : `${what}, then ${laterRight.length} right answer${laterRight.length === 1 ? "" : "s"} on a question that tests it: improving, not yet resolved (${RESOLUTION.minRight} on different questions at difficulty ${fmt(needed)} or harder, one on a later day, are needed)`;
    } else {
      status = support;
      reason = support === "supported" ? `errors that match it on ${distinctErrors.size} different questions` : "one error that matches it: a suspicion, not enough to call it a pattern";
    }
    if (status === "resolved" || status === "resolved_below" || (status === "improving" && laterRight.length >= RESOLUTION.minRight)) reason += ` (${basisWords(basis)})`;
    out.push({ capability, misconception: tag, support, status, errors: errors.map((d) => ans(d)), laterRight, needed, below, notCounted, reason, days: basis });
  }
  return out.sort((a, b) => a.capability.localeCompare(b.capability) || a.misconception.localeCompare(b.misconception));
}

/** The finding in words for a parent or teacher (profile difficulties); null when there is nothing to report. */
export function findingLine(f: MisconceptionFinding): string | null {
  const what = f.misconception.replace(/_/g, " ");
  if (!f.errors.length || f.status === "resolved") return null;
  const qs = new Set(f.errors.map((e) => e.item)).size;
  switch (f.status) {
    case "supported":
      return `A pattern in wrong answers: ${what} (on ${qs} different questions).`;
    case "suspected":
      return `Possibly ${what}: one wrong answer so far, not yet a pattern.`;
    case "improving":
      return `${f.support === "supported" ? `A pattern seen before (${what}, on ${qs} questions)` : `Possibly ${what} (one wrong answer)`}: improving, right ${f.laterRight.length} time${f.laterRight.length === 1 ? "" : "s"} since, not yet resolved.`;
    case "resolved_below":
      return `${f.support === "supported" ? `A pattern seen before (${what}, on ${qs} questions)` : `Possibly ${what} (one wrong answer, about level ${fmt(f.below ?? 0)})`}: right since on easier questions, not yet at the harder level: resolved below level ${fmt(f.below ?? 0)}.`;
  }
  return null;
}

// ------------------------------------------------------------------ what kind of error a misspelling was

export type ErrorKind = "rule_error" | "possible_typo" | "other_word" | "spelling_error";

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const POS = new Map<string, [number, number]>();
ROWS.forEach((r, y) => [...r].forEach((ch, x) => POS.set(ch, [x + y * 0.5, y])));
const adjacentKeys = (a: string, b: string) => {
  const p = POS.get(a);
  const q = POS.get(b);
  return !!p && !!q && Math.abs(p[0] - q[0]) <= 1 && Math.abs(p[1] - q[1]) <= 1 && a !== b;
};

/**
 * A wrong typed spelling, classified (a heuristic, recorded as such, never used for scoring):
 *   rule_error      the item lists it as the error a spelling rule predicts (it carries the misconception tag)
 *   possible_typo   one slip of the fingers: two neighbouring letters swapped, or one letter replaced by a key next to it
 *   other_word      a different word OpenPath knows: possibly misheard, or a vocabulary confusion
 *   spelling_error  any other misspelling (for example of the base word), not matched to a rule
 * Scoring is unchanged: every wrong answer is wrong. The kind decides only what may count as evidence of a misconception.
 */
export function classifyError(target: string, answer: string, tagged: boolean, knownWords: Set<string>): ErrorKind {
  const t = target.toLowerCase().trim();
  const a = answer.toLowerCase().trim();
  if (tagged) return "rule_error";
  if (a.length === t.length) {
    const diff = [...t].map((ch, i) => (ch === a[i] ? -1 : i)).filter((i) => i >= 0);
    if (diff.length === 2 && diff[1] === diff[0] + 1 && t[diff[0]] === a[diff[1]] && t[diff[1]] === a[diff[0]]) return "possible_typo";
    if (diff.length === 1 && adjacentKeys(t[diff[0]], a[diff[0]])) return "possible_typo";
  }
  if (a && a !== t && knownWords.has(a)) return "other_word";
  return "spelling_error";
}
