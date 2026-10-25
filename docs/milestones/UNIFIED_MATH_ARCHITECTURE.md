# R2 proposal: one mathematical reasoning architecture (draft, no implementation)

Status: proposal for owner review. Implementation is **not** started and not authorised. Companion: `R2_ACCEPTANCE_SPEC.md` (acceptance tests, to be frozen with the datasets in `tools/mathematics/r2/` before any R2 code), and the audit in PR #78 (`tools/mathematics/audit/AUDIT.md`). Numbers labelled **measured** come from the repository at the audit branch; numbers labelled **estimate** are not measured.

## 1. Existing architecture and deficiencies

Two reasoning systems sit side by side (measured, audit PR #78):

| | K05.1 (PR #75) | K05.2 (PR #77) |
|---|---|---|
| State | `Eq {left,right}` | kernel `MathState` + `DomainState` side data |
| Rules | 7 move labels inside `movesFrom` (no registry) | 11 rules in a local `DEFS` map adapted to kernel `MathRule` |
| Discovery | one function enumerates moves | `movesOf` enumerates (rule, params) pairs by hand, one `if (rational)` switch |
| Search | BFS in `plan()` | BFS in `solve()` (copy) |
| Verification | SymPy, offline | per-rule `checkTransition` (same code as the checker) |
| Production lines | 352 core (+141 generator) | 739 core |

Deficiencies, each tied to evidence:
1. **No shared rule layer.** The kernel registry has `register/get/applyRule/listRules` only; `appliesTo` is never read; its `MathRule` cannot express equivalence vs implication or obligations, so K05.2 keeps those in a side map. The 14 kernel default rules are unused by the reasoners; `algebra.divide-both-sides` takes a JS number and has no domain notion.
2. **No shared state.** `Eq` vs `MathState`+`DomainState`; the kernel type has a `relation` field the reasoners never read; constraints exist (`nonzero`, `positive`) but only `nonzero` is used.
3. **Duplicated mathematics.** Two BFS loops, three equation printers, two term flatteners, two "is this a polynomial" recognisers, two unsupported-input detectors, kernel rules re-implemented.
4. **Search is not load-bearing.** A fixed pipeline over the same rules scores 100% on all frozen sets and on the independent supported cases (ablation, PR #78). Search matters only in the linear sub-planner.
5. **Verification shares assumptions** with what it checks (R1 addresses this with an independent verifier; R2 makes that structural).
6. **Rule order is encoded in the engine**, not in the rules or the goal: the only goal is "solve".

## 2. Proposed architecture

Six layers; each only depends on the ones above it in this list.

```
L0 exact core      Rational, Expr (kernel), Poly/RatFun (univariate now; multivariate later)
L1 state           Variables+domains, Relations, Assumptions, SolutionSet, Goal, Obligations
L2 rules           Rule contract + Registry with discovery; Capabilities are coarse rules
L3 verifier        independent implementation of "is after a legitimate consequence/equivalent of before"
L4 planner         goal-directed search over discovered applications, plus eager "confluent" rules
L5 trace           deterministic record: rule, params, certificate, verdict, state hash
```
Dependency rule: L4 and L2 never import L3's internals; L3 imports L0 only (and keeps its own parser and polynomial code, an *intentional* exception to the no-duplication rule, enforced by an import-graph test).

What changes in practice: the planner stops knowing about "rational" vs "linear"; the registry tells it which rules apply to the current state; the goal tells it when to stop.

## 3. Mathematical state specification (L1)

General representation (domain-neutral):

```ts
interface Variable    { name: string; domain: "R" | "Q" | "Z" | "N" | { interval: Interval } }
interface Relation    { op: "=" | "<" | ">" | "<=" | ">=" | "!="; left: Expr; right: Expr }
interface Assumption  { kind: "nonzero" | "positive" | "nonnegative" | "integer" | "in"; expr: Expr; origin: "written" | "derived"; because?: ObligationId }
interface SolutionSet = Finite{values} | Intervals{pieces} | AllExcept{values} | Empty        // exact, closed under equality/subset
interface State {
  expressions: Map<string, Expr>;              // named, includes the frozen original
  relations: Relation[];                       // current statements (equation, inequality, system rows)
  variables: Variable[];
  assumptions: Assumption[];                   // restrictions only grow; original ones are tagged and cannot be removed
  candidates: Candidate[];                     // values proposed by steps, with status
  solutions?: SolutionSet;                     // final, only after the goal is met
  goal: Goal;
  obligations: Obligation[];                   // open and discharged proof obligations
}
interface Goal       { kind: "solve" | "reach-form" | "prove-equivalent"; target: Variable[] | FormId | State }
interface Obligation { id: string; claim: string; status: "open" | "discharged" | "failed"; certificate?: unknown; checkedBy?: string }
```
Domain-specific extensions plug in as *registered facts*, not new state types: a capability may register its own `Form` predicates (e.g. `CLEARED`, `EXPANDED_POLY`) and its own `SolutionSet` pieces. Today's `DomainState` becomes: `assumptions` (restrictions), `candidates`, `obligations` (evidence). `relations[0]` with `op "="` reproduces the current statement; the `relation` field of the kernel type finally becomes meaningful.

Invariants carried over and made generic: (I1) assumptions only grow; (I2) every condition under which a written subexpression is defined is an assumption (closure); (I3) original assumptions are retained; (I4) a value is a solution only after exact substitution into the original relation, with both sides defined and the value inside the assumptions.

## 4. Rule and verifier contracts (L2, L3)

```ts
interface Rule {
  id: string; tags: string[];                                  // e.g. "equation", "has-denominator", "linear"; used for indexing, not for family knowledge
  match(s: State): Application[];                              // discovery: concrete applications with parameters; no question-family knowledge
  requires(a: Application, s: State): Obligation[];            // assumptions it needs (e.g. divisor non-zero on the domain)
  apply(a: Application, s: State): State;
  effect: "equivalence" | "implication" | "equivalence-on-assumptions";   // last: equivalent only under the listed obligations
  introduces(a: Application, s: State): Assumption[];           // new restrictions
  certificate(a: Application, s: State, t: State): unknown;    // data letting the verifier check without re-running apply
  confluent?: boolean;                                          // applying it never hurts (tidying); the planner may apply it eagerly
}
interface Verifier { check(before: State, after: State, effect: Effect, cert?: unknown, original?: State): Verdict }   // independent implementation
```
Certificates are proof-carrying where cheap: a cancellation certificate is the factor g with `n = g n'`, `d = g d'` and the evidence that g's zeros are assumptions; the verifier checks by multiplying out, not by re-running cancellation. A step with no certificate is checked by the verifier's own solution-set algebra (R1's `verifier.ts`).

**Capabilities.** An efficient algorithm (e.g. "clear denominators", "solve a linear equation") is registered as a Rule whose application is coarse. It must carry the same contract and the verifier checks its *net* effect, so macro steps are inspectable and independently verified. A capability declares a `scope` predicate; outside it the registry does not offer it, which is where refusals come from (structured outcome codes from R1).

**Contract tests per rule** (generic, run for every registered rule): applicability is deterministic; `apply` output passes the verifier for its declared effect on 200 generated applications; no rule mentions a question family (static check: no import of a generator); `introduces` is a superset of closure violations.

## 5. Planner design (L4)

1. Read the state and goal.
2. Apply eagerly all `confluent` rules until none applies (this replaces K05.1's hard-coded "simplify when applicable is the only move" and "remove brackets first").
3. If the goal predicate holds, finish.
4. `registry.discover(state)` returns applications of non-confluent rules (via `tags` index then `match`).
5. Generate successors; drop those failing `requires` (they stay listed as *refused moves* with the failed obligation, for the trace).
6. Verify every successor with the independent verifier before it enters the frontier; a failed verification is recorded and never expanded (it also counts as a test failure of the rule).
7. Select by best-first search with a declared heuristic (size measure + goal distance given by the goal's `distance(state)` if provided); ties broken by rule id then parameter text, so runs are deterministic. Budgets: depth, nodes, wall-clock; exhausting them yields `SEARCH_LIMIT`, not a wrong answer.
8. Goal detection by the goal predicate (`SOLVE` ends in an exact substitution check for candidates).
9. Emit the trace.

No mandate for brute force: a capability that solves the whole goal in one coarse verified step is allowed and preferred when applicable (cost 1). Search is justified only where the ablation (section 7) shows it contributes.

## 6. Migration plan and inventory

| Component (measured lines) | Fate | Notes |
|---|---|---|
| `math-kernel.ts` `Rational`, `Expr`, `evaluate` (part of 1,325) | Retained unchanged | L0 |
| Kernel `MathState`, `RuleRegistry` | Extended | add assumptions/goal/obligations; add `discover` + effect fields; backward compatible for existing kernel tests |
| Kernel default rules (14) | Keep for K02-style arithmetic only; `algebra.*-both-sides` replaced | they use JS numbers; replaced by exact generic rules |
| `expr-text.ts` (83) | Retained | single parser/printer for the engine |
| `poly.ts` (193) | Retained | L0 algebra core |
| `domain-state.ts` (144) | Split | restriction extraction (R1 general) to L1; `SolSet`/`checkTransition` retired from production, kept as a differential cross-check in tests |
| `domain-rules.ts` (251) | Unified | 11 rules re-registered with `match`/`requires`/`certificate`; `DEFS` side map removed |
| `domain-engine.ts` (140) | Replaced | by L4 planner + `SOLVE` goal; `gate` becomes capability scope predicates |
| `planner.ts` (269) | Rules ported, loop deleted | ~7 rules; forced policies become `confluent` flags; second BFS deleted |
| R1 `verifier.ts` (~330) | Becomes L3 | stays independent by design |
| `construct.ts` (141), Python generators/oracles | Retained unchanged | tooling, not engine |

Duplicated logic removed (measured count to be re-measured at S2): 1 BFS loop, 2 equation printers, 1 term flattener, 1 polynomial recogniser, 1 unsupported-input detector, the kernel both-sides rules.
Remains domain-specific: the rule *bodies* (cancel, clear, combine, linear steps), goal predicates (`CLEARED`, ...), scope predicates, generators.
New abstractions: State v2 fields, Goal+Form predicates, Obligation/certificate, `Rule.match/requires/effect/introduces`, Capability scope, discovery index, planner heuristics, trace schema.
Expected production-code change (**estimate**): +500 to +700 lines of new framework (state v2, registry discovery, planner, trace), -250 to -350 lines of removed duplication, rule ports roughly line-neutral; net +250 to +400 lines up front, repaid only if the marginal cost below materialises.
Migration risks: (1) behaviour drift in K05.1/K05.2 frozen results (mitigated by running both frozen suites unchanged at every stage); (2) discovery overhead; (3) over-abstraction; (4) certificate design that is too heavy for simple steps (mitigation: certificate optional, verifier algebra as fallback).

## 7. Acceptance tests and ablations

See `R2_ACCEPTANCE_SPEC.md` (frozen separately). Summary: Dataset A (composition, tasks scrambled from known goals with order, local-trap, complexity-up, restriction-gate and goal-variety families, plus provably unreachable tasks), B (reuse pairs), C (limits), a separate tuning split; baselines P1 (fixed pipeline), P2 (goal-specific fixed pipelines tuned on the split), P3 (uninformed BFS), P4 (greedy). The claim "search adds capability" is allowed only if the unified planner beats the best fixed pipeline by >= 20 percentage points on Dataset A and visits at most half the states of uninformed BFS; otherwise the report withdraws it and the design simplifies to a registry of verified procedures. Architecture tests are reported separately from mathematical-correctness tests.

## 8. Reuse and complexity budget (measurable)

| Budget item | Target | How measured |
|---|---|---|
| Duplicated mathematical helpers in engine (outside verifier) | 0 | script comparing normalised function bodies/exports |
| Search loops / registries / parsers in the engine | 1 / 1 / 1 | import-graph test |
| Lines to add a rule (median, excluding tests) | <= 60 | git diff on the dummy-capability exercise and the 18 ported rules |
| Files touched to add a rule | rule file + test + 1 registration line | architecture test 9 (planner, state, registry unchanged) |
| Engine production lines after porting both domains | <= 1,500 (now 1,091 core + ~330 verifier = 1,421) | `wc` on the listed files |
| Frozen suites | K05.1 and K05.2 results identical | existing runners |
| Cost of the next real capability (**estimate**, to be measured in S5 only through the dummy exercise) | 250-400 lines vs 700-900 now | not a measured fact until a real domain is built |

The purpose is lower marginal cost, not a bigger framework: if the framework exceeds 700 lines or the dummy-capability exercise needs a planner change, the stage gate fails.

## 9. Implementation stages and review gates

| Stage | Content | Gate (stop if not met) |
|---|---|---|
| S0 | This proposal, frozen datasets A/B/C/tuning with hashes, baselines implemented as scripts | Owner approval; datasets verified by an independent reference; baselines reproduce the stated numbers |
| S1 | State v2, `Rule` contract, registry `discover`, verifier wiring (no domain change) | Kernel tests pass; framework <= 700 lines; generic rule-contract tests exist |
| S2 | Port K05.1 moves; one search loop | K05.1 frozen suites byte-identical results; 0 duplicates in that area |
| S3 | Port K05.2 rules, gate to scopes, retire `checkTransition` from production | K05.2 frozen suites identical; verifier 100% on adversarial/claims; R1 regression green |
| S4 | Goal-directed planner, heuristics, trace schema | Reproducible traces; no crash; limits report |
| S5 | Composition benchmark, ablation, dummy-capability exercise | Architecture tests 1-9; or the claim in section 7 withdrawn |
| S6 | Report, status, draft PR | Owner review; no new domain without approval |

## 10. Risks and unresolved design decisions

Risks: framework larger than the benefit (budget gate S1); `match` returning too many applications for broader domains (index by tags, cap per rule); verifier independence is partial because author and specification are shared (mitigation: external textbook set, third CAS cross-check); goal predicates and scope predicates remain domain-specific work; univariate `Poly` blocks systems of equations; sign analysis is absent for inequalities (new `SolutionSet` pieces and a sign prover, outside R2).

Decisions for the owner: (1) accept 20 pp / 0.5x thresholds for the search claim, or set others; (2) keep macro capabilities allowed in the planner (recommended), or primitives only; (3) retire kernel `algebra.*-both-sides` rules; (4) require a second-language independent verifier (Python) in addition to the TS one; (5) which capability follows R2 (the proposal deliberately does not pick); (6) whether the budget caps (framework <= 700 lines, rule median <= 60) are right.

## Answers to the two R2 questions

Does the architecture replace the duplicated systems? Yes by design: one state, one registry, one verifier contract, one search loop; K05.1 and K05.2 become sets of registered rules and capabilities. That is a claim until S2/S3 gates pass with unchanged frozen results.
How do rules compose? A rule never mentions a problem family: it declares applicability and required assumptions; the planner composes applications toward the goal and the verifier checks each step (or each coarse capability's net effect). Composition is demonstrated only if the S5 ablation clears the thresholds in section 7.
