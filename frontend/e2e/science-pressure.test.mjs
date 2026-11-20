import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';

const lab = new URL('../science/pressure-in-sand/', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/lab.css', ['lab.css', 'text/css']],
  ['/lab.mjs', ['lab.mjs', 'text/javascript']],
  ['/model.mjs', ['model.mjs', 'text/javascript']],
]);
const server = createServer(async (request, response) => {
  if (!files.has(request.url)) return response.writeHead(404).end();
  const [file, type] = files.get(request.url);
  try { response.writeHead(200, { 'content-type': type + '; charset=utf-8' }).end(await readFile(new URL(file, lab))); }
  catch { response.writeHead(500).end(); }
});
let browser;
let origin;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  origin = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  await browser?.close();
  if (server.listening) await new Promise((resolve) => server.close(resolve));
});

async function fitsPhone(page) {
  assert.equal(await page.evaluate(() => innerWidth), 390);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}

test('390px tour: explore, predict, compare and transfer; wrong reason gets a retry', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (new URL(request.url()).origin !== origin) external.push(request.url()); });
  const button = (name) => page.getByRole('button', { name });
  const choose = (name) => page.getByRole('radio', { name, exact: true }).check();
  try {
    await page.goto(origin);
    await fitsPhone(page);
    if (process.env.E2E_SHOTS) {
      await mkdir(process.env.E2E_SHOTS, { recursive: true });
      await page.screenshot({ path: process.env.E2E_SHOTS + '/science-pressure-explore.png', fullPage: true });
    }
    assert.equal(await page.locator('#explore .object').evaluate((element) => getComputedStyle(element).transitionDuration), '0s');
    await button('Drop brick').tap();
    await button('Lift it').tap();
    assert.match(await page.locator('#explore-note').innerText(), /visible mark/);
    await choose('Feather');
    await button('Drop feather').tap();
    await button('Lift it').tap();
    assert.match(await page.locator('#explore-note').innerText(), /almost no mark/);

    await button('Go to the fair test').tap();
    await fitsPhone(page);
    assert.equal(await page.locator('#trials').isVisible(), false);
    await choose('Same');
    await button('Lock in my prediction').tap();
    await button('Place on narrow face').tap();
    assert.match(await page.locator('.trial[data-face=narrow] .measurement').innerText(), /12 N · 30 cm² · 4 kPa/);
    assert.equal(await page.locator('#comparison-result').isVisible(), false);
    await button('Place on wide face').tap();
    assert.match(await page.locator('.trial[data-face=wide] .measurement').innerText(), /12 N · 60 cm² · 2 kPa/);
    assert.match(await page.locator('#comparison-result').innerText(), /Half the area, twice the pressure/);
    if (process.env.E2E_SHOTS) await page.screenshot({ path: process.env.E2E_SHOTS + '/science-pressure-compare.png', fullPage: true });

    await button('Try a new problem').tap();
    await fitsPhone(page);
    assert.equal(await page.locator('#transfer-feedback').isVisible(), false);
    await choose('Wide feet');
    await button('Check my choice').tap();
    assert.equal(await page.locator('#transfer-feedback').isVisible(), false, 'a reason is required before feedback');
    await choose('The stand pushes down with less force.');
    await button('Check my choice').tap();
    assert.match(await page.locator('#feedback-detail').innerText(), /force stays the same/);
    await button('Try the problem again').tap();
    assert.equal(await page.locator('#stand-form input:checked').count(), 0);
    await choose('Wide feet');
    await choose('The same force is spread over a larger area.');
    await button('Check my choice').tap();
    assert.equal(await page.locator('#feedback-heading').innerText(), 'You applied the idea.');
    await button('Restart the lab').tap();
    assert.equal(await page.locator('#explore').isVisible(), true);
    assert.equal(await page.locator('#trials').isVisible(), false);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  } finally { await context.close(); }
});

test('keyboard-only controls can skip exploration and complete comparison', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(origin);
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'start');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'compare-title');
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'trial-prompt');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#prediction-result').innerText(), /Your prediction matched/);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'apply-title');
  } finally { await page.close(); }
});
