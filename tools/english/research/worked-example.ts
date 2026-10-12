/**
 * node tools/english/research/worked-example.ts
 * Prints how the production update treats right and wrong answers in each format, and a worked
 * comparison with the slip-aware alternative. Every number comes from the code, not by hand.
 */
import { binaryUpdate, guessingFloor, itemInformation, logistic, pCorrect, type CodeItem, type ItemParams } from "../../../packages/english-core/src/index.ts";
import { gradientSlip, slipUpdate } from "./slip.ts";

const f = (x: number, d = 2) => x.toFixed(d);
const S = [0.05, 0.1];

// ---------------------------------------------------------------- formats
const example = (format: string, extra: Partial<CodeItem>): CodeItem => ({ id: "x", version: 1, target: "x", format, a: 1.2, b: 4, prompt: "", ...extra }) as CodeItem;
const FORMATS: [string, CodeItem][] = [
  ["choice, 4 options", example("choice:x", { options: ["a", "b", "c", "d"], answer: 0, a: 1.1 })],
  ["choice, 10 options (sentence end)", example("choice:x", { options: Array(10).fill("o"), answer: 0, a: 1.1 })],
  ["multi, 2 of 5", example("multi:x", { options: Array(5).fill("o"), answer_set: [0, 1], a: 1.1 })],
  ["multi, 2 of 6", example("multi:x", { options: Array(6).fill("o"), answer_set: [0, 1], a: 1.0 })],
  ["match, 3 to 4", example("match:x", { left: ["a", "b", "c"], options: Array(4).fill("o"), answer_pairs: [0, 1, 2] })],
  ["match, 4 to 5", example("match:x", { left: ["a", "b", "c", "d"], options: Array(5).fill("o"), answer_pairs: [0, 1, 2, 3] })],
  ["order, 4 items", example("order:x", { options: Array(4).fill("o"), answer_order: [1, 0, 2, 3] })],
  ["typed (any)", example("typed:x", { answers: ["a"], a: 1.3 })],
];

const prodGrad = (theta: number, p: ItemParams, correct: boolean) => {
  const L = logistic(p.a * (theta - p.b));
  return correct ? (p.a * (1 - p.c) * L * (1 - L)) / pCorrect(theta, p) : -p.a * L;
};

console.log("## How each format is scored and how much one answer pulls the estimate (production)\n");
console.log("Pull = gradient of the log-likelihood at the current estimate (bands per unit of precision), for an item 2 bands below, at, and 2 bands above the learner.\n");
console.log("| Format | a | Guessing floor c | Right, item 2 below | Right, at level | Right, 2 above | Wrong, item 2 below | Wrong, at level | Wrong, 2 above | Information at level |");
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const [name, it] of FORMATS) {
  const c = guessingFloor(it);
  const p = { a: it.a, b: 4, c };
  const at = (d: number, r: boolean) => f(prodGrad(4 + d, p, r));
  console.log(`| ${name} | ${it.a} | ${c === 0 ? "0" : c >= 0.1 ? f(c, 2) : "1/" + Math.round(1 / c)} | +${at(2, true)} | +${at(0, true)} | +${at(-2, true)} | ${at(2, false)} | ${at(0, false)} | ${at(-2, false)} | ${f(itemInformation(4, p))} |`);
}

console.log("\nKey property of production: the pull of a WRONG answer is −a·L, where L = logistic(a·(θ − b)). The guessing floor c does not appear. For an item well below the learner (L near 1), a wrong answer pulls with almost the full −a, whatever the format.\n");

console.log("## Wrong answer on an item 2 bands below the learner: production against slip-aware\n");
console.log("| Format | Production | s = 0.05 | s = 0.10 |");
console.log("|---|---|---|---|");
for (const [name, it] of FORMATS) {
  const p = { a: it.a, b: 4, c: guessingFloor(it) };
  console.log(`| ${name} | ${f(prodGrad(6, p, false))} | ${f(gradientSlip(6, p, 0.05, false))} | ${f(gradientSlip(6, p, 0.1, false))} |`);
}

// ---------------------------------------------------------------- worked example
const typed = { a: 1.3, b: 3, c: 0 };
const start = { mean: 5, variance: 0.36 };
console.log("\n## Worked example\n");
console.log("A learner estimated at **5.00 ± 0.60** on subject–verb agreement answers a typed item of difficulty **b = 3.0** (a = 1.3, c = 0) **wrong**.\n");
const L = logistic(1.3 * 2);
const P = pCorrect(5, typed);
const info = itemInformation(5, typed);
const v = 1 / (1 / 0.36 + info);
const prod = binaryUpdate(start, typed, false);
console.log("Production (3PL), step by step:\n");
console.log(`- L = logistic(1.3 × (5.0 − 3.0)) = ${f(L, 4)}; P(right) = ${f(P, 4)}`);
console.log(`- information = a² · L · (1 − L) = ${f(info, 4)}`);
console.log(`- new variance = 1 / (1/0.36 + ${f(info, 4)}) = ${f(v, 4)} → sd ${f(Math.sqrt(v), 3)}`);
console.log(`- pull of a wrong answer = −a · L = ${f(-1.3 * L, 4)}`);
console.log(`- new mean = 5.00 + ${f(v, 4)} × (${f(-1.3 * L, 4)}) = **${f(prod.mean, 3)}**\n`);
for (const s of S) {
  const r = slipUpdate(start, typed, false, s);
  const Ps = 0 + (1 - s) * L;
  console.log(`Slip-aware, s = ${s}: P(right) = ${f(Ps, 4)}; pull = −a(1 − s)L(1 − L)/(1 − P) = ${f(gradientSlip(5, typed, s, false), 4)}; new mean **${f(r.mean, 3)}**, sd ${f(Math.sqrt(r.variance), 3)}`);
}

console.log("\n### Sensitivity: the same learner really has a gap (true level 3.0) and keeps answering items near 3.5 wrong\n");
console.log("Five wrong answers in a row on typed items of difficulty 3.5 (a = 1.3), starting from 5.00 ± 0.60:\n");
console.log("| After | Production | s = 0.05 | s = 0.10 |");
console.log("|---|---|---|---|");
let e0 = { ...start };
const es = S.map(() => ({ ...start }));
for (let k = 1; k <= 5; k++) {
  const it = { a: 1.3, b: 3.5, c: 0 };
  e0 = binaryUpdate(e0, it, false);
  S.forEach((s, i) => (es[i] = slipUpdate(es[i], it, false, s)));
  console.log(`| ${k} wrong | ${f(e0.mean)} ± ${f(Math.sqrt(e0.variance))} | ${es.map((e) => `${f(e.mean)} ± ${f(Math.sqrt(e.variance))}`).join(" | ")} |`);
}

console.log("\n### Inflation check: a right answer on a hard item (b = 7.0, typed), from 5.00 ± 0.60\n");
const hard = { a: 1.3, b: 7, c: 0 };
console.log(`Production ${f(binaryUpdate(start, hard, true).mean, 3)}; ` + S.map((s) => `s = ${s}: ${f(slipUpdate(start, hard, true, s).mean, 3)}`).join("; "));
console.log("\n### A four-option choice item 2 bands below, answered wrong (b = 3.0, a = 1.1, c = 0.25)\n");
const ch = { a: 1.1, b: 3, c: 0.25 };
console.log(`Production ${f(binaryUpdate(start, ch, false).mean, 3)}; ` + S.map((s) => `s = ${s}: ${f(slipUpdate(start, ch, false, s).mean, 3)}`).join("; "));
