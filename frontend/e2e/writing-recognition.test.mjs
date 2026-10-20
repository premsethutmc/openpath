import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
test("real pretrained local model reads hand-drawn 1, 2, 7; IDs do not determine predictions; unsupported expressions remain uncertain", async () => {
  const bundle = await build({
    stdin: {
      resolveDir: process.cwd(),
      loader: "ts",
      contents: `import {LocalDigitRecognizer} from './src/writing/digit-recognizer';window.localDigitRecognizer=new LocalDigitRecognizer();`,
    },
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
  });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  try {
    const page = await browser.newPage();
    await page.route("**/local-test.js", (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: bundle.outputFiles[0].text,
      }),
    );
    await page.goto(
      (process.env.E2E_URL ?? "http://127.0.0.1:4674") + "/writing.html",
    );
    await page.addScriptTag({ type: "module", url: "/local-test.js" });
    await page.waitForFunction(() => window.localDigitRecognizer);
    const r = await page.evaluate(async () => {
      const coords = {
          1: [
            [12, 3],
            [12, 45],
          ],
          2: [
            [2, 8],
            [8, 2],
            [20, 3],
            [25, 10],
            [22, 18],
            [2, 43],
            [27, 43],
          ],
          7: [
            [1, 2],
            [26, 2],
            [8, 43],
          ],
        },
        out = [];
      for (const [digit, ps] of Object.entries(coords)) {
        const stroke = {
          id: crypto.randomUUID(),
          points: ps.map(([x, y], i) => ({
            x: 325 + x,
            y: 40 + y,
            t: i,
            pressure: 0.5,
            tiltX: 0,
            tiltY: 0,
            twist: 0,
          })),
          regionId: "q",
          pointerType: "pen",
          width: 3,
          tool: "ink",
          startedAt: new Date().toISOString(),
        };
        const first = await window.localDigitRecognizer.classify(
          [stroke],
          new AbortController().signal,
        );
        const second = await window.localDigitRecognizer.classify(
          [{ ...stroke, id: "changed-id" }],
          new AbortController().signal,
        );
        out.push({ digit, first, second });
      }
      const expression = await window.localDigitRecognizer.recognize(
        {
          contract: "openpath-math-input@1",
          workId: "test",
          revision: 2,
          regions: [
            {
              id: "q",
              role: "expression",
              label: "Expression",
              order: 0,
              x: 300,
              y: 30,
              width: 390,
              height: 80,
            },
          ],
          strokes: [
            {
              id: "unknown",
              points: [
                {
                  x: 330,
                  y: 50,
                  t: 0,
                  pressure: 0.5,
                  tiltX: 0,
                  tiltY: 0,
                  twist: 0,
                },
              ],
              regionId: "q",
              pointerType: "pen",
              width: 3,
              tool: "ink",
              startedAt: new Date().toISOString(),
            },
          ],
        },
        new AbortController().signal,
      );
      return { out, expression };
    });
    for (const x of r.out) {
      assert.equal(x.first.text, x.digit);
      assert.equal(x.second.text, x.digit);
      assert.ok(x.first.confidence > 0.9);
    }
    assert.equal(r.expression.candidates[0].confidence, null);
    assert.equal(r.expression.candidates[0].text, "?");
  } finally {
    await browser.close();
  }
});
