// usage: bun final-checks.ts <corpus.json>   -- route decision counts through the engine, and cross-task / truncated / tampered / forged-consistent replay on every verified authority chain
import { readFileSync } from "node:fs";
import { assessMathematicalWorking } from "/home/claude/cert/packages/learning/src/unified-math-engine.ts";
import { ROUTE_STATS, assessChain, replayDerivationChain, normalizeTask } from "/home/claude/cert/packages/learning/src/derivation-authority.ts";
import { sha256Hex } from "/home/claude/cert/packages/learning/src/digest.ts";
import { stopGeometryWorkers } from "/home/claude/cert/packages/learning/src/geometry-worker.ts";
const corp = JSON.parse(readFileSync(process.argv[2], "utf8"));
const byDomain: Record<string, { calls: number; authorized: number; refusedUnjustified: number; refusedUnrecognized: number; verified: number }> = {};
for (const c of corp) { const b = { ...ROUTE_STATS }; const r: any = await assessMathematicalWorking({ domain: c.domain, statement: c.statement } as any, { format: "natural", text: c.lines.join("\n") } as any);
  const d = (byDomain[c.domain] ??= { calls: 0, authorized: 0, refusedUnjustified: 0, refusedUnrecognized: 0, verified: 0 }); d.calls++; d.verified += r.classification === "verified" ? 1 : 0;
  d.authorized += ROUTE_STATS.authorized - b.authorized; d.refusedUnjustified += ROUTE_STATS.refusedUnjustified - b.refusedUnjustified; d.refusedUnrecognized += ROUTE_STATS.refusedUnrecognized - b.refusedUnrecognized; }
console.log("route decisions by engine domain (line-level):"); console.table(byDomain);
const V = corp.map((c: any) => ({ c, v: assessChain(c.statement, c.lines) })).filter((x: any) => x.v.status === "verified");
let cross = 0, crossAcc = 0, same = 0, trunc = 0, trAcc = 0, tamper = 0, tamAcc = 0, forged = 0, forgedAcc = 0, self = 0, selfFail = 0;
V.forEach((x: any, i: number) => {
  const r0 = replayDerivationChain(x.c.statement, x.c.lines, x.v.chain); self++; if (!r0.ok) selfFail++;
  const y = V[(i + 7) % V.length]; const tx = normalizeTask(x.c.statement), ty = normalizeTask(y.c.statement);
  if (tx.ok && ty.ok && tx.task.digest === ty.task.digest) same++; else { cross++; if (replayDerivationChain(y.c.statement, x.c.lines, x.v.chain).ok) crossAcc++; }
  if (x.v.chain.length > 1) { trunc++; if (replayDerivationChain(x.c.statement, x.c.lines.slice(0, -1), x.v.chain).ok) trAcc++; }
  const cp = structuredClone(x.v.chain); cp[0].results = ["999"]; tamper++; if (replayDerivationChain(x.c.statement, x.c.lines, cp).ok) tamAcc++;
  // forged but self-consistent: change the first certificate's result, recompute its digest and re-link all later dependencies
  const fg = structuredClone(x.v.chain) as any[]; for (let k = 0; k < fg.length; k++) { const { digest, ...body } = fg[k]; if (k === 0) body.results = ["999"]; else body.dependencies = [{ line: fg[k - 1].line, digest: fg[k - 1].digest }]; fg[k] = { ...body, digest: sha256Hex(JSON.stringify(body)) }; }
  forged++; if (replayDerivationChain(x.c.statement, x.c.lines, fg).ok) forgedAcc++;
});
console.log({ verifiedChains: V.length, ownTaskReplayFailures: selfFail, crossTaskReplays: cross, crossTaskAccepted: crossAcc, sameTaskPairsSkipped: same, truncatedTested: trunc, truncatedAccepted: trAcc, tamperedTested: tamper, tamperedAccepted: tamAcc, forgedConsistentTested: forged, forgedConsistentAccepted: forgedAcc });
stopGeometryWorkers();
