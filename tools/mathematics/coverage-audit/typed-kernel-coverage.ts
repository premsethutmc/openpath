// Per-family coverage rows for the 432-family typed-kernel candidate pool (+ the 46 baseline contract families). Usage: bun typed-kernel-coverage.ts out.json
import { readFileSync, writeFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
import { contractFor } from "../../../packages/learning/src/assessment.ts";
import { decide } from "../../../packages/learning/src/grade.ts";
const D = new URL("./data/", import.meta.url);
const cand = readFileSync(new URL("candidate-pool.tsv", D), "utf8").trim().split("\n").map((l) => l.split("\t"));
const typedProof = JSON.parse(readFileSync(new URL("typed-proof.json", D), "utf8")).rows as any[];
const valueProof = JSON.parse(readFileSync(new URL("contract-proof.json", D), "utf8")).rows as any[];
const proof = new Map<string, any>([...typedProof, ...valueProof].map((r) => [r.family, r]));
const CAP: Record<string, string> = { "linear-algebra": "linear-algebra kernel (sync)", complex: "complex kernel (sync)", "prob-stat-comb": "B1 probability-statistics kernel (sync)", "trig-explog-sequence-radical": "M2 kernel (sync)", calculus: "calculus Expr-AST step checker (sync; derivation steps, no final-answer claim)", "geometry-measure-formula": "geometry checker (async python worker)" };
// Reason classes for families that stay on the legacy route. Each rule uses measured generator facts (route, answer type, figure presence), never the family name or prompt text.
function classify(route: string, type: string, fig: number) {
  if (route === "calculus") return type === "expression"
    ? ["requires bounded existing-type extension", "calculus kernel checks derivation lines; a final-answer claim needs function text carried losslessly + derivative notation lines, not supplied by the generator (not attempted)"]
    : ["unsupported by current verifier", "calculus kernel has no final-answer claim for integrals, limits, ODE solutions, intervals or counts"];
  if (route === "geometry-measure-formula") return fig > 0
    ? ["ambiguous or insufficiently structured", "givens are carried by a figure, not by a typed mathematical object; geometry checker is an async python worker (not callable from the sync server grader)"]
    : ["unsupported by current verifier", "geometry checker is an async python worker; no sync claim route and no Node server path"];
  return ["unsupported by current verifier", "no kernel task computes this quantity (composite, setup-dependent or derived result); extending would need a new solver (stop condition)"];
}
const rows: any[] = []; const tot = { A: 0, Alegacy: 0, B_implemented: 0, B_django_executed: 0, C: 0 };
const lat: number[] = [], build: number[] = []; const fam = new Map<string, { r: number; items: { id: string }[] }>();
const ids = new Set<string>(); for (const [id, d] of FAMILIES) if (d.contract) ids.add(id);
const route = new Map(cand.map((c) => [c[1], c]));
for (const id of new Set([...cand.map((c) => c[1]), ...ids])) {
  const c = route.get(id); const def = FAMILIES.get(id)!; const items = pool(id).items; const released = items.length;
  const has = !!def.contract; let verified = 0, legacy = 0, held = 0, fig = 0, cons = 0, worst = 0, sumMs = 0, nms = 0;
  for (const it of items) { const t0 = performance.now(); const k = contractFor(it.id)!; if (has) { build.push(performance.now() - t0); } if (k.verification === "verified") verified++; else if (k.verification === "held") held++; else legacy++; }
  for (const it of items.filter((i) => !i.id.endsWith(":mc")).slice(0, 30)) { const pr = problemOf(it.id)!; if (pr.figure) fig++; cons++; if (has && contractFor(it.id)!.verification === "verified") for (let r = 0; r < 3; r++) { const t0 = performance.now(); decide(it.id, pr.answer); const ms = performance.now() - t0; lat.push(ms); sumMs += ms; nms++; worst = Math.max(worst, ms); } }
  const type = c ? c[3] : problemOf(items[0].id)!.type; const rt = c ? c[0] : "baseline-contract";
  const p = proof.get(id); const kind = def.contract?.kind;
  let klass: string, status: string, reason: string | null = null;
  if (has) {
    klass = kind === "typed" ? "compatible through one reusable adapter" : "compatible now (previous contract task)";
    status = verified === released ? "integrated: all questions verified" : `integrated: ${verified}/${released} verified, ${legacy} stay legacy (generator cases the kernel cannot judge)`;
    if (legacy) reason = `${legacy} questions: stored answer outside the kernel's task/forms (guard or kernel check declined) → legacy`;
  } else { [klass, reason] = classify(rt, type, fig); status = "not integrated (legacy route)"; }
  const tested = p?.sampled ?? 0;
  rows.push({ family: id, route: rt, released, answerType: type, verifierCapability: has ? (kind === "typed" ? def.contract!.typed ? "typed-kernel via adapter" : "typed" : `closed-arithmetic ${kind}`) : CAP[rt] ?? "none", contractAvailable: has, contractKind: kind ?? null, compatibility: klass, integrationStatus: status,
    questionsVerified: verified, questionsLegacy: has ? legacy : released, questionsHeld: held, questionsTested: tested, checks: p?.checks ?? 0, falseAcceptances: p?.falseAcc ?? 0, falseRejections: p?.falseRej ?? 0, unresolvedRate: has ? +(legacy / released).toFixed(4) : null,
    figureShare: +(fig / Math.max(cons, 1)).toFixed(2), meanGradeMs: nms ? +(sumMs / nms).toFixed(3) : null, maxGradeMs: nms ? +worst.toFixed(3) : null,
    serverAuthoritative: has && verified ? "implemented for verified questions (Node grader via Django); Django endpoint tests not executed" : "no (legacy stored-answer comparison, labelled legacy)", exclusionReason: reason, generatorData: c ? c[4].replace(/^\/\/\s*/, "") : null });
  if (has) { tot.A += verified; tot.B_implemented += verified; tot.Alegacy += legacy; }
}
const released = rows.reduce((a, r) => a + r.released, 0);
lat.sort((a, b) => a - b); build.sort((a, b) => a - b); const q = (a: number[], p: number) => +(a[Math.floor(a.length * p)] ?? 0).toFixed(3);
const worst = rows.filter((r) => r.maxGradeMs != null).sort((a, b) => b.maxGradeMs - a.maxGradeMs)[0];
const ALL = 341483; tot.C = ALL - tot.A;
const by: Record<string, any> = {}; for (const r of rows) { const b = (by[r.compatibility] ??= { families: 0, released: 0, verified: 0 }); b.families++; b.released += r.released; b.verified += r.questionsVerified; }
const byRoute: Record<string, any> = {}; for (const r of rows) { const b = (byRoute[r.route] ??= { families: 0, released: 0, verified: 0 }); b.families++; b.released += r.released; b.verified += r.questionsVerified; }
const summary = { totalReleasedAllFamilies: ALL, rowsInReport: rows.length, releasedInRows: released, totals: { A_kernelVerified: tot.A, B_serverAuthoritativeImplemented: tot.B_implemented, B_djangoEndpointVerified: 0, C_legacy: tot.C, note: "A, B and C are reported separately; B is code-enforced but Django endpoint tests could not run (Django not installable here)" }, byCompatibility: by, byRoute, gradeLatencyMs: { n: lat.length, p50: q(lat, 0.5), p95: q(lat, 0.95), p99: q(lat, 0.99), max: +lat[lat.length - 1].toFixed(3) }, contractConstructionMs: { n: build.length, p50: q(build, 0.5), p95: q(build, 0.95) }, worstFamily: worst && { family: worst.family, maxGradeMs: worst.maxGradeMs } };
writeFileSync(process.argv[2], JSON.stringify({ summary, rows }, null, 1));
console.log(JSON.stringify(summary, null, 1));
