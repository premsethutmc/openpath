/** Synthetic Year UI + Django regression for evidence scope and retention, not teaching coverage. */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { latestReleases } from '../../packages/learning/src/curricula';
import { question, moduleFor } from '../../packages/learning/src/content';
import { problemOf, pool, exposureKey } from '../../packages/learning/src/families';
import { learnerState, make } from '../../packages/learning/src/session';
import { withDecisions } from '../../packages/learning/src/records';
import { projectFromEventsWith } from '../../packages/learning/src/subskill-projection';
import { HALF_SYMBOL_ROWS, PICTOGRAPHS_CONFIG } from '../../packages/learning/src/subskill-config-scale';
import { questionForRequirement } from '../../packages/learning/src/intervention';
const root=fileURLToPath(new URL('../dist-english/',import.meta.url)),port=4200;
const server=http.createServer((req,res)=>{
 if(req.url?.startsWith('/api/')) {const proxy=http.request(new URL(req.url,process.env.PATHWAY_API??'http://127.0.0.1:8200'),{method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode!,r.headers);r.pipe(res)});proxy.on('error',()=>res.writeHead(502).end());req.pipe(proxy);return;}
 try {const path=(req.url??'/').split('?')[0];if(!/^\/year\/(?:app\.(?:js|css)(?:\.map)?|index\.html)?$/.test(path)){res.writeHead(404).end();return;}const file=root+(path.endsWith('/')?path+'index.html':path),body=readFileSync(file);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);}catch{res.writeHead(404).end();}
});
await new Promise<void>(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),page=await browser.newPage();

