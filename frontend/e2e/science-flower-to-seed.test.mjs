import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {serveScience} from './science-static.mjs';
async function run(t,touch,width,fn){
 const server=await serveScience();t.after(()=>server.close());
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width,height:850},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await fn(page,server.origin);
 assert.deepEqual(errors,[]);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
const b=(p,name)=>p.getByRole('button',{name,exact:true});
const status=p=>p.locator('#observation').textContent();
test('320px touch: go from pollen to pod, send seeds and grow a plant without a quiz',async t=>run(t,true,320,async(p,origin)=>{
 await p.goto(origin);
 await p.getByRole('link',{name:/Flower to Seed/}).tap();
 await p.waitForURL(origin+'/flower-to-seed/');
 assert.equal(await b(p,'Look inside →').count(),0);
 await b(p,'Anthers A').tap(); await b(p,'Petal B').tap();
 assert.match(await status(p),/petal can’t start a seed/);
 await b(p,'Stigma A').tap();assert.match(await status(p),/Same-flower/);
 assert.equal(await b(p,'Look inside →').count(),0);
 await b(p,'Anthers A').tap();await b(p,'Stigma B').tap();
 await b(p,'Look inside →').tap();
 assert.match(await status(p),/pollen lands/i);
 const time=p.getByRole('slider',{name:'Flower growth'});
 await time.press('ArrowRight');
 assert.match(await status(p),/tube grows/);
 await time.press('End');
 assert.equal(await p.locator('.pod-burst').count(),0);
 await b(p,'⚡ Split the pod').tap();
 assert.equal(await p.locator('.pod-burst').count(),1);
 await b(p,'Send seeds travelling →').tap();
 await b(p,'Coconut').tap();await b(p,'≋ Wind').tap();
 assert.match(await status(p),/didn’t travel/);
 await b(p,'◈ Water').tap();assert.match(await status(p),/husk helps/);
 await b(p,'Grow again →').tap();
 await b(p,'↓ Plant here').tap();await b(p,'☂ Make it rain').tap();
 await b(p,'☀ Let time pass').tap();assert.match(await status(p),/root comes out/);
 await b(p,'☀ Let time pass').tap();assert.match(await status(p),/first leaves/);
 await b(p,'Potato with an eye').tap();
 await b(p,'↓ Plant').tap();await b(p,'☂ Make it rain').tap();
 await b(p,'☀ Let time pass').tap();assert.match(await status(p),/without a seed/);
 assert.equal(await p.locator('select').count(),0);
}));
test('390px drag the bee itself twice, then replay using a keyboard',async t=>run(t,false,390,async(p,origin)=>{
 await p.goto(origin+'/flower-to-seed/');
 async function drag(from,to){
  const a=await b(p,from).boundingBox(),z=await b(p,to).boundingBox();
  await p.mouse.move(a.x+a.width/2,a.y+a.height/2);
  await p.mouse.down();
  await p.mouse.move(z.x+z.width/2,z.y+z.height/2,{steps:7});
  await p.mouse.up();
 }
 await drag('Move the bee','Anthers B');assert.match(await status(p),/stuck to the bee/);
 await drag('Move the bee','Stigma A');assert.match(await status(p),/cross-pollination/i);
 await b(p,'Anthers B').press('Enter');await b(p,'Stigma A').press('Enter');
 assert.match(await status(p),/cross-pollination/i);
}));
test('390px emulated touch drag picks up and deposits pollen',async t=>run(t,true,390,async(p,origin)=>{
 await p.goto(origin+'/flower-to-seed/');
 const cdp=await p.context().newCDPSession(p);
 const send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
 async function drag(to){
  const first=await b(p,'Move the bee').boundingBox(),last=await b(p,to).boundingBox();
  const x=first.x+first.width/2,y=first.y+first.height/2,dx=last.x+last.width/2-x,dy=last.y+last.height/2-y;
  await send('touchStart',[{x,y}]);
  for(const step of [.25,.5,.75,1])await send('touchMove',[{x:x+step*dx,y:y+step*dy}]);
  await send('touchEnd',[]);
 }
 await drag('Anthers A');assert.match(await status(p),/stuck to the bee/);
 await drag('Stigma B');assert.match(await status(p),/cross-pollination/i);
}));
