# Status

*Last updated 25 Oct 2026. Update this file at the end of every milestone, in the same PR. It is the first thing a
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
| Mathematics: Tamil Nadu Grade 5 verified bank | **Built, awaiting review and merge approval.** 61,343 released problems from 192 families; every step machine-checked (0 unchecked), rebuilt byte-identically; re-check found 0 wrong answers. Limits below. | PR #72 (draft), branch `feat/tn5-verified-bank`; scope in PR #71; numbers in `tools/mathematics/tn5-bank/README.md` |
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
| K05 | Solution planner (teacher-style steps, no per-family `solve()`) | **First version built, draft PR #75 (25 Oct), linear equations only.** Searches over general moves with no stored answers. Every equation in the in-scope sets (20 + 500 + 500 + 360) solved or correctly classified, every step checked by SymPy; all 991 provably invalid injected steps rejected. Not integrated with the Grade 5 pipeline, by decision. Quadratics, inequalities, systems and variable denominators are not done. Reference design: mathsteps (Apache-2.0, unmaintained). |
| K05.2 | Domain-aware reasoning for rational equations (restrictions kept through every step, extraneous candidates rejected) | **Proposal and frozen tests only, draft PR #76 (25 Oct).** No planner code. Tests: dev 206, eval 400, holdout 300, unsupported 112, 2,884 adversarial transitions, 400 claims, each checked by two independent oracles. Awaiting the owner's decisions in section 14 of `docs/milestones/DOMAIN_AWARE_REASONER.md`. |
| K06–K12 | Generator, difficulty, error analyzer, renderer, prerequisites, adaptive controller, integration | Not started. Hold until K05 passes. |

Stop rule from the board: if K04 cannot solve unseen equations, K06 cannot be declared complete; if K06 cannot
produce independently verified questions, adaptive teaching does not proceed. K06 proves generation within algebra
only. Geometry, trigonometry and calculus each need their own capability gates.

Known limits of the PR #69 trial: Compute Engine was built from GitHub source with a colour-library stub because
registries were blocked; install `@cortex-js/compute-engine@0.161.0` from npm and rerun before relying on it. Only
one-variable linear and quadratic equations were tested. School presentation rules (complex roots shown as "no real
solution", an identity as "every number works") belong to the planner and renderer, and are not decided.

## Tamil Nadu Grade 5 verified bank (PR #72): what is proven and what is not
Proven (committed results): 61 of 61 syllabus requirements map to a family; 61,343 items, all with every step checked
by an independent exact calculation (corrupting any stated value is never accepted: 244,200 attempts, none genuine);
byte-identical rebuild; at least 30 items per competency per difficulty band; re-census of all 342,052 problems shows 0
labelled worse than before; 500 injected wrong answers all rejected; 966 tests pass.
Not proven: (1) the final answer is independently re-derived from the question text for about 76% of a 14,775-item
sample (0 disagreements); 42 families (pictures, tables, conventions) cannot be, and 10% of items cannot be tied to
their step chain by the answer-consistency check. (2) 6,846 items rest on a picture's own data and 2,393 on a
convention (an estimate tolerance, the add/take-away/multiply/share codes, an object-size order); the owner accepted
these on 25 Oct to be fixed from real usage. Each check carries its basis in the code. (3) "Machine-verified" is a label
in the bank file, not yet wired into the app's status. (4) Simulated learners only; no real device, no real child.
Engine findings from the learner journeys: skills can reach "verified" only with two answer types, and the bank holds
only the typed form (155 of 192 families also have a multiple-choice form and 178 an everyday-situation form); a failed
delayed check cannot be cleared; two lucky answers can look like "shown on their own"; mastery needs reviewed content.

## Mathematical reasoner (PR #75, draft): what is proven and what is not
A small program that searches for solution paths with reusable moves instead of stored answers (milestone proposal: PR #74).

Proven, with SymPy as the independent checker: 20/20 smoke, 500/500 frozen, 500/500 on a fresh-seed holdout (493 genuinely new, 7 overlapping), 360/360 equations built from constraints (300 unique, 30 no-solution, 30 identity), and 30 contradictions and 10 identities in the edge set classified correctly. 1,000 deliberately corrupted steps: 991 provably invalid, all 991 rejected, none missed. Cancelling `x/x` is rejected; the planner refuses `(a*x)/x = c` rather than cancel silently.

Not proven: anything beyond one-unknown linear equations; invention of new kinds of move; the frozen 500 was tuned on once and the constructed set after its first run, so Holdout B is the cleaner evidence. Reproduce with `tools/mathematics/reasoner/run-e3.sh`; full report in `tools/mathematics/reasoner/REPORT.md` on the branch.

Decision in force: the reasoner stays separate from the Grade 5 release pipeline until its generality is established.

## Next step, awaiting approval
1. Merge decisions for PRs #69, #70, #71 and #72 (nothing merged or deployed).
2. Follow-up milestone, scope in `docs/milestones/MULTI_FORMAT_BANK.md` (proposal): add the multiple-choice and
   everyday-situation forms of the Grade 5 problems to the bank, fully verified, so skills can reach "verified".
3. K05 growth: review PR #75, then PR #76 (the domain-aware proposal with frozen tests) and answer its section 14. Quadratics after clearing denominators would be K05.3. Do not start D0 without approval.

## Open decisions for the owner
- Whether to merge the exact-arithmetic fix from PR #69 into `feat/expand-verified-teaching` (it fixes a comparison
  step that was reported as verified without being compared).
- ~~Which one grade and board first~~ Decided: Tamil Nadu Grade 5 (built, PR #72).
- How to fix the engine findings above (failed delayed check permanent, guessing, review fixture): a separate decision.
