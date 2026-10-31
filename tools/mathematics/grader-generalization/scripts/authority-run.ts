// usage: ROOT=<repo> bun authority-run.ts <corpus.json> <out.json>  -- authority API only (assessChain + independent replay of every verified chain)
import { readFileSync, writeFileSync } from "node:fs";
const root = process.env.ROOT!;
const A = await import(`${root}/packages/learning/src/derivation-authority.ts`);
const corp = JSON.parse(readFileSync(process.argv[2], "utf8")); const out: any[] = []; let rn = 0, rf = 0; const ms: number[] = [];
for (const c of corp) { const t = performance.now(); const v = A.assessChain(c.statement, c.lines); ms.push(performance.now() - t);
  let rp = null; if (v.status === "verified") { rn++; const r = A.replayDerivationChain(c.statement, c.lines, v.chain); rp = r.ok; if (!r.ok) rf++; }
  out.push({ id: c.id, category: c.category, expect: c.expect, firstInvalid: c.firstInvalid, got: v.status, gotInvalid: v.status === "invalid" ? v.at : null, reason: v.reason, replay: rp, ...(v.evidence ? { evidence: v.evidence } : {}) }); }
writeFileSync(process.argv[3], JSON.stringify(out)); ms.sort((a, b) => a - b);
console.log(process.argv[2].split("/").pop(), "verified-replayed", rn, "replay-failures", rf, "ms p50", ms[Math.floor(ms.length / 2)].toFixed(2), "p99", ms[Math.floor(ms.length * 0.99)].toFixed(2), "max", ms[ms.length - 1].toFixed(1));
