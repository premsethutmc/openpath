// Drawing aid: assemble the character's layers in their rest pose and render a sheet,
// so the illustration can be judged before it is baked and rigged.
//   node tools/sheet.mjs [out.png] [zoom] [cx cy w h]
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { commonDefs } from "../art/defs.mjs";
import { mom } from "../art/mom.mjs";
import { launch } from "./browser.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , out = "sheet.png", zoom = "1", ...box] = process.argv;
const [bx, by, bw, bh] = box.length === 4 ? box.map(Number) : [-330, -1040, 660, 1080];
const P = Object.fromEntries(mom.parts.map((p) => [p.id, p]));
const draw = (id, tf = "") => (P[id] ? `<g transform="${tf} ${P[id].place}">${P[id].body}</g>` : "");
const mirror = (id) => (P[id] ? `<g transform="scale(-1 1)"><g transform="${P[id].place}">${P[id].body}</g></g>` : "");

const body = (mom.assemble ? mom.assemble({ draw, mirror, P }) : "");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bx} ${by} ${bw} ${bh}" width="${bw * zoom}" height="${bh * zoom}">
<defs>${commonDefs()}</defs>
<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#F3E3C6"/>
${body}
</svg>`;
writeFileSync(join(root, "tools/.sheet.html"), `<!doctype html><body style="margin:0">${svg}</body>`);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: Math.ceil(bw * zoom), height: Math.ceil(bh * zoom) }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto("file://" + join(root, "tools/.sheet.html"));
await page.waitForTimeout(200);
await page.screenshot({ path: out });
console.log("sheet", out, errors.length ? errors : "ok");
await browser.close();
