// Scores results-raw.json against the frozen labels.json (+ blind audit.json). Does not modify any original file; writes score-summary.json and disagreements.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const here = new URL("./", import.meta.url).pathname;
const L = new Map<string, any>(JSON.parse(readFileSync(here + "labels.json", "utf8")).map((l: any) => [l.id, l]));
const R = JSON.parse(readFileSync(here + "results-raw.json", "utf8")); const rows: any[] = R.rows;
const A = new Map<string, any>(existsSync(here + "audit.json") ? JSON.parse(readFileSync(here + "audit.json", "utf8")).map((a: any) => [a.id, a]) : []);
const cnt = (a: any[], f: (x: any) => string) => a.reduce((m: any, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
const S: any = { commit: R.commit, n: rows.length };
const j = rows.map((r) => ({ ...r, l: L.get(r.id) })).filter((r) => r.l);
const isErr = (r: any) => !!r.err; const fin = (r: any) => (isErr(r) ? "error" : r.final);
const contested = (r: any) => { const a = A.get(r.id); return a && a.verdict !== r.l.exp && !(r.l.alt ?? []).includes(a.verdict) ? a : null; };
function block(set: any[]) { const exact = set.filter((r) => fin(r) === r.l.exp).length, acc = set.filter((r) => fin(r) !== r.l.exp && (r.l.alt ?? []).includes(fin(r))).length;
  const fa = set.filter((r) => fin(r) === "verified" && r.l.exp !== "verified"), fr = set.filter((r) => r.l.exp === "verified" && fin(r) !== "verified");
  const uns = set.filter((r) => fin(r) === "unsupported");
  return { n: set.length, exact, exactPct: +(100 * exact / (set.length || 1)).toFixed(1), acceptableAlt: acc, falseAcceptances: fa.length, falseRejections: fr.length, falseRejectionsAsInvalid: fr.filter((r) => fin(r) === "invalid").length, engineUnsupported: uns.length, engineUnsupportedWhereExpVerified: uns.filter((r) => r.l.exp === "verified").length, errors: set.filter(isErr).length, verifiedExpVerified: set.filter((r) => fin(r) === "verified" && r.l.exp === "verified").length, expVerified: set.filter((r) => r.l.exp === "verified").length }; }
S.all = block(j); const unc = j.filter(contested); S.contestedLabelCount = unc.length; S.uncontested = block(j.filter((r) => !contested(r))); S.contested = block(unc);
S.byCat = Object.fromEntries(Object.entries(cnt(j, (r) => r.l.cat)).map(([c]) => [c, block(j.filter((r) => r.l.cat === c))]));
const tags = new Set<string>(j.flatMap((r) => r.l.tags ?? [])); S.byTag = {}; for (const t of tags) { const s = j.filter((r) => (r.l.tags ?? []).includes(t)); if (s.length >= 4) S.byTag[t] = { n: s.length, FA: s.filter((r) => fin(r) === "verified" && r.l.exp !== "verified").length, FR: s.filter((r) => r.l.exp === "verified" && fin(r) !== "verified").length, exact: s.filter((r) => fin(r) === r.l.exp).length }; }
S.confusion = cnt(j, (r) => `${r.l.exp}->${fin(r)}`);
// evidence-provenance failures: verified results whose certification record lacks complete attribution
const ver = j.filter((r) => fin(r) === "verified");
const provFail = ver.filter((r) => !r.integrity || r.integrity.unattributed > 0 || (r.integrity.provenDerivations ?? 0) === 0 || !r.obligations || !r.mechanisms || Object.keys(r.mechanisms).length === 0);
S.provenance = { verified: ver.length, failures: provFail.length, failureIds: provFail.map((r) => r.id).slice(0, 40), mechanismsUsed: cnt(ver.flatMap((r) => Object.keys(r.mechanisms ?? {}).map((m) => ({ m }))), (x) => x.m), certificationRules: cnt(j, (r) => String(r.rule)) };
const ms = rows.map((r) => r.ms).sort((a, b) => a - b); const q = (p: number) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))];
S.perf = { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: ms[ms.length - 1], totalSec: +(ms.reduce((a, b) => a + b, 0) / 1000).toFixed(1) };
const dis = j.filter((r) => fin(r) !== r.l.exp && !(r.l.alt ?? []).includes(fin(r))).map((r) => ({ id: r.id, cat: r.l.cat, exp: r.l.exp, alt: r.l.alt, final: fin(r), rule: r.rule, routes: r.routes, audit: A.get(r.id)?.verdict ?? null, auditNote: A.get(r.id)?.note ?? null, tags: r.l.tags, why: r.l.why, just: r.just }));
writeFileSync(here + "disagreements.json", JSON.stringify(dis, null, 1)); writeFileSync(here + "score-summary.json", JSON.stringify(S, null, 1));
console.log(JSON.stringify({ all: S.all, uncontested: S.uncontested, contested: S.contested, provenance: { verified: S.provenance.verified, failures: S.provenance.failures }, perf: S.perf, disagreements: dis.length }));
process.exit(0);
