import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';

const dir = fileURLToPath(new URL('../history/dandi-march/first-person/', import.meta.url));
const mime = {'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.mp4':'video/mp4','.mp3':'audio/mpeg','.webp':'image/webp'};
let server, browser, url;
before(async () => {
  server = createServer(async (req,res) => {
    const path = resolve(dir, '.'+new URL(req.url,'http://localhost').pathname);
    if (!path.startsWith(resolve(dir)+sep)) { res.writeHead(404).end(); return; }
    try {
      const bytes = await readFile(path);
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      const a = range ? +range[1] : 0;
      const b = range && range[2] ? Math.min(+range[2],bytes.length-1) : bytes.length-1;
      const part = bytes.subarray(a,b+1);
      res.writeHead(range ? 206 : 200, {
        'content-type':mime[extname(path)], 'accept-ranges':'bytes', 'content-length':part.length,
        ...(range ? {'content-range':`bytes ${a}-${b}/${bytes.length}`} : {}),
      }).end(part);
    } catch {res.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  url = `http://127.0.0.1:${server.address().port}/index.html`;
  browser = await chromium.launch();
});
after(async()=>{ await browser?.close(); server?.close(); });

test('390 px archive to optional captioned exchange, controllable walk, and two routes', {timeout:55000},async()=>{
  const c = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    const p = await c.newPage();
    const errors=[]; p.on('pageerror',e=>errors.push(e.message));
    await p.goto(url);
    await p.getByRole('button',{name:'Play opening',exact:true}).tap();
    await p.waitForFunction(()=>document.querySelector('video').currentTime>.25);
    assert.equal(await p.locator('video').evaluate(v=>v.muted),false);
    await p.locator('#pause').tap();
    await p.waitForFunction(()=>document.querySelector('video').paused);
    await p.getByRole('button',{name:'Resume film'}).tap();
    await p.waitForFunction(()=>!document.querySelector('video').paused);
    await p.locator('#walk').waitFor({state:'visible',timeout:26000});
    assert.equal(await p.locator('video').isVisible(),false);
    await p.getByRole('button',{name:'Walk',exact:true}).tap();
    assert.equal(await p.locator('#walk').getAttribute('aria-pressed'),'true');
    await p.locator('#turn').tap();
    await p.getByRole('button',{name:'Why salt?'}).tap();
    assert.equal(await p.locator('audio').count(),0);
    assert.match(await p.locator('#caption').innerText(),/tax hits poor families hardest/i);
    assert.equal(await p.locator('#view').getAttribute('data-answer'),'true');
    assert.equal(await p.locator('#walk').getAttribute('aria-pressed'),'false');
    await p.locator('#walk').tap();
    await p.waitForFunction(()=>document.querySelector('#walk-progress').getAttribute('aria-valuenow') >= 2);
    await p.locator('#walk').tap();
    const progress = await p.locator('#walk-progress').getAttribute('aria-valuenow');
    await p.waitForTimeout(650);
    assert.equal(await p.locator('#walk-progress').getAttribute('aria-valuenow'),progress);
    await p.locator('#walk').tap();
    await p.waitForFunction(()=>document.querySelector('#view').dataset.village === 'true');
    assert.equal(await p.locator('#turn').isVisible(),false);
    await p.waitForFunction(()=>document.querySelector('#walk').disabled,{},{timeout:14000});
    await p.getByRole('button',{name:'See the route'}).tap();
    await p.getByRole('button',{name:/Mahi River/}).tap();
    assert.match(await p.locator('#route-note').innerText(),/Kareli/);
    await p.getByRole('button',{name:'Go to Dandi'}).tap();
    assert.match(await p.locator('#shore-date').innerText(),/5 April/i);
    assert.equal(await p.getByRole('button',{name:'See how it spread'}).isVisible(),false);
    await p.getByRole('button',{name:'Stay until dawn'}).tap();
    assert.match(await p.locator('#shore-date').innerText(),/6 April/i);
    await p.getByRole('button',{name:'See how it spread'}).tap();
    assert.match(await p.locator('#spread').innerText(),/Tiruchirappalli → Vedaranyam/);
    assert.match(await p.locator('#spread').innerText(),/30 Apr/);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),390);
    assert.deepEqual(errors,[]);
  } finally { await c.close(); }
});

test('320 px mute, reduced motion, keyboard, background and replay',async()=>{
  const p = await browser.newPage({viewport:{width:320,height:740},reducedMotion:'reduce'});
  try {
    await p.goto(url);
    await p.getByRole('button',{name:'Sound on'}).click();
    await p.getByRole('button',{name:'Skip to the march',exact:true}).first().click();
    await p.keyboard.press('ArrowUp');
    assert.equal(await p.locator('#view').evaluate(e=>getComputedStyle(e).animationName),'none');
    await p.evaluate(()=>{
      Object.defineProperty(document,'hidden',{configurable:true,value:true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await p.locator('#walk').getAttribute('aria-pressed'),'false');
    await p.evaluate(()=>{
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await p.keyboard.press('ArrowRight');
    await p.getByRole('button',{name:'Why salt?'}).click();
    assert.equal(await p.locator('audio').count(),0);
    assert.match(await p.locator('#caption').innerText(),/Everyone needs salt/);
    await p.keyboard.press('ArrowLeft');
    assert.equal(await p.getByRole('button',{name:'Why salt?'}).isVisible(),false);
    await p.getByRole('button',{name:'See the route'}).click();
    await p.getByRole('button',{name:'Go to Dandi'}).click();
    await p.getByRole('button',{name:'Stay until dawn'}).click();
    await p.getByRole('button',{name:'See how it spread'}).click();
    await p.getByRole('button',{name:'Back to Dandi'}).click();
    assert.equal(await p.locator('#shore').getAttribute('data-salt'),'true');
    await p.getByRole('button',{name:'See how it spread'}).click();
    await p.getByRole('button',{name:'Replay opening'}).click();
    await p.waitForFunction(()=>document.querySelector('video').currentTime>.1);
    assert.equal(await p.locator('video').evaluate(v=>v.muted),true);
    assert.equal(await p.locator('#caption').isVisible(),false);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),320);
  } finally {await p.close();}
});
