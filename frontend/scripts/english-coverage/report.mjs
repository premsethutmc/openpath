// Maps Chromium coverage of the English bundle (collected by preload.mjs) back to source files through the source map
// and prints line coverage: node scripts/english-coverage/report.mjs [dist-english]
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { SourceMapConsumer } = require("source-map");
const DIST = process.argv[2] ?? "dist-english";
const RAW = process.env.COVERAGE_RAW ?? "/tmp/english-coverage";
const raw = readdirSync(RAW).map((f) => JSON.parse(readFileSync(`${RAW}/${f}`, "utf8"))).flat();
const byFile = new Map();
for (const e of raw) {
  const name = new URL(e.url).pathname.split("/").pop();
  if (!byFile.has(name)) byFile.set(name, []);
  byFile.get(name).push(e.functions);
}
const lines = new Map(); // source -> Map(line -> covered bool)
for (const [name, runs] of byFile) {
  const js = `${DIST}/assets/${name}`;
  if (!existsSync(js) || !existsSync(js + ".map")) continue;
  const code = readFileSync(js, "utf8");
  const hit = new Uint8Array(code.length);
  for (const fns of runs) {
    const ranges = fns.flatMap((f) => f.ranges).sort((a, b) => b.endOffset - b.startOffset - (a.endOffset - a.startOffset));
    const paint = new Int8Array(code.length).fill(-1);
    for (const r of ranges) paint.fill(r.count > 0 ? 1 : 0, r.startOffset, r.endOffset);
    for (let i = 0; i < code.length; i++) if (paint[i] === 1) hit[i] = 1;
  }
  const starts = [0];
  for (let i = 0; i < code.length; i++) if (code.charCodeAt(i) === 10) starts.push(i + 1);
  const map = await new SourceMapConsumer(JSON.parse(readFileSync(js + ".map", "utf8")));
  map.eachMapping((m) => {
    if (!m.source || !/src\/english\//.test(m.source) || /\.test\./.test(m.source)) return;
    const src = m.source.replace(/^.*?src\/english\//, "src/english/");
    const off = starts[m.generatedLine - 1] + m.generatedColumn;
    if (!lines.has(src)) lines.set(src, new Map());
    const L = lines.get(src);
    L.set(m.originalLine, (L.get(m.originalLine) ?? false) || hit[off] === 1);
  });
  map.destroy?.();
}
const rows = [...lines].map(([src, L]) => { const t = L.size, c = [...L.values()].filter(Boolean).length; return { src, t, c, pct: (100 * c) / t }; });
const sum = (f) => { const r = rows.filter(f); const t = r.reduce((a, x) => a + x.t, 0), c = r.reduce((a, x) => a + x.c, 0); return `${((100 * c) / t).toFixed(1)}% (${c}/${t} lines, ${r.length} files)`; };
console.log("ALL", sum(() => true));
console.log("UI ", sum((x) => x.src.includes("/ui/")));
console.log("LOGIC", sum((x) => !x.src.includes("/ui/")));
for (const r of rows.filter((x) => x.src.includes("/ui/")).sort((a, b) => a.pct - b.pct)) console.log(`${r.pct.toFixed(1).padStart(5)}  ${String(r.c).padStart(4)}/${String(r.t).padEnd(4)} ${r.src}`);
