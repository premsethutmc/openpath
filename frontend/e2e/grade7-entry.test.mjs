/** Real account, curriculum selection and learning screens against Django; synthetic pupils, no API mocks. */
import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.YEAR_URL??'http://127.0.0.1:4299';
const shots=process.env.SHOTS??'/tmp/grade7-entry-screens';mkdirSync(shots,{recursive:true});
const dataDir=new URL('../dist-english/curriculum/data/',import.meta.url);
const index=JSON.parse(readFileSync(new URL('index.json',dataDir),'utf8'));
const release=board=>JSON.parse(readFileSync(new URL(index.releases.find(r=>r.board===board&&r.grade===7).file,dataDir),'utf8'));
let browser;before(async()=>{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH===''?undefined:process.env.CHROMIUM_PATH??'/usr/bin/chromium'});});after(()=>browser?.close());
async function api(page,path,body){return page.evaluate(async({path,body})=>{const csrf=decodeURIComponent(document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1]??'');const r=await fetch('/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-CSRFToken':csrf},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json()};},{path,body});}
async function clean(page){assert.equal(await page.locator('canvas,.writing-tools,.sketchpad').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');}
async function shot(page,name){await clean(page);await page.screenshot({path:`${shots}/${name}.png`,fullPage:true});}
for(const width of [360,393])test(`${width}px: dashboard → CBSE Grade 7 → learning; change to Tamil Nadu in the same year and resume`,async()=>{
 const context=await browser.newContext({viewport:{width,height:820},isMobile:true,hasTouch:true});const page=await context.newPage();page.setDefaultTimeout(60000);
 try{
 await page.goto(base+'/year/');await page.getByRole('heading',{name:'Sign in to OpenPath'}).waitFor();await api(page,'/account/');assert.equal((await api(page,'/account/register/',{email:`grade7-${Date.now()}-${width}@example.org`,password:'synthetic-grade7-testing-password',consent:true})).status,201);const pupil=await api(page,'/pupils/',{display_name:'Synthetic Grade 7 learner',consent:true});assert.equal(pupil.status,201);const L=pupil.data.id;await page.reload();await page.getByRole('heading',{name:'Set up My Learning Year'}).waitFor();await page.getByRole('button',{name:/^Grade 7\b/}).click();
 for(const board of ['cbse','tn']){
 const r=release(board);
 if(board==='tn'){
  await page.getByRole('link',{name:'OpenPath',exact:true}).click();await page.getByRole('button',{name:'Change board or curriculum',exact:true}).click();await page.getByRole('heading',{name:'Choose your curriculum'}).waitFor();assert.equal(await page.getByRole('button',{name:/^Grade 7\b/}).getAttribute('aria-pressed'),'true');
 }
 await page.getByRole('radio',{name:board==='cbse'?'CBSE':'Tamil Nadu State Board',exact:true}).click();await page.getByRole('button',{name:new RegExp(r.release.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();await page.getByRole('button',{name:board==='cbse'?'Start Grade 7':'Use this curriculum',exact:true}).click();await page.getByRole('heading',{name:/^Grade 7 ·/}).waitFor();assert.ok(!new URL(page.url()).searchParams.has('curriculum'));await shot(page,`${width}-${board}-dashboard`);
 const historyBefore=(await api(page,`/pupils/${L}/events/?subject=mathematics`)).data.events;
 await page.getByRole('link',{name:'Open Mathematics topics',exact:true}).click();await page.getByRole('heading',{name:'Grade 7 Mathematics',exact:true}).waitFor();await page.getByText(/Loading .*evidence/).waitFor({state:'detached'});await page.locator('.summary .meter-sub').first().waitFor();assert.match(await page.locator('.learner-curriculum').innerText(),new RegExp(board==='cbse'?'CBSE':'Tamil Nadu'));
 assert.deepEqual(await page.locator('.tiles > li .tile-title').allTextContents(),r.nodes.slice(0,24).map(n=>n.title));await shot(page,`${width}-${board}-topics`);
 const scope=n=>n.competency?[n.competency]:n.children.flatMap(scope);const topic=r.nodes.find(n=>scope(n).some(c=>r.competencies[c]?.module));assert.ok(topic,'an existing topic has a module');await page.locator('.tiles > li').filter({has:page.locator('.tile-title',{hasText:topic.title})}).getByRole('button').first().click();await page.getByRole('link',{name:'Start learning',exact:true}).waitFor();assert.match(await page.locator('.topic-plan').innerText(),/Content review: (Not in the review registry|Not yet submitted for educator review)/);assert.equal(await page.locator('.tile.m-verified').count(),0);await shot(page,`${width}-${board}-topic-entry`);
 const href=await page.getByRole('link',{name:'Start learning',exact:true}).getAttribute('href');const skill=new URL(href,base).searchParams.get('skill');assert.ok(Object.values(r.competencies).some(c=>c.evidenceTarget===skill&&c.module));await page.getByRole('link',{name:'Start learning',exact:true}).click();await page.getByRole('list',{name:'Steps of this skill'}).waitFor();await page.getByRole('textbox',{name:'Your answer',exact:true}).waitFor();await shot(page,`${width}-${board}-learning`);
 const response=page.waitForResponse(res=>res.url().includes(`/pupils/${L}/events/`)&&res.request().method()==='POST');await page.getByRole('textbox',{name:'Your answer',exact:true}).fill('0');await page.getByRole('button',{name:'Check',exact:true}).click();assert.equal((await response).status(),201);
 await page.reload();await page.getByRole('list',{name:'Steps of this skill'}).waitFor();const historyAfter=(await api(page,`/pupils/${L}/events/?subject=mathematics`)).data.events;assert.deepEqual(historyAfter.slice(0,historyBefore.length),historyBefore,'historical evidence unchanged');assert.ok(historyAfter.length>historyBefore.length,'answer persisted');
 await page.goto(`${base}/year/?learner=${L}`);await page.getByRole('link',{name:'Open Mathematics topics'}).click();await page.getByRole('heading',{name:'Grade 7 Mathematics',exact:true}).waitFor();
 }
 const evs=(await api(page,`/pupils/${L}/events/?subject=mathematics`)).data.events;const enrols=evs.filter(e=>e.kind==='learning_record'&&e.record==='enrol');assert.equal(enrols.length,2);assert.equal(enrols[0].academicYear,enrols[1].academicYear);
 assert.ok(evs.length>=4);await clean(page);
 }finally{await context.close();}
});
