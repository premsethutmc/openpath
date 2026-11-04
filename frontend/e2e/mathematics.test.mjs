import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
let browser;
const base = process.env.MATH_URL ?? "http://127.0.0.1:4176";
before(async () => {
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH === ""
        ? undefined
        : (process.env.CHROMIUM_PATH ?? "/usr/bin/chromium"),
  });
});
after(async () => browser?.close());
async function page(width = 360) {
  const context = await browser.newContext({
    viewport: { width, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  const p = await context.newPage();
  p.on("pageerror", (e) => {
    throw e;
  });
  await p.goto(base);
  await p.getByRole("heading", { name: "Mathematics", exact: true }).waitFor();
  return p;
}
async function open(p, query = "Combine quantities") {
  await p.getByRole("searchbox").fill(query);
  await p.getByRole("button", { name: new RegExp(query) }).click();
}
async function finish(p) {
  await p.getByRole("button", { name: "Finish activity" }).click();
}
async function guided(p) {
  await open(p);
  await finish(p);
  await finish(p);
  await p
    .getByRole("heading", { name: "Guided practice", exact: true })
    .waitFor();
}
for (const width of [320, 360, 412])
  test(`phone ${width}: semantic expandable rows fit and navigation refreshes`, async () => {
    const p = await page(width);
    await open(p);
    assert.equal(
      await p
        .getByRole("button", { name: /Combine quantities/ })
        .getAttribute("aria-expanded"),
      "true",
    );
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.reload();
    await p
      .getByRole("heading", { name: "Concept introduction", exact: true })
      .waitFor();
    assert.equal(
      await p.getByRole("progressbar").getAttribute("aria-valuenow"),
      "0",
    );
    await p.context().close();
  });
test("keyboard answer, hint, interrupted draft and support metadata survive reload", async () => {
  const p = await page();
  await guided(p);
  await p.getByRole("button", { name: "Hint", exact: true }).click();
  await p.getByRole("button", { name: "Worked solution", exact: true }).click();
  await p.getByLabel("Your answer").fill("7");
  await p.reload();
  await p.getByLabel("Your answer").waitFor();
  assert.equal(await p.getByLabel("Your answer").inputValue(), "7");
  await p.getByLabel("Your answer").press("Enter");
  await p.getByText(/Provisional practice, not verified evidence/).waitFor();
  const data = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("openpath-math-program-preview@1")),
  );
  const receipt = Object.values(data.records)[0].attempts[0];
  assert.equal(receipt.hints, 1);
  assert.equal(receipt.solutionSeen, true);
  await finish(p);
  await p.reload();
  await p
    .getByRole("heading", { name: "Independent practice", exact: true })
    .waitFor();
  assert.equal(
    await p.getByRole("progressbar").getAttribute("aria-valuenow"),
    "43",
  );
  assert.ok(
    (await p.locator("main").innerText()).includes(
      "Unavailable — shared engine required",
    ),
  );
  await p.context().close();
});
test("exam selection and school program progress stay separate across refresh", async () => {
  const p = await page(412);
  await p
    .getByRole("button", { name: "Competitive Exams", exact: true })
    .click();
  await p.getByLabel("Exam journey").selectOption("gre-quant");
  await open(p, "Compare fractions");
  await finish(p);
  await p.reload();
  assert.equal(await p.getByLabel("Exam journey").inputValue(), "gre-quant");
  assert.equal(
    await p.getByRole("progressbar").getAttribute("aria-valuenow"),
    "14",
  );
  await p
    .getByRole("button", { name: "School mathematics", exact: true })
    .click();
  await p.getByRole("button", { name: /Compare fractions/ }).click();
  assert.equal(
    await p.getByRole("progressbar").getAttribute("aria-valuenow"),
    "0",
  );
  await p
    .getByRole("button", { name: "Competitive Exams", exact: true })
    .click();
  await p.getByLabel("Exam journey").selectOption("jee-advanced");
  await p
    .getByRole("heading", { name: "JEE Advanced Mathematics", exact: true })
    .waitFor();
  assert.equal(
    await p
      .getByRole("button", { name: "Timed test unavailable" })
      .isDisabled(),
    true,
  );
  await p.context().close();
});
test("empty search and scaffold cannot fabricate completion; storage denial is visible", async () => {
  const p = await page();
  await p.getByRole("searchbox").fill("zz-no-match");
  await p.getByText(/No matching competencies/).waitFor();
  await open(p, "Count objects");
  await p.getByText(/no reviewed lesson or generator/).waitFor();
  assert.equal(
    await p.getByRole("button", { name: "Finish activity" }).count(),
    0,
  );
  await p.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await p
    .getByRole("button", { name: "Worked examples", exact: false })
    .click();
  await p
    .getByRole("alert")
    .getByText(/storage is unavailable/)
    .waitFor();
  await p.context().close();
});
test("original practice flow exports ineligible structured evidence without external requests", async () => {
  const p = await page();
  const external = [];
  p.on("request", (r) => {
    if (!r.url().startsWith(base)) external.push(r.url());
  });
  await guided(p);
  await p.getByLabel("Your answer").fill("0");
  await p.getByRole("button", { name: "Check answer", exact: true }).click();
  const download = p.waitForEvent("download");
  await p
    .getByRole("button", { name: "Export synthetic practice evidence" })
    .click();
  const d = await download;
  const stream = await d.createReadStream();
  let text = "";
  for await (const chunk of stream) text += chunk;
  const [e] = JSON.parse(text);
  assert.equal(e.admissible, false);
  assert.equal(e.contract, "math-candidate@1");
  assert.equal(e.item.provenance.official, false);
  assert.deepEqual(external, []);
  await p.context().close();
});
test("screenshots of school program and competitive journey", async () => {
  const p = await page(412);
  await guided(p);
  await mkdir("../docs/mathematics/screens", { recursive: true });
  await p.screenshot({
    path: "../docs/mathematics/screens/school-program.png",
    fullPage: true,
  });
  await p
    .getByRole("button", { name: "Competitive Exams", exact: true })
    .click();
  await p.getByRole("searchbox").fill("");
  await p.getByLabel("Exam journey").selectOption("gre-quant");
  await p.screenshot({
    path: "../docs/mathematics/screens/competitive-journey.png",
    fullPage: true,
  });
  await p.context().close();
});

test("invalid saved snapshot fails safely without fabricating progress", async () => {
  const p = await page();
  await p.evaluate(() =>
    localStorage.setItem(
      "openpath-math-program-preview@1",
      JSON.stringify({
        version: 1,
        records: { bad: { schemaVersion: 1 } },
        drafts: {},
        seeds: {},
      }),
    ),
  );
  await p.reload();
  await open(p);
  assert.equal(
    await p.getByRole("progressbar").getAttribute("aria-valuenow"),
    "0",
  );
  await p
    .getByRole("heading", { name: "Concept introduction", exact: true })
    .waitFor();
  await p.context().close();
});
