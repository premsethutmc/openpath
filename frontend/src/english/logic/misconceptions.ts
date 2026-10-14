/**
 * Misconceptions as hypotheses with an evidence status, and what kind of error a misspelling was.
 *
 * The engine keeps a strength for each misconception (composite.ts; unchanged here). This module reads the same
 * recorded evidence and says how well each one is supported, so that one wrong answer is never presented as a
 * confirmed pattern:
 *   suspected   one independent error that matches it
 *   supported   errors that match it on two or more different questions
 *   resolved    after the last such error, two or more independent right answers on different questions that test it
 * Only independent first answers count (the ledger's accepted decisions, not after teaching, not repeats).
 * Errors in practice, with help, or after teaching are listed apart and never support a misconception.
 *
 * Nothing is stored: the statuses are recomputed from the record, so historical evidence keeps its meaning.
 */
import type { Decision } from "../../../../packages/english-core/src/index.ts";
import type { AppContent, Code } from "./content.ts";
import type { AppState } from "./state.ts";

export type MisconceptionStatus = "suspected" | "supported" | "resolved";

export interface MisconceptionFinding {
  capability: string;
  misconception: string;
  status: MisconceptionStatus;
  /** Independent errors that match it (question ids). */
  errors: { item: string; at: string }[];
  /** Independent right answers, after the last error, on questions that test it. */
  laterRight: { item: string; at: string }[];
  /** Matching errors that cannot support it (practice, help, after teaching, repeated question). */
  notCounted: number;
  /** Why it has this status, in words. */
  reason: string;
}

const independent = (d: Decision) => d.verdict === "accepted" && d.observation?.kind === "binary" && d.observation.setting !== "after_teaching" && d.observation.exposure !== "repeat";

/** Does this question test the misconception (a wrong answer it lists, or one it is designed to address)? */
function probes(item: Code | undefined, tag: string): boolean {
  if (!item) return false;
  return Object.values(item.wrong ?? {}).includes(tag) || Object.values(item.distractor_tags ?? {}).includes(tag) || (item.addresses ?? []).includes(tag);
}

export function misconceptionFindings(s: AppState, c: AppContent): MisconceptionFinding[] {
  const item = (id: string) => c.ctx.content.items.get(id) as Code | undefined;
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
      out.push({ capability, misconception: tag, status: "suspected", errors: [], laterRight: [], notCounted, reason: `seen only in practice, with help or after teaching (${notCounted}): not counted as evidence of a misconception` });
      continue;
    }
    const last = errors.reduce((a, b) => (a.at >= b.at ? a : b));
    const distinctErrors = new Set(errors.map((d) => d.observation!.item));
    const laterRight = s.ledger.decisions.filter((d) => independent(d) && d.observation!.value === 1 && d.at > last.at && d.capability === capability && probes(item(d.observation!.item), tag));
    const distinctRight = new Set(laterRight.map((d) => d.observation!.item));
    let status: MisconceptionStatus;
    let reason: string;
    if (distinctRight.size >= 2) {
      status = "resolved";
      reason = `${distinctRight.size} right answers on different questions that test it, after the last error`;
    } else if (distinctErrors.size >= 2) {
      status = "supported";
      reason = `errors that match it on ${distinctErrors.size} different questions`;
    } else {
      status = "suspected";
      reason = `one error that matches it${distinctRight.size ? `, and one right answer since` : ""}: not enough to call it a pattern`;
    }
    out.push({
      capability,
      misconception: tag,
      status,
      errors: errors.map((d) => ({ item: d.observation!.item, at: d.at })),
      laterRight: laterRight.map((d) => ({ item: d.observation!.item, at: d.at })),
      notCounted,
      reason,
    });
  }
  return out.sort((a, b) => a.capability.localeCompare(b.capability) || a.misconception.localeCompare(b.misconception));
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
