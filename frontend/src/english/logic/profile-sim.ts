/**
 * Synthetic learners for the learner profile and development plan: deterministic answer policies driven
 * through the app's own Learner calls (the same calls the screens make), on real framework capabilities and
 * the real question bank. They establish software behaviour, not educational effectiveness.
 */
import type { Item, Response } from "../../../../packages/english-core/src/index.ts";
import type { Code } from "./content.ts";
import type { Learner } from "./learner.ts";
import type { PlanStep } from "./plan.ts";

/** A right or a wrong response to any right-or-wrong item, from the item's own key. */
export function respond(item: Item, right: boolean): Response {
  const i = item as Code & { answer?: number; answer_set?: number[]; answer_order?: number[]; answer_pairs?: number[]; left?: string[] };
  const kind = i.format.split(":")[0];
  if (kind === "typed") return { kind: "typed", text: right ? i.answers![0] : "zzzq" };
  if (kind === "choice") return { kind: "choice", choice: right ? i.answer! : (i.answer! + 1) % i.options!.length };
  if (kind === "multi") {
    const wrongPick = i.options!.findIndex((_, k) => !i.answer_set!.includes(k));
    return { kind: "multi", choices: right ? i.answer_set! : wrongPick >= 0 ? [wrongPick] : [] };
  }
  if (kind === "order") return { kind: "order", order: right ? i.answer_order! : [...i.answer_order!].reverse() };
  if (kind === "match") return { kind: "match", pairs: right ? i.answer_pairs! : i.answer_pairs!.map((_, k) => i.answer_pairs![(k + 1) % i.answer_pairs!.length]) };
  throw new Error(`cannot answer ${i.format}`);
}

/** Right or wrong for each question: by capability, then by position. */
export type Policy = (item: Code, n: number) => boolean;

/**
 * Run a whole session: lessons are read (their check answered right), every question answered by the policy.
 * `retry`: after a wrong first answer, try once more and get it right (an assisted answer, never evidence).
 */
export async function runSession(l: Learner, step: Pick<PlanStep, "type" | "capability" | "step" | "lesson" | "purpose">, policy: Policy, opts: { retry?: boolean } = {}): Promise<{ asked: string[]; right: number }> {
  let cur = await l.start(step);
  const asked: string[] = [];
  let right = 0;
  for (let guard = 0; guard < 60; guard++) {
    if (cur.lesson) {
      await l.finishLesson(cur.lesson.id, true);
      cur = await l.current();
      continue;
    }
    if (!cur.next) return { asked, right };
    const item = cur.next.item as Code;
    const ok = policy(item, asked.length);
    asked.push(item.id);
    if (ok) right++;
    const fb = await l.answer(item, respond(item, ok), { use: cur.next.use });
    if (!fb.correct && opts.retry) await l.answer(item, respond(item, true), { use: "practice" });
    cur = await l.current();
  }
  throw new Error("the session did not end");
}

/** The start: placement, then the spelling check, answered by the policy. */
export async function start(l: Learner, policy: Policy): Promise<void> {
  for (let k = 0; k < 2; k++) {
    const a = l.profile().activities[0];
    if (!a || a.kind !== "start") return;
    await runSession(l, a.step, policy);
  }
}

/** Run the first activity Today offers (as a child pressing the first Start). Returns what it was. */
export async function doToday(l: Learner, policy: Policy, opts: { retry?: boolean } = {}): Promise<string> {
  const a = l.profile().activities[0];
  if (!a) throw new Error("nothing offered today");
  await runSession(l, a.step, policy, opts);
  return `${a.kind}:${a.step.type}:${a.step.capability ?? ""}`;
}

export const onCaps =
  (caps: Record<string, boolean>, otherwise: boolean): Policy =>
  (item) =>
    caps[item.target] ?? (Object.entries(caps).find(([k]) => item.target.startsWith(k))?.[1] ?? otherwise);
