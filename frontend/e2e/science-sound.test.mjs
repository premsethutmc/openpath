import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { serveScience } from './science-static.mjs';

for (const width of [320,390]) test(`Sound Studio ${width}px: one string, real audio, two different changes`, async () => {
  const server=await serveScience();
  let browser;
  try {
    browser=await chromium.launch({timeout:10000, executablePath:process.env.CHROMIUM_PATH||undefined});
    const p=await browser.newPage({viewport:{width,height:790},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    p.setDefaultTimeout(6500);
    const errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    p.on('request',r=>{if(new URL(r.url()).origin!==server.origin)errors.push(r.url());});
    await p.addInitScript(()=>{
      const Original=window.AudioContext;
      window.soundTest={notes:[]};
      window.AudioContext=class extends Original{
        constructor(){
          super();
          const probe=this.createAnalyser();
          window.soundTest.probe=probe;
          window.soundTest.ctx=this;
          let first=true;
          this.createGain=()=>{
            const node=Original.prototype.createGain.call(this);
            if(first){node.connect(probe);first=false;}
            return node;
          };
          this.createOscillator=()=>{
            const node=Original.prototype.createOscillator.call(this);
            const start=node.start.bind(node);
            node.start=when=>{window.soundTest.notes.push(node.frequency.value);start(when);};
            return node;
          };
        }
      };
    });
    await p.goto(server.origin);
    await p.getByRole('link',{name:/Sound Studio/}).tap();
    await p.waitForURL(server.origin+'/sound-studio/');
    await p.locator('#tension[aria-valuetext]').waitFor();
    assert.equal(await p.evaluate(()=>!!window.soundTest.ctx),false,'never autoplay');
    await p.getByRole('button',{name:'Soft pluck'}).tap();
    const read=()=>p.locator('#notice').textContent();
    const notes=()=>p.evaluate(()=>window.soundTest.notes);
    assert.match(await read(),/pulling farther/);
    await p.waitForFunction(()=>{
      const {ctx,probe}=window.soundTest;if(ctx?.state!=='running')return false;
      const data=new Float32Array(probe.fftSize);probe.getFloatTimeDomainData(data);
      return data.some(n=>Math.abs(n)>.0005);
    },null,{timeout:2500});
    assert.equal((await notes())[0],220);
    const scene=await p.locator('#instrument').boundingBox();
    const cdp=await p.context().newCDPSession(p);
    const send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
    const point=(x,y)=>({x:scene.x+scene.width*x/480,y:scene.y+scene.height*y/200});
    async function drag(x,y,dx,dy){
      await send('touchStart',[point(x,y)]);
      for(const f of [.25,.5,.75,1])await send('touchMove',[point(x+dx*f,y+dy*f)]);
      await send('touchEnd',[]);
    }
    await drag(240,101,0,37);
    assert.equal(await read(),'Louder, same pitch.');
    assert.equal((await notes())[4],220);
    const waves=()=>p.evaluate(()=>['previous','wave'].map(id=>{
      const d=document.getElementById(id).getAttribute('d');
      return Math.max(...[...d.matchAll(/ (\d+\.\d+)/g)].map(m=>Number(m[1])))-40;
    }));
    const [soft,strong]=await waves();
    assert.ok(strong > soft*2);
    await drag(424,101,51,0);
    assert.equal(await p.locator('#tension').evaluate(e=>e.valueAsNumber),200);
    const b=await p.getByRole('button',{name:'Strong pluck'}).boundingBox();
    const at={x:b.x+b.width/2,y:b.y+b.height/2};
    await send('touchStart',[at]);await send('touchEnd',[]);
    assert.equal(await read(),'Higher pitch, about as loud.');
    assert.ok(Math.abs((await notes())[8]-220*Math.sqrt(2))<.001);
    const before=(await notes()).length;
    await p.getByLabel('Sound',{exact:true}).uncheck();
    await p.getByRole('slider',{name:'Tuning peg'}).press('Home');
    await p.getByRole('button',{name:'Strong pluck'}).press('Enter');
    assert.equal(await read(),'Lower pitch, about as loud.');
    assert.equal((await notes()).length,before);
    assert.ok(await p.evaluate(()=>innerWidth===document.documentElement.scrollWidth));
    assert.deepEqual(errors,[]);
  } finally {
    await browser?.close(); await server.close();
  }
});
