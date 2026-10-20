import { notebookOption } from "./notebook-helpers.mjs";
/** Real student route, native input events, Django validation and saved canonical evidence. */
import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { mkdirSync, copyFileSync } from "node:fs";
import { chromium } from "playwright";
import { build } from "esbuild";
const BASE = process.env.E2E_URL ?? "http://127.0.0.1:4710";
const DIR = "../docs/product/mathematical-writing/progressive-division";
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  mkdirSync(DIR, { recursive: true });
});
after(() => browser?.close());
async function start(record = false) {
  const c = await browser.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: "block",
    ...(record
      ? {
          recordVideo: {
            dir: "/tmp/openpath-progressive-video",
            size: { width: 360, height: 800 },
          },
        }
      : {}),
  });
  const p = await c.newPage();
  p.setDefaultTimeout(20000);
  await p.goto(BASE);
  await p
    .getByRole("button", {
      name: "Try OpenPath as a Demo Student",
      exact: true,
    })
    .click();
  await p.getByLabel("Progressive long division", { exact: true }).waitFor();
  await p.getByLabel("Quotient place 1", { exact: true }).waitFor();
  return { c, p };
}
async function shot(p, name) {
  await p.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
}
async function complete(p) {
  await p
    .getByText("379 ÷ 3 = 126 remainder 1.", { exact: true })
    .waitFor();
  await p.locator(".notebook-save").filter({hasText:/^Saved$/}).waitFor({state:"attached"});
}
test("Android: 379 ÷ 3 entered continuously with automatic cursor/row expansion; recorded video", async () => {
  const { c, p } = await start(true);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  assert.equal(
    await p.getByLabel("Mathematical region", { exact: true }).count(),
    0,
  );
  assert.equal(await p.getByRole("button", { name: /^Next/ }).count(), 0);
  assert.equal(await p.locator("[data-entry]").count(), 1);
  await shot(p, "initial-android");
  await p.route("**/api/pupils/**/writing/**/action/", async (route) => {
    await new Promise((r) => setTimeout(r, 100));
    await route.continue();
  });
  await p.keyboard.type("1302616181", { delay: 300 });
  await complete(p);
  await shot(p, "complete-android");
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  const identity = await (
    await c.request.get(BASE + "/api/preview-demo/status/")
  ).json();
  const stream = await (
    await c.request.get(
      BASE + `/api/pupils/${identity.learner}/events/?subject=mathematics`,
    )
  ).json();
  const events = stream.events.filter(
    (e) => e.action === "progressive-validation",
  );
  assert.ok(events.length >= 9);
  assert.ok(events.every((e) => e.admissible === false));
  assert.deepEqual(errors, []);
  const video = p.video();
  await c.close();
  copyFileSync(await video.path(), `${DIR}/continuous-android.webm`);
});
test("zero is entered before automatic bring-down, then unfinished paper survives a closed browser context", async () => {
  const { c, p } = await start();
  await p.keyboard.type("13", { delay: 50 });
  await p.getByLabel("Subtract row 1", { exact: true }).waitFor();
  assert.equal(
    await p.getByLabel("Brought down 7", { exact: true }).count(),
    0,
  );
  await p.keyboard.type("0");
  await p.getByLabel("Quotient place 2", { exact: true }).waitFor();
  await p.locator(".notebook-save").filter({hasText:/^Saved$/}).waitFor({state:"attached"});
  await p.getByLabel("Brought down 7", { exact: true }).waitFor();
  assert.equal(
    await p
      .getByRole("button", { name: "Subtract row 1: 0", exact: true })
      .count(),
    1,
  );
  await shot(p, "zero-and-bring-down-android");
  const state = await c.storageState(),
    url = p.url();
  await c.close();
  const resumed = await browser.newContext({
    storageState: state,
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await resumed.newPage();
  await page.goto(url);
  await page.getByLabel("Quotient place 2", { exact: true }).waitFor();
  await page.keyboard.type("2616181");
  await complete(page);
  await resumed.close();
});
test("tap and Backspace correct an earlier quotient without erasing later working or revealing a solution", async () => {
  const { c, p } = await start();
  await p.keyboard.type("1302616181");
  await complete(p);
  await p
    .getByRole("button", { name: "Quotient place 2: 2", exact: true })
    .click();
  await p.keyboard.press("Backspace");
  await p.getByLabel("Quotient place 2", { exact: true }).waitFor();
  await p.locator(".notebook-save").filter({hasText:/^Saved$/}).waitFor({state:"attached"});
  assert.equal(
    await p
      .getByText("379 ÷ 3 = 126 remainder 1.", { exact: true })
      .count(),
    0,
  );
  await p.keyboard.type("3");
  await p
    .getByText("Not quite right.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await p
      .getByRole("button", { name: "Multiply row 3: 18", exact: true })
      .count(),
    1,
  );
  await shot(p, "correcting-android");
  await p.keyboard.press("Backspace");
  await p.locator(".notebook-save").filter({hasText:/^Saved$/}).waitFor({state:"attached"});
  await p.keyboard.type("2");
  await complete(p);
  await c.close();
});
test("keyboard-only paper preserves guided worksheet and corrections without a scribbler", async () => {
  const { c, p } = await start();
  await p.keyboard.type("13");
  await p.getByLabel("Subtract row 1", { exact: true }).waitFor();
  await p.locator(".notebook-save").filter({hasText:/^Saved$/}).waitFor({state:"attached"});
  assert.equal(await p.getByRole("button",{name:"Write instead",exact:true}).count(),0);
  assert.equal(await p.locator("svg.writing-paper").count(),0);
  await notebookOption(p, "Help me step by step");
  await p.getByLabel("Mathematical region", { exact: true }).waitFor();
  await p
    .getByRole("button", { name: "Back to division paper", exact: true })
    .click();
  await p.getByLabel("Subtract row 1", { exact: true }).waitFor();
  await p.keyboard.type("02616181");
  await complete(p);
  await c.close();
});

test("configured division component: all six required problems with actual Django arithmetic and column alignment", async () => {
  const { c, p } = await start();
  const identity = await (
    await c.request.get(BASE + "/api/preview-demo/status/")
  ).json();
  const built = await build({
    stdin: {
      loader: "tsx",
      resolveDir: process.cwd(),
      contents: `
 import {createRoot} from 'react-dom/client';import {ProgressiveDivision} from './src/writing/ProgressiveDivision';import {Api} from './src/english/logic/account';import './src/writing/style.css';
 const q=new URLSearchParams(location.search);createRoot(document.getElementById('root')).render(<ProgressiveDivision api={new Api()} pupil={q.get('learner')} parameters={{dividend:Number(q.get('a')),divisor:Number(q.get('b'))}} onExit={()=>{}} alternative={()=>null}/>);
 `,
    },
    bundle: true,
    write: false,
    jsx: "automatic",
    format: "esm",
    outdir: "/tmp/progressive-component-assets",
    loader: { ".wasm": "file", ".woff2": "dataurl" },
    target: "es2022",
  });
  const js = built.outputFiles.find((x) => x.path.endsWith(".js")).text,
    css = built.outputFiles.find((x) => x.path.endsWith(".css"))?.text ?? "";
  await p.route("**/paper-component.html*", (r) =>
    r.fulfill({
      contentType: "text/html",
      body:
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
        css +
        '</style><div id="root"></div><script type="module" src="/paper-component.js"></script>',
    }),
  );
  await p.route("**/paper-component.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: js }),
  );
  for (const [a, b, parts, q, r] of [
    [84, 4, ["2", "8", "0", "1", "4", "0"], 21, 0],
    [379, 3, ["1", "3", "0", "2", "6", "1", "6", "18", "1"], 126, 1],
    [125, 5, ["2", "10", "2", "5", "25", "0"], 25, 0],
    [1005, 5, ["2", "10", "0", "0", "0", "0", "1", "5", "0"], 201, 0],
    [432, 12, ["3", "36", "7", "6", "72", "0"], 36, 0],
    [7, 3, ["2", "6", "1"], 2, 1],
  ]) {
    await p.goto(
      BASE + `/paper-component.html?learner=${identity.learner}&a=${a}&b=${b}`,
    );
    await p.getByLabel("Quotient place 1", { exact: true }).waitFor();
    if (a === 432) {
      await p.keyboard.type("33");
      await p.locator(".notebook-save").filter({hasText:/^Saved$/}).waitFor({state:"attached"});
      assert.equal(
        await p.getByLabel("Multiply row 1", { exact: true }).inputValue(),
        "3",
      );
      await p.keyboard.type("676720");
    } else await p.keyboard.type(parts.join(""));
    await p
      .getByText(`${a} ÷ ${b} = ${q} remainder ${r}.`, {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `${a}/${b} fits phone width`,
    );
    const qb = await p
        .getByRole("button", { name: new RegExp("^Quotient place 1:") })
        .boundingBox(),
      pb = await p
        .getByRole("button", { name: new RegExp("^Multiply row 1:") })
        .boundingBox();
    assert.ok(
      Math.abs(qb.x + qb.width - pb.x - pb.width) < 1,
      "product and quotient end at the same dividend column",
    );
    const productDigits = p.locator(
      '[data-entry="product:0"] [data-paper-digit]',
    );
    const digitCount = await productDigits.count();
    const firstColumn = String(a).length - String(q).length;
    for (let i = 0; i < digitCount; i++) {
      const digit = await productDigits.nth(i).boundingBox();
      const printed = await p
        .locator(`[data-print-column="${firstColumn - digitCount + 1 + i}"]`)
        .boundingBox();
      assert.ok(
        Math.abs(digit.x + digit.width / 2 - printed.x - printed.width / 2) < 1,
        "each product digit aligns with a dividend column",
      );
    }
    if (a === 1005 || a === 432) await shot(p, `division-${a}-${b}-android`);
  }
  await c.close();
});
test("Android-style input events without hardware keydown and Backspace keep the same native input", async () => {
  const { c, p } = await start();
  async function native(digit) {
    await p.locator("input.paper-cursor").evaluate((el, digit) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set.call(el, el.value + digit);
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: digit,
        }),
      );
    }, digit);
  }
  await native("1");
  await p.getByLabel("Multiply row 1", { exact: true }).waitFor();
  await native("3");
  await p.getByLabel("Subtract row 1", { exact: true }).waitFor();
  await native("0");
  await p.getByLabel("Quotient place 2", { exact: true }).waitFor();
  await p.locator("input.paper-cursor").evaluate((el) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(el, "");
    el.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "deleteContentBackward",
        data: null,
      }),
    );
  });
  await p.getByLabel("Subtract row 1", { exact: true }).waitFor();
  assert.equal(
    await p.getByLabel("Subtract row 1", { exact: true }).inputValue(),
    "",
  );
  await p.locator("input.paper-cursor").evaluate((el) =>
    el.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertLineBreak",
        data: null,
      }),
    ),
  );
  await p.getByText("Enter this number.", { exact: true }).waitFor();
  await native("0");
  await p.getByLabel("Quotient place 2", { exact: true }).waitFor();

  await c.close();
});
