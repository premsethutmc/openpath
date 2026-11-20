import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {serveScience} from './science-static.mjs';
test('hold-to-pour meter moves and stops on release; keyboard can add a discrete dose',async()=>{
 const server=await serveScience();
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(server.origin+'/chemistry-lab/');
  const salt=page.getByRole('button',{name:'Table salt',exact:true});
  await salt.waitFor();
  const box=await salt.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
  await page.waitForFunction(()=>document.querySelector('#meter').value>.4);
  await page.mouse.up();
  const amount=await page.locator('#dose-value').textContent();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#dose-value').textContent(),amount);
  await page.getByRole('button',{name:'Clean vessel'}).click();
  await salt.press('Enter');
  assert.match(await page.locator('#dose-value').textContent(),/0.2 units/);
  await page.getByRole('button',{name:'Water',exact:true}).click();
  assert.match(await page.locator('#observation').textContent(),/has dissolved/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{await browser?.close();await server.close();}
});
test('320px touch enters the common lab, observes fizz then changes to metals',async()=>{
 const server=await serveScience();
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const page=await browser.newPage({viewport:{width:320,height:730},isMobile:true,hasTouch:true});
  await page.goto(server.origin);
  await Promise.all([page.waitForURL(server.origin+'/chemistry-lab/'),page.getByRole('link',{name:/Chemistry Lab.*Pour/}).tap()]);
  const btn=(name)=>page.getByRole('button',{name,exact:true});
  await btn('Vinegar').tap();
  await btn('Baking soda').tap();
  await page.locator('#observation').filter({hasText:/fizz stops/}).waitFor();
  await btn('Metals').tap();
  await btn('Copper').tap();
  await btn('Zinc').tap();
  await btn('Turn on heater').tap();
  await page.locator('#observation').filter({hasText:/alloy, not a compound/}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{await browser?.close();await server.close();}
});
