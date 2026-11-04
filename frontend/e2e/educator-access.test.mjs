/**
 * Educator access (educator-access@1) through the real UI against the real Django API: an administrator (a Django
 * superuser, set by the server operator) gives an existing account the educator role from Content review → Educator
 * access; that educator opens the existing marking screen; a parent sees no such tab and is refused by the API; the
 * administrator removes the role and the educator loses the marking screen.
 *
 *   YEAR_URL=http://127.0.0.1:4190 YEAR_MANAGE="python backend/manage.py" node --import tsx --test e2e/educator-access.test.mjs
 *
 * Synthetic accounts only. Screenshots go to SHOTS (default ../docs/educator-access/screens).
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const base = process.env.YEAR_URL ?? "http://127.0.0.1:4190";
const MANAGE = process.env.YEAR_MANAGE ?? "python3 backend/manage.py";
const shots = process.env.SHOTS ?? fileURLToPath(new URL("../../docs/educator-access/screens/", import.meta.url));
mkdirSync(shots, { recursive: true });
const root = fileURLToPath(new URL("../../", import.meta.url));
const PASSWORD = "synthetic-family-passphrase-access";
const stamp = Date.now();
const ADMIN = `admin-${stamp}@example.org`, EDUCATOR = `educator-${stamp}@example.org`, PARENT = `parent-${stamp}@example.org`;
let browser;

async function call(page, path, body, method) {
  return page.evaluate(async ({ path, body, method }) => {
    if (!document.cookie.includes("csrftoken")) await fetch("/api/account/", { credentials: "same-origin" });
    const token = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "";
    const r = await fetch("/api" + path, { method: method ?? (body ? "POST" : "GET"), credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(token) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: await r.json().catch(() => null) };
  }, { path, body, method });
}

async function register(email) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(base + "/review/");
  assert.equal((await call(page, "/account/register/", { email, password: PASSWORD, consent: true })).status, 201);
  await ctx.close();
}

async function signIn(email, hash = "") {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/review/${hash}`);
  await page.getByLabel(/Email/).fill(email);
  await page.getByLabel(/Password/).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByTestId("roles").waitFor({ timeout: 60_000 });
  return { ctx, page };
}

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH || undefined });
  for (const e of [ADMIN, EDUCATOR, PARENT]) await register(e);
  // the operator makes one existing account an administrator; the app itself never can
  execSync(`${MANAGE} shell -c "from django.contrib.auth import get_user_model as g; assert g().objects.filter(username='${ADMIN}').update(is_superuser=True) == 1"`, { cwd: root, stdio: "pipe", shell: "/bin/bash" });
});
after(() => browser?.close());

test("an administrator grants and removes the educator role; the educator reaches the existing marking screen only while granted; a parent cannot", { timeout: 300_000 }, async () => {
  // a parent: no tab, and the API refuses
  const parent = await signIn(PARENT);
  assert.equal(await parent.page.getByRole("button", { name: "Educator access" }).count(), 0, "no tab for a parent");
  assert.equal((await call(parent.page, "/educator-access/", { email: PARENT })).status, 403);
  assert.equal((await call(parent.page, "/educator-access/")).status, 403);
  await parent.ctx.close();

  // the educator before the grant: no marking
  let edu = await signIn(EDUCATOR, "#marking");
  await edu.page.getByText("Marking written answers needs the educator role.").waitFor();
  await edu.ctx.close();

  // the administrator grants
  const admin = await signIn(ADMIN);
  await admin.page.getByRole("button", { name: "Educator access" }).click();
  await admin.page.getByRole("heading", { name: "Educator access" }).waitFor();
  await admin.page.getByLabel("Account email").fill(`nobody-${stamp}@example.org`);
  await admin.page.getByRole("button", { name: "Give the educator role" }).click();
  await admin.page.getByRole("alert").filter({ hasText: /No OpenPath account uses that email/ }).waitFor();
  await admin.page.getByLabel("Account email").fill(EDUCATOR);
  await admin.page.getByRole("button", { name: "Give the educator role" }).click();
  await admin.page.getByRole("status").filter({ hasText: `${EDUCATOR} can now mark written answers` }).waitFor();
  const row = admin.page.locator("tr").filter({ hasText: EDUCATOR });
  assert.match(await row.innerText(), /Since \d{4}-\d{2}-\d{2}/);
  await admin.page.screenshot({ path: `${shots}1-admin-granted.png`, fullPage: true });

  // the educator reaches the existing marking screen
  edu = await signIn(EDUCATOR, "#marking");
  await edu.page.getByRole("heading", { name: "Written answers to mark" }).waitFor();
  assert.match(await edu.page.getByTestId("roles").innerText(), /educator/);
  assert.equal(await edu.page.getByRole("button", { name: "Educator access" }).count(), 0, "an educator cannot grant roles");
  assert.equal((await call(edu.page, "/educator-access/", { email: PARENT })).status, 403);
  await edu.page.screenshot({ path: `${shots}2-educator-marking.png`, fullPage: true });

  // the administrator removes it; the educator's marking screen closes on the next load
  await admin.page.getByRole("button", { name: `Remove the educator role from ${EDUCATOR}` }).click();
  await admin.page.getByRole("status").filter({ hasText: `${EDUCATOR} no longer has the educator role.` }).waitFor();
  assert.match(await row.innerText(), /Removed/);
  await admin.page.screenshot({ path: `${shots}3-admin-removed.png`, fullPage: true });
  assert.equal((await call(edu.page, "/written/queue/")).status, 403);
  await edu.page.reload();
  await edu.page.getByText("Marking written answers needs the educator role.").waitFor();
  await edu.page.screenshot({ path: `${shots}4-educator-no-marking.png`, fullPage: true });
  await edu.ctx.close();
  await admin.ctx.close();
});
