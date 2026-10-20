// Rasterize static design artifacts. Does not import or modify the application.
import { chromium } from '../../../frontend/node_modules/playwright/index.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const dir=fileURLToPath(new URL('.',import.meta.url));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});
for (const width of [360,393]) {
  const page=await browser.newPage({viewport:{width,height:width===360?800:852},deviceScaleFactor:2});
  for (const state of ['working','mistake','completed','working-in-progress']) {
    const svg=await readFile(`${dir}${state}-${width}.svg`,'utf8');
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await page.screenshot({path:`${dir}${state}-${width}.png`});
  }
  await page.close();
}
// Contact sheets are review artifacts, not product screens.
for (const width of [360,393]) {
  const height=width===360?800:852;
  let parts=[];
  for (const [index,state] of ['working','mistake','completed'].entries()) {
    const png=await readFile(`${dir}${state==='working'?'working-in-progress':state}-${width}.png`);
    parts.push(`<text x="${24+index*(width+24)}" y="46" font-family="sans-serif" font-size="15" fill="#62656C">${index+1}. ${state[0].toUpperCase()+state.slice(1)}</text><image x="${24+index*(width+24)}" y="66" width="${width}" height="${height}" href="data:image/png;base64,${png.toString('base64')}"/>`);
  }
  const total=3*width+96;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${height+90}"><rect width="100%" height="100%" fill="#E8EFEB"/>${parts.join('')}</svg>`;
  await writeFile(`${dir}review-${width}.svg`,svg);
  const page=await browser.newPage({viewport:{width:total,height:height+90}});
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.screenshot({path:`${dir}review-${width}.png`});
  await page.close();
}
await browser.close();
