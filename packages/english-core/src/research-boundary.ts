/**
 * The boundary through which eligible spelling evidence may one day reach the research engine
 * (premsethutmc/openpath-research, @openpath/learning-engine). Versioned, reversible, read-only, and OFF.
 *
 * This reuses the research engine's existing integration contract instead of a new one: the research shadow adapter
 * (src/shadow.mjs there) already consumes production LedgerEvent[] unchanged plus an item index
 * (schemas/item-index.schema.json there). This module only prepares those two inputs, never runs the research engine,
 * never writes to the ledger and never changes anything a learner sees.
 *
 *   mode "off"     (default) nothing is produced
 *   mode "shadow"  a copy of the eligible evidence and the item index is produced for offline comparison; for real
 *                  learners only with a recorded approval (the owner's separate decision); never actionable
 *   anything else  refused, including "active": the production planner stays authoritative
 */
import { contentStatus, guessingFloor, type ContentIndex } from "./content.ts";
import { type ItemEvidenceIndex, evidenceOf, evidenceEligibility, modeOf, answerOf } from "./item-evidence.ts";
import type { Item, LedgerEvent } from "./types.ts";

export const RESEARCH_BOUNDARY = Object.freeze({
  version: "research-evidence-boundary@1",
  /** The research contract reused (research repository, branch feat/versioned-engine-contract). */
  contract: { api: "1.0", itemIndexSchema: "openpath/learning-engine/item-index.v1", researchRelease: "0.2.0", researchCommit: "2f338431c89dd0ea9ff8e5244d6c57883ffba6ab" },
  defaultMode: "off" as const,
});

export type ResearchMode = "off" | "shadow";

export interface ResearchApproval {
  /** Who approved shadow mode for real learners, when, and the record of the decision. */
  by: string;
  date: string;
  record: string;
}

export interface ResearchBoundaryConfig {
  mode: ResearchMode;
  /** Whose evidence: synthetic (tests, simulations) or real learners. */
  learners: "synthetic" | "real";
  approval?: ResearchApproval;
}

export const RESEARCH_BOUNDARY_DEFAULT: ResearchBoundaryConfig = Object.freeze({ mode: "off", learners: "real" });

/** Validate a configuration; throws for anything that is not explicitly allowed. */
export function researchMode(cfg: ResearchBoundaryConfig = RESEARCH_BOUNDARY_DEFAULT): ResearchMode {
  const mode = (cfg as { mode: string }).mode;
  if (mode === "active") throw new Error("research engine activation is not supported: the production planner is authoritative");
  if (mode !== "off" && mode !== "shadow") throw new Error(`unknown research mode ${mode}`);
  if (cfg.learners !== "synthetic" && cfg.learners !== "real") throw new Error("say whose evidence this is: synthetic or real");
  if (mode === "shadow" && cfg.learners === "real" && !(cfg.approval?.by && cfg.approval?.date && cfg.approval?.record))
    throw new Error("shadow mode for real learners needs a recorded approval (by, date, record)");
  return mode;
}

export interface ResearchItemEntry {
  capability: string;
  rule: string;
  role: "apply" | "contrast";
  mode: "production" | "recognition";
  guess: number;
  lemma: string | null;
  word: string;
  answers?: string[];
  wrong?: Record<string, string>;
  options?: string[];
  answer?: number;
  distractor_tags?: Record<string, string>;
  status: "candidate" | "validated" | "provisional" | "practice";
  /** Evidence eligibility, separate from availability (item-evidence.ts). */
  eligibility: { practiceOnly: boolean; demonstrates: boolean; verifies: boolean };
}

/** The item index the research shadow adapter expects, for every spelling inflection item that has a rule. */
export function researchItemIndex(items: Iterable<Item>, evidence: ItemEvidenceIndex): Record<string, ResearchItemEntry> {
  const out: Record<string, ResearchItemEntry> = {};
  for (const item of items) {
    if (item.kind !== "code" || item.target !== "EN.FND.SPL.inflections" || !item.step) continue;
    const m = evidenceOf(item, evidence);
    if (m?.principle_link_only) continue;
    const e = evidenceEligibility(item);
    out[`${item.id}@${item.version}`] = {
      capability: item.target,
      rule: item.step,
      role: m?.polarity === "contrast" || (item.family ?? "").endsWith(".contrast") ? "contrast" : "apply",
      mode: modeOf(item),
      guess: guessingFloor(item),
      lemma: m?.lemma ?? null,
      word: answerOf(item) ?? "",
      ...(item.answers ? { answers: item.answers } : {}),
      ...(item.wrong ? { wrong: item.wrong } : {}),
      ...(item.options ? { options: item.options } : {}),
      ...(item.answer !== undefined ? { answer: item.answer } : {}),
      ...(item.distractor_tags ? { distractor_tags: item.distractor_tags } : {}),
      status: contentStatus(item) as ResearchItemEntry["status"],
      eligibility: { practiceOnly: e.practiceOnly, demonstrates: e.demonstrates, verifies: e.verifies },
    };
  }
  return out;
}

export interface ResearchBatch {
  boundary: string;
  contract: typeof RESEARCH_BOUNDARY.contract;
  mode: "shadow";
  learners: "synthetic" | "real";
  approval: ResearchApproval | null;
  actionable: false;
  /** Copies of the ledger's evidence and intervention events on spelling inflection items (production shape, unchanged). */
  events: LedgerEvent[];
  itemIndex: Record<string, ResearchItemEntry>;
}

/**
 * What the boundary would hand to the research engine for one learner's ledger. Returns null when off. The ledger is
 * never modified (events are deep copies). Practice-only (unchecked generated) items stay in the index, marked so: the
 * research adapter applies the same eligibility.
 */
export function researchBatch(ledgerEvents: readonly LedgerEvent[], content: ContentIndex, evidence: ItemEvidenceIndex, cfg: ResearchBoundaryConfig = RESEARCH_BOUNDARY_DEFAULT): ResearchBatch | null {
  const mode = researchMode(cfg);
  if (mode === "off") return null;
  const index = researchItemIndex(content.items.values(), evidence);
  const keep = (e: LedgerEvent) =>
    (e.kind === "evidence" && !!index[`${e.item.id}@${e.item.version}`]) || (e.kind === "intervention" && e.capability === "EN.FND.SPL.inflections");
  return {
    boundary: RESEARCH_BOUNDARY.version,
    contract: RESEARCH_BOUNDARY.contract,
    mode: "shadow",
    learners: cfg.learners,
    approval: cfg.approval ?? null,
    actionable: false,
    events: structuredClone(ledgerEvents.filter(keep)) as LedgerEvent[],
    itemIndex: index,
  };
}
