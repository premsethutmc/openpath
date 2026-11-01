/** Real year UI + real Django API on an isolated local database. Run with --import tsx. */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { latestReleases } from '../../packages/learning/src/curricula';
import { graph } from '../../packages/learning/src/graph';
import { question, moduleFor } from '../../packages/learning/src/content';
import { learnerState, make } from '../../packages/learning/src/session';
import { questionForRequirement } from '../../packages/learning/src/intervention';
import { probeReading } from '../../packages/learning/src/reasoning';
import { hypotheses, investigateContext } from '../../packages/learning/src/hypotheses';
import { withDecisions } from '../../packages/learning/src/records';
const root=fileURLToPath(new URL('../dist-english/',import.meta.url));
import { geometryTask } from '../../packages/learning/src/geometry-task';
const accessOnly=process.env.PATHWAY_ACCESS_ONLY==='1';
const geometryOnly=process.env.PATHWAY_GEOMETRY_ONLY==='1';
const target=process.env.PATHWAY_TARGET??(accessOnly?'MATH.algebra.linear-equations':'MATH.number.addition-regroup');
const port=4197, api=process.env.PATHWAY_API??'http://127.0.0.1:8197';
const server=http.createServer((req,res)=>{
 if(req.url?.startsWith('/api/')){const proxy=http.request(new URL(req.url,api),{method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode!,r.headers);r.pipe(res)});proxy.on('error',()=>res.writeHead(502).end());req.pipe(proxy);return;}
 try{const path=(req.url??'/').split('?')[0];if(!/^\/year\/(?:app\.(?:js|css)(?:\.map)?|index\.html)?$/.test(path)){res.writeHead(404).end();return;}
 const file=root+(path.endsWith('/')?path+'index.html':path);const body=readFileSync(file);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);}catch{res.writeHead(404).end();}
});
await new Promise<void>(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
let coldYearMs=0,warmYearMs=0;
const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
async function call(path:string,body?:unknown){return page.evaluate(async({path,body})=>{const token=document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1]??'';const r=await fetch('/api'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRFToken':decodeURIComponent(token)},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json().catch(()=>null)};},{path,body});}
try{
 await page.goto(`http://127.0.0.1:${port}/year/`);await page.getByRole('heading',{name:'Sign in to OpenPath'}).waitFor();
 const email=`foundation-${Date.now()}@example.org`,password='synthetic-foundation-browser-passphrase';
 assert.equal((await call('/account/register/',{email,password,consent:true})).status,201);
 const pupil=await call('/pupils/',{display_name:'Synthetic foundation journey',consent:true});assert.equal(pupil.status,201);
 const id=pupil.data.id,r=latestReleases.find(r=>r.grade===(accessOnly?7:1)&&(!accessOnly||r.id.startsWith('cbse-')))! ;
 const enrol={kind:'learning_record',id:`enrol-${Date.now()}`,at:new Date().toISOString(),learnerId:id,sessionId:`learn:${id}:setup`,record:'enrol',grade:r.grade,academicYear:'2026-27',curriculum:{id:r.id,version:r.version,hash:r.hash}};
 assert.equal((await call(`/pupils/${id}/events/`,{subject:'mathematics',seq:0,event:enrol})).status,201);
 const yearStart=Date.now();
 await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&foundation=1`);
 await page.getByLabel('Target topic',{exact:true}).waitFor();coldYearMs=Date.now()-yearStart;
 await page.getByLabel('Target topic',{exact:true}).selectOption(target);await page.getByRole('button',{name:'Use this learning goal'}).click();
 await page.getByText('Current goal:',{exact:false}).waitFor();
 if(accessOnly) {
  const before=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
  const state=learnerState(id,withDecisions(before.events,before.decisions??{}),Date.now());
  assert.notEqual(state.next?.competency,target,'missing prerequisites still recommend support');
  assert.equal(state.evidence(target).status,'not_started');
  // Failure to save exposure must keep teaching readable and preserve an honest retry.
  await page.route('**/api/pupils/*/events/',route=>route.request().method()==='POST'?route.abort():route.continue(),{times:1});
  await page.getByRole('button',{name:'Open selected lesson',exact:true}).click();
  await page.locator('.teaching-head').waitFor();
  await page.getByRole('button',{name:'Retry saving lesson',exact:true}).waitFor();
  await page.getByRole('complementary',{name:'Optional supporting lesson'}).waitFor();
  assert.ok(await page.locator('.teaching-block').count());
  assert.equal(await page.locator('.lesson-stages button').nth(2).isDisabled(),true);
  await Promise.all([page.waitForResponse(r=>r.url().includes('/events/')&&r.request().method()==='POST'),page.getByRole('button',{name:'Retry saving lesson',exact:true}).click()]);
  const taught=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
  assert.ok(taught.events.some((e:any)=>e.record==='teach'&&e.competency===target&&e.rule==='foundation-lesson-review@1'));
  assert.equal(taught.events.filter((e:any)=>e.record==='attempt').length,0,'opening teaching invents no answers');
  const after=learnerState(id,withDecisions(taught.events,taught.decisions??{}),Date.now());
  assert.ok(!['independent','transfer','verified'].includes(after.evidence(target).status));
  // Optional support can be declined; proceed directly to this chapter's practice.
  await page.getByRole('button',{name:'Practice this concept',exact:true}).click();
  const card=page.locator('[data-qid]');await card.waitFor();const q=question((await card.getAttribute('data-qid'))!);
  if(q.type==='choice')await page.getByRole('radio').nth('ABCD'.indexOf(q.answer)).click();else await page.getByLabel('Your answer',{exact:true}).fill(q.answer);
  await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByText('Right.',{exact:true}).waitFor();
  const saved=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
  const records=withDecisions(saved.events,saved.decisions??{});
  const result=learnerState(id,records,Date.now());
  assert.ok(result.records.attempts.at(-1)?.solution,'saved teaching marks subsequent work assisted');
  assert.ok(!['independent','transfer','verified'].includes(result.evidence(target).status));
  await Promise.all([page.waitForResponse(r=>r.url().includes('/events/')&&r.request().method()==='POST'),page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&skill=${target}&practice=curriculum`)]);
  await page.getByRole('article',{name:'Curriculum practice'}).waitFor();
  const reload=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
  assert.equal(reload.count,saved.count+1,'resumed practice saves assistance in the new session');
  await page.getByRole('button',{name:'Next question',exact:true}).click();
  const nextCard=page.locator('[data-qid]');await nextCard.waitFor();const nextQ=question((await nextCard.getAttribute('data-qid'))!);
  if(nextQ.type==='choice')await page.getByRole('radio').nth('ABCD'.indexOf(nextQ.answer)).click();else await page.getByLabel('Your answer',{exact:true}).fill(nextQ.answer);
  await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByText('Right.',{exact:true}).waitFor();
  const resumed=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
  assert.equal(learnerState(id,withDecisions(resumed.events,resumed.decisions??{}),Date.now()).records.attempts.at(-1)?.solution,true);
  assert.deepEqual(learnerState(id,withDecisions([...reload.events].reverse(),reload.decisions??{}),Date.now()).next,result.next);
  await page.getByRole('button',{name:'Return to teaching',exact:true}).click();
  await page.locator('.teaching-head').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const warmStart=Date.now();await page.getByRole('button',{name:'← My year',exact:true}).click();await page.getByLabel('Target topic',{exact:true}).waitFor();warmYearMs=Date.now()-warmStart;
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,coldYearMs,warmYearMs,grade:7,target,missingPrerequisites:true,teachingOpen:true,supportOptional:true,failedSaveRetried:true,assisted:true,persistence:true,replay:true,phone:'390x844'}));
 } else {
 const visited=new Set<string>();let attempted=0;
 if(!geometryOnly) {
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
 }
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
 const task=geometryTask(g.id);
 if(geometryOnly) {assert.ok(task,'real UI must offer a supported geometry task');assert.ok(await page.locator('svg').count(),'existing geometry visual');}
 const work=geometryOnly?`x = ${task!.problem.goal.value} (triangle sum)`:'Use the triangle angle sum; subtract the two given angles.';
 await page.getByLabel('Your working',{exact:true}).fill(work);
 await page.getByRole('button',{name:'Check',exact:true}).click();
 const note=page.getByRole('note',{name:'Your working',exact:true});await note.waitFor();
 assert.ok(!(await note.getAttribute('class'))?.includes('bad'));
 assert.match(await note.innerText(),geometryOnly?/geometric rules.*check out/:/not been marked right or wrong/);
 const final=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
 const attempt=withDecisions(final.events,final.decisions??{}).filter((e:any)=>e.record==='attempt').at(-1) as any;
 assert.deepEqual(attempt.working,[work]);assert.equal(attempt.decision.working.status,geometryOnly?'verified':'unsupported');
 if(geometryOnly) {
  await page.screenshot({path:'/tmp/pathway-browser-shots/geometry-verified.png',fullPage:true});
  await page.getByRole('button',{name:'Review a supported lesson',exact:true}).click();
  const lesson=page.locator('.lesson');await lesson.waitFor();assert.match(await lesson.innerText(),/triangle|180/i);
  await page.screenshot({path:'/tmp/pathway-browser-shots/geometry-lesson.png',fullPage:true});
  const before=JSON.stringify(attempt.decision);await call('/account/logout/',{});await call('/account/login/',{email,password});await page.reload();
  const reload=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
  assert.equal(JSON.stringify((withDecisions(reload.events,reload.decisions).find((e:any)=>e.id===attempt.id) as any)?.decision),before);
  assert.deepEqual(learnerState(id,withDecisions(reload.events,reload.decisions),Date.now()).next,learnerState(id,withDecisions([...reload.events].reverse(),reload.decisions),Date.now()).next);
 }
 if(geometryOnly && process.env.PATHWAY_GAP_CHECK==='1') {
  const competency='MATH.geometry.triangle-properties';let original='';
  for(let i=0;i<2;i++) {
   const data=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
   const state=learnerState(id,withDecisions(data.events,data.decisions??{}),Date.now());
   const qid=questionForRequirement(moduleFor(competency)!,'check',state.selectionRecords,q=>!q.endsWith(':mc')&&probeReading(q,'third-interior').discriminates,'readiness');assert.ok(qid);
   const event=make.attempt({learnerId:id,sessionId:`learn:${id}:gap`,at:new Date().toISOString()},qid,probeReading(qid,'third-interior').predicted[0],i?'diagnostic':'check',i?{context:investigateContext(original)}:{});
   assert.equal((await call(`/pupils/${id}/events/`,{subject:'mathematics',seq:data.count,event})).status,201);original ||= qid;
  }
  await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&skill=${competency}`);
  await page.getByText('More evidence needed',{exact:true}).waitFor();
  await page.getByText('This diagnosed gap still needs attention',{exact:false}).waitFor();
  assert.equal(await page.locator('[data-qid]').count(),0,'no unrelated question masquerades as remediation');
  await page.getByRole('button',{name:'Review a supported lesson',exact:true}).click();await page.locator('.lesson').waitFor();
  const savedGap=(await call(`/pupils/${id}/events/?subject=mathematics`)).data;
  const state=learnerState(id,withDecisions(savedGap.events,savedGap.decisions??{}),Date.now());
  assert.ok(hypotheses(state.selectionRecords).some(h=>h.claim?.explanation==='third-interior'&&h.status==='established'&&h.teachingDue));
  assert.equal(state.module(competency).phase,'unavailable');assert.equal(state.module(competency).requirementsMet,false);
  await page.reload();await page.getByText('This diagnosed gap still needs attention',{exact:false}).waitFor();
  await page.screenshot({path:'/tmp/pathway-browser-shots/foundation-gap.png',fullPage:true});
 }
 await page.screenshot({path:'/tmp/pathway-browser-shots/geometry-working.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,topics:[...visited],attempted,events:saved.count,phone:'390x844',freshLogin:true,gapFallback:process.env.PATHWAY_GAP_CHECK==='1',geometryWorking:attempt.decision.working.status,gradingPolicy:attempt.decision.policy}));
}
}catch(error){console.error(await page.locator('body').innerText());throw error;}finally{await context.close();await browser.close();server.close();}
