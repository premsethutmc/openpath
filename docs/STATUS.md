# Status

*Last updated 24 Oct 2026. Update this file at the end of every milestone, in the same PR. It is the first thing a
new session reads, so keep it short and true. Remove lines that stop being true instead of adding "(old)".*

## How to read this
**Done** means merged or proven by committed test results. **In flight** is on a branch or PR and not approved.
**Next** needs the owner's approval of scope and acceptance tests before any code.

## Products and where their work lives

| Line of work | State | Where |
|---|---|---|
| English app, ages 10–15 (first intended product) | Feature expansion frozen. Goal: a trustworthy supervised demonstration of the consonant-doubling spelling journey. Content stays provisional until a human educator validates it. | `main`, `english/*` branches, `docs/english/` |
| Mathematics: curriculum content and teaching | 1,080 question families, Grades 1–12 for CBSE and Tamil Nadu Samacheer, JEE chapters. Only 175 families (16%) have every step checked by the kernel; 203 are partly checked; 667 rely on each family's own answer check. | `feat/expand-verified-teaching` (most recently updated, 22 Oct), `feat/universal-curriculum-journey-v1`. None of this is on `main` yet. |
| Mathematics: verified engine (this board) | Trial done, not merged. See below. | PR #69, branch `spike/oss-math-engine` |
| Tutor architecture | Orchestration layer over existing engine and planners. Proposal agreed in concept. | PR #42, `docs/autonomous-tutor-architecture` |
| Child-facing tutor UI | Codex's work. Do not touch. | `feat/autonomous-tutor-ux-v1` (named by the owner; not on GitHub when checked on 24 Oct) |
| OpenPath Kids (Chintoo, ages ~3–7) | Started 19 Oct. Independent of the mastery engine. | `feat/openpath-kids-chintoo` |
| Shopping game, animation, TNPSC | Paused. Existing work and PRs preserved (#2, #3 left open). | |
| Adaptive-learning research engine | Separate repository. Shadow-only. No merge, deploy or activation without approval. | `premsethutmc/openpath-research` |

## Mathematics engine board (K00–K12)
Components, inputs, outputs, acceptance tests and dependencies are in the owner's board. Thresholds are proposals.

| ID | Component | State |
|---|---|---|
| K00 | Existing-code inventory | Partly done: `packages/learning/COVERAGE-REPORT.md` and the audit in PR #69. A full per-family correctness audit is not done. |
| K01 | Object model | Typed expressions exist. No parser/serializer, no malformed-input tests. |
| K02 | Exact arithmetic | **Criterion met in the trial** (PR #69): 10,000 cases, 0 wrong against SymPy. The previous kernel gave 1,123 silent errors. |
| K03 | Symbolic manipulation | Basic folding only. No expand or factor yet. |
| K04 | Equation solver | **Criterion met in the trial** (PR #69): 1,000 unseen linear and quadratic equations, all correct, using CortexJS Compute Engine (MIT), checked by SymPy. |
| K05 | Solution planner (teacher-style steps, no per-family `solve()`) | **Next.** Not started. This is OpenPath's own core work. Reference design: mathsteps (Apache-2.0, unmaintained). |
| K06–K12 | Generator, difficulty, error analyzer, renderer, prerequisites, adaptive controller, integration | Not started. Hold until K05 passes. |

Stop rule from the board: if K04 cannot solve unseen equations, K06 cannot be declared complete; if K06 cannot
produce independently verified questions, adaptive teaching does not proceed. K06 proves generation within algebra
only. Geometry, trigonometry and calculus each need their own capability gates.

Known limits of the PR #69 trial: Compute Engine was built from GitHub source with a colour-library stub because
registries were blocked; install `@cortex-js/compute-engine@0.161.0` from npm and rerun before relying on it. Only
one-variable linear and quadratic equations were tested. School presentation rules (complex roots shown as "no real
solution", an identity as "every number works") belong to the planner and renderer, and are not decided.

## Next step, awaiting approval
K05: propose its scope and acceptance tests first (for example: 500 unseen problems, each derivation ordered, every
step checked by the kernel, no family-specific solver). Do not start code before approval.

## Open decisions for the owner
- Whether to merge the exact-arithmetic fix from PR #69 into `feat/expand-verified-teaching` (it fixes a comparison
  step that was reported as verified without being compared).
- Which one grade and board to make complete first (CBSE or Tamil Nadu Samacheer).
