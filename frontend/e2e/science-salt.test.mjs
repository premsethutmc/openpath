import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { serveScience } from './science-static.mjs';

let browser;
let server;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  server = await serveScience();
});
after(async () => { await browser?.close(); await server?.close(); });

test('390px salt lab: explore wrong routes, model particles, recover both solids and transfer', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile:true, hasTouch:true, reducedMotion:'reduce' });
  const page = await context.newPage();
  const button = (name) => page.getByRole('button', { name, exact:true });
  const scene = page.getByRole('img');
  const state = () => scene.getAttribute('data-phase');
  const fits = () => page.evaluate(() => innerWidth === 390 && document.documentElement.scrollWidth <= 390);
  const errors = [];
  const external = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('request', (req) => { if (!req.url().startsWith(server.origin + '/')) external.push(req.url()); });
  try {
    await page.goto(server.origin);
    await page.getByRole('link', { name: /Where did the salt go/ }).tap();
    await page.waitForURL(server.origin + '/salt-from-sand/');
    assert.ok(await fits());
    assert.equal(await state(), 'dry');
    await button('Filter').tap();
    assert.equal(await state(), 'dry');
    assert.match(await page.locator('#status').innerText(), /Dry grains would stay together/);
    await button('Add water').tap();
    assert.equal(await state(), 'wet');
    await button('Stir').tap();
    assert.equal(await state(), 'solution');
    await button('Evaporate').tap();
    assert.equal(await state(), 'solution');
    assert.match(await page.locator('#status').innerText(), /Filter first/);
    await button('Particle view').tap();
    assert.match(await scene.locator('title').textContent(), /sodium and chloride ions/);
    assert.ok(await page.locator('#ion-key').isVisible());
    await button('Filter').tap();
    assert.equal(await state(), 'filtered');
    assert.match(await scene.locator('title').textContent(), /holds the sand grains/);
    if (process.env.E2E_SHOTS) {
      await mkdir(process.env.E2E_SHOTS,{recursive:true});
      await page.screenshot({path:process.env.E2E_SHOTS + '/science-salt-particles.png',fullPage:true});
    }
    await button('Evaporate').tap();
    assert.equal(await state(), 'recovered');
    assert.match(await scene.locator('title').textContent(), /Water molecules leave as vapour/);
    await button('Particle view').tap();
    assert.match(await scene.locator('title').textContent(), /sand is still separate/);
    await button('Try a new situation →').tap();
    assert.ok(await fits());
    assert.equal(await page.locator('#feedback').isVisible(), false);
    await page.getByRole('radio', { name: 'Let the water evaporate' }).check();
    await button('Check my idea').tap();
    assert.equal(await page.locator('#feedback').isVisible(), false);
    await page.getByRole('radio', { name: 'Water goes into the air, leaving the sugar behind.' }).check();
    await button('Check my idea').tap();
    assert.match(await page.locator('#result').innerText(), /got the sugar back/);
    await button('Replay the lab').tap();
    assert.equal(await state(), 'dry');
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    assert.equal(await page.evaluate(() => localStorage.length), 0);
  } finally { await context.close(); }
});

test('320px keyboard: tools remain operable with no dragging', async () => {
  const page = await browser.newPage({ viewport: { width:320, height:740 } });
  try {
    await page.goto(server.origin + '/salt-from-sand/');
    await page.keyboard.press('Tab'); // lab hub link
    await page.keyboard.press('Tab'); // particle view
    await page.keyboard.press('Tab'); // first lab tool
    assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'water');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#scene').getAttribute('data-phase'), 'wet');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#scene').getAttribute('data-phase'), 'solution');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 320));
  } finally { await page.close(); }
});
