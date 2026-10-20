/** Gateway mechanics only; actual Django and ONNX journeys run against the container in e2e/. */
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import { once } from "node:events";
import { configFromEnv, createDemoServer } from "./preview-server.mjs";
async function listen(s) {
  s.listen(0, "127.0.0.1");
  await once(s, "listening");
  return `http://127.0.0.1:${s.address().port}`;
}
const dist = mkdtempSync(join(tmpdir(), "openpath-gateway-test-"));
writeFileSync(
  join(dist, "index.html"),
  "<!doctype html><title>Gateway fixture only</title>",
);
after(() => rmSync(dist, { recursive: true, force: true }));
const env = {
  DEMO_DIST: dist,
  DEMO_PASSWORD: "synthetic-preview-test-pass",
  DEMO_SESSION_SECRET: "synthetic-session-secret-with-over-32-characters",
  DEMO_ALLOW_HTTP: "1",
};
test("readiness requires a healthy backend and fails when it stops", async () => {
  const backend = http.createServer((q, r) => {
    assert.equal(q.url, "/healthz/");
    r.end("ok");
  });
  const api = await listen(backend);
  const { config, problems } = configFromEnv({ ...env, DEMO_API_TARGET: api });
  assert.deepEqual(problems, []);
  const server = createDemoServer(config, { log: () => {} });
  const url = await listen(server);
  try {
    assert.equal((await fetch(url + "/healthz")).status, 200);
    await new Promise((r) => backend.close(r));
    assert.equal((await fetch(url + "/healthz")).status, 503);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    backend.closeAllConnections();
    backend.close();
  }
});
test("missing Django target is not a healthy preview; missing passwords and signing keys are rejected", async () => {
  const { config } = configFromEnv(env);
  const server = createDemoServer(config, { log: () => {} });
  const url = await listen(server);
  try {
    assert.equal((await fetch(url + "/healthz")).status, 503);
    const invalid = configFromEnv({ DEMO_PASSWORD: "short" }).problems;
    assert.ok(invalid.some((x) => x.includes("DEMO_PASSWORD")));
    assert.ok(invalid.some((x) => x.includes("DEMO_SESSION_SECRET")));
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
test("Render-mode gate sets Secure cookies, redirects HTTP and rejects a cross-origin login", async () => {
  const { config } = configFromEnv({ ...env, DEMO_ALLOW_HTTP: "0" });
  const server = createDemoServer(config, { log: () => {} });
  const url = await listen(server);
  try {
    const redirect = await fetch(url + "/year/", {
      headers: { "x-forwarded-proto": "http" },
      redirect: "manual",
    });
    assert.equal(redirect.status, 301);
    assert.match(redirect.headers.get("location"), /^https:/);
    const bad = await fetch(url + "/login", {
      method: "POST",
      headers: {
        origin: "https://unrelated.invalid",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "password=synthetic-preview-test-pass",
      redirect: "manual",
    });
    assert.equal(bad.status, 403);
    const login = await fetch(url + "/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "password=synthetic-preview-test-pass",
      redirect: "manual",
    });
    assert.equal(login.status, 303);
    const cookie = login.headers.get("set-cookie");
    assert.match(cookie, /__Host-openpath_demo=/);
    assert.match(cookie, /; Secure/);
    assert.match(cookie, /; HttpOnly/);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
