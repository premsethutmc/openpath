/**
 * E7 Phase 3: semantic grounding.
 *
 * A calculation can be true and still say nothing about the task. Grounding records WHY a verified claim is about the task: which task
 * premises, which earlier derived facts and which student-introduced assumptions it depends on. It lives in the existing structures:
 * `BindingEvidence.grounding` carries it, and `canonicalizeMathematicalObject` (the canonical IR, whose `dependencies` and `assumptions`
 * fields already exist) gives it a stable identity. Nothing here evaluates mathematics; kernels supply the sources.
 *
 * Provenance classes (never merged): task-premise, derived-fact (a value or symbol established by an earlier verified line),
 * student-assumption, free-literal (a number that is neither). Free literals are recorded, never promoted to evidence.
 */
import { canonicalizeMathematicalObject, type CanonicalMathematicalObject } from "./canonical-math-ir.ts";

export const GROUNDING_CONTRACT = "openpath-claim-grounding@1" as const;
export type SourceKind = "task-premise" | "derived-fact" | "student-assumption" | "free-literal";
export interface GroundingSource { kind: SourceKind; ref: string; by: "symbol" | "value"; /** explained by one arithmetic step from task premises, not a premise itself */ derived?: boolean; /** a value such as 0, 1, 2: it matches too many things to relate a claim to the task by itself */ trivial: boolean }
export interface Grounding { contract: typeof GROUNDING_CONTRACT; sources: GroundingSource[]; relevant: boolean; reason: string }

/**
 * Relevance of a derivation to the task. It is established by (a) a symbol bound to a task premise or to an earlier derived fact, or
 * (b) a non-trivial value that is exactly a task premise (up to sign) or exactly an earlier derived fact, or (c) at least two different
 * trivial values doing so. In every case NO non-trivial number may be left unexplained: a literal that comes from neither the premises (nor one arithmetic
 * step from two of them) nor an earlier derived fact is a free constant, and a calculation that depends on one is not shown to be about the task. A different method is never penalised: any route that starts from the premises or from something already
 * derived is relevant, whatever formula it uses.
 */
export function assessRelevance(sources: GroundingSource[]): Grounding {
  const linked = sources.filter((s) => s.kind !== "free-literal" && s.kind !== "student-assumption");
  const strong = linked.filter((s) => s.by === "symbol");
  const nontrivial = linked.filter((s) => s.by === "value" && !s.trivial && !s.derived); // a number explained by one step from two premises is explained, but it cannot by itself relate the calculation to the task
  const trivialDistinct = new Set(linked.filter((s) => s.by === "value" && s.trivial).map((s) => s.ref));
  const unexplained = sources.filter((s) => s.kind === "free-literal" && !s.trivial);
  const relevant = (strong.length > 0 || nontrivial.length > 0 || trivialDistinct.size >= 2) && unexplained.length === 0;
  const reason = linked.length && unexplained.length ? `the number${unexplained.length > 1 ? "s" : ""} ${[...new Set(unexplained.map((s) => s.ref))].slice(0, 4).join(", ")} come${unexplained.length > 1 ? "" : "s"} from neither the task data nor an earlier verified result`
    : relevant
    ? `grounded in ${[...new Set(linked.map((s) => `${s.kind}:${s.ref}`))].slice(0, 6).join(", ")}`
    : linked.length ? "only a single small value coincides with the task data, which does not relate the calculation to the task" : "no symbol or value of the calculation comes from the task premises or from an earlier derived fact";
  return { contract: GROUNDING_CONTRACT, sources, relevant, reason };
}

/** The grounded claim in the canonical IR: dependencies are the premises/derived facts it rests on, assumptions are the student-introduced ones. */
export function groundingToCanonical(claim: string, g: Grounding, assumptions: string[], verified: boolean): CanonicalMathematicalObject {
  return canonicalizeMathematicalObject({
    mathematicalType: "grounded-claim", value: claim,
    dependencies: [...new Set(g.sources.filter((s) => s.kind === "task-premise" || s.kind === "derived-fact").map((s) => `${s.kind}:${s.ref}`))].sort(),
    assumptions: [...new Set([...assumptions, ...g.sources.filter((s) => s.kind === "student-assumption").map((s) => s.ref)])].sort(),
    verificationStatus: verified && g.relevant ? "verified" : verified ? "conditional" : "unverified",
    outstandingObligations: g.relevant ? [] : ["relevance to the task is not established"],
  });
}
