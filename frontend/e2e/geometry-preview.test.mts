import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=http.createServer((req,res)=>{
 const [kind,...rest]=decodeURIComponent((req.url??'/').split('?')[0]).split('/').slice(1);
 if(!['on','off'].includes(kind)||rest.includes('..')){res.writeHead(404).end();return}
 let path=rest.join('/');if(path.endsWith('/'))path+='index.html';
 try{const data=readFileSync(`${root}/dist-geometry${kind==='off'?'-off':''}/${path}`);res.writeHead(200,{'content-type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.json')?'application/json':'text/html'}).end(data)}catch{res.writeHead(404).end()}
});
await new Promise<void>(r=>server.listen(4231,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:360,height:820},isMobile:true,hasTouch:true});const page=await context.newPage();
page.on('pageerror',e=>console.error('pageerror',e.message));
const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url())});
const shots='/tmp/geometry-quality/preview';mkdirSync(shots,{recursive:true});
try{
 for(const mode of ['on','off']){
  await page.goto(`http://127.0.0.1:4231/${mode}/curriculum/?preview=1&geometry=1#b=cbse&g=7&c=MATH.geometry.triangle-properties`);
  await page.getByRole('article',{name:'Mathematics teaching and practice preview'}).waitFor();
  const labs=page.locator('[data-triangle-lab]');await labs.first().waitFor();
  assert.ok((await page.locator('body').innerText()).includes('not been approved by an educator'));
  if(mode==='on')await labs.first().locator('[data-board-ready="true"]').waitFor();
  else{assert.equal(await page.locator('.triangle-board').count(),0);assert.equal(await labs.first().getAttribute('data-triangle-lab'),'static');assert.equal(await page.getByRole('button',{name:'Reset triangle'}).count(),0)}
  await labs.first().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`${shots}/${mode}-360.png`,fullPage:true,animations:'disabled'});
 }
 assert.deepEqual(writes,[]);writeFileSync(`${shots}/result.json`,JSON.stringify({passed:true,mobileWidth:360,noWrites:true,nonTestDefaultOff:true,queryCannotEnable:true},null,2));
 console.log('PASS: shared preview;360px; pending review; no writes; non-test default off, query cannot enable');
}catch(e){console.error(await page.locator('body').innerText());throw e}finally{await browser.close();server.close()}
