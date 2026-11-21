import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';

const assets = { 'index.html':'text/html', 'march.css':'text/css', 'march.mjs':'text/javascript',
  'art.mjs':'text/javascript', 'story.mjs':'text/javascript', 'voice-salt.mp3':'audio/mpeg',
  'voice-walk.mp3':'audio/mpeg', 'voice-shore.mp3':'audio/mpeg', 'voice-peaceful.mp3':'audio/mpeg' };
const server = createServer(async (req,res)=>{
  const name = req.url === '/' ? 'index.html' : req.url.slice(1);
  if (!Object.hasOwn(assets,name)) return res.writeHead(404).end();
  res.setHeader('Content-Type', assets[name]);
  res.end(await readFile(new URL('../history/dandi-march/'+name,import.meta.url)));
});
let browser, url;
before(async ()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  url='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch();
});
after(async ()=>{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
});
for(const width of [320,390]){
  test('child can walk, talk and reach Dandi on a '+width+'px phone', async ()=>{
    const context=await browser.newContext({viewport:{width,height:720},hasTouch:true,isMobile:true,
      reducedMotion:width===320?'reduce':'no-preference'});
    try {
      const page=await context.newPage();
      page.setDefaultTimeout(8500);
      const errors=[], external=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('request',r=>{if(!r.url().startsWith(url+'/'))external.push(r.url());});
      await page.goto(url);
      assert.equal(await page.title(),'Walk to Dandi | OpenPath');
      assert.equal(await page.locator('#ask').isVisible(),false);
      await page.getByRole('button',{name:'Join the march'}).tap();
      await page.waitForFunction(()=>document.body.dataset.stage==='1');
      await page.getByRole('button',{name:'Why salt?',exact:true}).tap();
      assert.equal(await page.locator('#speaker').textContent(),'Raman');
      assert.match(await page.locator('#reply').textContent(),/British rule/);
      assert.equal(await page.getByRole('button',{name:'Why salt?',exact:true}).getAttribute('aria-pressed'),'true');
      const mp3=page.waitForResponse(r=>r.url().endsWith('/voice-salt.mp3'));
      await page.getByRole('button',{name:'Sound off',exact:true}).tap();
      assert.equal((await mp3).status(),200);
      const alt=page.waitForResponse(r=>r.url().endsWith('/voice-walk.mp3'));
      await page.getByRole('button',{name:'Why walk all this way?',exact:true}).tap();
      assert.equal((await alt).status(),200);
      assert.equal(await page.locator('#speaker').textContent(),'Dev');
      await page.getByRole('button',{name:'Hide questions'}).tap();
      assert.equal(await page.locator('#caption').isVisible(),false);
      await page.getByRole('button',{name:'Keep walking'}).tap();
      await page.waitForFunction(()=>document.body.dataset.stage==='2');
      assert.equal(await page.locator('#place').textContent(),'Dandi shore');
      await page.getByRole('button',{name:'Go to the water'}).tap();
      await page.waitForFunction(()=>document.body.dataset.stage==='3');
      assert.match(await page.locator('#hint').textContent(),/A handful of salt/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      await page.getByRole('button',{name:'Start again'}).tap();
      assert.equal(await page.locator('#place').textContent(),'Sabarmati Ashram');
      assert.equal(await page.locator('#caption').isVisible(),false);
      assert.deepEqual(errors,[]);
      assert.deepEqual(external,[]);
    } finally {await context.close();}
  });
}
