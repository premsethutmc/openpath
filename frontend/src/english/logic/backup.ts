/**
 * Export and import of a whole profile, as one JSON file the learner or guardian keeps.
 *
 * The file is the complete event list, so importing it on any device rebuilds exactly the same state
 * (the engine's estimates, word memory, lessons, sessions in progress). A checksum catches a damaged
 * or edited file; nothing in the file is trusted beyond what the engine itself re-derives.
 */
import { fnv1a } from "../../../../packages/english-core/src/index.ts";
import { APP_VERSION, type AppEvent, type ProfileEvent, eventProblem } from "./events.ts";

export const BACKUP_FORMAT = "openpath-english-backup";
export const BACKUP_VERSION = 1;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  app: string;
  exported_at: string;
  framework: string;
  profile: { id: string; name: string };
  note: string;
  events: AppEvent[];
  checksum: string;
}

export const checksum = (events: AppEvent[]) => fnv1a(JSON.stringify(events));

export function exportBackup(events: AppEvent[], framework: string, now: string): Backup {
  const p = events.find((e) => e.kind === "profile") as ProfileEvent | undefined;
  if (!p) throw new Error("this profile has no profile record");
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: APP_VERSION,
    exported_at: now,
    framework,
    profile: { id: p.id, name: p.name },
    note: "OpenPath English progress, exported from this device. It contains the display name and every answer given. Keep it private.",
    events,
    checksum: checksum(events),
  };
}

export type Parsed = { ok: true; backup: Backup } | { ok: false; error: string };

export function parseBackup(text: string): Parsed {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file is not an OpenPath backup (it is not JSON)." };
  }
  const b = raw as Partial<Backup>;
  if (!b || b.format !== BACKUP_FORMAT) return { ok: false, error: "This file is not an OpenPath English backup." };
  if (b.version !== BACKUP_VERSION) return { ok: false, error: `This backup is format version ${String(b.version)}, which this version of the app cannot read.` };
  if (!Array.isArray(b.events) || !b.events.length) return { ok: false, error: "The backup has no events." };
  for (const e of b.events) {
    const p = eventProblem(e);
    if (p) return { ok: false, error: `The backup is damaged: ${p}.` };
  }
  if (b.checksum !== checksum(b.events)) return { ok: false, error: "The backup is damaged or has been edited (its checksum does not match)." };
  const profile = b.events[0] as ProfileEvent;
  if (profile.kind !== "profile" || !b.profile || profile.id !== b.profile.id) return { ok: false, error: "The backup does not start with its profile." };
  const ids = new Set<string>();
  for (const e of b.events) {
    if (ids.has(e.id)) return { ok: false, error: `The backup is damaged: event ${e.id} appears twice.` };
    ids.add(e.id);
  }
  return { ok: true, backup: b as Backup };
}
