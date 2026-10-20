/** Real authenticated Django, selected curriculum, shared planner/validator. Synthetic people only. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { question } from "../../packages/learning/src/content.ts";
import { learnerState } from "../../packages/learning/src/session.ts";
const BASE = process.env.E2E_URL ?? "http://127.0.0.1:4722";
const OUT = "../docs/product/grade7-journey/screens";
mkdirSync(OUT, { recursive: true });
async function api(c, method, path, data) {
  const csrf =
    (await c.cookies()).find((x) => x.name === "csrftoken")?.value ?? "";
  const r = await c.request.fetch(BASE + "/api" + path, {
    method,
    data,
    headers: { "X-CSRFToken": csrf },
  });
  assert.ok(r.ok(), `${method} ${path} ${r.status()} ${await r.text()}`);
  return r.json();
}
async function setup(browser, width) {
  const c = await browser.newContext({
    viewport: { width, height: 851 },
    isMobile: true,
    hasTouch: true,
  });
  if (process.env.PREVIEW_PASSWORD) {
    const gate = await c.request.post(BASE + "/login", {
      form: { password: process.env.PREVIEW_PASSWORD },
      maxRedirects: 0,
    });
    assert.equal(gate.status(), 303);
  }
  await c.request.get(BASE + "/api/account/");
  await api(c, "POST", "/account/register/", {
    email: `grade7.${Date.now()}.${width}@example.org`,
    password: "synthetic-mathematics-48261",
    consent: true,
  });
  const child = await api(c, "POST", "/pupils/", {
    display_name: "Synthetic Grade 7 learner",
    consent: true,
  });
  const p = await c.newPage();
  p.setDefaultTimeout(20000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(BASE + "/year/?learner=" + child.id);
  await p.getByRole("button", { name: /^Grade 7\b/ }).click();
  await p.getByRole("button", { name: "No goal for now", exact: true }).click();
  await p
    .getByRole("button", { name: /Sample Mathematics|OpenPath Sample/i })
    .first()
    .click();
  await p.getByRole("button", { name: "Start Grade 7", exact: true }).click();
  await p.getByRole("heading", { name: "Mathematics", exact: true }).waitFor();
  return { c, p, child, errors };
}
async function noOverflow(p) {
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "no horizontal overflow",
  );
}
async function screenshot(p, name, width) {
  await noOverflow(p);
  await p.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true });
}
async function finishModule(p, { wrongDiagnostic = false } = {}) {
  let questions = 0,
    teaching = 0,
    hints = 0;
  for (let turn = 0; turn < 65; turn++) {
    const finish = p.getByRole("button", {
      name: "Finish this module for now",
      exact: true,
    });
    if (await finish.isVisible()) {
      await finish.click();
      await p
        .getByRole("heading", { name: "Mathematics", exact: true })
        .waitFor();
      return { questions, teaching, hints };
    }
    const cont = p.getByRole("button", { name: "Continue", exact: true });
    if (await cont.isVisible()) {
      await cont.click();
      continue;
    }
    const tryIt = p.getByRole("button", { name: "Try it", exact: true });
    if (await tryIt.isVisible()) {
      teaching++;
      await tryIt.click();
      continue;
    }
    const next = p.getByRole("button", { name: "Next", exact: true });
    if (await next.isVisible()) {
      await next.click();
      continue;
    }
    const card = p.locator("[data-qid]");
    if (await card.isVisible()) {
      const q = question(await card.getAttribute("data-qid"));
      const hint = p.getByRole("button", { name: "Show a hint", exact: true });
      if (await hint.isVisible()) {
        await hint.click();
        hints++;
      }
      const input = p.getByRole("textbox", {
        name: "Your answer",
        exact: true,
      });
      const response = wrongDiagnostic && questions < 3 ? "99999" : q.answer;
      if (await input.isVisible()) await input.fill(response);
      else
        await p
          .getByRole("radio")
          .nth(
            (q.answer.charCodeAt(0) -
              65 +
              (wrongDiagnostic && questions < 3 ? 1 : 0)) %
              (q.options?.length ?? 4),
          )
          .click();
      const work = p.getByText("Show your working (optional)", { exact: true });
      if (await work.isVisible()) {
        if (
          !(await p
            .getByRole("textbox", { name: "Your working", exact: true })
            .isVisible())
        )
          await work.click();
        await p
          .getByRole("textbox", { name: "Your working", exact: true })
          .fill(q.solution);
      }
      await p.getByRole("button", { name: "Check", exact: true }).click();
      await p.getByRole("button", { name: "Continue", exact: true }).waitFor();
      questions++;
      continue;
    }
    await p.waitForTimeout(100);
  }
  throw new Error(
    "Module failed to finish: " + (await p.locator("main").innerText()),
  );
}
for (const width of [360, 393])
  test(`Grade 7 30-minute lesson, autosave/resume, shared GRE foundation and unsupported exams at ${width}px`, async () => {
    const browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    });
    const { c, p, child, errors } = await setup(browser, width);
    try {
      assert.match(
        await p.locator("main").innerText(),
        /Synthetic curriculum preview/,
      );
      await screenshot(p, "overview", width);
      const topics = p.getByRole("region", { name: "Grade curriculum topics" });
      await topics.waitFor();
      // All visible hierarchy and titles are read from the pinned curriculum release.
      await p
        .locator(".topic-tile")
        .evaluateAll((xs) => xs.forEach((x) => (x.open = true)));
      assert.match(await topics.innerText(), /Rational numbers/);
      assert.match(await topics.innerText(), /Lesson not yet available/);
      await p
        .locator('.journey-skill[data-competency="MATH.number.percentage"]')
        .getByRole("button", { name: "Study", exact: true })
        .first()
        .click();
      await p.getByRole("button", { name: "30 min", exact: true }).click();
      await screenshot(p, "topics", width);
      await p
        .getByRole("button", { name: "Start session", exact: true })
        .click();
      await p.locator("[data-qid]").waitFor();
      const initial = await p.locator("[data-qid]").getAttribute("data-qid");
      await p
        .getByRole("textbox", { name: "Your answer", exact: true })
        .fill("99");
      await p.waitForTimeout(5700);
      assert.ok(
        await p
          .getByRole("textbox", { name: "Your answer", exact: true })
          .evaluate((el) => document.activeElement === el),
        "autosave preserves native-input focus",
      );
      await p
        .getByRole("button", { name: "Save and return to plan", exact: true })
        .click();
      const firstRecords = (
        await api(c, "GET", `/pupils/${child.id}/events/?subject=mathematics`)
      ).events;
      assert.equal(
        firstRecords.find(
          (e) => e.kind === "math_session" && e.action === "plan",
        ).plan.budgetMinutes,
        30,
      );
      assert.ok(
        firstRecords.some(
          (e) =>
            e.action === "time" &&
            e.usage.activeMs > 0 &&
            e.usage.solvingMs > 0,
        ),
      );
      await p.reload();
      await p
        .getByRole("button", { name: "Resume session", exact: true })
        .click();
      assert.equal(
        await p.locator("[data-qid]").getAttribute("data-qid"),
        initial,
      );
      assert.equal(
        await p
          .getByRole("textbox", { name: "Your answer", exact: true })
          .inputValue(),
        "99",
      );
      await screenshot(p, "question", width);
      // Diagnostic errors provoke the actual engine's targeted teaching; no static test feedback.
      let guided = false,
        teachSeen = false;
      for (let turn = 0; turn < 20; turn++) {
        const tryIt = p.getByRole("button", { name: "Try it", exact: true });
        if (await tryIt.isVisible()) {
          teachSeen = true;
          await screenshot(p, "teaching", width);
          await tryIt.click();
          break;
        }
        const next = p.getByRole("button", { name: "Next", exact: true });
        if (await next.isVisible()) {
          await next.click();
          continue;
        }
        const cont = p.getByRole("button", { name: "Continue", exact: true });
        if (await cont.isVisible()) {
          await cont.click();
          continue;
        }
        const card = p.locator("[data-qid]");
        if (await card.isVisible()) {
          const q = question(await card.getAttribute("data-qid"));
          if (
            await p
              .getByRole("textbox", { name: "Your answer", exact: true })
              .isVisible()
          )
            await p
              .getByRole("textbox", { name: "Your answer", exact: true })
              .fill(turn < 6 ? "99999" : q.answer);
          else await p.getByRole("radio").first().click();
          await p.getByRole("button", { name: "Check", exact: true }).click();
          await p
            .getByRole("button", { name: "Continue", exact: true })
            .waitFor();
          continue;
        }
        await p.waitForTimeout(100);
      }
      assert.ok(teachSeen, "actual engine teaching reached after diagnostic");
      const help = p.locator(".context-help summary");
      if (await help.isVisible()) {
        await help.click();
        guided = true;
      }
      const hint = p.getByRole("button", { name: "Show a hint", exact: true });
      if (await hint.isVisible()) await hint.click();
      const guidedQuestion = await p
        .locator("[data-qid]")
        .getAttribute("data-qid");
      await p
        .getByText("Show your working (optional)", { exact: true })
        .click();
      await p
        .getByRole("textbox", { name: "Your working", exact: true })
        .fill("90 / 100 × 60");
      await p
        .getByRole("button", { name: "Save and return to plan", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Resume session", exact: true })
        .waitFor();
      await p.reload();
      await p
        .getByRole("button", { name: "Resume session", exact: true })
        .click();
      await p.locator("[data-qid]").waitFor();
      assert.equal(
        await p.locator("[data-qid]").getAttribute("data-qid"),
        guidedQuestion,
      );
      await p
        .getByText("Show your working (optional)", { exact: true })
        .click();
      assert.equal(
        await p
          .getByRole("textbox", { name: "Your working", exact: true })
          .inputValue(),
        "90 / 100 × 60",
      );
      await screenshot(p, "practice", width);
      const result = await finishModule(p);
      assert.ok(result.questions > 0);
      assert.ok(guided);
      const school = (
        await api(c, "GET", `/pupils/${child.id}/events/?subject=mathematics`)
      ).events;
      const schoolPlan = school.find(
        (e) => e.kind === "math_session" && e.action === "plan",
      ).plan;
      assert.ok(
        school.some(
          (e) =>
            e.record === "teach" && e.competency === "MATH.number.percentage",
        ),
      );
      assert.ok(
        school.some((e) => e.record === "attempt" && e.activity === "guided"),
      );
      assert.ok(
        school.some((e) => e.action === "finish" && e.planId === schoolPlan.id),
      );
      const state = learnerState(String(child.id), school, Date.now());
      assert.notEqual(
        state.evidence("MATH.number.percentage").status,
        "verified",
      );
      await screenshot(p, "progress", width);
      await p
        .getByRole("button", { name: "Exam refresher", exact: true })
        .click();
      await p.getByRole("button", { name: "GRE", exact: true }).click();
      await screenshot(p, "gre-scope", width);
      await p
        .getByRole("button", {
          name: "Start foundation diagnostic",
          exact: true,
        })
        .click();
      await p
        .getByRole("heading", { level: 1, name: /fraction|percentage/i })
        .waitFor();
      const comp = await p.getByRole("heading", { level: 1 }).innerText();
      assert.match(comp, /fraction|percentage/i);
      // Shared history may already establish the short diagnostic; it is not repeated as fresh evidence.
      await p
        .getByRole("button", { name: "Save and return to plan", exact: true })
        .click();
      const both = (
        await api(c, "GET", `/pupils/${child.id}/events/?subject=mathematics`)
      ).events;
      const gre = both.find(
        (e) => e.action === "plan" && e.plan.scope === "gre-quant",
      ).plan;
      assert.ok(
        !gre.modules.some((m) => m.competency === "MATH.number.percentage"),
        "school understanding informs the foundation plan without copying completion",
      );
      assert.notEqual(gre.id, schoolPlan.id);
      assert.equal(
        both.filter((e) => e.action === "finish" && e.planId === gre.id).length,
        0,
      );
      await p.getByRole("button", { name: "TNPSC", exact: true }).click();
      assert.match(await p.locator("main").innerText(), /Not available/);
      assert.equal(
        await p
          .getByRole("button", {
            name: "Start foundation diagnostic",
            exact: true,
          })
          .count(),
        0,
      );
      await p.getByRole("button", { name: "UPSC / IAS", exact: true }).click();
      await screenshot(p, "unsupported", width);
      assert.deepEqual(errors, []);
    } finally {
      await c.close();
      await browser.close();
    }
  });

test("Fresh GRE learner completes the shared diagnostic and foundation refresher without an official score", async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  });
  const { c, p, child, errors } = await setup(browser, 412);
  try {
    await p
      .getByRole("button", { name: "Exam refresher", exact: true })
      .click();
    await p.getByRole("button", { name: "GRE", exact: true }).click();
    await p
      .getByRole("button", { name: "Start foundation diagnostic", exact: true })
      .click();
    await p.locator("[data-qid]").waitFor();
    assert.match(await p.locator(".counted").innerText(), /short check/);
    const result = await finishModule(p, { wrongDiagnostic: true });
    assert.ok(result.teaching > 0);
    const rows = (
      await api(c, "GET", `/pupils/${child.id}/events/?subject=mathematics`)
    ).events;
    const attempts = rows.filter((r) => r.record === "attempt");
    assert.ok(attempts.filter((r) => r.activity === "diagnostic").length >= 1);
    assert.ok(attempts.filter((r) => r.activity === "diagnostic").length <= 3);
    assert.ok(rows.some((r) => r.record === "teach"));
    assert.ok(rows.some((r) => r.action === "finish"));
    assert.equal(
      rows.filter((r) => r.action === "plan" && r.plan.scope === "school")
        .length,
      0,
    );
    assert.notEqual(
      learnerState(String(child.id), rows, Date.now()).evidence(
        "MATH.number.percentage",
      ).status,
      "verified",
    );
    await screenshot(p, "gre-refresher", 412);
    assert.deepEqual(errors, []);
  } finally {
    await c.close();
    await browser.close();
  }
});
