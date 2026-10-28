/**
 * E7 Phase 6: evidence provenance.
 *
 * Every proof obligation that is discharged names the trusted MATHEMATICAL MECHANISM that established it. A route-provided checker string is a
 * claim about provenance, not provenance: it is accepted only when (1) it is registered here, (2) the route that produced the evidence is one the
 * registry lists as a producer of that mechanism, and (3) that producing route (or its adapter) actually took part in the assessment (its
 * reasoner id is in the envelope). Anything else is `untrusted` and can never discharge a derivation. No mathematics is evaluated here; the
 * registry only says which existing kernel stands behind which evidence label.
 */
export const EVIDENCE_PROVENANCE_CONTRACT = "openpath-evidence-provenance@1" as const;

export type MechanismKind = "exact-kernel" | "typed-domain-reasoner" | "task-data" | "internal";
export interface Mechanism {
  id: string; kind: MechanismKind;
  /** the existing kernel / module that establishes claims of this kind */
  kernel: string;
  /** gate routes whose evidence may carry this label */
  routes: string[];
  /** at least one of these reasoner ids must be present in the assessment envelope (empty = no further requirement) */
  reasoners: string[];
  /** internal mechanisms may establish context / grounding obligations only, never a mathematical derivation */
  mayDischargeDerivation: boolean;
}

const M = (id: string, kind: MechanismKind, kernel: string, routes: string[], reasoners: string[], mayDischargeDerivation = true): [string, Mechanism] => [id, { id, kind, kernel, routes, reasoners, mayDischargeDerivation }];
const NAT = ["adapter-converted", "algebra-text", "natural-other"];
const TYPED = ["structured-typed"];

export const MECHANISMS: Record<string, Mechanism> = Object.fromEntries([
  M("u4-kernel", "exact-kernel", "U4 symbolic-equivalence kernel", ["adapter-converted", "algebra-text"], []),
  M("independent-ir-evaluator", "exact-kernel", "canonical-IR independent evaluator (claim-binding)", ["adapter-converted"], []),
  M("independent-polynomial-identity", "exact-kernel", "exact polynomial identity (claim-binding)", ["adapter-converted"], []),
  M("e5-independent-geocalc", "exact-kernel", "E5 exact geometry/calculus binders", NAT, ["natural-geocalc-e5"]),
  M("e6-independent-exact", "exact-kernel", "E6 exact CAS and series kernels", NAT, ["natural-generalization-e6"]),
  M("u4+exact-solution-set", "exact-kernel", "independent algebra checker (U4 + exact solution set)", ["algebra-text"], []),
  M("u4+exact-linear-system", "exact-kernel", "independent algebra checker (U4 + exact linear system)", ["algebra-text"], []),
  M("u4-identity", "exact-kernel", "independent algebra checker (U4 identity)", ["algebra-text"], []),
  M("exact-arithmetic", "exact-kernel", "independent algebra checker (exact rational arithmetic)", ["algebra-text"], []),
  M("exact-polynomial-identity", "exact-kernel", "independent algebra checker (exact polynomial identity)", ["algebra-text"], []),
  M("exact-solution-set", "exact-kernel", "independent algebra checker (exact solution set)", ["algebra-text"], []),
  // typed (structured) inputs: the typed domain reasoner that judged the step against the typed problem object
  ...["symbolic:m3", "calculus:exact", "calculus:methods", "geometry:synthetic", "math-core:equation", "math-core:number", "math-core:symbolic", "math-core:multivariate", "complex-polynomial:b3", "linear-algebra:b2", "probability-statistics:b1", "math-domains-m1", "math-domains-m2"]
    .map((id) => M(id, "typed-domain-reasoner", `typed domain reasoner ${id}`, TYPED, [id])),
  // cross-domain transfers: the canonical-IR binding / proof-state check that ties one domain's verified result to the next stage
  ...["unified:proof-state", "unified:d2-proof-state", "unified:d3-bindings"].map((id) => M(id, "typed-domain-reasoner", `cross-domain proof-state binding check ${id}`, TYPED, [id])),
  M("natural-adapter:typed-match", "typed-domain-reasoner", "typed binding match (cross-domain stage)", TYPED, []),
  M("problem-data-match", "task-data", "match to the typed task data (canonical IR)", NAT, [], true),
  M("proof-context", "internal", "immutable proof context classification", ["natural-other", "adapter-converted", "algebra-text", "structured-typed"], [], false),
  M("grounding", "internal", "claim-grounding relation to premises / proved facts", NAT, [], false),
  M("completeness", "internal", "completeness authority of the producing route over the final proven claim", ["natural-other", "adapter-converted", "algebra-text", "structured-typed"], [], false),
]) as Record<string, Mechanism>;

export interface Provenance { mechanism: string | null; kernel: string | null; kind: MechanismKind | "unregistered"; trusted: boolean; reason: string }

/** Attribute an evidence label. `route` is the gate route that carried it; `reasoners` are the reasoner ids present in the assessment. */
export function attribute(checker: string, route: string, reasoners: readonly string[]): Provenance {
  const m = MECHANISMS[checker];
  if (!m) return { mechanism: null, kernel: null, kind: "unregistered", trusted: false, reason: `"${checker}" is not a registered mathematical mechanism; a route-provided label is not evidence` };
  if (!m.routes.includes(route)) return { mechanism: m.id, kernel: m.kernel, kind: m.kind, trusted: false, reason: `mechanism ${m.id} is not a producer on the ${route} route` };
  if (m.reasoners.length && !m.reasoners.some((r) => reasoners.includes(r))) return { mechanism: m.id, kernel: m.kernel, kind: m.kind, trusted: false, reason: `mechanism ${m.id} requires ${m.reasoners.join(" or ")}, which did not take part in this assessment` };
  return { mechanism: m.id, kernel: m.kernel, kind: m.kind, trusted: true, reason: `established by ${m.kernel}` };
}
