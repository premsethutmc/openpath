// Bake: turn the drawn layers into the raster textures the game actually loads.
//   node tools/bake.mjs            -> build/raw/*.png + build/raw/meta.json
// then tools/pack.py packs the character into an atlas and encodes everything as WebP.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { commonDefs } from "../art/defs.mjs";
import { mom, GROUND } from "../art/mom.mjs";
import { home, homeDefs, W, H, FLOOR, DOOR } from "../art/home.mjs";
import { launch } from "./browser.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "build/raw");
mkdirSync(out, { recursive: true });
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><body style="margin:0;background:transparent"><div id="host" style="position:absolute;left:0;top:0"></div></body>`);
const defs = commonDefs() + homeDefs();
const meta = { ground: GROUND, world: { w: W, h: H, floor: FLOOR, door: DOOR }, parts: {}, layers: {} };

async function shoot(name, body, box, scale) {
  const w = Math.ceil(box.w * scale), h = Math.ceil(box.h * scale);
  await page.setViewportSize({ width: Math.max(64, w), height: Math.max(64, h) });
  await page.evaluate(([d, b, bx, w, h]) => {
    document.getElementById("host").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" id="s" width="${w}" height="${h}" viewBox="${bx.x} ${bx.y} ${bx.w} ${bx.h}" style="display:block"><defs>${d}</defs>${b}</svg>`;
  }, [defs, body, box, w, h]);
  await page.waitForTimeout(30);
  await page.locator("#s").screenshot({ path: join(out, name + ".png"), omitBackground: true });
}

// Character parts: measure the drawing, add room for the filters to spill, then shoot.
for (const p of mom.parts) {
  await page.evaluate(([d, b]) => {
    document.getElementById("host").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" style="overflow:visible"><defs>${d}</defs><g id="m">${b}</g></svg>`;
  }, [defs, p.body]);
  const bb = await page.evaluate(() => { const r = document.getElementById("m").getBBox(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const pad = p.id === "shadow" ? 90 : 14;
  const box = { x: Math.floor(bb.x - pad), y: Math.floor(bb.y - pad), w: Math.ceil(bb.w + pad * 2), h: Math.ceil(bb.h + pad * 2) };
  await shoot("p_" + p.id, p.body, box, p.scale);
  meta.parts[p.id] = { box, scale: p.scale, pivot: p.pivot, group: p.group, strip: !!p.strip };
  process.stdout.write(".");
}
for (const l of home.layers) {
  const box = { x: l.x, y: l.y, w: l.w, h: l.h };
  await shoot("l_" + l.id, l.body, box, l.scale);
  meta.layers[l.id] = { box, scale: l.scale, depth: l.depth ?? 1, blend: l.blend || "normal", at: l.at || null };
  process.stdout.write("#");
}
writeFileSync(join(out, "meta.json"), JSON.stringify(meta, null, 1));
await browser.close();
console.log("\nbaked", Object.keys(meta.parts).length, "parts,", Object.keys(meta.layers).length, "layers");
