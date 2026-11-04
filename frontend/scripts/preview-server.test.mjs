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

test("fresh preview login returns to the requested curriculum route", async () => {
  const { config } = configFromEnv(env);
  const server = createDemoServer(config, { log: () => {} });
  const url = await listen(server);
  try {
    const entry = await fetch(url + "/curriculum/?preview=1", {
      headers: { accept: "text/html" },
      redirect: "manual",
    });
    assert.equal(entry.status, 303);
    assert.equal(
      entry.headers.get("location"),
      "/login?next=%2Fcurriculum%2F%3Fpreview%3D1",
    );

    const login = await fetch(url + "/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        password: env.DEMO_PASSWORD,
        next: "/curriculum/?preview=1#b=cbse&g=7",
      }),
      redirect: "manual",
    });
    assert.equal(login.status, 303);
    assert.equal(
      login.headers.get("location"),
      "/curriculum/?preview=1#b=cbse&g=7",
    );
    assert.match(login.headers.get("set-cookie"), /openpath_demo=/);

    const unsafe = await fetch(url + "/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ password: env.DEMO_PASSWORD, next: "//example.invalid/" }),
      redirect: "manual",
    });
    assert.equal(unsafe.headers.get("location"), "/");
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});

test("the mathematics preview opens on its curriculum home; the English app stays at /english", async () => {
  const { mkdirSync } = await import("node:fs");
  mkdirSync(join(dist, "curriculum"), { recursive: true });
  writeFileSync(join(dist, "curriculum", "index.html"), "<!doctype html><title>Mathematics fixture</title>");
  const signedIn = async (url) => {
    const login = await fetch(url + "/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ password: env.DEMO_PASSWORD, next: "/" }),
      redirect: "manual",
    });
    assert.equal(login.headers.get("location"), "/");
    const cookie = login.headers.get("set-cookie").split(";")[0];
    return (path) => fetch(url + path, { headers: { cookie, accept: "text/html" }, redirect: "manual" });
  };
  const preview = configFromEnv({ ...env, DEMO_HOME: "/curriculum/" });
  assert.deepEqual(preview.problems, []);
  const server = createDemoServer(preview.config, { log: () => {} });
  const plain = createDemoServer(configFromEnv(env).config, { log: () => {} });
  try {
    const get = await signedIn(await listen(server));
    const root = await get("/");
    assert.equal(root.status, 303);
    assert.equal(root.headers.get("location"), "/curriculum/");
    assert.match(await (await get("/curriculum/")).text(), /Mathematics fixture/);
    assert.match(await (await get("/english")).text(), /Gateway fixture only/, "the English app is still served");
    assert.match(await (await get("/?no-sw")).text(), /Gateway fixture only/, "a root URL with a query is still the English app");
    // without DEMO_HOME (the English demo and every other deployment) "/" is unchanged
    const getPlain = await signedIn(await listen(plain));
    const english = await getPlain("/");
    assert.equal(english.status, 200);
    assert.match(await english.text(), /Gateway fixture only/);
    assert.ok(configFromEnv({ ...env, DEMO_HOME: "//evil.example/" }).problems.length > 0, "an off-site home is refused");
  } finally {
    for (const s of [server, plain]) { s.closeAllConnections(); await new Promise((r) => s.close(r)); }
  }
});
