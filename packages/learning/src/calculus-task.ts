/**
 * calculus-task@1: the exact task a calculus question asks, read from its own wording ("Differentiate y = …", "Find ∫ … dx.",
 * "∫ from a to b of … dx", "Evaluate lim (x → a) of …"), so that a learner's typed working can be judged line by line by the
 * exact calculus checkers (unified-math-engine, E5/E6 binders). A question whose wording is not one of these, or whose
 * expression cannot be read exactly, has no task: its working stays "not checked" (never guessed).
 */
import type { CalculusProblem, Expr } from "./calculus-core.ts";
import { parseNaturalWorking } from "./natural-working.ts";
import { question } from "./content.ts";

export const CALCULUS_TASK = "calculus-task@1" as const;

const SUP: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };
const SUB: Record<string, string> = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₋": "-" };
const plainNumber = (t: string, map: Record<string, string>) => [...t].map((c) => map[c] ?? c).join("");

/** The question's notation in the reader's notation: − for minus, powers as ^, e^(…) as exp(…), tan⁻¹ as atan. */
export function toReaderNotation(t: string): string {
  return t
    .replace(/[−–]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/tan⁻¹/g, "atan")
    // calculus-notation@1: sin⁻¹u is written exactly as tan⁻¹(u/√(1−u²)) on −1 < u < 1 (the kernel uses the same form),
    // cos⁻¹u as π/2 − sin⁻¹u; divisions are bracketed so the reader never meets "a/b c"
    .replace(/sin⁻¹\s*\(([^()]*)\)/g, "atan(($1)/(sqrt(1-($1)^2)))").replace(/sin⁻¹\s*([a-z])\b/g, "atan(($1)/(sqrt(1-($1)^2)))")
    .replace(/cos⁻¹\s*\(([^()]*)\)/g, "(pi/2-atan(($1)/(sqrt(1-($1)^2))))").replace(/cos⁻¹\s*([a-z])\b/g, "(pi/2-atan(($1)/(sqrt(1-($1)^2))))")
    .replace(/([0-9x)])eˣ/g, "$1 exp(x)")
    .replace(/(?<![a-z])eˣ/g, "exp(x)")
    .replace(/\b(sin|cos|tan|sec|cosec|cot)²\s*([a-z])\b/g, "$1($2)^2")
    .replace(/(?<![a-z])(sin|cos|tan|sec|cosec|cot|log|ln) ([a-z])\b/g, "$1($2)")
    .replace(/\bsec\(([^()]*)\)/g, "(1/(cos($1)))").replace(/\bcosec\(([^()]*)\)/g, "(1/(sin($1)))").replace(/\bcot\(([^()]*)\)/g, "(cos($1)/(sin($1)))")
    .replace(/(\d+)\^x\b/g, "exp(x*ln($1))").replace(/(\d+)ˣ/g, "exp(x*ln($1))")
    .replace(/(?<![a-z])log\(/g, "ln(")
    .replace(/\|([^|]+)\|/g, "abs($1)")
    .replace(/([a-z)\d])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, b, s) => `${b}^${plainNumber(s, SUP)}`)
    .replace(/(?<![a-z])e\^\(([^()]*)\)/g, "exp($1)")
    .replace(/(?<![a-z])e\^([a-z0-9]+)/g, "exp($1)")
    .replace(/√\(([^()]*)\)/g, "(sqrt($1))")
    .replace(/√([a-z0-9]+)/g, "(sqrt($1))")
    .trim();
}

/** An expression in the question's notation, read exactly; null when the reader cannot. */
export function readExpression(t: string): Expr | null {
  try {
    const r = parseNaturalWorking({ format: "natural", text: `y = ${toReaderNotation(t)}`, conventions: { log: "natural" } }) as { classification: string; lines?: { relation?: { kind: string; right?: Expr } }[] };
    const rel = r.classification === "parsed" ? r.lines?.[0]?.relation : undefined;
    return rel?.kind === "equation" && rel.right ? rel.right : null;
  } catch {
    return null;
  }
}

