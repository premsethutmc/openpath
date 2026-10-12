/**
 * Local-first learner storage.
 *
 * The ledger (append-only events) is the only thing that must be kept. The
 * decision log and composite are derived and stored as a cache, so a device
 * can open instantly and still prove its cache matches a full rebuild.
 * Browser (IndexedDB) and app (SQLite) stores implement this same interface
 * later; the local-file store for Node lives in tools/english/file-store.ts.
 */
import type { Composite, Decision, LedgerEvent } from "./types.ts";

export interface Snapshot {
  composite: Composite;
  decisions: Decision[];
}

export interface LearnerStore {
  append(event: LedgerEvent): Promise<void>;
  events(): Promise<LedgerEvent[]>;
  saveSnapshot(snapshot: Snapshot): Promise<void>;
  loadSnapshot(): Promise<Snapshot | null>;
}

export class MemoryStore implements LearnerStore {
  private log: LedgerEvent[] = [];
  private snap: Snapshot | null = null;
  async append(event: LedgerEvent): Promise<void> {
    this.log.push(structuredClone(event));
  }
  async events(): Promise<LedgerEvent[]> {
    return structuredClone(this.log);
  }
  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    this.snap = structuredClone(snapshot);
  }
  async loadSnapshot(): Promise<Snapshot | null> {
    return this.snap ? structuredClone(this.snap) : null;
  }
}
