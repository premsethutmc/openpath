/**
 * A local-file learner store for Node (the simulator, the demo and a future
 * server). Browser and app stores implement the same LearnerStore interface.
 *
 *   <dir>/events.jsonl     the ledger: append-only, the only thing that must be kept
 *   <dir>/snapshot.json    cached composite and decision log (rebuildable)
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { LearnerStore, LedgerEvent, Snapshot } from "../../packages/english-core/src/index.ts";

export class FileStore implements LearnerStore {
  readonly dir: string;
  constructor(dir: string) {
    this.dir = dir;
    mkdirSync(dir, { recursive: true });
  }
  async append(event: LedgerEvent): Promise<void> {
    appendFileSync(join(this.dir, "events.jsonl"), JSON.stringify(event) + "\n");
  }
  async events(): Promise<LedgerEvent[]> {
    const path = join(this.dir, "events.jsonl");
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as LedgerEvent);
  }
  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    writeFileSync(join(this.dir, "snapshot.json"), JSON.stringify(snapshot));
  }
  async loadSnapshot(): Promise<Snapshot | null> {
    const path = join(this.dir, "snapshot.json");
    return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Snapshot) : null;
  }
}
