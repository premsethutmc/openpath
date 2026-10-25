# OpenPath — Mathematics Engine Development Roadmap

Status: PROPOSED / NOT IMPLEMENTED
Branch: docs/mathematics-engine-roadmap
Scope: Grade 1 through IIT-JEE Advanced; capabilities must be earned domain by domain.
Governance: No merge or deployment without Prem's explicit approval.

## Product objective
Create a reusable system that **constructs mathematical problems from constraints, solves them, independently verifies them, teaches the underlying reasoning, diagnoses mistakes, and adapts practice**. Do not expand the existing catalogue of independently coded question families as a substitute for general mathematical capabilities.

## Mandatory engineering rules
1. Audit existing code before writing replacements. Reuse the TypeScript math kernel, family interfaces, teaching adapters, prerequisite graph, evidence ledger and curriculum infrastructure where suitable.
2. Every work item has an owner, input/output contract, source commit, tests, results, limitations and acceptance evidence.
3. No family-specific solve() or prompt-template dependency in the **general generator acceptance path**. Domain-specific algorithms and declarative construction rules are permitted and must be measured.
4. A generated answer or teaching step must never be presented as verified without independent mathematical checks and documented assumptions.
5. Unsupported mathematics must fail explicitly. Record capability boundaries.
6. Freeze benchmarks before comparing approaches; never tune on hidden holdouts.
7. Do not merge or deploy without explicit owner approval.

## Stage-gated work breakdown

| ID | Component | Concrete deliverable | Measurable gate | Dependency |
|---|---|---|---|---|
| K00-A | Repository audit | Inventory all kernel rules, symbolic operations, generators, solvers, verifiers, adapters and known failures, each with file/commit references | Every existing relevant component classified reuse/repair/replace/missing, with evidence | None |
| K00-B | Locked solver benchmark | 100 unseen cases: exact arithmetic, linear/quadratic equations, symbolic algebra, introductory calculus, including assumptions and expected derivations | Benchmark fixed and versioned before running candidates | K00-A |
| K00-C | Backend comparison | Existing TypeScript kernel vs SymPy vs hybrid, same machine, inputs and scoring | Report correctness, verified derivations, supported-case coverage, latency p50/p95, integration effort and failure cases | K00-B |
| K00-D | Synthesis feasibility | 20 frozen constraint specifications across arithmetic, algebra and introductory calculus | For each candidate: report valid-generation rate, diversity, reproducibility, independent verification and added handwritten code | K00-B |
| K00-E | Architecture decision | Signed decision record and reproducible benchmark artifacts | Explicit approval before K01; no backend chosen by assertion | K00-C,D |
| K01 | Typed mathematical representation | Exact AST/IR with operators, equations, relations, domains, assumptions, variables, sets and canonical serialization | 500 valid round-trip tests and 100 malformed-input rejection tests; zero semantic changes | K00-E |
| K02 | Exact arithmetic | Integers, rationals, powers, radicals and complex numbers as supported | 10,000 randomized reference-oracle checks; zero incorrect accepted results | K01 |
| K03 | Symbolic transformations | Reusable rewrite operations, preconditions, assumption propagation and transformation certificates | 1,000 independently checked expansion, factoring, substitution and simplification cases; zero invalid accepted steps | K02 |
| K04 | Domain solvers v1 | Linear and quadratic equations with explicit domain restrictions and complete solution sets | >=99% success on 1,000 frozen supported cases; zero incorrect accepted solutions; no family-specific solve() calls | K03 |
| K05 | Derivation planner | Search/heuristics selecting valid transformation sequences, preserving proof/step provenance | 500 unseen supported problems with verified ordered steps, zero invalid displayed steps, documented failures/timeouts | K04 |
| K06 | Constraint-based constructor | Construct mathematical objects from topic, concepts, constraints, difficulty and seed; solve and independently verify | 1,000 distinct accepted problems across frozen specs; 100% verified accepted outputs; seed reproducibility; zero new question-specific templates | K05 |
| K07 | Difficulty model | Deterministic features for depth, operations, representations, case splits and prerequisites | >=95% compliance with predefined structural bands; calibration explicitly marked unvalidated until learner data exists | K06 |
| K08 | Misconception diagnosis | Map wrong steps and valid alternatives to mathematical misconceptions with confidence/unknown states | >=90% accuracy on frozen 200-case expert-labelled set; zero valid alternatives marked mathematically wrong | K05 |
| K09 | Teaching derivation renderer | Verified steps -> worked examples, diagrams where supported, multiple explanations | 200 example reviews; zero mathematically incorrect or missing required steps; unsupported visuals fail explicitly | K05 |
| K10 | Curriculum/competency alignment | Map board requirements and prerequisite DAG to declared engine capabilities | 100 sampled target paths valid; zero cycles/dangling references; unsupported items visible, not fabricated | K00-A,K06 |
| K11 | Adaptive controller | Choose explanation, practice, remediation and delayed reassessment using existing evidence ledger | 30 scripted learner journeys pass with reproducible decisions | K07-K10 |
| K12 | Learner UI integration | Connect engine to existing OpenPath teaching-first curriculum and learner dashboard | 20 browser journeys covering Grades 1,5,8,10,12 and JEE where supported; zero critical failures | K11 |

These are **proposed targets**, not achieved results. Test suites should include adversarial and out-of-domain cases; the system must not count explicit unsupported outcomes as successful solutions.

## Incremental domain expansion
After Algebra v1 passes K01-K06, add domain packs, each with (a) formal object/assumption model, (b) operations/solver, (c) independent checker, (d) constraint synthesizer, (e) derivation/teaching adapter, and (f) frozen domain benchmark.

