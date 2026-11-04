// usage: ROOT=<repo root> bun run-corpus.ts <corpus.json> <out.json>   (ROOT selects the engine under test: new commit or its parent)
import { readFileSync, writeFileSync } from "node:fs";
const root = process.env.ROOT ?? "/home/claude/cert";
const { assessMathematicalWorking } = await import(`${root}/packages/learning/src/unified-math-engine.ts`);
const corpus = JSON.parse(readFileSync(process.argv[2], "utf8")) as any[];
const out: any[] = [];
for (const c of corpus) { const t = performance.now(); let cls = "error", fi: number | null = null; try { const r: any = await assessMathematicalWorking({ domain: c.domain, statement: c.statement } as never, { format: "natural", text: c.lines.join("\n") } as never); cls = r.classification; fi = r.firstInvalidStep ?? null; } catch (e) { cls = "error:" + String(e).slice(0, 80); } out.push({ id: c.id, category: c.category, expect: c.expect, firstInvalid: c.firstInvalid, got: cls, gotInvalid: fi, ms: +(performance.now() - t).toFixed(2), statement: c.statement, lines: c.lines, note: c.note }); }
writeFileSync(process.argv[3], JSON.stringify(out));
console.log(out.length, "cases");
