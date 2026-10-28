// Cross-family proof for generator contracts: every family with a contract, through the real entry point (decide → assessSubmission → assessAnswerFirst).
// Expected results come from the stored answer's VALUE (exact rational arithmetic here), wrong answers from value arithmetic. Usage: bun contract-proof.ts out.json [perFamily=40]
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
const same = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
const showFrac = (q: Q) => (q.d === 1n ? String(q.n) : `${q.n}/${q.d}`);
const dec = (q: Q): string | null => { let d = q.d, k = 0; while (d % 10n === 0n) { d /= 10n; k++; } let tw = 0, fi = 0; while (d % 2n === 0n) { d /= 2n; tw++; } while (d % 5n === 0n) { d /= 5n; fi++; } if (d !== 1n) return null; const p = k + Math.max(tw, fi); const sc = (q.n * 10n ** BigInt(p)) / q.d; const s = (sc < 0n ? -sc : sc).toString().padStart(p + 1, "0"); return (q.n < 0n ? "-" : "") + (p ? s.slice(0, -p) + "." + s.slice(-p) : s); };
const N = Number(process.argv[3] ?? 40), cats = ["correct", "equivalent", "wrong", "boundary", "unreadable"], tally: Record<string, number[]> = Object.fromEntries(cats.map((c) => [c, [0, 0]]));
const lat: number[] = [], failures: string[] = [], rows: any[] = []; let falseAcc = 0, falseRej = 0;
for (const [fam, def] of FAMILIES) {
  if (!def.contract) continue; const kind = def.contract.kind;
  const items = pool(fam).items.filter((i) => !i.id.endsWith(":mc")), step = Math.max(1, Math.floor(items.length / N));
  const r = { family: fam, kind, sampled: 0, verified: 0, legacy: 0, checks: 0, passed: 0 };
  for (let i = 0; i < items.length && r.sampled < N; i += step) {
    const id = items[i].id, pr = problemOf(id)!, c = contractFor(id)!; r.sampled++;
    if (c.verification !== "verified") { r.legacy++; continue; } r.verified++;
    const els = pr.answer.split(/\s*,\s*/).map(parse); if (els.some((e) => !e)) continue; const vals = els as Q[];
    const t = (cat: string, resp: string, want: boolean | null) => { const t0 = performance.now(); const a = decide(id, resp); lat.push(performance.now() - t0);
      const ok = a.credit === want && a.evidence.source === "kernel"; tally[cat][0]++; r.checks++; if (ok) { tally[cat][1]++; r.passed++; } else { if (want === false && a.credit === true) falseAcc++; if (want === true && a.credit === false) falseRej++; if (failures.length < 300) failures.push(`${fam} ${cat} ${id} "${resp}" want ${want} got ${a.credit}/${a.evidence.source}`); } };
    const single = vals.length === 1, v = vals[0];
    t("correct", pr.answer, true);
    if (kind === "value") {
      t("equivalent", ` ${pr.answer} `, true);
      if (v.d === 1n) { t("equivalent", `${v.n}.0`, true); t("equivalent", v.n >= 0n ? `+${v.n}` : `${v.n}.00`, true); } else { t("equivalent", `${v.n * 2n}/${v.d * 2n}`, true); const dd = dec(v); if (dd) t("equivalent", dd + "0", true); }
      for (const w of [mk(v.n + v.d, v.d), mk(v.n - v.d, v.d), mk(v.n + 10n * v.d, v.d), ...(v.n !== 0n ? [mk(-v.n, v.d)] : [])]) { if (same(w, v)) continue; const d = dec(w); t("wrong", d !== null && !pr.answer.includes("/") ? d : showFrac(w), false); }
      t("boundary", v.n === 0n ? "-0" : showFrac(mk(-v.n, v.d)), v.n === 0n);
    } else if (kind === "var") {
      t("equivalent", `x = ${pr.answer}`, true); t("equivalent", `x=${pr.answer}`, true); if (v.d === 1n) t("equivalent", `${v.n}.0`, true);
      for (const w of [mk(v.n + v.d, v.d), mk(v.n - v.d, v.d), ...(v.n !== 0n ? [mk(-v.n, v.d)] : [])]) { if (!same(w, v)) t("wrong", `x = ${showFrac(w)}`, false); }
      t("boundary", `x = ${v.n === 0n ? "-0" : showFrac(mk(-v.n, v.d))}`, v.n === 0n);
    } else {
      t("equivalent", [...vals].reverse().map(showFrac).join(", "), true); t("equivalent", `{${[...vals].reverse().map(showFrac).join(",")}}`, true); t("equivalent", vals.map((x) => `x = ${showFrac(x)}`).join(" or "), true);
      if (vals.length > 1) t("boundary", vals.slice(1).map(showFrac).join(", "), false);                         // an incomplete solution set is not credited
      { let k = 1n; let ex = mk(vals[0].n + k * vals[0].d, vals[0].d); while (vals.some((x) => same(x, ex))) { k++; ex = mk(vals[0].n + k * vals[0].d, vals[0].d); } t("boundary", [...vals.map(showFrac), showFrac(ex)].join(", "), false); }   // an extra, wrong solution
      t("wrong", vals.map((x) => showFrac(mk(x.n + x.d, x.d))).join(", "), false);
    }
    for (const u of ["abc", "1/0", "2/", "1..2", "one"]) t("unreadable", u, null);
  }
  rows.push(r);
}
lat.sort((a, b) => a - b); const pct = (p: number) => +(lat[Math.floor(lat.length * p)] ?? 0).toFixed(3);
const sum = { families: rows.length, byKind: Object.fromEntries(["value", "var", "set"].map((k) => [k, rows.filter((r) => r.kind === k).length])), questionsTried: rows.reduce((a, r) => a + r.sampled, 0), verifiedTried: rows.reduce((a, r) => a + r.verified, 0), legacyTried: rows.reduce((a, r) => a + r.legacy, 0), tally, falseAcceptances: falseAcc, falseRejections: falseRej, latencyMs: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99) }, failures };
writeFileSync(process.argv[2], JSON.stringify({ summary: sum, rows }));
console.log(JSON.stringify({ ...sum, failures: failures.slice(0, 25) }));
