import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {serveScience} from './science-static.mjs';

for(const width of [320,390]) test(width+'px: workbench state reacts to independent tools and time',async()=>{
  const server=await serveScience();
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
    const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
    const problems=[];
    page.on('pageerror',e=>problems.push(e.message));
    page.on('response',r=>{if(r.status()>=400)problems.push(r.status()+':'+r.url());});
    await page.goto(server.origin);
    await Promise.all([
      page.waitForURL(server.origin+'/separation-bench/',{waitUntil:'load'}),
      page.getByRole('link',{name:/Separation Workbench/}).tap(),
    ]);
    await page.locator('#pot .reading').filter({hasText:/g water/}).waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const button=(name)=>page.getByRole('button',{name,exact:true});
    await button('Pause time').tap();
    await button('Pour through filter').tap();
    assert.match(await page.getByRole('status').innerText(),/No liquid/);
    await page.getByLabel('Water dose').selectOption('5');
    if(width===320)await button('Add water').press('Enter');else await button('Add water').tap();
    assert.match(await page.locator('#pot .reading').innerText(),/5.0 g water/);
    await button('Pour through filter').tap();
    assert.match(await page.locator('#cup .reading').innerText(),/5.0 g water/);
    await button('Pour cup back').tap();
    assert.match(await page.locator('#pot .reading').innerText(),/5.0 g water/);
    await page.getByLabel('Starting sample').selectOption('brine');
    await button('Start fresh').tap();
    await button('Pour through filter').tap();
    await button('Catch vapour').tap();
    await page.getByLabel('Power').selectOption('3');
    await page.waitForFunction(()=>parseFloat(document.querySelector('#receiver .reading').textContent)>0,{},{timeout:8000});
    assert.match(await page.locator('#receiver .reading').innerText(),/0.0 g escaped/);
    await button('Pause time').tap();
    const amount=await page.locator('#receiver .reading').innerText();
    await page.waitForTimeout(350);
    assert.equal(await page.locator('#receiver .reading').innerText(),amount);
    assert.deepEqual(problems,[]);
    assert.equal(await page.evaluate(()=>localStorage.length),0);
  } finally {await browser?.close();await server.close();}
});
