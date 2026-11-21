import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { serveScience } from './science-static.mjs';

for (const width of [320, 390, 768]) test(`Food Chain Garden ${width}px: change any species, guess, watch the weeks, reset`, async () => {
  const server = await serveScience();
  let browser;
  try {
    browser = await chromium.launch({ timeout: 10000, executablePath: process.env.CHROMIUM_PATH || undefined });
    const page = await browser.newPage({ viewport: { width, height: 790 }, hasTouch: true, isMobile: width < 700, reducedMotion: 'reduce' });
    page.setDefaultTimeout(6500);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (new URL(r.url()).origin !== server.origin) errors.push(r.url()); });
    await page.goto(server.origin);
    await page.getByRole('link', { name: /Food Chain Garden/ }).tap();
    await page.waitForURL(server.origin + '/food-chain-garden/');
    await page.locator('#scene[data-ready="true"]').waitFor();
    const counts = () => page.locator('.counts b').allTextContents();
    const visible = key => page.locator(`#${key} use:not(.away)`).count();
    const next = page.getByRole('button', { name: /Next week/ });
    const status = () => page.getByRole('status').textContent();
    assert.deepEqual(await counts(), ['6', '6', '1', '2']);
    assert.equal(await visible('plants'), 6);

    // Take away both birds, guess the caterpillars will increase.
    const lessBird = page.getByRole('button', { name: 'Take away a bird' });
    await lessBird.tap();
    await lessBird.tap();
    assert.ok(await lessBird.isDisabled());
    assert.deepEqual(await counts(), ['6', '6', '1', '0']);
    assert.equal(await visible('birds'), 0);
    await page.getByRole('button', { name: 'more', exact: true }).tap();
    assert.equal(await page.getByRole('button', { name: 'more', exact: true }).getAttribute('aria-pressed'), 'true');
    await next.tap();
    assert.deepEqual(await counts(), ['6', '8', '2', '1']);
    assert.match(await status(), /^Your guess was right: more caterpillars\. With few hunters about, caterpillars multiplied\./);
    assert.equal(await page.getByRole('button', { name: 'more', exact: true }).getAttribute('aria-pressed'), 'false');

    // A wrong guess about the plants.
    await page.getByLabel('Your guess: next week the').selectOption('plants');
    await page.getByRole('button', { name: 'more', exact: true }).tap();
    await next.press('Enter');
    assert.deepEqual(await counts(), ['5', '6', '3', '2']);
    assert.match(await status(), /^Not this time: there were fewer plants\. Too many caterpillars chewed the plants\./);
    assert.equal(await page.locator('#chart polyline').count(), 4);
    assert.match(await page.locator('#chart-title').textContent(), /last 3 weeks/);

    // Adding is capped at the drawn garden.
    const addFrog = page.getByRole('button', { name: 'Add a frog' });
    await addFrog.tap();
    assert.ok(await addFrog.isDisabled());
    assert.equal(await visible('frogs'), 4);

    // Remove all plants: food chain empties out in order.
    const lessPlant = page.getByRole('button', { name: 'Take away a plant' });
    for (let i = 0; i < 5; i++) await lessPlant.tap();
    for (let i = 0; i < 6; i++) await next.tap();
    assert.deepEqual(await counts(), ['0', '0', '0', '0']);
    assert.match(await status(), /garden is empty/);

    await page.getByRole('button', { name: 'Start over' }).tap();
    assert.deepEqual(await counts(), ['6', '6', '1', '2']);
    assert.equal(await page.locator('#week').textContent(), 'Week 0');
    await page.getByText('Follow the food', { exact: true }).tap();
    assert.ok(await page.getByText(/not a forecast/).isVisible());
    assert.ok(await page.evaluate(() => innerWidth === document.documentElement.scrollWidth));
    for (const b of await page.locator('.step button, .choices button, #next').all()) {
      const box = await b.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, 'touch targets at least 44px');
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
