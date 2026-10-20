/** Old direct/demo URLs cannot expose a deferred input mode or destroy local archives. */
import assert from 'node:assert/strict';
import {test,before,after} from 'node:test';
import {chromium} from 'playwright';
const BASE=process.env.E2E_URL??'http://127.0.0.1:4670';
let browser;
before(async()=>{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});});
after(()=>browser?.close());
for(const query of ['?demo=1','?demo=1&handwriting=1&role=educator','?mode=ink&role=parent'])test(`legacy input link stays keyboard-only: ${query}`,async()=>{
 const c=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
 if(process.env.PREVIEW_PASSWORD)await c.request.post(BASE+'/login',{form:{password:process.env.PREVIEW_PASSWORD}});
 const p=await c.newPage(),requests=[];p.on('request',r=>{if(/\/recognition\/|onnx|ort-wasm/.test(r.url()))requests.push(r.url());});
 try{
  await p.goto(BASE+'/writing.html'+query);
  await p.getByRole('heading',{name:'Parent sign in',exact:true}).waitFor();
  const key='openpath:math-input@1:division:379:3';
  const archive=JSON.stringify({version:1,strokes:[{id:'saved-pen',pointerType:'pen',points:[{x:330,y:55,t:1,pressure:0.7}]}],corrections:[{from:'2',to:'1'}]});
  await p.evaluate(({key,archive})=>localStorage.setItem(key,archive),{key,archive});
  await p.reload();await p.getByRole('heading',{name:'Parent sign in',exact:true}).waitFor();
  assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),archive);
  assert.equal(await p.locator('canvas,svg.writing-paper,.math-keypad,.writing-settings').count(),0);
  assert.equal(await p.getByRole('button',{name:/^(Pen|Eraser|Pan|Write|.*Write instead|Interpret handwriting)$/i}).count(),0);
  assert.doesNotMatch(await p.locator('body').innerText(),/recognition|handwritten|handwriting|synthetic recognition/i);
  assert.deepEqual(requests,[]);
 }finally{await c.close();}
});
