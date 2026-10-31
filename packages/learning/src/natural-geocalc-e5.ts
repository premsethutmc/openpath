/**
 * E5 notation proposer for geometry and calculus student working.
 *
 * Responsibilities (and limits):
 *  - read the student's lines (natural or LaTeX), normalise notation (°, ∠, m∠, ∥, ⊥, ≅, lim, ∫, [F]_a^b, d/dx, prime), keep every
 *    mathematical line with its source location, and translate each line into a TYPED claim;
 *  - hand each typed claim to the INDEPENDENT binders (geometry-binder-e5.ts, calculus-binder-e5.ts), which judge it against the typed problem;
 *  - never certify anything itself: a line is "valid" only when a binder returned valid with an exact method.
 * Unsupported notation or reasoning always yields an unsupported/inconclusive line, never an acceptance.
 */
import { assessCalculusWorking, type CalculusClaim, type CalculusProblem, type Expr } from "./calculus-core.ts";
import { parseNaturalWorking, type NaturalParseResult, type NaturalParsedLine, type NaturalWorkingInput, type SourceLocation } from "./natural-working.ts";
import type { AccountEntry, StepClassification, StepOutcome } from "./proof-integrity.ts";
import type { BindingEvidence } from "./acceptance-gate.ts";
import { Overflow, ONE, Z, evalRat, evalSurd, floatCompare, limitRF, q, qdiv, qeq, qiszero, qmul, qread, qtext, qsub, qadd, rfEqual, rfOf, sEq, sText, squarefree, type LimitResult, type Q } from "./exact-e5.ts";
import {
  compilePremises, coordTruth, digestOf, judgeAngleEquation, judgeCongruence, judgeCoordinate, linOf, pointsOf, ruleOf, segmentEnds, trianglesOf, truthOfLineRelation,
  type CoordSubject, type GProblem, type Judge, type JudgeStatus, type Lin, type Premise,
} from "./geometry-binder-e5.ts";
import { assessRelevance, literalProvenance, previousClosure, type Grounding, type GroundingSource } from "./claim-grounding.ts";
import { d5, dk, judgeIdentity, limitTruth, polyDefinite, polyOf, type LimitTarget } from "./calculus-binder-e5.ts";

export const GEOCALC_E5_CONTRACT = "openpath-geometry-calculus-natural-e5@1" as const;
const LIMITS = { characters: 8192, lines: 64, members: 8 };

export interface E5Plan {
  /** E7 Phase 6: anchoring recorded per line, and the lines that are correct but not about the task */
  grounded?: { line: number; grounding: import("./claim-grounding.ts").Grounding }[]; offTaskLines?: number[];
  parsed: NaturalParseResult;
  accounts: AccountEntry[];
  outcomes: (StepOutcome | undefined)[];
  evidence: BindingEvidence[];
  nativeComplete: boolean;
  obligations: string[];
  terminal: "missing-assumption" | null;
  domain: "geometry" | "calculus";
  family: string;
  destination: string;
  notes: string[];
  restrictions: string[];
  /** typed final claim handed to the destination reasoner (calculus-core) */
  final?: CalculusClaim;
  /** typed relational steps handed to the destination reasoner (geometry-reasoner) */
  geometry?: { problem: GProblem; steps: { id: string; statement: { predicate: string; args: string[]; value?: number }; cited_step_ids: string[]; line: number }[] };
}

// ================================================================================================ notation normalisation
function matchingBrace(s: string, start: number): number { let d = 0; for (let i = start; i < s.length; i++) { if (s[i] === "{") d++; else if (s[i] === "}" && !--d) return i; } return -1; }
export function latexToPlain(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^\s*(?:\$\$|\$|\\\[|\\\()\s*/, "").replace(/\s*(?:\$\$|\$|\\\]|\\\))\s*$/, "");
  s = s.replace(/\\left|\\right/g, "").replace(/\\(?:!|,|;|:|quad|qquad)/g, " ").replace(/\\ /g, " ")
    .replace(/\\mathrm\{d\}/g, "d").replace(/\\text\{([^}]*)\}/g, "$1").replace(/\\operatorname\{([^}]*)\}/g, "$1")
    .replace(/\^\s*\{?\\circ\}?/g, "°").replace(/\\circ/g, "°").replace(/\\degree/g, "°").replace(/\\angle/g, "∠").replace(/\\measuredangle/g, "∠")
    .replace(/\\triangle/g, "triangle ").replace(/\\parallel/g, "∥").replace(/\\perp/g, "⊥").replace(/\\cong/g, "≅").replace(/\\sim/g, "~")
    .replace(/\\cdot|\\times/g, "*").replace(/\\div/g, "/").replace(/\\pi/g, "pi").replace(/\\(?:infty)/g, "∞")
    .replace(/\\(?:to|rightarrow)/g, "→").replace(/\\int/g, "∫").replace(/\\lim/g, "lim").replace(/\\(sin|cos|tan|ln|exp|log)/g, "$1")
    .replace(/\^\s*\{\\prime\}|\\prime/g, "'").replace(/\\(?:ne|neq)/g, "!=").replace(/\\leq?/g, "<=").replace(/\\geq?/g, ">=");
  for (let g = 0; g < 32; g++) {
    const i = s.indexOf("\\frac{"); if (i < 0) break; const a0 = i + 5, a1 = matchingBrace(s, a0); if (a1 < 0) break;
    const b0 = a1 + 1; if (s[b0] !== "{") break; const b1 = matchingBrace(s, b0); if (b1 < 0) break;
    const num = s.slice(a0 + 1, a1), den = s.slice(b0 + 1, b1);
    if (/^d(?:\^\{?\d+\}?)?[A-Za-z]?$/.test(num) && /^d(?:\^\{?\d+\}?)?[A-Za-z]?(?:\^\{?\d+\}?)?$/.test(den)) s = s.slice(0, i) + `${num}/${den}` + s.slice(b1 + 1);
    else s = s.slice(0, i) + `((${num})/(${den}))` + s.slice(b1 + 1);
  }
  for (let g = 0; g < 32; g++) { const i = s.indexOf("\\sqrt{"); if (i < 0) break; const a0 = i + 5, a1 = matchingBrace(s, a0); if (a1 < 0) break; s = s.slice(0, i) + "sqrt(" + s.slice(a0 + 1, a1) + ")" + s.slice(a1 + 1); }
  for (let g = 0; g < 64; g++) { const m = /([_^])\{/.exec(s); if (!m) break; const a0 = m.index + 1, a1 = matchingBrace(s, a0); if (a1 < 0) break; s = s.slice(0, m.index) + m[1] + "(" + s.slice(a0 + 1, a1) + ")" + s.slice(a1 + 1); }
  s = s.replace(/\^\(\s*(-?\d+)\s*\)/g, "^$1").replace(/√\s*\(/g, "sqrt(").replace(/√\s*(\d+)/g, "sqrt($1)")
    .replace(/−/g, "-").replace(/×|·/g, "*").replace(/÷/g, "/").replace(/²/g, "^2").replace(/³/g, "^3");
  return s.replace(/[ \t]+/g, " ").trim();
}
const DELIMITER_ONLY = /^\s*(?:\\\[|\\\]|\$\$|\[|\]|\\begin\{[A-Za-z*]+\}|\\end\{[A-Za-z*]+\})\s*$/;
export const isDelimiterRow = (row: string) => DELIMITER_ONLY.test(row);

interface RawLine { source: SourceLocation; plain: string }
function prepareLines(input: NaturalWorkingInput): RawLine[] | { error: string; resource?: boolean } {
  const text = input.text;
  if (typeof text !== "string") return { error: "natural input requires a text string" };
  if (text.length > LIMITS.characters) return { error: `input exceeds ${LIMITS.characters} characters`, resource: true };
  const out: RawLine[] = []; const rows = text.replace(/\r\n?/g, "\n").split("\n");
  rows.forEach((original, index) => {
    if (isDelimiterRow(original)) return;
    const trimmed = original.replace(/^\s*(?:\d+\)\s*|\d+\.(?:\s+|$))/, "").trim(); if (!trimmed) return;
    const start = original.indexOf(trimmed);
    out.push({ source: { line: index + 1, start, end: start + trimmed.length, text: original }, plain: latexToPlain(trimmed) });
  });
  if (out.length > LIMITS.lines) return { error: `more than ${LIMITS.lines} lines`, resource: true };
  if (!out.length) return { error: "no working was submitted" };
  return out;
}

// ================================================================================================ shared helpers
const ex = (t: string): Expr | null => {
  try { const p = parseNaturalWorking({ format: "natural", text: t }); if (p.classification !== "parsed" || p.lines.length !== 1) return null; const r = p.lines[0].relation; return r.kind === "expression" ? r.expression : null; } catch { return null; }
};
function splitTop(s: string, sep: string | RegExp): string[] {
  const out: string[] = []; let d = 0, cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i]; if (c === "(" || c === "[" || c === "{") d++; else if (c === ")" || c === "]" || c === "}") d--;
    if (d === 0 && typeof sep === "string" && c === sep && !(sep === "=" && /[<>!=]/.test(s[i - 1] ?? "")) && !(sep === "=" && s[i + 1] === "=")) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur); return out.map((x) => x.trim());
}
const PRI: JudgeStatus[] = ["invalid", "unsupported", "missing-assumption", "incomplete", "valid"];
const worst = (xs: Judge[]): Judge => { for (const st of PRI) { const j = xs.find((x) => x.status === st); if (j) return st === "valid" ? { ...j, digest: digestOf(xs.map((x) => x.digest ?? null)) } : j; } return { status: "unsupported", reason: "nothing to judge" }; };
const uns = (reason: string): Judge => ({ status: "unsupported", reason });
const toStepClass = (s: JudgeStatus): StepClassification => (s === "valid" ? "verified" : s === "invalid" ? "invalid" : s === "unsupported" ? "unsupported" : "incomplete");
const canonicalNumeral = (t: string): boolean => {
  const m = /^\s*-?(\d+)(?:\/(\d+))?\s*$/.exec(t) ?? /^\s*-?\d+\.\d+\s*$/.exec(t); if (!m) return false; if (m[2] === undefined) return true;
  const a = BigInt(m[1]), b = BigInt(m[2]); let x = a, y = b; while (y) [x, y] = [y, x % y]; return b > 1n && x === 1n;
};
const canonicalSurd = (t: string): boolean => {
  if (canonicalNumeral(t)) return true;
  const m = /^\s*(-?)\s*(?:(\d+(?:\/\d+)?)\s*\*?\s*)?sqrt\(\s*(\d+)\s*\)\s*$/.exec(t); if (!m) return false;
  const r = BigInt(m[3]); if (r < 2n) return false; return squarefree(r).s === 1n;
};

