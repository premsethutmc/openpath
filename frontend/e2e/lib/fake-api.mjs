/**
 * LOCAL TESTING ONLY: an in-memory stand-in for the OpenPath API's account, pupil and event endpoints (the same
 * protocol as Django: ordered appends with seq, 409 on a stale position, server time on mathematics records), for
 * running the My Learning Year browser journeys where Django is not installed. CI runs the same journeys against the
 * real Django API. It does not reproduce Django's validation; backend/family/test_learning.py tests that.
 *
 *   PORT=8013 node e2e/lib/fake-api.mjs
 *
 * POST /__test/clock {pupil, days} moves the server clock forward for one synthetic learner (as Django's
 * OPENPATH_TEST_CLOCK_FILE does). No stored record changes.
 */
import http from "node:http";

const accounts = new Map(); // email -> { password, pupils: [] }
const sessions = new Map(); // cookie -> email
const pupils = new Map(); // id -> { id, display_name, owner, events: { english: [], mathematics: [] } }
const clock = new Map(); // pupil id -> days ahead (test clock)
let n = 0;
const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const read = (req) => new Promise((ok) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => ok(s ? JSON.parse(s) : {})); });
const who = (req) => sessions.get((req.headers.cookie ?? "").match(/(?:^|; )sid=([^;]*)/)?.[1] ?? "");
const login = (res, email) => {
  const sid = `s${++n}${Math.random().toString(36).slice(2)}`;
  sessions.set(sid, email);
  return { "Set-Cookie": [`sid=${sid}; Path=/; HttpOnly; SameSite=Lax`, `csrftoken=fake; Path=/`] };
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const body = req.method === "GET" ? {} : await read(req);
  const email = who(req);
  if (p === "/__test/clock") {
    const pupil = pupils.get(body.pupil);
    if (!pupil || !pupil.display_name.startsWith("Synthetic")) return json(res, 400, { detail: "synthetic pupils only" });
    clock.set(pupil.id, body.days);
    return json(res, 200, { days: body.days });
  }
  if (p === "/api/account/" && req.method === "GET") return json(res, 200, email ? { authenticated: true, email, accounts: true } : { authenticated: false, accounts: true });
  if (p === "/api/account/register/") {
    if (accounts.has(body.email)) return json(res, 400, { email: "Already registered." });
    accounts.set(body.email, { password: body.password });
    return json(res, 201, { authenticated: true, email: body.email }, login(res, body.email));
  }
  if (p === "/api/account/login/") {
    const a = accounts.get(String(body.email ?? "").toLowerCase());
    if (!a || a.password !== body.password) return json(res, 400, { detail: "Wrong email or password." });
    return json(res, 200, { authenticated: true, email: body.email }, login(res, body.email));
  }
  if (p === "/api/account/logout/") {
    const sid = (req.headers.cookie ?? "").match(/(?:^|; )sid=([^;]*)/)?.[1];
    sessions.delete(sid);
    return json(res, 204);
  }
  if (!email) return json(res, 403, { detail: "Sign in." });
  if (p === "/api/pupils/" && req.method === "GET") return json(res, 200, { pupils: [...pupils.values()].filter((x) => x.owner === email).map(({ id, display_name }) => ({ id, display_name, events: 0 })) });
  if (p === "/api/pupils/" && req.method === "POST") {
    const id = `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
    pupils.set(id, { id, display_name: body.display_name, owner: email, events: { english: [], mathematics: [] } });
    return json(res, 201, { id, display_name: body.display_name });
  }
  const m = p.match(/^\/api\/pupils\/([^/]+)\/events\/$/);
  if (m) {
    const pupil = pupils.get(m[1]);
    if (!pupil || pupil.owner !== email) return json(res, 404, { detail: "Not found." });
    const subject = (req.method === "GET" ? url.searchParams.get("subject") : body.subject) ?? "english";
    const list = pupil.events[subject];
    if (req.method === "GET") return json(res, 200, { subject, count: list.length, events: list });
    if (body.seq !== list.length) return json(res, 409, { detail: "The record has changed since it was loaded.", count: list.length });
    const e = body.event;
    if (e.learnerId !== pupil.id || list.some((x) => x.id === e.id)) return json(res, 400, { event: "Invalid owner or duplicate id." });
    const nowMs = Date.now() + (clock.get(pupil.id) ?? 0) * 86_400_000;
    const now = new Date(nowMs).toISOString();
    if (e.kind === "learning_record" && e.record === "attempt" && e.activity === "retention") {
      const first = list.filter((x) => x.kind === "learning_record" && x.record === "attempt" && x.competency === e.competency).map((x) => x.at).sort()[0];
      if (!first || nowMs - Date.parse(first) < 6.5 * 86_400_000) return json(res, 400, { event: "The delayed check is not due yet." });
    }
    const saved = subject === "mathematics" ? { ...e, at: now, savedAt: now } : e;
    list.push(saved);
    return json(res, 201, { count: list.length, at: saved.at });
  }
  return json(res, 404, { detail: "Not in the fake API." });
}).listen(Number(process.env.PORT ?? 8013), "127.0.0.1", () => console.log(`fake OpenPath API on ${process.env.PORT ?? 8013}`));