async function call(path:string,body?:unknown){return page.evaluate(async({path,body})=>{const token=document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1]??'';const r=await fetch('/api'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRFToken':decodeURIComponent(token)},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json().catch(()=>null)};},{path,body});}
const output=fileURLToPath(new URL('../../docs/math-answer-contract-integration/half-row-browser-results.json',import.meta.url));
const timings: {phase:string;milliseconds:number}[]=[];
const progress:Record<string,unknown>={};
const half=(qid:string)=>{const p=problemOf(qid);return !!p&&p.family==='acpicthalf'&&p.params[3]===0&&HALF_SYMBOL_ROWS.includes(p.params.slice(0,3).join(','));};
try {
 await page.goto(`http://127.0.0.1:${port}/year/`);assert.equal((await call('/account/')).status,200);
 assert.equal((await call('/account/register/',{email:`half-retention-${Date.now()}@example.org`,password:'synthetic-half-retention-passphrase',consent:true})).status,201);
 const pupil=await call('/pupils/',{display_name:'Synthetic half-picture retention',consent:true});assert.equal(pupil.status,201);
 const id=pupil.data.id,competency=PICTOGRAPHS_CONFIG.competency,skill='pictographs.half-symbol@1',realNow=Date.now(),day=86400000;
 let clock=realNow-60000;
 const ctx=()=>({learnerId:id,sessionId:`learn:${id}:seed`,at:new Date(++clock).toISOString()});
 const saved=async()=>{const r=await call(`/pupils/${id}/events/?subject=mathematics`);assert.equal(r.status,200);return r.data;};
 const append=async(event:unknown)=>{const d=await saved();const r=await call(`/pupils/${id}/events/`,{subject:'mathematics',seq:d.count,event});assert.equal(r.status,201,JSON.stringify(r));};
 const projection=(d:any,now:number)=>projectFromEventsWith(PICTOGRAPHS_CONFIG,id,withDecisions(d.events,d.decisions),now).subSkills.find(s=>s.id===skill)!;
 await append(make.enrol(ctx(),12,'2026-27',latestReleases.find(r=>r.grade===12)!));await append(make.pathway(ctx(),competency));
 const whole=pool('acpicthalf').items.filter(p=>p.params[3]===0&&!half(p.id)).slice(0,4).map(p=>p.id);
 assert.ok(whole.length);for(const qid of whole)await append(make.attempt(ctx(),qid,question(qid).answer,'check'));
 const wholeData=await saved(),wholeEvents=withDecisions(wholeData.events,wholeData.decisions),wholeState=learnerState(id,wholeEvents,clock);
 assert.equal(projection(wholeData,clock).attempts.total,0);
 progress.wholeRows=whole;progress.wholeRowHalfSkillCredit=false;
 for(const qid of whole)assert.equal(wholeState.records.attempts.find(a=>a.questionId===qid)?.credit,true,'whole-row answer credit stays intact');
 progress.wholeRowAnswerCredit=true;
 const m=moduleFor(competency)!;
 for(let i=0;i<12;i++){
  const d=await saved(),st=learnerState(id,withDecisions(d.events,d.decisions),clock);
  const qid=questionForRequirement(m,'check',st.records,half,'readiness');assert.ok(qid);
  await append(make.attempt(ctx(),qid,question(qid).answer,'check'));
 }
 const demonstrated=await saved();assert.equal(projection(demonstrated,clock).historical.everDemonstrated,true);
 writeFileSync('/tmp/candidate-clock.json',JSON.stringify({[id]:9}));await page.clock.setSystemTime(new Date(realNow+9*day));
 const open=async(phase:string)=>{const t=performance.now();await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&skill=${competency}`);await page.locator('[data-qid]').waitFor();timings.push({phase,milliseconds:Math.round(performance.now()-t)});return (await page.locator('[data-qid]').getAttribute('data-qid'))!;};
 const answer=async(qid:string,correct:boolean)=>{const q=question(qid);if(q.type==='choice')await page.getByRole('radio').nth(correct?'ABCD'.indexOf(q.answer):('ABCD'.indexOf(q.answer)+1)%q.options!.length).click();else await page.getByLabel('Your answer',{exact:true}).fill(correct?q.answer:'-999');await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).waitFor();};
 const delayedData=await saved(),due=projection(delayedData,realNow+9*day);assert.equal(due.status,'retention-due');
 const delayed=await open('delayed-question');progress.delayed=delayed;assert.ok(half(delayed));
 assert.ok(!learnerState(id,withDecisions(delayedData.events,delayedData.decisions),realNow+9*day).records.attempts.some(a=>exposureKey(a.questionId)===exposureKey(delayed)));
 await answer(delayed,false);
 const failed=await saved();assert.equal(projection(failed,realNow+9*day).status,'recovery-required');
 await page.reload();const reloaded=await saved();assert.deepEqual(reloaded.events,failed.events);assert.deepEqual(reloaded.decisions,failed.decisions);progress.failedDelayedSavedAndReloaded=true;
 const recoveryQuestions:string[]=[];
 for(let i=0;i<12;i++){
  const d=await saved();if(projection(d,realNow+9*day).status!=='recovery-required')break;
  const qid=await open('recovery-question');progress.lastRecoveryQuestion=qid;assert.ok(half(qid),`Recovery selected out-of-scope question ${qid}`);assert.notEqual(exposureKey(qid),exposureKey(delayed));assert.ok(!recoveryQuestions.map(exposureKey).includes(exposureKey(qid)));
  recoveryQuestions.push(qid);await answer(qid,true);await page.getByText('Right.',{exact:true}).waitFor();
 }
 const final=await saved(),restoredProjection=projection(final,realNow+9*day);assert.notEqual(restoredProjection.status,'recovery-required');assert.ok(recoveryQuestions.length);
 await page.reload();const replay=await saved();assert.deepEqual(replay.events,final.events);assert.deepEqual(replay.decisions,final.decisions);
 const result={passed:true,scope:'Synthetic actual Year UI + server-graded evidence/retention regression; no teaching or curriculum-completion claim',wholeRows:whole,wholeRowAnswerCredit:true,wholeRowHalfSkillCredit:false,delayed,recoveryQuestions,finalStatus:restoredProjection.status,reloaded:true,timings};
 writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(e){writeFileSync(output,JSON.stringify({passed:false,error:String(e),progress,timings},null,2)+'\n');console.error(await page.locator('body').innerText());throw e;}
finally{await browser.close();server.close();}
