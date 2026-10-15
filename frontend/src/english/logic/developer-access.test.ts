/**
 * /developer must always reach a definite state: rejected, stalled, unauthorised and mismatched-server requests end
 * in a message with a Retry, never in "Checking access…" for ever. (Regression: PR #27 hung when the API behind the
 * app was older code without the developer routes, and its 404 left the page loading.)
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { Api, ApiError } from "./account.ts";
import { checkAccess } from "./developer-access.ts";

type Handler = (path: string, init: RequestInit) => Promise<Response> | Response;
const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const api = (h: Handler, timeoutMs = 50) => new Api({ fetch: (input, init = {}) => Promise.resolve(h(input.replace(/^\/api/, ""), init)), cookie: () => "token", timeoutMs });
/** A request that never answers unless it is aborted (as a browser's fetch does). */
const stall = (init: RequestInit) =>
  new Promise<Response>((_, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });

const signedIn = (rest: Handler): Handler => (path, init) => (path === "/account/" ? json(200, { authenticated: true, email: "f@example.org", pupils: 1 }) : rest(path, init));

test("Api: every request settles: answer, HTTP error, no connection, or the time limit", async () => {
  await assert.rejects(api(() => Promise.reject(new TypeError("Failed to fetch"))).request("GET", "/x/"), (e: ApiError) => e.status === 0 && e.reason === "network" && e.path === "/x/");
  const t0 = Date.now();
  await assert.rejects(api((_, init) => stall(init), 80).request("GET", "/slow/"), (e: ApiError) => e.status === 0 && e.reason === "timeout" && /did not answer within/.test(e.message));
  assert.ok(Date.now() - t0 < 1000, "gave up at the time limit");
  // a body that never finishes is also cut off
  const endless = new Response(new ReadableStream({ start() {} }), { status: 200 });
  await assert.rejects(api(() => endless, 80).request("GET", "/body/"), (e: ApiError) => e.reason === "timeout");
  await assert.rejects(api(() => new Response("<h1>Not Found</h1>", { status: 404, headers: { "Content-Type": "text/html" } })).request("GET", "/developer/status/"), (e: ApiError) => e.status === 404 && e.reason === "http" && e.path === "/developer/status/");
  await assert.rejects(api(() => json(403, { detail: "Authentication credentials were not provided." })).request("GET", "/pupils/"), (e: ApiError) => e.status === 403 && /signed out/.test(e.message));
  assert.deepEqual(await api(() => json(200, { ok: true })).request("GET", "/fine/"), { ok: true });
});

test("developer access: the outcomes when everything works", async () => {
  assert.deepEqual(await checkAccess(api(() => json(200, { authenticated: false, accounts: false })), "abc1234"), { phase: "no-server" });
  assert.deepEqual(await checkAccess(api(() => json(200, { authenticated: false })), "abc1234"), { phase: "signed-out" });
  assert.deepEqual(await checkAccess(api(signedIn(() => json(200, { developer: false, commit: "abc1234" }))), "abc1234"), { phase: "not-developer", commit: "abc1234" });
  assert.deepEqual(await checkAccess(api(signedIn(() => json(200, { developer: true, commit: "abc1234" }))), "abc1234"), { phase: "ready", commit: "abc1234", mismatch: null });
  const r = await checkAccess(api(signedIn(() => json(200, { developer: true, commit: "def5678" }))), "abc1234");
  assert.ok(r.phase === "ready" && r.mismatch?.includes("abc1234") && r.mismatch.includes("def5678"), "a different app and API build is pointed out");
});

test("developer access: an older API without the developer routes (the PR #27 hang) gives a clear error, not a spinner", async () => {
  const r = await checkAccess(api(signedIn(() => new Response("<h1>Not Found</h1>", { status: 404 }))), "abc1234");
  assert.equal(r.phase, "error");
  assert.ok(r.phase === "error" && /older than this page/.test(r.title) && /start-preview\.sh/.test(r.message) && r.detail === "developer status: HTTP 404 (/developer/status/)");
});

test("developer access: rejected, stalled and unreachable requests end in an error with the step that failed", async () => {
  const rejected = await checkAccess(api(signedIn(() => Promise.reject(new TypeError("Failed to fetch")))), "x");
  assert.ok(rejected.phase === "error" && rejected.detail === "developer status: network (/developer/status/)");
  const stalled = await checkAccess(api(signedIn((_, init) => stall(init)), 60), "x");
  assert.ok(stalled.phase === "error" && stalled.detail === "developer status: timeout (/developer/status/)" && /did not answer/.test(stalled.message));
  const accountStalled = await checkAccess(api((_, init) => stall(init), 60), "x");
  assert.ok(accountStalled.phase === "error" && accountStalled.detail === "account: timeout (/account/)");
  const proxyUp = await checkAccess(api(signedIn(() => json(502, { detail: "The OpenPath API is not running." }))), "x");
  assert.ok(proxyUp.phase === "error" && /not running/.test(proxyUp.title));
  const garbled = await checkAccess(api(signedIn(() => new Response("not json", { status: 200 }))), "x");
  assert.equal(garbled.phase, "error");
});

test("developer access: a session that ended between the two requests asks to sign in again", async () => {
  for (const status of [401, 403]) assert.deepEqual(await checkAccess(api(signedIn(() => json(status, { detail: "Authentication credentials were not provided." }))), "x"), { phase: "signed-out" });
});
