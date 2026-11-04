// usage: ROOT=<repo> bun integrity.ts <corpus.json>...  -- replay safeguards on every verified chain: own task, cross task, truncated, tampered, forged-consistent, move tampering
import { readFileSync } from "node:fs";
const A = await import(`${process.env.ROOT}/packages/learning/src/derivation-authority.ts`);
const { sha256Hex } = await import(`${process.env.ROOT}/packages/learning/src/digest.ts`);
const tot: Record<string, number> = { verified: 0, ownFail: 0, cross: 0, crossAcc: 0, trunc: 0, truncAcc: 0, tamper: 0, tamperAcc: 0, forged: 0, forgedAcc: 0, moveForged: 0, moveForgedAcc: 0, linesSwapped: 0, linesSwappedAcc: 0 };
const kinds: Record<string, number> = {};
for (const f of process.argv.slice(2)) {
  const corp = JSON.parse(readFileSync(f, "utf8"));
  const V = corp.map((c: any) => ({ c, v: A.assessChain(c.statement, c.lines) })).filter((x: any) => x.v.status === "verified");
  V.forEach((x: any, i: number) => {
    tot.verified++; for (const c of x.v.chain) kinds[c.move.kind] = (kinds[c.move.kind] ?? 0) + 1;
    if (!A.replayDerivationChain(x.c.statement, x.c.lines, x.v.chain).ok) tot.ownFail++;
    const y = V[(i + 7) % V.length]; const tx = A.normalizeTask(x.c.statement), ty = A.normalizeTask(y.c.statement);
    if (tx.ok && ty.ok && tx.task.digest !== ty.task.digest) { tot.cross++; if (A.replayDerivationChain(y.c.statement, x.c.lines, x.v.chain).ok) tot.crossAcc++; }
    if (x.v.chain.length > 1) { tot.trunc++; if (A.replayDerivationChain(x.c.statement, x.c.lines.slice(0, -1), x.v.chain).ok) tot.truncAcc++; }
    const cp = structuredClone(x.v.chain); cp[0].results = ["999"]; tot.tamper++; if (A.replayDerivationChain(x.c.statement, x.c.lines, cp).ok) tot.tamperAcc++;
    const relink = (fg: any[], edit: (b: any, k: number) => void) => { for (let k = 0; k < fg.length; k++) { const { digest, ...body } = fg[k]; edit(body, k); if (k > 0) body.dependencies = [{ line: fg[k - 1].line, digest: fg[k - 1].digest }]; fg[k] = { ...body, digest: sha256Hex(JSON.stringify(body)) }; } return fg; };
    tot.forged++; if (A.replayDerivationChain(x.c.statement, x.c.lines, relink(structuredClone(x.v.chain), (b, k) => { if (k === 0) b.results = ["999"]; })).ok) tot.forgedAcc++;
    tot.moveForged++; if (A.replayDerivationChain(x.c.statement, x.c.lines, relink(structuredClone(x.v.chain), (b, k) => { if (k === x.v.chain.length - 1) b.move = { kind: b.move.kind === "balance-add" ? "balance-multiply" : "balance-add", parameter: "+1" }; })).ok) tot.moveForgedAcc++;
    if (x.c.lines.length > 1) { tot.linesSwapped++; const ls = [...x.c.lines]; [ls[0], ls[1]] = [ls[1], ls[0]]; if (A.replayDerivationChain(x.c.statement, ls, x.v.chain).ok) tot.linesSwappedAcc++; }
  });
}
console.log(JSON.stringify(tot)); console.log(JSON.stringify(kinds));
