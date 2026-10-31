/** Disabled drawing policy at shared entry points, separately from read-only archive compatibility. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';
test('drawing tasks remain unavailable, not converted to final answers; archived drawings still render read-only', async () => {
    const b = await build({ stdin: { loader: 'tsx', resolveDir: process.cwd(), contents: `
 import {createRoot} from 'react-dom/client';
 import {AnswerInput} from './src/year/Learn';
 import {SketchPad,SketchView,writeDrawing,readDrawing} from './src/year/SketchPad';
 import {writtenTasks} from '../packages/learning/src/written';
 const raw=writeDrawing({text:'Archived triangle',s:[['l',20,20,200,200],['l',200,200,20,200]]});window.archive=raw;
 const task=writtenTasks.find(t=>t.answer==='drawing');window.task=task.id;
 createRoot(document.getElementById('root')).render(<><h1>Shared policy entry points</h1><AnswerInput q={{id:task.id,type:'written'}} value={raw} setValue={()=>{throw Error('Archive must stay unchanged')}} disabled={false}/><SketchPad value={raw} onChange={()=>{throw Error('Deferred editor must not mount')}}/><SketchView raw={raw}/><pre>{JSON.stringify(readDrawing(raw))}</pre></>);
 ` }, jsx: 'automatic', bundle: true, write: false, format: 'esm', target: 'es2022' });
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
    try {
        const page = await browser.newPage();
        await page.route('**/policy.html', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div><script type="module" src="/policy.js"></script>' }));
        await page.route('**/policy.js', r => r.fulfill({ contentType: 'text/javascript', body: b.outputFiles[0].text }));
        await page.goto('http://localhost/policy.html');
        await page.getByRole('note').filter({ hasText: 'unavailable with keyboard input' }).waitFor();
        assert.equal(await page.locator('input,textarea,canvas,.sketchpad').count(), 0);
        assert.equal(await page.getByRole('button').count(), 0);
        assert.equal(await page.getByRole('img', { name: 'A drawing: 2 straight lines.' }).count(), 1);
        await page.getByText('Archived triangle', { exact: true }).waitFor();
        assert.match(await page.locator('pre').innerText(), /\["l",20,20,200,200\]/);
        assert.match(await page.evaluate(() => window.archive), /^draw@1 /);
    }
    finally {
        await browser.close();
    }
});
