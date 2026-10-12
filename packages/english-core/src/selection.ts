/**
 * Adaptive activity selection: given the composite and the learner's goal,
 * score every unseen item and pick the best, with its reasons.
 *
 * Deterministic: the same composite, goal, content and history always give the
 * same choice (ties are broken by item id).
 */
import { type LeafView, leafView } from "./composite.ts";
import { type ContentIndex, goalWeights, itemParams, targetsOf } from "./content.ts";
import type { FrameworkIndex } from "./framework.ts";
import { itemInformation, logistic, pCorrect } from "./model.ts";
import type { CapabilityId, Composite, Goal, Item } from "./types.ts";

export type Mode = "diagnostic" | "practice";

export interface Scored {
  item: string;
  kind: Item["kind"];
  targets: CapabilityId[];
  score: number;
  parts: Record<string, number>;
  /** Predicted chance of success (code items) or of meeting the task's level (writing). */
  p: number;
  reasons: string[];
}

export interface Recommendation {
  mode: Mode;
  goal: string;
  choice: Scored | null;
  alternatives: Scored[];
  explanation: string;
}

export interface SelectionInput {
  index: FrameworkIndex;
  content: ContentIndex;
  composite: Composite;
  goal: Goal;
  now: string;
  /** Items already used for this learner (never repeated, so later evidence is on fresh items). */
  seen: Set<string>;
  /** Most recent items first: capability and format, for variety. */
  recent: { item: string; targets: CapabilityId[]; format: string }[];
  /** Writing tasks already given in the current session. */
  writingThisSession: number;
  /** Is an evaluator available for written answers right now (online, consented)? */
  writingAvailable: boolean;
  /** Limit candidates to these items (used by experiments). */
  only?: Set<string>;
  mode?: Mode;
}

const WEIGHTS: Record<Mode, Record<string, number>> = {
  diagnostic: { information: 3, fit: 0.5, goal: 0.5, retention: 0.5, misconception: 0.5, struggling: 1, variety: 1 },
  practice: { information: 0.8, fit: 1.5, goal: 1, retention: 1, misconception: 1, struggling: 1.5, variety: 1 },
};
const WRITING_NOISE = 0.9;
const TARGET_SUCCESS = 0.7;

export function chooseMode(views: Map<string, LeafView>, weights: Map<string, number>): Mode {
  let W = 0;
  let S = 0;
  for (const [id, w] of weights) {
    const v = views.get(id);
    if (!v || !v.specified || w <= 0) continue;
    W += w;
    S += w * v.sd;
  }
  return W > 0 && S / W > 0.9 ? "diagnostic" : "practice";
}

