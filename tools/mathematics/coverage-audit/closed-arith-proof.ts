// Stage 5 proof: one invariant (closed-arithmetic.ts) across unrelated families, through the real entry point (decide → assessSubmission → answer-first checker).
// Usage: bun closed-arith-proof.ts out.json [perFamily=40]
import { writeFileSync } from "node:fs";
import { CLOSED_ARITHMETIC_FAMILIES } from "../../../packages/learning/src/closed-arithmetic.ts";
import { pool, problemOf } from "../../../packages/learning/src/families.ts";
import { contractFor } from "../../../packages/learning/src/assessment.ts";
import { decide } from "../../../packages/learning/src/grade.ts";
type Q = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const mk = (n: bigint, d: bigint): Q => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
function parse(s: string): Q | null {
  const t = s.replace(/−/g, "-").trim(); let m = t.match(/^([+-]?\d+)\/(\d+)$/); if (m) return Number(m[2]) ? mk(BigInt(m[1]), BigInt(m[2])) : null;
  m = t.match(/^([+-]?)(\d*)\.?(\d*)$/); if (!m || (!m[2] && !m[3])) return null; const f = m[3].length; return mk(BigInt(m[1] + (m[2] || "0") + m[3]), 10n ** BigInt(f));
}
const same = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
const showDec = (q: Q): string | null => { let d = q.d, k = 0; while (d % 10n === 0n) { d /= 10n; k++; } let tw = 0, fi = 0; while (d % 2n === 0n) { d /= 2n; tw++; } while (d % 5n === 0n) { d /= 5n; fi++; } if (d !== 1n) return null; const p = k + Math.max(tw, fi); const scaled = q.n * 10n ** BigInt(p) / q.d; const s = (scaled < 0n ? -scaled : scaled).toString().padStart(p + 1, "0"); return (q.n < 0n ? "-" : "") + (p ? s.slice(0, -p) + "." + s.slice(-p) : s); };
const showFrac = (q: Q) => (q.d === 1n ? String(q.n) : `${q.n}/${q.d}`);
const N = Number(process.argv[3] ?? 40), rows: any[] = [], tally = { correct: [0, 0], equiv: [0, 0], wrong: [0, 0], boundary: [0, 0], unreadable: [0, 0] } as Record<string, number[]>;
const lat: number[] = []; const failures: string[] = [];
for (const fam of CLOSED_ARITHMETIC_FAMILIES) {
  const items = pool(fam).items.filter((i) => !i.id.endsWith(":mc")), step = Math.max(1, Math.floor(items.length / N)); const r = { family: fam, questions: 0, verified: 0, legacyOrOther: 0, correctAccepted: 0, equivAccepted: 0, equivTried: 0, wrongRejected: 0, wrongTried: 0, wrongAccepted: 0, unreadableUndecided: 0, unreadableTried: 0 };
  for (let i = 0; i < items.length && r.questions < N; i += step) {
    const id = items[i].id, pr = problemOf(id)!, c = contractFor(id)!; r.questions++;
    if (c.verification !== "verified") { r.legacyOrOther++; continue; } r.verified++;
    const v = parse(pr.answer); if (!v) continue;
    const t = (cat: string, resp: string, want: boolean | null) => { const t0 = performance.now(); const a = decide(id, resp); lat.push(performance.now() - t0); const ok = a.credit === want && (a.evidence.source === "kernel"); tally[cat][0]++; if (ok) tally[cat][1]++; else if (failures.length < 400) failures.push(`${cat} ${id} "${resp}" want ${want} got ${a.credit}/${a.evidence.source}`); return ok; };
    if (t("correct", pr.answer, true)) r.correctAccepted++;
    const isInt = v.d === 1n; const alts = [` ${pr.answer} `, ...(isInt ? [`${v.n}.0`, v.n >= 0n ? `+${v.n}` : `${v.n}.00`] : []), ...(v.d !== 1n ? [`${v.n * 2n}/${v.d * 2n}`] : []), ...(showDec(v) && v.d !== 1n ? [showDec(v)! + "0"] : [])];
    for (const alt of alts) { r.equivTried++; if (t("equiv", alt, true)) r.equivAccepted++; }
    const wr = [mk(v.n + v.d, v.d), mk(v.n - v.d, v.d), ...(v.n !== 0n ? [mk(-v.n, v.d)] : []), mk(v.n + 10n * v.d, v.d)];
    for (const w of wr) { if (same(w, v)) continue; const text = showDec(w) !== null && !pr.answer.includes("/") ? showDec(w)! : showFrac(w); r.wrongTried++; if (t("wrong", text, false)) r.wrongRejected++; else r.wrongAccepted++; }
    if (v.n === 0n) t("boundary", "-0", true); else if (v.n < 0n) t("boundary", String(pr.answer).replace("-", "+"), false); else t("boundary", `-${pr.answer}`, false);
    for (const u of ["abc", "1/0", "2/", "1..2", "one"]) { r.unreadableTried++; if (t("unreadable", u, null)) r.unreadableUndecided++; }
  }
  rows.push(r);
}
lat.sort((a, b) => a - b); const pct = (p: number) => lat[Math.floor(lat.length * p)] ?? 0;
const sum = { families: rows.length, questionsTried: rows.reduce((a, r) => a + r.questions, 0), verifiedTried: rows.reduce((a, r) => a + r.verified, 0), legacyTried: rows.reduce((a, r) => a + r.legacyOrOther, 0), tally, latencyMs: { p50: +pct(0.5).toFixed(3), p95: +pct(0.95).toFixed(3), p99: +pct(0.99).toFixed(3) }, failures };
writeFileSync(process.argv[2], JSON.stringify({ summary: sum, rows }));
console.log(JSON.stringify(sum));
