/** Same-container restart fixture, synthetic student only; the live preview is never modified. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {test} from 'node:test';
import {chromium} from 'playwright';
const BASE=process.env.E2E_URL??'http://127.0.0.1:4711';
const FILE='/tmp/openpath-progressive-resume-state.json';
test(process.env.PREVIEW_PHASE==='resume'?'progressive working resumes after backend/container restart':'save progressive paper for container restart',async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 try{
  const saved=process.env.PREVIEW_PHASE==='resume'?JSON.parse(readFileSync(FILE,'utf8')):null;
  const c=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,...(saved?{storageState:saved.state}:{})});
  const p=await c.newPage();p.setDefaultTimeout(20000);
  if(saved){
   await p.goto(saved.url);await p.getByLabel('Quotient place 2',{exact:true}).waitFor();
   assert.equal(await p.getByRole('button',{name:'Subtract row 1: 0',exact:true}).count(),1);
   await p.keyboard.type('2616181');await p.getByText('Finished! 379 ÷ 3 = 126 remainder 1.',{exact:true}).waitFor();
  }else{
   await p.goto(BASE);await p.getByRole('button',{name:'Try OpenPath as a Demo Student',exact:true}).click();
   await p.getByLabel('Quotient place 1',{exact:true}).waitFor();await p.keyboard.type('130');
   await p.getByLabel('Quotient place 2',{exact:true}).waitFor();await p.getByText('Saved',{exact:true}).waitFor();
   writeFileSync(FILE,JSON.stringify({state:await c.storageState(),url:p.url()}),{mode:0o600});
  }
  await c.close();
 }finally{await browser.close();}
});
