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

test('390px: lock a prediction, reveal the below-soil root on purpose, recover, then apply', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const stage = () => page.locator('#pot').getAttribute('data-stage');
  const day = () => page.locator('#day').innerText();
  const action = async (name) => {
    const before = await day();
    await button(name).tap();
    assert.equal(await day(), before, 'selecting an action is not advancing time');
    await button('Next day').tap();
  };
  const inspect = () => button('Check the soil').tap();
  const choose = (pot, option) => page.getByRole('group', { name: pot, exact: true }).getByRole('radio', { name: option, exact: true }).check();
  const colorOpacity = (selector) => page.locator(selector).evaluate((node) => getComputedStyle(node).opacity);
  const noRootClue = async () => {
    assert.equal(await colorOpacity('.root-short'), '0');
    assert.equal(await colorOpacity('.shoot'), '0');
    for (const id of ['#stage', '#pot-title', '#seed-story']) assert.doesNotMatch(await page.locator(id).textContent(), /root|germinat/i);
    assert.equal(await page.getByRole('img', { name: /root/i }).count(), 0);
  };
  try {
    await page.goto(server.origin);
    await fits(page, 390);
    await page.getByRole('link', { name: /Pressure in the Sand/ }).tap();
    await page.getByRole('heading', { name: 'Pressure in the Sand' }).waitFor();
    await page.getByRole('link', { name: /All science labs/ }).tap();
    await page.waitForURL(server.origin + '/');
    await shot(page, 'science-hub');
    await page.getByRole('link', { name: /Plant a Seed/ }).tap();
    await page.waitForURL(server.origin + '/plant-a-seed/');
    await page.getByRole('heading', { name: 'Plant a Seed', exact: true }).waitFor();
    await fits(page, 390);
    assert.equal(await stage(), 'empty');
    await button('Place the bean').tap();
    assert.equal(await stage(), 'uncovered');
    assert.equal(await button('Lock my prediction').isVisible(), false);
    await button('Cover it with soil').tap();
    assert.equal(await day(), 'Simulated day 1');
    await noRootClue();
    assert.equal(await button('Check the soil').isVisible(), false);
    assert.equal(await button('Open the soil window').isVisible(), false);
    await button('Lock my prediction').tap();
    assert.equal(await button('Check the soil').isVisible(), false, 'blank prediction does not unlock care');
    await page.getByRole('radio', { name: 'A shoot', exact: true }).check();
    await button('Lock my prediction').tap();
    assert.equal(await button('Lock my prediction').isVisible(), false);
    assert.equal(await button('Next day').isVisible(), false, 'care requires checking soil');
    await inspect();
    assert.equal(await button('Next day').isEnabled(), false);
    assert.match(await page.locator('#moisture').innerText(), /^Moist/);

    await action('Water');
    assert.match(await page.locator('#seed-story').innerText(), /did not grow/);
    await inspect();
    assert.match(await page.locator('#moisture').innerText(), /^Waterlogged/);
    assert.equal(await colorOpacity('.puddle'), '1');
    await action('Wait');
    await inspect();
    assert.match(await page.locator('#moisture').innerText(), /^Moist/);
    await action('Wait');
    assert.equal(await day(), 'Simulated day 4');
    assert.equal(await stage(), 'seed');
    await noRootClue();
    assert.equal(await button('Check the soil').isVisible(), false, 'observe before caring again');
    await button('Open the soil window').tap();
    assert.equal(await stage(), 'root');
    assert.equal(await colorOpacity('.root-short'), '1');
    assert.equal(await colorOpacity('.shoot'), '0');
    assert.match(await page.getByRole('img').getAttribute('aria-labelledby'), /pot-title/);
    assert.match(await page.locator('#pot-title').textContent(), /tiny root.*surface is still bare/);
    assert.match(await page.locator('#seed-story').innerText(), /germination/);
    assert.equal(await page.locator('.root-short').evaluate((node) => getComputedStyle(node).transitionDuration), '0s');
    await shot(page, 'science-seed-root-window');

    await inspect();
    assert.match(await page.locator('#moisture').innerText(), /^Dry/);
    await action('Water');
    await inspect();
    await action('Wait');
    assert.equal(await stage(), 'sprout');
    assert.equal(await day(), 'Simulated day 6');
    assert.equal(await colorOpacity('.shoot'), '1');
    await page.reload();
    assert.equal(await day(), 'Simulated day 6', 'reload does not advance time');
    assert.equal(await stage(), 'sprout');
    assert.equal(await colorOpacity('.root-long'), '0', 'resumed cutaway is closed until re-opened');
    assert.equal(await button('Lock my prediction').isVisible(), false, 'locked observation persisted with the pot');
    assert.match(await page.locator('#save-status').innerText(), /this browser/);
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), [storageKey]);

    await page.getByRole('button', { name: /^Try two new problems/ }).tap();
    await fits(page, 390);
    assert.equal(await page.locator('#feedback').isVisible(), false);
    assert.equal(await page.locator('input:checked').count(), 0);
    await shot(page, 'science-seed-challenge');
    await choose('Pot A', 'Water');
    await button('Check my answers').tap();
    assert.equal(await page.locator('#feedback').isVisible(), false);
    const reasons = (name) => choose('Why did you choose those actions?', name);
    const observe = (name) => choose('How would you check whether growth has begun?', name);
    const whyObserve = (name) => choose('Why would that check help?', name);
    await choose('Pot B', 'Water');
    await reasons('Plants of the same age need the same care.');
    await observe('Look through the pot’s soil window.');
    await whyObserve('Some growth can happen out of sight.');
    await button('Check my answers').tap();
    assert.match(await page.locator('#feedback-care').innerText(), /^Try this/);
    assert.match(await page.locator('#feedback-evidence').innerText(), /^Yes:/);
    await button('Try those pots again').tap();
    assert.equal(await page.locator('input:checked').count(), 0);
    await choose('Pot A', 'Water');
    await choose('Pot B', 'Wait');
    await reasons('The two pots hold different amounts of water.');
    await observe('Look through the pot’s soil window.');
    await whyObserve('Some growth can happen out of sight.');
    await button('Check my answers').tap();
    assert.equal(await page.locator('#feedback-title').innerText(), 'You found two useful clues.');
    await button('Back to my bean').tap();
    assert.equal(await stage(), 'sprout');

    assert.deepEqual(errors, []);
    assert.deepEqual(requests.filter((url) => new URL(url).origin !== server.origin), []);
  } finally { await context.close(); }
});

