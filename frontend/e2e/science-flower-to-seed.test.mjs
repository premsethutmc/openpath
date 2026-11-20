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
 await b(p,'Left flower').tap();
 assert.match(await status(p),/sticks to the bee/);
 await b(p,'Left flower').tap();assert.match(await status(p),/same plant/);
 assert.equal(await b(p,'Look inside →').count(),0);
 await b(p,'Right flower').tap();
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
 await drag('Move the bee','Right flower');assert.match(await status(p),/sticks to the bee/);
 await drag('Move the bee','Left flower');assert.match(await status(p),/reaches the other flower/i);
 await b(p,'Right flower').press('Enter');await b(p,'Left flower').press('Enter');
 assert.match(await status(p),/reaches the other flower/i);
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
 await drag('Left flower');assert.match(await status(p),/sticks to the bee/);
 await drag('Right flower');assert.match(await status(p),/reaches the other flower/i);
}));

test('the bee demonstrates both visits without a tap, then the cutaway opens',async t=>run(t,true,390,async(p,origin)=>{
 await p.emulateMedia({reducedMotion:'no-preference'});
 await p.goto(origin+'/flower-to-seed/');
 await p.locator('#observation').filter({hasText:'Pollen sticks to the bee.'}).waitFor();
 await b(p,'Look inside →').waitFor();
 assert.match(await status(p),/reaches the other flower/);
 await b(p,'Look inside →').tap();
 assert.match(await status(p),/pollen lands/i);
}));
test('Tab focus survives autoplay and both Enter-activated landings',async t=>run(t,false,390,async(p,origin)=>{
 await p.emulateMedia({reducedMotion:'no-preference'});
 await p.goto(origin+'/flower-to-seed/');
 for(let i=0;i<7;i++)await p.keyboard.press('Tab');
 const focused=()=>p.evaluate(()=>document.activeElement?.getAttribute('aria-label'));
 assert.equal(await focused(),'Left flower');
 await p.locator('#observation').filter({hasText:'Pollen reaches the other flower'}).waitFor();
 assert.equal(await focused(),'Left flower');
 await p.keyboard.press('Enter');
 await p.locator('#observation').filter({hasText:'Pollen sticks to the bee.'}).waitFor();
 assert.equal(await focused(),'Left flower');
 await p.keyboard.press('Tab');
 assert.equal(await focused(),'Right flower');
 await p.keyboard.press('Enter');
 await p.locator('#observation').filter({hasText:'Pollen reaches the other flower'}).waitFor();
 assert.equal(await focused(),'Right flower');
}));
test('garden sound is silent by default and plays, mutes and resumes on mobile taps',async t=>run(t,true,390,async(p,origin)=>{
 await p.addInitScript(()=>{
  const Original=window.AudioContext;
  window.AudioContext=class extends Original{
   constructor(){
    super();
    const probe=this.createAnalyser();
    this.createGain=()=>{
     const node=Original.prototype.createGain.call(this);
     if(!window.gardenTestAudio){node.connect(probe);window.gardenTestAudio={ctx:this,probe};}
     return node;
    };
   }
  };
 });
 await p.goto(origin+'/flower-to-seed/');
 const sound=b(p,'Garden sound');
 assert.equal(await sound.getAttribute('aria-pressed'),'false');
 assert.equal(await p.evaluate(()=>typeof window.gardenTestAudio),'undefined');
 await sound.tap();
 await p.waitForFunction(()=>{
  const a=window.gardenTestAudio;
  if(a?.ctx.state!=='running')return false;
  const data=new Float32Array(a.probe.fftSize);
  a.probe.getFloatTimeDomainData(data);
  return data.some(x=>Math.abs(x)>.0008);
 });
 assert.equal(await sound.getAttribute('aria-pressed'),'true');
 await sound.tap();
 await p.waitForFunction(()=>window.gardenTestAudio?.ctx.state==='suspended');
 assert.equal(await sound.getAttribute('aria-pressed'),'false');
 await sound.tap();
 await p.waitForFunction(()=>window.gardenTestAudio?.ctx.state==='running');
 assert.equal(await sound.getAttribute('aria-pressed'),'true');
}));
test('phone: the story can pause, finish, replay, and return immediately to the bee',async t=>run(t,true,390,async(p,origin)=>{
 await p.clock.install();
 await p.goto(origin+'/flower-to-seed/');
 await b(p,'▶ Watch the 20-second story').tap();
 const dialog=p.getByRole('dialog',{name:'A Bee’s Morning'});
 const line=()=>dialog.locator('.film-shot').textContent();
 assert.equal(await line(),'Dawn at the hive');
 const speaker=()=>dialog.locator('.film-bubble strong').textContent();
 assert.equal(await speaker(),'Pip');
 await p.clock.fastForward(2270);
 assert.equal(await speaker(),'Mina');
 await p.clock.fastForward(2090);
 assert.equal(await speaker(),'Dot');
 await p.clock.fastForward(1830);
 assert.equal(await line(),'Into the meadow');
 assert.equal(await dialog.locator('.film-bubble').isVisible(),false);
 await b(p,'Ⅱ Pause').tap();
 await p.clock.fastForward(3000);
 assert.equal(await line(),'Into the meadow');
 await b(p,'▶ Resume').tap();
 await p.clock.fastForward(2200);
 assert.match(await dialog.locator('#film-camera').getAttribute('transform'),/scale\(1\./);
 await p.clock.fastForward(2200);
 assert.equal(await line(),'The first flower');
 await p.clock.fastForward(3050);
 assert.equal(await line(),'The next flower');
 await p.clock.fastForward(4200);
 assert.equal(await line(),'Back at the hive');
 await p.clock.fastForward(3100);
 await b(p,'↻ Replay').waitFor();
 await b(p,'↻ Replay').tap();
 assert.equal(await line(),'Dawn at the hive');
 await b(p,'Take over the bee →').tap();
 assert.equal(await dialog.count(),0);
 // The browser dispatches dialog's close event on a subsequent frame.
 await p.clock.runFor(65);
 await p.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Move the bee');
 await b(p,'Left flower').tap();assert.match(await status(p),/sticks to the bee/);
}));
test('story sound toggles without leaving the film and mute cancels current speech',async t=>run(t,true,320,async(p,origin)=>{
 p.setDefaultTimeout(8000);
 await p.addInitScript(()=>{
  window.testVoices={lines:[],cancels:0};
  Object.defineProperty(window,'speechSynthesis',{value:{
   getVoices:()=>[{lang:'en-IN',localService:true}],
   speak:msg=>window.testVoices.lines.push(msg.text),
   cancel:()=>window.testVoices.cancels++,
  }});
  window.SpeechSynthesisUtterance=class { constructor(text){this.text=text;} };
 });
 await p.clock.install();
 await p.goto(origin+'/flower-to-seed/');
 await b(p,'▶ Watch the 20-second story').tap();
 const dialog=p.getByRole('dialog');
 const sound=b(p,'Story sound');
 assert.equal(await sound.getAttribute('aria-pressed'),'false');
 await sound.tap();
 await p.locator('#film-sound[aria-pressed="true"]').waitFor();
 await p.clock.fastForward(2280);
 assert.match(await dialog.locator('.film-bubble').innerText(),/Mina/);
 assert.ok((await p.evaluate(()=>window.testVoices.lines)).some(s=>s.includes('orchard')));
 await sound.tap();
 await p.locator('#film-sound[aria-pressed="false"]').waitFor();
 assert.ok(await dialog.isVisible());
 assert.ok(await p.evaluate(()=>window.testVoices.cancels>0));
 assert.match(await dialog.locator('.film-bubble').innerText(),/Mina/);
 await sound.tap();
 await p.locator('#film-sound[aria-pressed="true"]').waitFor();
 await b(p,'Take over the bee →').tap();
 assert.equal(await b(p,'Garden sound').getAttribute('aria-pressed'),'true');
 await b(p,'Garden sound').tap();
 await p.locator('#garden-sound[aria-pressed="false"]').waitFor();
}));
