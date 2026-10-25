import { Rational, parseRational, rat } from "../claim-kit";
import type { ClaimTable } from "../claim-kit";

/** Claims for families outside Grade 5 whose items were demoted by the soundness fix (re-census, acceptance test 10). */
const num = (t: string) => parseRational(t.replace(/−/g, "-"));

export const CLAIMS: ClaimTable = {
  // evaluate [s, t]: the justification says "s shaded out of t total"; the value is the fraction s / t (stated as a number)
  // evaluate [s, t]: the justification says "s shaded out of t total"; the value is the fraction s / t, stated as a floating-point number
  "adfname/evaluate": {
    check: (s) => {
      const j = s.justification;
      if (!j || j.rule !== "arithmetic-fact") return null;
      const m = j.operation.match(/^(\d+) shaded out of (\d+) total$/);
      if (!m || s.inputs.length !== 2 || Number(s.inputs[0]) !== Number(m[1]) || Number(s.inputs[1]) !== Number(m[2]) || Number(m[2]) === 0) return null;
      if (typeof s.value !== "number") return false;
      return Math.abs(s.value - Number(m[1]) / Number(m[2])) < 1e-12; // a float, so compare to 1e-12
    },
  },
  // count [set]: the input is {x ∈ ℤ : a ≤ x < b}, and the number of integers in it is b − a; or the input is "B ∩ C"
  // and the prompt lists B and C, so the count is the size of the intersection of the two listed sets
  "apcartn/count": (s, p) => {
    if (s.inputs.length !== 1 || typeof s.inputs[0] !== "string") return null;
    if (s.inputs[0] === "B ∩ C") {
      const set = (name: string) => { const m = p.prompt.match(new RegExp(`\\b${name} = \\{([^}]*)\\}`)); return m ? new Set(m[1].split(",").map((x) => x.trim()).filter(Boolean)) : null; };
      const B = set("B"), C = set("C");
      return B && C ? rat(BigInt([...B].filter((x) => C.has(x)).length)) : null;
    }
    const m = s.inputs[0].match(/^\{x ∈ ℤ : (−?-?\d+) ≤ x < (−?-?\d+)\}$/);
    if (!m) return null;
    const a = num(m[1]), b = num(m[2]);
    return a && b && a.isInteger() && b.isInteger() && b.numBig > a.numBig ? rat(b.numBig - a.numBig) : null;
  },
};
