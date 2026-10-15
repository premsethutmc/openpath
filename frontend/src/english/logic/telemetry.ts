/**
 * Performance and error measurements from the app, for the developer dashboard.
 *
 * Measurements are a name from a fixed list, a duration and a short technical detail. They never carry answers,
 * names, emails or anything typed by a learner. They are kept in a small buffer; when the app is signed in to a
 * parent account a sender is installed (see account.ts) that posts them to the API, otherwise they stay on the
 * device and are dropped.
 */

export type MetricName = "answer_ms" | "save_ms" | "rebuild_ms" | "select_ms" | "load_ms" | "save_failed" | "runtime_error" | "engine_error";

export interface Metric {
  name: MetricName;
  ms?: number;
  ok?: boolean;
  /** A short technical detail (an Error is reduced to its class and first line). */
  detail?: string;
}

declare const __OPENPATH_COMMIT__: string | undefined;

/** The build's commit, set by the build (scripts/build-english.mjs); "dev" when run from source. */
export const APP_BUILD: string = typeof __OPENPATH_COMMIT__ === "string" && __OPENPATH_COMMIT__ ? __OPENPATH_COMMIT__ : "dev";

const LIMIT = 200;
let buffer: Metric[] = [];
let sender: ((batch: Metric[]) => Promise<void>) | null = null;
let flushing = false;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}/g; // a domain ending in letters: version keys such as en@0.2.0 are kept

/** A technical detail: first line only, emails removed, short. */
export function scrub(detail: unknown): string {
  const text = detail instanceof Error ? `${detail.name}: ${detail.message}` : String(detail ?? "");
  return text.split("\n")[0].replace(EMAIL, "[email]").slice(0, 200);
}

let mutedDepth = 0;
/** Run work that is not the learner's (a diagnostic replay on a copy) without recording measurements. */
export async function muted<T>(f: () => Promise<T>): Promise<T> {
  mutedDepth++;
  try {
    return await f();
  } finally {
    mutedDepth--;
  }
}

export function record(m: Omit<Metric, "detail"> & { detail?: unknown }): void {
  if (mutedDepth > 0) return;
  const clean: Metric = { name: m.name, ...(m.ms !== undefined && Number.isFinite(m.ms) ? { ms: Math.round(m.ms * 10) / 10 } : {}), ...(m.ok === false ? { ok: false } : {}), ...(m.detail ? { detail: scrub(m.detail) } : {}) };
  buffer.push(clean);
  if (buffer.length > LIMIT) buffer = buffer.slice(-LIMIT);
  if (sender && (buffer.length >= 25 || clean.ok === false)) void flush();
}

/** Time a step: records `name` with the duration, and returns the step's result. */
export function timed<T>(name: MetricName, f: () => T): T {
  const t = now();
  const out = f();
  record({ name, ms: now() - t });
  return out;
}

export const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function pending(): Metric[] {
  return [...buffer];
}

/** Install (or remove) the sender. Called by the account layer when a parent signs in or out. */
export function setSender(f: ((batch: Metric[]) => Promise<void>) | null): void {
  sender = f;
  if (!f) buffer = [];
}

export async function flush(): Promise<void> {
  if (!sender || flushing || !buffer.length) return;
  flushing = true;
  const batch = buffer.slice(0, 50);
  buffer = buffer.slice(batch.length);
  try {
    await sender(batch);
  } catch {
    // measurements are best effort: never retried, never shown to the learner
  } finally {
    flushing = false;
  }
}

let installed = false;
/** Catch uncaught errors in the browser and send buffered measurements periodically and when the page is hidden. */
export function installBrowserHooks(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => record({ name: "runtime_error", ok: false, detail: e.error ?? e.message }));
  window.addEventListener("unhandledrejection", (e) => record({ name: "runtime_error", ok: false, detail: (e as PromiseRejectionEvent).reason }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  setInterval(() => void flush(), 30_000);
}
