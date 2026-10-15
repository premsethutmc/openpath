/**
 * The private demo server (scripts/demo-server.mjs): nothing of the app before logging in, password checks, sessions,
 * logout, expiry, login limits, headers, and no secret in the built app.
 *
 *   node --test scripts/demo-server.test.mjs
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { configFromEnv, createDemoServer, hashPassword, parseHash, verifyPassword } from "./demo-server.mjs";

const PASSWORD = "correct horse battery staple";
const SECRET = "x".repeat(48);
const dist = mkdtempSync(join(tmpdir(), "demo-dist-"));
mkdirSync(join(dist, "assets"));
writeFileSync(join(dist, "index.html"), '<!doctype html><title>OpenPath English</title><script type="module" src="assets/app.js"></script>');
writeFileSync(join(dist, "assets", "app.js"), "console.log('the app')");
writeFileSync(join(dist, "assets", "app.css"), "body{}");
writeFileSync(join(dist, "_headers"), "/*\n  X-Test: 1\n");
writeFileSync(join(dist, "BUILD"), "abc123");
writeFileSync(join(dist, "sw.js"), "// the static build's caching worker");
writeFileSync(join(tmpdir(), "outside-secret.txt"), "outside");

let hashText;
let clock = Date.parse("2026-10-15T10:00:00Z");
const servers = [];

/** A server on a free port, with its own clock and login limits. */
async function start(overrides = {}, limits, extra = {}) {
  const { problems, config } = configFromEnv({ DEMO_PASSWORD_HASH: hashText, DEMO_SESSION_SECRET: SECRET, DEMO_DIST: dist, DEMO_SESSION_HOURS: "2", ...overrides });
  assert.deepEqual(problems, []);
  const logs = [];
  const server = createDemoServer(config, { now: () => clock, log: (l) => logs.push(l), ...(limits ? { limits } : {}), ...extra });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  servers.push(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  const req = (path, init = {}) => fetch(base + path, { redirect: "manual", ...init, headers: { "x-forwarded-for": "203.0.113.9", ...(init.headers ?? {}) } });
  const login = (password, headers = {}) => req("/login", { method: "POST", body: new URLSearchParams({ password }), headers: { "content-type": "application/x-www-form-urlencoded", origin: base, host: new URL(base).host, ...headers } });
  const cookieOf = (res) => res.headers.get("set-cookie")?.split(";")[0] ?? null;
  return { base, req, login, cookieOf, logs };
}

before(async () => {
  hashText = await hashPassword(PASSWORD);
});
after(() => servers.forEach((s) => s.close()));

test("DS-1 nothing of the app is served without a session: HTML, scripts, styles, build files, API", async () => {
  const { req } = await start();
  for (const path of ["/", "/index.html", "/assets/app.js", "/assets/app.css", "/developer", "/some/deep/link", "/_headers", "/BUILD", "/api/account/", "/manifest.webmanifest"]) {
    const res = await req(path);
    const body = await res.text();
    assert.ok([303, 401].includes(res.status), `${path}: ${res.status}`);
    assert.ok(!body.includes("the app") && !body.includes("OpenPath English</title>"), `${path} leaked content`);
  }
  // a browser page load is sent to the login page; a script request just gets 401
  assert.equal((await req("/", { headers: { accept: "text/html" } })).headers.get("location"), "/login");
  assert.equal((await req("/assets/app.js")).status, 401);
  // what is public: the login page, the health check, robots, and a worker that removes itself
  assert.equal((await req("/login")).status, 200);
  assert.equal(await (await req("/healthz")).text(), "ok");
  assert.match(await (await req("/robots.txt")).text(), /Disallow: \//);
  const sw = await (await req("/sw.js")).text();
  assert.match(sw, /unregister/);
  assert.ok(!sw.includes("caching worker"), "the build's caching worker is never served");
});

test("DS-2 a wrong password is refused, and nothing is set", async () => {
  const { login, cookieOf } = await start();
  const res = await login("not the password");
  assert.equal(res.status, 401);
  assert.equal(cookieOf(res), null);
  assert.match(await res.text(), /not right/);
  assert.equal((await login("")).status, 401);
});

test("DS-3 the right password opens the app: a Secure, HttpOnly, SameSite=Strict session cookie; the app and its assets", async () => {
  const { login, req } = await start({ DEMO_ALLOW_HTTP: undefined });
  const res = await login(PASSWORD);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "/");
  const set = res.headers.get("set-cookie");
  assert.match(set, /^__Host-openpath_demo=/);
  for (const attr of ["HttpOnly", "SameSite=Strict", "Secure", "Path=/", "Max-Age=7200"]) assert.ok(set.includes(attr), attr);
  assert.ok(!set.includes(PASSWORD));
  const cookie = set.split(";")[0];
  const page = await req("/", { headers: { cookie } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /OpenPath English/);
  assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(page.headers.get("cache-control"), "no-store");
  const js = await req("/assets/app.js", { headers: { cookie } });
  assert.equal(await js.text(), "console.log('the app')");
  assert.equal(js.headers.get("cache-control"), "private, max-age=3600");
  // deep links and reloads are the app; a missing asset is a 404; build files stay hidden
  for (const path of ["/developer", "/anything/else", "/index.html"]) assert.match(await (await req(path, { headers: { cookie } })).text(), /OpenPath English/, path);
  assert.equal((await req("/assets/missing.js", { headers: { cookie } })).status, 404);
  for (const hidden of ["/_headers", "/BUILD"]) assert.ok(!(await (await req(hidden, { headers: { cookie } })).text()).match(/X-Test|abc123/), `${hidden} is never served`);
  assert.equal((await req("/assets/../../outside-secret.txt", { headers: { cookie } })).status, 404);
  assert.equal((await req("/%2e%2e/outside-secret.txt", { headers: { cookie } })).status, 404);
  // the demo has no account server: device-only, as the static build
  assert.deepEqual(await (await req("/api/account/", { headers: { cookie } })).json(), { authenticated: false, accounts: false });
  // a forged or altered cookie is not a session
  const [payload, mac] = cookie.split("=")[1].split(".");
  assert.equal((await req("/assets/app.js", { headers: { cookie: `__Host-openpath_demo=${payload}.${mac.slice(0, -2)}AA` } })).status, 401);
  const forged = Buffer.from(JSON.stringify({ sid: "x", exp: clock + 1e12 })).toString("base64url");
  assert.equal((await req("/assets/app.js", { headers: { cookie: `__Host-openpath_demo=${forged}.${mac}` } })).status, 401);
});

test("DS-4 logout revokes the session at once, even if the old cookie is sent again", async () => {
  const { login, req, cookieOf, base } = await start();
  const cookie = cookieOf(await login(PASSWORD));
  assert.equal((await req("/assets/app.js", { headers: { cookie } })).status, 200);
  assert.equal((await req("/logout", { headers: { cookie } })).status, 200, "the logout page");
  const out = await req("/logout", { method: "POST", body: new URLSearchParams({}), headers: { cookie, origin: base, "content-type": "application/x-www-form-urlencoded" } });
  assert.equal(out.status, 303);
  assert.equal(out.headers.get("location"), "/login?out");
  assert.match(out.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal(out.headers.get("clear-site-data"), '"cache"');
  assert.equal((await req("/assets/app.js", { headers: { cookie } })).status, 401, "the old cookie no longer works");
  // "log out and erase" also clears this device's storage (the demo learners)
  const c2 = cookieOf(await login(PASSWORD));
  const erase = await req("/logout", { method: "POST", body: new URLSearchParams({ erase: "1" }), headers: { cookie: c2, origin: base, "content-type": "application/x-www-form-urlencoded" } });
  assert.equal(erase.headers.get("clear-site-data"), '"cache", "storage"');
  // logout from another site is refused
  const c3 = cookieOf(await login(PASSWORD));
  assert.equal((await req("/logout", { method: "POST", body: "", headers: { cookie: c3, origin: "https://evil.example" } })).status, 403);
  assert.equal((await req("/logout", { method: "POST", body: "", headers: { cookie: c3, origin: "null", "sec-fetch-site": "cross-site" } })).status, 403);
  assert.equal((await req("/assets/app.js", { headers: { cookie: c3 } })).status, 200);
});

test("DS-5 sessions expire after DEMO_SESSION_HOURS, and survive a restart until then; a new password ends them", async () => {
  const a = await start();
  const cookie = a.cookieOf(await a.login(PASSWORD));
  clock += 60 * 60_000; // one hour later
  assert.equal((await a.req("/assets/app.js", { headers: { cookie } })).status, 200);
  // a restart (a new process with the same secret) keeps the session
  const b = await start();
  assert.equal((await b.req("/assets/app.js", { headers: { cookie } })).status, 200, "kept across a restart");
  clock += 61 * 60_000; // past two hours
  assert.equal((await b.req("/assets/app.js", { headers: { cookie } })).status, 401, "expired");
  // rotating the password (or the secret) ends every session
  const c = await start();
  const fresh = c.cookieOf(await c.login(PASSWORD));
  const rotated = await start({ DEMO_PASSWORD_HASH: await hashPassword("a completely new passphrase") });
  assert.equal((await rotated.req("/assets/app.js", { headers: { cookie: fresh } })).status, 401);
  const resecret = await start({ DEMO_SESSION_SECRET: "y".repeat(48) });
  assert.equal((await resecret.req("/assets/app.js", { headers: { cookie: fresh } })).status, 401);
});

test("DS-6 login attempts are limited per client and in total, even for the right password", async () => {
  const limits = { perClient: 3, total: 5, windowMs: 15 * 60_000 };
  const { login, cookieOf } = await start({}, limits);
  for (let i = 0; i < 3; i++) assert.equal((await login("wrong")).status, 401);
  const blocked = await login(PASSWORD);
  assert.equal(blocked.status, 429, "blocked after 3 failures, even with the right password");
  assert.equal(cookieOf(blocked), null);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  // another client can still log in until the total limit
  assert.equal((await login("wrong", { "x-forwarded-for": "198.51.100.1" })).status, 401);
  assert.equal((await login("wrong", { "x-forwarded-for": "198.51.100.2" })).status, 401);
  assert.equal((await login(PASSWORD, { "x-forwarded-for": "198.51.100.3" })).status, 429, "the total limit stops spread-out guessing");
  // a forged leading X-Forwarded-For entry does not escape the limit: the proxy's last entry counts
  assert.equal((await login(PASSWORD, { "x-forwarded-for": "1.2.3.4, 203.0.113.9" })).status, 429);
  // the window passes
  clock += 16 * 60_000;
  assert.equal((await login(PASSWORD)).status, 303);
});

test("DS-10 a burst of simultaneous guesses cannot pass the limits, and passwords are checked one at a time", async () => {
  let running = 0;
  let most = 0;
  const verify = async (password, parsed) => {
    running++;
    most = Math.max(most, running);
    try {
      return await verifyPassword(password, parsed);
    } finally {
      running--;
    }
  };
  const one = await start({}, undefined, { verify });
  const burst = await Promise.all(Array.from({ length: 40 }, () => one.login("wrong").then((r) => r.status)));
  assert.equal(burst.filter((s) => s === 401).length, 5, "exactly the per-client limit is checked");
  assert.equal(burst.filter((s) => s === 429).length, 35);
  assert.equal(most, 1, "never more than one scrypt check at once (32 MB each)");
  // many clients at once: at most the queue is accepted; the rest are turned away at once
  const many = await start({}, { perClient: 5, total: 30, windowMs: 15 * 60_000, queue: 8 }, { verify });
  const spread = await Promise.all(Array.from({ length: 40 }, (_, i) => many.login("wrong", { "x-forwarded-for": `198.51.100.${i + 1}` }).then((r) => r.status)));
  assert.ok(spread.filter((s) => s === 401).length <= 8, `${spread.filter((s) => s === 401).length} checked`);
  assert.equal(spread.filter((s) => s === 401).length + spread.filter((s) => s === 429).length, 40);
  assert.equal(most, 1);
});

test("DS-7 headers: HTTPS only, HSTS, no framing, no indexing, no permissions; logs never hold secrets", async () => {
  const { req, login, logs } = await start({ DEMO_ALLOW_HTTP: undefined });
  const http = await req("/login?x=1", { headers: { "x-forwarded-proto": "http" } });
  assert.equal(http.status, 301);
  assert.match(http.headers.get("location"), /^https:\/\/127\.0\.0\.1:\d+\/login$/);
  const res = await req("/login");
  for (const [h, v] of [
    ["strict-transport-security", /max-age=/],
    ["x-frame-options", /DENY/],
    ["x-robots-tag", /noindex/],
    ["x-content-type-options", /nosniff/],
    ["referrer-policy", /^same-origin$/],
    ["permissions-policy", /microphone=\(\)/],
    ["content-security-policy", /frame-ancestors 'none'/],
  ])
    assert.match(res.headers.get(h) ?? "", v, h);
  await login(PASSWORD);
  await login("wrong guess");
  const all = logs.join("\n");
  for (const secret of [PASSWORD, "wrong guess", SECRET, hashText, "openpath_demo="]) assert.ok(!all.includes(secret), "logs must not contain secrets");
  assert.match(all, /POST \/login 303/);
});

test("DS-8 refuses to start without a password hash and a long secret; hashes are salted scrypt", async () => {
  assert.ok(configFromEnv({ DEMO_DIST: dist }).problems.length >= 2);
  assert.match(configFromEnv({ DEMO_PASSWORD_HASH: PASSWORD, DEMO_SESSION_SECRET: SECRET, DEMO_DIST: dist }).problems.join(), /DEMO_PASSWORD_HASH/, "a plain password is not accepted as the hash");
  assert.match(configFromEnv({ DEMO_PASSWORD_HASH: hashText, DEMO_SESSION_SECRET: "short", DEMO_DIST: dist }).problems.join(), /SECRET/);
  const h2 = await hashPassword(PASSWORD);
  assert.notEqual(h2, hashText, "a random salt each time");
  assert.ok(await verifyPassword(PASSWORD, parseHash(h2)));
  assert.ok(!(await verifyPassword("Correct horse battery staple", parseHash(h2))));
  assert.ok(!hashText.includes(PASSWORD));
});

test("DS-9 the built app holds no demo secret: the English build never reads them", () => {
  const build = readFileSync(new URL("./build-english.mjs", import.meta.url), "utf8");
  assert.ok(!/DEMO_/.test(build), "build-english.mjs reads no DEMO_ variable");
  const built = new URL("../dist-english/", import.meta.url);
  if (!existsSync(built)) return; // checked in CI after a build made with sentinel values in the environment
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  for (const f of walk(built.pathname)) {
    const t = readFileSync(f, "utf8");
    for (const bad of ["DEMO_PASSWORD_HASH", "DEMO_SESSION_SECRET", "scrypt$", process.env.DEMO_SENTINEL].filter(Boolean)) assert.ok(!t.includes(bad), `${bad} in ${f}`);
  }
});