export function recommend(input: SelectionInput, count = 1): Recommendation {
  const { index, content, composite, goal, now } = input;
  const weights = goalWeights(goal, index);
  const views = new Map(index.leafIds.map((id) => [id, leafView(composite, index, id, now)]));
  const mode = input.mode ?? chooseMode(views, weights);
  const W = WEIGHTS[mode];
  const maxGoal = Math.max(...weights.values(), 1e-9);
  const lastCaps = new Set(input.recent.slice(0, 2).flatMap((r) => r.targets));
  const lastFormat = input.recent[0]?.format;

  const scored: Scored[] = [];
  for (const item of content.items.values()) {
    if (input.seen.has(item.id)) continue;
    if (input.only && !input.only.has(item.id)) continue;
    if (item.kind === "writing" && (!input.writingAvailable || input.writingThisSession >= 1)) continue;
    const targets = targetsOf(item).filter((t) => (weights.get(t) ?? 0) > 0 && views.get(t)!.specified);
    if (!targets.length) continue;

    let information = 0;
    let fit = 0;
    let goalPart = 0;
    let retention = 0;
    let misconception = 0;
    let struggling = 0;
    let pSum = 0;
    const notes: string[] = [];
    for (const t of targets) {
      const v = views.get(t)!;
      const w = (weights.get(t) ?? 0) / maxGoal;
      const variance = v.sd * v.sd;
      let p: number;
      if (item.kind === "code") {
        const params = itemParams(item);
        p = pCorrect(v.mean, params);
        information += w * (variance - 1 / (1 / variance + itemInformation(v.mean, params)));
      } else {
        p = logistic(v.mean - item.b);
        information += w * (variance - (variance * WRITING_NOISE ** 2) / (variance + WRITING_NOISE ** 2));
      }
      pSum += p;
      fit += 1 - Math.abs(p - TARGET_SUCCESS) / TARGET_SUCCESS;
      goalPart += w;
      const daysSince = v.lastDirectAt ? (Date.parse(now) - Date.parse(v.lastDirectAt)) / 86_400_000 : 0;
      if (v.demonstrated !== null && v.sd >= 0.75 && daysSince >= 7) {
        retention += 1;
        notes.push(`retention check for ${v.name}`);
      }
      if (item.kind === "code" && item.addresses?.length) {
        const hit = v.misconceptions.filter((m) => item.addresses!.includes(m.id));
        for (const m of hit) {
          misconception += m.strength;
          notes.push(`practises "${m.id.replace(/_/g, " ")}"`);
        }
      }
      if (v.stage === "struggling") {
        const easier = item.kind === "code" ? item.b <= v.direct.mean - 0.5 : false;
        struggling += easier ? 1 : -1;
        if (easier) notes.push(`easier step for ${v.name}`);
      }
    }
    const n = targets.length;
    let variety = 0;
    if (targets.some((t) => lastCaps.has(t))) variety -= 0.5;
    const format = item.kind === "code" ? item.format : item.format;
    if (format === lastFormat) variety -= 0.3;
    const parts = { information, fit: fit / n, goal: goalPart / n, retention, misconception, struggling, variety };
    const score = Object.entries(parts).reduce((s, [k, v]) => s + W[k] * v, 0);
    scored.push({ item: item.id, kind: item.kind, targets, score, parts, p: pSum / n, reasons: notes });
  }
  scored.sort((a, b) => b.score - a.score || a.item.localeCompare(b.item));
  const choice = scored[0] ?? null;
  return {
    mode,
    goal: goal.id,
    choice,
    alternatives: scored.slice(1, Math.max(4, count + 3)),
    explanation: choice ? explainChoice(choice, mode, goal, index, views) : "Nothing left to recommend for this goal.",
  };
}

function explainChoice(c: Scored, mode: Mode, goal: Goal, index: FrameworkIndex, views: Map<string, LeafView>): string {
  const names = c.targets.map((t) => index.names.get(t)).join(", ");
  const est = c.targets
    .slice(0, 2)
    .map((t) => {
      const v = views.get(t)!;
      return `${v.name} ${v.mean.toFixed(1)} ± ${v.sd.toFixed(1)}`;
    })
    .join("; ");
  const why: string[] = [];
  const W = WEIGHTS[mode];
  const ranked = Object.entries(c.parts)
    .map(([k, v]) => [k, W[k] * v] as const)
    .filter(([, v]) => v > 0.05)
    .sort((a, b) => b[1] - a[1]);
  for (const [k] of ranked.slice(0, 2)) {
    if (k === "information") why.push(mode === "diagnostic" ? "it tells us most about where you are" : "it narrows what we still don't know");
    if (k === "fit") why.push(`it is at a good stretch level (about ${Math.round(c.p * 100)}% likely to succeed)`);
    if (k === "goal") why.push(`it serves your goal "${goal.name}"`);
    if (k === "retention") why.push("it checks something shown earlier has stuck");
    if (k === "misconception") why.push("it practises a mistake seen recently");
    if (k === "struggling") why.push("it steps down to an easier level");
  }
  const extra = c.reasons.length ? ` (${[...new Set(c.reasons)].slice(0, 2).join("; ")})` : "";
  return `${mode === "diagnostic" ? "Finding your level" : "Practice"}: ${names}. Chosen because ${why.join(" and ") || "it is the best available match"}${extra}. Current estimate: ${est}.`;
}
