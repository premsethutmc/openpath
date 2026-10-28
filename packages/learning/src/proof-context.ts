/**
 * E7 Phase 4: one immutable, provenance-aware proof context.
 *
 * Built ONCE from the typed problem at the engine boundary and passed (never stored in a module global) to every route and to the certification
 * boundary. Item kinds are never merged:
 *   task-premise        what the task supplied (data, named assumptions, restrictions, domain components)
 *   implied-restriction what the task's own expressions force (log argument > 0, denominators != 0); derived from the typed problem, not from any working
 *   proved-fact         a fact an earlier VERIFIED line established (added by `withProved`, returns a new context)
 *   student-assumption  a condition the student introduced; classified against the task, never merged into it
 *   unresolved-premise  something the working relies on that nothing supplies (e.g. a scenario quantity absent from the task data)
 * The task domain is `restrictions AND (branch_1 OR branch_2 ...)`. Branches stay alternatives: a statement about the domain must hold on EVERY
 * branch, and a student restriction that fits only some branches is a narrowing, not a restatement.
 */
import { sha256Hex } from "./digest.ts";
import { emptyConjunction, parseConstraints, type Constraint } from "./claim-certifier.ts";

export const PROOF_CONTEXT_CONTRACT = "openpath-proof-context@1" as const;
export type ItemKind = "task-premise" | "implied-restriction" | "proved-fact" | "student-assumption" | "unresolved-premise";
export interface ContextItem { id: string; kind: ItemKind; text: string; origin: string }
export type StudentRelation = "restates" | "implied" | "narrows" | "contradicts" | "new-quantity" | "undecided";
export interface StudentAssumption { text: string; line: number; relation: StudentRelation; coveredBranches: number[] | null; obligation: string | null }
export interface ProofContext {
  readonly contract: typeof PROOF_CONTEXT_CONTRACT;
  /** digest of the TASK-level parts only: it is the same in every route and at the certification boundary */
  readonly digest: string;
  readonly premises: readonly ContextItem[];
  readonly restrictions: readonly string[];
  /** alternative domain components; null when the task has none. NEVER conjoined. */
  readonly branches: readonly string[] | null;
  readonly assumptions: readonly string[];
  readonly implied: readonly ContextItem[];
  readonly proved: readonly ContextItem[];
  readonly student: readonly StudentAssumption[];
  readonly unresolved: readonly ContextItem[];
  /** typed task restrictions/components that no parser could read: they exist, and are reported rather than dropped silently */
  readonly unreadable: readonly string[];
  readonly variables: readonly string[];
}

const deepFreeze = <T>(x: T): T => { if (x && typeof x === "object" && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x as object)) deepFreeze(v); } return x; };
const sha = (x: unknown) => sha256Hex(JSON.stringify(x)).slice(0, 16);

function flatten(d: unknown, key: string, out: ContextItem[]): void {
  if (d === null || d === undefined) return;
  if (Array.isArray(d)) d.forEach((x, i) => flatten(x, `${key}[${i}]`, out));
  else if (typeof d === "object") for (const [k, v] of Object.entries(d)) flatten(v, `${key}.${k}`, out);
  else out.push({ id: key, kind: "task-premise", text: `${key} = ${String(d)}`, origin: "task data" });
}

