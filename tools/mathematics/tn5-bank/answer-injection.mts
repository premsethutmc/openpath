/**
 * Acceptance test 5b: wrong-answer injection. 500 items (seeded, deterministic, spread over every family: 2 per family
 * first, the rest drawn at random from all items) get their stated answer replaced by a genuinely different one.
 * Two checks must reject each: (1) the app's own judge, content.ts isCorrect (and, for the answers@2 types, sameAnswer);
 * (2) the step-chain consistency check of answer-consistency.mts (the injected answer must no longer be stated by a step).
 *
 *   node --experimental-strip-types --no-warnings --import <ts-resolve.mjs> tools/mathematics/tn5-bank/answer-injection.mts
 * Writes results/answer-injection.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isCorrect, canonical } from "../../../packages/learning/src/content";
import { sameAnswer, NEW_TYPES } from "../../../packages/learning/src/answer-types";
import { tn5Items, verdictOf } from "./answer-consistency.mts";

const SEED = 20261025, N = 500, PER_FAMILY = 2;
const rng = (a: number) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rand = rng(SEED);
const shuffle = <T,>(a: T[]) => { const o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };

/** Candidate wrong answers: off by one, a digit swap, a changed part, reversed order, the fraction upside down, a neighbouring option. */
function candidates(p: any): string[] {
  const a: string = p.answer;
  const out: string[] = [];
  if (p.type === "choice") {
    const n = (p.options ?? ["", "", "", ""]).length, i = "ABCD".indexOf(a);
    return [1, -1, 2, -2, 3].map((d) => "ABCD"[i + d]).filter((x) => x && "ABCD".indexOf(x) < n);
  }
  const toks = [...a.matchAll(/\d+(?:\.\d+)?/g)];
  for (const m of toks) {
    const s = m[0], dp = s.includes(".") ? s.length - s.indexOf(".") - 1 : 0;
    const v = Number(s), put = (x: string) => out.push(a.slice(0, m.index!) + x + a.slice(m.index! + s.length));
    const step = 10 ** -dp;
    put((v + step).toFixed(dp)); if (v - step >= 0) put((v - step).toFixed(dp)); put((v + 10 * step).toFixed(dp));
    const d = s.replace(".", "");
    for (let i = 0; i + 1 < d.length; i++) if (d[i] !== d[i + 1]) {
      const w = d.slice(0, i) + d[i + 1] + d[i] + d.slice(i + 2);
      put(dp ? w.slice(0, w.length - dp) + "." + w.slice(w.length - dp) : w);
    }
  }
  const f = /^(-?\d+)\/(\d+)$/.exec(a); if (f) out.push(`${f[2]}/${f[1]}`);          // fraction upside down
  const mx = /^(\d+) (\d+)\/(\d+)$/.exec(a); if (mx) out.push(`${Number(mx[1]) * Number(mx[3]) + Number(mx[2])}/${mx[3]}`); // improper form
  const parts = a.replace(/^[({]|[)}]$/g, "").split(/\s*,\s*/);
  if (parts.length > 1 && new Set(parts).size > 1) { const r = [...parts].reverse().join(", "); out.push(/^\(/.test(a) ? `(${r})` : r); } // reversed order
  return [...new Set(out)].filter((x) => x !== a);
}

const items = [...tn5Items()].sort((x, y) => (x.id < y.id ? -1 : 1));
const byFam = new Map<string, any[]>();
for (const p of items) (byFam.get(p.family) ?? byFam.set(p.family, []).get(p.family)!).push(p);
const picked: any[] = [];
for (const fam of [...byFam.keys()].sort()) picked.push(...shuffle(byFam.get(fam)!).slice(0, PER_FAMILY));
const chosen = new Set(picked.map((p) => p.id));
picked.push(...shuffle(items.filter((p) => !chosen.has(p.id))).slice(0, N - picked.length));

const R = { items: 0, noCandidate: 0, controlAccepted: 0, injectedAcceptedByApp: 0, appRejected: 0, sameAnswerChecked: 0, sameAnswerRejected: 0, unreadableInjected: 0,
  chainOriginal: { last: 0, any: 0, covered: 0, component: 0, undecided: 0 } as Record<string, number>, chainRejected: 0, chainAccepted: 0, chainCannotDecide: 0, chainLastStepRejected: 0, chainLastStepDecidable: 0, dodgedIntermediate: 0 };
const failures: any[] = [], undecidedFamilies: Record<string, number> = {}, examples: any[] = [];
const perFamily: Record<string, { n: number; appRejected: number; chainRejected: number; chainCannotDecide: number }> = {};
for (const p of picked) {
  const cs = candidates(p).map((c) => ({ c, ok: !isCorrect(p, c) && (p.type === "choice" || canonical(p, c) !== null) && !(NEW_TYPES.has(p.type) && sameAnswer(p.type, c, p.answer)) }))
    .filter((x) => x.ok).map((x) => x.c);
  R.items++;
  const pf = (perFamily[p.family] ??= { n: 0, appRejected: 0, chainRejected: 0, chainCannotDecide: 0 }); pf.n++;
  if (!cs.length) { R.noCandidate++; failures.push({ id: p.id, why: "no candidate" }); continue; }
  const pre = shuffle(cs); // seeded choice; prefer one that no step states (so the chain check is not trivially helped or hurt)
  const wrong = pre.find((c) => verdictOf(p, c) === "undecided") ?? pre[0];
  if (verdictOf(p, wrong) !== "undecided") R.dodgedIntermediate++;
  if (isCorrect(p, p.answer)) R.controlAccepted++;
  const appAccepts = isCorrect(p, wrong);
  if (appAccepts) { R.injectedAcceptedByApp++; failures.push({ id: p.id, family: p.family, answer: p.answer, wrong, why: "app accepted" }); } else { R.appRejected++; pf.appRejected++; }
  if (NEW_TYPES.has(p.type)) { R.sameAnswerChecked++; if (!sameAnswer(p.type, wrong, p.answer)) R.sameAnswerRejected++; }
  const before = verdictOf(p), after = verdictOf(p, wrong);
  R.chainOriginal[before]++;
  // 'covered' and 'component' are order-blind / partial, so they do not count as a decision either way
  const decided = (v: string) => v === "last" || v === "any";
  if (!decided(before)) { R.chainCannotDecide++; pf.chainCannotDecide++; undecidedFamilies[p.family] = (undecidedFamilies[p.family] ?? 0) + 1; }
  else if (!decided(after)) { R.chainRejected++; pf.chainRejected++; } else { R.chainAccepted++; failures.push({ id: p.id, family: p.family, answer: p.answer, wrong, why: `chain check still ${after}` }); }
  if (before === "last") { R.chainLastStepDecidable++; if (after !== "last") R.chainLastStepRejected++; }
  if (examples.length < 12 && p.id.length) examples.push({ family: p.family, type: p.type, answer: p.answer, wrong });
}
const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, "results"), { recursive: true });
writeFileSync(join(here, "results/answer-injection.json"), JSON.stringify({ seed: SEED, perFamilyMin: PER_FAMILY, summary: R, chainCannotDecideByFamily: undecidedFamilies, failures, examples, perFamily }, null, 1) + "\n");
console.log(JSON.stringify(R), "failures", failures.length);
