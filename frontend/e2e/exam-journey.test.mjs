import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
const BASE=process.env.EXAM_E2E_URL??'http://127.0.0.1:4190';
test('mobile synthetic journey completes without network, hides clues, preserves exposure',async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 try{const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true});const page=await context.newPage();const errors=[],api=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
 await page.goto(`${BASE}/?experience=exam-diagnostic&mode=synthetic`);
 await page.getByRole('button',{name:'Start synthetic journey',exact:true}).click();
 for(let i=0;i<4;i++)await page.locator('fieldset button').first().click();
 await page.getByLabel('This is invented test text, not a real learner’s work.').check();
 await page.getByRole('button',{name:'Analyse invented writing'}).click();
 await page.getByRole('heading',{name:'Check possible writing gaps'}).waitFor();
 const firstPrompt=await page.locator('fieldset legend').innerText();
 assert.equal(await page.getByText('Suggested change:',{exact:false}).count(),0);
 assert.equal(await page.getByText('Expected answer:',{exact:false}).count(),0);
 for(const wrong of [1,0,0,1,0,0,0,0])await page.locator('fieldset button').nth(wrong).click();
 await page.getByRole('button',{name:'Choose targeted teaching'}).click();
 const lessons=page.getByRole('button',{name:'I have read this lesson',exact:true});while(await lessons.count())await lessons.first().click();
 await page.getByRole('button',{name:'Start fresh questions'}).click();
 for(let i=0;i<8;i++)await page.locator('fieldset button').first().click();
 await page.getByRole('button',{name:'Finish reassessment'}).click();
 await page.getByRole('heading',{name:'Evidence from this sitting'}).waitFor();
 await page.getByText('Review independent answers and explanations',{exact:true}).click();
 assert.equal(await page.getByText('Expected answer:',{exact:false}).count(),16);
 await page.getByLabel('Revised invented explanation').fill(Array(55).fill('invented').join(' '));
 await page.getByRole('button',{name:'Save unassessed revision'}).click();
 await page.getByText(/Revision saved for this sitting, not assessed/).waitFor();
 await page.getByRole('button',{name:'Teach and recheck reading gaps'}).click();
 while(await page.getByRole('button',{name:'Try a new reading question'}).count()){
  await page.getByRole('button',{name:'Try a new reading question'}).click();await page.locator('fieldset button').first().click();await page.getByRole('button',{name:'Continue reading follow-up'}).click();
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const keys=await page.evaluate(()=>Object.keys(localStorage));assert.deepEqual(keys,['openpath.exam-exposure@1']);
 await page.reload();await page.getByRole('button',{name:'Start synthetic journey',exact:true}).click();
 for(let i=0;i<4;i++)await page.locator('fieldset button').first().click();await page.getByLabel('This is invented test text, not a real learner’s work.').check();await page.getByRole('button',{name:'Analyse invented writing'}).click();
 await page.getByRole('heading',{name:'Check possible writing gaps'}).waitFor();assert.notEqual(await page.locator('fieldset legend').innerText(),firstPrompt);
 await page.reload();await page.getByRole('button',{name:'Start synthetic journey',exact:true}).click();for(let i=0;i<4;i++)await page.locator('fieldset button').first().click();await page.getByLabel('This is invented test text, not a real learner’s work.').check();await page.getByRole('button',{name:'Analyse invented writing'}).click();
 await page.getByText(/No eligible fresh check pair/).waitFor();assert.deepEqual(errors,[]);assert.deepEqual(api,[]);
 }finally{await browser.close();}
});
test('configured server uses exam context and fails closed without fallback',async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});try{
 const page=await browser.newPage();const calls=[];
 await page.route('**/api/evaluation/essays/status/**',r=>r.fulfill({json:{available:true,id:'mock',version:'1',model:'synthetic',rubric:'openpath.exam-writing@1',synthetic_only:true,protocols:{observe:'essay-observe.v2',rewrite:'essay-rewrite.v2'}}}));
 await page.route('**/api/evaluation/essays/',r=>{calls.push(r.request().postDataJSON());return r.fulfill({status:503,json:{detail:'unavailable'}});});
 await page.goto(`${BASE}/?experience=exam-diagnostic&mode=synthetic`);await page.getByLabel(/Use configured server evaluator/).check();await page.getByRole('button',{name:'Start synthetic journey',exact:true}).click();
 for(let i=0;i<4;i++)await page.locator('fieldset button').first().click();await page.getByLabel('This is invented test text, not a real learner’s work.').check();await page.getByRole('button',{name:'Analyse invented writing'}).click();
 await page.getByText(/Analysis unavailable or rejected/).waitFor();await page.getByRole('button',{name:'Teach and recheck reading gaps'}).click();await page.getByRole('heading',{name:'Reading follow-up'}).waitFor();
 assert.equal(calls.length,1);assert.equal(calls[0].data_use,'synthetic_test');assert.equal(calls[0].request.rubric,'openpath.exam-writing@1');assert.ok(calls[0].request.task_context.passage.length>100);assert.equal(calls[0].request.grade,0);assert.equal(await page.getByRole('heading',{name:'Check possible writing gaps'}).count(),0);
 }finally{await browser.close();}
});
