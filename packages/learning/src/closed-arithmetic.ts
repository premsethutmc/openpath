/** The prompt's own closed numeric expression, as a statement for the exact checker: ONE generic rule for every family (no per-family code).
 *  It only reads what the student is shown; a prompt that is not exactly "[lead-in] <numbers and operators> [= ?]" yields null (not guessed). */
const LEAD = /^(?:work out|calculate|evaluate|find the value of|what is|compute)\s*:?\s*/i;
const BODY = /^[0-9+\-−–×÷*/^().\s]+$/;
export function closedExpression(prompt: string): string | null {
  let p = prompt.replace(/\s+/g, " ").trim().replace(LEAD, "");
  p = p.replace(/\s*=\s*\?\s*$/, "").replace(/\s*\?\s*$/, "").replace(/\.$/, "").trim();
  if (!p || !BODY.test(p) || !/\d/.test(p) || !/[+\-−–×÷*/^]/.test(p.replace(/^[+\-−–]/, ""))) return null;
  if (/\d\s+\d/.test(p)) return null;                       // two numbers side by side are not an expression
  const s = p.replace(/[−–]/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
  let depth = 0; for (const c of s) { depth += c === "(" ? 1 : c === ")" ? -1 : 0; if (depth < 0) return null; }
  return depth === 0 ? s : null;
}

/** The invariant: "the exact value of the closed numeric expression the prompt shows". Families mapped to it, each proven by
 *  tools/mathematics/coverage-audit/closed-arith-proof.test (whole pool: the checker reproduces every stored answer, rejects every known wrong answer).
 *  A family not listed here is never routed to this rule, whatever its prompt looks like. */
export const CLOSED_ARITHMETIC_FAMILIES: ReadonlySet<string> = new Set(["fadd", "mmul", "ldiv", "addr", "aazero", "aamul01", "acsub2", "acsub3", "acsubn", "adcol3", "adcolx", "aep10", "aemult", "aediv0", "aeaddn", "aeadd3", "agdec", "agbod", "aidmul", "aiddiv", "aidp10", "aiint", "aiintx", "ajimul", "ajidiv"]);
