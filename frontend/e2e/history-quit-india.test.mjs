import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';

const dir = fileURLToPath(new URL('../history/quit-india/', import.meta.url));
const mime = {'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.webp':'image/webp'};
let server, browser, url;
before(async () => {
  server = createServer(async (req,res) => {
    const path = resolve(dir, '.'+new URL(req.url,'http://localhost').pathname);
    if (!path.startsWith(resolve(dir)+sep)) { res.writeHead(404).end(); return; }
    try {const body=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path)]}).end(body);}
    catch {res.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  url = `http://127.0.0.1:${server.address().port}/index.html`;
  browser = await chromium.launch();
});
after(async()=>{await browser?.close();server?.close()});

test('390px touch plays the entire lesson and tunes the radio from the dial',async()=>{
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    const p=await c.newPage(), errs=[];
    p.on('pageerror',error=>errs.push(error.message));
    await p.goto(url);
    await p.getByRole('button',{name:'Step into 1942'}).tap();
    await p.getByRole('button',{name:'British draft'}).tap();
    assert.match(await p.locator('#answer').innerText(),/after the war/);
    await p.getByRole('button',{name:'Congress reply'}).tap();
    assert.match(await p.locator('#answer').innerText(),/during the war/);
    await p.locator('#next').tap();
    await p.getByRole('button',{name:'Look towards the platform'}).tap();
    assert.match(await p.locator('#answer').innerText(),/Do or Die/);
    await p.locator('#next').tap();
    await p.getByRole('button',{name:'Read the notice'}).tap();
    assert.match(await p.locator('#answer').innerText(),/Aga Khan Palace/);
    await p.locator('#next').tap();
    await p.getByRole('button',{name:'Sound off'}).tap();
    const dial = p.getByRole('slider',{name:'Tuning dial'});
    const rect = await dial.boundingBox();
    assert.ok(rect);
    await p.touchscreen.tap(rect.x+rect.width/2, rect.y+rect.height/2);
    assert.equal(await p.locator('#receiver').getAttribute('data-locked'),'true');
    assert.match(await p.locator('#answer').innerText(),/Usha Mehta/);
    await p.locator('#next').tap();
    for(const city of ['Ballia','Tamluk','Satara','Tamil Nadu']) {
      const control=p.getByRole('button',{name:city,exact:true});
      await control.tap(); assert.equal(await control.getAttribute('aria-pressed'),'true');
    }
    assert.match(await p.locator('#answer').innerText(),/Madurai/);
    await p.locator('#next').tap();
    assert.match(await p.locator('#context').innerText(),/did not end in 1942.*1947.*Partition/);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),390);
    assert.deepEqual(errs,[]);
  } finally {await c.close();}
});

test('320px keyboard, muted and reduced motion: optional evidence, revisit and replay',async()=>{
  const c=await browser.newContext({viewport:{width:320,height:740},reducedMotion:'reduce'});
  try {
    const p=await c.newPage();
    await p.goto(url);
    await p.keyboard.press('Tab');
    await p.getByRole('button',{name:'Step into 1942'}).focus();
    await p.keyboard.press('Enter');
    assert.equal(await p.locator('#picture').evaluate(el=>getComputedStyle(el).animationName),'none');
    for(let i=0;i<3;i++) await p.locator('#next').click();
    await p.getByRole('button',{name:'Tune to Congress Radio'}).focus();
    await p.keyboard.press('Enter');
    assert.match(await p.locator('#answer').innerText(),/42.34/);
    assert.equal(await p.locator('#sound').getAttribute('aria-pressed'),'false');
    await p.locator('#back').click();await p.locator('#next').click();
    assert.match(await p.locator('#answer').innerText(),/Congress Radio/);
    await p.locator('#next').click();await p.locator('#next').click();await p.locator('#next').click();
    assert.equal(await p.locator('#chapter').innerText(),'The Morning After');
    assert.equal(await p.locator('#evidence').isVisible(),false);
    await p.getByRole('button',{name:'Step into 1942'}).click();
    assert.equal(await p.locator('#evidence').isVisible(),false);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),320);
  } finally {await c.close();}
});
