/**
 * E5 independent geometry binder. It judges typed claims proposed from natural working against the TYPED geometry problem only:
 *  - angle claims: exact rational linear algebra over premises compiled from the typed facts; premises that need an assumption
 *    (nondegenerate triangle, parallel lines) are only available when that assumption is a stated fact/condition;
 *  - coordinate claims: exact rational/surd arithmetic from the typed point data;
 *  - congruence claims: criterion table + established equalities.
 * Nothing here reads the student's text; the proposer (natural-geocalc-e5.ts) translates notation into the claim types below.
 */
import { createHash } from "node:crypto";
import { Overflow, Z, ONE, q, qadd, qdiv, qeq, qiszero, qmul, qneg, qsub, qtext, type Q, type Surd, evalSurd, sEq, sRat, surd, sText, squarefree } from "./exact-e5.ts";
import type { Expr } from "./calculus-core.ts";

export type JudgeStatus = "valid" | "invalid" | "unsupported" | "missing-assumption" | "incomplete";
export interface Judge { status: JudgeStatus; reason: string; scope?: string; digest?: string | null; /** E7 Phase 6: correct on its own but not about the task */ offTask?: boolean; /** E7 Phase 6: why the line is about the task (anchoring recorded by the route that checked it) */ grounding?: import("./claim-grounding.ts").Grounding }
export const digestOf = (x: unknown): string => createHash("sha256").update(JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? v.toString() : v instanceof Map ? [...v] : v))).digest("hex");

export interface GFact { predicate: string; args: string[]; value?: unknown }
export interface GObject { id: string; kind: string; data?: Record<string, unknown> }
export interface GProblem { id?: string; objects: GObject[]; facts: GFact[]; conditions?: string[]; goal?: GFact }

// ------------------------------------------------------------------------------------------------ linear forms and row reduction
export type Lin = Map<string, Q>; // "" is the constant term
export function linOf(e: Expr, depth = 0): Lin | null {
  if (depth > 40) return null;
  try {
    switch (e.kind) {
      case "constant": { const s = evalSurd(e); return s && s.m === 1n ? new Map([["", s.a]]) : null; }
      case "variable": return new Map([[e.name, ONE]]);
      case "add": { const out: Lin = new Map(); for (const t of e.terms) { const l = linOf(t, depth + 1); if (!l) return null; for (const [k, v] of l) out.set(k, qadd(out.get(k) ?? Z, v)); } return out; }
      case "multiply": {
        let scale = ONE; let lin: Lin | null = null;
        for (const f of e.factors) {
          const c = evalSurd(f); if (c && c.m === 1n) { scale = qmul(scale, c.a); continue; }
          const l = linOf(f, depth + 1); if (!l || lin) return null; lin = l;
        }
        if (!lin) return new Map([["", scale]]);
        const out: Lin = new Map(); for (const [k, v] of lin) out.set(k, qmul(v, scale)); return out;
      }
      case "power": { const c = evalSurd(e); if (c && c.m === 1n) return new Map([["", c.a]]); return null; }
      default: return null;
    }
  } catch (err) { if (err instanceof Overflow) return null; throw err; }
}
const linSub = (a: Lin, b: Lin): Lin => { const out: Lin = new Map(a); for (const [k, v] of b) out.set(k, qsub(out.get(k) ?? Z, v)); return out; };

