# OpenPath Mathematics Engine — Initial Repository Audit

Audit date: 2026-10-23
Audit method: GitHub source inspection only. **No local tests executed.**
Source branch: `feat/expand-verified-teaching` (open PR #68), which is **not merged to main**.
Roadmap branch: `docs/mathematics-engine-roadmap`.
Audit status: **INITIAL / PARTIAL**. This does not satisfy the full K00-A inventory or K00 backend benchmark.

## Evidence-backed findings

| Area | Observed implementation | Status | Evidence | Required next action |
|---|---|---|---|---|
| Typed expressions | `MathExpr` supports numbers, variables, arithmetic operators, powers, fractions and quantities; `MathState` supports statements/constraints | PARTIAL / REUSE | `packages/learning/src/math-kernel.ts` | Audit expression parsing, domain restrictions, edge cases and round-trip semantics |
| Exact rational arithmetic | `Rational` normalizes fractions but uses JavaScript `number` numerators/denominators; large integer precision not guaranteed | PARTIAL / REPAIR | `packages/learning/src/math-kernel.ts` | Test integer overflow, decimal conversion, invalid inputs and choose exact numeric representation |
| Symbolic manipulation | Substitution, structural expression equality, constant folding and elementary simplification exist; source explicitly says not a complete CAS | PARTIAL / REUSE | `packages/learning/src/math-kernel.ts` | Enumerate actual rewrite rules and prove supported transformations |
| Question family contract | `Def` requires family-specific `prompt`, `solve`, `validate`, `variants`, `explain`, etc. | EXISTS / ARCHITECTURAL LIMITATION | `packages/learning/src/family-kit.ts` | Keep for launch compatibility; prohibit dependency in general synthesis acceptance |
| Question families | `fam/index.ts` imports core plus B01–B23; report counts 1,080 families | EXISTS / PARAMETERIZED | `packages/learning/src/fam/index.ts`, `packages/learning/COVERAGE-REPORT.md` | Audit generation pathways and measure per-new-concept authoring cost |
| Kernel adapter | Converts family-produced steps to kernel transformations; can use typed justifications or operation-based arithmetic checks | PARTIAL / REUSE | `packages/learning/src/kernel-adapter.ts` | Distinguish registry rule verification from independent numeric checks; test adversarial assumptions |
| Mathematical verification coverage | Branch report: 175 fully verified, 203 partial, 667 compatibility, 35 no problem generated; totals 1,080 | PARTIAL / REPORTED, NOT RERUN | `packages/learning/COVERAGE-REPORT.md` | Independently run coverage suite and inspect sample cases |
| Unverified operations | Report lists unsupported independent checks for operations including integrate, factorise, differentiate and solve | GAP | `packages/learning/COVERAGE-REPORT.md` | Implement/check reusable domain operations and independent verification |
| Teaching presentation | Kernel and compatibility teaching paths, typed visuals, worked examples and explicit unsupported state | EXISTS / PARTIAL | `packages/learning/src/teaching-presentation.ts` | Test pedagogical correctness separately from math correctness |
| General solution planner | No general strategy-selection search established in inspected source files | NOT VERIFIED | Inspected `math-kernel.ts`, `kernel-adapter.ts`, `family-kit.ts` | Repository-wide search, then executable unseen-problem benchmark |
| Constraint-driven synthesis | No evidence of a general constructor in inspected files; parameterized `Def` families are not equivalent | NOT VERIFIED | `family-kit.ts`, `fam/index.ts`, coverage report | Repository-wide search and frozen 20-spec synthesis benchmark |
| Automated test evidence | Coverage report states 358 tests passing and separately describes 2 pre-existing prerequisite failures | REPORTED ONLY | `packages/learning/COVERAGE-REPORT.md` | Run suites on pinned commit and record exact commands, output and failure scope |
| Curriculum | Curriculum inventory and learning graph exist on development branches | EXISTS / NOT FULLY AUDITED | `content/mathematics/curriculum.v1.json` | Audit alignment, verified coverage and prerequisites |
| Backend selection | No comparative TypeScript/SymPy/hybrid benchmark executed during this audit | NOT STARTED | K00 benchmark not yet run | Freeze benchmark then measure candidates |

## Findings that affect architecture
1. The existing kernel and typed justifications should be **reused where correct**, not blindly rebuilt.
2. The existing `Def.solve()` path produces solutions within manually authored families. This does **not** demonstrate an independent mathematical solver.
3. The existing parameter variation machinery does **not** demonstrate constraint-driven synthesis of new mathematical structures.
4. The coverage report distinguishes kernel-verified and compatibility teaching. These classifications must remain visible.
5. The audit is based on a **feature branch**; none of its capabilities should be assumed merged into `main`.
6. A repository-wide search, benchmark execution and independent tests are necessary before calling K00-A complete.

## Audit limitations
- Source files were inspected remotely; no code executed.
- The entire repository was not exhaustively inspected.
- The 358 passing tests and 1,080-family classification are **branch-reported**, not independently reproduced here.
- No claim of a completed K00 benchmark or backend choice is made.

## Immediate K00 next actions
1. Pin a source commit and perform a repository-wide inventory of math/solver/generator/verification paths.
2. Execute existing kernel, adapter, family and curriculum suites; attach command/log/commit.
3. Freeze 100 solver cases and 20 construction specifications.
4. Benchmark existing kernel, SymPy and hybrid; record accuracy, derivation, coverage and latency.
5. Review results and approve a backend decision before implementing K01.

## Follow-up inspection — 2026-10-23

Pinned audited feature-branch HEAD: `8121178c5d67536adfb6e8a38b7d9c4010970c61`. Remote Git tree returned 1,494 entries. This inspection reviewed additional relevant source files; it is **not** a complete line-by-line audit.

| Component | Additional finding | Classification | Evidence |
|---|---|---|---|
| Family specifications / approvals | `spec.ts` computes family release-pool fingerprints and checks deterministic item construction, answer validators, misconception options, difficulty and boundaries. Strong reusable governance; still invokes `Def.solve`. | REUSE; cannot establish general synthesis | `packages/learning/src/spec.ts` |
| General family engine | `families.ts` documents family-specific `solve`, `validate`, `bugs`, `variants`; individual families such as multiplication and rectangle area supply handwritten functions. | REUSE FOR LAUNCH; not general solver | `packages/learning/src/families.ts` |
| Learner diagnosis | `diagnostic.ts` implements six hypotheses, posterior updates and expected-information-gain selection; policy is explicitly draft and likelihoods uncalibrated. | REUSE WITH VALIDATION | `packages/learning/src/diagnostic.ts` |
| Prerequisite graph | `graph.ts` loads versioned math prerequisites and audit/reclassification; provisional competencies; edges steer recovery rather than block navigation. | REUSE WITH CURRICULUM AUDIT | `packages/learning/src/graph.ts` |
| Kernel acceptance tests | `kernel-acceptance.test.ts` exercises problem-to-rule-to-teaching pathways and examples with changed parameters. These tests demonstrate rule reuse, **not** autonomous planning. | EXISTING TESTS; RUN REQUIRED | `packages/learning/src/kernel-acceptance.test.ts` |
| Adversarial verification tests | `kernel-adversarial.test.ts` includes deliberately wrong arithmetic to reject false kernel-backed classification. | REUSE; RUN REQUIRED | `packages/learning/src/kernel-adversarial.test.ts` |
| Kernel unit tests | `math-kernel.test.ts` checks fraction reduction, arithmetic, expression operations and rule application. The inspected opening tests do not establish arbitrary-precision correctness. | EXISTING TESTS; EXPAND | `packages/learning/src/math-kernel.test.ts` |

### Environment and execution blocker

The GitHub connector supports remote file reads/writes but does not execute repository commands. An attempted `git ls-remote https://github.com/premsethutmc/openpath.git HEAD` in the working container failed with `Could not resolve host: github.com`. Therefore no clone, dependency installation, unit tests, benchmark executions or latency measurements could be completed in this environment. **Do not mark those tasks passed.**

### Additional audit conclusions

- The application already has **a deterministic review/fingerprint mechanism**, **a provisional diagnosis model**, and **a versioned prerequisite graph**. Building parallel substitutes would waste work.
- Existing tests are a useful starting point but **a passing kernel acceptance suite cannot prove a strategy-selecting solver or constraint-driven constructor**.
- The existing family validation is described as independent in source comments, but must be independently checked for mathematical correctness on representative cases; comments are not proof.
- Launch can continue using approved family-based content. General-engine acceptance must measure unseen structural generation without new family-specific solvers.

## Follow-up source inspection and TN5 unchecked-step evidence (2026-10-25)

Source feature branch pinned at `8121178c5d67536adfb6e8a38b7d9c4010970c61` (feat/expand-verified-teaching).

| Component | Finding | Evidence | Audit state |
|---|---|---|---|
| Family specifications | Deterministic release pools, specification fingerprints, validation probes and educator approval structure exist; each family still delegates to its own `solve` and `validate` | `packages/learning/src/spec.ts` | SOURCE REVIEWED; tests not run |
| Diagnostic engine | Six hypotheses (secure, conceptual, procedural, recall, prerequisite, transfer); information-gain question choice; at most three questions; priors and likelihoods explicitly draft, not calibrated | `packages/learning/src/diagnostic.ts` | SOURCE REVIEWED; pedagogical validity unverified |
| Competency graph | Typed prerequisite/support/disputed/alternative relationships and provisional competencies exist; relations guide recovery without gating navigation | `packages/learning/src/graph.ts` | SOURCE REVIEWED; graph validity not tested |
| Acceptance tests | Source contains mechanism tests for kernel rule application, adaptation and teaching; their existence is not execution evidence | `packages/learning/src/kernel-acceptance.test.ts` | SOURCE REVIEWED; not executed |
| TN5 unchecked-step report | User-provided `unchecked.md` states 54,299 unchecked steps, 197 family/step pairs across 138 of 192 families | User-supplied report, dated provenance not supplied | EXTERNAL REPORT; reproduction and denominator definitions pending |

### TN5 report: largest unchecked categories by family

| Family | Reported unchecked steps | Named unchecked operations |
|---|---:|---|
| aedec | 1,200 | place (800), add (400) |
| aapatn | 1,200 | continue, find place in part, find repeating part (400 each) |
| anpair | 1,200 | substitute, subtract, write (400 each) |
| acelhm | 1,196 | add (602), count on (594) |
| acelapsed | 1,052 | count on (652), read clock (400) |
| actrain | 993 | add (400), count on (386), subtract (207) |
| avlat | 956 | add (797), evaluate (159) |
| anquad | 900 | compare, factorise, write (300 each) |
| accmpx | 800 | compare (800) |
| acmoneymul | 800 | convert (800) |

The uploaded report enumerates 138 affected families and reports 54,299 steps. It does **not** supply a verified denominator of all steps in the TN5 bank, a reproducible generator seed/command, a source commit, or a definition proving that every unchecked step is mathematically incorrect. Do not interpret the unchecked count as a wrong-answer count or compute a percentage without the denominator.

### Updated audit conclusions
- Existing specifications and diagnosis infrastructure provide meaningful reuse opportunities; they do not replace an independent general solver or proof-producing constructor.
- TN5 is a concrete verification backlog. Group by **mathematical semantics** (comparisons, place value, unit conversion with dimensions, sequences, graphical reading, spatial reasoning), not by family ID.
- Distinguish arithmetic correctness from semantic correctness: a unit conversion needs source/target units, a comparison needs operands and ordering relation, and a visual-reading step needs the source representation.
- Do not promote a family from unchecked to verified solely because its step label matches an arithmetic operation.
- Before accepting TN5 coverage improvements, rerun the exact bank with pinned commit and seed; record total steps, checked steps, unchecked steps, invalid steps, and independent oracle outcomes.

### Still not completed
No local test run, no frozen 100-case benchmark, no frozen 20-spec synthesis benchmark, and no TypeScript/SymPy/hybrid comparison. K00-A remains **IN PROGRESS**, K00-B–E remain **NOT STARTED**.
