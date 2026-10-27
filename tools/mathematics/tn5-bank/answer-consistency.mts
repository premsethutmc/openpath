/**
 * Acceptance test 5a: is each item's stated final answer tied to its independently checked step chain?
 *
 *   node --experimental-strip-types --no-warnings --import <ts-resolve.mjs> tools/mathematics/tn5-bank/answer-consistency.mts
 *   (or: node --import tsx tools/mathematics/tn5-bank/answer-consistency.mts)
 * Writes results/answer-consistency.json. Deterministic (no randomness, clock or environment).
 *
 * Per item the verdict is one of (strongest first):
 *   last       the LAST step's stated value equals the final answer
 *   any        some other step's stated value equals the final answer
 *   covered    (weak, order-blind; tuple/mixed answers) every component of the answer is stated by some step, though no single step states all
 *   component  a step states one component of a multi-part answer (a tuple coordinate, the whole part of a mixed number)
 *   undecided  no step states the answer in a form this check can compare (not "wrong": "cannot tell from the chain")
 * "Equals" per answer type:
 *   integer/fraction/exact/mixed  same exact rational value (decimals, fractions, "3 2/5", rupee signs and commas read exactly;
 *                                 a float step value must agree with the answer to 1e-9 relative)
 *   tuple/set                     same ordered list (tuple) / same set (set) of exact numbers; "h:mm" reads as (h, mm)
 *   choice                        the step value is the text of the option the answer letter names, or the option index
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { boardReleases } from "../../../packages/learning/src/board-releases";
import { assigned } from "../../../packages/learning/src/curriculum";

const RELEASE = "tn-samacheer-mathematics-grade-5";
export type Q = readonly [bigint, bigint];
const gcd = (a: bigint, b: bigint): bigint => (b ? gcd(b, a % b) : a < 0n ? -a : a);
const mk = (n: bigint, d: bigint): Q | null => (d === 0n ? null : [(n / gcd(n, d)) * (d < 0n ? -1n : 1n), (d < 0n ? -d : d) / gcd(n, d)]);
const eq = (a: Q | null, b: Q | null) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

/** Exact rational from text: "12", "1,570", "₹4.50", "-3/4", "3 2/5", "0.25". */
export function toQ(x: unknown): Q | null {
  if (typeof x === "number") {
    if (!Number.isFinite(x)) return null;
    if (Number.isInteger(x)) return [BigInt(x), 1n];
    return toQ(String(x));
  }
  if (typeof x !== "string") return null;
  let m = /^(-?)(\d+) (\d+)\/(\d+)$/.exec(x.trim().replace(/−/g, "-").replace(/^₹/, ""));
  if (m) { const q = mk(BigInt(m[2]) * BigInt(m[4]) + BigInt(m[3]), BigInt(m[4])); return q && (m[1] ? [-q[0], q[1]] : q); }
  const s = x.trim().replace(/−/g, "-").replace(/^₹/, "").replace(/(?<=\d),(?=\d{3}\b)/g, "");
  m = /^(-?\d+)\/(\d+)$/.exec(s);
  if (m) return mk(BigInt(m[1]), BigInt(m[2]));
  m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (m) { const f = m[3] ?? ""; const q = mk(BigInt(m[2] + f), 10n ** BigInt(f.length)); return q && (m[1] ? [-q[0], q[1]] : q); }
  return null;
}
/** Float step value against an exact answer. */
const nearQ = (v: number, a: Q | null) => !!a && Math.abs(v - Number(a[0]) / Number(a[1])) <= 1e-9 * Math.max(1, Math.abs(v));

/** Elements of a list-like value: "(1, 30)", "48, 86", "04:00", [1,2,3]; null if not list-like. */
export function listOf(x: unknown): (Q | null)[] | null {
  if (Array.isArray(x)) return x.map(toQ);
  if (typeof x !== "string") return null;
  const t = x.trim().replace(/^[({[]|[)}\]]$/g, "");
  if (/^\d{1,2}:\d{2}$/.test(t)) return t.split(":").map(toQ);
  if (!/[,;]/.test(t)) return null;
  return t.split(/\s*[,;]\s*/).map(toQ);
}
const sameList = (a: (Q | null)[], b: (Q | null)[], ordered: boolean) => {
  if (a.length !== b.length || a.some((v) => !v) || b.some((v) => !v)) return false;
  const k = (l: (Q | null)[]) => l.map((v) => `${v![0]}/${v![1]}`);
  return ordered ? k(a).join("|") === k(b).join("|") : [...new Set(k(a))].sort().join("|") === [...new Set(k(b))].sort().join("|") && new Set(k(a)).size === new Set(k(b)).size;
};
const norm = (s: unknown) => String(s).trim().toLowerCase().replace(/\s+/g, " ");

export type Verdict = "last" | "any" | "covered" | "component" | "undecided";
export interface Subject { type: string; answer: string; options?: string[]; steps: { value: unknown }[] }

