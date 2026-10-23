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