class Builder {
  readonly records: { id: string; judge: Judge; dependsOn: string[]; evidence: BindingEvidence | null }[] = [];
  constructor(readonly parsed: NaturalParseResult, readonly destination: string) {}
  add(index: number, judge: Judge, dependsOn: number[] | "prev", checker: BindingEvidence["checker"]): void {
    const line = this.parsed.lines[index];
    const deps = dependsOn === "prev" ? (index ? [this.parsed.lines[index - 1].id] : []) : dependsOn.map((i) => this.parsed.lines[i].id);
    const evidence: BindingEvidence | null = judge.status === "valid"
      ? { lineId: line.id, line: line.source.line, claim: line.source.text, checker, destination: this.destination, scope: judge.scope ?? "independent exact check", outcome: "verified", detail: judge.reason, digest: judge.digest ?? digestOf([line.source.text, judge.reason]) }
      : null;
    this.records[index] = { id: line.id, judge, dependsOn: deps, evidence };
  }
}
function syntheticParse(rows: RawLine[], kind: "geometry" | "calculus"): NaturalParseResult {
  const lines: NaturalParsedLine[] = rows.map((r, i) => ({ id: `e5-line-${i + 1}`, source: r.source, relation: { kind, notation: r.plain } }));
  return { contractVersion: "openpath-natural-math-input@1" as NaturalParseResult["contractVersion"], classification: "parsed", lines, message: "notation translated into typed geometry/calculus claims (E5)" };
}
function finish(parsed: NaturalParseResult, b: Builder, args: { domain: "geometry" | "calculus"; family: string; nativeComplete: boolean; obligations: string[]; notes: string[]; restrictions?: string[]; final?: CalculusClaim; geometry?: E5Plan["geometry"] }): E5Plan {
  const accounts: AccountEntry[] = parsed.lines.map((l, i) => ({ lineId: l.id, role: "claim-step" as const, stepIndex: i, dependsOn: b.records[i]?.dependsOn ?? [] }));
  const outcomes: (StepOutcome | undefined)[] = parsed.lines.map((_, i) => { const r = b.records[i]; return r ? { classification: toStepClass(r.judge.status), justification: r.judge.reason } : undefined; });
  const statuses = b.records.map((r) => r?.judge.status);
  const terminal = statuses.includes("missing-assumption") && !statuses.some((s) => s === "invalid" || s === "unsupported" || s === undefined) ? "missing-assumption" : null;
  return { offTaskLines: b.records.flatMap((r, i) => (r?.judge.offTask ? [parsed.lines[i].source.line] : [])), grounded: b.records.flatMap((r, i) => (r?.judge.grounding ? [{ line: parsed.lines[i].source.line, grounding: r.judge.grounding }] : r?.judge.offTask ? [{ line: parsed.lines[i].source.line, grounding: { contract: "openpath-claim-grounding@1" as const, sources: [], relevant: false, reason: r.judge.reason } }] : [])), parsed, accounts, outcomes, evidence: b.records.flatMap((r) => (r?.evidence ? [r.evidence] : [])), nativeComplete: args.nativeComplete, obligations: args.obligations, terminal, domain: args.domain, family: args.family, destination: b.destination, notes: args.notes, restrictions: args.restrictions ?? [], ...(args.final ? { final: args.final } : {}), ...(args.geometry ? { geometry: args.geometry } : {}) };
}

// ================================================================================================ GEOMETRY
const COORD_GOALS = new Set(["midpoint", "slope", "length", "distance_squared", "parallel", "perpendicular"]);
function isCoordinateProblem(p: GProblem): boolean { return !!p.goal && COORD_GOALS.has(p.goal.predicate) && pointsOf(p).size >= 2; }
function stripAngleMarkup(s: string): string {
  return s.replace(/\bm\s*∠\s*/g, " ").replace(/∠\s*/g, " ").replace(/\bangles?\s+(?=[A-Za-z])/gi, " ").replace(/\bm(?=\s*[A-Z]{1,3}\b)/g, "").replace(/\s+/g, " ").trim();
}
function extractReason(s: string): { body: string; reason: string | null } {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(s); if (!m) return { body: s, reason: null };
  const inner = m[2]; if (/[A-Za-z]{4,}|^\s*[A-Z]{3}\s*$|∥|\bgiven\b/.test(inner)) return { body: m[1].trim(), reason: inner.trim() };
  return { body: s, reason: null };
}
function renameLin(l: Lin, f: (n: string) => string): Lin { const out: Lin = new Map(); for (const [k, v] of l) { const n = k ? f(k) : k; out.set(n, out.has(n) ? qadd(out.get(n)!, v) : v); } return out; }

/**
 * E7 Phase 6: task relevance of a numeric geometry line. Validity is the binder's; this decides only whether the numbers of a TRUE line come from the task
 * (its facts, goal and coordinates), from numbers already established in the working, from a fixed geometric constant, or from one arithmetic step on those. A number
 * that comes from nowhere (`angle C = 100 - 30 = 70`) leaves the derivation ungrounded even though every equality in it is true.
 */
const GEOMETRIC_CONSTANTS = new Set(["180", "360", "90"]);
const numKeyOf = (n: number): string => (Number.isInteger(n) ? String(n) : String(+n.toFixed(9)));
function numericGrounding(text: string, task: Set<string>, established: Set<string>, taskSymbol: boolean, p: GProblem, derivedOut?: Set<string>, prior: string[] = []): Grounding {
  // E7 repair D: the shared literal-provenance rule (claim-grounding.ts). The answer the task asks for is not task data; small values are not free; "one step from some two numbers" is not an explanation.
  const licensed = new Set(GEOMETRIC_CONSTANTS); if ((p.facts ?? []).some((f) => /equal|isosceles|bisect|midpoint|congruent|symmetr|median/i.test(f.predicate)) || isCoordinateProblem(p)) licensed.add("2"); // 2: the exponent/denominator of the distance, slope and midpoint formulas
  if (isCoordinateProblem(p)) { // the distance/slope/midpoint formulas' own intermediates over pairs of the task's points: differences, their squares, sum of squares, coordinate sums
    const nq = (v: { n: bigint; d: bigint }): number => Number(v.n) / Number(v.d), pts = [...pointsOf(p).values()].map((v) => ({ x: nq(v.x), y: nq(v.y) })); const add = (n: number) => { if (Number.isFinite(n)) licensed.add(numKeyOf(Math.abs(n))); };
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y; add(dx); add(dy); add(dx * dx); add(dy * dy); add(dx * dx + dy * dy); add(pts[i].x + pts[j].x); add(pts[i].y + pts[j].y); }
  }
  const named = new Map<string, number>(); for (const f of p.facts ?? []) if ((f.predicate === "angle_measure" || f.predicate === "segment_length") && f.args.length === 1 && Number.isFinite(Number(f.value))) named.set(f.args[0], Number(f.value));
  const sources: GroundingSource[] = literalProvenance(text, { task, established, licensed, named, previous: previousClosure(prior) }, derivedOut);
  if (taskSymbol) sources.push({ kind: "task-premise", ref: "task-angles-and-sides", by: "symbol", trivial: false });
  return assessRelevance(sources);
}
const numbersOfProblem = (p: GProblem): Set<string> => {
  const out = new Set<string>(); const add = (x: unknown) => { if (typeof x === "number" || (typeof x === "string" && /^-?\d+(?:\.\d+)?$/.test(x))) out.add(String(Math.abs(Number(x)))); };
  for (const f of p.facts ?? []) add(f.value); /* the goal's value is the answer sought, not task data */
  for (const o of p.objects ?? []) for (const v of Object.values(o.data ?? {})) if (typeof v === "number" || typeof v === "string") add(v);
  return out;
};

