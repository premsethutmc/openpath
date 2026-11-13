/** device-mode@1: the app's own Api, given the device fetch, keeps learners and records in the browser's storage. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Api, ApiError } from "../english/logic/account";
import { apiOptions, DEVICE_BUILD, DEVICE_MAX_PUPILS, deviceFetch } from "./device-api";

const memory = () => {
  const m = new Map<string, string>();
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};
const setup = (store = memory(), clock = { t: Date.parse("2026-11-13T04:00:00Z") }) => ({ store, clock, api: new Api({ fetch: deviceFetch(store, () => new Date(clock.t)), cookie: () => "" }) });
const attempt = (id: string) => ({ kind: "learning_record", record: "attempt", id, at: "1999-01-01T00:00:00Z", questionId: "gen:akromr:14", response: "14" });
const events = (api: Api, id: string) => api.request<{ count: number; events: Record<string, unknown>[]; gradingMode?: string; decisions?: object }>("GET", `/pupils/${id}/events/?subject=mathematics`);
const post = (api: Api, id: string, seq: number, event: object) => api.request<{ count: number; at: string }>("POST", `/pupils/${id}/events/`, { subject: "mathematics", seq, event });
const fails = async (p: Promise<unknown>, status: number) => { try { await p; } catch (e) { assert.ok(e instanceof ApiError); assert.equal(e.status, status); return; } assert.fail(`expected status ${status}`); };

test("a build with a server uses the network: the device store is a build choice", () => {
  assert.equal(DEVICE_BUILD, false);
  assert.deepEqual(apiOptions(), {});
});

test("the app is signed in as this device, with no learners at first; a learner is added and listed", async () => {
  const { api } = setup();
  const s = await api.status();
  assert.deepEqual([s.available, s.account.authenticated, s.account.pupils], [true, true, 0]);
  assert.deepEqual(await api.pupils(), []);
  const p = await api.createPupil("  Tester ");
  assert.match(p.id, /^[0-9a-f-]{36}$/);
  assert.equal(p.display_name, "Tester");
  assert.deepEqual((await api.pupils()).map((x) => x.display_name), ["Tester"]);
  await fails(api.createPupil("   "), 400);
  await fails(api.login("a@example.org", "x"), 404);
});

test("a record is appended in order, kept across a reload, and stamped with the storing clock", async () => {
  const { api, store, clock } = setup();
  const p = await api.createPupil("Tester");
  assert.deepEqual(await events(api, p.id), { subject: "mathematics", count: 0, events: [], gradingMode: "unified", decisions: {} });
  const r = await post(api, p.id, 0, attempt("a1"));
  assert.deepEqual(r, { count: 1, at: "2026-11-13T04:00:00.000Z" });
  clock.t += 60_000;
  await post(api, p.id, 1, attempt("a2"));
  // a reload: a new Api over the same storage
  const again = new Api({ fetch: deviceFetch(store, () => new Date(clock.t)), cookie: () => "" });
  const got = await events(again, p.id);
  assert.deepEqual(got.events.map((e) => [e.id, e.at]), [["a1", "2026-11-13T04:00:00.000Z"], ["a2", "2026-11-13T04:01:00.000Z"]]);
  assert.ok(got.events.every((e) => !("decision" in e)), "no server decision is invented");
  const row = (await again.pupils())[0];
  assert.deepEqual([row.events, row.last_at], [2, "2026-11-13T04:01:00.000Z"]);
});

test("a stale position (a second tab) and a repeated activity are refused, and nothing is stored", async () => {
  const { api } = setup();
  const p = await api.createPupil("Tester");
  await post(api, p.id, 0, attempt("a1"));
  await fails(post(api, p.id, 0, attempt("a2")), 409);
  await fails(post(api, p.id, 1, attempt("a1")), 400);
  await fails(post(api, p.id, 1, { id: "x" }), 400);
  assert.equal((await events(api, p.id)).count, 1);
});

test("records are per learner; deleting a learner removes the record; other people's features are not available", async () => {
  const { api, store } = setup();
  const [a, b] = [await api.createPupil("A"), await api.createPupil("B")];
  await post(api, a.id, 0, attempt("a1"));
  assert.equal((await events(api, b.id)).count, 0);
  await fails(api.request("GET", `/pupils/${a.id}/written-marks/`), 404);
  await fails(api.request("GET", "/content-review/"), 404);
  await fails(events(api, "00000000-0000-4000-8000-000000000000"), 404);
  await api.deletePupil(a.id);
  assert.deepEqual((await api.pupils()).map((x) => x.display_name), ["B"]);
  assert.ok(![...store.m.keys()].some((k) => k.includes(a.id)), "nothing of the deleted learner is left");
});

test("a full or disabled storage is reported, never silent; the learner limit holds", async () => {
  const store = memory();
  const { api } = setup(store);
  const p = await api.createPupil("Tester");
  const set = store.setItem;
  store.setItem = () => { throw new Error("QuotaExceededError"); };
  await fails(post(api, p.id, 0, attempt("a1")), 507);
  store.setItem = set;
  assert.equal((await events(api, p.id)).count, 0);
  for (let i = 1; i < DEVICE_MAX_PUPILS; i++) await api.createPupil(`L${i}`);
  await fails(api.createPupil("one too many"), 400);
});
