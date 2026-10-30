/** One learner-facing flow, four repository curricula, authenticated real Django; no response/review mocks. */
import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {boardFor} from '../../packages/learning/src/curricula.ts';
import {make,learnerState} from '../../packages/learning/src/session.ts';
import {question} from '../../packages/learning/src/content.ts';
const base=process.env.YEAR_URL??'http://127.0.0.1:4310';
const shots=process.env.SHOTS??'/tmp/curriculum-journey';mkdirSync(shots,{recursive:true});
const dataDir=new URL('../dist-english/curriculum/data/',import.meta.url);
const index=JSON.parse(readFileSync(new URL('index.json',dataDir),'utf8'));
let browser;before(async()=>{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium'});});after(()=>browser?.close());
async function api(page,path,body){return page.evaluate(async({path,body})=>{const csrf=decodeURIComponent(document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1]??'');const r=await fetch('/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-CSRFToken':csrf},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json()};},{path,body});}
async function shot(page,name){await page.evaluate(()=>window.scrollTo(0,0));await page.evaluate(()=>new Promise(requestAnimationFrame));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');assert.equal(await page.locator('canvas,.writing-tools,.sketchpad').count(),0);await page.screenshot({path:`${shots}/${name}.png`,fullPage:true});}
const walk=(nodes,path=[])=>nodes.flatMap(n=>[{n,path:[...path,n]},...walk(n.children,[...path,n])]);
for(const grade of [7,10])for(const board of ['tn','cbse'])for(const width of [360,393])test(`${board} Grade ${grade}, ${width}px: syllabus → competency → generated practice → saved evidence → resume`,async()=>{
 const context=await browser.newContext({viewport:{width,height:820},isMobile:true,hasTouch:true});const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const prefix=`${board}-${grade}-${width}`;
 try {
 await page.goto(base+'/year/');await api(page,'/account/');assert.equal((await api(page,'/account/register/',{email:`curriculum-${prefix}-${Date.now()}@example.org`,password:'synthetic-curriculum-journey-password',consent:true})).status,201);
 const pupil=await api(page,'/pupils/',{display_name:'Synthetic curriculum learner',consent:true});assert.equal(pupil.status,201);const L=pupil.data.id;
 const curriculum=boardFor(board,grade),event=make.enrol({learnerId:L,sessionId:`learn:${L}:setup`,at:new Date().toISOString()},grade,'2026-27',curriculum);
 assert.equal((await api(page,`/pupils/${L}/events/`,{subject:'mathematics',seq:0,event})).status,201);
 const entry=index.releases.find(e=>e.board===board&&e.grade===grade),data=JSON.parse(readFileSync(new URL(entry.file,dataDir),'utf8'));
 // A stale custom display order cannot rearrange the learner's prescribed syllabus.
 await page.evaluate(({id,ids})=>localStorage.setItem(`openpath.curriculum.order.${id}.root`,JSON.stringify(ids.reverse())),{id:entry.release,ids:data.nodes.map(n=>n.id)});
 await page.goto(`${base}/year/?learner=${L}`);await page.getByRole('link',{name:'Open Mathematics topics',exact:true}).click();await page.getByRole('heading',{name:`Grade ${grade} Mathematics`,exact:true}).waitFor();await page.getByText(/Loading .*evidence/).waitFor({state:'detached'});
 assert.deepEqual(await page.locator('.tiles > li .tile-title').allTextContents(),data.nodes.map(n=>n.title));await shot(page,`${prefix}-syllabus`);
 const selected=walk(data.nodes).find(({n})=>n.kind==='competency'&&data.competencies[n.competency]?.families.length&&data.competencies[n.competency]?.module);assert.ok(selected);const comp=data.competencies[selected.n.competency];
 for(const node of selected.path){await page.locator('.tiles > li').filter({has:page.locator('.tile-title',{hasText:node.title})}).getByRole('button').first().click();}await page.getByRole('link',{name:'Start learning',exact:true}).click();
 await page.getByRole('article',{name:'Mathematics teaching and practice'}).waitFor();await shot(page,`${prefix}-competency`);
 await page.getByRole('button',{name:'Practice this concept',exact:true}).click();await page.getByRole('article',{name:'Curriculum practice',exact:true}).waitFor();await page.locator('.qcard[data-qid]').waitFor();const qid=await page.locator('.qcard').getAttribute('data-qid'),q=question(qid);assert.equal(q.competency,comp.evidenceTarget);assert.ok(qid.startsWith('gen:'),'existing generated family pool');
 const enter=async value=>{if(q.type==='choice')await page.getByRole('radio').nth('ABCD'.indexOf(value)).click();else await page.getByRole('textbox',{name:'Your answer',exact:true}).fill(value);};
 const wrong=q.type==='choice'?(q.answer==='A'?'B':'A'):'123456789';await enter(wrong);const before=(await api(page,`/pupils/${L}/events/?subject=mathematics`)).data.events;
 await page.reload();await page.locator('.qcard[data-qid]').waitFor();assert.equal(await page.locator('.qcard').getAttribute('data-qid'),qid);if(q.type!=='choice')assert.equal(await page.getByRole('textbox',{name:'Your answer',exact:true}).inputValue(),wrong);
 await shot(page,`${prefix}-resumed-draft`);await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByText('Not this time.',{exact:true}).waitFor();await shot(page,`${prefix}-incorrect`);
 await page.getByRole('button',{name:'Give me a hint',exact:true}).click();await page.getByRole('complementary',{name:'Contextual help',exact:true}).waitFor();await enter(q.answer);await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByText('Right.',{exact:true}).waitFor();await shot(page,`${prefix}-corrected`);
 await page.reload();await page.getByText('Right.',{exact:true}).waitFor();const rows=(await api(page,`/pupils/${L}/events/?subject=mathematics`)).data.events;assert.deepEqual(rows.slice(0,before.length),before);const attempts=rows.filter(e=>e.record==='attempt');assert.equal(attempts.length,2);assert.equal(attempts[1].questionId,qid);assert.ok(attempts[1].hints>0);assert.equal(rows.filter(e=>e.record==='topic_session'||e.record==='study_session').length,0,'no plan or timer gates curriculum practice');
 const state=learnerState(L,rows,Date.now());assert.notEqual(state.evidence(comp.evidenceTarget).status,'verified');assert.equal(state.enrolment.curriculum.id,curriculum.id);assert.equal(state.enrolment.academicYear,'2026-27');
 await page.getByRole('button',{name:'Next question',exact:true}).click();await page.locator('.qcard[data-qid]').waitFor();const next=await page.locator('.qcard').getAttribute('data-qid');assert.notEqual(next.replace(/:mc$/,''),qid.replace(/:mc$/,''),'do not repeat the same exposure as independent evidence');
 // An unassisted answer uses the same canonical ledger, still no mastery from provisional content.
 const nq=question(next);if(nq.type==='choice')await page.getByRole('radio').nth('ABCD'.indexOf(nq.answer)).click();else await page.getByRole('textbox',{name:'Your answer',exact:true}).fill(nq.answer);await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByText('Right.',{exact:true}).waitFor();
 await page.getByRole('button',{name:/Teaching/}).click();await page.getByRole('link',{name:/Back/}).click();await page.getByRole('heading',{name:comp.name,exact:true}).waitFor();assert.match(await page.locator('.state-card').innerText(),/3 answers so far/);assert.equal(await page.locator('.state-card.m-verified').count(),0);await shot(page,`${prefix}-progress`);
 await page.getByRole('link',{name:'Continue learning',exact:true}).click();await page.getByRole('button',{name:'Practice this concept',exact:true}).click();await page.getByText('Right.',{exact:true}).waitFor();assert.equal((await api(page,`/pupils/${L}/events/?subject=mathematics`)).data.events.filter(e=>e.record==='attempt').length,3,'resume never duplicates answers');const unsupported=Object.values(data.competencies).find(c=>!c.families.length);assert.ok(unsupported,'curriculum retains unsupported keyboard/method coverage');await page.goto(`${base}/curriculum/?learner=${L}&view=learner#c=${encodeURIComponent(unsupported.id)}`);await page.getByRole('heading',{name:unsupported.name,exact:true}).waitFor();await page.getByText('The lesson for this skill is being prepared.',{exact:false}).waitFor();assert.equal(await page.getByRole('link',{name:/Start learning|Continue learning|Practise questions/}).count(),0,'do not substitute final-answer practice for unsupported method tasks');assert.deepEqual(errors,[]);
 }catch(error){console.error(await page.locator('body').innerText());await page.screenshot({path:`${shots}/${prefix}-failure.png`,fullPage:true});throw error;}finally{await context.close();}
});
