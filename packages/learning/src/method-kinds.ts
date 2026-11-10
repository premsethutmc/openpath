/**
 * method-kinds@1: what method a question needs, from the question's own generator (families only, so the library build can use
 * it). A family that mixes methods declares its cases (`teach.caseOf`, or a rule below); otherwise the family is the method.
 * Fixed hand-written items need no specific method beyond their competency ([]).
 */
import { FAMILIES } from './families';
/** a generated question's family and parameters, read from its id (no problem is built: this runs over whole pools) */
export const parseId = (id: string): { family: string; params: number[] } | null => {
  const m = id.match(/^gen:([a-z0-9]+):(-?\d+(?:,-?\d+)*)(?::(?:mc|w))?$/);
  return m && FAMILIES.has(m[1]) ? { family: m[1], params: m[2].split(',').map(Number) } : null;
};
/** A requirement is a method/case, not merely a competency or question family. */
export function methodRequirements(id: string): string[] | null {
  const p=parseId(id); if(!p)return null;
  return requirementsOf(p.family,p.params);
}
/** the requirements of a family's question with these parameters (see methodRequirements) */
export function requirementsOf(family: string, params: number[]): string[] | null {
  const p={family,params};
  if(p.family==='aqfp') {const name=['quadratic-expansion','rational-difference','conjugate','cubic-expansion',p.params[3]===0?'sine-limit':'cosine-limit'][p.params[0]];return name?['difference-quotient',name]:null;}
  if(p.family==='ahext')return [p.params[2]===0?'exterior-from-interiors':'far-interior-from-exterior'];
  if(p.family==='fmulw')return ['fraction-times-whole'];
  if(p.family==='avfwq')return [p.params[3]===0?'fraction-times-whole':'fraction-of-quantity'];
  if(p.family==='subst')return ['quadratic-substitution','change-integral-limits',`integrate-u-power-${p.params[3]}`];
  if(p.family==='ahtri')return ['triangle-angle-sum'];
  if(p.family==='ahiso')return ['triangle-angle-sum',p.params[1]===0?'isosceles-base':'isosceles-vertex'];
  // Pythagoras (2026-11-10): the converse test, and the two rules that generate triples, are methods of their own
  if(p.family==='ahconv')return ['pythagoras-converse'];
  if(p.family==='ahgen')return [p.params[0]<=1?'triple-rule-2m':'triple-rule-mn'];
  if(p.family==='faddu')return ['common-denominator-add'];
  if(p.family==='avfas')return [p.params[6]?'common-denominator-subtract':'common-denominator-add',...(p.params[0]||p.params[3]?['mixed-number-conversion']:[])];
  // a family that declares its teaching cases: each case is a method
  const c=FAMILIES.get(p.family)?.teach?.caseOf;return c?[`${p.family}:${c(p.params)}`]:null;
}
/** method-sections@2: the method kinds a question needs, never null: declared requirements, else its family, else none */
export function methodKinds(id: string): string[] {
  const p = parseId(id);
  return p ? kindsOf(p.family, p.params) : [];
}
export const kindsOf = (family: string, params: number[]): string[] => requirementsOf(family, params) ?? [`family:${family}`];
/** The method kinds an explanation shows: those of the questions its sections work through (method-sections@2). */
export const shownKinds = (s: { screens: { instance?: string }[] }) => new Set(s.screens.flatMap((sc) => (sc.instance ? methodKinds(sc.instance) : [])));
