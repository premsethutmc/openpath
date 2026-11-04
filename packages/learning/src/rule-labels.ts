/**
 * E7 repair D: a claimed method is a claim of its own, separate from the transformation it accompanies. Explicit outcomes (typed derivative steps):
 *   correct transformation + label that applies         → verified
 *   correct transformation + label that cannot apply    → invalid ("the cited rule does not justify this step"): a false statement in the work
 *   correct transformation + label not recognised       → verified; the label is reported `uncertified` (never silently certified, never a prerequisite)
 *   incorrect transformation + any label                → invalid (the exact kernel's refutation; the label is irrelevant)
 * Applicability is a structural fact about the expression the rule is applied to, so it is checked here on the shared typed Expr, once, for every typed route.
 */
import type { Expr } from "./calculus-core.ts";

export type LabelVerdict = "applies" | "contradicted" | "unrecognised";
const dep = (e: Expr, v: string): boolean => {
  switch (e.kind) {
    case "constant": case "pi": return false;
    case "variable": return e.name === v;
    case "add": return e.terms.some((t) => dep(t, v));
    case "multiply": return e.factors.some((t) => dep(t, v));
    case "power": return dep(e.base, v);
    case "root": return dep(e.radicand, v);
    default: return dep((e as { argument: Expr }).argument, v);
  }
};
const nodes = (e: Expr): Expr[] => [e, ...(e.kind === "add" ? e.terms.flatMap(nodes) : e.kind === "multiply" ? e.factors.flatMap(nodes) : e.kind === "power" ? nodes(e.base) : e.kind === "root" ? nodes(e.radicand) : "argument" in e ? nodes((e as { argument: Expr }).argument) : [])];
const powerForm = (e: Expr, v: string): boolean => {
  switch (e.kind) {
    case "constant": case "pi": case "variable": case "power": case "root": return true;
    case "add": return e.terms.every((t) => powerForm(t, v));
    case "multiply": { const d = e.factors.filter((f) => dep(f, v)); return d.length <= 1 && d.every((f) => powerForm(f, v)); }
    default: return false;
  }
};

export function ruleLabelVerdict(label: string, e: Expr, v: string): LabelVerdict {
  const l = label.toLowerCase();
  if (/\bpower\b/.test(l) && !/chain|product|quotient/.test(l)) return powerForm(e, v) ? "applies" : "contradicted";
  if (/\bchain\b/.test(l)) return nodes(e).some((n) => (n.kind === "power" ? n.base.kind !== "variable" && dep(n.base, v) : n.kind === "root" ? n.radicand.kind !== "variable" : "argument" in n && (n as { argument: Expr }).argument.kind !== "variable" && dep((n as { argument: Expr }).argument, v))) ? "applies" : "contradicted";
  if (/\bproduct\b/.test(l)) return nodes(e).some((n) => n.kind === "multiply" && n.factors.filter((f) => dep(f, v)).length >= 2) ? "applies" : "contradicted";
  if (/\bquotient\b/.test(l)) return nodes(e).some((n) => n.kind === "power" && n.exponent < 0 && dep(n.base, v)) ? "applies" : "contradicted";
  return "unrecognised";
}
