/**
 * Answer-form requirements (grading-policy@1, approved policy P2). A form is enforced only when (1) the question's family declares the
 * rule (content/learning/form-rules.v1.json, written by scripts/form-rules.ts and reviewed in the pull request) AND (2) the question's
 * own instruction states it. An equal answer with no applicable rule is correct. A rule this module cannot judge for the answer's
 * semantics is "undeterminable": the submission is then unresolved, never given a verdict the system cannot justify.
 */
import declared from "../../../../content/learning/form-rules.v1.json";
import type { ParseResult, SemanticsKind } from "./parse.ts";

export type FormRuleId = "lowest-terms" | "ratio-simplest" | "simplest-surd" | "rational-denominator" | "mixed-number" | "improper-fraction" | "decimal" | "expanded" | "interval-notation" | "inequality-notation";
export interface FormRule { rule: FormRuleId; instruction: string }
export type FormResult = "satisfied" | "violated" | "undeterminable";

/** how each rule is stated in a question, and the answer kinds it can be judged for */
export const FORM_INSTRUCTIONS: { rule: FormRuleId; pattern: RegExp; unless?: RegExp; kinds: SemanticsKind[]; says: string }[] = [
  { rule: "lowest-terms", pattern: /\b(?:in its simplest form|in simplest form|in its lowest terms|in lowest terms|in standard form)\b/i, kinds: ["rational", "exact-real"], says: "in its simplest form" },
  { rule: "ratio-simplest", pattern: /\b(?:in its simplest form|in simplest form|in its lowest terms|in lowest terms)\b/i, kinds: ["ratio"], says: "in its simplest form" },
  { rule: "simplest-surd", pattern: /\bsimplest surd form\b|\bwrite √\d+ in its simplest form\b/i, kinds: ["exact-real", "roots"], says: "in simplest surd form" },
  { rule: "rational-denominator", pattern: /\bno square root in the denominator\b|\brational denominator\b|\brationali[sz]e the denominator\b/i, kinds: ["exact-real", "roots"], says: "with no square root in the denominator" },
  { rule: "mixed-number", pattern: /\bas a mixed number\b/i, unless: /\b(?:fraction or (?:a )?mixed number is fine|mixed number is fine)\b/i, kinds: ["rational"], says: "as a mixed number" },
  { rule: "improper-fraction", pattern: /\bas an improper fraction\b/i, kinds: ["rational"], says: "as an improper fraction" },
  { rule: "decimal", pattern: /\bas a decimal\b/i, kinds: ["rational", "exact-real"], says: "as a decimal" },
  { rule: "expanded", pattern: /\bwithout brackets\b|(?:^|[.:]\s+)(?:use [^.]{0,60}? to )?expand\b/i, kinds: ["exact-real", "expression"], says: "expanded (without brackets)" },
  { rule: "interval-notation", pattern: /\bin interval notation\b/i, unless: /\binterval notation \(or as an inequality/i, kinds: ["real-subset"], says: "in interval notation" },
  { rule: "inequality-notation", pattern: /\bas an inequality\b/i, unless: /\binterval notation \(or as an inequality/i, kinds: ["real-subset"], says: "as an inequality" },
];
/** a stated permission (not a requirement): mixed numbers are accepted for this answer */
export const MIXED_PERMITTED = /\b(?:fraction or (?:a )?mixed number is fine|mixed number is fine|as a mixed number)\b/i;

/** the rules a question's instruction states (no declaration check: used by the scanner and by the coverage test) */
export function statedRules(prompt: string, kind: SemanticsKind): { rule: FormRuleId; instruction: string; judgeable: boolean }[] {
  if (kind === "choice" || kind === "educator") return []; // the options (or the educator) carry the form
  const out: { rule: FormRuleId; instruction: string; judgeable: boolean }[] = [];
  for (const f of FORM_INSTRUCTIONS) {
    const m = f.pattern.exec(prompt);
    if (!m || (f.unless && f.unless.test(prompt))) continue;
    // a rule stated for another kind of answer (ratio vs rational) is the same words: only the matching one is taken
    if (f.rule === "lowest-terms" && kind === "ratio") continue;
    if (f.rule === "ratio-simplest" && kind !== "ratio") continue;
    // a form stated for another kind of answer is about the working (e.g. "Expand 3(x + 2) … what is the coefficient?"), not the answer
    if (!f.kinds.includes(kind)) continue;
    out.push({ rule: f.rule, instruction: m[0].trim(), judgeable: true });
  }
  return out;
}
const DECLARED = (declared as { families: Record<string, FormRuleId[]> }).families;
export const declaredRules = (family: string | null): FormRuleId[] => (family ? DECLARED[family] ?? [] : []);
export const FORM_RULES_HASH = (declared as { hash: string }).hash;

const gcd = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
/** judge one rule on what the learner wrote (the parser's notation facts and canonical text) */
export function judgeForm(rule: FormRuleId, kind: SemanticsKind, p: Extract<ParseResult, { status: "parsed" }>): FormResult {
  const n = p.notation, c = p.canonical;
  const ratParts = (t: string) => { const m = /^(-?)(\d+)(?: (\d+)\/(\d+)|\/(-?)(\d+))?$/.exec(t); return m; };
  switch (rule) {
    case "expanded": return n.expanded ? "satisfied" : "violated";
    case "interval-notation": return n.inequality || n.orJoin ? "violated" : "satisfied"; // pieces are joined with ∪ in interval notation
    case "inequality-notation": return n.inequality ? "satisfied" : "violated";
    case "rational-denominator": return n.surdInDenominator ? "violated" : "satisfied";
    case "simplest-surd": return n.surdInDenominator || n.surds.some((r) => !/^\d+$/.test(r) || !squarefree(BigInt(r))) ? "violated" : n.surds.every((r) => /^\d+$/.test(r)) ? "satisfied" : "undeterminable";
    case "ratio-simplest": {
      const [a, b] = c.split(":");
      if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) return "violated";
      return gcd(BigInt(a), BigInt(b)) === 1n ? "satisfied" : "violated";
    }
    case "lowest-terms": {
      if (n.decimal) return "violated";
      if (kind === "exact-real") return n.unreducedFraction || n.surdInDenominator || n.surds.some((r) => !/^\d+$/.test(r) || !squarefree(BigInt(r))) ? "violated" : "satisfied";
      const m = ratParts(c);
      if (!m) return "undeterminable";
      if (m[3] !== undefined) return gcd(BigInt(m[3]), BigInt(m[4])) === 1n ? "satisfied" : "violated"; // mixed number: its fraction part reduced
      if (m[6] === undefined) return "satisfied"; // an integer
      if (m[5] === "-") return "violated"; // a negative denominator is not the standard form
      const a = BigInt(m[2]), b = BigInt(m[6]);
      return b !== 1n && gcd(a, b) === 1n ? "satisfied" : "violated";
    }
    case "mixed-number": {
      if (n.decimal) return "violated";
      const m = ratParts(c);
      if (!m) return "undeterminable";
      if (m[3] !== undefined) return gcd(BigInt(m[3]), BigInt(m[4])) === 1n ? "satisfied" : "violated";
      if (m[6] === undefined) return "satisfied";
      const a = BigInt(m[2]), b = BigInt(m[6]);
      return m[5] !== "-" && a < b && gcd(a, b) === 1n ? "satisfied" : "violated"; // a fraction is right only when it is less than 1 and reduced
    }
    case "improper-fraction": return n.mixedNumber || n.decimal ? "violated" : "satisfied";
    case "decimal": return n.fraction || n.mixedNumber ? "violated" : "satisfied";
  }
}
function squarefree(n: bigint): boolean { if (n < 1n) return false; for (let p = 2n; p * p <= n; p++) if (n % (p * p) === 0n) return false; return true; }