/** Does a step value state exactly this answer? 1 = whole answer, 0.5 = a component of it, 0 = no / cannot tell. */
export function states(p: Subject, value: unknown, answer = p.answer): 0 | 0.5 | 1 {
  switch (p.type) {
    case "integer": case "fraction": case "exact": {
      const a = toQ(answer);
      // a symbolic answer ("m + 2", "2n"): the step must state the same text (spaces ignored)
      if (!a) return typeof value === "string" && value.replace(/\s+/g, "") === answer.replace(/\s+/g, "") ? 1 : 0;
      if (typeof value === "number" && !Number.isInteger(value)) return nearQ(value, a) ? 1 : 0;
      return eq(toQ(value), a) ? 1 : 0;
    }
    case "mixed": {
      const a = toQ(answer);
      if (typeof value === "number" && !Number.isInteger(value)) return nearQ(value, a) ? 1 : 0;
      const v = toQ(value);
      if (eq(v, a)) return 1;
      // the whole part of "3 2/5" or the numerator of "7/5" is one component of the mixed answer
      const m = /^(-?\d+) (\d+)\/(\d+)$/.exec(answer.trim());
      const f = /^(-?\d+)\/(\d+)$/.exec(answer.trim());
      if (v && m && (eq(v, toQ(m[1])) || eq(v, toQ(m[2])) || eq(v, toQ(m[3])))) return 0.5;
      if (v && f && (eq(v, toQ(f[1])) || eq(v, toQ(f[2])))) return 0.5;
      return 0;
    }
    case "tuple": case "set": {
      const a = listOf(answer) ?? [toQ(answer)];
      const v = listOf(value);
      if (v) return sameList(v, a, p.type === "tuple") ? 1 : 0;
      const s = toQ(value);
      return s && a.some((c) => eq(c, s)) ? 0.5 : 0;
    }
    case "choice": {
      const i = "ABCD".indexOf(answer.trim().toUpperCase());
      if (i < 0 || !p.options || i >= p.options.length) return 0;
      if (typeof value === "number") return Number.isInteger(value) && value === i ? 1 : 0;
      return norm(value) === norm(p.options[i]) ? 1 : 0;
    }
    default: return 0;
  }
}
export function verdictOf(p: Subject, answer = p.answer): Verdict {
  const n = p.steps.length;
  const best = (idx: number[]) => Math.max(0, ...idx.map((i) => states(p, p.steps[i].value, answer)));
  if (n && states(p, p.steps[n - 1].value, answer) === 1) return "last";
  if (best([...Array(Math.max(0, n - 1)).keys()]) === 1) return "any";
  if (p.type === "tuple" || p.type === "mixed") {
    const comps = p.type === "tuple" ? listOf(answer) : [...answer.trim().matchAll(/\d+/g)].map((m) => toQ(m[0]));
    const vals = p.steps.flatMap((st) => listOf(st.value) ?? [toQ(st.value)]);
    if (comps && comps.length > 1 && comps.every((c) => c && vals.some((v) => eq(v, c)))) return "covered";
  }
  if (best([...Array(n).keys()]) === 0.5) return "component";
  return "undecided";
}

/** The Grade 5 release's families and items, as build-bank.mts selects them (live from the family generators). */
export function* tn5Items(): Generator<any> {
  const release: any = boardReleases.find((r: any) => r.id === RELEASE);
  const comps = [...new Set(assigned(release).map((a) => a.competency))].sort();
  const fams = [...FAMILIES.values()].filter((f) => comps.includes(f.competency)).map((f) => f.id).sort();
  for (const fam of fams) for (const p of pool(fam).items) yield p;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/^file:\/\//, "")) {
  const per: Record<string, Record<Verdict | "items", number> & { types: string[] }> = {};
  const tot: Record<string, number> = { items: 0, last: 0, any: 0, covered: 0, component: 0, undecided: 0 };
  for (const p of tn5Items()) {
    const r = (per[p.family] ??= { items: 0, last: 0, any: 0, covered: 0, component: 0, undecided: 0, types: [] });
    const v = verdictOf(p);
    r.items++; r[v]++; tot.items++; tot[v]++;
    if (!r.types.includes(p.type)) r.types.push(p.type);
  }
  const fams = Object.keys(per).sort();
  const sum = {
    note: "last = last step states the whole answer; any = an earlier step does; covered = every part of a multi-part answer is stated by some step (order-blind: weak, not counted as decided); component = a step states only one part (too weak to decide); undecided = the chain does not state the answer in a comparable form (not an error).",
    ...tot,
    families: fams.length,
    familiesAllLast: fams.filter((f) => per[f].last === per[f].items).length,
    decided: tot.last + tot.any,
    familiesAllDecided: fams.filter((f) => per[f].undecided + per[f].component + per[f].covered === 0).length,
    familiesNoneDecided: fams.filter((f) => per[f].undecided + per[f].component + per[f].covered === per[f].items),
    familiesPartlyUndecided: fams.filter((f) => per[f].undecided + per[f].component + per[f].covered > 0 && per[f].last + per[f].any > 0 && !(per[f].last === per[f].items)),
  };
  const here = dirname(fileURLToPath(import.meta.url));
  mkdirSync(join(here, "results"), { recursive: true });
  writeFileSync(join(here, "results/answer-consistency.json"), JSON.stringify({ summary: sum, perFamily: per }, null, 1) + "\n");
  console.log(JSON.stringify(sum).slice(0, 1500));
}
