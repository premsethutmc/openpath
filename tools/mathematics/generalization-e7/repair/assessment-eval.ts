// Assessment evaluation on OpenPath's own generated questions (diagnostic, NOT a blind holdout). Ground truth is computed here independently of the generator's
// answer and of the checker: the question TEXT (prompt) is parsed with plain regexes and solved by brute force / exact integer arithmetic.
// Seven measures are reported separately and never combined. Usage: bun assessment-eval.ts [out.json]
import { writeFileSync } from "node:fs";
import { FAMILIES, pool } from "../../../../packages/learning/src/families.ts";
import { decide } from "../../../../packages/learning/src/session.ts";
import { contractFor } from "../../../../packages/learning/src/assessment.ts";
import { costUsd, estimateTokens, fallbackConfigFrom, planFallback, type FallbackConfig } from "../../../../packages/learning/src/assessment-fallback.ts";

let seed = 7; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const SUP: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
const mn = (s: string) => s.replace(/[−–]/g, "-");
const unsup = (s: string) => s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => "^" + [...m].map((c) => SUP[c]).join(""));
// independent reference: roots/values as exact strings, from the prompt text only
function reference(fam: string, prompt: string): string[] | null {
  const p = unsup(mn(prompt)).replace(/\s+/g, " ");
  if (fam === "mul") { const m = p.match(/^(\d+) × (\d+) =/); return m ? [String(+m[1] * +m[2])] : null; }
  if (fam === "pow") { const m = p.match(/^(\d+)\^(\d) =/); return m ? [String(Number(m[1]) ** Number(m[2]))] : null; }
  if (fam === "linev") { const m = p.match(/y = (-?\d*)x ([+-]) (\d+), what is y when x = (-?\d+)/); if (!m) return null; const k = m[1] === "" ? 1 : m[1] === "-" ? -1 : +m[1]; return [String(k * +m[4] + (m[2] === "-" ? -1 : 1) * +m[3])]; }
  if (fam === "lin") { const m = p.match(/Solve (\d+)x \+ (\d+) = (\d+)/); if (!m) return null; const v = (+m[3] - +m[2]) / +m[1]; return Number.isInteger(v) ? [String(v)] : null; }
  if (fam === "quad") { const m = p.match(/x\^2 (?:([+-]) (\d*)x )?(?:([+-]) (\d+) )?= 0/); if (!m) return null; const P = m[1] ? (m[1] === "-" ? -1 : 1) * (m[2] === "" ? 1 : +m[2]) : 0, Q = m[3] ? (m[3] === "-" ? -1 : 1) * +m[4] : 0; const r: string[] = []; for (let x = -200; x <= 200; x++) if (x * x + P * x + Q === 0) r.push(String(x)); return r; }
  if (fam === "meet") { const m = p.match(/equal to (-?\d*)x ([+-]) (\d+)\?/); if (!m) return null; const M = m[1] === "" ? 1 : m[1] === "-" ? -1 : +m[1], C = (m[2] === "-" ? -1 : 1) * +m[3]; const r: string[] = []; for (let x = -4; x <= 4; x++) if (x * x === M * x + C) r.push(String(x)); return r; }
  return null;
}
type Kind = "value" | "var" | "set";
const KIND: Record<string, Kind> = { mul: "value", pow: "value", linev: "value", lin: "var", quad: "set", meet: "set" };
interface Sub { fam: string; qid: string; cat: string; truth: "correct" | "incorrect" | "ambiguous"; response: string; working?: string[]; errTo?: string; expectOffer?: boolean; clar?: number }
const same = (a: string[], b: string[]) => { const x = [...new Set(a.map(Number))].sort((p, q) => p - q), y = [...new Set(b.map(Number))].sort((p, q) => p - q); return x.length === y.length && x.every((v, i) => v === y[i]); };
const num = (s: string) => Number(s);
const subs: Sub[] = [];
const sample = <T,>(a: T[], k: number) => { const c = [...a], o: T[] = []; while (o.length < k && c.length) o.push(c.splice(rnd(c.length), 1)[0]); return o; };
const FAMS = ["mul", "pow", "lin", "quad", "meet", "linev"];
const refs = new Map<string, string[]>();
let refMismatch = 0, population = 0;
for (const fam of FAMS) {
  const items = pool(fam).items, picks = items.length > 220 ? sample(items, 220) : items;
  for (const q of picks) {
    const ref = reference(fam, q.prompt); population++;
    if (!ref) { refMismatch++; continue; }
    refs.set(q.id, ref);
    if (!same(ref, q.answer.split(",").map((s) => s.trim()))) refMismatch++; // the generator disagrees with the independent reference (a generator defect)
    const k = KIND[fam], add = (cat: string, truth: Sub["truth"], response: string, extra: Partial<Sub> = {}) => subs.push({ fam, qid: q.id, cat, truth, response, ...extra });
    const forms = (vs: string[]): string[] => {
      if (k === "set") { const [a, b] = vs; return [`${a}, ${b}`, `${b}, ${a}`, `${a},${b}`, `${a} and ${b}`, `x = ${a} or x = ${b}`, `{${a}, ${b}}`, `x=${a}, x=${b}`].map(mn).concat(vs.some((v) => v.startsWith("-")) ? [vs.join(", ").replace(/-/g, "−")] : []); }
      const v = vs[0]; return k === "var" ? [v, `x = ${v}`, `x=${v}`, ` ${v} `, `${v}.0`] : [v, `= ${v}`, ` ${v} `, `${v}.0`, `${v}.`].concat(fam === "linev" ? [`y = ${v}`] : []);
    };
    for (const f of forms(ref)) add("alt-form", "correct", f);
    // incorrect answers: neighbours, sign, mal-rule predictions, one root of two, extra root
    const wrongs: string[][] = [];
    if (k === "set") { const [a, b] = ref.map(num); wrongs.push([String(a)], [String(b)], [String(-a), String(-b)], [String(a + 1), String(b)], [String(a), String(b), String(a + b + 7)], [String(a * b)]); }
    else { const v = num(ref[0]); wrongs.push([String(v + 1)], [String(v - 1)], [String(v + 10)], [String(-v)], [String(v * 2)]); }
    for (const b of q.bugs) if (b.predict !== null) { const vs = (Array.isArray(b.predict) ? b.predict : [b.predict]).map(String); if (!same(vs, ref)) wrongs.push(vs); }
    for (const w of wrongs) { if (same(w, ref)) continue; add("incorrect", "incorrect", k === "set" ? w.join(", ") : w[0]); add("missing-working", "incorrect", k === "set" ? w.join(", ") : w[0], { expectOffer: true }); }
    // ambiguous / unreadable notation: must not be graded either way
    const amb = k === "set" ? ["2, ?", "about 2 and 3", "x = two or x = three", "(2,3)x"] : ["four", "4 or 5", "about 4", "x = ?", "4?5"];
    for (const a of sample(amb, 2)) add("ambiguous", "ambiguous", a);
    // working-based cases (lin and quad): wrong first step with locally valid later steps; right answer after bad working
    if (fam === "lin") {
      const m = unsup(mn(q.prompt)).match(/Solve (\d+)x \+ (\d+) = (\d+)/)!, a = +m[1], b = +m[2], c = +m[3], x = c - b === 0 ? 0 : (c - b) / a;
      const st = `${a}x + ${b} = ${c}`;
      add("first-error", "incorrect", `${(c + b)}/${a}`, { working: [st, `${a}x = ${c + b}`, `x = ${c + b}/${a}`], errTo: `${a}x=${c + b}` });
      add("first-error", "incorrect", `${(c - b + 1)}/${a}`, { working: [st, `${a}x = ${c - b + 1}`, `x = ${c - b + 1}/${a}`], errTo: `${a}x=${c - b + 1}` });
      add("right-after-bad-working", "correct", String(x), { working: [st, `${a}x = ${c - b + 1}`, `${a}x = ${c - b}`, `x = ${x}`] });
    }
    if (fam === "quad") {
      const [r1, r2] = ref.map(num); if (r2 === 0 || r1 === 0) continue; const m = unsup(mn(q.prompt)).match(/(x\^2[^=]*= 0)/)?.[1] ?? "";
      add("first-error", "incorrect", `${r1}, ${-r2}`, { working: [m, `(x - ${r1})(x - ${r2}) = 0`, `x = ${r1} or x = ${-r2}`], errTo: `x=${r1}orx=${-r2}` });
    }
  }
}
// ---- run
const lat: Record<string, number[]> = { kernel: [], legacy: [] };
const tally: Record<string, any> = {};
const T = (cat: string) => (tally[cat] ??= { n: 0, credited: 0, rejected: 0, unresolved: 0, offer: 0, localised: 0, localisable: 0, examined: 0 });
let falseAccept = 0, falseReject = 0, wellFormedUnresolved = 0, wellFormed = 0, ambGraded = 0, ambTotal = 0, offerMissing = 0, offerExpected = 0;
let faDetail: string[] = [], frDetail: string[] = [];
for (const s of subs) {
  const t0 = performance.now(); const a = decide(s.qid, s.response, s.working ?? [], s.clar ?? 0); lat.kernel.push(performance.now() - t0);
  const t = T(s.cat); t.n++; if (a.credit === true) t.credited++; else if (a.credit === false) t.rejected++; else t.unresolved++;
  if (s.truth === "incorrect" && a.credit === true) { falseAccept++; if (faDetail.length < 5) faDetail.push(`${s.qid} ${s.cat} "${s.response}" ref=${refs.get(s.qid)}`); }
  if (s.truth === "correct" && a.credit === false) { falseReject++; if (frDetail.length < 5) frDetail.push(`${s.qid} "${s.response}"`); }
  if (s.truth === "ambiguous") { ambTotal++; if (a.credit !== null) ambGraded++; } else { wellFormed++; if (a.credit === null) wellFormedUnresolved++; }
  if (s.expectOffer) { offerExpected++; if (a.clarification?.kind !== "show-step") offerMissing++; }
  if (s.errTo) { t.localisable++; if (a.evidence.methodExamined) t.examined++; const to = (a.evidence.firstError?.to ?? "").replace(/[\s*]/g, "").toLowerCase(); if (to === s.errTo.replace(/\s/g, "").toLowerCase()) t.localised++; }
  if (s.cat === "right-after-bad-working" && a.evidence.methodExamined) t.examined++;
}
// ---- clarification flow
let clarOk = 0, clarN = 0, clarPending = 0, clarSecondN = 0, eligible = 0;
for (const fam of FAMS) for (const q of sample(pool(fam).items, 30)) {
  const ref = refs.get(q.id) ?? reference(fam, q.prompt); if (!ref) continue;
  const bad = KIND[fam] === "set" ? "two and three-ish" : "four-ish";
  const a1 = decide(q.id, bad, [], 0); clarN++;
  const good = KIND[fam] === "set" ? ref.join(", ") : ref[0];
  const a2 = decide(q.id, good, [], 1); if (a1.clarification && a1.credit === null && a2.credit === true && a2.evidence.clarificationRequired && !a2.evidence.unresolved) clarOk++;
  const a3 = decide(q.id, bad, [], 1); clarSecondN++; if (a3.credit === null && !a3.clarification && a3.evidence.unresolved && a3.fallbackEligible) { clarPending++; eligible++; }
}
// ---- unsupported families: legacy authority, never claimed verified
const legacy = { questions: 0, verified: 0, legacy: 0, held: 0, human: 0, families: new Set<string>() };
for (const fam of ["integer", "fraction", "decimal", "area", "ratio", "percent"].filter((f) => FAMILIES.has(f)).concat([...FAMILIES.keys()].filter((f) => !FAMS.includes(f)).slice(0, 24))) { try { for (const q of sample(pool(fam).items, 20)) { const c = contractFor(q.id); if (!c) continue; legacy.questions++; (legacy as any)[c.verification]++; legacy.families.add(fam); const t0 = performance.now(); decide(q.id, q.answer, [], 0); lat.legacy.push(performance.now() - t0); } } catch { /* family not present */ } }
const pct = (xs: number[], p: number) => { const a = [...xs].sort((x, y) => x - y); return a.length ? +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(3) : null; };
const ratio = (a: number, b: number) => ({ n: a, of: b, rate: b ? +(a / b).toFixed(5) : null });
// ---- fallback usage, estimated from MEASURED rates only for the inputs this suite generates; production rates are assumptions (see report)
const cfg: FallbackConfig = { ...fallbackConfigFrom({ OPENPATH_FALLBACK_PROVIDER: "fixture", OPENPATH_FALLBACK_MAX_REQUESTS_MONTH: "1000000", OPENPATH_FALLBACK_MAX_USD_MONTH: "100000", OPENPATH_FALLBACK_PRICE_IN_PER_MTOK: "1", OPENPATH_FALLBACK_PRICE_OUT_PER_MTOK: "5" }) };
const sampleReq = (() => { const q = pool("quad").items[5], c = contractFor(q.id)!, a = decide(q.id, "two and three-ish", [], 1); const p = planFallback(cfg, { requestsThisMonth: 0, spendThisMonthUsd: 0, learnerRequestsToday: 0 }, c, a, { response: "two and three-ish" }); return p.allowed ? p.estimate : null; })();
const out = {
  note: "diagnostic evaluation on generated OpenPath questions; ground truth from an independent reference computed from the prompt text; not a blind holdout",
  population: { questions: population, submissions: subs.length, referenceVsGeneratorMismatches: refMismatch },
  falseAcceptance: { ...ratio(falseAccept, subs.filter((s) => s.truth === "incorrect").length), examples: faDetail },
  falseRejection: { ...ratio(falseReject, subs.filter((s) => s.truth === "correct").length), examples: frDetail },
  autoGradingCoverage: { allSubmissions: ratio(subs.length - Object.values(tally).reduce((a: number, t: any) => a + t.unresolved, 0), subs.length), wellFormedSubmissions: ratio(wellFormed - wellFormedUnresolved, wellFormed), legacyFamiliesNote: "families without an independent kernel are graded by the stored answer (legacy) and are not part of the kernel coverage figure" },
  unresolvedRate: { onWellFormedInput: ratio(wellFormedUnresolved, wellFormed), ambiguousInputNotGraded: ratio(ambTotal - ambGraded, ambTotal), ambiguousInputGradedWrongly: ratio(ambGraded, ambTotal) },
  firstErrorLocalisation: { cases: tally["first-error"].localisable, localised: tally["first-error"].localised, accuracy: +(tally["first-error"].localised / tally["first-error"].localisable).toFixed(4), methodExaminedWhenAnswerWrong: tally["first-error"].examined },
  rightAnswerAfterBadWorking: { n: tally["right-after-bad-working"].n, credited: tally["right-after-bad-working"].credited, workingAnalysed: tally["right-after-bad-working"].examined },
  missingWorkingOfferShown: ratio(offerExpected - offerMissing, offerExpected),
  clarification: { unreadableThenClarifiedDecided: ratio(clarOk, clarN), unreadableTwicePendingAndFallbackEligible: ratio(clarPending, clarSecondN) },
  latencyMs: { kernelPath: { p50: pct(lat.kernel, 0.5), p95: pct(lat.kernel, 0.95), p99: pct(lat.kernel, 0.99), n: lat.kernel.length }, legacyPath: { p50: pct(lat.legacy, 0.5), p95: pct(lat.legacy, 0.95), n: lat.legacy.length } },
  legacyFamilies: { ...legacy, families: [...legacy.families] },
  fallback: { sampleRequestEstimate: sampleReq, tokensPerRequestInputEstimate: sampleReq?.inputTokens ?? null, eligibleInThisSuite: eligible, note: "no provider is called; costs are in the report" },
  byCategory: tally,
};
const file = process.argv[2] ?? new URL("./out-assessment/results.json", import.meta.url).pathname;
try { writeFileSync(file, JSON.stringify(out, null, 1)); } catch { /* dir missing */ }
console.log(JSON.stringify({ ...out, byCategory: undefined }, null, 1));
void costUsd; void estimateTokens;
