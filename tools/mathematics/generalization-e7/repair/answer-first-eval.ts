// Answer-first evaluation over the exposed algebra corpora (diagnostic, not a holdout). (1) verdict vs reference on unmodified work; (2) localisation on single-line mutations of
// reference-verified work (the mutated line is the known earliest alteration); (3) latency/checks. Usage: bun answer-first-eval.ts
import { readFileSync } from "node:fs";
import { assessAnswerFirst } from "../../../../packages/learning/src/answer-first.ts";
const T = new URL("../../", import.meta.url).pathname;
const files = ["proof-integrity-e2/dev-cases.v1.json","proof-integrity-e2/sealed-cases.v1.json","verification-closure-e3/dev-cases.v1.json","verification-closure-e3/sealed-cases.v1.json","coverage-e4/dev-cases.v1.json","coverage-e4/sealed-cases.v1.json"];
const cases: any[] = []; for (const f of files) { try { cases.push(...JSON.parse(readFileSync(T + f, "utf8")).cases); } catch { /* skip */ } }
const alg = cases.filter((c) => c.problem?.domain === "algebra" && typeof c.problem.statement === "string" && c.studentWorking?.format === "natural");
const ref = (c: any) => c.reference?.classification ?? c.expected?.classification;
const pct = (a: number, b: number) => (b ? (100 * a / b).toFixed(1) + "%" : "n/a");
const lat: number[] = [], latD: number[] = []; let n = 0, correct = 0, incorrect = 0, unres = 0, unsup = 0, refVer = 0, refVerCorrect = 0, refVerIncorrect = 0, refInv = 0, refInvCorrect = 0, checks = 0;
const bad: string[] = [];
for (const c of alg) {
  n++; const t0 = performance.now(); const r = assessAnswerFirst(c.problem, c.studentWorking, { diagnose: false }); lat.push(performance.now() - t0); checks += r.cost.checks;
  const s = r.answer.status; if (s === "correct") correct++; else if (s === "incorrect" || s === "incomplete") incorrect++; else if (s === "unresolved") unres++; else unsup++;
  if (ref(c) === "verified") { refVer++; if (s === "correct") refVerCorrect++; else if (s === "incorrect") { refVerIncorrect++; bad.push(c.caseId ?? c.id); } }
  if (ref(c) === "invalid" && s === "correct") { refInvCorrect++; }
  if (ref(c) === "invalid") refInv++;
}
// (2) localisation: bump the first numeral of one interior line of reference-verified multi-line work; expected earliest invalid transition = that line (when the mutated work's answer is judged incorrect and the line is a statement)
let nullCredit = 0, mut = 0, located = 0, wrongLine = 0, noDiag = 0, falseCredit = 0, exactDiag = 0; const misses: string[] = [];
for (const c of alg) {
  if (ref(c) !== "verified") continue; const lines = c.studentWorking.text.split("\n"); if (lines.length < 2) continue;
  for (let k = 0; k < lines.length - 1; k++) {
    if (!/\d/.test(lines[k]) || !/=|<|>/.test(lines[k])) continue;
    const m = lines.slice(); m[k] = m[k].replace(/(?<![A-Za-z\d.^])(\d+)(?![\d.]*[A-Za-z(^])/, (x: string) => String(Number(x) + 1)); if (m[k] === lines[k]) continue;
    const t0 = performance.now(); const r = assessAnswerFirst(c.problem, { format: "natural", text: m.join("\n") }); latD.push(performance.now() - t0); mut++;
    if (r.answer.credit === true) { falseCredit++; continue; } // the mutation happened not to change the final answer (answer-first credits the answer, by design)
    if (r.answer.credit === null) { nullCredit++; continue; }
    if (!r.diagnosis?.firstError) { noDiag++; continue; }
    // transition indices are over parsed lines; list numbering / blank lines keep one-to-one in these corpora
    if (r.diagnosis.firstError.transition === k) { located++; if (r.diagnosis.firstError.confidence === "exact") exactDiag++; } else { wrongLine++; if (misses.length < 6) misses.push(`${c.caseId ?? c.id}@${k}->${r.diagnosis.firstError.transition}`); }
  }
}
// (3) the corpora's own labels: reference-invalid work with a labelled first invalid line and per-line relations (labels are never edited; used for scoring only)
let li = 0, liIncorrect = 0, liCreditedCorrect = 0, liNull = 0, liNoFirst = 0, liHit = 0, liAcceptable = 0, liMiss = 0; const liMisses: string[] = [];
let relCompared = 0, relAgree = 0; const relDis: string[] = [];
for (const c of alg) {
  if (ref(c) !== "invalid" || typeof c.reference?.firstInvalidStep !== "number") continue; li++;
  const r = assessAnswerFirst(c.problem, c.studentWorking);
  if (r.answer.credit === true) { liCreditedCorrect++; continue; } if (r.answer.credit === null) { liNull++; continue; } liIncorrect++;
  const f = r.diagnosis?.firstError; if (!f) { liNoFirst++; continue; }
  const ok = f.transition === c.reference.firstInvalidStep, acc = (c.reference.firstInvalidAcceptable ?? []).includes(f.transition);
  if (ok) liHit++; else if (acc) liAcceptable++; else { liMiss++; if (liMisses.length < 8) liMisses.push(`${c.caseId ?? c.id}: got ${f.transition} want ${c.reference.firstInvalidStep}`); }
  const rels: string[] = c.reference.lineRelations ?? [];
  r.diagnosis!.transitions.forEach((t) => { const want = rels[t.index]; if (!want) return; const mine = t.status === "invalid" || t.status === "closed-false" ? "invalid" : t.status === "equivalent" ? "equal" : null; if (!mine || !["equal", "invalid"].includes(want)) return; relCompared++; if (mine === want) relAgree++; else if (relDis.length < 6) relDis.push(`${c.caseId ?? c.id}[${t.index}] ours ${mine} ref ${want}`); });
}
const p = (a: number[], q: number) => a.length ? [...a].sort((x, y) => x - y)[Math.floor(q * (a.length - 1))].toFixed(2) : "n/a";
console.log(JSON.stringify({ algebraCases: n, verdict: { correct, incorrectOrIncomplete: incorrect, unresolved: unres, unsupported: unsup, unsupportedOrUnresolvedRate: pct(unres + unsup, n) },
  vsReference: { refVerified: refVer, creditedCorrect: refVerCorrect, wronglyIncorrect: refVerIncorrect, wronglyIncorrectIds: bad.slice(0, 8), refInvalid: refInv, refInvalidButAnswerCorrect: refInvCorrect },
  localisation: { mutatedRuns: mut, answerUnchangedByMutation: falseCredit, diagnosed: located + wrongLine, unestablished: nullCredit, wrongAnswerNoFirstError: noDiag, firstErrorExactLine: located, wrongLine, accuracyAmongDiagnosed: pct(located, located + wrongLine), exactEvidence: exactDiag, misses },
  vsLabelledFirstError: { referenceInvalidWithLabel: li, answerCreditedCorrect: liCreditedCorrect, answerUnestablished: liNull, answerIncorrect: liIncorrect, noFirstErrorFound: liNoFirst, exactLine: liHit, otherAcceptableLine: liAcceptable, wrongLine: liMiss, exactLineRate: pct(liHit + liAcceptable, liIncorrect), misses: liMisses, localRelationAgreement: pct(relAgree, relCompared), relationsCompared: relCompared, disagreements: relDis },
  latencyMs: { answerOnly: { p50: p(lat, 0.5), p95: p(lat, 0.95), meanChecks: (checks / n).toFixed(2) }, withDiagnosis: { p50: p(latD, 0.5), p95: p(latD, 0.95) } } }, null, 1));
process.exit(0);