/** Rows are [coefficients over `vars`..., rhs]. Returns reduced rows (RREF), or null when inconsistent. */
function rref(rows: Q[][], width: number): { rows: Q[][]; pivots: number[] } | null {
  const m = rows.map((r) => r.slice()); const pivots: number[] = []; let r = 0;
  for (let c = 0; c < width && r < m.length; c++) {
    let p = -1; for (let i = r; i < m.length; i++) if (!qiszero(m[i][c])) { p = i; break; }
    if (p < 0) continue; [m[r], m[p]] = [m[p], m[r]];
    const inv = qdiv(ONE, m[r][c]); m[r] = m[r].map((x) => qmul(x, inv));
    for (let i = 0; i < m.length; i++) if (i !== r && !qiszero(m[i][c])) { const f = m[i][c]; m[i] = m[i].map((x, j) => qsub(x, qmul(f, m[r][j]))); }
    pivots.push(c); r++;
  }
  for (let i = r; i < m.length; i++) if (!qiszero(m[i][width])) return null; // 0 = nonzero
  return { rows: m.slice(0, r), pivots };
}
export interface Eq { lhs: Lin; rhs: Lin }
function toRow(eq: Eq, vars: string[]): Q[] {
  const d = linSub(eq.lhs, eq.rhs); // sum coef*v + k = 0
  const row = vars.map((v) => d.get(v) ?? Z); row.push(qneg(d.get("") ?? Z)); return row;
}
/** "implied" | "contradicts" | "independent" relative to the premise equations. */
export function relate(premises: Eq[], claim: Eq): "implied" | "contradicts" | "independent" | "inconsistent-premises" {
  const names = new Set<string>(); for (const e of [...premises, claim]) for (const l of [e.lhs, e.rhs]) for (const k of l.keys()) if (k) names.add(k);
  const vars = [...names].sort(); if (vars.length > 64 || premises.length > 128) throw new Overflow("angle system too large");
  const base = rref(premises.map((p) => toRow(p, vars)), vars.length);
  if (!base) return "inconsistent-premises";
  const withClaim = rref([...premises, claim].map((p) => toRow(p, vars)), vars.length);
  if (!withClaim) return "contradicts";
  // implied iff adding the claim does not increase the rank
  return withClaim.pivots.length === base.pivots.length ? "implied" : "independent";
}

// ------------------------------------------------------------------------------------------------ premise compilation
export type PremiseKind = "given" | "vertical" | "alternate" | "corresponding" | "linear_pair" | "triangle-sum" | "isosceles" | "supplementary" | "complementary";
export interface Premise { kind: PremiseKind; eq: Eq; requires: string[]; available: boolean; label: string }
const num = (v: number) => new Map<string, Q>([["", q(v)]]);
const vr = (n: string) => new Map<string, Q>([[n, ONE]]);
const sum = (names: string[]): Lin => { const m: Lin = new Map(); for (const n of names) m.set(n, qadd(m.get(n) ?? Z, ONE)); return m; };
const toQ = (v: unknown): Q | null => {
  if (typeof v === "number" && Number.isFinite(v)) { if (Number.isInteger(v)) return q(v); const s = String(v); const m = /^(-?\d+)\.(\d+)$/.exec(s); return m ? q(BigInt(m[1] + m[2]), 10n ** BigInt(m[2].length)) : null; }
  if (typeof v === "string") { const m = /^\s*([-+]?\d+)(?:\s*\/\s*(\d+))?\s*$/.exec(v); return m ? q(BigInt(m[1]), BigInt(m[2] ?? "1")) : null; }
  return null;
};
export const trianglesOf = (p: GProblem): { id: string; angles: string[]; sides: string[] }[] =>
  p.objects.filter((o) => o.kind === "triangle").map((o) => {
    const d = (o.data ?? {}) as { angles?: string[]; sides?: string[] };
    const letters = /^[A-Z]{3}$/.test(o.id) ? o.id.split("") : [];
    const angles = Array.isArray(d.angles) && d.angles.length === 3 ? d.angles.map(String) : letters;
    const sides = Array.isArray(d.sides) && d.sides.length === 3 ? d.sides.map(String) : letters.length ? [letters[0] + letters[1], letters[1] + letters[2], letters[2] + letters[0]] : [];
    return { id: o.id, angles, sides };
  });
