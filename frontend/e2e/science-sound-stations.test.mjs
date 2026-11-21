import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { serveScience } from './science-static.mjs';

const shots = process.env.SOUND_SHOTS;

for (const width of [320,390]) test(`Sound Studio ${width}px: every instrument leads to a discovery`, async () => {
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
      window.notes=[];
      window.AudioContext=class extends Original{
        constructor(){
          super();
          this.createOscillator=()=>{
            const node=Original.prototype.createOscillator.call(this);
            const start=node.start.bind(node);
            node.start=when=>{window.notes.push(Math.round(node.frequency.value));start(when);};
            return node;
          };
        }
      };
    });
    await p.goto(server.origin+'/sound-studio/');
    const count=()=>p.locator('#nb-count').textContent();
    const toast=p.locator('#eureka');
    const fits=()=>p.evaluate(()=>innerWidth===document.documentElement.scrollWidth);
    const snap=async name=>{ if(shots) await p.screenshot({path:`${shots}/${width}-${name}.png`,fullPage:true}); };
    assert.equal(await count(),'0 of 9');
    await snap('veena');

    // Veena: a fret shortens the string and raises the note.
    await p.getByRole('slider',{name:'Fret'}).fill('5');
    assert.equal(await p.getByRole('slider',{name:'Fret'}).getAttribute('aria-valuetext'),'High Sa');
    await p.getByRole('button',{name:'Soft pluck'}).tap();
    assert.match(await toast.textContent(),/shorter string/);
    assert.equal(await p.evaluate(()=>window.notes[0]),440);
    assert.equal(await count(),'1 of 9');

    // Bottles: the notes climb only when the water rises left to right.
    await p.getByRole('tab',{name:/Bottles/}).tap();
    assert.ok(await p.locator('#st-veena').isHidden());
    await p.getByRole('button',{name:'Blow them in a row'}).tap();
    await p.locator('#b-notice',{hasText:'Not climbing yet'}).waitFor();
    for (const [i,v] of [5,20,40,60,80].entries()) await p.getByRole('slider',{name:`Water in bottle ${i+1}`}).fill(String(v));
    await p.getByRole('button',{name:'Blow them in a row'}).tap();
    await p.locator('#b-notice',{hasText:'Sa Ri Ga Ma Pa'}).waitFor();
    assert.match(await toast.textContent(),/Less air shakes faster/);
    await snap('bottles');

    // Drum: rice jumps higher on the harder hit; tighter straps give a higher tone.
    await p.getByRole('tab',{name:/Drum/}).tap();
    await p.getByRole('button',{name:'Soft tap'}).tap();
    assert.match(await p.locator('#d-notice').textContent(),/a little/);
    await p.getByRole('button',{name:'Strong tap'}).tap();
    assert.match(await p.locator('#d-notice').textContent(),/Louder, same pitch\. The rice jumped high/);
    await p.getByRole('slider',{name:'Straps'}).fill('180');
    await p.getByRole('button',{name:'Strong tap'}).tap();
    assert.match(await p.locator('#d-notice').textContent(),/^Higher pitch/);
    assert.equal(await count(),'4 of 9');
    await snap('drum');

    // Bell jar: the bell keeps shaking while the sound fades with the air.
    await p.getByRole('tab',{name:/Bell jar/}).tap();
    await p.getByRole('button',{name:'Ring the bell'}).tap();
    for (let i=0;i<5;i++) await p.getByRole('button',{name:'Pump air out'}).tap();
    assert.equal(await p.locator('#air-left').textContent(),'8%');
    assert.match(await toast.textContent(),/Sound needs air, water or a solid/);
    await snap('bell');
    await p.getByRole('tab',{name:/Who hears/}).tap();
    assert.equal(await p.evaluate(()=>{const n=notes.length;return new Promise(r=>setTimeout(()=>r(notes.length-n),700));}),0,'bell stops when you leave');

    // Who hears: the ultrasound and infrasound edges.
    const pitch=p.getByRole('slider',{name:'Pitch'});
    await pitch.fill('870');
    assert.match(await p.locator('#hz-kind').textContent(),/Ultrasound/);
    assert.match(await p.locator('#listeners').textContent(),/Dog: hears it.*Bat: hears it/s);
    await pitch.fill('60');
    assert.match(await p.locator('#listeners').textContent(),/Elephant: hears it.*You: can’t hear it/s);
    await p.getByRole('button',{name:'Play it'}).tap();
    assert.match(await p.locator('#h-notice').textContent(),/elephant/);
    assert.equal(await count(),'7 of 9');
    await snap('hear');
    assert.ok(await fits());

    // Progress survives a reload; the concert appears only when all nine are found.
    await p.reload();
    assert.equal(await count(),'7 of 9');
    assert.ok(await p.locator('#concert').isHidden());
    assert.equal(await p.locator('#tab-drum i').textContent(),'✓');
    assert.deepEqual(errors,[]);
  } finally {
    await browser?.close(); await server.close();
  }
});