// ------------------------------------------------------------------------------------------------ implied restrictions of the typed expression
type E = { kind?: string; [k: string]: unknown };
function linearIn(x: unknown, v: string): { a: number; b: number } | null {
  const e = x as E; if (!e || typeof e !== "object") return null;
  switch (e.kind) {
    case "variable": return e.name === v ? { a: 1, b: 0 } : null;
    case "constant": { const n = Number(e.value); return Number.isFinite(n) ? { a: 0, b: n } : null; }
    case "add": { let a = 0, b = 0; for (const t of (e.terms as unknown[]) ?? []) { const l = linearIn(t, v); if (!l) return null; a += l.a; b += l.b; } return { a, b }; }
    case "multiply": { let acc: { a: number; b: number } | null = { a: 0, b: 1 }; for (const f of (e.factors as unknown[]) ?? []) { const l = linearIn(f, v); if (!l || !acc) return null; if (acc.a !== 0 && l.a !== 0) return null; acc = { a: acc.a * l.b + acc.b * l.a, b: acc.b * l.b }; } return acc; }
    default: return null;
  }
}
function impliedOf(problem: unknown, v: string | null): ContextItem[] {
  const out: ContextItem[] = []; const seen = new Set<string>();
  const add = (text: string, origin: string) => { if (!seen.has(text)) { seen.add(text); out.push({ id: `implied:${out.length}`, kind: "implied-restriction", text, origin }); } };
  const bound = (arg: unknown, strict: boolean, why: string, ne = false) => {
    const l = v ? linearIn(arg, v) : null;
    if (l && l.a !== 0 && v) { const r = -l.b / l.a, rt = Number.isInteger(r) ? String(r) : String(r); const op = ne ? "!=" : l.a > 0 ? (strict ? ">" : ">=") : (strict ? "<" : "<="); add(`${v} ${op} ${rt}`, why); }
    else add(`${why} (not a one-variable linear condition: carried as a kernel-derived restriction)`, why);
  };
  const walk = (x: unknown): void => {
    const e = x as E; if (!e || typeof e !== "object") return;
    if (e.kind === "log") bound(e.argument, true, "the argument of log must be positive");
    if (e.kind === "sqrt") bound(e.radicand ?? e.argument, false, "the radicand of a square root must be non-negative");
    if (e.kind === "power" && typeof e.exponent === "number" && (e.exponent as number) < 0) bound(e.base, true, "a denominator must be non-zero", true);
    for (const k of ["terms", "factors"]) if (Array.isArray(e[k])) (e[k] as unknown[]).forEach(walk);
    for (const k of ["base", "argument", "radicand", "left", "right"]) if (e[k] && typeof e[k] === "object") walk(e[k]);
  };
  const p = problem as Record<string, unknown>;
  for (const k of ["expression", "integrand", "left", "right"]) if (p?.[k]) walk(p[k]);
  return out;
}

/**
 * E7 repair C: a statement problem ("2x = 6, x < 0", "x^2 = 16 where x > 0") carries its premises and its variable in the text. They are read here, once, into the same
 * immutable context a typed problem has, so that a premise means the same wherever it is written and a student assumption about the problem's own variable is not an "unrelated quantity".
 */