const rational = (t: string): string | null => {
  const s = plainNumber(t.trim(), SUB).replace(/[−–]/g, "-");
  return /^-?\d+(?:\/\d+)?$/.test(s) ? s : null;
};

/** calculus-notation@1: the domain a question states — "(for −7 < x < 7)", "(x > 0; …)" — as the checker's restrictions */
export function statedDomain(prompt: string): string[] {
  const p = prompt.replace(/[−–]/g, "-");
  let m = p.match(/\((?:for )?(-?\d+(?:\/\d+)?) < ([a-z]) < (-?\d+(?:\/\d+)?)[);]/);
  if (m) return [`${m[2]} > ${m[1]}`, `${m[2]} < ${m[3]}`];
  m = p.match(/\((?:for )?([a-z]) (>|<|≠) (-?\d+(?:\/\d+)?)[);]/);
  return m ? [`${m[1]} ${m[2] === "≠" ? "!=" : m[2]} ${m[3]}`] : [];
}

/** The task a prompt states, or null. */
export function calculusTaskFromPrompt(prompt: string): CalculusProblem | null {
  const t = calculusTaskBare(prompt), r = statedDomain(prompt);
  return t && r.length && (t.task === "derivative" || t.task === "indefinite-integral") ? { ...t, restrictions: r } as CalculusProblem : t;
}
function calculusTaskBare(prompt: string): CalculusProblem | null {
  const p = prompt.replace(/\s+/g, " ").trim();
  let m: RegExpMatchArray | null;
  if ((m = p.match(/^Differentiate (?:y|f\(x\)) = (.+?) with respect to ([a-z])\b/))) {
    const e = readExpression(m[1]);
    return e ? { domain: "calculus", task: "derivative", expression: e, variable: m[2] } : null;
  }
  if ((m = p.match(/^If y = (.+?), find d²y\/dx²/))) {
    const e = readExpression(m[1]);
    return e ? { domain: "calculus", task: "derivative", expression: e, variable: "x", order: 2 } : null;
  }
  if ((m = p.match(/^Find ∫ (.+?) d([a-z])(?:\.| \()/))) {
    const e = readExpression(m[1]);
    return e ? { domain: "calculus", task: "indefinite-integral", integrand: e, variable: m[2] } : null;
  }
  if ((m = p.match(/^(?:Evaluate )?∫ from (\S+) to (\S+) of (.+?) d([a-z])(?: = \?|[.,])/))) {
    const lo = rational(m[1]), hi = rational(m[2]), e = readExpression(m[3]);
    return lo !== null && hi !== null && e ? { domain: "calculus", task: "definite-integral", integrand: e, variable: m[4], lower: lo, upper: hi } : null;
  }
  if ((m = p.match(/^Evaluate ∫([₀₁₂₃₄₅₆₇₈₉₋]+)([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+) (.+?) d([a-z])\./))) {
    const lo = rational(m[1]), hi = rational(plainNumber(m[2], SUP)), e = readExpression(m[3]);
    return lo !== null && hi !== null && e ? { domain: "calculus", task: "definite-integral", integrand: e, variable: m[4], lower: lo, upper: hi } : null;
  }
  if ((m = p.match(/^(?:Find|Evaluate) lim \(([a-z]) → (-?[\d/]+|−\d+|∞|−∞)\) of (.+?)(?:\.|,| Give)/))) {
    const a = m[2] === "∞" ? "infinity" : m[2] === "−∞" ? "-infinity" : rational(m[2]), e = readExpression(m[3].replace(/⁄/g, "/"));
    return a !== null && e ? { domain: "calculus", task: "limit", expression: e, variable: m[1], approach: a } : null;
  }
  return null;
}

/** The task of a question (by id), or null. Multiple-choice forms are judged on their typed form's task. */
export function calculusTaskOf(qid: string): CalculusProblem | null {
  try {
    return calculusTaskFromPrompt(question(qid.replace(/:mc$/, "")).prompt);
  } catch {
    return null;
  }
}
