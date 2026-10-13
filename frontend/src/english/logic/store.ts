/**
 * Where a profile's events are kept: IndexedDB in the browser (this device only), or memory in tests.
 * Nothing is sent anywhere. Each append is its own transaction, so an answer is safely stored before
 * the next question appears, and a closed tab or a reload resumes exactly where it stopped.
 */
import type { AppEvent, ProfileEvent } from "./events.ts";

export interface ProfileSummary {
  id: string;
  name: string;
  createdAt: string;
  lastAt: string;
  events: number;
}

export interface Repo {
  readonly kind: "indexeddb" | "memory";
  profiles(): Promise<ProfileSummary[]>;
  load(profile: string): Promise<AppEvent[]>;
  append(profile: string, event: AppEvent): Promise<void>;
  /** Replace a profile's whole record (import). */
  replaceAll(profile: string, events: AppEvent[]): Promise<void>;
  remove(profile: string): Promise<void>;
}

const summaryOf = (profile: string, events: AppEvent[]): ProfileSummary => {
  const p = events.find((e) => e.kind === "profile") as ProfileEvent | undefined;
  return { id: profile, name: p?.name ?? "Learner", createdAt: p?.at ?? events[0]?.at ?? "", lastAt: events[events.length - 1]?.at ?? "", events: events.length };
};

export class MemoryRepo implements Repo {
  readonly kind = "memory" as const;
  private data = new Map<string, AppEvent[]>();
  async profiles() {
    return [...this.data].map(([id, ev]) => summaryOf(id, ev)).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }
  async load(profile: string) {
    return structuredClone(this.data.get(profile) ?? []);
  }
  async append(profile: string, event: AppEvent) {
    this.data.set(profile, [...(this.data.get(profile) ?? []), structuredClone(event)]);
  }
  async replaceAll(profile: string, events: AppEvent[]) {
    this.data.set(profile, structuredClone(events));
  }
  async remove(profile: string) {
    this.data.delete(profile);
  }
}

const DB = "openpath-english";
const VERSION = 1;

const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("the save was cancelled"));
  });

export class IndexedDbRepo implements Repo {
  readonly kind = "indexeddb" as const;
  private db: IDBDatabase;
  private constructor(db: IDBDatabase) {
    this.db = db;
  }

  static async open(factory: IDBFactory = indexedDB): Promise<IndexedDbRepo> {
    const r = factory.open(DB, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("profiles")) db.createObjectStore("profiles", { keyPath: "id" });
      if (!db.objectStoreNames.contains("events")) {
        const s = db.createObjectStore("events", { keyPath: ["profile", "seq"] });
        s.createIndex("profile", "profile");
      }
    };
    return new IndexedDbRepo(await req(r));
  }

  private tx(stores: string[], mode: IDBTransactionMode) {
    // "strict" asks the browser to flush to disk before reporting success, where supported
    return this.db.transaction(stores, mode, { durability: "strict" } as IDBTransactionOptions);
  }

  async profiles() {
    const all = (await req(this.tx(["profiles"], "readonly").objectStore("profiles").getAll())) as ProfileSummary[];
    return all.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }

  async load(profile: string) {
    const rows = (await req(this.tx(["events"], "readonly").objectStore("events").index("profile").getAll(IDBKeyRange.only(profile)))) as { seq: number; event: AppEvent }[];
    return rows.sort((a, b) => a.seq - b.seq).map((r) => r.event);
  }

  async append(profile: string, event: AppEvent) {
    const tx = this.tx(["profiles", "events"], "readwrite");
    const profiles = tx.objectStore("profiles");
    const current = ((await req(profiles.get(profile))) as ProfileSummary | undefined) ?? summaryOf(profile, []);
    tx.objectStore("events").add({ profile, seq: current.events, event });
    const next = { ...current, events: current.events + 1, lastAt: event.at };
    if (event.kind === "profile") Object.assign(next, { name: event.name, createdAt: event.at });
    profiles.put(next);
    await done(tx);
  }

  async replaceAll(profile: string, events: AppEvent[]) {
    const tx = this.tx(["profiles", "events"], "readwrite");
    const store = tx.objectStore("events");
    const keys = await req(store.index("profile").getAllKeys(IDBKeyRange.only(profile)));
    for (const k of keys) store.delete(k);
    events.forEach((event, seq) => store.add({ profile, seq, event }));
    tx.objectStore("profiles").put(summaryOf(profile, events));
    await done(tx);
  }

  async remove(profile: string) {
    const tx = this.tx(["profiles", "events"], "readwrite");
    const store = tx.objectStore("events");
    const keys = await req(store.index("profile").getAllKeys(IDBKeyRange.only(profile)));
    for (const k of keys) store.delete(k);
    tx.objectStore("profiles").delete(profile);
    await done(tx);
  }
}

/** IndexedDB where the browser allows it; otherwise memory, and the app warns that nothing will be kept. */
export async function openRepo(): Promise<Repo> {
  try {
    if (typeof indexedDB === "undefined") throw new Error("no IndexedDB");
    return await IndexedDbRepo.open();
  } catch {
    return new MemoryRepo();
  }
}
