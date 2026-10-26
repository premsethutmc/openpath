/**
 * Exact verification of generated families against an independent checker (Item 2/3).
 * For every released typed question of a family it checks:
 *  A. answer   — the stored answer equals the independent exact result from the prompt (and the stored form: lowest terms / simplest mixed)
 *  B. marking  — the production path isCorrect(question, raw) accepts the exact answer (and equivalent forms where the type allows)
 *                and rejects exact off-by-one / near-miss / unreduced-when-forbidden responses
 *  C. options  — the multiple-choice form lists the exact answer once, and no distractor is equal to it
 *  D. steps    — where the family checker defines them, every worked-step claim holds exactly
 * A question that fails any check is reported; nothing here changes a family or its marking.
 */
import { pool, problemOf, FAMILIES } from "../families.ts";
import { question, isCorrect } from "../content.ts";
import { parseAnswer, add, q, fmtFrac, fmtMixed, eq, type Q } from "./rational.ts";
import type { FamilyExact, Expected } from "./number-families.ts";

export interface Failure { id: string; check: "A" | "B" | "C" | "D"; why: string }
export interface Report { family: string; checked: number; failures: Failure[]; stepsChecked: boolean; mcChecked: number; ms: number }

const qOf = (e: Expected): Q | null => (e.kind === "ratio" || e.kind === "tuple" ? null : e.q);
const show = (e: Expected): string =>
  e.kind === "tuple" ? `(${e.items.join(", ")})` : e.kind === "ratio" ? `${e.a}:${e.b}` : e.kind === "mixed" ? fmtMixed(e.q) : e.kind === "int" ? `${e.q.n}` : e.kind === "dec" ? decimalString(e.q) : fmtFrac(e.q);
function decimalString(v: Q): string { // the exact terminating decimal, "" if it does not terminate within 12 places
  if (v.d === 1n) return `${v.n}`;
  for (let p = 1; p <= 12; p++) {
    const sc = 10n ** BigInt(p);
    if ((v.n * sc) % v.d) continue;
    const t = ((v.n < 0n ? -v.n : v.n) * sc) / v.d;
    const str = t.toString().padStart(p + 1, "0");
    return `${v.n < 0n ? "-" : ""}${str.slice(0, -p)}.${str.slice(-p)}`;
  }
  return "";
}
const sameShown = (stored: string, e: Expected): string | null => {
  if (e.kind === "tuple") return stored === show(e) ? null : `stored ${stored} ≠ ${show(e)}`;
  if (e.kind === "ratio") return stored === `${e.a}:${e.b}` ? null : `stored ${stored} ≠ ${e.a}:${e.b}`;
  const got = parseAnswer(stored); const want = e.q;
  if (!got || !eq(got, want)) return `stored ${stored} ≠ exact ${show(e)}`;
  if (e.kind === "mixed" && stored !== fmtMixed(want)) return `stored ${stored} is not the simplest mixed form ${fmtMixed(want)}`;
  if (e.kind === "frac" && e.lowest && stored !== fmtFrac(want)) return `stored ${stored} is not in lowest terms ${fmtFrac(want)}`;
  return null;
};
/** Responses the app must reject: exact near misses, built from the exact answer. */
function wrongOnes(e: Expected, stored: string): string[] {
  if (e.kind === "tuple") { const it = e.items; return [it.slice().reverse(), ...it.slice(1).map((_, i) => { const c = it.slice(); [c[i], c[i + 1]] = [c[i + 1], c[i]]; return c; })].map((c) => `(${c.join(", ")})`).filter((x) => x !== stored); }
  if (e.kind === "ratio") return [`${e.a + 1n}:${e.b}`, `${e.a}:${e.b + 1n}`, `${e.b}:${e.a}`].filter((x) => x !== stored);
  const v = (e as { q: Q }).q;
  if (e.kind === "int") return [`${v.n + 1n}`, `${v.n - 1n}`];
  if (e.kind === "dec") return [decimalString(add(v, q(1n, 100n))), decimalString(add(v, q(-1n, 100n)))].filter(Boolean);
  const step = q(1n, v.d);
  const f = (x: Q) => (e.kind === "mixed" ? fmtMixed(x) : fmtFrac(x));
  const out = [f(add(v, step)), f(add(v, q(-1n, v.d)))];
  if (e.kind === "frac") out.push(fmtFrac(add(v, q(1n, v.d * 1_000_003n))));      // a tiny, non-float-safe difference
  if (e.kind === "mixed" && v.d !== 1n) out.push(`${v.n}/${v.d}`);               // improper form: the question asks for the simplest mixed form
  return out.filter((x) => x !== stored);
}
export interface Item { id: string; prompt: string; answer: string; type: string; params: number[] }
/** All checks for one question; `steps` overrides the family's own worked steps (used by the mutation tests). */
export function checkItem(fx: FamilyExact, p: Item, steps?: unknown[]): { failures: Failure[]; mc: boolean; steps: boolean } {
  const failures: Failure[] = []; let mc = false, stepsRan = false;
  const e = fx.expected(p.prompt);
  if (!e) return { failures: [{ id: p.id, check: "A", why: "prompt not understood by the independent checker" }], mc, steps: stepsRan };
  const bad = sameShown(p.answer, e);
  if (bad) failures.push({ id: p.id, check: "A", why: bad });
  const Qs = question(p.id);
  if (!bad) {
    if (!isCorrect(Qs, p.answer)) failures.push({ id: p.id, check: "B", why: `exact answer ${p.answer} rejected` });
    if (e.kind === "frac" || e.kind === "dec") { // equivalent forms the type accepts
      const v = (e as { q: Q }).q; const eqForm = e.kind === "frac" ? `${v.n * 2n}/${v.d * 2n}` : `${p.answer}${p.answer.includes(".") ? "0" : ""}`;
      if (!isCorrect(Qs, eqForm)) failures.push({ id: p.id, check: "B", why: `equivalent form ${eqForm} rejected` });
    }
    for (const w of wrongOnes(e, p.answer)) if (isCorrect(Qs, w)) failures.push({ id: p.id, check: "B", why: `wrong response ${w} accepted` });
    if (p.type !== "choice") {
      const m = problemOf(`${p.id}:mc`);
      if (m?.options) {
        mc = true;
        const right = m.options.filter((o) => (e.kind === "tuple" ? o === show(e) : e.kind === "ratio" ? o === `${e.a}:${e.b}` : e.kind === "mixed" ? o === fmtMixed(e.q) : (() => { const v = parseAnswer(o); return !!v && eq(v, qOf(e)!); })()));
        if (right.length !== 1) failures.push({ id: `${p.id}:mc`, check: "C", why: `${right.length} options equal the exact answer (${m.options.join(" | ")})` });
      }
    }
  }
  if (fx.steps) {
    stepsRan = true;
    const why = fx.steps(p.prompt, (steps ?? FAMILIES.get(fx.id)!.solve(p.params).steps) as any, e);
    if (why) failures.push({ id: p.id, check: "D", why });
  }
  return { failures, mc, steps: stepsRan };
}
export function verifyFamily(fx: FamilyExact): Report {
  const t0 = performance.now();
  const failures: Failure[] = []; let checked = 0, mcChecked = 0, stepsChecked = false;
  for (const p of pool(fx.id).items as any[]) {
    checked++;
    const r = checkItem(fx, p);
    failures.push(...r.failures); if (r.mc) mcChecked++; if (r.steps) stepsChecked = true;
  }
  return { family: fx.id, checked, failures, stepsChecked, mcChecked, ms: performance.now() - t0 };
}