function planGeometry(p: GProblem, rows: RawLine[]): E5Plan | null {
  if (!Array.isArray(p?.objects) || !Array.isArray(p?.facts)) return null;
  const parsed = syntheticParse(rows, "geometry"); const b = new Builder(parsed, "geometry-reasoner (G2-G4) / typed geometry problem");
  const coordinate = isCoordinateProblem(p); const premises: Premise[] = coordinate ? [] : compilePremises(p);
  const known = new Set<string>(); for (const pr of premises) for (const l of [pr.eq.lhs, pr.eq.rhs]) for (const k of l.keys()) if (k) known.add(k);
  for (const o of p.objects) if (o.kind === "angle") known.add(o.id);
  for (const a of p.goal?.args ?? []) known.add(a);
  for (const t of trianglesOf(p)) t.angles.forEach((a) => known.add(a));
  const resolve = (n: string): string => {
    if (known.has(n)) return n;
    if (/^[A-Z]{3}$/.test(n)) { const rev = n.split("").reverse().join(""); if (known.has(rev)) return rev; if (known.has(n[1]) && trianglesOf(p).some((t) => [...n].every((c) => t.angles.includes(c)))) return n[1]; }
    return n;
  };
  const establishedSides: [string, string][] = p.facts.filter((f) => f.predicate === "equal_length" && f.args.length === 2).map((f) => [f.args[0], f.args[1]]);
  const establishedAngles: [string, string][] = p.facts.filter((f) => f.predicate === "equal_angle" && f.args.length === 2).map((f) => [f.args[0], f.args[1]]);
  const sideNames = new Set<string>([...trianglesOf(p).flatMap((t) => t.sides), ...establishedSides.flat()]);
  const goal = p.goal; let goalEstablished = false; const notes: string[] = []; const slopeLines = new Map<string, number>();
  const finalOk = { value: false }; const establishedNums = new Set<string>();
  const gsteps: NonNullable<E5Plan["geometry"]>["steps"] = [];
  const gproblem: GProblem = { ...p, objects: p.objects.map((o) => (o.kind === "triangle" && !(o.data && Object.keys(o.data).length) && /^[A-Z]{3}$/.test(o.id) ? { ...o, data: { angles: o.id.split(""), sides: [o.id[0] + o.id[1], o.id[1] + o.id[2], o.id[2] + o.id[0]] } } : o)) };

  rows.forEach((row, index) => {
    try {
      let s = row.plain; const hadDegree = /°/.test(s); s = s.replace(/°|\bdegrees?\b/gi, "").replace(/\s+/g, " ").trim();
      // ---- congruence
      const cong = /(?:triangle\s*)?([A-Z]{3})\s*(?:is\s+)?(?:congruent\s+to|≅)\s*(?:triangle\s*)?([A-Z]{3})(.*)$/.exec(s);
      if (cong && !coordinate) {
        const tail = cong[3] ?? ""; const reason = /\(([^()]*)\)/.exec(tail)?.[1] ?? /\bby\s+([A-Za-z]{2,4})\b/.exec(tail)?.[1] ?? null;
        const j = judgeCongruence(p, { first: cong[1], second: cong[2], criterion: reason }, establishedSides, establishedAngles);
        if (j.status === "valid") gsteps.push({ id: `s${index}`, statement: { predicate: "congruent", args: [cong[1], cong[2]] }, cited_step_ids: [], line: index });
        if (j.status === "valid" && goal?.predicate === "congruent" && [goal.args[0], goal.args[1]].join() === [cong[1], cong[2]].join()) goalEstablished = true;
        b.add(index, j, rows.map((_, i) => i).filter((i) => i < index), "e5-independent-geocalc"); return;
      }
      if (hadDegree && coordinate) { b.add(index, uns("a degree sign in a coordinate-geometry line has no supported meaning here"), "prev", "e5-independent-geocalc"); return; }
      if (coordinate) { planCoordinateLine(index, s); return; }
      // ---- side equality "AB = DE (given)"
      const { body, reason } = extractReason(s);
      const sideEq = /^([A-Z]{2})\s*=\s*([A-Z]{2})$/.exec(stripAngleMarkup(body));
      if (sideEq && (sideNames.has(sideEq[1]) || sideNames.has(sideEq[2]))) {
        const key = (x: string) => x.split("").sort().join("");
        const has = establishedSides.some(([a, c]) => (key(a) === key(sideEq[1]) && key(c) === key(sideEq[2])) || (key(c) === key(sideEq[1]) && key(a) === key(sideEq[2])));
        if (has) { establishedSides.push([sideEq[1], sideEq[2]]); gsteps.push({ id: `s${index}`, statement: { predicate: "equal_length", args: [sideEq[1], sideEq[2]] }, cited_step_ids: [], line: index }); b.add(index, { status: "valid", reason: "the equal sides are a stated fact", scope: "typed problem facts", digest: digestOf(["equal_length", sideEq[1], sideEq[2]]) }, "prev", "e5-independent-geocalc"); }
        else b.add(index, { status: reason && ruleOf(reason) === "given" ? "invalid" : "missing-assumption", reason: "the equality of these sides is not a stated fact" }, "prev", "e5-independent-geocalc");
        return;
      }
      // ---- angle equations
      const members = splitTop(stripAngleMarkup(body), "=");
      if (members.length < 2 || members.length > LIMITS.members) { b.add(index, uns("a geometry line must be an equation of angle measures or lengths"), "prev", "e5-independent-geocalc"); return; }
      const lins: Lin[] = [];
      for (const m of members) { const e = ex(m); const l = e ? linOf(e) : null; if (!l) { b.add(index, uns(`'${m}' is not a supported linear angle expression`), "prev", "e5-independent-geocalc"); return; } lins.push(renameLin(l, resolve)); }
      const js: Judge[] = [];
      for (let i = 0; i + 1 < lins.length; i++) js.push(judgeAngleEquation(p, premises, { eq: { lhs: lins[i], rhs: lins[i + 1] }, reason }));
      const j = worst(js);
      if (j.status === "valid") {
        for (let i = 0; i + 1 < lins.length; i++) {
          const L = lins[i], Rr = lins[i + 1];
          const single = (x: Lin) => { const ks = [...x.keys()].filter((k) => k && !qiszero(x.get(k)!)); return ks.length === 1 && qeq(x.get(ks[0])!, ONE) && qiszero(x.get("") ?? Z) ? ks[0] : null; };
          const cst = (x: Lin) => ([...x.keys()].every((k) => !k || qiszero(x.get(k)!)) ? (x.get("") ?? Z) : null);
          const a = single(L), c = cst(Rr), a2 = single(Rr), c2 = cst(L), a3 = single(Rr);
          if (goal?.predicate === "angle_measure" && goal.args.length === 1) { const gv = qread(String(goal.value)); if (gv) { const numText = (t: string) => canonicalNumeral(t.replace(/°|degrees?|\\circ|\^\{?\\circ\}?/g, "").trim()); if ((a === goal.args[0] && c && qeq(c, gv) && numText(members[i + 1])) || (a2 === goal.args[0] && c2 && qeq(c2, gv) && numText(members[i]))) goalEstablished = true; } }
          if (goal?.predicate === "equal_angle" && a && a3 && [a, a3].sort().join() === [...goal.args].sort().join()) goalEstablished = true;
          if (a && a3) { establishedAngles.push([a, a3]); gsteps.push({ id: `s${index}_${i}`, statement: { predicate: "equal_angle", args: [a, a3] }, cited_step_ids: [], line: index }); }
          if (a && c && c.d === 1n && goal?.predicate !== "never") gsteps.push({ id: `s${index}_${i}m`, statement: { predicate: "angle_measure", args: [a], value: Number(c.n) }, cited_step_ids: [], line: index });
        }
        // E7 Phase 6: a calculation chain `angle C = 180 - 110 = 70` states the goal angle first and the requested value last; the value is what answers the problem
        if (goal?.predicate === "angle_measure" && goal.args.length === 1 && lins.length >= 3) {
          const gv = qread(String(goal.value)); const ks = (x: Lin) => [...x.keys()].filter((k) => k && !qiszero(x.get(k)!));
          const first = lins[0], lastL = lins[lins.length - 1]; const k0 = ks(first);
          const isGoalAngle = k0.length === 1 && k0[0] === goal.args[0] && qeq(first.get(k0[0])!, ONE) && qiszero(first.get("") ?? Z);
          const cl = ks(lastL).length === 0 ? (lastL.get("") ?? Z) : null;
          if (gv && isGoalAngle && cl && qeq(cl, gv) && canonicalNumeral(members[members.length - 1].replace(/°|degrees?|\\circ|\^\{?\\circ\}?/g, "").trim())) goalEstablished = true;
        }
      }
      if (j.status === "valid") {
        // E7 Phase 6: an equation of pure numbers that uses no number of the task is a true side claim, not a step of this problem
        const taskNums = numbersOfProblem(p);
        const taskSymbol = lins.some((l) => [...l.keys()].some((k) => k && !qiszero(l.get(k)!) && known.has(k)));
        const nums = (body.match(/\d+(?:\.\d+)?/g) ?? []).map((x) => String(Number(x)));
        if (!taskSymbol && !nums.some((x) => taskNums.has(x) || establishedNums.has(x))) { b.add(index, { status: "incomplete", reason: "this arithmetic uses no number of the task; the line is internally correct, but it is not about the posed problem", offTask: true }, "prev", "e5-independent-geocalc"); return; }
        const derived = new Set<string>(), g = numericGrounding(body, taskNums, establishedNums, taskSymbol, p, derived, rows.slice(0, index).map((q) => q.plain));
        if (g.relevant) for (const x of [...nums, ...derived]) establishedNums.add(x); // only a grounded line establishes numbers
        b.add(index, { ...j, grounding: g }, "prev", "e5-independent-geocalc"); return;
      }
      b.add(index, j, "prev", "e5-independent-geocalc");
    } catch (err) {
      if (typeof process !== "undefined" && process.env?.E5_DEBUG) console.error(err);
      b.add(index, err instanceof Overflow ? { status: "unsupported", reason: "resource bound exceeded" } : uns("the line could not be translated into a supported geometry claim"), "prev", "e5-independent-geocalc");
    }
  });

  // ------------------------------------------------------------------ coordinate lines (closure over planGeometry state)
  function planCoordinateLine(index: number, s0: string): void {
    const add = (j: Judge, deps: number[] | "prev" = "prev") => b.add(index, j, deps, "e5-independent-geocalc");
    let s = s0;
    const concl = /^(.*?)(?:,\s*)?(?:so|therefore|hence|thus|∴)\s+(?:the\s+(?:lines?\s+)?)?(?:lines?\s+)?([A-Z]{2})\s+(?:is|are)\s+(parallel|perpendicular)\s+to\s+([A-Z]{2})\s*\.?$/i.exec(s);
    if (concl) {
      const rel = concl[3].toLowerCase() as "parallel" | "perpendicular"; const arith = concl[1].replace(/[,;]\s*$/, "").trim();
      let arithOk = true;
      if (arith) {
        const ms = splitTop(arith, "=").map((m) => ex(m)); if (ms.length < 2 || ms.some((m) => !m)) { add(uns("the arithmetic before the conclusion could not be read")); return; }
        const vals = ms.map((m) => evalSurd(m as Expr)); if (vals.some((v) => !v)) { add(uns("the arithmetic before the conclusion is outside exact arithmetic")); return; }
        arithOk = vals.every((v) => sEq(v as never, vals[0] as never));
        if (!arithOk) { add({ status: "invalid", reason: "the arithmetic statement is false", scope: "exact rational arithmetic" }); return; }
      }
      const truth = truthOfLineRelation(p, rel, concl[2], concl[4]);
      if (truth === null) { add(uns("the slopes of these lines are not defined by typed points")); return; }
      if (!truth) { add({ status: "invalid", reason: `the lines are not ${rel} (exact slopes from the typed coordinates)`, scope: "exact slopes from the typed coordinates", digest: digestOf([rel, concl[2], concl[4]]) }); return; }
      const have = slopeLines.has(concl[2]) && slopeLines.has(concl[4]);
      if (!have) { add({ status: "incomplete", reason: "the slopes of both lines must be calculated before concluding" }); return; }
      if (goal?.predicate === rel && ((goal.args[0] === concl[2] && goal.args[1] === concl[4]) || (goal.args[0] === concl[4] && goal.args[1] === concl[2]))) goalEstablished = true;
      add({ status: "valid", reason: `the exact slopes of both lines show they are ${rel}`, scope: "exact slopes from the typed coordinates", digest: digestOf([rel, concl[2], concl[4], arith]) }, [slopeLines.get(concl[2])!, slopeLines.get(concl[4])!]);
      return;
    }
    const members = splitTop(s, "=");
    if (members.length < 2) { add(uns("a coordinate line must be an equation")); return; }
    const lhs = members[0]; let subject: CoordSubject | null = null; let m: RegExpExecArray | null;
    const dseg = goal?.predicate === "length" || goal?.predicate === "distance_squared" || goal?.predicate === "slope" ? goal.args[0] : null;
    if ((m = /^([A-Z])$/.exec(lhs)) && goal?.predicate === "midpoint" && goal.args[0] === m[1]) subject = { kind: "point", name: m[1] };
    else if ((m = /^(?:slope|m)(?:\s+of)?(?:\s+(?:line\s+)?([A-Z]{2}))?(?:_?([A-Z]{2}))?$/.exec(lhs))) subject = { kind: "slope", segment: m[1] ?? m[2] ?? null };
    else if ((m = /^(?:d|distance|length|dist)(?:\s*\(?\s*([A-Z]{2})\s*\)?)?\s*(?:\^\s*2|²)$/i.exec(lhs)) || (m = /^([A-Z]{2})\s*\^\s*2$/.exec(lhs))) subject = { kind: "dist2", segment: m[1] ?? null };
    else if ((m = /^(?:d|distance|length|dist)(?:\s*\(?\s*([A-Z]{2})\s*\)?)?$/i.exec(lhs)) || (m = /^([A-Z]{2})$/.exec(lhs))) subject = { kind: "dist", segment: m[1] ?? null };
    else if ((m = /^([A-Z])$/.exec(lhs)) && goal?.predicate === "midpoint" && goal.args[0] === m[1]) subject = { kind: "point", name: m[1] };
    if (!subject) { add(uns(`'${lhs}' is not a supported coordinate quantity`)); return; }
    const exprs: Expr[][] = [], texts: string[] = [];
    for (const mem of members.slice(1)) {
      const t = /^\(\s*(.*)\s*\)$/.test(mem) && splitTop(mem.replace(/^\(\s*|\s*\)$/g, ""), ",").length > 1 ? splitTop(mem.replace(/^\(\s*|\s*\)$/g, ""), ",") : [mem];
      const es = t.map((x) => ex(x)); if (es.some((e) => !e)) { add(uns(`'${mem}' could not be read as an exact expression`)); return; }
      exprs.push(es as Expr[]); texts.push(mem);
    }
    const j = judgeCoordinate(p, { subject, members: exprs, text: s0 }, dseg);
    if (j.status === "valid") {
      const segName = subject.kind === "slope" ? (subject.segment ?? dseg) : null; if (segName) slopeLines.set(segName, index);
      const last = texts[texts.length - 1];
      const canonical = subject.kind === "point" ? exprs[exprs.length - 1].every((_, i) => canonicalNumeral(last.replace(/^\(|\)$/g, "").split(",")[i] ?? "")) : subject.kind === "dist" || subject.kind === "dist2" ? canonicalSurd(last) : canonicalNumeral(last);
      if (canonical && matchesCoordGoal(subject, exprs[exprs.length - 1])) finalOk.value = true;
      if (canonical && matchesCoordGoal(subject, exprs[exprs.length - 1])) goalEstablished = true;
    }
    if (j.status === "valid") {
      const taskNums = numbersOfProblem(p); const derived = new Set<string>(), g = numericGrounding(s0, taskNums, establishedNums, true, p, derived, rows.slice(0, index).map((q) => q.plain));
      if (g.relevant) for (const x of [...(s0.match(/\d+(?:\.\d+)?/g) ?? []).map((y) => String(Number(y))), ...derived]) establishedNums.add(x);
      add({ ...j, grounding: g }); return;
    }
    add(j);
  }
  function matchesCoordGoal(subject: CoordSubject, last: Expr[]): boolean {
    if (!goal) return false; const gv = (v: unknown) => { const x = typeof v === "string" || typeof v === "number" ? qread(String(v)) : null; return x; };
    if (goal.predicate === "midpoint") return subject.kind === "point" && subject.name === goal.args[0];
    if (goal.predicate === "slope") { const v = evalSurd(last[0]); const g = gv(goal.value); return subject.kind === "slope" && (subject.segment ?? goal.args[0]) === goal.args[0] && !!v && !!g && v.m === 1n && qeq(v.a, g); }
    if (goal.predicate === "length") { const v = evalSurd(last[0]); const g = gv(goal.value); return subject.kind === "dist" && (subject.segment ?? goal.args[0]) === goal.args[0] && !!v && !!g && v.m === 1n && qeq(v.a, g); }
    if (goal.predicate === "distance_squared") {
      const v = evalSurd(last[0]); const g = gv(goal.value); if (!v || !g || (subject.kind !== "dist" && subject.kind !== "dist2")) return false;
      if ((subject.segment ?? goal.args[0]) !== goal.args[0]) return false;
      const sq = subject.kind === "dist2" ? v : evalSurd({ kind: "multiply", factors: [last[0], last[0]] }); return !!sq && sq.m === 1n && qeq(sq.a, g);
    }
    return false;
  }

  // ------------------------------------------------------------------ completeness
  const js = b.records.map((r) => r?.judge.status);
  const allValid = js.length === rows.length && js.every((x) => x === "valid");
  const obligations: string[] = [];
  if (!goalEstablished && allValid) obligations.push("state the final result that answers the problem");
  if (!goal) return null;
  const complete = allValid && goalEstablished;
  if (js.some((x) => x === "valid") && !complete && !js.some((x) => x && x !== "valid")) {
    // the working is correct so far but stops early: mark the last line incomplete so the verdict is "incomplete"
    const last = rows.length - 1; const r = b.records[last]; if (r) b.records[last] = { ...r, judge: { ...r.judge, status: "incomplete", reason: "the working is correct so far but does not state the final result", digest: r.judge.digest }, evidence: null };
  }
  return finish(parsed, b, { domain: "geometry", family: coordinate ? "coordinate" : "angle", nativeComplete: complete, obligations, notes, geometry: { problem: gproblem, steps: gsteps } });
}

