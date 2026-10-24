/**
 * The proposed plural-noun questions (content/english/proposed/g8-plurals-v1): loading only. Organised by competency
 * coverage (six sub-skills, each with diagnostic, independent, transfer and delayed-retention questions).
 *
 * Like the Grade 8 supplement, they are NOT part of the bank the app ships (frontend/src/english/logic/content.ts never
 * loads this folder), and every question is evidence_status "provisional": even if loaded, the ledger holds every
 * answer and the allocation offers them for practice only. They count only after an educator review changes their
 * status; for the pilot, verified mastery needs them marked "validated" (verification-eligibility@2: validated and released, answered after the release).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Context, type EssayContext, indexContent, type Item, type ItemPool } from "../../../packages/english-core/src/index.ts";
import { loadAppEssayContext } from "../essay-load.ts";
import { CONTENT, viewFor } from "../load.ts";

export const PLURALS_DIR = join(CONTENT, "proposed", "g8-plurals-v1");
export type PluralCoverage = "regular" | "irregular" | "already_plural" | "number_plural" | "quantifiers" | "countable_uncountable";
export type PluralUse = "diagnostic" | "independent" | "transfer" | "retention";
export const PLURAL_COVERAGE: PluralCoverage[] = ["regular", "irregular", "already_plural", "number_plural", "quantifiers", "countable_uncountable"];

export interface PluralManifest {
  version: string;
  status: string;
  provenance: string;
  competency: string;
  coverage: Record<string, PluralCoverage>;
  proposedUse: Record<string, PluralUse>;
  /** The pool each question is proposed for once reviewed (transfer questions are later independent checks). */
  proposedPools: Record<string, ItemPool>;
}

export const loadPluralItems = (): Item[] => JSON.parse(readFileSync(join(PLURALS_DIR, "items.json"), "utf8")) as Item[];
export const loadPluralManifest = (): PluralManifest => JSON.parse(readFileSync(join(PLURALS_DIR, "manifest.json"), "utf8")) as PluralManifest;

/**
 * The app's essay context with the proposed plural questions added. `asIfReviewed` is a counterfactual for research
 * and tests only: on a copy, it marks them "validated" (as an approving educator review would) and applies the
 * proposed pools, to ask "would reviewed content of this coverage make verification possible?". Never used by the app.
 */
export function loadContextWithPlurals(opts: { asIfReviewed?: boolean; releasedAt?: string } = {}): EssayContext {
  const app = loadAppEssayContext();
  // H-V3: a reviewed version also says when it was released (a counterfactual date, before any test journey by default)
  const releasedAt = opts.releasedAt ?? "2026-01-01T00:00:00.000Z";
  const items = loadPluralItems().map((i) => (opts.asIfReviewed ? ({ ...i, evidence_status: "validated", released_at: releasedAt, review: "hypothetically-reviewed" } as Item) : i));
  const bundle = {
    items: [...app.ctx.content.items.values(), ...items],
    retired: [...(app.ctx.content.retired?.values() ?? [])],
    passages: [...app.ctx.content.passages.values()],
    goals: [...app.ctx.content.goals.values()],
    misspellings: Object.fromEntries(app.ctx.content.misspellings),
  };
  const content = indexContent(viewFor(bundle as never, app.ctx.index), app.ctx.index);
  const ctx: Context = { ...app.ctx, content };
  const pools = new Map(app.pools);
  if (opts.asIfReviewed) for (const [id, p] of Object.entries(loadPluralManifest().proposedPools)) pools.set(id, p);
  return { ...app, ctx, pools };
}