const sideLetters = (s: string) => s.split("").sort().join("");
export function compilePremises(p: GProblem): Premise[] {
  const out: Premise[] = []; const conds = new Set(p.conditions ?? []);
  const parallel = (a: string, b: string) => p.facts.some((f) => f.predicate === "parallel" && ((f.args[0] === a && f.args[1] === b) || (f.args[0] === b && f.args[1] === a)));
  for (const f of p.facts) {
    const a = f.args;
    if (f.predicate === "angle_measure" && a.length === 1) { const v = toQ(f.value); if (v) out.push({ kind: "given", eq: { lhs: vr(a[0]), rhs: new Map([["", v]]) }, requires: [], available: true, label: `${a[0]} = ${qtext(v)}` }); }
    else if (f.predicate === "equal_angle" && a.length === 2) out.push({ kind: "given", eq: { lhs: vr(a[0]), rhs: vr(a[1]) }, requires: [], available: true, label: `${a[0]} = ${a[1]}` });
    else if (f.predicate === "linear_pair" && a.length === 2) out.push({ kind: "linear_pair", eq: { lhs: sum([a[0], a[1]]), rhs: num(180) }, requires: [], available: true, label: `linear pair ${a[0]}, ${a[1]}` });
    else if (f.predicate === "supplementary" && a.length === 2) out.push({ kind: "supplementary", eq: { lhs: sum([a[0], a[1]]), rhs: num(180) }, requires: [], available: true, label: `supplementary ${a[0]}, ${a[1]}` });
    else if (f.predicate === "complementary" && a.length === 2) out.push({ kind: "complementary", eq: { lhs: sum([a[0], a[1]]), rhs: num(90) }, requires: [], available: true, label: `complementary ${a[0]}, ${a[1]}` });
    else if (f.predicate === "vertical_pair" && a.length === 2) out.push({ kind: "vertical", eq: { lhs: vr(a[0]), rhs: vr(a[1]) }, requires: [], available: true, label: `vertical pair ${a[0]}, ${a[1]}` });
    else if ((f.predicate === "alternate_pair" || f.predicate === "corresponding_pair") && a.length === 4) {
      const ok = parallel(a[2], a[3]);
      out.push({ kind: f.predicate === "alternate_pair" ? "alternate" : "corresponding", eq: { lhs: vr(a[0]), rhs: vr(a[1]) }, requires: [`parallel(${a[2]},${a[3]})`], available: ok, label: `${f.predicate} ${a[0]}, ${a[1]}` });
    }
  }
  const tris = trianglesOf(p);
  for (const t of tris) {
    if (t.angles.length === 3) out.push({ kind: "triangle-sum", eq: { lhs: sum(t.angles), rhs: num(180) }, requires: [`nondegenerate:${t.id}`], available: conds.has(`nondegenerate:${t.id}`), label: `angle sum of triangle ${t.id}` });
    if (t.angles.length === 3 && t.sides.length === 3) {
      for (const f of p.facts) {
        if (f.predicate !== "equal_length" || f.args.length !== 2) continue;
        const [s1, s2] = f.args; const i1 = t.sides.findIndex((s) => sideLetters(s) === sideLetters(s1)), i2 = t.sides.findIndex((s) => sideLetters(s) === sideLetters(s2));
        if (i1 < 0 || i2 < 0 || i1 === i2) continue;
        const shared = [...s1].filter((c) => s2.includes(c)); if (shared.length !== 1) continue;
        const base = [...new Set([...s1, ...s2])].filter((c) => c !== shared[0]); if (base.length !== 2 || !base.every((c) => t.angles.includes(c))) continue;
        out.push({ kind: "isosceles", eq: { lhs: vr(base[0]), rhs: vr(base[1]) }, requires: [`nondegenerate:${t.id}`], available: conds.has(`nondegenerate:${t.id}`), label: `base angles of isosceles triangle ${t.id} (${s1} = ${s2})` });
      }
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ reasons
export type Rule = "vertical" | "alternate" | "corresponding" | "linear_pair" | "triangle-sum" | "isosceles" | "exterior" | "complementary" | "supplementary" | "given" | "parallel" | null;
export function ruleOf(reason: string | null): Rule {
  if (!reason) return null; const r = reason.toLowerCase();
  if (/\bgiven\b/.test(r) && !/\b(angle|triangle|line|parallel)/.test(r.replace(/given/g, ""))) return "given";
  if (/vertical|vertically opposite|opposite angles/.test(r)) return "vertical";
  if (/alternate/.test(r)) return "alternate";
  if (/corresponding/.test(r)) return "corresponding";
  if (/isosceles|base angles/.test(r)) return "isosceles";
  if (/exterior/.test(r)) return "exterior";
  if (/linear pair|straight line|supplement|adjacent angles|angles on a line/.test(r)) return "linear_pair";
  if (/complement|right triangle|right angle/.test(r)) return "complementary";
  if (/angle sum|sum of (the )?(interior )?angles|triangle sum|interior angles/.test(r)) return "triangle-sum";
  if (/parallel/.test(r)) return "parallel";
  return null;
}
const allowedKinds = (r: Rule): PremiseKind[] | null => {
  switch (r) {
    case null: case "parallel": return null; // unconstrained
    case "given": return ["given"];
    case "exterior": return ["given", "linear_pair", "triangle-sum", "supplementary"];
    case "complementary": return ["given", "triangle-sum", "complementary"];
    case "linear_pair": return ["given", "linear_pair", "supplementary"];
    case "vertical": return ["given", "vertical"];
    case "alternate": return ["given", "alternate"];
    case "corresponding": return ["given", "corresponding"];
    case "isosceles": return ["given", "isosceles", "triangle-sum"];
    case "triangle-sum": return ["given", "triangle-sum"];
    default: return null;
  }
};

export interface AngleClaim { eq: Eq; reason: string | null }
/** Judges one angle equation against the typed problem. */
export function judgeAngleEquation(p: GProblem, premises: Premise[], claim: AngleClaim): Judge {
  const scope = "exact rational linear algebra over premises compiled from the typed problem facts";
  const known = new Set<string>(); for (const pr of premises) for (const l of [pr.eq.lhs, pr.eq.rhs]) for (const k of l.keys()) if (k) known.add(k);
  for (const o of p.objects) if (o.kind === "angle") known.add(o.id);
  for (const a of p.goal?.args ?? []) known.add(a);
  for (const t of trianglesOf(p)) t.angles.forEach((a) => known.add(a));
  const claimVars = new Set<string>(); for (const l of [claim.eq.lhs, claim.eq.rhs]) for (const k of l.keys()) if (k) claimVars.add(k);
  const unknown = [...claimVars].filter((v) => !known.has(v));
  const rule = ruleOf(claim.reason); const kinds = allowedKinds(rule);
  const usable = (x: Premise[]) => (kinds ? x.filter((pr) => kinds.includes(pr.kind)) : x);
  const avail = premises.filter((x) => x.available);
  const result = (status: JudgeStatus, reason: string): Judge => ({ status, reason, scope, digest: digestOf({ claim: [...claim.eq.lhs], rhs: [...claim.eq.rhs], premises: premises.map((x) => x.label), status }) });
  let r1;
  try {
    r1 = relate(usable(avail).map((x) => x.eq), claim.eq);
    if (r1 === "implied") return result("valid", rule ? `follows from the stated facts by ${rule.replace("_", " ")} (all assumptions are given)` : "follows from the stated facts");
    const rAll = relate(usable(premises).map((x) => x.eq), claim.eq);
    if (r1 === "inconsistent-premises") return result("unsupported", "the stated facts are inconsistent");
    if (rAll === "implied") { const missing = premises.filter((x) => !x.available && (!kinds || kinds.includes(x.kind))).flatMap((x) => x.requires); return result("missing-assumption", `the step depends on an assumption that is not stated: ${[...new Set(missing)].join(", ")}`); }
    // mislabelled citation: derivable, but by a different rule than the one cited
    if (kinds) { const any = relate(avail.map((x) => x.eq), claim.eq); if (any === "implied") return result("invalid", `the cited justification (${claim.reason}) does not establish this step`); }
    const full = relate(premises.map((x) => x.eq), claim.eq);
    if (unknown.length) return result("unsupported", `the step uses a quantity that is not part of the problem (${unknown.join(", ")})`);
    if (full === "contradicts" || r1 === "contradicts") return result("invalid", "the step contradicts the stated facts");
    if (full === "implied") return result(kinds ? "invalid" : "missing-assumption", kinds ? `the cited justification (${claim.reason}) does not establish this step` : "the step depends on an assumption that is not stated");
    return result("missing-assumption", "the step is consistent with the facts but is not justified by them (a fact or relationship is assumed without being given)");
  } catch (err) { if (err instanceof Overflow) return { status: "unsupported", reason: "resource bound exceeded", scope }; throw err; }
}

// ------------------------------------------------------------------------------------------------ coordinates
export interface PointData { x: Q; y: Q }
export function pointsOf(p: GProblem): Map<string, PointData> {
  const out = new Map<string, PointData>();
  for (const o of p.objects) if (o.kind === "point" && o.data) { const x = toQ((o.data as { x?: unknown }).x), y = toQ((o.data as { y?: unknown }).y); if (x && y) out.set(o.id, { x, y }); }
  return out;
}
export function segmentEnds(p: GProblem, id: string): [string, string] | null {
  const o = p.objects.find((x) => x.id === id && (x.kind === "segment" || x.kind === "line"));
  const pts = (o?.data as { points?: unknown } | undefined)?.points;
  if (Array.isArray(pts) && pts.length === 2) return [String(pts[0]), String(pts[1])];
  if (/^[A-Z]{2}$/.test(id) && pointsOf(p).has(id[0]) && pointsOf(p).has(id[1])) return [id[0], id[1]];
  return null;
}
export type CoordSubject = { kind: "point"; name: string } | { kind: "slope"; segment: string | null } | { kind: "dist"; segment: string | null } | { kind: "dist2"; segment: string | null };
export type CoordValue = Surd[]; // 1 value, or 2 for a point
export function coordTruth(p: GProblem, s: CoordSubject, defaultSegment: string | null): { values: Surd[] } | { error: string } {
  const pts = pointsOf(p);
  try {
    if (s.kind === "point") {
      const goal = p.goal; if (!goal || goal.predicate !== "midpoint" || goal.args[0] !== s.name) return { error: "the point is not the midpoint named in the problem" };
      const a = pts.get(goal.args[1]), b = pts.get(goal.args[2]); if (!a || !b) return { error: "midpoint endpoints are not typed points" };
      return { values: [sRat(qdiv(qadd(a.x, b.x), q(2))), sRat(qdiv(qadd(a.y, b.y), q(2)))] };
    }
    const seg = s.segment ?? defaultSegment; if (!seg) return { error: "no segment is named" };
    const ends = segmentEnds(p, seg); if (!ends) return { error: `segment ${seg} is not defined by two typed points` };
    const a = pts.get(ends[0]), b = pts.get(ends[1]); if (!a || !b) return { error: "segment endpoints are not typed points" };
    const dx = qsub(b.x, a.x), dy = qsub(b.y, a.y);
    if (s.kind === "slope") { if (qiszero(dx)) return { error: "the slope of a vertical line is undefined" }; return { values: [sRat(qdiv(dy, dx))] }; }
    const d2 = qadd(qmul(dx, dx), qmul(dy, dy));
    if (s.kind === "dist2") return { values: [sRat(d2)] };
    if (qiszero(d2)) return { values: [sRat(Z)] };
    const sf = squarefree(d2.n * d2.d); return { values: [surd(q(sf.s, d2.d), sf.t)] };
  } catch (err) { if (err instanceof Overflow) return { error: "resource bound exceeded" }; throw err; }
}
export interface CoordClaim { subject: CoordSubject; members: Expr[][]; text: string }
/** Every member of the chain (a tuple of expressions or a single expression) must equal the typed truth exactly. */
export function judgeCoordinate(p: GProblem, claim: CoordClaim, defaultSegment: string | null): Judge {
  const scope = "exact rational/surd arithmetic from the typed point coordinates";
  const truth = coordTruth(p, claim.subject, defaultSegment);
  if ("error" in truth) return { status: "unsupported", reason: truth.error, scope };
  const bad: string[] = [];
  for (const member of claim.members) {
    if (member.length !== truth.values.length) return { status: "invalid", reason: `expected ${truth.values.length} component(s) but the line has ${member.length}`, scope };
    for (let i = 0; i < member.length; i++) {
      const v = evalSurd(member[i]);
      if (!v) return { status: "unsupported", reason: "a component is outside exact rational/single-radical arithmetic", scope };
      if (!sEq(v, truth.values[i])) bad.push(`${sText(v)} ≠ ${sText(truth.values[i])}`);
    }
  }
  if (bad.length) return { status: "invalid", reason: `the written value is not the exact value (${bad[0]})`, scope, digest: digestOf({ claim: claim.text, bad }) };
  return { status: "valid", reason: "each written component equals the exact value computed from the typed coordinates", scope, digest: digestOf({ claim: claim.text, truth: truth.values.map(sText) }) };
}
/** parallel / perpendicular from the typed coordinates. */
export function truthOfLineRelation(p: GProblem, relation: "parallel" | "perpendicular", a: string, b: string): boolean | null {
  const sa = coordTruth(p, { kind: "slope", segment: a }, null), sb = coordTruth(p, { kind: "slope", segment: b }, null);
  if ("error" in sa || "error" in sb) return null;
  const x = sa.values[0], y = sb.values[0]; if (x.m !== 1n || y.m !== 1n) return null;
  return relation === "parallel" ? qeq(x.a, y.a) : qeq(qmul(x.a, y.a), q(-1));
}

// ------------------------------------------------------------------------------------------------ congruence criteria
export interface CongruenceClaim { first: string; second: string; criterion: string | null }
const normCrit = (c: string | null) => (c ?? "").replace(/[^A-Za-z]/g, "").toUpperCase();
export function judgeCongruence(p: GProblem, claim: CongruenceClaim, establishedSides: [string, string][], establishedAngles: [string, string][]): Judge {
  const scope = "congruence criterion table (SSS, SAS, ASA, AAS) over equalities established by the stated facts and verified lines";
  const tris = trianglesOf(p); const t1 = tris.find((t) => t.id === claim.first), t2 = tris.find((t) => t.id === claim.second);
  if (!t1 || !t2 || t1.angles.length !== 3 || t2.angles.length !== 3 || t1.sides.length !== 3 || t2.sides.length !== 3) return { status: "unsupported", reason: "the triangles are not typed with angle and side data", scope };
  const crit = normCrit(claim.criterion);
  if (!crit) return { status: "incomplete", reason: "a congruence claim needs a stated criterion", scope };
  if (["SSA", "ASS", "AAA"].includes(crit)) return { status: "invalid", reason: `${crit} is not a congruence criterion`, scope, digest: digestOf({ claim, crit }) };
  if (!["SSS", "SAS", "ASA", "AAS"].includes(crit)) return { status: "unsupported", reason: `criterion ${crit} is not supported`, scope };
  const sideEq = (i: number) => establishedSides.some(([a, b]) => (sideLetters(a) === sideLetters(t1.sides[i]) && sideLetters(b) === sideLetters(t2.sides[i])) || (sideLetters(b) === sideLetters(t1.sides[i]) && sideLetters(a) === sideLetters(t2.sides[i])));
  const angEq = (i: number) => establishedAngles.some(([a, b]) => (a === t1.angles[i] && b === t2.angles[i]) || (b === t1.angles[i] && a === t2.angles[i]));
  // side i joins angle i and angle i+1 (sides: AB, BC, CA; angles A, B, C). The angle between side i and side j is the shared vertex.
  const included = (s: number, t: number) => { const v = [0, 1, 2].filter((k) => [s, (s + 1) % 3].includes(k) && [t, (t + 1) % 3].includes(k)); return v[0]; };
  const S = [0, 1, 2].map(sideEq), A = [0, 1, 2].map(angEq);
  let ok = false;
  if (crit === "SSS") ok = S.every(Boolean);
  if (crit === "SAS") for (const [s, t] of [[0, 1], [1, 2], [2, 0]]) { const v = included(s, t); if (S[s] && S[t] && A[v]) ok = true; }
  if (crit === "ASA") for (const s of [0, 1, 2]) { if (S[s] && A[s] && A[(s + 1) % 3]) ok = true; }
  if (crit === "AAS") for (const s of [0, 1, 2]) { const o = (s + 2) % 3; /* angles not both at the ends of s */ if (S[s] && A[o] && (A[s] || A[(s + 1) % 3])) ok = true; }
  if (!ok) return { status: "missing-assumption", reason: `the equalities needed for ${crit} are not established by the stated facts`, scope };
  return { status: "valid", reason: `${crit} is a congruence criterion and its equalities are established`, scope, digest: digestOf({ claim, crit, S, A }) };
}
export { squarefree };
