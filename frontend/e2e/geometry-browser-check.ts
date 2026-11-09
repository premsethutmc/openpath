import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Page } from 'playwright';
/** Real touch and native keyboard controls, never a mutation of application state. */
export async function checkTriangleInteraction(page: Page, shots: string) {
  mkdirSync(shots,{recursive:true});
  const lab=page.locator('.lesson [data-triangle-lab="interactive"]');
  await lab.locator('[data-board-ready="true"]').waitFor();
  assert.equal(await lab.locator('input[type=range]').count(),2);
  writeFileSync(`${shots}/static-explore.svg`,await lab.locator('.triangle-print svg').evaluate(el=>el.outerHTML));
  const start=await lab.getAttribute('data-c-x');
  const handle=lab.locator('[data-vertex="C"]');await handle.scrollIntoViewIfNeeded();
  const box=(await handle.boundingBox())!;assert.ok(box);
  const x=box.x+box.width/2,y=box.y+box.height/2,cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-10*i,y:y-4*i}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  await page.waitForFunction(before=>document.querySelector('.lesson [data-triangle-lab]')?.getAttribute('data-c-x')!==before,start);
  assert.match(await lab.locator('[data-angle-sum]').innerText(),/180.0/);
  const height=lab.getByLabel('Raise or lower C');await height.focus();await height.press('Home');
  await lab.locator('[data-degenerate]').waitFor();assert.equal(await lab.locator('[data-angle-sum]').count(),0);
  assert.equal(await lab.locator('.triangle-proof').count(),0);
  await page.screenshot({path:`${shots}/mobile-degenerate.png`,fullPage:true,animations:'disabled'});
  await height.press('ArrowRight');await height.press('ArrowRight');
  await lab.locator('[data-angle-sum]').waitFor();
  await lab.getByRole('button',{name:'Show parallel line'}).click();
  assert.ok((await lab.locator('.triangle-proof').innerText()).includes('alternate interior'));
  await page.screenshot({path:`${shots}/mobile-shallow.png`,fullPage:true,animations:'disabled'});
  await lab.locator('.triangle-board').screenshot({path:`${shots}/mobile-shallow-diagram.png`,animations:'disabled'});
  await lab.getByRole('button',{name:'Reset triangle'}).focus();await page.keyboard.press('Enter');
  assert.deepEqual(await lab.locator('dd').allTextContents(),['30.0°','90.0°','60.0°']);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),'no horizontal overflow at393px');
  writeFileSync(`${shots}/static-diagram.svg`,await lab.locator('.triangle-print svg').evaluate(el=>el.outerHTML));
  const proof=lab.locator('.triangle-proof');
  await proof.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  assert.ok(await proof.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.bottom-20);return !!hit&&el.contains(hit)}),'final proof text can be scrolled clear of sticky controls');
  await proof.screenshot({path:`${shots}/mobile-proof.png`,animations:'disabled'});
  await lab.locator('.triangle-board').screenshot({path:`${shots}/mobile-normal-diagram.png`,animations:'disabled'});
  // A genuine desktop context, mounted at its own viewport (not a resized mobile screenshot).
  const desktopContext=await page.context().browser()!.newContext({viewport:{width:1280,height:900},storageState:await page.context().storageState()});
  try {
    const desktop=await desktopContext.newPage();await desktop.goto(page.url());
    const desktopLab=desktop.locator('.lesson [data-triangle-lab="interactive"]');
    await desktopLab.locator('[data-board-ready="true"]').waitFor();
    assert.deepEqual(await desktopLab.locator('dd').allTextContents(),['30.0°','90.0°','60.0°']);
    await desktopLab.getByRole('button',{name:'Show parallel line'}).click();
    await desktopLab.locator('.triangle-board').screenshot({path:`${shots}/desktop-diagram.png`,animations:'disabled'});
  } finally {await desktopContext.close()}
  // Restore the initial exploration screen; reset changes geometry, not the visibility of the explanation.
  await lab.getByRole('button',{name:'Hide parallel line'}).click();
}
