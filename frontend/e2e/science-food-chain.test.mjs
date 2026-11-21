import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { serveScience } from './science-static.mjs';

for (const width of [320, 390]) test(`Food Chain Garden ${width}px: remove, observe lag, restore and reset`, async () => {
  const server = await serveScience();
  let browser;
  try {
    browser = await chromium.launch({ timeout: 10000, executablePath: process.env.CHROMIUM_PATH || undefined });
    const page = await browser.newPage({ viewport: { width, height: 790 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    page.setDefaultTimeout(6500);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (new URL(r.url()).origin !== server.origin) errors.push(r.url()); });
    await page.goto(server.origin);
    await page.getByRole('link', { name: /Food Chain Garden/ }).tap();
    await page.waitForURL(server.origin + '/food-chain-garden/');
    await page.locator('#scene[data-ready="true"]').waitFor();
    const counts = () => page.locator('.counts b').allTextContents();
    const visible = () => page.locator('#caterpillars use:not(.away), #birds use:not(.away)').count();
    const next = page.getByRole('button', { name: /Next week/ });
    const remove = page.getByRole('button', { name: 'Remove plants' });
    const restore = page.getByRole('button', { name: 'Restore plants' });
    assert.deepEqual(await counts(), ['6', '6', '3']);
    assert.ok(await remove.evaluate(button => {
      const { top, bottom } = button.getBoundingClientRect();
      return top >= 0 && bottom < innerHeight;
    }));
    await remove.tap();
    assert.deepEqual(await counts(), ['0', '6', '3']);
    await next.tap();
    assert.deepEqual(await counts(), ['0', '4', '3']);
    assert.equal(await visible(), 7);
    assert.match(await page.getByRole('status').textContent(), /Less food for caterpillars/);
    for (let i = 0; i < 3; i++) await next.tap();
    assert.deepEqual(await counts(), ['0', '0', '0']);
    assert.equal(await visible(), 0);
    await restore.tap();
    assert.deepEqual(await counts(), ['6', '0', '0']);
    await next.press('Enter');
    assert.deepEqual(await counts(), ['6', '2', '0']);
    await next.tap();
    assert.deepEqual(await counts(), ['6', '4', '1']);
    await page.getByRole('button', { name: 'Start over' }).tap();
    assert.deepEqual(await counts(), ['6', '6', '3']);
    assert.equal(await page.locator('#week').textContent(), 'Week 0');
    await page.getByText('Follow the food', { exact: true }).tap();
    assert.ok(await page.getByText(/not a forecast/).isVisible());
    assert.ok(await page.evaluate(() => innerWidth === document.documentElement.scrollWidth));
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
