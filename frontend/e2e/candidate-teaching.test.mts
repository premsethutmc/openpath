import { probeReading } from '../../packages/learning/src/reasoning';
import { investigateContext, hypotheses } from '../../packages/learning/src/hypotheses';
import { teachingScopeFor } from '../../packages/learning/src/teaching-presentation';
import { phasePool, problemOf, exposureKey } from '../../packages/learning/src/families';
/** Existing Year UI + Django: teaching, same-skill fresh check and delayed check, with saved replay. Synthetic only. */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { latestReleases } from '../../packages/learning/src/curricula';
import { moduleFor, question } from '../../packages/learning/src/content';
import { questionForRequirement } from '../../packages/learning/src/intervention';
import { learnerState, make } from '../../packages/learning/src/session';
import { withDecisions } from '../../packages/learning/src/records';
const root=fileURLToPath(new URL('../dist-english/',import.meta.url)),port=4200;
const server=http.createServer((req,res)=>{
 if(req.url?.startsWith('/api/')) {const proxy=http.request(new URL(req.url,process.env.PATHWAY_API??'http://127.0.0.1:8200'),{method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode!,r.headers);r.pipe(res)});proxy.on('error',()=>res.writeHead(502).end());req.pipe(proxy);return;}
 try {const path=(req.url??'/').split('?')[0];if(!/^\/year\/(?:app\.(?:js|css)(?:\.map)?|index\.html)?$/.test(path)){res.writeHead(404).end();return;}const file=root+(path.endsWith('/')?path+'index.html':path),body=readFileSync(file);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);}catch{res.writeHead(404).end();}
});
await new Promise<void>(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),page=await browser.newPage();
const results:unknown[]=[];
async function call(path:string,body?:unknown){return page.evaluate(async({path,body})=>{const token=document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1]??'';const r=await fetch('/api'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRFToken':decodeURIComponent(token)},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json().catch(()=>null)};},{path,body});}
try {
 await page.goto(`http://127.0.0.1:${port}/year/`);
 // Wait for the CSRF cookie explicitly; the app's initial account request is asynchronous.
 assert.equal((await call('/account/')).status,200);
 assert.equal((await call('/account/register/',{email:`candidate-${Date.now()}@example.org`,password:'synthetic-candidate-browser-passphrase',consent:true})).status,201);
 const cases = [
  ['MATH.statistics.median-mode','fix_mean_for_median'],
  ['MATH.probability.classical','fix_colours_equally_likely'],
  ['MATH.number.fraction-models','fix_shaded_to_unshaded'],
  ['MATH.statistics.scaled-bars','fix_assume_tens'],
 ].filter(([competency]) => !process.env.CANDIDATE_COMPETENCY || competency === process.env.CANDIDATE_COMPETENCY);
 assert.ok(cases.length, 'the requested candidate must exist');
 for(const [competency,strategyId] of cases) {
  await page.clock.setSystemTime(new Date());
  const pupil=await call('/pupils/',{display_name:'Synthetic candidate teaching',consent:true});assert.equal(pupil.status,201);
  const id=pupil.data.id,m=moduleFor(competency)!,strategy=m.strategies.find(s=>s.id===strategyId)!,scope=teachingScopeFor(m,strategy),target=strategy.addresses!;
  let clock=Date.now()-60000;
  const ctx=()=>({learnerId:id,sessionId:`learn:${id}:seed`,at:new Date(++clock).toISOString()});
  const saved=async()=> (await call(`/pupils/${id}/events/?subject=mathematics`)).data;
  const append=async(event:unknown)=>{const d=await saved();const r=await call(`/pupils/${id}/events/`,{subject:'mathematics',seq:d.count,event});assert.equal(r.status,201,JSON.stringify(r));};
  await append(make.enrol(ctx(),12,'2026-27',latestReleases.find(r=>r.grade===12)!));
  await append(make.pathway(ctx(),competency));
  const shown=new Set([strategy.guided,...strategy.screens.map(s=>s.instance)].filter(Boolean).map(x=>exposureKey(x!)));
  const diagnostics=phasePool(strategy.scope!.family,'diagnostic').map(x=>x.replace(/:mc$/,''))
   .filter(x=>scope.accepts(problemOf(x)!)&&!shown.has(exposureKey(x))&&probeReading(x,target).discriminates).slice(0,2);
  assert.equal(diagnostics.length,2);
  for(const [i,q]of diagnostics.entries())await append(make.attempt(ctx(),q,probeReading(q,target).predicted[0],i?'diagnostic':'check',i?{context:investigateContext(diagnostics[0])}:{}));
  const open=()=>page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&skill=${competency}`);
  await open();await page.locator('[data-content-review="pending_review"]').waitFor();
  assert.ok((await page.locator('.lesson').innerText()).includes(strategy.title));
  const text=[];
  for(let i=0;i<strategy.screens.length;i++){
   text.push(await page.locator('.lesson').innerText());
   await page.getByRole('button',{name:i===strategy.screens.length-1?'Try it':'Next',exact:true}).click();
  }
  const frame=page.locator('[data-qid]');await frame.waitFor();const fresh=(await frame.getAttribute('data-qid'))!;
  assert.ok(scope.accepts(problemOf(fresh)!));assert.ok(![...shown,...diagnostics.map(exposureKey)].includes(exposureKey(fresh)));
  const q=question(fresh);if(q.type==='choice')await page.getByRole('radio').nth('ABCD'.indexOf(q.answer)).click();else await page.getByLabel('Your answer',{exact:true}).fill(q.answer);
  await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByText('Right.',{exact:true}).waitFor();
  const data=await saved(),events=withDecisions(data.events,data.decisions),state=learnerState(id,events,Date.now());
  assert.ok(data.events.some((e:any)=>e.kind==='teaching'&&e.strategy===strategyId)||state.records.teaching.some(t=>t.strategy===strategyId));
  assert.equal(hypotheses(state.selectionRecords).find(h=>h.claim?.explanation===target)?.status,'resolved');
  await page.reload();const after=await saved();assert.deepEqual(after.events,data.events);assert.deepEqual(after.decisions,data.decisions);
  // A separate later visit supplies independent answers; synthetic clock changes no stored event.
  const realNow=Date.now(),day=86400000;
  writeFileSync('/tmp/candidate-clock.json',JSON.stringify({[id]:1}));
  await page.clock.setSystemTime(new Date(realNow+day));clock=realNow+day;
  for(let i=0;i<12;i++){
   const d=await saved(),st=learnerState(id,withDecisions(d.events,d.decisions),clock);
   const qid=questionForRequirement(m,'check',st.records,q=>{const p=problemOf(q);return !!p&&scope.accepts(p)},'readiness');
   assert.ok(qid);await append(make.attempt(ctx(),qid,question(qid).answer,'check'));
  }
  writeFileSync('/tmp/candidate-clock.json',JSON.stringify({[id]:9}));
  await page.clock.setSystemTime(new Date(realNow+9*day));
  const delayedData=await saved(),delayedState=learnerState(id,withDecisions(delayedData.events,delayedData.decisions),realNow+9*day),next=delayedState.module(competency);
  let retention:unknown={demonstrated:false,reason:'No scoped delayed question selected by the existing runtime',phase:next.phase,question:next.question};
  const delayed=next.question&&problemOf(next.question);
  if(next.phase==='retention'&&delayed&&scope.accepts(delayed)){
   await open();await page.locator('[data-qid]').waitFor();assert.equal(await page.locator('[data-qid]').getAttribute('data-qid'),next.question);
   const dq=question(next.question!);if(dq.type==='choice')await page.getByRole('radio').nth('ABCD'.indexOf(dq.answer)).click();else await page.getByLabel('Your answer',{exact:true}).fill(dq.answer);
   await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByText('Right.',{exact:true}).waitFor();
   const beforeReload=await saved();await page.reload();const restored=await saved();assert.deepEqual(restored.events,beforeReload.events);assert.deepEqual(restored.decisions,beforeReload.decisions);
   retention={demonstrated:true,question:next.question,family:delayed.family,parameterScopeMatched:true,reloaded:true,claim:'One delayed answer in this declared scope; not mastery of every family form'};
  }
  results.push({competency,strategy:strategyId,diagnostics,renderedScreens:text.length,fresh,savedEvents:data.count,reloaded:true,educatorApproved:false,retention});
 }
 writeFileSync(process.env.CANDIDATE_RESULTS ?? '../docs/math-teaching-candidate-journeys/browser-results.json',JSON.stringify({passed:true,results},null,2)+'\n');
 console.log(JSON.stringify({passed:true,results}));
} catch(e){console.error(await page.locator('body').innerText());throw e;}finally{await browser.close();server.close();}
