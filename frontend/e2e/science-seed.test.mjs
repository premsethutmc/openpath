import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { serveScience } from './science-static.mjs';
import { storageKey } from '../science/plant-a-seed/model.mjs';

let browser;
let server;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  server = await serveScience();
});
after(async () => {
  await browser?.close();
  await server?.close();
});

async function fits(page, width) {
  assert.equal(await page.evaluate(() => innerWidth), width);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}
async function shot(page, name) {
  if (!process.env.E2E_SHOTS) return;
  await mkdir(process.env.E2E_SHOTS, { recursive: true });
  await page.screenshot({ path: process.env.E2E_SHOTS + '/' + name + '.png', fullPage: true });
}

test('390px learner: link from the lab hub, observe growth and recover, then transfer and reload', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  const button = (name) => page.getByRole('button', { name });
  const stage = () => page.locator('#pot').getAttribute('data-stage');
  const day = () => page.locator('#day').innerText();
  const action = (name) => button(/Water, then|Wait until/).filter({ hasText: name }).tap();
  const inspect = () => button('Check the soil').tap();
  const choose = (pot, option) => page.getByRole('group', { name: pot }).getByRole('radio', { name: option, exact: true }).check();
  try {
    await page.goto(server.origin);
    await fits(page, 390);
    await page.getByRole('link', { name: /Pressure in the Sand/ }).tap();
    await page.getByRole('heading', { name: 'Pressure in the Sand' }).waitFor();
    await page.getByRole('link', { name: /All science labs/ }).tap();
    await shot(page, 'science-hub');
    await page.getByRole('link', { name: /Plant a Seed/ }).tap();
    await fits(page, 390);
    assert.equal(await stage(), 'empty');
    await button('Plant the bean').tap();
    assert.equal(await day(), 'Simulated day 1');
    assert.equal(await button(/Wait until/).isVisible(), false, 'care requires checking soil');
    await inspect();
    assert.match(await page.locator('#moisture').innerText(), /^Moist/);
    await action('Water');
    assert.equal(await stage(), 'seed');
    assert.match(await page.locator('#seed-story').innerText(), /did not grow/);
    await inspect();
    assert.match(await page.locator('#moisture').innerText(), /^Waterlogged/);
    assert.equal(await page.locator('.puddle').evaluate((node) => getComputedStyle(node).opacity), '1');
    await action('Wait');
    await inspect();
    assert.match(await page.locator('#moisture').innerText(), /^Moist/);
    await action('Wait');
    assert.equal(await stage(), 'root');
    assert.match(await page.locator('#seed-story').innerText(), /germination/);
    assert.equal(await page.locator('.root').evaluate((node) => getComputedStyle(node).opacity), '1');
    assert.equal(await page.locator('.shoot').evaluate((node) => getComputedStyle(node).opacity), '0');
    assert.equal(await page.locator('.root').evaluate((node) => getComputedStyle(node).transitionDuration), '0s');
    await inspect();
    assert.match(await page.locator('#moisture').innerText(), /^Dry/);
    await shot(page, 'science-seed-root');
    await action('Water');
    await inspect();
    await action('Wait');
    assert.equal(await stage(), 'sprout');
    assert.equal(await day(), 'Simulated day 6');
    assert.equal(await page.locator('.shoot').evaluate((node) => getComputedStyle(node).opacity), '1');
    await shot(page, 'science-seed-sprout');
    await page.reload();
    assert.equal(await day(), 'Simulated day 6', 'reload does not advance time');
    assert.equal(await stage(), 'sprout');
    assert.equal(await button(/Wait until/).isVisible(), false);
    assert.match(await page.locator('#save-status').innerText(), /this browser/);
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), [storageKey]);

    await button('Try two new pots').tap();
    await fits(page, 390);
    assert.equal(await page.locator('#feedback').isVisible(), false);
    assert.equal(await page.locator('input:checked').count(), 0);
    await choose('Pot A', 'Water');
    await button('Check both choices').tap();
    assert.equal(await page.locator('#feedback').isVisible(), false);
    await choose('Pot B', 'Water');
    await button('Check both choices').tap();
    assert.match(await page.locator('#feedback-title').innerText(), /Look at the soil/);
    await button('Try those pots again').tap();
    assert.equal(await page.locator('input:checked').count(), 0);
    await choose('Pot A', 'Water');
    await choose('Pot B', 'Wait');
    await button('Check both choices').tap();
    assert.equal(await page.locator('#feedback-title').innerText(), 'You read both pots.');
    await button('Back to my bean').tap();
    assert.equal(await stage(), 'sprout');

    assert.deepEqual(errors, []);
    assert.deepEqual(requests.filter((url) => new URL(url).origin !== server.origin), []);
  } finally { await context.close(); }
});

test('320px keyboard with blocked storage: plant, inspect and wait; progress remains playable', async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 740 } });
  try {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    });
    await page.goto(server.origin + '/plant-a-seed/');
    await fits(page, 320);
    assert.match(await page.locator('#save-status').innerText(), /couldn’t restore or save/);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'plant');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'inspect');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'moisture');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'wait');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#pot').getAttribute('data-stage'), 'root');
    assert.match(await page.locator('#save-status').innerText(), /couldn’t restore or save/);
    await page.reload();
    assert.equal(await page.locator('#pot').getAttribute('data-stage'), 'empty');
  } finally { await page.close(); }
});
