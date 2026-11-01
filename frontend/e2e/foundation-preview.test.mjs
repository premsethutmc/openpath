import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../dist-slice/', import.meta.url));
const shots=process.env.SHOTS_DIR ?? '/tmp/foundation-preview-shots';
mkdirSync(shots,{recursive:true});
const server=http.createServer((req,res)=>{try {let p=(req.url||'/').split('?')[0]; if(p==='/')p='/index.html'; res.setHeader('content-type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(readFileSync(root+p));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({ ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}), args: ['--no-sandbox'] });
try {
 for(const start of ['gen:lin:2,17,11','gen:ahtri:16,44','gen:aaadd:4,13']) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`http://127.0.0.1:${server.address().port}/?foundation=1&start=${encodeURIComponent(start)}`);
  assert.equal(await page.evaluate(()=>!!window.__slice.flow.session.foundation),true);
  const a=await page.evaluate(q=>window.__slice.answer(q),start);
  await page.locator('input').first().fill(a);
  await page.getByRole('button',{name:/^check$/i}).dblclick();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  assert.equal(await page.evaluate(()=>window.__slice.flow.session.replies.length),1);
  await page.screenshot({path:`${shots}/foundation-${start.split(':')[1]}.png`});
  await page.close();
 }
 console.log('PASS: opt-in foundation on 390x844 in linear equations, geometry and addition; repeated check action produces one saved submission each');
}finally{await browser.close();server.close();}
