import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {test} from 'node:test';
import {chromium} from 'playwright';
const BASE=process.env.EXAM_E2E_URL??'http://127.0.0.1:4190';
const inventory=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {argumentConceptInventory} from './src/english/logic/essay-live/argument-concept-content.ts'; console.log(JSON.stringify(argumentConceptInventory()));"],{encoding:'utf8',maxBuffer:2*1024*1024}));
const byId=new Map(inventory.map(row=>[row.item.id,row.item]));
const text='A community should improve its shared public spaces because residents use them throughout the year. A safe place to meet can help neighbours learn from one another. However, the council should ask who currently cannot use those spaces and what changes would help. Visitor attractions may also provide income, so a limited trial and public discussion would be useful before choosing a large permanent investment.';
async function setup(page){await page.goto(`${BASE}/?experience=english-workspace`);await page.getByLabel('What are you working towards?').selectOption('cat');await page.getByLabel('Choose a starting challenge').selectOption('foundation');await page.getByRole('button',{name:'Open my English workspace'}).click();await page.getByRole('navigation',{name:'Essay journey'}).waitFor();}
async function answer(page,correct){const node=page.locator('[data-argument-concept-plan] .item[data-item]');await node.waitFor();const id=await node.getAttribute('data-item'),item=byId.get(id);assert.ok(item,id);
 if(item.format.startsWith('choice:'))await node.getByRole('radio').nth(correct?item.answer:(item.answer+1)%item.options.length).click();
 else {const order=[...item.answer_order];if(!correct)[order[0],order[1]]=[order[1],order[0]];for(const i of order)await node.locator('.options button').nth(i).click();}
 await node.getByRole('button',{name:'Check',exact:true}).click();await node.waitFor({state:'detached'});
}
test('offline chosen concept adapts to answers, resumes support and keeps own writing distinct',async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 try{const page=await browser.newPage({viewport:{width:390,height:844}}),api=[],errors=[];
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  await setup(page);await page.getByLabel('Essay',{exact:true}).fill(text);await page.getByLabel('This is invented test writing, not real learner work.').check();await page.getByRole('button',{name:'Analyse this essay',exact:true}).click();await page.getByRole('heading',{name:'What your essay shows'}).waitFor();await page.getByRole('button',{name:'Articulate both sides',exact:true}).click();
  await page.getByText('Choose concept practice without a diagnosis',{exact:true}).click();await page.getByRole('button',{name:'Explore: Recognising relevant reasons and supporting details',exact:true}).click();
  for(let i=0;i<2;i++){await page.getByRole('button',{name:'Open next concept probe',exact:true}).click();await answer(page,false);if(i===0)assert.equal(await page.getByText('Review completed concept probes',{exact:true}).count(),0);}
  await page.locator('[data-concept-phase="lesson"]').waitFor();assert.equal(await page.getByText('Review completed concept probes',{exact:true}).count(),1);
  await setup(page);await page.getByRole('button',{name:'Articulate both sides',exact:true}).click();const plan=page.locator('[data-concept-phase="lesson"]');await plan.waitFor();assert.match(await plan.textContent(),/not diagnosed from your writing/);
  await plan.getByRole('button').first().click();await plan.getByRole('button',{name:'Record supported lesson and continue',exact:true}).click();
  for(let i=0;i<2;i++){await page.getByRole('button',{name:'Open supported concept practice',exact:true}).click();await answer(page,true);}
  const next=page.getByRole('button',{name:'Plan the next fresh concept check',exact:true});await next.waitFor();await next.click();await page.locator('[data-concept-phase="waiting"], [data-concept-phase="check"], [data-concept-phase="blocked"]').waitFor();
  await mkdir('../docs/product/essay-learning/screenshots/',{recursive:true});await page.screenshot({path:'../docs/product/essay-learning/screenshots/argument-concept-plan-phone.png',fullPage:true});
  assert.equal(await page.getByLabel('Your own initial writing').inputValue(),'');assert.ok(await page.getByText('No argument evaluator connected.',{exact:false}).count()>0);assert.deepEqual(api,[]);assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{await browser.close();}
});
