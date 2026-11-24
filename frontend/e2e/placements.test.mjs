/**
 * Content review → Placements (placements@1) through the real UI against the real Django API: a parent's own learner
 * is listed by name with the level the word check gave, the answers by level and the words asked; a second account
 * does not see that learner.
 *
 *   YEAR_URL=http://127.0.0.1:4190 YEAR_MANAGE="python backend/manage.py" node --test e2e/placements.test.mjs
 *
 * Synthetic accounts only. Screenshots go to SHOTS.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const base = process.env.YEAR_URL ?? "http://127.0.0.1:4190";
const MANAGE = process.env.YEAR_MANAGE ?? "python3 backend/manage.py";
const shots = process.env.SHOTS ?? "/tmp/placements-screens/";
mkdirSync(shots, { recursive: true });
const root = fileURLToPath(new URL("../../", import.meta.url));
const PASSWORD = "synthetic-family-passphrase-placements";
const stamp = Date.now();
const PARENT = `placements-${stamp}@example.org`, OTHER = `placements-other-${stamp}@example.org`;
let browser;

async function register(email) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(base + "/review/");
  const status = await page.evaluate(async ({ email, password }) => {
    if (!document.cookie.includes("csrftoken")) await fetch("/api/account/", { credentials: "same-origin" });
    const token = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "";
    const r = await fetch("/api/account/register/", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(token) }, body: JSON.stringify({ email, password, consent: true }) });
    return r.status;
  }, { email, password: PASSWORD });
  assert.equal(status, 201);
  await ctx.close();
}

async function open(email) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/review/#placements`);
  await page.getByLabel(/Email/).fill(email);
  await page.getByLabel(/Password/).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.locator("[data-placements]").waitFor({ timeout: 60_000 });
  return { ctx, page };
}

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH || undefined });
  for (const e of [PARENT, OTHER]) await register(e);
  // a learner of the parent's who sat the word check: written straight to the record, as the app's sync would
  const seed = `
from django.contrib.auth import get_user_model as g
from django.utils import timezone
from family.models import Pupil, PupilEvent
u = g().objects.get(username='${PARENT}')
p = Pupil.objects.create(parent=u, display_name='Synthetic Friend', consent_policy='guardian')
rows = [dict(type='start', check='6', band=4), dict(type='answer', check='6', word='candid', band=4, outcome='yes', kind='know'), dict(type='answer', check='6', word='blenfor', band=0, outcome='yes', kind='know'), dict(type='answer', check='6', word='abhor', band=6, outcome='wrong', kind='pick'), dict(type='answer', check='6', word='glad', band=1, outcome='right', kind='pick'), dict(type='result', check='6', band=3, answered=4, low=2, high=4)]
for i, r in enumerate(rows):
    PupilEvent.objects.create(pupil=p, subject='english', seq=i + 1, kind='vocab', occurred_at=timezone.now(), body=dict(kind='vocab', record=r))
`;
  const file = `/tmp/placements-seed-${stamp}.py`;
  writeFileSync(file, seed);
  execSync(`${MANAGE} shell < ${file}`, { cwd: root, stdio: "pipe", shell: "/bin/bash" });
});
after(async () => browser?.close());

test("a parent sees their own learner's word check: the level, the answers by level and the words asked", async () => {
  const { ctx, page } = await open(PARENT);
  const mine = page.locator('[data-learner="mine"]');
  await mine.getByRole("heading", { name: "Synthetic Friend" }).waitFor();
  const text = await mine.innerText();
  assert.match(text, /Word check: level 3 of 8, could be 2 to 4/);
  assert.match(text, /4 answers · started at level 4/);
  assert.match(text, /L1 ✓ · L4 ✓ · L6 ✗ · invented words claimed: 1 of 1/);
  await mine.getByText("What was asked").click();
  assert.match(await mine.innerText(), /candid \(4\) said knows · blenfor \(invented\) said knows · abhor \(6\) wrong · glad \(1\) right/);
  await page.getByRole("button", { name: "Copy everything as text" }).waitFor();
  await page.screenshot({ path: `${shots}placements-phone.png`, fullPage: true });
  await ctx.close();
});

test("another account does not see that learner", async () => {
  const { ctx, page } = await open(OTHER);
  assert.equal(await page.locator("[data-placements]").getAttribute("data-placements"), "0");
  assert.equal(await page.getByText("Synthetic Friend").count(), 0);
  await page.getByText("No one has taken the word check or Find my level in this time.").waitFor();
  await ctx.close();
});
