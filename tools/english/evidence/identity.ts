/**
 * Item identity (Assessment Evidence v1): one id@version means one question, forever.
 *
 *   node tools/english/evidence/identity.ts --check    CI: fail on any conflict, change or disappearance
 *   node tools/english/evidence/identity.ts --update   record NEW id@versions in the lock (a visible diff)
 *
 * The lock (content/english/items/identity-lock.json) holds the fingerprint of every spelling id@version in every
 * file that holds items, including retired versions, the provisional diagnostic bank and test fixtures. Learner
 * evidence refers to items by id@version, so:
 *   - two files may hold the same id@version only with identical content (the doubling journey's copies);
 *   - a locked id@version may never change content (change it by adding a new version) and may never disappear
 *     (retire it instead), so old evidence is never silently reinterpreted;
 *   - renames are recorded in content/english/items/renamed-ids.json and are allowed only for ids that no learner
 *     could have answered (test fixtures).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fingerprint } from "../pilot/review.ts";
import { REPO } from "../load.ts";
import { SOURCES, readItems } from "./load.ts";

export const LOCK_FILE = join(REPO, "content", "english", "items", "identity-lock.json");
export const RENAMES_FILE = join(REPO, "content", "english", "items", "renamed-ids.json");

export interface LockEntry {
  fingerprint: string;
  sources: string[];
}
export interface Lock {
  schema: "openpath.item-identity-lock@1";
  note: string;
  items: Record<string, LockEntry>;
}
export interface Rename {
  from: string;
  to: string;
  where: string;
  date: string;
  reason: string;
}

/**
 * The fields that decide what an answer to the item MEANS: what was asked, how it is scored, which capability, rule
 * and exposure family it is evidence for. Review state (review, evidence_status, generated.checked), difficulty
 * estimates (a, b), rationale and feedback text are left out: an educator validating an item, or a calibration study
 * re-estimating its difficulty, does not change what earlier answers to it meant.
 */
export const IDENTITY_FIELDS = ["kind", "target", "step", "family", "format", "prompt", "passage", "options", "answer", "answers", "wrong", "distractor_tags", "answer_order", "left", "answer_pairs", "answer_set", "speak", "sentence"] as const;

export function identityFingerprint(item: Record<string, unknown>): string {
  const pick: Record<string, unknown> = {};
  for (const f of IDENTITY_FIELDS) if (item[f] !== undefined) pick[f] = item[f];
  const g = item.generated as Record<string, unknown> | undefined;
  if (g) pick.generated = { word: g.word, base: g.base, join: g.join, template: g.template };
  return fingerprint(pick);
}

/** Current spelling id@versions with their fingerprints and files (all sources, including fixtures and retired). */
export function currentIdentities(): { entries: Map<string, LockEntry>; conflicts: string[] } {
  const seen = new Map<string, { fp: string; sources: string[] }[]>();
  for (const s of SOURCES)
    for (const item of readItems(s.path)) {
      if (item.kind !== "code" || !item.target.startsWith("EN.FND.SPL")) continue;
      const k = `${item.id}@${item.version}`;
      const fp = identityFingerprint(item as unknown as Record<string, unknown>);
      const list = seen.get(k) ?? [];
      const same = list.find((x) => x.fp === fp);
      if (same) same.sources.push(s.path);
      else list.push({ fp, sources: [s.path] });
      seen.set(k, list);
    }
  const entries = new Map<string, LockEntry>();
  const conflicts: string[] = [];
  for (const [k, list] of [...seen].sort(([a], [b]) => a.localeCompare(b))) {
    if (list.length > 1) conflicts.push(`${k} names ${list.length} different questions: ${list.map((x) => x.sources.join(" + ")).join(" | ")}`);
    entries.set(k, { fingerprint: list[0].fp, sources: [...new Set(list[0].sources)].sort() });
  }
  return { entries, conflicts };
}

export function readLock(): Lock {
  return JSON.parse(readFileSync(LOCK_FILE, "utf8")) as Lock;
}

export function readRenames(): Rename[] {
  return (JSON.parse(readFileSync(RENAMES_FILE, "utf8")) as { renames: Rename[] }).renames;
}

/** Every problem with item identity today (empty when sound). */
export function identityProblems(lock: Lock = readLock()): string[] {
  const { entries, conflicts } = currentIdentities();
  const problems = [...conflicts];
  for (const [k, e] of Object.entries(lock.items)) {
    const now = entries.get(k);
    if (!now) problems.push(`${k} is locked but no longer exists in any file: retire it (add a new version) instead of removing it`);
    else if (now.fingerprint !== e.fingerprint) problems.push(`${k} changed content without a new version (locked ${e.fingerprint}, now ${now.fingerprint}): earlier answers would be reinterpreted`);
  }
  for (const k of entries.keys()) if (!lock.items[k]) problems.push(`${k} is new: record it with --update`);
  for (const r of readRenames()) {
    if (!r.where.includes("test/fixtures")) problems.push(`rename ${r.from} -> ${r.to} is outside a test fixture: real content may not be renamed`);
    const to = entries.get(r.to);
    if (!to || !to.sources.includes(r.where)) problems.push(`rename target ${r.to} is not in ${r.where}`);
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--update")) {
    const { entries, conflicts } = currentIdentities();
    if (conflicts.length) {
      console.error(conflicts.join("\n"));
      process.exit(1);
    }
    let old: Lock | null = null;
    try {
      old = readLock();
    } catch {}
    for (const [k, e] of Object.entries(old?.items ?? {})) {
      const now = entries.get(k);
      if (!now || now.fingerprint !== e.fingerprint) {
        console.error(`refusing to update: ${k} ${now ? "changed" : "disappeared"} (identity is permanent)`);
        process.exit(1);
      }
    }
    const lock: Lock = {
      schema: "openpath.item-identity-lock@1",
      note: "Identity fingerprint (tools/english/evidence/identity.ts IDENTITY_FIELDS: what an answer means; review state and difficulty estimates excluded) of every spelling item id@version in every file that holds items. An id@version never changes meaning: change content by adding a version, retire instead of deleting. Maintained by tools/english/evidence/identity.ts.",
      items: Object.fromEntries(entries),
    };
    writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 1) + "\n");
    console.log(`identity lock: ${entries.size} id@versions`);
  } else {
    const problems = identityProblems();
    if (problems.length) {
      console.error(problems.join("\n"));
      process.exit(1);
    }
    console.log(`item identity: ${Object.keys(readLock().items).length} id@versions, no conflicts, nothing changed or removed`);
  }
}
