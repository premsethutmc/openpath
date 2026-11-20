import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {serveScience} from './science-static.mjs';

for (const width of [320,390]) test(width+'px: aim, compare white and red, and remove the prism', async ()=>{
  const server = await serveScience();
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
    const page = await browser.newPage({viewport:{width,height:800},isMobile:true,hasTouch:true});
    const unexpected = [];
    page.on('pageerror',e=>unexpected.push(e.message));
    page.on('response',response=>{if(response.status()>=400) unexpected.push(response.url());});
    page.on('request', r=>{if(new URL(r.url()).origin!==server.origin) unexpected.push(r.url());});
    await page.goto(server.origin);
    await page.getByRole('link',{name:/Prism Lab/}).tap();
    const toggle = page.locator('#glass-toggle');
    const ray = page.locator('#rays polyline');
    assert.match(await page.locator('#observation').innerText(),/One white spot/);
    assert.equal(await ray.count(),1);
    if(width===390) await toggle.tap(); else await toggle.press('Enter');
    assert.equal(await ray.count(),7);
    assert.match(await page.locator('#observation').innerText(),/violet most/);
    const path = await ray.last().getAttribute('points');
    await page.getByRole('slider',{name:'Aim the beam'}).press('End');
    assert.notEqual(await ray.last().getAttribute('points'),path);
    await page.getByRole('slider',{name:'Aim the beam'}).press('Home');
    if(width===390 && process.env.E2E_SHOTS){
      await mkdir(process.env.E2E_SHOTS,{recursive:true});
      await page.screenshot({path:process.env.E2E_SHOTS+'/science-prism.png',fullPage:true});
    }
    await page.getByRole('radio',{name:'Red only'}).check();
    assert.equal(await ray.count(),2);
    assert.match(await page.locator('#observation').innerText(),/bends, but stays red/);
    await page.getByText('Try a prediction').tap();
    await page.getByRole('button',{name:'A rainbow'}).tap();
    assert.match(await page.locator('#result').innerText(),/Try red-only/);
    await page.getByRole('button',{name:'One red spot'}).tap();
    assert.match(await page.locator('#result').innerText(),/changes direction but stays red/);
    await toggle.tap();
    assert.match(await page.locator('#observation').innerText(),/goes straight/);
    assert.ok(await page.evaluate(()=>innerWidth===document.documentElement.scrollWidth));
    assert.deepEqual(unexpected,[]);
  } finally {await browser?.close();await server.close();}
});
