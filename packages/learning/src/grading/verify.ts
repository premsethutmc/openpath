/**
 * Value verifiers (grading-policy@1, UNIFIED_GRADING_ARCHITECTURE.md §5): the least complex sufficient comparison for each answer
 * semantics, on what the strict parser read — never on the learner's raw text. Each returns "equal", "different" or "undecided"; it never
 * reads the other verifiers' opinions. The kernel verifiers (exact checker, typed kernels) are used, alone, for contracts the independent
 * kernel has validated (grade.ts); these are for every other contract.
 */
import { canonicalOf, exactCanonical, sameAnswer } from "../answer-types.ts";
import type { SemanticsKind } from "./parse.ts";

export type Equality = "equal" | "different" | "undecided";
export interface Verifier { id: string; version: string }
export const VERIFIERS = {
  choice: { id: "choice-label", version: "1" },
  rational: { id: "rational-exact", version: "1" },
  field: { id: "exact-field", version: "1" },
  structure: { id: "structure", version: "1" },
  interval: { id: "real-subset", version: "1" },
  polynomial: { id: "exact-polynomial", version: "1" },
  sampled: { id: "sampled-numeric", version: "1" },
} as const;

/** a normal-form exact value printed by the parser (rational + k√n + kπ terms, no brackets): equal values have equal texts */
const normalForm = (s: string) => !/[()a-df-zA-Z]/.test(s.replace(/√|π/g, ""));
const rat = (s: string): [bigint, bigint] | null => { const m = /^(-?\d+)(?:\/(\d+))?$/.exec(s); return m ? [BigInt(m[1]), BigInt(m[2] ?? "1")] : null; };
function sameExact(a: string, b: string): { eq: Equality; verifier: Verifier } {
  if (normalForm(a) && normalForm(b)) return { eq: a === b ? "equal" : "different", verifier: VERIFIERS.field };
  try { const x = exactCanonical(a), y = exactCanonical(b); return { eq: x === y ? "equal" : "different", verifier: VERIFIERS.polynomial }; } catch { /* not a polynomial over radicals and π */ }
  try { return { eq: sameAnswer("expression", a, b) ? "equal" : "different", verifier: VERIFIERS.sampled }; } catch { return { eq: "undecided", verifier: VERIFIERS.sampled }; }
}
const splitItems = (s: string) => s.replace(/^\((.*)\)$/, "$1").split(/\s*,\s*/).filter((x) => x.length);

/** compare a learner's parsed value with the contract's expected value (both as the parser printed them) */
export function compareValues(kind: SemanticsKind, response: { canonical: string; value: string }, expected: { canonical: string; value: string }): { eq: Equality; verifier: Verifier } {
  switch (kind) {
    case "choice": return { eq: response.value === expected.value ? "equal" : "different", verifier: VERIFIERS.choice };
    case "rational": {
      const a = rat(response.value), b = rat(expected.value);
      if (!a || !b) return { eq: "undecided", verifier: VERIFIERS.rational };
      return { eq: a[0] * b[1] === b[0] * a[1] ? "equal" : "different", verifier: VERIFIERS.rational };
    }
    case "exact-real": return sameExact(response.value, expected.value);
    case "expression": {
      try { const x = exactCanonical(response.value), y = exactCanonical(expected.value); if (x === y) return { eq: "equal", verifier: VERIFIERS.polynomial }; } catch { /* not a polynomial */ }
      try { return { eq: sameAnswer("expression", response.value, expected.value) ? "equal" : "different", verifier: VERIFIERS.sampled }; } catch { return { eq: "undecided", verifier: VERIFIERS.sampled }; }
    }
    case "antiderivative": {
      try { return { eq: sameAnswer("antiderivative", response.value, expected.value) ? "equal" : "different", verifier: VERIFIERS.sampled }; } catch { return { eq: "undecided", verifier: VERIFIERS.sampled }; }
    }
    case "solution-set": case "roots": case "tuple": {
      const a = splitItems(response.value), b = splitItems(expected.value);
      const same = (x: string, y: string) => sameExact(x, y).eq;
      if (kind === "tuple") {
        if (a.length !== b.length) return { eq: "different", verifier: VERIFIERS.structure };
        const r = a.map((x, i) => same(x, b[i]));
        return { eq: r.includes("different") ? "different" : r.includes("undecided") ? "undecided" : "equal", verifier: VERIFIERS.structure };
      }
      // a set: duplicates do not change it; roots: a multiset
      const dedupe = (xs: string[]) => (kind === "solution-set" ? xs.filter((x, i) => !xs.slice(0, i).some((y) => same(x, y) === "equal")) : xs);
      const A = dedupe(a), B = dedupe(b);
      if (A.length !== B.length) return { eq: "different", verifier: VERIFIERS.structure };
      const left = [...B];
      for (const x of A) {
        const k = left.findIndex((y) => same(x, y) === "equal");
        if (k < 0) return { eq: left.some((y) => same(x, y) === "undecided") ? "undecided" : "different", verifier: VERIFIERS.structure };
        left.splice(k, 1);
      }
      return { eq: "equal", verifier: VERIFIERS.structure };
    }
    case "matrix": {
      const rows = (s: string) => [...s.matchAll(/\[([^[\]]*)\]/g)].map((m) => splitItems(m[1]));
      const a = rows(response.value), b = rows(expected.value);
      if (a.length !== b.length || a.some((r, i) => r.length !== b[i].length)) return { eq: "different", verifier: VERIFIERS.structure };
      const r = a.flatMap((row, i) => row.map((x, j) => sameExact(x, b[i][j]).eq));
      return { eq: r.includes("different") ? "different" : r.includes("undecided") ? "undecided" : "equal", verifier: VERIFIERS.structure };
    }
    case "ratio": {
      const parts = (s: string) => s.split(":").map((p) => rat(p.includes(" ") ? "" : p));
      const [a, b] = parts(response.value), [c, d] = parts(expected.value);
      if (!a || !b || !c || !d) return { eq: "undecided", verifier: VERIFIERS.rational };
      return { eq: a[0] * b[1] * d[0] * c[1] === c[0] * d[1] * b[0] * a[1] ? "equal" : "different", verifier: VERIFIERS.rational };
    }
    case "real-subset": {
      const x = canonicalOf("interval", response.value), y = canonicalOf("interval", expected.value);
      if (x === null || y === null) return { eq: "undecided", verifier: VERIFIERS.interval };
      return { eq: x === y ? "equal" : "different", verifier: VERIFIERS.interval };
    }
    default: return { eq: "undecided", verifier: VERIFIERS.sampled };
  }
}
