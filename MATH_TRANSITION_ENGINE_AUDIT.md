# Mathematical transition engine — architecture audit (Agent 3)

Branch `feat/math-transition-sympy-evaluation`, baseline `837c79cc8d7b1effa06b8553960322af7ec3f88b` (head of `feat/math-generalization-core-e7`). Read-only audit of code; reports are cited only where they disagree with code. `L/` = `packages/learning/src/`. Line numbers are approximate on the long single-line files (`natural-working.ts`).

## 1. Headline facts

1. **Two engines, only one is student-facing.** Students reach `assessAnswerFirst` (`L/answer-first.ts:39`) → `independent-checker.ts` (browser: `frontend/src/year/Learn.tsx` → `L/grade.ts` → `L/assessment.ts:84`; server: `backend/family/learning.py` → `kernel_grader.py` → `node grader.mjs` → `L/server-grader.ts`). The E7 unified engine `assessMathematicalWorking` (`L/unified-math-engine.ts:598`) is **experimental**: imported only by tests and `tools/**`, absent from the sha-pinned grader manifest. The E7 holdout measures the experimental engine.
2. **No Python or SymPy on any student-facing path.** The only TS→Python bridge is `L/geometry-worker.ts:16` (`spawn python3 -m geometry_reasoner.worker`, NDJSON, RLIMIT_AS 512 MB), reached only from the unified engine. The geometry prover uses `fractions`, not SymPy.
3. **Most E7 rejections happen before any mathematics runs.** `L/natural-working.ts` refuses `:`, `±` outside a solved form, chained inequalities, comma lists of values, `x≠a and x≠b`, prose after a comma; one unreadable line makes the whole submission `malformed` (`unified-math-engine.ts:301`) or `unsupported` (`proof-integrity.ts:151-166`), and every line after the first unresolved one is `inconclusive` (`independent-checker.ts:1049`).
4. **The planner is not used to judge student work.** `core/working-assessment.ts:87` calls `evaluateWorking(..., { engine: false })`; step judging is pairwise verification. Planner search failure therefore cannot cause a false rejection.
5. **Named files**: `tools/mathematics/grading-audit/oracle/oracle.py` and `mathtext.py` do **not** exist on this branch; they exist only on `feat/math-answer-key-certification` (`50a2dc9`). `MATH_TYPED_KERNEL_INTEGRATION_REPORT.md` likewise exists only there. `MATH_COVERAGE_AUDIT_REPORT.md` exists here.

## 2. Components

| Component | File(s) | What it is | Status |
|---|---|---|---|
| Kernel state + elementary rules | `L/math-kernel.ts` (`MathExpr`, `MathState`, `Rational` bigint; `MathRule`/`RuleRegistry` `:523,554`; 13 rules `:1296`) | arithmetic/equation rule kernel | used by core + typed kernels |
| Core rule library | `L/core/rule.ts:34-76`, `L/core/rules.ts:59-243` (14 rules: restrict, collect, expand, ±both sides, ×÷both sides, clear-denominators (implication), cancel-common-factor, accept-candidate …) | rule contract: `match/checks/apply/verify`, `effect: equivalence|implication`, `introduces: candidate-check` | planner/tests |
| Domain state | `L/reasoner/domain/domain-state.ts` (restrictions from denominators, `checkTransition` violations) | single variable `x`, integer exponents ≤ 12 | core |
| Independent algebra checker | `L/independent-checker.ts` (`profile`/`relate` exact solution sets on Q and Q(√d), intervals, `|·|`, one radicand, linear systems ≤ 6 vars, U4 identity certificates) | **the mathematical kernel behind answer-first** | student-facing |
| Natural parser | `L/natural-working.ts` | hand-written tokenizer/parser → `NaturalRelation` | student-facing |
| Unified engine | `L/unified-math-engine.ts` → `collectReports` → acceptance gate (`acceptance-gate.ts`) → `certifyClaims` (`claim-certifier.ts`, `proof-obligations.ts`) → `certification-authority.ts:adjudicate` | E1–E7 multi-route certification | experimental |
| Calculus | `calculus-core.ts` (typed; "no numerical sampling as proof"), `calculus-methods.ts`, `calculus-binder-e5.ts`, `e6-cas.ts`, `e6-series.ts` | derivatives, integrals, rational-function limits, truncated series | experimental (unified engine) |
| Geometry | `geometry-binder-e5.ts` (TS angle/coordinate binder) + `research/geometry-reasoner` (Python synthetic prover) | angle chasing, congruence table, coordinates | experimental |
| Other domains | `domains-m1.ts`, `domains-m2.ts`, `probability-statistics.ts`, `linear-algebra*.ts`, `complex-*.ts`, `e6-numbers.ts` | typed step kernels; natural text needs an adapter (`natural-domain-adapters.ts:104`, else "no lossless natural adapter") | typed contracts student-facing via `typed-contract.ts`; natural adapters experimental |
| Planner | `L/core/planner.ts` (BFS, dedupe, eager pruning; `searchBest` weighted best-first), strategies `core/solve.ts:16-20` (linear 24/100k, rational 14/3k), budget `core/budget.ts:5` (3M ops) | solution search | tests/tools only |
| Provenance | `L/evidence-provenance.ts:40-62` `MECHANISMS` | an acceptance stands only if it names a registered trusted mechanism (`certification-authority.ts:96-105`) | experimental |

