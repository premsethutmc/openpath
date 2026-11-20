import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { serveScience } from './science-static.mjs';

for (const width of [320, 390]) test(`Lift the Rock at ${width}px: first tap after drag, same rise, and keyboard parity`, async () => {
  const server = await serveScience();
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, timeout: 10000 });
    const page = await browser.newPage({ viewport:{width,height:790}, hasTouch:true, isMobile:true, reducedMotion:'reduce' });
    page.setDefaultTimeout(6500);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
    page.on('request', request => { if (new URL(request.url()).origin !== server.origin) errors.push(request.url()); });
    await page.goto(server.origin);
    await page.getByRole('link', { name:/Lift the Rock/ }).tap();
    const push = page.getByRole('button', { name:/Push the beam/ });
    const read = () => page.locator('#status').textContent();
    const measure = id => page.locator('#'+id).evaluate(e => e.value);
    await push.tap();
    assert.match(await read(), /Rock up/);
    assert.equal(await measure('effort'), 16);
    assert.equal(await measure('distance'), 6);
    const rock = page.locator('#rock');
    const reference = await rock.getAttribute('transform');
    const scene = await page.locator('#scene').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const send = (type,touchPoints) => cdp.send('Input.dispatchTouchEvent', {type,touchPoints});
    function point(x,y) { return { x:scene.x+scene.width*x/480, y:scene.y+scene.height*y/252 }; }
    async function drag(x,y,dx,dy) {
      await send('touchStart',[point(x,y)]);
      for (const f of [.25,.5,.75,1]) await send('touchMove',[point(x+f*dx,y+f*dy)]);
      await send('touchEnd',[]);
    }
    await drag(214,186,-75,0);
    assert.equal(await measure('effort'), 6, 'drag should move support to the nearest position');
    const area = await push.boundingBox();
    const center = {x:area.x+area.width/2,y:area.y+area.height/2};
    await send('touchStart',[center]);
    await send('touchEnd',[]);
    await page.getByText('Same lift. Less push, but your hand moved farther.').waitFor({ timeout: 3500 });
    assert.equal(await measure('effort'), 6);
    assert.equal(await measure('distance'), 16);
    assert.equal(await rock.getAttribute('transform'), reference);
    assert.equal(await page.locator('#ghost').getAttribute('visibility'), 'visible');
    const range = page.getByRole('slider', { name:'Move the support' });
    await range.press('End');
    await push.press('Enter');
    assert.match(await read(), /More push, but your hand moved less/);
    assert.equal(await measure('effort'), 36);
    assert.equal(await measure('distance'), 8/3);
    assert.equal(await rock.getAttribute('transform'), reference);
    await range.press('Home');
    await drag(424,164,0,60);
    assert.equal(await rock.getAttribute('transform'), reference);
    assert.ok(await page.evaluate(() => innerWidth === document.documentElement.scrollWidth));
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
