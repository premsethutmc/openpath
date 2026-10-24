/**
 * The server copy of a pupil's record (ServerRepo over the account API), against an in-memory stand-in for the
 * Django API with the same rules: append-only, in order, one parent's pupils only. The real API is tested in the
 * backend (family/tests.py) and end to end in e2e/accounts.test.mjs.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { withoutVerification2 } from "./test-helpers.ts";
import { leafView } from "../../../../packages/english-core/src/index.ts";
import { Api, ApiError, ServerRepo } from "./account.ts";
import { loadContent } from "./content.ts";
import type { AppEvent } from "./events.ts";
import { testClock } from "./journey-sim.ts";
import { Learner } from "./learner.ts";
import { runSession, start } from "./profile-sim.ts";
import { fold } from "./state.ts";

const c = loadContent();

/** A stand-in for the family API: sessions by cookie, pupils by owner, append-only ledgers checked by position. */
function fakeServer() {
  const pupils = new Map<string, { owner: string; name: string; events: AppEvent[]; created: string }>();
  let n = 0;
  const calls: { method: string; path: string; csrf: string }[] = [];
  const fetchFor = (owner: string) => async (input: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const path = input.replace(/^\/api/, "");
    const headers = (init.headers ?? {}) as Record<string, string>;
    calls.push({ method, path, csrf: headers["X-CSRFToken"] ?? "" });
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    const json = (status: number, data?: unknown) => new Response(data === undefined ? null : JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    if (path === "/account/") return json(200, { authenticated: true, email: `${owner}@example.org`, pupils: [...pupils.values()].filter((p) => p.owner === owner).length });
    if (path === "/pupils/" && method === "GET") return json(200, { pupils: [...pupils].filter(([, p]) => p.owner === owner).map(([id, p]) => ({ id, display_name: p.name, created_at: p.created, last_at: p.events.at(-1)?.at ?? null, events: p.events.length })) });
    if (path === "/pupils/" && method === "POST") {
      const id = `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
      pupils.set(id, { owner, name: body.display_name, events: [], created: "2026-10-14T08:00:00.000Z" });
      return json(201, { id, display_name: body.display_name, created_at: "2026-10-14T08:00:00.000Z", last_at: null, events: 0 });
    }
    const m = path.match(/^\/pupils\/([^/]+)\/(events\/)?/);
    const p = m ? pupils.get(m[1]) : undefined;
    if (!p || p.owner !== owner) return json(404, { detail: "Not found." });
    if (m![2] && method === "GET") return json(200, { subject: "english", count: p.events.length, events: structuredClone(p.events) });
    if (m![2] && method === "POST") {
      if (body.seq !== p.events.length) return json(409, { detail: "changed", count: p.events.length });
      p.events.push(structuredClone(body.event));
      return json(201, { count: p.events.length });
    }
    if (m![2] && method === "PUT") {
      if (p.events.length) return json(409, { detail: "This pupil already has a record." });
      p.events.push(...structuredClone(body.events));
      return json(201, { count: p.events.length });
    }
    if (method === "DELETE") return (pupils.delete(m![1]), json(204));
    return json(405, { detail: "no" });
  };
  const api = (owner: string) => new Api({ fetch: fetchFor(owner), cookie: () => "csrf-token" });
  return { api, pupils, calls };
}

test("AC-1 a pupil's record goes to the server event by event, in order, and comes back identical on another device", async () => {
  const server = fakeServer();
  const api = server.api("asha");
  const pupil = await api.createPupil("Arun");
  const clock = testClock();
  const arun = await Learner.create(c, new ServerRepo(api), "Arun", "guardian", clock, pupil.id, "parent_account");
  await arun.setPreferences("school", "grammar");
  await start(arun, () => true); // the first assessment, through the real selection and engine
  const stored = server.pupils.get(pupil.id)!.events;
  assert.equal(stored.length, arun.events.length, "every event reached the server");
  assert.deepEqual(stored, arun.events);
  assert.ok(stored.some((e) => e.kind === "evidence"), "the answers are engine evidence events");
  assert.ok(server.calls.filter((x) => x.method !== "GET").every((x) => x.csrf === "csrf-token"), "every change carries the CSRF token");
  // another device (or the same parent after signing in again): the same record, the same Learner Vector
  const again = await Learner.open(c, new ServerRepo(server.api("asha")), pupil.id, clock);
  assert.deepEqual(again.state.ledger.composite, arun.state.ledger.composite);
  assert.deepEqual(again.profile().activities.map((a) => a.title), arun.profile().activities.map((a) => a.title));
  assert.equal(again.state.preferences?.goal, "grammar");
  assert.equal(again.state.profile?.consent.scope, "parent_account");
});

test("AC-2 another parent cannot open the pupil, and two devices cannot interleave events", async () => {
  const server = fakeServer();
  const pupil = await server.api("asha").createPupil("Arun");
  const clock = testClock();
  await Learner.create(c, new ServerRepo(server.api("asha")), "Arun", "guardian", clock, pupil.id, "parent_account");
  await assert.rejects(Learner.open(c, new ServerRepo(server.api("ravi")), pupil.id, clock), (e: unknown) => e instanceof ApiError && e.status === 404);
  assert.deepEqual(await new ServerRepo(server.api("ravi")).profiles(), []);
  // two open copies of the same record: the second to write is refused, not merged out of order
  const phone = await Learner.open(c, new ServerRepo(server.api("asha")), pupil.id, clock);
  const tablet = await Learner.open(c, new ServerRepo(server.api("asha")), pupil.id, clock);
  await phone.setSpeech(false);
  await assert.rejects(tablet.setSpeech(true), (e: unknown) => e instanceof ApiError && e.status === 409);
  assert.equal(server.pupils.get(pupil.id)!.events.length, 2);
});

test("AC-3 historical replay: a record made by the PR #24 app, imported into an account, gives exactly the same results", async () => {
  const history = JSON.parse(readFileSync(new URL("./fixtures/history-pr24.json", import.meta.url), "utf8")) as { now: string; events: AppEvent[]; composite: unknown; decisions: unknown; views: Record<string, unknown> };
  const server = fakeServer();
  const api = server.api("asha");
  const pupil = await api.createPupil("History");
  const repo = new ServerRepo(api);
  await repo.replaceAll(pupil.id, history.events);
  const l = await Learner.open(c, new ServerRepo(api), pupil.id, testClock(history.now));
  assert.deepEqual(JSON.parse(JSON.stringify(l.state.ledger.composite)), history.composite);
  assert.deepEqual(JSON.parse(JSON.stringify(l.state.ledger.decisions)), history.decisions);
  for (const [id, v] of Object.entries(history.views)) assert.deepEqual(withoutVerification2(leafView(l.state.ledger.composite, c.index, id, history.now)), v, id);
  // and the import never replaces an existing record
  await assert.rejects(repo.replaceAll(pupil.id, history.events.slice(0, 3)), (e: unknown) => e instanceof ApiError && e.status === 409);
  assert.equal(server.pupils.get(pupil.id)!.events.length, history.events.length);
});

test("AC-4 a lesson and a confirming check through the server keep teaching and independent evidence apart", async () => {
  const server = fakeServer();
  const api = server.api("asha");
  const pupil = await api.createPupil("Arun");
  const clock = testClock();
  const l = await Learner.create(c, new ServerRepo(api), "Arun", "guardian", clock, pupil.id, "parent_account");
  await start(l, (i) => i.target !== "EN.GRM.NOUN.articles");
  await runSession(l, { type: "check", capability: "EN.GRM.NOUN.articles", purpose: "assess" }, () => false);
  await runSession(l, l.profile().activities.find((a) => a.step.capability === "EN.GRM.NOUN.articles")!.step, () => true);
  const reopened = fold(c, (await new ServerRepo(server.api("asha")).load(pupil.id)) as AppEvent[]);
  const cap = l.profile().capabilities.find((x) => x.id === "EN.GRM.NOUN.articles")!;
  assert.ok(cap.evidence.afterTeaching > 0, "practice after the lesson is recorded as after teaching");
  assert.notEqual(cap.standing, "shown", "practice straight after a lesson never makes a skill shown");
  assert.deepEqual(reopened.ledger.composite, l.state.ledger.composite);
});