test('320px keyboard with blocked storage: plant, predict, inspect and reveal', async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 740 } });
  const key = (name) => page.keyboard.press(name);
  const focus = () => page.evaluate(() => document.activeElement.id);
  try {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    });
    await page.goto(server.origin + '/plant-a-seed/');
    await fits(page, 320);
    assert.match(await page.locator('#save-status').innerText(), /couldn’t restore or save/);
    await key('Tab');
    await key('Tab');
    assert.equal(await focus(), 'plant');
    await key('Enter');
    assert.equal(await focus(), 'cover');
    await key('Enter');
    assert.equal(await focus(), 'prediction-title');
    await key('Tab');
    await key('ArrowRight');
    await key('Tab');
    await key('Enter');
    assert.equal(await focus(), 'inspect');
    await key('Enter');
    assert.equal(await focus(), 'moisture');
    await key('Tab');
    await key('Tab');
    assert.equal(await focus(), 'wait');
    await key('Enter');
    assert.equal(await focus(), 'next');
    await key('Enter');
    assert.equal(await focus(), 'look');
    await key('Enter');
    assert.equal(await focus(), 'stage');
    assert.equal(await page.locator('#pot').getAttribute('data-stage'), 'root');
    assert.match(await page.locator('#save-status').innerText(), /couldn’t restore or save/);
    await page.reload();
    assert.equal(await page.locator('#pot').getAttribute('data-stage'), 'empty');
  } finally { await page.close(); }
});
