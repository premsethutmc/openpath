/**
 * Parent accounts and the server copy of each pupil's record.
 *
 * The browser talks only to its own origin (/api, forwarded to Django by the app's server). Signing in sets an
 * HttpOnly session cookie that this code never sees; every change sends Django's CSRF token from its cookie. No
 * password is stored or checked here: Django does that.
 *
 * ServerRepo is a Repo like the device's IndexedDB one: the same append-only event list per pupil, so the Learner,
 * the engine and every screen work unchanged. The engine replays the events to build the Learner Vector; the server
 * keeps the events, never a score in their place.
 */
import type { AppEvent } from "./events.ts";
import type { ProfileSummary, Repo } from "./store.ts";

export interface AccountInfo {
  authenticated: boolean;
  email?: string;
  pupils?: number;
}

export interface PupilSummary {
  id: string;
  display_name: string;
  created_at: string;
  last_at: string | null;
  events: number;
}

/** A refusal from the API, with Django's message(s) in plain words. */
export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;
  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

const readCookie = (name: string): string => {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
};

function messageOf(body: unknown, status: number): { message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  if (body && typeof body === "object") {
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) fields[k] = Array.isArray(v) ? v.join(" ") : String(v);
  }
  const message = fields.detail ?? Object.values(fields)[0] ?? (status === 0 ? "OpenPath's server could not be reached. Check the connection and try again." : `The server answered ${status}.`);
  return { message, fields };
}

export class Api {
  private readonly base: string;
  private readonly fetchImpl: Fetch;
  private readonly cookie: (name: string) => string;
  constructor(opts: { base?: string; fetch?: Fetch; cookie?: (name: string) => string } = {}) {
    this.base = opts.base ?? "/api";
    this.fetchImpl = opts.fetch ?? ((input, init) => fetch(input, init));
    this.cookie = opts.cookie ?? readCookie;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (method !== "GET") headers["X-CSRFToken"] = this.cookie("csrftoken");
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.base}${path}`, { method, headers, credentials: "same-origin", body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError(0, messageOf(null, 0).message);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const { message, fields } = messageOf(json, res.status);
      // signed out (session ended, or signed out on another device): say so plainly
      if ((res.status === 401 || res.status === 403) && /credentials|authenticat/i.test(message)) throw new ApiError(res.status, "You are signed out. Sign in again to carry on; everything saved before is kept.", fields);
      throw new ApiError(res.status, message, fields);
    }
    return json as T;
  }

  /**
   * Whether this app has a server with accounts, and who is signed in. A static build has none: device-only use.
   * `unreachable` means the server could not be reached at all (offline?), which is not the same as having none.
   */
  async status(): Promise<{ available: boolean; unreachable: boolean; account: AccountInfo }> {
    try {
      const a = await this.request<AccountInfo & { accounts?: boolean }>("GET", "/account/");
      if (!a || typeof a.authenticated !== "boolean" || a.accounts === false) return { available: false, unreachable: false, account: { authenticated: false } };
      return { available: true, unreachable: false, account: a };
    } catch (e) {
      return { available: false, unreachable: e instanceof ApiError && (e.status === 0 || e.status >= 500), account: { authenticated: false } };
    }
  }

  register(email: string, password: string) {
    return this.request<AccountInfo>("POST", "/account/register/", { email, password, consent: true });
  }
  login(email: string, password: string) {
    return this.request<AccountInfo>("POST", "/account/login/", { email, password });
  }
  logout() {
    return this.request<void>("POST", "/account/logout/");
  }
  requestReset(email: string) {
    return this.request<{ detail: string }>("POST", "/account/password-reset/", { email });
  }
  confirmReset(uid: string, token: string, password: string) {
    return this.request<{ detail: string }>("POST", "/account/password-reset/confirm/", { uid, token, password });
  }
  deleteAccount(password: string) {
    return this.request<void>("POST", "/account/delete/", { password });
  }

  async pupils(): Promise<PupilSummary[]> {
    return (await this.request<{ pupils: PupilSummary[] }>("GET", "/pupils/")).pupils;
  }
  createPupil(name: string) {
    return this.request<PupilSummary>("POST", "/pupils/", { display_name: name, consent: true });
  }
  deletePupil(id: string) {
    return this.request<void>("DELETE", `/pupils/${id}/`);
  }
  async events(id: string): Promise<AppEvent[]> {
    return (await this.request<{ events: AppEvent[] }>("GET", `/pupils/${id}/events/?subject=english`)).events;
  }
  append(id: string, seq: number, event: AppEvent) {
    return this.request<{ count: number }>("POST", `/pupils/${id}/events/`, { subject: "english", seq, event });
  }
  importEvents(id: string, events: AppEvent[]) {
    return this.request<{ count: number }>("PUT", `/pupils/${id}/events/`, { subject: "english", events });
  }
  exportPupil(id: string) {
    return this.request<unknown>("GET", `/pupils/${id}/export/`);
  }
}

/** The signed-in parent's pupils, each with the same append-only record as on a device. */
export class ServerRepo implements Repo {
  readonly kind = "server" as const;
  private readonly api: Api;
  /** How many events each loaded pupil has: the position of the next one. */
  private readonly counts = new Map<string, number>();
  constructor(api: Api) {
    this.api = api;
  }

  async profiles(): Promise<ProfileSummary[]> {
    return (await this.api.pupils()).map((p) => ({ id: p.id, name: p.display_name, createdAt: p.created_at, lastAt: p.last_at ?? p.created_at, events: p.events }));
  }

  async load(profile: string): Promise<AppEvent[]> {
    const events = await this.api.events(profile);
    this.counts.set(profile, events.length);
    return events;
  }

  async append(profile: string, event: AppEvent): Promise<void> {
    const seq = this.counts.get(profile) ?? (await this.load(profile)).length;
    try {
      const r = await this.api.append(profile, seq, event);
      this.counts.set(profile, r.count);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) throw new ApiError(409, "This record was changed on another device. Open the learner again to carry on from the latest answers.");
      throw e;
    }
  }

  /** Import a backup into a pupil with no record yet. A record with history is never replaced. */
  async replaceAll(profile: string, events: AppEvent[]): Promise<void> {
    await this.api.importEvents(profile, events);
    this.counts.set(profile, events.length);
  }

  async remove(profile: string): Promise<void> {
    await this.api.deletePupil(profile);
    this.counts.delete(profile);
  }
}
