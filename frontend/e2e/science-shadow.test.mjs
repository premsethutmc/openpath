import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { serveScience } from './science-static.mjs';

for (const width of [320, 390]) test(`Shadow Lab at ${width}px: move the torch, swap cutouts and switch off`, async () => {
  const server = await serveScience();
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
    const page = await browser.newPage({ viewport: { width, height: 790 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
    page.on('request', request => { if (new URL(request.url()).origin !== server.origin) errors.push(request.url()); });
    const trace = [];
    if (width === 390) {
      page.on('console', message => {
        if (message.text().startsWith('shadow-input:')) trace.push(message.text().slice(13));
      });
      await page.addInitScript(() => {
        if (location.pathname !== '/shadow-lab/') return;
        for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture', 'click']) {
          document.addEventListener(type, event => {
            const { target, pointerId, pointerType, clientX, clientY } = event;
            const label = target.closest('[data-material]')?.dataset.material ?? target.id ?? target.nodeName;
            console.debug('shadow-input:' + JSON.stringify({ type, label, pointerId, pointerType, clientX, clientY }));
          }, true);
        }
      });
    }
    await page.goto(server.origin);
    await page.getByRole('link', { name: /Shadow Lab/ }).tap();
    const silhouette = page.locator('#silhouette');
    await silhouette.locator('[opacity]').waitFor({ state: 'attached' });
    const scale = async () => Number((await silhouette.getAttribute('transform')).match(/scale\(([\d.]+)/)[1]);
    const range = page.getByRole('slider');
    await range.press('Home');
    const initial = await scale();
    if (width === 390) {
      const track = await page.locator('#track').boundingBox();
      const cdp = await page.context().newCDPSession(page);
      const point = x => ({ x: track.x + track.width * x / 480, y: track.y + track.width * 56 / 480 });
      await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[point(61)]});
      await cdp.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[point(223)]});
      await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    } else {
      await range.press('End');
    }
    assert.ok(await scale() > initial * 2);
    const large = await scale();
    const ink = page.locator('#projected');
    const opacity = async () => Number(await ink.getAttribute('opacity'));
    const dark = await opacity();
    // Verify the very first tap after release. Do not retry the input or resize
    // the mobile viewport for a screenshot between these two gestures.
    const tracing = page.getByRole('button', { name: 'Tracing paper' });
    await tracing.tap();
    try {
      await page.locator('[data-material=tracing][aria-pressed=true]').waitFor({ timeout: 2500 });
    } catch (error) {
      throw new Error('First Tracing paper tap did not select it. Input events: ' + trace.join('; '), { cause: error });
    }
    assert.equal(await page.locator('#kind').textContent(), 'Translucent');
    assert.ok(await opacity() < dark / 2);
    assert.ok(Number(await page.locator('#softness').getAttribute('stdDeviation')) > 3);
    await page.getByRole('button', { name: 'Clear plastic' }).tap();
    assert.equal(await page.locator('#kind').textContent(), 'Transparent');
    assert.ok(await opacity() < .06);
    assert.equal(await scale(), large);
    await page.getByRole('button', { name: 'Torch on' }).tap();
    assert.equal(await opacity(), 0);
    assert.equal(await page.locator('#light').getAttribute('visibility'), 'hidden');
    await page.getByRole('button', { name: 'Torch off' }).tap();
    await page.getByRole('button', { name: 'Cardboard' }).tap();
    assert.equal(await opacity(), dark);
    await page.getByText('Why does it grow?').tap();
    assert.ok(await page.getByText(/blocks a wider part/).isVisible());
    assert.ok(await page.evaluate(() => innerWidth === document.documentElement.scrollWidth));
    assert.deepEqual(errors, []);
    if (width === 390 && process.env.E2E_SHOTS) {
      await mkdir(process.env.E2E_SHOTS, { recursive: true });
      await page.screenshot({ path: process.env.E2E_SHOTS + '/science-shadow.png', fullPage: true });
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});
