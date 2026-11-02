/** Existing Year UI + Django: teaching, same-skill fresh check and delayed check, with saved replay. Synthetic only. */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { latestReleases } from '../../packages/learning/src/curricula';
import { moduleFor, question } from '../../packages/learning/src/content';
import { connectionConfig, connectedSkill, strategyConnects } from '../../packages/learning/src/skill-connections';
import { teachable, questionForRequirement } from '../../packages/learning/src/intervention';
import { learnerState, make } from '../../packages/learning/src/session';
import { withDecisions } from '../../packages/learning/src/records';
import { graph } from '../../packages/learning/src/graph';
const root=fileURLToPath(new URL('../dist-english/',import.meta.url)),port=4198;
const server=http.createServer((req,res)=>{
 if(req.url?.startsWith('/api/')) {const proxy=http.request(new URL(req.url,process.env.PATHWAY_API??'http://127.0.0.1:8197'),{method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode!,r.headers);r.pipe(res)});proxy.on('error',()=>res.writeHead(502).end());req.pipe(proxy);return;}
 try {const path=(req.url??'/').split('?')[0];if(!/^\/year\/(?:app\.(?:js|css)(?:\.map)?|index\.html)?$/.test(path)){res.writeHead(404).end();return;}const file=root+(path.endsWith('/')?path+'index.html':path),body=readFileSync(file);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);}catch{res.writeHead(404).end();}
});
await new Promise<void>(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),page=await browser.newPage();
const results:unknown[]=[];
async function call(path:string,body?:unknown){return page.evaluate(async({path,body})=>{const token=document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1]??'';const r=await fetch('/api'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRFToken':decodeURIComponent(token)},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json().catch(()=>null)};},{path,body});}
try {
 await page.goto(`http://127.0.0.1:${port}/year/`);
 const email=`connection-${Date.now()}@example.org`,password='synthetic-connections-browser-passphrase';
 assert.equal((await call('/account/register/',{email,password,consent:true})).status,201);
 for(const competency of ['MATH.number.addition','MATH.geometry.triangle-properties']) {
  await page.clock.setSystemTime(new Date());
  let offset=0;
  const now=()=>Date.now()+offset;
  const pupil=await call('/pupils/',{display_name:'Synthetic skill connection',consent:true});assert.equal(pupil.status,201);
  const id=pupil.data.id,m=moduleFor(competency)!,config=connectionConfig(competency)!;
  const strategy=m.strategies.find(s=>teachable(m,s,[])&&strategyConnects(config,connectedSkill(config,s.guided)!,s))!,skill=connectedSkill(config,strategy.guided)!;
  let clock=Date.now()-10*86400000;
  const ctx=()=>({learnerId:id,sessionId:`learn:${id}:seed`,at:new Date(++clock).toISOString()});
  const saved=async()=> (await call(`/pupils/${id}/events/?subject=mathematics`)).data;
  const append=async(event:unknown)=>{const data=await saved();const r=await call(`/pupils/${id}/events/`,{subject:'mathematics',seq:data.count,event});assert.equal(r.status,201,JSON.stringify(r));};
  await append(make.enrol(ctx(),7,'2026-27',latestReleases.find(r=>r.grade===7)!));
  await append(make.pathway(ctx(),competency));
  await append(make.teach(ctx(),competency,strategy.id,'conceptual'));
  const open=()=>page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&skill=${competency}`);
  const shown=async()=>{const frame=page.locator('[data-qid]');await frame.waitFor();return (await frame.getAttribute('data-qid'))!;};
  const answer=async(qid:string)=>{const q=question(qid);if(q.type==='choice')await page.getByRole('radio').nth('ABCD'.indexOf(q.answer)).click();else await page.getByLabel('Your answer',{exact:true}).fill(q.answer);await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByText('Right.',{exact:true}).waitFor();};
  await open();let qid=await shown();assert.equal(qid,strategy.guided);await answer(qid);
  await open();qid=await shown();assert.notEqual(qid,strategy.guided);assert.equal(connectedSkill(config,qid),skill);await answer(qid);
  // Seed independent successes through the real grader, then advance the existing synthetic test clock. No stored event is redated.
  let data=await saved(),state=learnerState(id,withDecisions(data.events,data.decisions),now());
  for(let i=0;i<4;i++) {const next=questionForRequirement(m,'check',state.records,q=>connectedSkill(config,q)===skill,'readiness');assert.ok(next);await append(make.attempt(ctx(),next,question(next).answer,'check'));data=await saved();state=learnerState(id,withDecisions(data.events,data.decisions),now());}
  offset=8*86400000;
  writeFileSync(process.env.OPENPATH_TEST_CLOCK_FILE??'/tmp/connections-clock.json',JSON.stringify({[id]:8}));
  await page.clock.setSystemTime(new Date(now()));
  data=await saved();state=learnerState(id,withDecisions(data.events,data.decisions),now());
  for(const dependency of graph.relationsOf(competency).filter(r=>['mandatory','plausible'].includes(r.type)).map(r=>r.from)) {
    const dm=moduleFor(dependency);assert.ok(dm,dependency);
    for(let i=0;i<20&&!['independent','transfer','verified'].includes(state.evidence(dependency).status);i++) {
      const next=questionForRequirement(dm,'check',state.records,()=>true,'readiness');assert.ok(next,dependency);
      await append(make.attempt(ctx(),next,question(next).answer,'check'));data=await saved();state=learnerState(id,withDecisions(data.events,data.decisions),now());
    }
  }
  assert.equal(state.module(competency).phase,'retention',JSON.stringify(state.module(competency)));
  await open();const delayed=await shown();assert.equal(connectedSkill(config,delayed),skill);assert.notEqual(delayed,qid);await answer(delayed);
  data=await saved();const attempts=withDecisions(data.events,data.decisions).filter((e:any)=>e.record==='attempt') as any[];
  assert.equal(attempts.at(-1).activity,'retention');assert.equal(attempts.at(-1).questionId,delayed);
  const serialized=JSON.stringify(attempts.at(-1));await page.reload();const restored=await saved();
  assert.equal(JSON.stringify((withDecisions(restored.events,restored.decisions) as any[]).find(e=>e.id===attempts.at(-1).id)),serialized);
  results.push({competency,skill,guided:strategy.guided,fresh:qid,retention:delayed,events:data.count,reloaded:true});
 }
 console.log(JSON.stringify({passed:true,results}));
} catch(e){console.error(await page.locator('body').innerText());throw e;}finally{await browser.close();server.close();}
