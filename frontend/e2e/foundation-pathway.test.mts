/** Real year UI + real Django API on an isolated local database. Run with --import tsx. */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { latestReleases } from '../../packages/learning/src/curricula';
import { graph } from '../../packages/learning/src/graph';
import { question } from '../../packages/learning/src/content';
import { learnerState } from '../../packages/learning/src/session';
import { withDecisions } from '../../packages/learning/src/records';
const root=fileURLToPath(new URL('../dist-english/',import.meta.url));
const target=process.env.PATHWAY_TARGET??'MATH.number.addition-regroup';
const port=4197, api=process.env.PATHWAY_API??'http://127.0.0.1:8197';
const server=http.createServer((req,res)=>{
 if(req.url?.startsWith('/api/')){const proxy=http.request(new URL(req.url,api),{method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode!,r.headers);r.pipe(res)});proxy.on('error',()=>res.writeHead(502).end());req.pipe(proxy);return;}
 try{const path=(req.url??'/').split('?')[0];if(!/^\/year\/(?:app\.(?:js|css)(?:\.map)?|index\.html)?$/.test(path)){res.writeHead(404).end();return;}
 const file=root+(path.endsWith('/')?path+'index.html':path);const body=readFileSync(file);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);}catch{res.writeHead(404).end();}
});
await new Promise<void>(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
async function call(path:string,body?:unknown){return page.evaluate(async({path,body})=>{const token=document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1]??'';const r=await fetch('/api'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRFToken':decodeURIComponent(token)},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json().catch(()=>null)};},{path,body});}
try{
 await page.goto(`http://127.0.0.1:${port}/year/`);await page.getByRole('heading',{name:'Sign in to OpenPath'}).waitFor();
 const email=`foundation-${Date.now()}@example.org`,password='synthetic-foundation-browser-passphrase';
 assert.equal((await call('/account/register/',{email,password,consent:true})).status,201);
 const pupil=await call('/pupils/',{display_name:'Synthetic foundation journey',consent:true});assert.equal(pupil.status,201);
 const id=pupil.data.id,r=latestReleases.find(r=>r.grade===1)!;
 const enrol={kind:'learning_record',id:`enrol-${Date.now()}`,at:new Date().toISOString(),learnerId:id,sessionId:`learn:${id}:setup`,record:'enrol',grade:1,academicYear:'2026-27',curriculum:{id:r.id,version:r.version,hash:r.hash}};
 assert.equal((await call(`/pupils/${id}/events/`,{subject:'mathematics',seq:0,event:enrol})).status,201);
 await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&foundation=1`);
 await page.getByLabel('Target topic',{exact:true}).selectOption(target);await page.getByRole('button',{name:'Use this learning goal'}).click();
 await page.getByText('Current goal:',{exact:false}).waitFor();
 const visited=new Set<string>();let attempted=0;
 for(let step=0;step<90;step++){
  const data=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
  const state=learnerState(id,withDecisions(data.events,data.decisions??{}),Date.now());
  if(state.next?.kind==='none'){assert.match(state.next.reason,/requirements.*shown/);break;}
  assert.ok(state.next?.competency);visited.add(state.next.competency);
  const next=page.locator('.next').filter({has:page.locator('.eyebrow',{hasText:/^Next$/})});
  await next.getByRole('button').first().click();
  const qcard=page.locator('[data-qid]');
  if(await qcard.count()){
   const qid=await qcard.getAttribute('data-qid'),q=question(qid!);
   if(q.type==='choice')await page.getByRole('radio').nth('ABCD'.indexOf(q.answer)).click();else await page.getByLabel('Your answer',{exact:true}).fill(q.answer);
   const before=data.events.filter((e:any)=>e.record==='attempt').length;
   if(attempted===0){
    await page.route('**/api/pupils/*/events/',route=>route.request().method()==='POST'?route.abort():route.continue(),{times:1});
    await page.getByRole('button',{name:'Check',exact:true}).click();
    await page.getByText(/Not saved:/).waitFor();
    if(q.type!=='choice')assert.equal(await page.getByLabel('Your answer',{exact:true}).inputValue(),q.answer);
   }
   await page.getByRole('button',{name:'Check',exact:true}).dblclick();await page.getByText('Right.',{exact:true}).waitFor();
   const after=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
   assert.equal(after.events.filter((e:any)=>e.record==='attempt').length,before+1);attempted++;
  }else{
   let taught=false;
   for(let i=0;i<20;i++){
    if(await page.getByRole('button',{name:'Try it',exact:true}).count()){await page.getByRole('button',{name:'Try it',exact:true}).click();taught=true;break;}
    const b=page.getByRole('button',{name:'Next',exact:true});if(!await b.count())break;await b.click();
   }
   assert.ok(taught,await page.locator('body').innerText());
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.getByRole('button',{name:'← Back',exact:true}).click();
  if(attempted===3) {await page.reload();await page.getByText('Current goal:',{exact:false}).waitFor();}
  assert.ok(step<89,'bounded journey must finish');
 }
 assert.ok(visited.has('MATH.number.addition'));assert.ok(visited.has('MATH.number.subtraction'));assert.ok(visited.has('MATH.number.zero'));assert.ok(visited.has(target));assert.ok(graph.get(target).gradeRange[0]>1);
 const saved=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
 const expected=learnerState(id,withDecisions(saved.events,saved.decisions??{}),Date.now()).next;
 assert.deepEqual(learnerState(id,withDecisions([...saved.events].reverse(),saved.decisions??{}),Date.now()).next,expected);
 await call('/account/logout/',{});assert.equal((await call('/account/login/',{email,password})).status,200);
 await page.reload();await page.getByText('Current goal:',{exact:false}).waitFor();
 const restored=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;assert.equal(restored.count,saved.count);
 assert.deepEqual(learnerState(id,withDecisions(restored.events,restored.decisions??{}),Date.now()).next,expected);
 mkdirSync('/tmp/pathway-browser-shots',{recursive:true});await page.screenshot({path:'/tmp/pathway-browser-shots/completed.png',fullPage:true});
 // Explicitly opening a geometry problem is allowed; its unknown method must never look wrong.
 await page.getByLabel('Target topic',{exact:true}).selectOption('MATH.geometry.triangle-properties');
 await Promise.all([page.waitForResponse(r=>r.url().includes('/events/')&&r.request().method()==='POST'),page.getByRole('button',{name:'Use this learning goal'}).click()]);
 await page.getByText('Current goal:',{exact:false}).waitFor();
 await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&skill=MATH.geometry.triangle-properties`);
 const geometry=page.locator('[data-qid]');await geometry.waitFor();const g=question((await geometry.getAttribute('data-qid'))!);
 if(g.type==='choice')await page.getByRole('radio').nth('ABCD'.indexOf(g.answer)).click();else await page.getByLabel('Your answer',{exact:true}).fill(g.answer);
 await page.getByText('Show your working (optional)',{exact:true}).click();
 const work='Use the triangle angle sum; subtract the two given angles.';
 await page.getByLabel('Your working',{exact:true}).fill(work);
 await page.getByRole('button',{name:'Check',exact:true}).click();
 const note=page.getByRole('note',{name:'Your working',exact:true});await note.waitFor();
 assert.ok(!(await note.getAttribute('class'))?.includes('bad'));
 assert.match(await note.innerText(),/not been marked right or wrong/);
 const final=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
 const attempt=withDecisions(final.events,final.decisions??{}).filter((e:any)=>e.record==='attempt').at(-1) as any;
 assert.deepEqual(attempt.working,[work]);assert.equal(attempt.decision.working.status,'unsupported');
 await page.screenshot({path:'/tmp/pathway-browser-shots/geometry-working.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,topics:[...visited],attempted,events:saved.count,phone:'390x844',freshLogin:true,geometryWorking:attempt.decision.working.status,gradingPolicy:attempt.decision.policy}));
}finally{await context.close();await browser.close();server.close();}