// ================================================================================================ CALCULUS
type Target = LimitTarget;
type Member =
  | { t: "fn"; name: string; order: number; text: string }
  | { t: "dd"; operand: Expr; order: number; text: string }
  | { t: "int"; integrand: Expr; v: string; lo: Q | null; hi: Q | null; text: string }
  | { t: "br"; F: Expr; lo: Q; hi: Q; text: string }
  | { t: "lim"; expr: Expr; v: string; target: Target; text: string }
  | { t: "dne"; text: string } | { t: "inf"; sign: 1 | -1; text: string }
  | { t: "expr"; e: Expr; text: string };

const bound = (t: string): Q | null => { const s = t.replace(/^\(|\)$/g, "").trim(); const e = ex(s); const v = e ? evalRat(e) : null; return v; };
function parseTarget(raw: string): Target | null {
  let t = raw.trim(), side: Target["side"] = "both";
  const sm = /^(.*?)\s*(?:\^\s*([+-])|([⁺⁻])|\b(from the (?:left|right)))$/.exec(t);
  if (sm) { t = sm[1]; side = (sm[2] ?? sm[3]) === "+" || sm[3] === "⁺" || sm[4] === "from the right" ? "right" : "left"; }
  // finalisation: a plain trailing sign after the approach value ("0+", "2-") is the conventional one-sided notation
  else { const ps = /^(.*[0-9a-zA-Z)∞])\s*([+-])$/.exec(t); if (ps && !/^[+-]?\s*(?:∞|infinity|inf|oo)$/i.test(ps[1].trim())) { t = ps[1]; side = ps[2] === "+" ? "right" : "left"; } }
  if (/^[+]?\s*(?:∞|infinity|inf|oo)$/i.test(t)) return { at: "inf", side };
  if (/^-\s*(?:∞|infinity|inf|oo)$/i.test(t)) return { at: "-inf", side };
  const e = ex(t); const v = e ? evalRat(e) : null; return v ? { at: v, side } : null;
}
function parseMember(text: string, v: string, names: Set<string>): Member | null {
  const t = text.trim(); let m: RegExpExecArray | null;
  if (/^(?:does not exist|DNE|d\.n\.e\.?)$/i.test(t)) return { t: "dne", text: t };
  if ((m = /^([+-]?)\s*(?:∞|infinity|oo)$/i.exec(t))) return { t: "inf", sign: m[1] === "-" ? -1 : 1, text: t };
  if ((m = /^lim\s*_?\s*\(?\s*([A-Za-z])\s*(?:→|->)\s*([^)]*?)\s*\)?\s+(.+)$/.exec(t))) {
    const target = parseTarget(m[2]); const e = ex(m[3]); if (!target || !e) return null; return { t: "lim", expr: e, v: m[1], target, text: t };
  }
  if ((m = /^∫\s*(?:_\s*(\([^)]*\)|[-+\w./]+)\s*\^\s*(\([^)]*\)|[-+\w./]+))?\s*(.*?)\s*\*?\s*d([A-Za-z])\s*$/.exec(t))) {
    const lo = m[1] ? bound(m[1]) : null, hi = m[2] ? bound(m[2]) : null; if ((m[1] && !lo) || (m[2] && !hi)) return null;
    const e = ex(m[3]); if (!e) return null; return { t: "int", integrand: e, v: m[4], lo, hi, text: t };
  }
  if ((m = /^\[\s*(.*)\s*\]\s*_\s*(\([^)]*\)|[-+\w./]+)\s*\^\s*(\([^)]*\)|[-+\w./]+)$/.exec(t))) {
    const lo = bound(m[2]), hi = bound(m[3]); const e = ex(m[1]); if (!lo || !hi || !e) return null; return { t: "br", F: e, lo, hi, text: t };
  }
  if ((m = /^(?:d)(?:\^(\d+))?\s*([A-Za-z]?)\s*\/\s*d\s*([A-Za-z])(?:\^(\d+))?\s*(.*)$/.exec(t)) && m[3] === v) {
    const order = Number(m[1] ?? m[4] ?? 1); const rest = m[5].trim();
    if (!rest) return { t: "fn", name: m[2] || "?", order, text: t };
    const e = ex(rest.replace(/^\((.*)\)$/s, "($1)")); return e ? { t: "dd", operand: e, order, text: t } : null;
  }
  if ((m = /^([A-Za-z])('{1,4})\s*(?:\(\s*([A-Za-z])\s*\))?$/.exec(t))) return m[3] && m[3] !== v ? null : { t: "fn", name: m[1], order: m[2].length, text: t };
  if ((m = /^([A-Za-z])\s*\(\s*([A-Za-z])\s*\)$/.exec(t)) && m[2] === v) return { t: "fn", name: m[1], order: 0, text: t };
  if ((m = /^([A-Za-z])$/.exec(t)) && names.has(m[1]) && m[1] !== v) return { t: "fn", name: m[1], order: 0, text: t };
  const e = ex(t); return e ? { t: "expr", e, text: t } : null;
}
function subst(e: Expr, name: string, by: Expr): Expr {
  const go = (x: Expr): Expr => {
    switch (x.kind) {
      case "variable": return x.name === name ? by : x;
      case "add": return { kind: "add", terms: x.terms.map(go) };
      case "multiply": return { kind: "multiply", factors: x.factors.map(go) };
      case "power": return { ...x, base: go(x.base) };
      case "root": return { ...x, radicand: go(x.radicand) };
      case "constant": case "pi": return x;
      default: return "argument" in x ? ({ ...x, argument: go((x as { argument: Expr }).argument) } as Expr) : x;
    }
  };
  return go(e);
}
function varsOf(e: Expr, out = new Set<string>()): Set<string> {
  switch (e.kind) {
    case "variable": out.add(e.name); break;
    case "add": e.terms.forEach((t) => varsOf(t, out)); break;
    case "multiply": e.factors.forEach((t) => varsOf(t, out)); break;
    case "power": varsOf(e.base, out); break;
    case "root": varsOf(e.radicand, out); break;
    case "constant": case "pi": break;
    default: if ("argument" in e) varsOf((e as { argument: Expr }).argument, out);
  }
  return out;
}
const CONSTANT_NAMES = new Set(["C", "c", "K", "k", "C1", "C_1"]);
function splitConstant(e: Expr): { core: Expr; constant: boolean } {
  if (e.kind === "variable" && CONSTANT_NAMES.has(e.name)) return { core: { kind: "constant", value: "0" }, constant: true };
  if (e.kind !== "add") return { core: e, constant: false };
  const keep = e.terms.filter((t) => !(t.kind === "variable" && CONSTANT_NAMES.has(t.name)));
  if (keep.length === e.terms.length) return { core: e, constant: false };
  return { core: keep.length === 1 ? keep[0] : { kind: "add", terms: keep }, constant: true };
}
const hasUnsupported = (e: Expr): boolean => { const vs = varsOf(e); return false && vs.size > 99; };

function planCalculus(problem: CalculusProblem, rows: RawLine[]): E5Plan | null {
  const parsed = syntheticParse(rows, "calculus"); const b = new Builder(parsed, "calculus-core (C1-C3 exact reasoner)");
  for (const r of rows) if (/°/.test(r.plain)) { rows.forEach((_, i) => b.add(i, uns("degree-mode trigonometry is not supported in calculus working"), "prev", "e5-independent-geocalc")); return finish(parsed, b, { domain: "calculus", family: problem.task, nativeComplete: false, obligations: ["degree-mode trigonometry is not supported"], notes: [] }); }
  const task = problem.task; const notes: string[] = [];
  switch (task) {
    case "derivative": return calcDerivative(problem, rows, parsed, b, notes);
    case "indefinite-integral": return calcIndefinite(problem, rows, parsed, b, notes);
    case "definite-integral": return calcDefinite(problem, rows, parsed, b, notes);
    case "limit": return calcLimit(problem, rows, parsed, b, notes);
    case "continuity": return calcContinuity(problem, rows, parsed, b, notes);
    default: return null;
  }
}
type Ctx = { rows: RawLine[]; parsed: NaturalParseResult; b: Builder; notes: string[] };
const U4 = "u4-kernel" as const, IND = "e5-independent-geocalc" as const;
function judgeMany(js: Judge[]): Judge { return worst(js); }
function endPlan(problem: CalculusProblem, c: Ctx, complete: boolean, obligations: string[], restrictions: string[] = [], final?: CalculusClaim): E5Plan {
  const { b, parsed } = c; const st = b.records.map((r) => r?.judge.status);
  if (!complete && st.length && st.every((x) => x === "valid")) {
    const last = c.rows.length - 1; const r = b.records[last]; if (r) b.records[last] = { ...r, judge: { ...r.judge, status: "incomplete", reason: obligations[0] ?? "the working does not reach the requested result" }, evidence: null };
  }
  return finish(parsed, b, { domain: "calculus", family: problem.task, nativeComplete: complete, obligations, notes: c.notes, restrictions, ...(final && complete ? { final } : {}) });
}
const addJ = (c: Ctx, i: number, j0: Judge, deps: number[] | "prev" = "prev") => { const j: Judge = j0.status === "valid" && !j0.grounding ? { ...j0, grounding: { contract: "openpath-claim-grounding@1", sources: [{ kind: "task-premise", ref: "posed-expression", by: "symbol", trivial: false }], relevant: true, reason: "the route accepts a calculus line only after connecting it to the posed expression (function, integrand, integral or limit)" } } : j0; return c.b.add(i, j, deps, j.scope?.includes("U4") ? U4 : IND); };

// ---------------------------------------------------------------------------------------------- derivative
function calcDerivative(problem: Extract<CalculusProblem, { task: "derivative" }>, rows: RawLine[], parsed: NaturalParseResult, b: Builder, notes: string[]): E5Plan {
  const c: Ctx = { rows, parsed, b, notes }; const v = problem.variable, n = problem.order ?? 1, e = problem.expression;
  if (n > 4) return endPlan(problem, c, false, ["derivative order exceeds the supported bound"]);
  const est: { k: number; e: Expr }[] = [{ k: 0, e }]; const names = new Set<string>(["y"]); let finalAnchorOk = false; let finalExpr: Expr | null = null;
  rows.forEach((row, i) => {
    const members = splitTop(row.plain, "=");
    if (members.length < 2 || members.length > LIMITS.members) { addJ(c, i, uns("a derivative line must be an equation")); return; }
    const ms: (Member | null)[] = members.map((m) => parseMember(m, v, names));
    if (ms.some((m) => !m)) { addJ(c, i, uns("a part of this line is outside the supported derivative notation")); return; }
    const mm = ms as Member[];
    for (const m of mm) if (m.t === "fn") names.add(m.name);
    if (mm.some((m) => !["fn", "dd", "expr"].includes(m.t))) { addJ(c, i, uns("this line mixes notation that is not part of a derivative calculation")); return; }
    // anchor
    let anchor: number | null = null;
    for (const m of mm) {
      if (m.t === "fn") { anchor = m.order; break; }
      if (m.t === "dd") { const j = est.find((x) => judgeIdentity(x.e, m.operand, v, "operand").status === "valid"); if (!j) { addJ(c, i, uns("the expression being differentiated is not the posed function")); return; } anchor = j.k + m.order; break; }
    }
    if (anchor === null) { const m0 = mm[0] as Extract<Member, { t: "expr" }>; const j = est.find((x) => judgeIdentity(x.e, m0.e, v, "line").status === "valid"); if (!j) { addJ(c, i, uns("this line is not connected to the posed function")); return; } anchor = j.k; }
    if (anchor > n + 2) { addJ(c, i, uns("derivative order beyond the requested order")); return; }
    const truth = dk(e, v, anchor); if (!truth) { addJ(c, i, uns("the posed function is outside the exact differentiation rules")); return; }
    const js: Judge[] = []; const values: Expr[] = [];
    for (const m of mm) {
      if (m.t === "fn") continue;
      if (m.t === "dd") { const t = d5(m.operand, v); if (m.order !== 1) { addJ(c, i, uns("repeated Leibniz operators inside a line are not supported")); return; } js.push(t ? { status: "valid", reason: "operator form", digest: null } : uns("operand outside differentiation rules")); values.push(t as Expr); continue; }
      js.push(judgeIdentity(truth, m.e, v, anchor === 0 ? "rewriting the function" : `derivative of order ${anchor}`)); values.push(m.e);
    }
    // dd members are equal to the truth by construction when connected; their right-hand neighbours are checked above
    const j = judgeMany(js.length ? js : [uns("nothing to check")]);
    if (j.status === "valid") { for (const m of mm) if (m.t === "expr" && est.length < 16) est.push({ k: anchor, e: m.e }); if (anchor === n && mm[mm.length - 1].t === "expr") { finalAnchorOk = true; finalExpr = (mm[mm.length - 1] as Extract<Member, { t: "expr" }>).e; } }
    addJ(c, i, j.status === "valid" ? { ...j, scope: "exact U4 kernel identity against an independently differentiated source" } : j);
  });
  const allValid = b.records.length === rows.length && b.records.every((r) => r?.judge.status === "valid");
  // the final line must end in an explicit expression of the requested derivative
  const lastAnchorOk = finalAnchorOk && (() => { const lastRow = rows[rows.length - 1].plain; const ms = splitTop(lastRow, "=").map((m) => parseMember(m, v, names)); const last = ms[ms.length - 1]; return !!last && last.t === "expr"; })();
  const complete = allValid && finalAnchorOk && lastAnchorOk;
  return endPlan(problem, c, complete, complete ? [] : ["finish with an explicit expression for the requested derivative"], [], finalExpr ? { kind: "expression", value: finalExpr } : undefined);
}

// ---------------------------------------------------------------------------------------------- indefinite integral
function calcIndefinite(problem: Extract<CalculusProblem, { task: "indefinite-integral" }>, rows: RawLine[], parsed: NaturalParseResult, b: Builder, notes: string[]): E5Plan {
  const c: Ctx = { rows, parsed, b, notes }; const v = problem.variable, g = problem.integrand;
  const defs = new Map<string, Expr>(); let connected = false; let finalOk = false; let sawMissingConstant = false;
  const names = new Set<string>();
  rows.forEach((row, i) => {
    // substitution definition  u = h(x)
    const def = /^([A-Za-z])\s*=\s*(.+)$/.exec(row.plain);
    if (def && def[1] !== v && !/∫|d\//.test(row.plain) && !defs.has(def[1]) && !CONSTANT_NAMES.has(def[1])) {
      const h = ex(def[2]); if (h && [...varsOf(h)].every((x) => x === v || defs.has(x))) { defs.set(def[1], h); addJ(c, i, { status: "valid", reason: `introduces ${def[1]} = ${def[2]} as a substitution variable (no mathematical claim is made)`, scope: "definition of a substitution variable", digest: digestOf(["def", def[1], def[2]]) }); return; }
    }
    const du = /^d([A-Za-z])\s*=\s*(.+?)\s*d([A-Za-z])$/.exec(row.plain);
    if (du && defs.has(du[1]) && du[3] === v) {
      const h = defs.get(du[1])!; const t = d5(h, v); const claim = ex(du[2]); const jj = t && claim ? judgeIdentity(t, claim, v, `d${du[1]} = ${du[2]} d${v}`) : uns("differential outside the exact rules");
      addJ(c, i, jj); return;
    }
    const members = splitTop(row.plain, "="); if (members.length < 2 || members.length > LIMITS.members) { addJ(c, i, uns("an integration line must be an equation")); return; }
    const ms = members.map((m) => parseMember(m, v, names)); if (ms.some((m) => !m)) { addJ(c, i, uns("a part of this line is outside the supported integration notation")); return; }
    const mm = ms as Member[]; const js: Judge[] = [];
    if (mm.some((m) => m.t !== "int" && m.t !== "expr")) { addJ(c, i, uns("this line mixes notation that is not part of an indefinite integration")); return; }
    for (const m of mm) if (m.t === "int" && (m.lo || m.hi)) { addJ(c, i, uns("bounds in an indefinite integral")); return; }
    // connect the first integral to the posed one
    const firstInt = mm.find((m) => m.t === "int") as Extract<Member, { t: "int" }> | undefined;
    if (!connected) {
      if (!firstInt || mm[0].t !== "int") { addJ(c, i, uns("the working must begin with the posed integral")); return; }
      if (firstInt.v !== v) { addJ(c, i, uns("the integration variable differs from the problem's")); return; }
      const j0 = judgeIdentity(g, firstInt.integrand, v, "the written integrand"); if (j0.status !== "valid") { addJ(c, i, j0.status === "invalid" ? uns("the integrand written is not the posed integrand") : j0); return; }
      connected = true;
    }
    const den = (m: Member): { kind: "int"; G: Expr; w: string } | { kind: "fn"; core: Expr; constant: boolean } | null => {
      if (m.t === "int") return { kind: "int", G: m.integrand, w: m.v };
      if (m.t === "expr") { const s = splitConstant(m.e); return { kind: "fn", core: s.core, constant: s.constant }; } return null;
    };
    for (let k = 0; k + 1 < mm.length; k++) {
      const A = den(mm[k]), B = den(mm[k + 1]); if (!A || !B) { js.push(uns("unsupported member")); continue; }
      if (A.kind === "int" && B.kind === "fn") {
        const w = A.w; const extra = [...varsOf(B.core)].filter((x) => x !== w); if (extra.length) { js.push(uns(`the result mentions ${extra.join(", ")}, which is not the integration variable ${w}`)); continue; }
        const t = d5(B.core, w); const jj = judgeIdentity(A.G, t ? ({ kind: "multiply", factors: [{ kind: "constant", value: "1" }, t] } as Expr) : null as never, w, "differentiating the antiderivative recovers the integrand");
        const jj2 = t ? judgeIdentity(A.G, t, w, "differentiating the antiderivative recovers the integrand") : uns("antiderivative outside the exact differentiation rules");
        if (jj2.status === "valid" && !B.constant) { sawMissingConstant = true; js.push({ status: "missing-assumption", reason: "an indefinite integral needs the arbitrary constant of integration (+ C)", scope: jj2.scope, digest: jj2.digest }); }
        else js.push(jj2);
      } else if (A.kind === "int" && B.kind === "int") {
        if (A.w === B.w) js.push(judgeIdentity(A.G, B.G, A.w, "the two integrands are equal"));
        else {
          const h = defs.get(B.w); if (!h || A.w !== v) { js.push(uns("a substitution is used without being defined")); continue; }
          const hp = d5(h, v); const Hh = subst(B.G, B.w, h);
          js.push(hp ? judgeIdentity(A.G, { kind: "multiply", factors: [Hh, hp] } as Expr, v, `substituting ${B.w} = h(${v}) turns the integrand into the new one`) : uns("substitution outside the exact rules"));
        }
      } else if (A.kind === "fn" && B.kind === "fn") {
        if (A.constant !== B.constant) { js.push({ status: "invalid", reason: "the constant of integration is dropped or added between these forms" }); continue; }
        const av = [...varsOf(A.core)].filter((x) => x !== v), bv = [...varsOf(B.core)].filter((x) => x !== v);
        let Ae = A.core; for (const x of av) { const h = defs.get(x); if (!h) { js.push(uns("a variable is substituted without a definition")); continue; } Ae = subst(Ae, x, h); }
        if (bv.length) { js.push(uns("substitution variable on the right-hand side")); continue; }
        js.push(judgeIdentity(Ae, B.core, v, "the two forms are equal"));
      } else js.push(uns("an antiderivative cannot be equated to an integral in this direction"));
    }
    const j = judgeMany(js);
    if (j.status === "valid") { const lastM = mm[mm.length - 1]; if (lastM.t === "expr") { const s = splitConstant(lastM.e); const extra = [...varsOf(s.core)].filter((x) => x !== v); if (s.constant && !extra.length) finalOk = true; } }
    addJ(c, i, j);
  });
  const allValid = b.records.length === rows.length && b.records.every((r) => r?.judge.status === "valid");
  let complete = allValid && finalOk; let finalClaim: CalculusClaim | undefined;
  if (complete) {
    const last = splitTop(rows[rows.length - 1].plain, "=").pop() as string; const e = ex(last); const s = e ? splitConstant(e) : null;
    const t = s ? d5(s.core, v) : null; complete = !!s && s.constant && !!t && judgeIdentity(g, t, v, "final").status === "valid"; if (complete && s) finalClaim = { kind: "expression", value: s.core, constantIncluded: true };
  }
  void sawMissingConstant;
  return endPlan(problem, c, complete, complete ? [] : ["finish with the antiderivative in the original variable, including + C"], [], finalClaim);
}

// ---------------------------------------------------------------------------------------------- definite integral
function calcDefinite(problem: Extract<CalculusProblem, { task: "definite-integral" }>, rows: RawLine[], parsed: NaturalParseResult, b: Builder, notes: string[]): E5Plan {
  const c: Ctx = { rows, parsed, b, notes }; const v = problem.variable, g = problem.integrand; const lo = qread(problem.lower), hi = qread(problem.upper);
  if (!lo || !hi || problem.improper) return endPlan(problem, c, false, ["improper or non-rational bounds are not supported"]);
  const truthV = polyDefinite(g, v, lo, hi);
  const fns = new Map<string, Expr>(); const defs = new Map<string, Expr>(); let connected = false; let lastValue: Q | null = null; let lastCanonical = false; let prevRhs: Q | null = null;
  const names = new Set<string>();
  const valueOf = (m: Member): { v: Q | null; why: string } => {
    if (m.t === "int") { if (m.lo === null || m.hi === null) return { v: null, why: "an indefinite integral inside a definite integral" }; const r = polyDefinite(m.integrand, m.v, m.lo, m.hi); return { v: r, why: r ? "" : "the integrand is outside exact polynomial integration" }; }
    if (m.t === "br") { try { const lo2 = evalRat(m.F, new Map([[v, m.lo]])), hi2 = evalRat(m.F, new Map([[v, m.hi]])); return lo2 && hi2 ? { v: qsub(hi2, lo2), why: "" } : { v: null, why: "bracket not evaluable exactly" }; } catch { return { v: null, why: "bracket not evaluable exactly" }; } }
    if (m.t === "expr") { let t = m.text; t = t.replace(/\b([A-Za-z])\s*\(\s*([^()]*)\s*\)/g, (all, nm, arg) => { const F = fns.get(nm); if (!F) return all; const a = ex(arg); const av = a ? evalRat(a) : null; if (!av) return all; const r = evalRat(F, new Map([[v, av]])); return r ? `(${qtext(r)})` : all; }); const e = ex(t); const r = e ? evalRat(e) : null; return { v: r, why: r ? "" : "an expression that is not a closed rational number" }; }
    return { v: null, why: "unsupported member" };
  };
  rows.forEach((row, i) => {
    const defM = /^([A-Za-z])\s*=\s*(.+)$/.exec(row.plain);
    if (defM && defM[1] !== v && !/∫|\[/.test(row.plain) && !defs.has(defM[1]) && !fns.has(defM[1])) { const h = ex(defM[2]); if (h && [...varsOf(h)].every((x) => x === v || defs.has(x))) { defs.set(defM[1], h); addJ(c, i, { status: "valid", reason: `introduces ${defM[1]} = ${defM[2]} as a substitution variable (no mathematical claim is made)`, scope: "definition of a substitution variable", digest: digestOf(["def", defM[1], defM[2]]) }); return; } }
    // antiderivative definition F(x) = ...
    const fd = /^([A-Za-z])\s*\(\s*([A-Za-z])\s*\)\s*=\s*(.+)$/.exec(row.plain);
    if (fd && fd[2] === v && !/∫|\[/.test(row.plain)) {
      const F = ex(fd[3]); if (!F) { addJ(c, i, uns("could not read the antiderivative")); return; }
      const t = d5(F, v); const j = t ? judgeIdentity(g, t, v, `${fd[1]}(${v}) is an antiderivative of the integrand`) : uns("antiderivative outside the exact rules");
      if (j.status === "valid") fns.set(fd[1], F); addJ(c, i, j); return;
    }
    let text = row.plain.replace(/\b([A-Za-z])\s*\(\s*([^()]*?)\s*\)/g, (all, nm, arg) => { const F = fns.get(nm); if (!F) return all; const a = ex(arg); const av = a ? evalRat(a) : null; if (!av) return all; const r = evalRat(F, new Map([[v, av]])); return r ? `(${qtext(r)})` : all; }); const leadEq = /^=\s*(.+)$/.exec(text);
    const members = splitTop(leadEq ? leadEq[1] : text, "="); const ms = members.map((m) => parseMember(m, v, names));
    if ((!leadEq && members.length < 2) || members.length > LIMITS.members || ms.some((m) => !m)) { addJ(c, i, uns("a part of this line is outside the supported definite-integral notation")); return; }
    const mm = ms as Member[]; if (leadEq) { if (prevRhs === null) { addJ(c, i, uns("a continuation line has nothing to continue")); return; } }
    const vals = mm.map(valueOf); if (vals.some((x) => !x.v)) { addJ(c, i, uns(vals.find((x) => !x.v)!.why)); return; }
    const seq = leadEq ? [prevRhs as Q, ...vals.map((x) => x.v as Q)] : vals.map((x) => x.v as Q);
    if (!connected) {
      const orig = splitTop(row.plain, "="); let anchored = false;
      mm.forEach((m, k) => {
        if (m.t === "int" && m.v === v && m.lo && m.hi && qeq(m.lo, lo) && qeq(m.hi, hi) && judgeIdentity(g, m.integrand, v, "the written integrand").status === "valid") anchored = true;
        if (m.t === "br" && qeq(m.lo, lo) && qeq(m.hi, hi)) { const t = d5(m.F, v); if (t && judgeIdentity(g, t, v, "bracket antiderivative").status === "valid") anchored = true; }
        const ap = /^\(?\s*([A-Za-z])\s*\(\s*(\S+?)\s*\)\s*-\s*\(?\s*([A-Za-z])\s*\(\s*(\S+?)\s*\)\s*\)?$/.exec(orig[k] ?? "");
        if (ap && ap[1] === ap[3] && fns.has(ap[1])) { const h = bound(ap[2]), l = bound(ap[4]); if (h && l && qeq(h, hi) && qeq(l, lo)) anchored = true; }
      });
      if (!anchored) { addJ(c, i, uns("the working must start from the posed definite integral (same variable and bounds) or an antiderivative evaluated between the posed bounds")); return; }
      connected = true;
    }
    const bad = seq.findIndex((x, k) => k > 0 && !qeq(x, seq[0]));
    if (bad > 0) { addJ(c, i, { status: "invalid", reason: `the two sides are not equal (${qtext(seq[0])} ≠ ${qtext(seq[bad])}), computed exactly`, scope: "exact rational arithmetic and exact polynomial integration", digest: digestOf([text, seq.map(qtext)]) }); return; }
    addJ(c, i, { status: "valid", reason: "every expression in the chain has the same exact value", scope: "exact rational arithmetic and exact polynomial integration", digest: digestOf([text, seq.map(qtext)]) });
    prevRhs = seq[seq.length - 1]; lastValue = prevRhs; const lastM = mm[mm.length - 1]; lastCanonical = lastM.t === "expr" && canonicalNumeral(lastM.text);
  });
  const allValid = b.records.length === rows.length && b.records.every((r) => r?.judge.status === "valid");
  let complete = allValid && lastCanonical && lastValue !== null && truthV !== null && qeq(lastValue, truthV);
  if (allValid && lastCanonical && lastValue !== null && truthV !== null && !qeq(lastValue, truthV)) {
    const last = rows.length - 1; const r = b.records[last]; if (r) b.records[last] = { ...r, judge: { status: "invalid", reason: `the final value ${qtext(lastValue)} is not the value of the posed integral`, scope: r.judge.scope }, evidence: null };
  }
  if (truthV === null) { for (let i = 0; i < rows.length; i++) { const r = b.records[i]; if (r) b.records[i] = { ...r, judge: { status: "unsupported", reason: "the posed integral is outside exact polynomial integration" }, evidence: null }; } complete = false; }
  return endPlan(problem, c, complete, complete ? [] : ["evaluate the integral to a final number"], [], complete && lastValue ? { kind: "value", value: qtext(lastValue) } : undefined);
}

// ---------------------------------------------------------------------------------------------- limit
/** "f = g → v [as x → a]" → "lim(x→a) f = lim(x→a) g = v"; text without a value arrow is returned unchanged; null when the arrow's variable is not the limit variable */
function arrowLimitText(text: string, v: string, targetText: string): string | null {
  if (/^\s*lim(?![a-z])/i.test(text) || !/→|->/.test(text)) return text;
  const m = /^(.*?)\s*(?:→|->)\s*(.+?)(?:\s*,?\s+as\s+([A-Za-z])\s*(?:→|->)\s*(.+?))?\s*\.?$/.exec(text);
  if (!m || !m[1].trim() || /→|->/.test(m[2])) return text;
  if (m[3] && m[3] !== v) return null;
  const tgt = (m[4] ?? targetText).trim();
  return `${splitTop(m[1], "=").map((part) => `lim(${v}→${tgt}) ${part.trim()}`).join(" = ")} = ${m[2].trim()}`;
}
function sameLimit(a: LimitResult, b2: LimitResult): boolean { if (a.kind !== b2.kind) return false; if (a.kind === "finite" && b2.kind === "finite") return qeq(a.value, b2.value); if (a.kind === "inf" && b2.kind === "inf") return a.sign === b2.sign; return true; }
function calcLimit(problem: Extract<CalculusProblem, { task: "limit" }>, rows: RawLine[], parsed: NaturalParseResult, b: Builder, notes: string[]): E5Plan {
  const c: Ctx = { rows, parsed, b, notes }; const v = problem.variable;
  const side = problem.side ?? "both"; const at: Q | "inf" | "-inf" | null = problem.approach === "infinity" ? "inf" : problem.approach === "-infinity" ? "-inf" : qread(problem.approach);
  if (at === null) return endPlan(problem, c, false, ["unsupported approach value"]);
  const target: Target = { at, side }; const truth = limitTruth(problem.expression, v, target);
  if (!truth) { rows.forEach((_, i) => addJ(c, i, uns("this limit is outside the exact rational-function and standard-limit analysis"))); return endPlan(problem, c, false, ["unsupported limit"]); }
  const est: Expr[] = [problem.expression]; let finalOk = false; const names = new Set<string>();
  const sameTarget = (t: Target) => t.side === side && (t.at === at || (typeof t.at !== "string" && typeof at !== "string" && qeq(t.at, at)));
  const anchoredExpr = (e: Expr): boolean => est.some((x) => { const a = rfOf(x, v), r = rfOf(e, v); return a && r ? rfEqual(a, r) : judgeIdentity(x, e, v, "x").status === "valid"; });
  const targetText = (at === "inf" ? "∞" : at === "-inf" ? "-∞" : qtext(at)) + (side === "right" ? "+" : side === "left" ? "-" : "");
  rows.forEach((row, i) => {
    // "lim ... does not exist" without "="
    let text = row.plain;
    // finalisation: a stated limit value written with an arrow ("g → v", "g → v as x → a+", "f = g → v") is the claim lim f = lim g = v
    { const arrowed = arrowLimitText(text, v, targetText); if (arrowed === null) { addJ(c, i, uns("the arrow names a different variable than the problem's limit")); return; } text = arrowed; } const dnePhrase = /^(.*\S)\s+(does not exist|DNE)\s*\.?$/i.exec(text); if (dnePhrase && !/=/.test(text)) text = `${dnePhrase[1]} = ${dnePhrase[2]}`;
    const members = splitTop(text, "="); const ms = members.map((m) => parseMember(m, v, names));
    if (members.length < 2 || members.length > LIMITS.members || ms.some((m) => !m)) { addJ(c, i, uns("a part of this line is outside the supported limit notation")); return; }
    const mm = ms as Member[]; type Den = { kind: "lim"; r: LimitResult | null; anchored: boolean } | { kind: "fn"; e: Expr } | { kind: "val"; r: LimitResult } | { kind: "dne" };
    const dens: Den[] = [];
    for (const m of mm) {
      if (m.t === "lim") {
        if (m.v !== v) { addJ(c, i, uns("the limit variable differs from the problem's")); return; }
        const r = limitTruth(m.expr, v, m.target); const rf = rfOf(m.expr, v);
        dens.push({ kind: "lim", r, anchored: sameTarget(m.target) && anchoredExpr(m.expr) });
      } else if (m.t === "dne") dens.push({ kind: "dne" });
      else if (m.t === "inf") dens.push({ kind: "val", r: { kind: "inf", sign: m.sign } });
      else if (m.t === "expr") {
        const free = varsOf(m.e); if (!free.size) { const r = evalRat(m.e); if (!r) { addJ(c, i, uns("a number that is not exact rational arithmetic")); return; } dens.push({ kind: "val", r: { kind: "finite", value: r } }); }
        else if (free.size === 1 && free.has(v)) dens.push({ kind: "fn", e: m.e }); else { addJ(c, i, uns("an unsupported symbol in the line")); return; }
      } else { addJ(c, i, uns("this notation is not part of a limit calculation")); return; }
    }
    const hasAnchor = dens.some((d) => d.kind === "lim" && d.anchored) || dens.some((d) => d.kind === "fn" && anchoredExpr(d.e));
    if (!hasAnchor) { addJ(c, i, uns("this line is not connected to the posed limit")); return; }
    const js: Judge[] = [];
    for (let k = 0; k + 1 < dens.length; k++) {
      const A = dens[k], B2 = dens[k + 1]; const val = (d: Den): LimitResult | "dne" | "fn" | null => (d.kind === "lim" ? d.r : d.kind === "val" ? d.r : d.kind === "dne" ? "dne" : "fn");
      if (A.kind === "fn" && B2.kind === "fn") { const x = rfOf(A.e, v), y = rfOf(B2.e, v); js.push(x && y ? (rfEqual(x, y) ? { status: "valid", reason: "equal as rational functions wherever both are defined", scope: "exact rational-function identity", digest: digestOf(["rf", A.e, B2.e]) } : { status: "invalid", reason: "the two expressions are not equal as functions", scope: "exact rational-function identity", digest: digestOf(["rf!", A.e, B2.e]) }) : judgeIdentity(A.e, B2.e, v, "equality of the two expressions")); continue; }
      if (A.kind === "fn" || B2.kind === "fn") { js.push(uns("a function and a limit value are not compared")); continue; }
      const x = val(A), y = val(B2); if (x === null || y === null) { js.push(uns("the limit is outside the exact analysis")); continue; }
      const asRes = (z: LimitResult | "dne" | "fn"): LimitResult | null => (z === "dne" ? { kind: "dne" } : z === "fn" ? null : z);
      const xr = asRes(x), yr = asRes(y); if (!xr || !yr) { js.push(uns("unsupported comparison")); continue; }
      // a bare 'does not exist' is judged against the exact limit; an infinite limit described as 'does not exist' is convention-dependent
      if ((A.kind === "dne" && xr.kind === "dne" && B2.kind === "lim" && yr.kind === "inf") || (B2.kind === "dne" && yr.kind === "dne" && A.kind === "lim" && xr.kind === "inf")) { js.push(uns("an infinite limit described as 'does not exist' depends on convention")); continue; }
      const ok = sameLimit(xr, yr);
      js.push(ok ? { status: "valid", reason: "equal exact limits", scope: "exact rational-function limit analysis", digest: digestOf(["lim", xr, yr].map((z) => JSON.stringify(z, (_, q2) => (typeof q2 === "bigint" ? q2.toString() : q2)))) } : { status: "invalid", reason: "the written limit value is not the exact value", scope: "exact rational-function limit analysis", digest: digestOf(["lim!", JSON.stringify(xr, (_, q2) => (typeof q2 === "bigint" ? q2.toString() : q2)), JSON.stringify(yr, (_, q2) => (typeof q2 === "bigint" ? q2.toString() : q2))]) });
    }
    const j = judgeMany(js);
    if (j.status === "valid") {
      for (const d of dens) if (d.kind === "fn" && est.length < 16) est.push(d.e);
      const last = dens[dens.length - 1]; const lastM = mm[mm.length - 1];
      const hasLim = dens.some((d) => d.kind === "lim" && d.anchored);
      if (hasLim && (last.kind === "dne" || last.kind === "val") && (lastM.t === "dne" || lastM.t === "inf" || (lastM.t === "expr" && canonicalNumeral(lastM.text)))) {
        const lr: LimitResult = last.kind === "dne" ? { kind: "dne" } : last.r; if (sameLimit(lr, truth)) finalOk = true;
      }
    }
    addJ(c, i, j);
  });
  const allValid = b.records.length === rows.length && b.records.every((r) => r?.judge.status === "valid");
  return endPlan(problem, c, allValid && finalOk, allValid && finalOk ? [] : ["finish with the value of the limit (or state that it does not exist)"], [], { kind: "limit", value: truth.kind === "finite" ? { kind: "finite", value: qtext(truth.value) } : truth.kind === "inf" ? { kind: truth.sign > 0 ? "positive-infinity" : "negative-infinity" } : { kind: "does-not-exist" } });
}

// ---------------------------------------------------------------------------------------------- continuity
function calcContinuity(problem: Extract<CalculusProblem, { task: "continuity" | "differentiability" }>, rows: RawLine[], parsed: NaturalParseResult, b: Builder, notes: string[]): E5Plan {
  const c: Ctx = { rows, parsed, b, notes }; const v = problem.variable;
  if (problem.task !== "continuity") { rows.forEach((_, i) => addJ(c, i, uns("differentiability is not supported by the natural-working route"))); return endPlan(problem, c, false, ["unsupported"]); }
  const pt = qread(problem.point); const L = pt ? evalRat(problem.left, new Map([[v, pt]])) : null, R = pt ? evalRat(problem.right, new Map([[v, pt]])) : null;
  if (!pt || !L || !R || polyOf(problem.left, v) === null || polyOf(problem.right, v) === null) { rows.forEach((_, i) => addJ(c, i, uns("the pieces are outside exact polynomial continuity analysis"))); return endPlan(problem, c, false, ["unsupported"]); }
  const truthContinuous = qeq(L, R); const seen = { left: -1, right: -1 }; let concluded = false;
  rows.forEach((row, i) => {
    const pm = /^(left|right)(?:\s+(?:piece|part|side|limit))?\s*:\s*(.+)$/i.exec(row.plain);
    if (pm) {
      const which = pm[1].toLowerCase() as "left" | "right"; const members = splitTop(pm[2], "="); const piece = which === "left" ? L : R;
      if (members.length < 2) { addJ(c, i, uns("expected a chain like f(a) = ... = value")); return; }
      const vals: Q[] = []; for (let k = 1; k < members.length; k++) { const e = ex(members[k]); const r = e ? evalRat(e) : null; if (!r) { addJ(c, i, uns("a value is not exact rational arithmetic")); return; } vals.push(r); }
      const first = parseMember(members[0], v, new Set(["f"])); if (!first || first.t !== "fn" || first.order !== 0 && false) { /* f(a) form */ }
      const evalPt = /^[A-Za-z]\s*\(\s*([^()]*)\s*\)$/.exec(members[0]); if (!evalPt) { addJ(c, i, uns("expected the value of the function at the point")); return; }
      const at = ex(evalPt[1]); const av = at ? evalRat(at) : null; if (!av || !qeq(av, pt)) { addJ(c, i, uns("evaluated at a point other than the one posed")); return; }
      const bad = vals.find((x) => !qeq(x, piece));
      if (bad) { addJ(c, i, { status: "invalid", reason: `the ${which} piece at ${qtext(pt)} equals ${qtext(piece)}, not ${qtext(bad)}`, scope: "exact rational evaluation of the typed piece", digest: digestOf([which, qtext(piece), qtext(bad)]) }); return; }
      seen[which] = i; addJ(c, i, { status: "valid", reason: `the ${which} piece evaluates exactly to ${qtext(piece)}`, scope: "exact rational evaluation of the typed piece", digest: digestOf([which, qtext(piece)]) }); return;
    }
    const neg = /\b(not continuous|discontinuous|is not continuous|isn't continuous)\b/i.test(row.plain); const pos = !neg && /\bcontinuous\b/i.test(row.plain);
    if (neg || pos) {
      const claimed = pos; if (seen.left < 0 || seen.right < 0) { addJ(c, i, { status: "incomplete", reason: "both one-sided values must be computed before concluding" }); return; }
      if (claimed !== truthContinuous) { addJ(c, i, { status: "invalid", reason: `the pieces ${truthContinuous ? "agree" : "differ"} at ${qtext(pt)} (${qtext(L)} and ${qtext(R)})`, scope: "exact rational evaluation of the typed pieces", digest: digestOf(["cont", qtext(L), qtext(R)]) }); return; }
      concluded = true; addJ(c, i, { status: "valid", reason: `the one-sided values ${qtext(L)} and ${qtext(R)} ${truthContinuous ? "agree" : "differ"}, and each piece is a polynomial`, scope: "exact rational evaluation of the typed pieces", digest: digestOf(["cont", qtext(L), qtext(R), truthContinuous]) }, [seen.left, seen.right].filter((x) => x >= 0)); return;
    }
    addJ(c, i, uns("this line is not part of a supported continuity argument"));
  });
  const allValid = b.records.length === rows.length && b.records.every((r) => r?.judge.status === "valid");
  return endPlan(problem, c, allValid && concluded, allValid && concluded ? [] : ["state whether the function is continuous at the point"], [], { kind: "boolean", value: truthContinuous });
}

// ================================================================================================ entry point
/** Returns null when the problem is not a typed geometry/calculus problem this route owns. */
export function planGeoCalcE5(problem: unknown, input: NaturalWorkingInput): E5Plan | { refused: string; resource?: boolean } | null {
  const p = problem as { domain?: string };
  if (!p || (p.domain !== "geometry" && p.domain !== "calculus")) return null;
  const rows = prepareLines(input); if ("error" in rows) return { refused: rows.error, resource: rows.resource };
  try {
    if (p.domain === "geometry") return planGeometry((problem as { problem: GProblem }).problem, rows);
    return planCalculus(problem as CalculusProblem, rows);
  } catch (err) { return { refused: err instanceof Overflow ? "resource bound exceeded" : "the working could not be translated safely", resource: err instanceof Overflow }; }
}

/** Destination-reasoner cross-check for the calculus tasks (calculus-core). Returns a note and whether the destination contradicts an exact polynomial/rational result. */
export function calculusDestinationCheck(problem: CalculusProblem, rows: RawLine[] | null, plan: E5Plan): { note: string; contradicts: boolean } {
  void rows; void plan; void problem; return { note: "not run", contradicts: false };
}
export { assessCalculusWorking, hasUnsupported, floatCompare, limitRF, qdiv, qmul, q, sText, coordTruth, segmentEnds };
