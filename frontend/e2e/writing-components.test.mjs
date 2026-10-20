/** Mount the public React API with host-supplied adapters; no test hooks in shipped workspace. */
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
let browser, js;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const b = await build({
    stdin: {
      loader: "tsx",
      resolveDir: process.cwd(),
      contents: `
import {useState} from 'react';import {createRoot} from 'react-dom/client';
import {WritingWorkspace} from './src/writing/Workspace';import {createWork,divisionLayout,addStroke} from './src/writing/model';
const w=addStroke(createWork('host-work',{id:'host-problem',statement:'Host problem'},divisionLayout('379','3')),{id:'ink',pointerType:'pen',startedAt:'2026-10-20T00:00:00Z',points:[{x:330,y:55,t:1,pressure:.5,tiltX:0,tiltY:0,twist:0}],regionId:'quotient',width:3,tool:'ink'});
const recognizer={id:'host-test',available:()=>true,async recognize(r){await new Promise(resolve=>{window.releaseRecognition=resolve;});if(window.rejectRecognition)throw Error('Host recognizer failed — type instead');return {provider:'host-test',revision:r.revision,candidates:[{id:'digit',text:'2',bounds:{x:320,y:40,width:40,height:50},strokeIds:['ink'],regionId:'quotient',confidence:.96}]}}};
const validator={async submit(p){window.submitted=p;await new Promise(resolve=>window.releaseValidation=resolve);return {contract:p.contract,workId:p.workId,revision:p.revision,status:'clarification',messages:[{regionId:'quotient',tokenId:p.steps[0].tokens[0].id,text:'Please clarify this input',kind:'input-clarification'}]}}};
function Host(){const [work,setWork]=useState(w);window.hostWork=work;return <WritingWorkspace work={work} onChange={setWork} recognizer={recognizer} validator={validator} onConfirmedInput={p=>window.confirmed=p}/>};createRoot(document.getElementById('root')).render(<Host/>);
`,
    },
    jsx: "automatic",
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
  });
  js = b.outputFiles[0].text;
});
after(() => browser?.close());
async function mount() {
  const context = await browser.newContext(),
    p = await context.newPage();
  p.setDefaultTimeout(10000);
  p.on("pageerror", (e) => console.log("Component harness error:", e.message));
  await p.route("**/component.html", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<!doctype html><div id="root"></div><script type="module" src="/component.js"></script>',
    }),
  );
  await p.route("**/component.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: js }),
  );
  await p.goto(
    (process.env.E2E_URL ?? "http://127.0.0.1:4670") + "/component.html",
  );
  return { p, context };
}
test("controlled component rejects late recognition and retains manual work when recognizer fails", async () => {
  const { p, context } = await mount();
  await p.getByRole("button", { name: "Interpret handwriting" }).click();
  await p.getByRole("textbox", { name: "Number or expression" }).fill("126");
  await p.getByRole("button", { name: "Add typed step" }).click();
  await p.evaluate(() => window.releaseRecognition());
  await p
    .getByRole("alert")
    .filter({ hasText: /writing changed/ })
    .waitFor();
  assert.equal(await p.evaluate(() => window.hostWork.tokens.length), 1);
  assert.equal(await p.evaluate(() => window.hostWork.tokens[0].text), "126");
  await p.getByRole("button", { name: "Interpret handwriting" }).click();
  await p.evaluate(() => {
    window.rejectRecognition = true;
    window.releaseRecognition();
  });
  await p
    .getByRole("alert")
    .filter({ hasText: /Host recognizer failed/ })
    .waitFor();
  assert.equal(await p.evaluate(() => window.hostWork.strokes.length), 1);
  assert.equal(await p.evaluate(() => window.confirmed), undefined);
  await context.close();
});
test("host validator clarification is editable and confirmed callback carries versioned input only", async () => {
  const { p, context } = await mount();
  await p.getByRole("button", { name: "Interpret handwriting" }).click();
  await p.evaluate(() => window.releaseRecognition());
  await p
    .getByRole("button", { name: "Edit Quotient: 2", exact: true })
    .waitFor();
  await p
    .getByRole("button", { name: "Send confirmed steps to validator" })
    .click();
  await p.evaluate(() => window.releaseValidation());
  await p.getByRole("button", { name: "Clarify this input" }).click();
  await p
    .getByRole("textbox", { name: "Intended symbol or expression" })
    .fill("3");
  await p.getByRole("button", { name: "Confirm this symbol" }).click();
  const packet = await p.evaluate(() => window.confirmed);
  assert.equal(packet.contract, "openpath-math-input@1");
  assert.equal(packet.workId, "host-work");
  assert.equal(packet.strokes[0].id, "ink");
  assert.ok(!("correct" in packet) && !("mastery" in packet));
  assert.equal(await p.evaluate(() => window.hostWork.corrections[0].to), "3");
  await context.close();
});
test("late validator feedback is discarded after a student edits a step", async () => {
  const { p, context } = await mount();
  await p.getByRole("textbox", { name: "Number or expression" }).fill("126");
  await p.getByRole("button", { name: "Add typed step" }).click();
  await p
    .getByRole("button", { name: "Send confirmed steps to validator" })
    .click();
  await p
    .getByRole("button", { name: "Edit Quotient: 126", exact: true })
    .click();
  await p
    .getByRole("textbox", { name: "Intended symbol or expression" })
    .fill("127");
  await p.getByRole("button", { name: "Confirm this symbol" }).click();
  await p.evaluate(() => window.releaseValidation());
  await p
    .getByRole("alert")
    .filter({ hasText: /Out-of-date validation/ })
    .waitFor();
  assert.equal(await p.evaluate(() => window.confirmed), undefined);
  assert.equal(await p.getByLabel("Validator feedback").count(), 0);
  await context.close();
});