Suggested order, subject to K00 evidence:
1. Arithmetic and elementary algebra: integers, fractions, linear equations, quadratics.
2. Functions, sequences/series, inequalities, polynomials, matrices, complex numbers.
3. Coordinate geometry and trigonometry.
4. Limits, derivatives and applications.
5. Integration, differential equations, vectors and 3D geometry.
6. Combinatorics, probability, advanced inequalities and mixed IIT-JEE Advanced problems.

A domain is not declared supported until its generation, solving, checking and teaching gates pass. Cross-domain synthesis is a separate milestone; successful single-domain synthesis does not prove it.

## Generator contract (conceptual)
Input: `{topic, targetConcepts, difficulty, constraints, seed, assumptions}`.
Output: structured mathematical problem, complete solution set, verified derivation/certificates, difficulty features, prerequisite tags, student-facing rendering, capability/version provenance, or explicit unsupported/failure.

## First demonstration: K00-K06
Show, in a repeatable CLI/test harness, that the engine:
- Accepts frozen constraint specifications rather than question-specific templates.
- Constructs new linear/quadratic mathematical problems with different seeds.
- Solves them without calling a family-specific solver.
- Checks each transformation and complete answer independently.
- Returns exactly the same results for the same seed/version.
- Rejects impossible constraints and unsupported domains explicitly.
- Reports code added per new constraint specification, so the old authoring bottleneck cannot be hidden.

## Project board protocol
Each issue must contain: ID, scope, input/output contract, dependencies, tests and thresholds, evidence link, blocker, status (NOT STARTED / IN PROGRESS / BLOCKED / PASSED / FAILED), reviewer decision. Every coding-agent handoff cites the current board and source commit. No status can be changed to PASSED on self-reported counts alone; attach reproducible logs and sample outputs.

## Stop conditions
- K00 not approved: no new engine implementation.
- K04 fails unseen solving: no claim of general solving.
- K06 fails template-free construction: no expansion of question families as a workaround.
- Verification cannot certify an output: never show it as verified.
- No owner approval: no merge or deployment.


## Live execution status — audit snapshot 2026-10-23

The status below tracks **actual evidence**, not completion claims. See [initial audit](MATHEMATICS-ENGINE-AUDIT.md). The audited implementation is on an unmerged feature branch; tests have not been independently rerun.

| Work item | Status | What happened / evidence | Next action |
|---|---|---|---|
| K00-A Repository audit | IN PROGRESS | Inspected kernel, adapter, family contract, family registry, teaching presentation and coverage report; documented findings | Complete repository-wide inventory and execute tests |
| K00-B Locked 100-problem benchmark | NOT STARTED | No benchmark cases frozen | Define and freeze cases and expected outcomes |
| K00-C Backend comparison | NOT STARTED | No comparative run | Execute TypeScript, SymPy and hybrid after K00-B |
| K00-D 20-spec synthesis feasibility | NOT STARTED | No frozen synthesis benchmark | Define constraints and measure generated outputs |
| K00-E Architecture decision | BLOCKED | Requires K00-C and K00-D evidence and owner review | Await benchmarks |
| K01 Mathematical representation | NOT STARTED (existing partial capability) | Existing AST and rational type identified, not acceptance-tested | Decide reuse/repair after K00 |
| K02 Exact arithmetic | NOT STARTED (existing partial capability) | JS-number-based Rational found; no large-number validation | Execute reference-oracle checks after K00 |
| K03 Symbolic transformations | NOT STARTED (existing partial capability) | Existing simplification/substitution found; no acceptance run | Audit and test rules |
| K04 General solver | NOT VERIFIED | Existing family-specific solve contract; no general solver demonstrated | Repository-wide search and unseen benchmark |
| K05 Derivation planner | NOT VERIFIED | Existing step adapters do not establish independent planning | Search and demonstrate planner |
| K06 Constraint constructor | NOT VERIFIED | Parameterized families identified, general synthesis unproven | Run 20-spec benchmark |
| K07 Difficulty model | NOT STARTED | No new-engine evidence | Wait for K06 |
| K08 Misconception diagnosis | NOT STARTED (existing related systems) | Not audited against new-engine contract | Audit after K05 |
| K09 Teaching renderer | NOT STARTED (existing partial capability) | Existing teaching presentation inspected | Validate against verified derivations |
| K10 Curriculum alignment | NOT STARTED (existing inventory) | Curriculum file identified; completeness unverified | Audit curriculum coverage |
| K11 Adaptive controller | NOT STARTED (existing related systems) | Not audited against new-engine contract | Audit existing evidence and planner |
| K12 Learner integration | NOT STARTED (existing UI) | No new-engine integration performed | Wait for upstream gates |

**Update rule:** Every subsequent change must update this table with date, pinned commit, executed tests, observed result, blocker and next action. A status of PASSED requires reproducible evidence. No merge or deployment without explicit approval.


### Audit update — 2026-10-25

| Work item | Status | New evidence | Next action |
|---|---|---|---|
| K00-A | IN PROGRESS | Inspected `spec.ts`, `diagnostic.ts`, `graph.ts`, `kernel-acceptance.test.ts` at `8121178c`; incorporated user-provided TN5 unchecked report: 54,299 unchecked steps across 138/192 families | Full code inventory, run tests, reproduce TN5 bank and establish total-step denominator |
| K00-B | NOT STARTED | No frozen benchmark | Freeze 100 cases |
| K00-C | NOT STARTED | No comparative executions | Run three backends |
| K00-D | NOT STARTED | No frozen constraint specs | Freeze 20 specs |
| K00-E | BLOCKED | K00-C/D absent | Owner approval after evidence |

Detailed findings: [Mathematics Engine Audit](MATHEMATICS-ENGINE-AUDIT.md). No code merges or deployments.
