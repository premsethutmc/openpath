/** Right and wrong answers to any code-scored item (shared by the tests). */
import type { Item, Response } from "../../../../packages/english-core/src/index.ts";

export function rightAnswer(item: Item): Response {
  if (item.kind !== "code") throw new Error("code items only");
  switch (item.format.split(":")[0]) {
    case "choice":
      return { kind: "choice", choice: item.answer! };
    case "typed":
      return { kind: "typed", text: item.answers![0] };
    case "order":
      return { kind: "order", order: item.answer_order! };
    case "match":
      return { kind: "match", pairs: item.answer_pairs! };
    case "multi":
      return { kind: "multi", choices: item.answer_set! };
  }
  throw new Error(item.format);
}

export function wrongAnswer(item: Item): Response {
  if (item.kind !== "code") throw new Error("code items only");
  switch (item.format.split(":")[0]) {
    case "choice":
      return { kind: "choice", choice: (item.answer! + 1) % item.options!.length };
    case "typed":
      return { kind: "typed", text: Object.keys(item.wrong ?? {})[0] ?? "zzzz" };
    case "order":
      return { kind: "order", order: [...item.answer_order!].reverse() };
    case "match":
      return { kind: "match", pairs: [...item.answer_pairs!].reverse() };
    case "multi":
      return { kind: "multi", choices: [0] };
  }
  throw new Error(item.format);
}

/**
 * A leaf view as records made before verification@2 stored it: the additive fields (verifiedLevel, verifiedLevelAt,
 * on the verification and the retention) removed, after checking they never claim more than the current level.
 * Historical replays compare everything else exactly.
 */
export function withoutVerification2(view: unknown): unknown {
  const v = JSON.parse(JSON.stringify(view)) as { verification: { currentLevel: number | null; verifiedLevel?: number | null; verifiedLevelAt?: string | null }; retention: { verifiedLevel?: number | null; verifiedLevelAt?: string | null } };
  const lv = v.verification.verifiedLevel;
  if (lv !== null && lv !== undefined && (v.verification.currentLevel === null || lv > v.verification.currentLevel)) throw new Error(`verifiedLevel ${lv} above the current level ${v.verification.currentLevel}`);
  delete v.verification.verifiedLevel;
  delete v.verification.verifiedLevelAt;
  delete v.retention.verifiedLevel;
  delete v.retention.verifiedLevelAt;
  return v;
}
