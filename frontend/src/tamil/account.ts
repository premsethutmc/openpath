/**
 * icse-tamil@2: Tamil progress kept in the learner's account, as English and maths are. Signed in → answers are appended
 * as events (subject "tamil") and progress is rebuilt from them on any device. Not signed in → the device keeps it.
 */
import type { Progress } from "../../../packages/tamil/src/icse";

export type Pupil = { id: string; display_name: string };
export type TamilAnswer = { kind: "tamil.answer"; id: string; at: string; q: string; right: boolean };
export type TamilWriting = { kind: "tamil.writing"; id: string; at: string; task: string; words: number };
type TamilEvent = TamilAnswer | TamilWriting;

const cookie = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";

export async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRFToken"] = decodeURIComponent(cookie("csrftoken"));
  const r = await fetch(`/api${path}`, { method, credentials: "same-origin", headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((data as { detail?: string }).detail ?? `HTTP ${r.status}`), { status: r.status, data });
  return data as T;
}

/** The signed-in account's pupils, or null when nobody is signed in (or there is no account server). */
export async function pupils(): Promise<Pupil[] | null> {
  try {
    const a = await call<{ authenticated?: boolean }>("GET", "/account/");
    if (!a.authenticated) return null;
    return (await call<{ pupils: Pupil[] }>("GET", "/pupils/")).pupils;
  } catch {
    return null;
  }
}

/** Fold answers into progress: right/wrong counts per question. */
export function fold(events: { kind?: string; q?: string; right?: boolean }[], into: Progress = {}): Progress {
  const p: Progress = { ...into };
  for (const e of events) {
    if (e.kind !== "tamil.answer" || typeof e.q !== "string") continue;
    const was = p[e.q] ?? { right: 0, wrong: 0 };
    p[e.q] = e.right ? { ...was, right: was.right + 1 } : { ...was, wrong: was.wrong + 1 };
  }
  return p;
}

/** The larger count of each, so answers given on this device before signing in are not lost from view. */
export function merge(a: Progress, b: Progress): Progress {
  const out: Progress = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = { right: Math.max(v.right, out[k]?.right ?? 0), wrong: Math.max(v.wrong, out[k]?.wrong ?? 0) };
  return out;
}

export class TamilRecord {
  private count = 0;
  private queue: Promise<unknown> = Promise.resolve();
  readonly pupil: string;
  constructor(pupil: string) {
    this.pupil = pupil;
  }
  async load(): Promise<Progress> {
    const r = await call<{ count: number; events: TamilEvent[] }>("GET", `/pupils/${this.pupil}/events/?subject=tamil`);
    this.count = r.count;
    return fold(r.events);
  }
  /** Appended in order; a lost connection is retried once after reloading the count. Never throws to the caller. */
  append(event: TamilEvent): Promise<boolean> {
    const work = this.queue.then(async () => {
      for (let tryNo = 0; tryNo < 2; tryNo++) {
        try {
          const r = await call<{ count: number }>("POST", `/pupils/${this.pupil}/events/`, { subject: "tamil", seq: this.count, event });
          this.count = r.count;
          return true;
        } catch {
          try {
            await this.load();
          } catch {
            /* offline */
          }
        }
      }
      return false;
    });
    this.queue = work.catch(() => false);
    return work;
  }
}

export const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
