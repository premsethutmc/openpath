/**
 * Progress as the learner and a guardian see it. Three things stay apart (decision 8):
 *
 *   how sure we are   not yet assessed / early estimate / measured (the display rule, E4-G)
 *   what is verified  the engine's verification status (shown, confirmed, check due, needs review)
 *   what kind of evidence  independent assessment, practice, retention checks; and practice on
 *                     generated items, which is recorded but does not change the estimate yet
 */
import { type LeafView, leafView, summarise } from "../../../../packages/english-core/src/index.ts";
import { type AppContent, GUIDED, GUIDED_ALL } from "./content.ts";
import type { AppState } from "./state.ts";

/** A capability is "measured" only with at least this many direct observations… */
export const MEASURED_MIN_N = 4;
/** …at least this many of them independent (assessment or retention, not practice)… */
export const MEASURED_MIN_INDEPENDENT = 2;
/** …and an sd no larger than this. Otherwise it is an early estimate. */
export const MEASURED_MAX_SD = 0.9;

export type Certainty = "not_assessed" | "early" | "measured";

export interface EvidenceCounts {
  assessment: number;
  practice: number;
  retention: number;
  /** Answers to generated items: recorded as practice, no estimate change until the items are checked. */
  generatedPractice: number;
}

export interface CapabilityProgress {
  id: string;
  name: string;
  strand: string;
  guided: boolean;
  certainty: Certainty;
  /** Plain words for the learner. */
  headline: string;
  /** A range the learner can read, e.g. "about band 3 to 5". */
  range: string | null;
  band: number | null;
  verification: string;
  history: string | null;
  evidence: EvidenceCounts;
  misconceptions: string[];
  view: LeafView;
}

const half = (x: number) => Math.round(x * 2) / 2;
const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

export function evidenceCounts(s: AppState, c: AppContent): Map<string, EvidenceCounts> {
  const out = new Map<string, EvidenceCounts>();
  for (const d of s.ledger.decisions) {
    if (!d.capability || !d.observation || (d.verdict !== "accepted" && d.verdict !== "held")) continue;
    const e = out.get(d.capability) ?? { assessment: 0, practice: 0, retention: 0, generatedPractice: 0 };
    const item = c.ctx.content.items.get(d.observation.item);
    if (d.verdict === "held" && item?.kind === "code" && item.generated) e.generatedPractice++;
    else if (d.verdict === "accepted") e[d.observation.use ?? "practice"]++;
    out.set(d.capability, e);
  }
  return out;
}

export function certaintyOf(v: LeafView, e: EvidenceCounts): Certainty {
  if (v.direct.n === 0) return "not_assessed";
  if (v.direct.n < MEASURED_MIN_N || e.assessment + e.retention < MEASURED_MIN_INDEPENDENT || v.direct.sd > MEASURED_MAX_SD) return "early";
  return "measured";
}

export function capabilityProgress(s: AppState, c: AppContent, now: string): CapabilityProgress[] {
  const counts = evidenceCounts(s, c);
  const strandOf = (id: string) => {
    let n: string | undefined = id;
    while (n && c.index.parent.get(n) !== "EN") n = c.index.parent.get(n);
    return n ?? "EN";
  };
  const guided = new Set(GUIDED_ALL);
  return c.index.leafIds
    .filter((id) => {
      const cap = c.index.leaves.get(id)!;
      return !!(cap.bands && cap.description && cap.misconceptions);
    })
    .map((id) => {
      const v = leafView(s.ledger.composite, c.index, id, now);
      const e = counts.get(id) ?? { assessment: 0, practice: 0, retention: 0, generatedPractice: 0 };
      const certainty = certaintyOf(v, e);
      const lo = Math.max(1, half(v.mean - 1.28 * v.sd));
      const hi = Math.min(8, half(v.mean + 1.28 * v.sd));
      const sum = summarise(v);
      const headline =
        certainty === "not_assessed"
          ? e.generatedPractice
            ? "Not assessed yet. Your spelling practice is recorded, but it does not count towards this until the practice words have been checked."
            : "Not assessed yet."
          : certainty === "early"
            ? `Early estimate: somewhere around band ${fmt(lo)} to ${fmt(hi)}. We're not sure yet: a few more questions will tell us.`
            : `About band ${fmt(half(v.mean))} of 8 (likely between ${fmt(lo)} and ${fmt(hi)}).`;
      return {
        id,
        name: v.name,
        strand: c.index.names.get(strandOf(id)) ?? "",
        guided: guided.has(id),
        certainty,
        headline,
        range: certainty === "not_assessed" ? null : `${fmt(lo)}–${fmt(hi)}`,
        band: certainty === "measured" ? half(v.mean) : null,
        verification: sum.status,
        history: sum.history,
        evidence: e,
        misconceptions: v.misconceptions.map((m) => m.id),
        view: v,
      };
    });
}

export function bandDescriptor(c: AppContent, id: string, band: number): string | null {
  const bands = c.index.leaves.get(id)?.bands ?? {};
  const keys = Object.keys(bands).map(Number).filter((b) => b <= band + 0.25).sort((a, b) => b - a);
  return keys.length ? bands[String(keys[0])] : null;
}

export function areaOf(id: string): "spelling" | "grammar" | "vocabulary" | null {
  for (const [area, caps] of Object.entries(GUIDED) as [keyof typeof GUIDED, readonly string[]][]) if (caps.includes(id)) return area;
  return null;
}
