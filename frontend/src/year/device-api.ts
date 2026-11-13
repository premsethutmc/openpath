/**
 * device-mode@1: My Learning Year without an account server (the hosted demo has none).
 *
 * The app talks to its server through `Api`, which takes the `fetch` it should use. In a device build that fetch is this one:
 * it answers the same paths from the browser's own storage, so the app above it is unchanged. Nothing leaves the device.
 *
 * What it is NOT: the server. The server checks every record it stores and can record its own grading decision; here a record
 * is stored as the app made it, with no server decision inside it, and the app's own grading stands: the result shown after an
 * answer is the app's assessment (grading mode "unified", in which the app's assessment may be shown), and replay compares a
 * stored answer again, as it does for any record without a server decision. The simulations and unit tests run the learning
 * engine the same way, without a server. Features that need other people's accounts (an educator's
 * marks, handover acknowledgements, sharing) answer "not available here" (404) and the app shows none.
 *
 * A record lives in one browser on one device: clearing the browser's site data removes it, and it cannot be opened elsewhere.
 */
type Fetch = (input: string, init?: RequestInit) => Promise<Response>;
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
interface Pupil { id: string; display_name: string; created_at: string; last_at: string | null; events: number; developer_access: boolean }

const KEY = "openpath.device.v1";
const SUBJECTS = new Set(["english", "mathematics"]);
/** One learner's record may hold this many events (the server's own limit is of the same order). */
export const DEVICE_MAX_EVENTS = 20000;
export const DEVICE_MAX_PUPILS = 12;

const json = (status: number, body: unknown) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const uid = () => globalThis.crypto?.randomUUID?.() ?? "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ ((Math.random() * 16) >> (Number(c) / 4))).toString(16));

export function deviceFetch(store: Store = globalThis.localStorage, now: () => Date = () => new Date(), base = "/api"): Fetch {
  const read = <T,>(k: string, otherwise: T): T => {
    try { const v = store.getItem(`${KEY}.${k}`); return v === null ? otherwise : (JSON.parse(v) as T); } catch { return otherwise; }
  };
  /** false when the browser refuses (storage full or switched off): the caller answers with an error, never loses silently */
  const write = (k: string, v: unknown) => { try { store.setItem(`${KEY}.${k}`, JSON.stringify(v)); return true; } catch { return false; } };
  const pupils = () => read<Pupil[]>("pupils", []);
  const eventsKey = (id: string, subject: string) => `events.${id}.${subject}`;
  const FULL = { detail: "This browser could not save the record (its storage is full or switched off). Nothing was lost on the page, but it will not be kept." };

  return async (input, init = {}) => {
    const url = new URL(input, "http://device.local");
    if (!url.pathname.startsWith(`${base}/`)) return json(404, { detail: "Not found." });
    const path = url.pathname.slice(base.length);
    const method = (init.method ?? "GET").toUpperCase();
    let body: Record<string, unknown> = {};
    if (typeof init.body === "string" && init.body) { try { body = JSON.parse(init.body); } catch { return json(400, { detail: "The request could not be read." }); } }

    if (path === "/account/" && method === "GET") return json(200, { authenticated: true, email: "This device", pupils: pupils().length, accounts: true, device: true });
    if (path === "/account/logout/" && method === "POST") return json(204, null);
    if (path.startsWith("/account/")) return json(404, { detail: "There are no accounts here: OpenPath is running on this device only." });

    if (path === "/pupils/") {
      const all = pupils();
      if (method === "GET") return json(200, { pupils: all });
      if (method === "POST") {
        const name = typeof body.display_name === "string" ? body.display_name.trim() : "";
        if (!name || name.length > 60) return json(400, { display_name: "Give a name of at most 60 characters." });
        if (all.length >= DEVICE_MAX_PUPILS) return json(400, { detail: `This device holds at most ${DEVICE_MAX_PUPILS} learners.` });
        const p: Pupil = { id: uid(), display_name: name, created_at: now().toISOString(), last_at: null, events: 0, developer_access: false };
        return write("pupils", [...all, p]) ? json(201, p) : json(507, FULL);
      }
    }

    const m = path.match(/^\/pupils\/([0-9a-f-]{36})\/(.*)$/);
    if (!m) return json(404, { detail: "Not available on this device." });
    const [, id, rest] = m;
    const all = pupils();
    const pupil = all.find((p) => p.id === id);
    if (!pupil) return json(404, { detail: "No such learner on this device." });

    if (rest === "" && method === "DELETE") {
      for (const s of SUBJECTS) store.removeItem(`${KEY}.${eventsKey(id, s)}`);
      return write("pupils", all.filter((p) => p.id !== id)) ? json(204, null) : json(507, FULL);
    }
    if (rest === "events/") {
      const subject = String((method === "GET" ? url.searchParams.get("subject") : body.subject) ?? "english");
      if (!SUBJECTS.has(subject)) return json(400, { subject: "Unknown subject." });
      const events = read<Record<string, unknown>[]>(eventsKey(id, subject), []);
      if (method === "GET") return json(200, { subject, count: events.length, events, ...(subject === "mathematics" ? { gradingMode: "unified", decisions: {} } : {}) });
      if (method === "POST") {
        const { seq, event } = body as { seq?: unknown; event?: Record<string, unknown> };
        if (typeof seq !== "number" || !Number.isInteger(seq) || seq < 0) return json(400, { seq: "Give the event's position in the record." });
        if (!event || typeof event !== "object" || Array.isArray(event) || typeof event.kind !== "string") return json(400, { event: "Give the event." });
        // one record, one order: a second tab that loaded the record earlier is told to reload, as the server tells a second device
        if (seq !== events.length) return json(409, { detail: "The record has changed since it was loaded (another tab?). Reload and try again.", count: events.length });
        if (events.length >= DEVICE_MAX_EVENTS) return json(400, { detail: "This record is full." });
        if (events.some((e) => e.id !== undefined && e.id === event.id)) return json(400, { event: "This activity is already recorded." });
        const at = now().toISOString();
        // the time of a mathematics record is the storing clock's, as on the server
        const stored = subject === "mathematics" ? { ...event, at } : event;
        if (!write(eventsKey(id, subject), [...events, stored])) return json(507, FULL);
        write("pupils", all.map((p) => (p.id === id ? { ...p, last_at: at, events: p.events + 1 } : p)));
        return json(201, { count: events.length + 1, at: stored.at });
      }
    }
    return json(404, { detail: "Not available on this device." });
  };
}

/** device-mode@1 is a build choice (`build-year.mjs --device`): a build with a server never contains a working device store. */
declare const OPENPATH_DEVICE: boolean;
export const DEVICE_BUILD = typeof OPENPATH_DEVICE !== "undefined" && OPENPATH_DEVICE === true;
export const apiOptions = (): { fetch?: Fetch } => (typeof OPENPATH_DEVICE !== "undefined" && OPENPATH_DEVICE === true ? { fetch: deviceFetch() } : {});