function statementPremises(statement: string): { restrictions: string[]; letters: string[] } {
  const body = statement.replace(/^\s*(?:solve|find|determine|simplify|evaluate|compute|calculate)\b/i, "").replace(/\b(?:such that|given that|provided that|where|when|for|if|given|with)\b/gi, ",");
  const REL = /^\s*([a-z])\s*(<=|>=|!=|<|>|≤|≥|≠)\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)\s*$/, REV = /^\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)\s*(<=|>=|!=|<|>|≤|≥|≠)\s*([a-z])\s*$/;
  const FLIP: Record<string, string> = { "<": ">", ">": "<", "<=": ">=", ">=": "<=", "≤": "≥", "≥": "≤", "!=": "!=", "≠": "≠" };
  const restrictions: string[] = [], letters = new Set<string>();
  for (const part of body.split(/,|;|\band\b/i)) {
    if (!/[=<>≤≥≠]/.test(part)) continue;
    for (const m of part.replace(/[A-Za-z]{2,}/g, " ").match(/(?<![A-Za-z])[a-z](?![A-Za-z])/g) ?? []) letters.add(m);
    const a = REL.exec(part), b = REV.exec(part);
    if (a) restrictions.push(`${a[1]} ${a[2]} ${a[3]}`); else if (b) restrictions.push(`${b[3]} ${FLIP[b[2]]} ${b[1]}`);
  }
  return { restrictions, letters: [...letters] };
}
// ------------------------------------------------------------------------------------------------ construction
export function buildProofContext(problem: unknown): ProofContext {
  const p = (problem && typeof problem === "object" ? problem : {}) as { restrictions?: unknown; domainComponents?: unknown; assumptions?: unknown; coefficientDomain?: unknown; variable?: unknown; data?: unknown };
  const premises: ContextItem[] = []; flatten(p.data, "data", premises);
  const stated = typeof (p as { statement?: unknown }).statement === "string" ? statementPremises((p as { statement: string }).statement) : { restrictions: [] as string[], letters: [] as string[] };
  const restrictions = [...new Set([...(Array.isArray(p.restrictions) ? p.restrictions : []).filter((s): s is string => typeof s === "string"), ...stated.restrictions])];
  const branches = Array.isArray(p.domainComponents) && p.domainComponents.length ? p.domainComponents.filter((s): s is string => typeof s === "string") : null;
  const assumptions = [...new Set([...(Array.isArray(p.assumptions) ? p.assumptions.filter((s): s is string => typeof s === "string") : []), ...(p.coefficientDomain === "real" ? ["real-coefficients"] : [])])].sort();
  const v = typeof p.variable === "string" ? p.variable : null;
  const unreadable = [...restrictions, ...(branches ?? [])].filter((s) => !parseConstraints(s));
  const implied = impliedOf(problem, v);
  const vars = new Set<string>(v ? [v] : stated.letters);
  for (const s of [...restrictions, ...(branches ?? []), ...implied.map((i) => i.text)]) for (const c of parseConstraints(s) ?? []) vars.add(c.v);
  const taskPart = { premises: premises.map((i) => i.text), restrictions, branches, assumptions, implied: implied.map((i) => i.text) };
  return deepFreeze({ contract: PROOF_CONTEXT_CONTRACT, digest: sha(taskPart), premises, restrictions, branches, assumptions, implied, proved: [], student: [], unresolved: [], unreadable, variables: [...vars].sort() });
}
/** a new context that also carries facts earlier VERIFIED lines established (the task-level digest is unchanged) */
export function withProved(ctx: ProofContext, facts: { ref: string; text: string }[]): ProofContext {
  return deepFreeze({ ...ctx, proved: [...ctx.proved, ...facts.map((f, i) => ({ id: `proved:${ctx.proved.length + i}`, kind: "proved-fact" as const, text: f.text, origin: f.ref }))] });
}
export function withUnresolved(ctx: ProofContext, items: { text: string; origin: string }[]): ProofContext {
  return deepFreeze({ ...ctx, unresolved: [...ctx.unresolved, ...items.map((f, i) => ({ id: `unresolved:${ctx.unresolved.length + i}`, kind: "unresolved-premise" as const, text: f.text, origin: f.origin }))] });
}
export function withStudent(ctx: ProofContext, items: StudentAssumption[]): ProofContext { return deepFreeze({ ...ctx, student: [...ctx.student, ...items] }); }

