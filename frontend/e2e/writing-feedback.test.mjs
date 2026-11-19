/**
 * AI feedback on a writing task, end to end in a phone-sized browser: the app, its API (Django) and a stand-in for
 * the model provider that this test runs itself, so no real provider is ever called and nothing is paid for.
 *
 *   (backend)  OPENPATH_WRITING_FEEDBACK=on OPENPATH_WRITING_FEEDBACK_MODEL=stand-in OPENPATH_WRITING_FEEDBACK_API_KEY=test-key-never-real \
 *              OPENPATH_WRITING_FEEDBACK_BASE_URL=http://127.0.0.1:8099 OPENPATH_SECURE_COOKIES=0 NO_PROXY=127.0.0.1 \
 *              python manage.py runserver 127.0.0.1:8000 --noreload
 *   (frontend) npm run english:build && PORT=4175 API_TARGET=http://127.0.0.1:8000 npm run english:preview
 *   E2E_URL=http://127.0.0.1:4175 npm run english:e2e-writing-feedback
 *
 * Synthetic writing only.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4175";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const PARENT = `wf.${Date.now().toString(36)}@example.org`;
const FEEDBACK = {
  points: [
    { met: "yes", note: "Your words are about the people in your picture." },
    { met: "yes", note: "You wrote four sentences." },
    { met: "partly", note: "Most sentences end with a full stop." },
  ],
  strength: "You told us something about each person.",
  next: "Say what your family likes to do together.",
};

let browser, provider;
const sent = [];
before(async () => {
  provider = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      sent.push({ url: req.url, key: req.headers["x-api-key"], body: JSON.parse(body) });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(FEEDBACK) }], stop_reason: "end_turn", usage: { input_tokens: 400, output_tokens: 80 } }));
    });
  });
  await new Promise((r) => provider.listen(Number(process.env.PROVIDER_PORT ?? 8099), "127.0.0.1", r));
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(async () => (await browser?.close(), provider?.close()));

test("a parent agrees once, the free check comes first, feedback is shown, and the week's three are counted", async () => {
  const context = await browser.newContext(PHONE);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = async (name) => SHOTS && (await page.screenshot({ path: `${SHOTS}/wf-${name}.png`, fullPage: true }));
  const fits = async () => {
    const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    assert.ok(sw <= w, `page is ${sw}px wide on a ${w}px screen`);
  };
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByRole("heading", { name: "Create your parent account" }).waitFor();
  await page.getByLabel("Email", { exact: true }).fill(PARENT);
  await page.getByLabel("Password", { exact: true }).fill("a-long-family-passphrase");
  await page.locator("#account-consent").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
  await page.getByRole("button", { name: "Add a learner" }).click();
  await page.getByLabel(/Name to show/).fill("Meena");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.getByRole("button", { name: "Open the class syllabus" }).click();
  await page.getByRole("button", { name: "Class 1", exact: true }).click();
  await page.getByRole("heading", { name: "Class 1 English" }).waitFor();
  await page.getByRole("button", { name: /Practise RW8:/ }).click();
  const task = page.locator('[data-task="c1.rw8.w1"]');
  await task.getByRole("button", { name: "Start writing" }).click();
  const ai = task.locator(".ai-feedback");
  // an unfinished piece cannot use one of the week's three
  await task.locator("textarea").fill("this is my familly.");
  await ai.getByText("Check your writing first.").waitFor();
  await task.getByRole("button", { name: "Check my writing" }).click();
  await ai.getByText("Write at least 10 words first.").waitFor();
  await task.locator("textarea").fill("this is my familly. My mother is tall and my father is kind. I have one brother.");
  await task.getByRole("button", { name: "Check my writing" }).click();
  await ai.getByText(/Fix the 2 points marked/).waitFor();
  assert.equal(sent.length, 0);
  const piece = "This is my family. My mother is tall and my father is kind. I have one brother. We play in the park.";
  // the full spelling list is fetched on the first check: an unknown word is a tip with the likely word, and a tip
  // does not hold AI feedback back
  await task.locator("textarea").fill(`${piece} My frend Kavi plays too.`);
  await task.getByRole("button", { name: "Check my writing" }).click();
  await task.getByText("Check the spelling of this word: “frend” (friend?)", { exact: false }).waitFor();
  await ai.getByText("For a parent: I agree", { exact: false }).waitFor();
  // a clean piece: the parent is asked first, once
  await task.locator("textarea").fill(piece);
  await task.getByRole("button", { name: "Check my writing" }).click();
  await ai.getByText("For a parent: I agree that this learner's writing may be sent to an AI model", { exact: false }).waitFor();
  assert.equal(await ai.getByRole("button", { name: "Agree" }).isDisabled(), true);
  await fits();
  await shot("1-consent");
  await ai.getByRole("checkbox").check();
  await ai.getByRole("button", { name: "Agree" }).click();
  await ai.getByRole("button", { name: "Ask for AI feedback (3 of 3 left this week)" }).click();
  await ai.locator('[data-met="partly"]', { hasText: "Used a capital letter and a full stop: Partly. Most sentences end with a full stop." }).waitFor();
  await ai.locator("[data-strength]", { hasText: FEEDBACK.strength }).waitFor();
  await ai.locator("[data-next]", { hasText: "Next time: Say what your family likes to do together." }).waitFor();
  await ai.getByText("This feedback is written by an AI model. It can be wrong", { exact: false }).waitFor();
  await ai.getByText("2 of 3 left this week.", { exact: false }).waitFor();
  await fits();
  await shot("2-feedback");
  // what reached the provider: the server's key and prompt, the task and the piece; never the learner or the account
  assert.equal(sent.length, 1);
  assert.equal(sent[0].key, "test-key-never-real");
  assert.ok(sent[0].body.max_tokens <= 400);
  const wire = JSON.stringify(sent[0].body);
  assert.ok(wire.includes("Draw your family on paper") && wire.includes("This is my family"));
  assert.ok(!wire.includes("Meena") && !wire.includes(PARENT));
  // changing the writing clears the feedback; a second piece is counted; the parent is not asked again
  await task.locator("textarea").fill(`${piece} We are happy.`);
  await task.getByRole("button", { name: "Check my writing" }).click();
  await ai.getByRole("button", { name: "Ask for AI feedback (2 of 3 left this week)" }).click();
  await ai.getByText("1 of 3 left this week.", { exact: false }).waitFor();
  assert.equal(sent.length, 2);
  // the writing and the feedback are not kept on the device
  assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes("This is my family")), false);
  // after a reload the count and the parent's yes are remembered by the server
  await page.reload();
  const syllabus = page.getByRole("button", { name: "Open the class syllabus" });
  const who = page.getByRole("button", { name: /Meena/ });
  await syllabus.or(who).first().waitFor();
  if (!(await syllabus.count())) await who.first().click();
  await syllabus.click();
  await page.getByRole("button", { name: "Class 1", exact: true }).click();
  await page.getByRole("button", { name: /Practise RW8:/ }).click();
  await task.getByRole("button", { name: /Start writing|Do it again/ }).click();
  await task.locator("textarea").fill(`${piece} We sing songs.`);
  await task.getByRole("button", { name: "Check my writing" }).click();
  await ai.getByRole("button", { name: "Ask for AI feedback (1 of 3 left this week)" }).click();
  await ai.getByText("0 of 3 left this week.", { exact: false }).waitFor();
  await task.locator("textarea").fill(`${piece} We read books.`);
  await task.getByRole("button", { name: "Check my writing" }).click();
  await ai.getByText("This week's 3 pieces of AI feedback are used. More come on Monday.").waitFor();
  assert.equal(sent.length, 3);
  await shot("3-used");
  // a parent can withdraw the yes: the box comes back, and nothing more is sent
  await ai.getByRole("button", { name: "Stop AI feedback for this learner" }).click();
  await ai.getByText("For a parent: I agree", { exact: false }).waitFor();
  assert.equal(await ai.getByRole("button", { name: "Agree" }).isDisabled(), true);
  assert.equal(sent.length, 3);
  assert.deepEqual(errors, []);
  await context.close();
});
