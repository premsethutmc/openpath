import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
test('mobile actual Django: error, optional escalating help, retry, correction and saved resume', async () => {
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium'});
 const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
 const p=await context.newPage();p.setDefaultTimeout(20000);
 try {
 await p.goto(process.env.E2E_URL || 'http://127.0.0.1:4710');
 await p.getByRole('button',{name:'Try OpenPath as a Demo Student',exact:true}).click();
 const input=p.locator('.paper-cursor');
 async function digit(n){await input.press(n);await p.getByText('Saved',{exact:true}).waitFor();}
 await input.waitFor();await digit('2');
 await p.getByText('Want a little help?',{exact:true}).waitFor();
 assert.equal(await p.locator('[data-entry="quotient:0"]').innerText(),'2');
 assert.equal(await p.locator('.paper-error').count(),1);
 await input.evaluate(el=>{window.recoveryBlurCount=0;el.addEventListener('blur',()=>window.recoveryBlurCount++);});
 await p.getByRole('button',{name:'Give me a hint',exact:true}).tap();
 await p.getByText('How many whole groups of the divisor fit in the number you are working with?',{exact:true}).waitFor();
 assert.ok(await input.evaluate(el=>el===document.activeElement));
 assert.equal(await p.evaluate(()=>window.recoveryBlurCount),0);
 await p.getByRole('button',{name:'Try again',exact:true}).tap();
 await p.locator('.workspace-recovery').waitFor({state:'hidden'});
 await digit('2');
 await p.getByRole('button',{name:'Give me a hint',exact:true}).tap();
 await p.getByRole('button',{name:'More help',exact:true}).tap();
 await p.getByText(/For a different example, 8 ÷ 3/).waitFor();
 await digit('2');
 await p.getByRole('button',{name:'Give me a hint',exact:true}).tap();
 await p.getByRole('button',{name:'More help',exact:true}).tap();
 await p.getByText(/For a different example/).waitFor();
 await p.getByRole('button',{name:'More help',exact:true}).tap();
 await p.getByText(/Try counting equal groups/).waitFor();
 await p.reload();await p.getByText(/Try counting equal groups/).waitFor();
 await p.getByRole('button',{name:'Try again',exact:true}).tap();
 await digit('1');await p.getByLabel('Multiply row 1',{exact:true}).waitFor();
 assert.equal(await p.locator('[data-entry="quotient:0"]').innerText(),'1');
 assert.equal(await p.locator('.paper-error').count(),0);
 await input.press('3');await p.getByLabel('Subtract row 1',{exact:true}).waitFor();
 await input.press('0');await p.getByLabel('Quotient place 2',{exact:true}).waitFor();
 await p.getByRole('button',{name:'Quotient place 1: 1',exact:true}).click();
 await digit('2');await p.getByText('Want a little help?',{exact:true}).waitFor();
 assert.equal(await p.locator('[data-entry="product:0"]').innerText(),'−\n3');
 await p.getByRole('button',{name:'Try again',exact:true}).tap();await digit('1');
 assert.equal(await p.locator('[data-entry="difference:0"]').innerText(),'0');
 await input.press('Enter');await p.getByLabel('Subtract row 1',{exact:true}).waitFor();
 await input.press('Enter');await p.getByLabel('Quotient place 2',{exact:true}).waitFor();
 for (const [n,label] of [['2','Multiply row 2'],['6','Subtract row 2'],['1','Quotient place 3'],['6','Multiply row 3']]) {
   await input.press(n);await p.getByLabel(label,{exact:true}).waitFor();
 }
 await digit('1');
 await p.getByText('Keep typing. Tap Done or press Enter to finish this number.',{exact:true}).waitFor();
 assert.equal(await p.locator('.workspace-recovery').count(),0);
 await input.press('8');await p.getByLabel('Subtract row 3',{exact:true}).waitFor();
 await input.press('1');await p.getByText('Finished! 379 ÷ 3 = 126 remainder 1.',{exact:true}).waitFor();
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 } finally {await browser.close();}
});
