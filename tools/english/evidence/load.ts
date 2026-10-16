/**
 * Load every spelling item the app can see (the same sources as frontend/src/english/logic/content.ts) plus the
 * provisional diagnostic bank, with the item-evidence metadata. Read-only; for the audit, checks and tests.
 * The diagnostic bank is loaded HERE ONLY: neither the app nor the engine's default bundle includes it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Context, type Item, type ItemEvidenceDoc, type ItemEvidenceIndex, indexContent, indexItemEvidence } from "../../../packages/english-core/src/index.ts";
import { CONTENT, REPO, loadBundle, loadContext, viewFor } from "../load.ts";

const json = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

export const EVIDENCE_DIR = join(CONTENT, "spelling", "evidence");
export const BANK_FILE = join(EVIDENCE_DIR, "diagnostic-bank.json");
export const ITEM_EVIDENCE_FILE = join(EVIDENCE_DIR, "item-evidence.json");

export interface Source {
  path: string;
  origin: "hand_written" | "pilot" | "generated" | "dictation" | "journey" | "diagnostic_bank" | "retired" | "test_fixture";
  /** Can the app offer it to a child today (in some mode)? The bank and test fixtures: never. */
  offeredByApp: boolean;
}

/** Every file that holds spelling items, including ones the app never offers (for identity checks). */
export const SOURCES: Source[] = [
  { path: "content/english/items/code-items.json", origin: "hand_written", offeredByApp: true },
  { path: "content/english/items/e2a-items.json", origin: "hand_written", offeredByApp: true },
  { path: "content/english/items/e2b-items.json", origin: "hand_written", offeredByApp: true },
  { path: "content/english/pilot/items.json", origin: "pilot", offeredByApp: true },
  { path: "content/english/spelling/generated-items.json", origin: "generated", offeredByApp: true },
  { path: "content/english/spelling/dictation-bank.json", origin: "dictation", offeredByApp: true },
  { path: "content/english/web/doubling-journey.json", origin: "journey", offeredByApp: true },
  { path: "content/english/spelling/evidence/diagnostic-bank.json", origin: "diagnostic_bank", offeredByApp: false },
  { path: "content/english/items/retired-versions.json", origin: "retired", offeredByApp: false },
  { path: "content/english/spelling/retired-generated.json", origin: "retired", offeredByApp: false },
  { path: "packages/english-core/test/fixtures/inflection-drafts.json", origin: "test_fixture", offeredByApp: false },
];

export function readItems(path: string): Item[] {
  const raw = json<unknown>(join(REPO, path));
  return (Array.isArray(raw) ? raw : ((raw as { items?: Item[] }).items ?? [])) as Item[];
}

export function loadItemEvidence(): ItemEvidenceIndex {
  return indexItemEvidence(json<ItemEvidenceDoc>(ITEM_EVIDENCE_FILE));
}

export interface EvidenceContent {
  ctx: Context;
  /** Active spelling items by origin (app content plus the bank). */
  items: { item: Item; origin: Source["origin"] }[];
  evidence: ItemEvidenceIndex;
}

let cached: EvidenceContent | null = null;
/** A content index with the app's spelling sources and the diagnostic bank (for audits and tests). */
export function loadEvidenceContent(): EvidenceContent {
  if (cached) return cached;
  const base = loadContext();
  const bundle = loadBundle();
  const extra: { item: Item; origin: Source["origin"] }[] = [];
  for (const s of SOURCES.filter((x) => x.origin !== "retired" && x.origin !== "test_fixture" && !x.path.includes("/items/code-items") && !x.path.includes("/items/e2a") && !x.path.includes("/items/e2b")))
    for (const item of readItems(s.path)) extra.push({ item, origin: s.origin });
  const passages = [...bundle.passages, ...json<{ id: string; title: string; band: number; text: string }[]>(join(CONTENT, "pilot", "passages.json"))];
  const content = indexContent(viewFor({ ...bundle, items: [...bundle.items, ...extra.map((x) => x.item)], passages: passages as never }, base.index), base.index);
  const items = [
    ...bundle.items.filter((i) => i.kind === "code" && i.target.startsWith("EN.FND.SPL")).map((item) => ({ item, origin: "hand_written" as const })),
    ...extra.filter((x) => x.item.kind === "code" && x.item.target.startsWith("EN.FND.SPL")),
  ];
  cached = { ctx: { ...base, content }, items, evidence: loadItemEvidence() };
  return cached;
}
