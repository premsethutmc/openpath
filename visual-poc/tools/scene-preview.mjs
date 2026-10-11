// Drawing aid: every layer of the room plus Amma in her final spot, as one still picture.
//   node tools/scene-preview.mjs out.png [zoom] [x y w h]
import { writeFileSync } from "node:fs";
import { commonDefs } from "../art/defs.mjs";
import { mom, GROUND } from "../art/mom.mjs";
import { home, homeDefs, W, H } from "../art/home.mjs";
import { launch } from "./browser.mjs";
const [, , out = "/tmp/scene.png", zoom = "0.5", ...box] = process.argv;
const [bx, by, bw, bh] = box.length === 4 ? box.map(Number) : [0, 0, W, H];
const P = Object.fromEntries(mom.parts.map((p) => [p.id, p]));
const L = Object.fromEntries(home.layers.map((l) => [l.id, l]));
const draw = (id, tf = "") => (P[id] ? `<g transform="${tf} ${P[id].place}">${P[id].body}</g>` : "");
const mirror = (id) => (P[id] ? `<g transform="scale(-1 1)"><g transform="${P[id].place}">${P[id].body}</g></g>` : "");
const lay = (id) => (L[id].at ? `<g transform="translate(${L[id].at})">${L[id].body}</g>` : L[id].body);
const S = 1.14;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bx} ${by} ${bw} ${bh}" width="${bw * zoom}" height="${bh * zoom}">
<defs>${commonDefs()}${homeDefs()}</defs>
${lay("out")}${lay("far")}${lay("wall")}${lay("floor")}${lay("furniture")}${lay("swing")}
<ellipse cx="1210" cy="1396" rx="210" ry="30" fill="#2B0A12" opacity=".5" filter="url(#b14)"/>
<g transform="translate(1200 1390) scale(${S}) translate(0 ${-GROUND})">${mom.assemble({ draw, mirror, P })}</g>
<g transform="translate(1490 925) scale(1.0)">${P.bag.body}</g>
${lay("fg")}
<g style="mix-blend-mode:screen">${lay("shafts")}</g>
${lay("vignette")}
</svg>`;
writeFileSync("/tmp/scene-preview.html", `<!doctype html><body style="margin:0;background:#000">${svg}</body>`);
const b = await launch();
const pg = await b.newPage({ viewport: { width: Math.ceil(bw * zoom), height: Math.ceil(bh * zoom) } });
const errs = []; pg.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await pg.goto("file:///tmp/scene-preview.html"); await pg.waitForTimeout(400);
await pg.screenshot({ path: out }); await b.close();
console.log("scene", out, errs.length ? errs : "ok");
