import { chintooSvg, chintooDefs } from "../../src/art/chintoo.ts";
import { birdSvg, birdDefs } from "../../src/art/bird.ts";
import { PROP_ART, propDefs } from "../../src/art/props.ts";
import { SCENES, sceneDefs } from "../../src/art/scenes.ts";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
const dir = process.argv[2];
const page = (scene: string, extra: string) => `<!doctype html><body style="margin:0"><svg viewBox="0 0 1600 900" width="1600" height="900" xmlns="http://www.w3.org/2000/svg"><defs>${chintooDefs}${birdDefs}${propDefs}${sceneDefs}</defs>${SCENES[scene].back}${extra}${SCENES[scene].front ?? ""}</svg></body>`;
const g = (x:number,y:number,s:number,c:string)=>`<g transform="translate(${x} ${y}) scale(${s})">${c}</g>`;
writeFileSync(dir+"/garden.html", page("garden", g(1210,446,1,birdSvg)+g(600,820,1,chintooSvg)+g(880,380,1,PROP_ART.apple.red)+g(1000,330,1,PROP_ART.apple.green)+g(1120,400,1,PROP_ART.apple.yellow)+g(760,830,0.8,PROP_ART.basket.plain)+g(1180,815,1,PROP_ART.apple.muddy)));
writeFileSync(dir+"/bedroom.html", page("bedroom", g(520,790,1,chintooSvg)));
writeFileSync(dir+"/closeup.html", `<!doctype html><body style="margin:0;background:#eee"><svg viewBox="-200 -340 700 360" width="1400" height="720"><defs>${chintooDefs}${birdDefs}</defs>${g(0,0,1,chintooSvg)}${g(330,0,1.6,birdSvg)}</svg></body>`);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
for (const n of ["garden","bedroom"]) { await p.goto("file://"+dir+"/"+n+".html"); await p.screenshot({ path: dir+"/"+n+".png" }); }
await p.setViewportSize({width:1400,height:720}); await p.goto("file://"+dir+"/closeup.html"); await p.screenshot({ path: dir+"/closeup.png" });
await b.close();
