# MATH_E7_ARCHITECTURE_AUDIT — Phase 1

Starting commit: `0f22913` (E6-R final report), branch `feat/math-generalization-core-e7`, worktree `/home/claude/e7`. No engine code changed in Phase 1. No merge, no deploy.
Method: execution traces (route-level, per-line, gate record) of the 4 required FA, contested s6-182, and 39+ further holdout #2 cases; ad-hoc probes; a route scan of 1725 natural-input cases (`audit/route-scan.json`). Earlier cluster diagnosis is treated as a hypothesis and revised below.

## 1. Pipeline and per-component audit

Flow: `assessMathematicalWorking` → `assessCandidate` (base route: natural-working parser + domain adapters | E5 route | E6 route) → `mergeE6` precedence → `applyAcceptanceGate` → proof-integrity `buildLineAccount`/`resolveVerdict`.

| Component | Responsibility | I/O | Typed? | Spans | Can drop math? | Own verdict? | Bypasses gate? | Assumptions/domains survive? | Family-specific? |
|---|---|---|---|---|---|---|---|---|---|
| Input parsing (natural-working.ts, e6 parsers) | text→relations | string→`NaturalRelation`/`Expr`, e6 `A`, `NAst` | partly; 3 ASTs | line-level only; no intra-line spans | Yes: unreadable comma-joined defs ("u=3x, du=dx/3") fail the line; claims after the first relation on a line are not enumerated | no | n/a | no | partly |
| Line classification | math vs prose | `isProse` word-count heuristic (e6-common) | string | line | **Yes**: any line with ≥2 non-math words is "prose", given `ok(...)` and fabricated evidence | effectively yes (valid) | yes (self-attested evidence) | no | no |
| Typed IR | problem schema | `domain/task/data/assumptions/restrictions/domainComponents` | yes (problem), strings (working) | n/a | n/a | no | n/a | restrictions typed; `domainComponents` read only by E6 | per-domain |
| Domain/assumption handling | restrictions, independence etc. | regex `readStatement` + per-family tables | strings | none | student statements recognised by regex; no provenance | no | n/a | **No**: module-global mutable `TASK_STATED` (e6-calc), conjunction of disjunctive components; E5 ignores both | yes; B1 `required(p)` vs E6 `needs` diverge (s6-229) |
| Rule discovery/planning | find rewrite justifying step | per kernel | mixed | line | no | yes | no | partial | yes (task registry) |
| Cross-domain binding | link quantities across domains | MathematicalBindingStore, canonical IR | typed | partial | only used by geometry/mixed; unused by E6 | no | E6 routes around | n/a | n/a |
| Verification kernels | decide a step | e6-cas (formal CAS+radicals), e6-series, e6-numbers (Gaussian-rational `Cx`, no radicals), B1/M1/M2 `Exact`, exact-e5, calculus-core | 6 numeric/symbolic towers | none | rejects ⇒ unsupported | yes | E6 Builder fabricates evidence | restrictions via global | yes |
| Verdict aggregation (`mergeE6`) | choose among routes | verdict enum ×3 | typed | none | n/a | **yes: first definite wins; permissive route wins when others abstain; legacy `invalid` can beat correct E6 `verified` and E6 `invalid` can beat legacy `ambiguous`** | n/a | no | no |
| Final gate (`applyAcceptanceGate`) | require per-claim evidence | BindingEvidence per claim-step line | typed | line | no | no | **is itself satisfied by E6 self-attestation**: checks evidence exists, not its provenance/independence | no | no |
| LineAccount/resolveVerdict | account every submitted line | role/status per line | typed | line | role "non-mathematical" defined but E6 only emits "claim-step" | aggregates | no | no | no |

## 2. Paths to "verified" without all claims checked (confirmed by execution)

1. **Prose skip with fabricated evidence** (e6-calc.ts:375, :855; e6-numbers.ts:441; Builder in e6-common.ts emits `outcome:"verified"` evidence for any `valid` judge). A false sentence is "preserved, not relied upon" yet counts as verified. Probes: "The limit of x^2 as x->2 equals 9." + correct final line → VERIFIED; "Recall that 1+1=3 …" → VERIFIED; "The derivative of x^2 is 3x." + f'(x)=2x → VERIFIED. Mechanism of s6-217, s6-226, s6-238.
2. **Label-agnostic answer claim** (e6-numbers): any line whose last member equals the truth value is the answer. "banana = 5/2" verified for a Vieta task.
3. **Back-solved unbound events**: "P(at least one head)=1−P(no head)=7/8" verified with no claim linking P(no head) to data (s6-182).
4. **Student-stated restrictions/assumptions accepted without provenance**: "Assume x>0." plus ln(x^2)=2ln(x) is VERIFIED even for a task restricted to x<0; ln(x^2)=2ln(−x) unflagged. Student assumption can override task domain. (Probe, this phase.) Likewise "To test independence we would need P(A∩B)=P(A)P(B)" correctly stays incomplete, but a bare product line yields missing-assumption: the regex distinguishes by phrasing, not semantics.
5. **Route precedence**: the most permissive route wins when others abstain: 344 verified cases are E6-only, **8 are FA (2.3%)**, versus 220 legacy-only verified with 1 FA (0.5%). Overall 11 raw FA in 1725 cases; 10 of 11 involve E6 as sole or co-verifier.
6. **Shared blind spot, not independence**: s6-299 (E5 and E6 both verified): E5 ignores `domainComponents`; E6 flattens components into a conjunction of stated facts. Agreement of two routes is not independent evidence. Same for e6-251.
7. **Self-attested evidence**: gate verifies evidence exists; E5 has `e5DestinationCheck`, E6 has none.
8. **Limit-path prose skip (e6-calc.ts:855)** — same mechanism as #1, probe above confirms.

