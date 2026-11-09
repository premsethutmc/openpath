import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.MATH_JOURNEY_URL ?? 'http://127.0.0.1:4182';
async function call(page, path, body) {
  return page.evaluate(async ({path,body}) => {
    const token=decodeURIComponent(document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1]??'');
    const r=await fetch('/api'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRFToken':token},...(body?{body:JSON.stringify(body)}:{})});
    return {status:r.status,data:await r.json()};
  },{path,body});
}
const saved = page => page.getByRole('status').filter({hasText:'Saved to OpenPath account'}).waitFor();
const finish = async page => {await page.getByRole('button',{name:'Finish activity and save place',exact:true}).click();await saved(page)};
const answer = async(page,id,value) => {const f=page.locator(`form[data-question="${id}"]`);await f.getByRole('textbox').fill(value);await f.getByRole('button',{name:'Check',exact:true}).click();await saved(page)};
for (const width of [360, 900]) test(`tally account teaching, practice, saved resume and isolation at ${width}px`,async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  let context=await browser.newContext({viewport:{width,height:850}});
  let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try {
    await page.goto(base+'/foundation.html?program=tally-g3-draft');
    await page.getByRole('heading',{name:'Use your OpenPath account'}).waitFor();
    await call(page,'/account/');
    assert.equal((await call(page,'/account/register/',{email:`tally-${width}-${Date.now()}@example.org`,password:'synthetic-test-passphrase-2026',consent:true})).status,201);
    const pupil=await call(page,'/pupils/',{display_name:'Synthetic tally learner',consent:true});assert.equal(pupil.status,201);
    const learner=pupil.data.id;
    await page.reload();await page.getByRole('heading',{name:'Meet the idea'}).waitFor();
    await page.getByText('Draft lesson · educator review pending.',{exact:false}).waitFor();
    assert.equal(await page.locator('#current-activity svg line').count(),5);
    await finish(page);
    for(let i=0;i<5;i++){await page.getByRole('button',{name:'Add one mark',exact:true}).click();await saved(page)}
    assert.equal(await page.locator('#current-activity svg line').count(),5);
    await page.getByRole('button',{name:'Undo one mark',exact:true}).click();await saved(page);
    assert.equal(await page.locator('#current-activity svg line').count(),4);
    // A fresh browser context restores only account cookies, never prior page/local storage.
    const state=await context.storageState();await context.close();
    context=await browser.newContext({viewport:{width,height:850},storageState:{cookies:state.cookies,origins:[]}});
    page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(`${base}/foundation.html?program=tally-g3-draft&learner=${learner}`);
    await page.getByRole('heading',{name:'Try it with your hands'}).waitFor();
    assert.equal(await page.locator('#current-activity svg line').count(),4);
    await finish(page);await page.getByRole('heading',{name:'Watch an example'}).waitFor();
    assert.equal(await page.locator('#current-activity svg line').count(),21);
    await finish(page);
    await answer(page,'guided','7');await page.getByRole('status').filter({hasText:'The diagonal is the fifth mark.'}).waitFor();
    await answer(page,'guided','6');await finish(page);
    await answer(page,'independent-a','14');await answer(page,'independent-b','0');await finish(page);
    await answer(page,'application','5');await finish(page);
    await answer(page,'transfer','0');await finish(page);
    await page.getByRole('heading',{name:'Remember tomorrow'}).waitFor();
    await page.getByRole('status').filter({hasText:'7 finished activities remain complete'}).waitFor();
    await page.reload();await page.getByRole('heading',{name:'Remember tomorrow'}).waitFor();
    const records=await call(page,`/pupils/${learner}/events/?subject=mathematics`);
    const own=records.data.events.filter(e=>e.programId==='tally-g3-draft');
    assert.equal(own.filter(e=>e.action==='complete').length,7);assert.equal(own.filter(e=>e.action==='answer').length,6);
    assert.ok(own.some(e=>e.retentionDueAt));assert.ok(own.every(e=>e.savedAt));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
    await mkdir('/tmp/tally-browser-evidence',{recursive:true});await page.screenshot({path:`/tmp/tally-browser-evidence/tally-${width}.png`,fullPage:true});
    const other=await call(page,'/pupils/',{display_name:'Separate learner',consent:true});assert.equal(other.status,201);
    await page.goto(`${base}/foundation.html?program=tally-g3-draft&learner=${other.data.id}`);
    await page.getByRole('heading',{name:'Meet the idea'}).waitFor();
    assert.equal((await call(page,`/pupils/${other.data.id}/events/?subject=mathematics`)).data.events.length,0);
    assert.deepEqual(errors,[]);
  } finally {await browser.close()}
});
