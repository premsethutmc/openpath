/** Screenshots from the real My Learning Year application + Django; no mocked learner API. */
import assert from 'node:assert/strict';
import {test, before, after} from 'node:test';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const BASE=process.env.E2E_URL || 'http://127.0.0.1:4710';
const DIR=process.env.NOTEBOOK_SCREEN_DIR || '../docs/product/mathematical-writing/approved-notebook';
let browser;
before(async()=>{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium'});mkdirSync(DIR,{recursive:true});});
after(()=>browser?.close());
for (const width of [360,393]) test(`approved notebook ${width}px: real working, mistake, correction, completion and next question`,async()=>{
 const context=await browser.newContext({viewport:{width,height:width===360?800:852},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const p=await context.newPage();p.setDefaultTimeout(20000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try {
 await p.goto(BASE);await p.getByRole('button',{name:'Try OpenPath as a Demo Student',exact:true}).click();
 const input=p.locator('.paper-cursor');await input.waitFor();
 assert.equal(await p.locator('svg.writing-paper,canvas,.math-keypad,.writing-settings').count(),0);
 assert.equal(await p.getByRole('button',{name:/^(Write|Write instead|Pen|Eraser|Pan)$/}).count(),0);
 assert.doesNotMatch(await p.locator('body').innerText(),/handwriting|recognition|handwritten/i);
 await p.evaluate(()=>document.fonts.ready);
 assert.ok(await p.evaluate(()=>document.fonts.check('40px "OpenPath Kalam"')));
 const metrics=await p.evaluate(()=>{
   const ctx=document.createElement('canvas').getContext('2d');ctx.font='40px "OpenPath Kalam"';
   return [...'0123456789'].map(d=>ctx.measureText(d).width);
 });
 assert.ok(new Set(metrics.map(n=>n.toFixed(2))).size>1,'alignment uses grid columns, not equal glyph widths');
 const fontResponse=await context.request.get(BASE+'/year/'+await p.evaluate(async()=>{
   const css=await (await fetch('/year/app.css')).text();return css.match(/url\((?:["'])?(?:\.\/)?(kalam[^)"']+\.woff2)/)[1];
 }));
 assert.equal(fontResponse.headers()['content-type'],'font/woff2');
 assert.equal((await context.request.get(BASE+'/year/Kalam-OFL.txt')).status(),200);
 const face=await p.locator('.division-paper').evaluate(el=>getComputedStyle(el).fontFamily);
 assert.match(face,/OpenPath Kalam/);
 assert.equal(await p.locator('.year-notebook > .topbar').count(),0);
 assert.equal(await p.getByRole('button',{name:'Save and return to the lesson',exact:true}).count(),0);
 await p.getByRole('button',{name:'Hint',exact:true}).tap();
 await p.getByLabel('Concept hint',{exact:true}).waitFor();
 assert.ok(await input.evaluate(el=>el===document.activeElement));
 await p.getByRole('button',{name:'Back to my working',exact:true}).tap();
 await input.pressSequentially('130');await p.getByLabel('Quotient place 2',{exact:true}).waitFor();
 await p.getByRole('button',{name:'Quotient place 1: 1',exact:true}).click();
 await p.screenshot({path:`${DIR}/working-${width}.png`});
 await input.press('Enter');await p.getByLabel('Multiply row 1',{exact:true}).waitFor();
 await input.press('Enter');await p.getByLabel('Subtract row 1',{exact:true}).waitFor();
 await input.press('Enter');await p.getByLabel('Quotient place 2',{exact:true}).waitFor();
 await input.press('2');await p.getByLabel('Multiply row 2',{exact:true}).waitFor();
 await input.press('5');await p.getByText('Not quite right.',{exact:true}).waitFor();
 assert.equal(await p.locator('[data-entry="product:1"]').innerText(),'−\n5');
 assert.equal(await p.locator('.paper-error').count(),1);
 assert.equal(await input.inputValue(),'5');
 assert.equal(await input.getAttribute('aria-invalid'),'true');
 assert.match(await input.getAttribute('aria-describedby'),/workspace-recovery/);
 await p.screenshot({path:`${DIR}/mistake-${width}.png`});
 const box=await p.locator('.workspace-recovery').boundingBox();assert.ok(box.y+box.height< (width===360?800:852));
 await p.getByRole('button',{name:'Give me a hint',exact:true}).tap();
 await p.getByText('Multiply your quotient digit by the divisor. You can use equal groups.',{exact:true}).waitFor();
 assert.ok(await input.evaluate(el=>el===document.activeElement));
 await p.reload();await p.getByText('Not quite right.',{exact:true}).waitFor();
 assert.equal(await input.inputValue(),'5');
 await p.getByRole('button',{name:'Try again',exact:true}).tap();
 await input.pressSequentially('616181');
 await p.getByText('Great work!',{exact:true}).waitFor();
 await p.getByText('379 ÷ 3 = 126 remainder 1.',{exact:true}).waitFor();
 await p.screenshot({path:`${DIR}/completed-${width}.png`});
 const footer=await p.locator('.notebook-bottom').boundingBox();assert.ok(footer.y+footer.height<=(width===360?800:852));
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Each glyph is centred on the printed digit column; font advance widths need not match.
 for (const f of await p.locator('[data-entry]').all()) {
   const cell=await f.boundingBox();const glyphs=await f.locator('[data-paper-digit]').all();
   for (let i=0;i<glyphs.length;i++) {
     const g=await glyphs[i].boundingBox();
     const column=Math.round((g.x-cell.x)/50);
     assert.ok(Math.abs(g.x-cell.x-column*50)<1);
   }
 }
 await p.getByRole('button',{name:'Next question',exact:true}).click();
 await p.getByText('Divide 382 by 3',{exact:true}).waitFor();
 await input.press('1');await p.getByLabel('Multiply row 1',{exact:true}).waitFor();
 await p.reload();await p.getByText('Divide 382 by 3',{exact:true}).waitFor();
 assert.equal(await p.locator('[data-entry="quotient:0"]').innerText(),'1');
 const identity=await (await context.request.get(BASE+'/api/preview-demo/status/')).json();
 const drafts=await (await context.request.get(BASE+`/api/pupils/${identity.learner}/writing/`)).json();
 const records=await Promise.all(drafts.drafts.map(async d=>(await context.request.get(BASE+`/api/pupils/${identity.learner}/writing/${d.id}/`)).json()));
 const original=records.find(d=>d.lesson.divisionPaper.dividend==='379');
 const next=records.find(d=>d.lesson.divisionPaper.dividend==='382');
 assert.equal(original.stage,'complete');assert.equal(next.stage,'workspace');
 assert.ok(original.receipts.filter(e=>e.action==='progressive-validation').every(e=>e.assisted===true && e.admissible===false));
 assert.equal(next.support.divisionPaper.entries['quotient:0'],'1');
 await p.goto(BASE+'/logout');await p.getByRole('button',{name:'Log out',exact:true}).click();
 await p.getByRole('button',{name:'Try OpenPath as a Demo Student',exact:true}).click();
 await p.getByText('Divide 382 by 3',{exact:true}).waitFor();
 await p.getByLabel('Multiply row 1',{exact:true}).waitFor();
 assert.equal(await p.locator('[data-entry="quotient:0"]').innerText(),'1');
 assert.deepEqual(errors,[]);
 } finally {await context.close();}
});
test('simulated keyboard-constrained viewport keeps native input focus and help in document flow',async()=>{
 const c=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
 const p=await c.newPage();p.setDefaultTimeout(15000);
 try{
 await p.goto(BASE);await p.getByRole('button',{name:'Try OpenPath as a Demo Student',exact:true}).click();
 const input=p.locator('.paper-cursor');await input.waitFor();
 assert.equal(await p.locator('svg.writing-paper,canvas,.math-keypad,.writing-settings').count(),0);
 assert.equal(await p.getByRole('button',{name:/^(Write|Write instead|Pen|Eraser|Pan)$/}).count(),0);
 assert.doesNotMatch(await p.locator('body').innerText(),/handwriting|recognition|handwritten/i);
 await input.pressSequentially('130');await p.getByLabel('Quotient place 2',{exact:true}).waitFor();
 await p.setViewportSize({width:360,height:500});
 await p.waitForFunction(()=>parseFloat(document.querySelector('.notebook').style.getPropertyValue('--notebook-height'))===500);
 await input.evaluate(el=>{window.notebookBlur=0;el.addEventListener('blur',()=>window.notebookBlur++);});
 await p.getByRole('button',{name:'Hint',exact:true}).tap();
 await p.getByLabel('Concept hint',{exact:true}).waitFor();
 assert.ok(await input.evaluate(el=>el===document.activeElement));
 assert.equal(await p.evaluate(()=>window.notebookBlur),0);
 const paper=await p.locator('.notebook-paper-scroll').boundingBox(), hint=await p.getByLabel('Concept hint',{exact:true}).boundingBox();
 assert.ok(hint.y>=paper.y+paper.height,'help never overlays working');
 await p.getByRole('button',{name:'Back to my working',exact:true}).tap();
 await input.press('2');await p.getByLabel('Multiply row 2',{exact:true}).waitFor();
 await input.pressSequentially('616181');await p.getByText('Great work!',{exact:true}).waitFor();
 await p.setViewportSize({width:360,height:800});
 await p.waitForFunction(()=>parseFloat(document.querySelector('.notebook').style.getPropertyValue('--notebook-height'))===800);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{await c.close();}
});
