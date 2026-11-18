import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const url=`${process.env.READING_E2E_URL??'http://127.0.0.1:4190'}/?experience=english-workspace&no-sw`;
test('phone reading bridge saves drafts, separates supported/fresh writing, handles return and bank exhaustion',async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[],api=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
 await page.goto(url);await page.getByRole('button',{name:'Practise reading into your own writing'}).click();
 await page.getByRole('button',{name:'Study a different worked example'}).click();assert.ok(await page.getByText('Model summary of this example only:').isVisible());
 await page.locator('#reading-summary').fill('The bus trial needs more evidence.');
 await page.reload();await page.getByRole('button',{name:'Practise reading into your own writing'}).click();assert.equal(await page.locator('#reading-summary').inputValue(),'The bus trial needs more evidence.');
 assert.ok(await page.getByRole('button',{name:'Save attempt and review'}).isDisabled());
 await page.locator('input[type=radio]').nth(1).check();await page.locator('#reading-response').fill('Test another Friday after the festival because attendance may fall.');await page.getByRole('button',{name:'Save attempt and review'}).click();
 await page.locator('#reading-revision').fill('Keep a cost record during the next trial.');
 await page.getByRole('button',{name:'Start the fresh passage'}).click();assert.equal(await page.locator('#reading-summary').inputValue(),'');assert.equal(await page.getByRole('button',{name:'Study a different worked example'}).count(),0);assert.equal(await page.getByText('Evidence limit:',{exact:false}).count(),0);
 await page.locator('#reading-summary').fill('Check the refill station without the discount.');await page.getByRole('button',{name:'Back to workspace choices'}).click();await page.getByRole('button',{name:'Practise reading into your own writing'}).click();assert.equal(await page.locator('#reading-summary').inputValue(),'Check the refill station without the discount.');
 await page.locator('input[type=radio]').nth(2).check();await page.locator('#reading-response').fill('Keep the trial running and measure cleaning costs before committing.');await page.getByRole('button',{name:'Save attempt and review'}).click();assert.ok(await page.getByText('Fresh check completed.',{exact:false}).isVisible());assert.equal(await page.getByRole('button',{name:'Start the fresh passage'}).count(),0);
 await page.reload();await page.getByRole('button',{name:'Practise reading into your own writing'}).click();assert.ok(await page.locator('#reading-summary').isDisabled());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);assert.deepEqual(api,[]);
 await page.getByRole('button',{name:'Back to workspace choices'}).click();await page.locator('select').first().selectOption('grade7');await page.getByRole('button',{name:'Practise reading into your own writing'}).click();await page.locator('#reading-summary').fill('Another summary');await page.locator('#reading-response').fill('Another own response');await page.locator('input[type=radio]').first().check();await page.getByRole('button',{name:'Save attempt and review'}).click();assert.equal(await page.getByRole('button',{name:'Start the fresh passage'}).count(),0);assert.ok(await page.getByText('This check passage has already been opened',{exact:false}).isVisible());
 }finally{await browser.close();}
});
test('storage failure is visible and does not discard practice to begin a fresh check',async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});try{const page=await browser.newPage();await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('blocked');};});await page.goto(url);await page.getByRole('button',{name:'Practise reading into your own writing'}).click();await page.getByRole('alert').waitFor();await page.locator('#reading-summary').fill('A summary');await page.locator('#reading-response').fill('A reason');await page.locator('input[type=radio]').nth(0).check();await page.getByRole('button',{name:'Save attempt and review'}).click();await page.getByRole('button',{name:'Start the fresh passage'}).click();assert.equal(await page.locator('#reading-summary').inputValue(),'A summary');assert.ok(await page.getByRole('heading',{name:'Supported practice'}).isVisible());}finally{await browser.close();}
});
