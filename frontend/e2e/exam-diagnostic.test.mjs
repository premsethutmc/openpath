/** Run with EXAM_E2E_URL and EXAM_PILOT_E2E_URL pointing to normal/pilot English builds. */
import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {chromium} from 'playwright';
const BASE=process.env.EXAM_E2E_URL??'http://127.0.0.1:4190';
const PILOT=process.env.EXAM_PILOT_E2E_URL??'http://127.0.0.1:4191';
let browser;
before(async()=>{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});});
after(()=>browser?.close());
async function open(t,url=BASE){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
 t.after(()=>context.close());
 const page=await context.newPage(); const errors=[],outside=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/')||(!['127.0.0.1','localhost'].includes(u.hostname)&&!['blob:','data:'].includes(u.protocol)))outside.push(r.url());});
 await page.goto(`${url}/?experience=exam-diagnostic`);
 return {page,context,errors,outside};
}
async function read(page){
 for(const choice of [1,0,2,3]) await page.locator('fieldset button').nth(choice).click();
 await page.getByRole('heading',{name:'Explain your reasoning'}).waitFor();
}
const sample=Array(55).fill('evidence').join(' ');
test('reading, writing, lesson, revision and reload stay local and bounded',async t=>{
 const {page,errors,outside}=await open(t);
 await read(page);
 assert.equal(await page.getByText('Possible gap to check',{exact:true}).count(),0);
 await page.getByLabel(/Your written explanation/).fill(sample);
 await page.getByRole('button',{name:'Save explanation and see reading feedback',exact:true}).click();
 await page.getByRole('heading',{name:'Your initial evidence'}).waitFor();
 assert.match(await page.locator('main').innerText(),/Saved, not assessed/);
 await page.getByRole('button',{name:'main_argument: lesson and practice',exact:true}).click();
 await page.locator('fieldset button').nth(1).click();
 await page.getByText('That matches this example.',{exact:true}).waitFor();
 await page.getByLabel(/Optional revision/).fill('Counts alone do not establish that readers received useful help.');
 await page.getByRole('button',{name:'Save revision',exact:true}).click();
 await page.reload();
 assert.equal(await page.getByLabel(/Optional revision/).inputValue(),'Counts alone do not establish that readers received useful help.');
 assert.match(await page.locator('main').innerText(),/predicted scores remain unknown/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(await page.evaluate(async()=>navigator.serviceWorker?(await navigator.serviceWorker.getRegistrations()).length:0),0);
 assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
});
test('skip confirmation and clear cancellation preserve writing',async t=>{
 const {page}=await open(t);await read(page);
 await page.getByLabel(/Your written explanation/).fill('Do not silently discard this draft.');
 await page.getByRole('button',{name:'Skip writing and see reading feedback'}).click();
 await page.getByRole('button',{name:'Keep writing',exact:true}).click();
 assert.equal(await page.getByLabel(/Your written explanation/).inputValue(),'Do not silently discard this draft.');
 await page.getByRole('button',{name:'Clear only this preview'}).click();
 await page.getByRole('button',{name:'Keep my work'}).click();
 assert.equal(await page.getByLabel(/Your written explanation/).inputValue(),'Do not silently discard this draft.');
 await page.getByRole('button',{name:'Skip writing and see reading feedback'}).click();
 await page.getByRole('button',{name:'Discard writing and skip'}).click();
 await page.getByText('No writing was submitted. Writing ability is unassessed.',{exact:true}).waitFor();
 await page.reload();await page.getByRole('heading',{name:'Your initial evidence'}).waitFor();
});
test('pilot build refuses diagnostic route',async t=>{
 const {page}=await open(t,PILOT);
 await page.locator('[data-pilot-refused="exam-diagnostic"]').waitFor();
 assert.equal(await page.locator('[data-exam-diagnostic]').count(),0);
 assert.match(await page.locator('body').innerText(),/not available|not included|pilot/i);
 assert.equal(await page.locator('textarea,fieldset').count(),0);
});