There is no single IR: `MathExpr`, the calculus `Expr`, the verifier `N` tree, the E6 tree and `NaturalRelation` coexist. `canonical-math-ir.ts` is a lightweight identity key, not a normal form (its own header).

## 3. Verdict call path (unified engine)

```
assessMathematicalWorking (unified-math-engine.ts:598)
 ├ collectReports: base route (+ E5 route for geometry/calculus, + E6 route for calculus/probability/complex natural text)
 │   base: natural text → parseNaturalWorking ──fail──▶ MALFORMED | UNSUPPORTED | AMBIGUOUS for the whole submission (:301)
 │         statement problems → core.assessWorking (number / symbolic / multivariate / equation) → proof-integrity line accounting
 │         other domains → natural-domain adapter (none ⇒ UNSUPPORTED) ; typed shapes → typed kernels ; geometry → Python worker
 ├ per report: applyAcceptanceGate (algebra text: checkAlgebraSubmission + reconcileAlgebra; abstention ⇒ acceptance withdrawn)
 │             → certifyClaims (claim ledger + obligations; can only downgrade)
 ├ certification-authority.adjudicate → one verdict; all routes undecided ⇒ 'no-route-decided' UNSUPPORTED (:171)
 └ side-claim retry: re-assess without off-task lines once (:607-620)
STUDENT PATH: assessAnswerFirst → parseNaturalWorking (line-by-line fallback) → answerFirstSolutionSet/Numeric → credit true|false|null;
              per-transition diagnosis: equivalent | implied | narrowing | invalid (relate on exact sets)
```

Sources of `unsupported` on the 678 holdout: `no-route-decided` 167, single-route 103, kernel-contradiction 1. Sources of `malformed` (117): "unexpected trailing notation" 30, line-account roll-ups 32, "expected expression" 13, "comma suffix must be a domain restriction" 12, "solution branches must name one variable" 12, "malformed number" 7, "power exponent must be a bounded integer" 6.

## 4. Domain and assumption propagation

Core: restrictions only grow, from written denominators (`domain-state.ts:38-90`). Unified engine: one immutable `ProofContext` per submission (`proof-context.ts:17-160`) with task premises, implied restrictions and student assumptions, `relateStudentRestriction` classifying a student restriction (restates / implied / narrows / contradicts). Independent checker premises (", x<0", "where/for …") intersect the task set (`independent-checker.ts:968-997`). Case conditions written in prose ("Case x>0: …") are not carried into the case's lines (observed: `h7-calcD-028`, `h7-calcL-007`). `MATH_E7_ARCHITECTURE_AUDIT.md:15` (module-global `TASK_STATED`) is stale; superseded by `proof-context.ts`.

## 5. Existing SymPy / Python infrastructure

| Item | Finding |
|---|---|
| `feat/math-answer-key-certification:tools/mathematics/grading-audit/oracle/mathtext.py` | `parse_expr(..., local_dict, transformations)` after a character whitelist — still `eval` underneath (attribute chains such as `(1).__class__` survive the whitelist; no exponent/size bounds) |
| same branch, `oracle.py` | `_fn_eq` decides function equality by agreement at ≥ 3 sample points (`POINTS`) and `_num_eq` by a 1e-25 numeric threshold; `signal.SIGALRM` wall-clock limits; `multiprocessing.Pool`. Suitable for offline answer-key auditing, **not** as a proof of equivalence and not for untrusted text |
| `tools/mathematics/core/symbolic-validation/oracle.py` (this branch) | own recursive-descent parser + `fractions` grid evaluation; no SymPy, no eval; documents grid results as evidence, not proof |
| `tools/mathematics/engine-trial/` | SymPy 1.14.0 (`requirements.txt`), `sp.Rational(text)` only; README: not wired to learners |
| ~20 other `tools/**` scripts | `sympify`/`parse_expr` (eval) on author-generated corpora; two plain `eval(` calls (`reasoner/reject_test.py:15`, `domain-reasoner/verify_datasets.py:18`). None safe for student text |
| Python worker pattern | `geometry-worker.ts` + `worker.py`: process pool, NDJSON, RLIMIT_AS, timeouts, queue limit — reusable shape for any SymPy service |

## 6. E7 evaluation harness

`tools/mathematics/generalization-e7/holdout/`: `cases.json` (678), `labels.json` (`exp` ∈ verified 298 / invalid 219 / incomplete 85 / missing-assumption 57 / unsupported 11 / ambiguous 8; `alt`), `audit.json` (independent second labelling), `FREEZE.json`, single-shot `run-holdout.ts`, `score.ts`. `repair/holdout-diag.ts` is the re-runnable diagnostic over the exposed holdout. Scoring: exact = final == exp; FA = final verified ∧ exp ≠ verified; FR = exp verified ∧ final ≠ verified. `MATH_E7_REPAIR_REPORT.md` (235 exact / 213 FR) is one case stale relative to HEAD (236 / 212).

## 7. Implications

- The binding constraint on E7 coverage is the natural front end and all-or-nothing line accounting, not missing symbolic power — for algebra statements. For expression identities with domains (radicals, logs, trig) and for calculus answers (antiderivatives, limits) the kernels are genuinely narrower (see `SYMPY_TRANSITION_EVALUATION.md`).
- Any external engine must be registered in `MECHANISMS` with bound evidence, or `standsOnObligations` withdraws its acceptance — the existing certification design already prevents an unexamined grading authority.