## 3. Failure traces (required cases)

- **s6-217, 226, 238** (confirmed FA): false statement sentence classified prose → `ok` + forged evidence; E6 verified overrides base malformed/E5 unsupported. Pure classification/gate defect; no mathematics missing.
- **s6-299** (confirmed FA): domain-component disjunction flattened; E5 ignores it; both "verify".
- **s6-182** (contested): the claim "P(no head)=(1/2)^3" needs an event-name binding and independence of flips; engine back-solves it from the following number. Verified is unjustified under any reading (nothing was checked). Whether the right label is missing-assumption (independence not stated) or unsupported (event unbound) is a *contract* question and left open; I do not resolve it here. Phase 5 obligations make both representable.
- **Not FA but same family**: r6-194, r6-220 (adjudicators: engine verified correct), unaffected.

## 4. Revised taxonomy (from execution traces, 39+ cases)

| Class | Cases (examples) | Layer |
|---|---|---|
| A. Claim erasure by prose classification | s6-217/226/238, s6-087 | claim extraction / gate |
| B. Unbound/back-solved quantity accepted | s6-182, label-agnostic answers | obligations |
| C. Verdict-aggregation precedence | s6-034/048/053/340 (legacy `ambiguous` overridden by E6 `invalid`), s6-314, s6-027 (E5 invalid beats E6 verified/incomplete) | aggregator |
| D. Restrictions consumed by one route only | s6-314, s6-299 | proof context |
| E. Unresolved conflated with disproven | s6-004, s6-087 (later line "invalid" because earlier claim unresolved) | obligations/status |
| F. Unreadable composite lines | s6-062/075/116/068/155/186 (comma-joined definitions cascade to unbound u) | claim extraction |
| G. Number-tower duplication | s6-255/245/234 (Cx has no radicals; CAS does) | kernel/representation |
| H. Divergent assumption tables | s6-229 | proof context |
| I. Cross-domain unbound composition | s6-287/336 (density notation inside calculus task) | binding |
| J. Genuine kernel gaps | s6-292 (abs sign resolution), s6-316 (x|x| parse), s6-002 (positivity of x²+1), s6-096 (finalForm grammar), s6-193/200/215 (task-name registry) | kernel / schema |

Revision to the E6-R diagnosis: ambiguity failures are **not** a missing representation (legacy route was right); De Moivre/modulus failures are **not** missing mathematics (radical arithmetic exists in the CAS); C, E, A are verdict-contract/gate defects.

## 5. Reusable contracts

- `proof-integrity.ts LineAccount` (id, span, role incl. "non-mathematical", status): reuse as the claim record backbone; E6 must emit non-mathematical role explicitly with reason instead of `valid`.
- `mathematical-obligations.ts MathematicalObligation`: reuse for Phase 5 (already used by geometry/mixed).
- `canonical-math-ir.ts`, `MathematicalBindingStore`: reuse for typed objects and cross-domain binding.
- Kernels e6-cas, e6-series, exact-e5: keep; unify on e6-cas radicals rather than adding another tower.
- Gate `BindingEvidence`: keep structure, add provenance (kernel id, independent-of list, obligations discharged).

## 6. Bypasses requiring repair (priority)

1. Prose skip must produce a `non-mathematical` account with *no verification credit*, and may only be used when no equality/relation token or math term is present; relation-bearing sentences become claims.
2. Builder must not fabricate `verified` evidence for non-claims; evidence only from a kernel decision with a named checker.
3. Answer claim must be label-checked against the task's asked quantity or flagged unresolved.
4. Replace `TASK_STATED` global with an explicit immutable `ProofContext` carried through all routes, with assumption provenance; disjunctive `domainComponents`.
5. Aggregator with documented precedence: any route's evidence-backed `invalid` on a claim and any `ambiguous` are not silently overridden; agreement counts only across independent checkers.
6. Unresolved ≠ invalid.

## 7. Smallest viable architectural change

A single new layer, not new handlers, inserted between parsing and the gate:
(1) **ClaimLedger** (extends LineAccount): per source line, extract all claims (relations, assertions, definitions, assumptions), mark unresolved spans, no deletion allowed (property-tested);
(2) **ProofContext** (immutable, provenance-tagged) replacing `TASK_STATED`;
(3) **ObligationSet** per claim with proven/disproven/unresolved/unsupported using the existing MathematicalObligation type; kernels return obligations instead of `valid`;
(4) **Final aggregator** as the only producer of `verified`, consuming ledger+obligations; `mergeE6` becomes an input to it, not the decision.
Kernels, IR and routes stay as they are; routes stop producing final verdicts. Existing verdict contracts preserved by mapping.

## 8. Gate status

Reusable contracts, bypasses and the minimal change are identified. Open decisions for the product owner before Phase 2: (a) the s6-182 label (missing-assumption vs unsupported); (b) whether a relation-bearing sentence with no checkable form should yield `unsupported` or `incomplete`; (c) whether a student "Assume …" contradicting a task restriction should be `invalid`, `missing-assumption` or `ambiguous`. No implementation has begun.
