// Cross-family proof for typed generator contracts: real generated questions through decide() (the answer-first assessment entry point).
// Variants are derived from the STORED ANSWER STRUCTURE (tokens between brackets/commas), never from the prompt. Usage: bun typed-proof.ts out.json [perFamily=30]
import { writeFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
import { contractFor } from "../../../packages/learning/src/assessment.ts";
import { decide } from "../../../packages/learning/src/grade.ts";
type Q = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const mk = (n: bigint, d: bigint): Q => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
function parse(s: string): Q | null {
  const t = s.replace(/−/g, "-").trim(); let m = t.match(/^([+-]?\d+)\/(\d+)$/); if (m) return Number(m[2]) ? mk(BigInt(m[1]), BigInt(m[2])) : null;
  m = t.match(/^([+-]?)(\d*)\.?(\d*)$/); if (!m || (!m[2] && !m[3])) return null; return mk(BigInt(m[1] + (m[2] || "0") + m[3]), 10n ** BigInt(m[3].length));
}
const show = (q: Q) => (q.d === 1n ? String(q.n) : `${q.n}/${q.d}`);
const dec = (q: Q): string | null => { let d = q.d, k = 0; while (d % 10n === 0n) { d /= 10n; k++; } let tw = 0, fi = 0; while (d % 2n === 0n) { d /= 2n; tw++; } while (d % 5n === 0n) { d /= 5n; fi++; } if (d !== 1n) return null; const p = k + Math.max(tw, fi); const sc = (q.n * 10n ** BigInt(p)) / q.d; const s = (sc < 0n ? -sc : sc).toString().padStart(p + 1, "0"); return (q.n < 0n ? "-" : "") + (p ? s.slice(0, -p) + "." + s.slice(-p) : s); };
type Part = { sep: string } | { tok: string };
const split = (a: string): Part[] => { const out: Part[] = []; for (const m of a.matchAll(/([[\](),\s]+)|([^[\](),\s]+(?:\s+[^[\](),\s]+)*)/g)) out.push(m[1] !== undefined ? { sep: m[1] } : { tok: m[2] }); return out; };
const join = (ps: Part[]) => ps.map((p) => ("sep" in p ? p.sep : p.tok)).join("");
const N = Number(process.argv[3] ?? 30), cats = ["correct", "equivalent", "wrong", "boundary", "working", "unreadable"], tally: Record<string, { n: number; ok: number; credit: number; denied: number; unresolved: number }> = Object.fromEntries(cats.map((c) => [c, { n: 0, ok: 0, credit: 0, denied: 0, unresolved: 0 }]));
const dump: any[] = []; const lat: number[] = [], failures: string[] = [], rows: any[] = []; let falseAcc = 0, falseRej = 0;
for (const [fam, def] of FAMILIES) {
  if (def.contract?.kind !== "typed") continue;
  const items = pool(fam).items.filter((i) => !i.id.endsWith(":mc")), step = Math.max(1, Math.floor(items.length / (N * 3)));
  const r = { family: fam, sampled: 0, verified: 0, legacy: 0, checks: 0, passed: 0, falseAcc: 0, falseRej: 0, unresolvedWrong: 0 };
  for (let i = 0; i < items.length && r.sampled < N; i += step) {
    const id = items[i].id, pr = problemOf(id)!, c = contractFor(id)!;
    if (c.verification !== "verified") { r.legacy++; continue; } r.sampled++; r.verified++;
    const parts = split(pr.answer), toks = parts.map((p, k) => ("tok" in p ? k : -1)).filter((k) => k >= 0);
    const val = (k: number) => parse((parts[k] as { tok: string }).tok);
    const t = (cat: string, resp: string, want: boolean | null, working: string[] = []) => {
      const t0 = performance.now(); const a = decide(id, resp, working); lat.push(performance.now() - t0);
      const ok = want === false ? a.credit !== true : a.credit === want; // an incorrect answer must never be credited (false or unresolved are both safe)
      dump.push({ id, fam, cat, type: pr.type, stored: pr.answer, response: resp, want, kernel: a.credit, working: working.length > 0 }); const T = tally[cat]; T.n++; r.checks++; if (a.credit === true) T.credit++; else if (a.credit === false) T.denied++; else T.unresolved++;
      if (want === false && a.credit === null) r.unresolvedWrong++;
      if (ok) { T.ok++; r.passed++; } else { if (want === false && a.credit === true) { falseAcc++; r.falseAcc++; } if (want === true && a.credit !== true) { falseRej++; r.falseRej++; } if (failures.length < 300) failures.push(`${fam} ${cat} ${id} "${resp}" want ${want} got ${a.credit}/${a.evidence.source}`); }
    };
    const rebuild = (f: (k: number, q: Q) => string | null) => join(parts.map((p, k) => ("tok" in p ? { tok: (val(k) ? f(k, val(k)!) : null) ?? p.tok } : p)));
    t("correct", pr.answer, true);
    t("equivalent", ` ${pr.answer} `, true);
    t("equivalent", pr.answer.replace(/−/g, "-"), true);
    t("equivalent", pr.answer.replace(/,\s*/g, ","), true);
    if (toks.every((k) => val(k))) { // every token is a plain number: representation changes
      t("equivalent", rebuild((_, q) => (q.d === 1n ? `${q.n}.0` : null)), true);
      t("equivalent", rebuild((_, q) => `${q.n * 2n}/${q.d * 2n}`), true);
      t("equivalent", rebuild((_, q) => dec(q)), true);
    }
    for (const k of toks.slice(0, 3)) { // an opaque token (a root) in the same form as the generator writes it: √54 for 3√6
      const m = (parts[k] as { tok: string }).tok.replace(/−/g, "-").match(/^(-?)(\d+)√(\d+)$/);
      if (m) t("equivalent", join(parts.map((p, j) => (j === k ? { tok: `${m[1]}√${Number(m[2]) ** 2 * Number(m[3])}` } : p))), !m[1]);
    }
    // wrong: change one number token by 1; reorder two different tokens; negate the first
    for (const k of toks.slice(0, 3)) { const q = val(k); if (q) t("wrong", join(parts.map((p, j) => (j === k ? { tok: show(mk(q.n + q.d, q.d)) } : p))), false); }
    const first = toks.find((k) => val(k)); if (first !== undefined) { const q = val(first)!; t("boundary", join(parts.map((p, j) => (j === first ? { tok: show(mk(-q.n, q.d)) } : p))), q.n === 0n ? true : false); }
    if (toks.length >= 2) { const [a, b] = toks, va = val(a), vb = val(b); if (va && vb && (va.n !== vb.n || va.d !== vb.d)) t("boundary", join(parts.map((p, j) => (j === a ? { tok: (parts[b] as { tok: string }).tok } : j === b ? { tok: (parts[a] as { tok: string }).tok } : p))), false); }
    t("boundary", pr.answer + ", " + pr.answer, null);
    // working never changes the answer's credit; no step diagnosis exists for typed kernels (stated in the report)
    t("working", pr.answer, true, ["1 + 1 = 3", "so I get something else"]);
    if (first !== undefined) { const q = val(first)!; t("working", join(parts.map((p, j) => (j === first ? { tok: show(mk(q.n + q.d, q.d)) } : p))), false, ["x = 1", "x + 0 = 1"]); }
    for (const u of ["abc", "(1,", "[[1,2],[3]]", "1/0", "", "2..3"]) t("unreadable", u, null);
  }
  rows.push(r);
}
lat.sort((a, b) => a - b); const pct = (p: number) => +(lat[Math.floor(lat.length * p)] ?? 0).toFixed(3);
const sum = { families: rows.length, questionsTried: rows.reduce((a, r) => a + r.sampled, 0), legacySkipped: rows.reduce((a, r) => a + r.legacy, 0), tally, falseAcceptances: falseAcc, falseRejections: falseRej, latencyMs: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99) }, failures };
writeFileSync(process.argv[2], JSON.stringify({ summary: sum, rows }));
if (process.argv[4]) writeFileSync(process.argv[4], JSON.stringify(dump));
console.log(JSON.stringify({ ...sum, failures: failures.slice(0, 30) }));
