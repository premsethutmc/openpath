// Gates 1-3: final machine-readable inventory = base inventory (actual definitions + generated examples) + probe evidence + invariant classification.
// Rules read the family's answer type, strand, and its ACTUAL generated prompts. Usage: bun classify.ts inv-base.json probe-r1.json probe-r2.json out.json
import { readFileSync, writeFileSync } from "node:fs";
const [base, r1f, r2f, outf] = process.argv.slice(2);
const inv = JSON.parse(readFileSync(base, "utf8")) as any[], r1 = new Map(JSON.parse(readFileSync(r1f, "utf8")).map((r: any) => [r.family, r])), r2 = new Map(JSON.parse(readFileSync(r2f, "utf8")).map((r: any) => [r.family, r]));
const KERNEL6 = new Set(["mul", "pow", "lin", "quad", "meet", "linev"]);
const INPUT: Record<string, string> = { integer: "typed whole number", fraction: "typed fraction or decimal", set: "typed list separated by commas", exact: "typed exact value (√, π, fractions)", roots: "typed list of exact roots", tuple: "typed ordered tuple (a, b, …)", matrix: "typed [[row],[row]]", interval: "typed inequality or interval notation", ratio: "typed a:b", mixed: "typed mixed number", expression: "typed expression", antiderivative: "typed expression (+C optional)", choice: "multiple-choice buttons (A–D)" };
const LEGACY_COMPARE: Record<string, string> = { expression: "sampled evaluation at points (not symbolic)", antiderivative: "sampled evaluation of derivative (not symbolic)", choice: "letter equality" };
const WORD = /₹|\$|£|rupee|\bkm\b|\bcm\b|\bm\b|\bkg\b|\bg\b|litre|minute|hour|second|%|percent|per cent|ratio|share|speed|how (many|much|long|far|old)|price|cost|profit|loss|interest|average|bought|sold|walks?|travels?|tank|train|boat|age/i;
const CLOSED = /^(?:Work out|Calculate|Evaluate|Simplify|What is|Find the value of|Compute)?\s*:?\s*[-−(\d][\d\s+\-−×÷*\/^().,%²³]*(?:=\s*\?)?\.?\s*(?:\(.*\))?$/i;
function domainTags(prompt: string, range: any): string[] {
  const t: string[] = []; if (range) t.push("answer-range rule"); 
  if (/principal|0\s*≤\s*x\s*<|in radians|in degrees|for 0|between 0/i.test(prompt)) t.push("angle/period interval"); if (/x\s*≠|undefined|denominator/i.test(prompt)) t.push("excluded values");
  if (/whole number|natural|positive integer|integer solutions?/i.test(prompt)) t.push("integer domain"); if (/real/i.test(prompt)) t.push("real domain"); if (/\bfor\s+[a-z]\s*[<>≤≥]|\bon\s*[\[(]|\bin\s*[\[(]/i.test(prompt)) t.push("restricted interval"); if (/nearest|decimal place|significant|round/i.test(prompt)) t.push("rounding/precision"); return t;
}
const rows: any[] = [];
for (const f of inv) {
  const s0 = f.samples, prompts: string[] = s0.map((s: any) => s.prompt), P = prompts.join(" ‖ "), comp = f.competency as string, strand = f.strand as string, ty = f.answerType as string;
  const a = r1.get(f.family) as any, b = r2.get(f.family) as any;
  const closed = a.reproduces > 0 || prompts.every((p) => CLOSED.test(p.replace(/\s+/g, " ").trim()));
  const k = comp.replace("MATH.", ""), has = (re: RegExp) => re.test(k);
  // ---- answer-form invariant (what "equal" means for the student's answer) ----
  const form = ({ integer: "exact rational (integer)", fraction: "exact rational / decimal", mixed: "exact rational (mixed-number form)", ratio: "ratio a:b", exact: "exact irrational value (radicals, π, symbols)", tuple: "ordered tuple", set: "unordered set of values", roots: "unordered set of exact values", interval: "interval / inequality solution set", matrix: "matrix", expression: "symbolic expression (sampled today)", antiderivative: "antiderivative up to constant (sampled today)", choice: "categorical label" } as Record<string, string>)[ty] ?? ty;
  // ---- verification route (how the EXPECTED answer could be re-established independently) ----
  let route = "", routeNote = "";
  const R = (r: string, n = "") => { route = r; routeNote = n; };
  if (ty === "choice") R("categorical-label", "stored label; no numeric kernel can recompute a classification/reading/pattern choice");
  else if (has(/^reasoning\./)) R("logic-pattern", "puzzle/pattern/logic answer");
  else if (has(/^(number\.complex|number\.de-moivre|algebra\.quadratic-complex)/)) R("complex", "complex-polynomial / complex kernel");
  else if (has(/^calculus\./)) R("calculus", "calculus-core / calculus-methods");
  else if (has(/^(algebra\.(permutations)|probability\.|statistics\.(median-mode|averages-intro|weighted-mean|grouped-mean|grouped-data|dispersion|mean-deviation|data-frequency))/)) R("prob-stat-comb", "B1 probability-statistics kernel");
  else if (has(/^(algebra\.(matrices|determinants|matrix-systems|linear-systems|linear-systems-three-variables)|matrices\.|vectors\.|coordinate\.(space|skew))/)) R("linear-algebra", "B2 linear-algebra kernel");
  else if (has(/^trigonometry\.|^algebra\.logarithms|^sequences\.|^algebra\.(arithmetic|geometric)-sequences|^number\.(radicals|square-roots|real-numbers|exponents)/)) R("trig-explog-sequence-radical", "M2 kernel");
  else if (has(/^algebra\.(quadratics|quadratic-discriminant|inequalities|nonlinear-inequalities|absolute-value|linear-equations|linear-rational|linear-two-variables|polynomial-equation-solving|missing-number|equality-inequality|identities-intro)|^sets-relations\.real-intervals/)) R("equation-solution-set", "exact checker (solution sets) + M1 quadratic/inequality");
  else if (has(/^(algebra\.(functions|function-operations|inverse-functions|quadratic-graphs|standard-function-graphs|function-transformations)|coordinate\.)/)) R("coordinate-function", "M1 function/coordinate kernel");
  else if (ty === "expression" || ty === "antiderivative" || has(/^algebra\.(polynomials|factorisation|factor-theorem|polynomial-|vieta|partial-fractions|rational-expressions|algebra-simplify|identities|binomial|expressions-intro|generalise)/)) R("symbolic-expression", "symbolic-equivalence kernel (comparison is sampled today)");
  else if (has(/^geometry\.|^measurement\.(rectangle|circle|cylinder|cones|heron|brahmagupta|pyramids|combined|frustum|triangle|parallelogram|trapezium|cube|volume|area|surface|sectors|perimeter)/)) R("geometry-measure-formula", "formula over given lengths/angles (geometry binder or exact numeric kernel if the family emits the formula)");
  else if (closed) R("closed-arithmetic", "exact numeric-expression checker");
  else R("word-or-model-numeric", "numbers from a story/measurement model: no kernel; needs a family-emitted statement");
  const ROUTE_STATUS: Record<string, string> = { "closed-arithmetic": "B", "equation-solution-set": "B", "prob-stat-comb": "B", "linear-algebra": "B", "coordinate-function": "B", "trig-explog-sequence-radical": "B", calculus: "C", "symbolic-expression": "C", complex: "B", "geometry-measure-formula": "C", "word-or-model-numeric": "C", "logic-pattern": "E", "categorical-label": "E" };
  const demoFam = new Set(["akmed", "akmode", "aonpr", "aoncr", "anbag", "audt3", "apmmul", "apn", "aogp", "cdist", "lineq"]);
  let status = KERNEL6.has(f.family) ? "A" : ROUTE_STATUS[route];
  let evidence = KERNEL6.has(f.family) ? "integrated: contract + decide()" : a.reproduces > 0 ? "demonstrated: exact checker reproduced stored answers from prompt-derived statements" : demoFam.has(f.family) ? "demonstrated: typed kernel verified real samples (probe-kernels)" : (status === "E" ? "no kernel; stored answer + comparator" : "candidate: kernel task exists for this topic; not demonstrated for this family");
  const inv_ = route, sub = form;
  rows.push({ family: f.family, title: f.title, topic: { strand, topic: f.topic, competency: comp, skill: f.skill }, answerType: ty, studentInput: INPUT[ty] ?? ty, hasMcForm: f.hasMcForm, hasTextParser: f.hasTextParser, releasedQuestions: f.releasedQuestions, representative: s0[2] ? { id: s0[2].id, prompt: s0[2].prompt, expectedAnswer: s0[2].answer, options: s0[2].options, figure: s0[2].figure } : null,
    examples: s0.map((s: any) => ({ prompt: s.prompt.slice(0, 200), answer: s.answer })), multipleAnswers: ["set", "tuple", "roots", "interval", "matrix"].includes(ty), domainRestrictions: domainTags(P, f.rangeRule), legacyGrading: "client isCorrect → answer-types canonical compare (answers@2)" + (LEGACY_COMPARE[ty] ? `; ${LEGACY_COMPARE[ty]}` : "; exact canonical equality"),
    probeStatement: { extracted: a.extracted, reproduces: a.reproduces, disagrees: a.disagrees, unsupported: a.unsupported, unresolved: a.unresolved }, probeTrace: { fullyAdapted: b.fullyAdapted, endsAtAnswer: b.endsAtAnswer, opMappable: b.opMappable, n: b.n }, answerForm: form, verificationRoute: route, routeNote, status, evidence });
}
writeFileSync(outf, JSON.stringify(rows, null, 1));
const tab = (key: (r: any) => string) => { const g = new Map<string, { f: number; q: number }>(); for (const r of rows) { const x = g.get(key(r)) ?? { f: 0, q: 0 }; x.f++; x.q += r.releasedQuestions; g.set(key(r), x); } return [...g].sort((p, q) => q[1].q - p[1].q).map(([k, v]) => ({ k, families: v.f, questions: v.q })); };
console.table(tab((r) => `${r.verificationRoute} [${r.status}]`)); console.table(tab((r) => r.status)); console.table(tab((r) => r.evidence.split(":")[0]));
