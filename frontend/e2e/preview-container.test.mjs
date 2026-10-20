/** Real built preview + Django. Synthetic data only. PREVIEW_PHASE=resume runs after container restart. */
import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { createWork, manual } from "../src/writing/model.ts";
const base = process.env.E2E_URL ?? "http://127.0.0.1:10000";
const password = process.env.PREVIEW_PASSWORD ?? "synthetic-preview-test-pass";
const state =
  process.env.PREVIEW_STATE ?? "/tmp/openpath-preview-container-state.json";
const accountPassword = "synthetic-preview-parent-password";
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
});
after(() => browser?.close());
async function call(c, method, path, data) {
  const token =
    (await c.cookies()).find((x) => x.name === "csrftoken")?.value ?? "";
  const r = await c.request.fetch(base + "/api" + path, {
    method,
    data,
    headers: { "X-CSRFToken": token },
  });
  assert.ok(r.ok(), `${method} ${path}: ${r.status()} ${await r.text()}`);
  return r.status() === 204 ? null : r.json();
}
async function gate(c) {
  const p = await c.newPage();
  await p.goto(base + "/year/");
  assert.match(p.url(), /\/login$/);
  await p.getByText("Account access", {exact:true}).click();
  await p.getByLabel("Preview password").fill(password);
  await p.getByRole("button", { name: "Log in", exact: true }).click();
  await p.waitForURL(base + "/");
  await p.waitForLoadState("networkidle"); // let initial CSRF cookie responses settle before API registration
  await call(c, "GET", "/account/");
  return p;
}
if (process.env.PREVIEW_PHASE === "resume") {
  test("same synthetic account, mathematics evidence and unfinished work survive container restart", async () => {
    const s = JSON.parse(readFileSync(state, "utf8"));
    const c = await browser.newContext();
    const p = await gate(c);
    await call(c, "POST", "/account/login/", {
      email: s.email,
      password: accountPassword,
    });
    const pupils = (await call(c, "GET", "/pupils/")).pupils;
    assert.ok(pupils.some((x) => x.id === s.pupil));
    const a = await call(c, "GET", `/pupils/${s.pupil}/writing/${s.draft}/`);
    assert.equal(a.stage, "workspace");
    assert.equal(a.work.tokens[0].text, "126");
    assert.equal(
      (await call(c, "GET", `/pupils/${s.pupil}/events/?subject=mathematics`))
        .count,
      s.count,
    );
    await p.goto(base + `/year/?learner=${s.pupil}`);
    await p
      .getByRole("heading", { name: "Set up My Learning Year", exact: true })
      .waitFor();
    await c.close();
  });
} else {
  test("password gate protects curriculum, recognition assets and API; readiness stays public", async () => {
    const c = await browser.newContext();
    for (const path of [
      "/year/",
      "/year/app.js",
      "/recognition/mnist.onnx",
      "/recognition/ort-wasm-simd-threaded.wasm",
      "/api/account/",
    ]) {
      const r = await c.request.get(base + path, { maxRedirects: 0 });
      assert.equal(r.status(), 401, path);
      assert.equal(r.headers()["cache-control"], "no-store");
    }
    assert.equal((await c.request.get(base + "/healthz")).status(), 200);
    assert.equal((await c.request.post(base + "/healthz")).status(), 405);
    const p = await gate(c);
    assert.equal((await c.request.get(base + "/api/account/")).status(), 200);
    const refused = await c.request.post(base + "/api/account/login/", {
      data: { email: "nobody@example.org", password: "synthetic-no-csrf" },
    });
    assert.equal(
      refused.status(),
      403,
      "Django CSRF is still enforced behind gate",
    );
    await p.goto(base + "/logout");
    await p.getByRole("button", { name: "Log out", exact: true }).click();
    assert.equal(
      (
        await c.request.get(base + "/year/app.js", { maxRedirects: 0 })
      ).status(),
      401,
    );
    await c.close();
  });
  test("all packaged entry points refresh and local ONNX modules have browser-safe MIME and CSP", async () => {
    const c = await browser.newContext();
    const p = await gate(c);
    for (const [path, title] of [
      ["/year/", "My Learning Year"],
      ["/review/", "Content review"],
      ["/maths/", "Mathematics"],
      ["/tamil/", "தமிழ்"],
      ["/mathematics.html", "Mathematics"],
      ["/writing.html", "Mathematical"],
    ]) {
      const r = await c.request.get(base + path);
      assert.equal(r.status(), 200, path);
      assert.match(await r.text(), new RegExp(title, "i"), path);
      assert.match(r.headers()["content-type"], /text\/html/);
    }
    const slash = await c.request.get(base + "/year?learner=synthetic", {
      maxRedirects: 0,
    });
    assert.equal(slash.status(), 301);
    assert.equal(slash.headers().location, "/year/?learner=synthetic");
    const wasm = await c.request.head(
      base + "/recognition/ort-wasm-simd-threaded.wasm",
    );
    assert.equal(wasm.headers()["content-type"], "application/wasm");
    const mjs = await c.request.head(
      base + "/recognition/ort-wasm-simd-threaded.mjs",
    );
    assert.match(mjs.headers()["content-type"], /javascript/);
    const year = await c.request.get(base + "/year/");
    assert.match(
      year.headers()["content-security-policy"],
      /'wasm-unsafe-eval'/,
    );
    assert.match(
      year.headers()["content-security-policy"],
      /frame-ancestors 'none'/,
    );
    await p.goto(base + "/year/");
    await p
      .getByRole("heading", { name: "Sign in to OpenPath", exact: true })
      .waitFor();
    await p.reload();
    await p
      .getByRole("heading", { name: "Sign in to OpenPath", exact: true })
      .waitFor();
    await c.close();
  });
  test("real API saves provisional mathematics work for restart verification", async () => {
    const c = await browser.newContext();
    await gate(c);
    const email = `container.${Date.now()}@example.org`;
    await call(c, "POST", "/account/register/", {
      email,
      password: accountPassword,
      consent: true,
    });
    const pupil = await call(c, "POST", "/pupils/", {
      display_name: "Synthetic container learner",
      consent: true,
    });
    let a = await call(c, "POST", `/pupils/${pupil.id}/writing/`, {
      topic: "division",
    });
    const draft = a.id;
    for (let i = 0; i < 2; i++)
      a = await call(
        c,
        "POST",
        `/pupils/${pupil.id}/writing/${draft}/action/`,
        { action: "next" },
      );
    const work = manual(
      createWork(draft, a.lesson.problem, a.lesson.layout),
      "quotient",
      "126",
      "keyboard",
    );
    await call(c, "PUT", `/pupils/${pupil.id}/writing/${draft}/`, {
      version: a.version,
      work,
    });
    const checked = await call(
      c,
      "POST",
      `/pupils/${pupil.id}/writing/${draft}/validate/`,
      { revision: work.revision },
    );
    assert.equal(checked.result.outcome, "incomplete");
    const ledger = await call(
      c,
      "GET",
      `/pupils/${pupil.id}/events/?subject=mathematics`,
    );
    assert.ok(ledger.events.every((e) => e.admissible === false));
    writeFileSync(
      state,
      JSON.stringify({ email, pupil: pupil.id, draft, count: ledger.count }),
      { mode: 0o600 },
    );
    await c.close();
  });
}
