/**
 * The proposed Grade 8 supplemental bank (content/english/proposed/g8-supplement-v1): loading only.
 *
 * The proposed questions are NOT part of the bank the app ships: frontend/src/english/logic/content.ts never loads
 * this folder. They are also marked evidence_status "provisional", so even if loaded, the ledger holds every answer
 * (no estimate change) and the allocation offers them for practice only, never for an independent check or the
 * delayed retention check. They can count only after an educator review changes their status.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Context, type EssayContext, indexContent, type Item, type ItemPool } from "../../../packages/english-core/src/index.ts";
import { loadAppEssayContext } from "../essay-load.ts";
import { CONTENT, viewFor } from "../load.ts";

export const SUPPLEMENT_DIR = join(CONTENT, "proposed", "g8-supplement-v1");

export interface SupplementManifest {
  version: string;
  status: string;
  provenance: string;
  /** The use each question is proposed for once reviewed (confirmation = independent check, retention = delayed check). */
  proposedPools: Record<string, ItemPool>;
}

export const loadSupplementItems = (): Item[] => JSON.parse(readFileSync(join(SUPPLEMENT_DIR, "items.json"), "utf8")) as Item[];
export const loadSupplementManifest = (): SupplementManifest => JSON.parse(readFileSync(join(SUPPLEMENT_DIR, "manifest.json"), "utf8")) as SupplementManifest;

/**
 * The app's essay context with the proposed questions added. `asIfReviewed` is for counterfactual research only:
 * it drops the provisional mark and adds the proposed pools on a copy, to ask "what would reviewed content change?".
 * It is never used by the app.
 */
export function loadContextWithSupplement(opts: { asIfReviewed?: boolean } = {}): EssayContext {
  const app = loadAppEssayContext();
  const items = loadSupplementItems().map((i) => (opts.asIfReviewed ? stripProvisional(i) : i));
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
  if (opts.asIfReviewed) for (const [id, p] of Object.entries(loadSupplementManifest().proposedPools)) pools.set(id, p);
  return { ...app, ctx, pools };
}

function stripProvisional(i: Item): Item {
  const { evidence_status: _drop, ...rest } = i as Item & { evidence_status?: string };
  return { ...rest, review: "hypothetically-reviewed" } as Item;
}