// ------------------------------------------------------------------------------------------------ student restrictions against the task
const neg = (c: Constraint): Constraint => ({ ...c, op: ({ "<": ">=", "<=": ">", ">": "<=", ">=": "<", "=": "!=", "!=": "=" } as const)[c.op] });
const parseAll = (xs: readonly string[]): Constraint[] => xs.flatMap((s) => parseConstraints(s) ?? []);
/** the task's implied restrictions that are readable constraints (the others are kernel-derived and cannot decide a student statement) */
const impliedConstraints = (ctx: ProofContext): Constraint[] => ctx.implied.flatMap((i) => parseConstraints(i.text) ?? []);
export interface Relation { relation: StudentRelation; coveredBranches: number[] | null; obligation: string | null; /** a narrowing blocks only when it limits a domain the TASK stated; over a task with no stated domain it is a disclosed scoping choice (obligation still reported) */ blocking?: boolean }
/** Classify a student-introduced one-variable restriction against the task domain WITHOUT merging branches. */
export function relateStudentRestriction(ctx: ProofContext, cs: Constraint[], text: string): Relation {
  const mentions = cs.some((c) => ctx.variables.includes(c.v));
  if (!mentions) return { relation: "new-quantity", coveredBranches: null, obligation: null };
  const conj = [...parseAll(ctx.restrictions), ...impliedConstraints(ctx)];
  const comps: Constraint[][] = ctx.branches ? ctx.branches.map((b) => parseConstraints(b) ?? []) : [[]];
  const disjoint = comps.map((c) => emptyConjunction([...conj, ...c, ...cs]));
  if (disjoint.every(Boolean)) return { relation: "contradicts", coveredBranches: [], obligation: null };
  const entailed = comps.map((c) => cs.every((a) => emptyConjunction([...conj, ...c, neg(a)])));
  const norm = (s: string) => s.replace(/\s+/g, "").replace(/[.;,]+$/, "");
  const same = [...ctx.restrictions, ...(ctx.branches ?? []), ...ctx.implied.map((i) => i.text)].some((s) => norm(s) === norm(text));
  if (entailed.every(Boolean)) return { relation: same ? "restates" : "implied", coveredBranches: comps.map((_, i) => i), obligation: null };
  const covered = comps.map((_, i) => i).filter((i) => entailed[i]);
  const dropped = comps.map((_, i) => i).filter((i) => disjoint[i]);
  const where = ctx.branches ? `; it ${covered.length ? `holds on branch${covered.length > 1 ? "es" : ""} ${covered.map((i) => `"${ctx.branches![i]}"`).join(", ")} only` : "is not implied by any single branch of the task domain"}${dropped.length ? ` and excludes "${dropped.map((i) => ctx.branches![i]).join('", "')}"` : ""}` : "";
  const explicit = ctx.restrictions.length > 0 || ctx.branches !== null;
  return { relation: "narrows", coveredBranches: covered, blocking: explicit, obligation: `the assumption "${text}" is not part of the task and narrows its domain${where}: what follows holds only under it, so either prove it from the task or cover the rest of the domain` };
}

// ------------------------------------------------------------------------------------------------ what each route can consume
export interface RouteUse { grounded?: { line: number; grounding: import("./claim-grounding.ts").Grounding }[]; route: string; contextDigest: string; consumed: string[]; notConsumed: string[]; limitation: string | null }
const CAPS: Record<string, { consumes: (keyof ProofContext)[]; limitation: (ctx: ProofContext) => string | null }> = {
  "base-algebra": { consumes: ["premises"], limitation: (c) => (c.restrictions.length || c.branches ? "the established algebra/U4 route does not read task restrictions or domain components" : null) },
  "e5-geocalc": { consumes: ["premises", "restrictions"], limitation: (c) => (c.branches ? "the E5 calculus kernel flattens domain components into one flat restriction list: alternatives are not represented as alternatives" : null) },
  "e6-calculus": { consumes: ["premises", "restrictions", "branches", "implied"], limitation: () => null },
  "e6-numbers": { consumes: ["premises", "assumptions", "proved"], limitation: (c) => (c.restrictions.length || c.branches ? "the exact number-chain route has no variable domain: task restrictions are not applied" : null) },
};
export function routeUse(ctx: ProofContext, route: keyof typeof CAPS | string, extraUnreadable: string[] = []): RouteUse {
  const cap = CAPS[route] ?? { consumes: [], limitation: () => "unknown route: nothing is known to be consumed" };
  const kinds: (keyof ProofContext)[] = ["premises", "restrictions", "branches", "implied", "assumptions", "proved"];
  const present = kinds.filter((k) => { const v = ctx[k] as unknown; return Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined; });
  const lim = [cap.limitation(ctx), extraUnreadable.length ? `unreadable by this route: ${extraUnreadable.join("; ")}` : null].filter(Boolean).join("; ") || null;
  return { route, contextDigest: ctx.digest, consumed: present.filter((k) => cap.consumes.includes(k)).map(String), notConsumed: present.filter((k) => !cap.consumes.includes(k)).map(String), limitation: lim };
}
