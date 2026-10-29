# Draft: existing transition-verification architecture (audit)

Branch `feat/math-transition-sympy-evaluation`, HEAD `837c79cc8d7b1effa06b8553960322af7ec3f88b`. Read-only audit of code; reports cited only where they disagree.
Paths below are relative to repo root; `L/` = `packages/learning/src/`.

## 0. Headline facts

1. **The unified engine (`assessMathematicalWorking`) is not on any student-facing path.** Students reach only `assessAnswerFirst` → `independent-checker` (browser via `L/grade.ts`; server via Node bundle `backend/family/grader/grader.mjs`). See §8.
2. **No Python or SymPy on the student runtime path.** The only TS→Python bridge is `L/geometry-worker.ts:16` (`spawn(python, ["-m","geometry_reasoner.worker"])`). It is reached only from `assessMathematicalWorking` (geometry/mixed domains), which no frontend or backend code calls. The geometry prover uses only `fractions`, not SymPy. All SymPy use is in `tools/**` offline oracles/cross-checks.
3. **`malformed` in natural-text submissions comes almost entirely from one place:** the hand-written natural parser `L/natural-working.ts`. Any `throw Error(...)` in `tokenize`/`Parser`/`relation` whose message does not start with `resource:`/`unsupported`/`ambiguous:` becomes `malformed` (`natural-working.ts:79`, catch clause). One unreadable line makes the whole submission `malformed` (`unified-math-engine.ts:301`).
4. **`unsupported` has many sources.** The main ones are: the parser (`unsupported character ':'`, `unsupported: ±…`, `unsupported: a conjunction may only join equations`), `proof-integrity.ts:166` (any unresolved line ⇒ whole verdict), `reconcileAlgebra` withdrawing acceptance when the independent checker abstains (`acceptance-gate.ts:44`), `standsOnObligations` in `certification-authority.ts:109`, and the `no-route-decided` fallback (`certification-authority.ts:171`).
5. **E7 exposed holdout (678 cases), baseline at this commit:** exact 236, false acceptances 0, **false rejections 212** (of 298 expected-verified). The rejected verdicts are `unsupported` 271 and `malformed` 117. Among the false rejections, 118 end `unsupported` and 61 end `malformed` (`research/sympy-transition-eval/out/baseline-holdout-diag.json`, `out/e7-rows.json`).

## 1. Unified state and expression representations

At least five independent expression ASTs exist; the code has no single IR.

| Representation | Where | Used by |
|---|---|---|
| `MathExpr` (num/var/add/sub/mul/div/neg/pow) + `MathState {statements, constraints, expressions, bindings}` + `Rational` (bigint) | `L/math-kernel.ts:76,193,462` | core planner/rules, K-series rule registry, domain-state |
| `DomainState` (math + originalRestrictions + restrictions + candidates + evidence) | `L/reasoner/domain/domain-state.ts:19` | core state |
| `CoreState extends DomainState` (+ variable `"x"`, obligations `candidate-check`/`restriction-closure`) | `L/core/state.ts:11-21` | `core/planner.ts`, `core/solve.ts` |
| Calculus `Expr` (constant/pi/variable/abs/root/add/multiply/power(int)/sin/cos/tan/exp/log/atan), rational strings | `L/calculus-core.ts` (type at top) | natural parser output, symbolic-equivalence, proof-kernel, canonical IR, E5 binders, independent checker |
| Verifier `N` tree (own parser) | `L/reasoner/verifier/verifier.ts:12,35` | `core/verify.ts` (independent step check) |
| E6 `A` tree (`e6-parse.ts`) | `L/e6-calc.ts:19 fromExpr` | E6 CAS / series / numbers |
| `NaturalRelation` (expression/equation/inequality/solution-set/conjunction/derivative/function/integral/matrix/vector/probability) | `L/natural-working.ts:18,69` | everything that reads natural text |

- **Canonical IR**: `L/canonical-math-ir.ts` (26 lines). Its own header says "Lightweight semantic identity. This module does not prove algebraic equivalence" (line 1). It does rational normalisation, stable key ordering, bound-variable renaming, and node/depth budgets of 512/32 (lines 5, 15). Its uses are `sameMathematicalMeaning`/`sameMathematicalIdentity` (lines 24-26) for binding and identity checks. It is not a rewriting normal form.
- **Domain semantics (core)**: "variable ranges over the reals minus `restrictions`", and restrictions only grow (I1-I4 in `L/core/state.ts:1-7`). The core is restricted to the single variable `x` (`variable: "x"`, `state.ts:12`).

## 2. Rule registry and rule contracts

There are two registries.

- **Kernel `MathRule` / `RuleRegistry`**: `L/math-kernel.ts:523` (contract: `id, appliesTo, description, precondition(state,params)→string|null, apply, verify(before,after,params)→boolean, explain`) and `:554` (`register` rejects duplicates; `apply` throws on precondition or verify failure, `:35-58` within class). `createDefaultRegistry()` (`:1296`) registers 13 elementary rules: arithmeticEvaluate, compositions, base-ten, fraction equivalence/common denominator, add/subtract/multiply/divide both sides, rectangle area/perimeter, numericOrdering.
- **Core `CoreRule` / `RuleLibrary`**: `L/core/rule.ts:34-76`. A rule must provide `id, level(macro|fine|both), opsOf(params) (strategy vocabulary), effect ("equivalence"|"implication"), eager? (confluent tier), introduces?("candidate-check"), description, principle, match(state)→Params[], checks(state,p)→Check[], apply, action, verify?, bookkeeping?`. `discover()` enumerates every (rule, params) allowed by the strategy (`:58-65`). `toKernelRules()` adapts to `MathRule` (`:67-75`).
- Registered core rules (14, `L/core/rules.ts:59-243`): restrict, collect-terms, expand-brackets, add-sub-both-sides, multiply-both-sides, multiply-both-sides-expanding (implication), divide-both-sides, swap-sides, move-to-left, combine-terms, cancel-common-factor, clear-denominators, expand-collect-polynomial, accept-candidate. `L/core/fine.ts` holds fine-grained rewrite helpers over the same vocabulary. It contains no `reg(` calls, so it registers nothing of its own.
- **Mechanism registry (evidence provenance, not rewrite rules)**: `L/evidence-provenance.ts:40-62` `MECHANISMS`. It lists the exact kernels (u4-kernel, independent-ir-evaluator, e5/e6 exact, u4+exact-solution-set, exact-arithmetic, …), the typed domain reasoners, and internal mechanisms. The certification authority accepts a proven derivation only if its evidence names a registered, trusted mechanism (`certification-authority.ts:102`).
- **Domain kernels have no shared rule contract.** Calculus, M1/M2, B1-B3 and E5/E6 each implement their own step judges (see §6).

## 3. Transition-verification entry points and verdict path

### 3.1 `assessMathematicalWorking` (`L/unified-math-engine.ts:598-625`)

Verdict vocabulary: `Classification` = verified | invalid | incomplete | missing-assumption | unsupported | contradictory | resource-exhausted | malformed | ambiguous (`:38`).

Call path:
1. `string[]` working for a statement problem is rewritten to `{format:"natural", text}` (`:600-601`).
2. `collectReports` (`:275-294`):
   - Natural text with domain ∈ {geometry, calculus, probability-statistics, complex-polynomial}: builds `ProofContext` (`proof-context.ts:101`), runs `assessCandidateBase`, plus `assessE5Route` (geometry/calculus, `:231`) and `assessE6Route` (`:258`). It returns up to 3 `RouteReport`s.
   - Otherwise: only `assessCandidateBase`.
3. `assessCandidateBase` (`:297-427`) dispatches on input shape and domain:
   - Natural text (`:299-313`): `parseNaturalWorking` → if not `parsed`, **return `malformed(...)` with `classification: parsed.classification`** (`:301`). Then:
     - statement problems → `textAssessment` (`:58`, wraps `core/working-assessment.assessWorking`) → `gateTextRoute` (`:151`, line accounting + `refineLoss`).
     - `symbolic` → `adaptNaturalWorking` / typed symbolic.
     - other domains → `adaptNaturalWorking` (`natural-domain-adapters.ts:104`); if not converted, the result is `unsupported`/`missing-assumption`/`ambiguous`/`resource-exhausted` (`:311`).
   - Typed domains: d3 (`:315`), complex (`:331`), LA (`:336`), B1 (`:341`), symbolic (`:346`), m2-cross (`:351`), M1 (`:371`), M2 (`:376`), calculus-methods (`:381`), calculus (`:386`), geometry (`:399-400`, Python worker), mixed (`:403-421`).
   - Fallback `string[]` text (`:425-426`).
4. For each report: `applyAcceptanceGate` (`:510-528`) → `certifyClaims` (`:540-596`).
   - Gate routes: `gateConverted` (adapter binding evidence, `:482`), `gateAlgebraText` (statement problems, runs `checkAlgebraSubmission` + `reconcileAlgebra`, `:461`), `natural-other` (any natural acceptance without an independent verifier is withdrawn, `:516`), `gateStructured` (typed, `:500`).
   - `certifyClaims` builds the claim ledger (`claim-certifier.evaluateLedger`, `:75`) and `buildObligations` (`proof-obligations.ts:63`). It can downgrade to invalid/incomplete/unsupported and never upgrades.
5. `adjudicate(certified, problem)` (`certification-authority.ts:108-172`) produces the single final verdict; see §3.4.
6. Side-claim retry: if the result is not verified and lines were flagged `offTaskLines`, the engine re-assesses without them once (`:607-620`).
7. Any exception → `withdrawAcceptance(... "natural-other")` (`:624`).

### 3.2 Where `malformed` is produced

| Site | Trigger |
|---|---|
| `natural-working.ts:78` | non-natural/latex input or non-string text |
| `natural-working.ts:79` catch | **any parser throw not prefixed `resource:`/`unsupported`/`ambiguous:`**: "unexpected trailing notation" (`:36`, `:69` relation), "expected expression", "malformed number", "power exponent must be a bounded integer", "missing closing parenthesis" (`Parser`, `:34`), "solution branches must name one variable", "malformed solution branch" (`relation`, `:69`), "comma suffix must be a domain restriction" (`:79`), "malformed LaTeX command" |
| `unified-math-engine.ts:301` | propagates the parser classification to the whole submission, with every line marked via `unparsedLineAccount` (`proof-integrity.ts:179`) |
| `proof-integrity.ts:164-166` | `resolveVerdict`: if any line status is `malformed` (severity 3), the whole verdict is `malformed` ("line(s) … could not be verified (malformed)") |
| `unified-math-engine.ts:298,315-317,331-386,399,403-411,425` | typed-shape validation (wrong JSON shape, stage ids, invalid transfer) |
| `L/linear-algebra.ts`, `L/complex-polynomial.ts` | typed kernels may return `malformed` |

Baseline holdout justifications for `malformed` (117): "unexpected trailing notation" 30, "expected expression" 13, "comma suffix…" 12, "solution branches must name one variable" 12, line-account roll-ups 32, "malformed number" 7, "power exponent must be a bounded integer" 6. Typical false rejections: `-1<x<5` (chained inequality), `x = (3±7)/4`, `x=1, 2 or -2`, `2x-1=5 or 2x-1=-5`, `x=3, which is excluded…`.

### 3.3 Where `unsupported` is produced

| Site | Trigger |
|---|---|
| `natural-working.ts:32` | `tokenize` rejects any char outside `[0-9.A-Za-z_ +-*/^=<>(),\|]` → "unsupported character ':' …". This hits `let u=x^2:`, `check:`, `multiply by 6:` |
| `natural-working.ts:52-56` | `±` outside a solved form `x = …±…`, or more than one `±` |
| `natural-working.ts:58-67` | conjunction joining non-equations (`x≠0 and x≠-1`) |
| `unified-math-engine.ts:135` | `lineClass`: line status `inconclusive` → `unsupported` |
| `proof-integrity.ts:151-166` | account violations, or any unresolved line ⇒ whole submission `unsupported` |
| `core/student.ts:175,202,218,250,315,324` | `evaluateWorking`: a line the verifier cannot analyse; evidence chain broken after an unsupported line; the problem itself is unreadable ("the problem itself cannot be analysed exactly (PARSE_ERROR…)") |
| `core/symbolic.ts:151-206` | symbolic route: unreadable line / exact relation refusal |
| `core/working-assessment.ts:54,61,64` | size limits, `Refusal`, budget tripped |
| `acceptance-gate.ts:39-44` | `reconcileAlgebra`: candidate `verified` but checker abstains → `unsupported`; checker verifies while native says invalid → `unsupported` ("conflict", `:49`) |
| `independent-checker.ts:946-1022` | `Unsupported` throws: >1 variable, unparsable condition, parse-fidelity loss (`:965`), problem kind outside scope |
| `natural-domain-adapters.ts:104` | "no lossless natural adapter for <domain>" (e.g. trigonometry, linear-algebra, sequence-series) |
| `natural-geocalc-e5.ts:723`, `natural-generalization-e6.ts:23-32` | E5/E6 planners refuse ("the working could not be translated safely"); the engine maps `refused` to `unsupported` (`unified-math-engine.ts:236,264`) |
| `calculus-core.ts:35` | "outside bounded exact calculus rules" |
| `certification-authority.ts:53-56` | typed step not bound to a registered mechanism → obligation `unsupported` |
| `certification-authority.ts:109` | `standsOnObligations` fails → acceptance withdrawn to `unsupported` |
| `certification-authority.ts:138` | two trusted mechanisms disagree → `unsupported` |
| `certification-authority.ts:171` | all routes non-definite → `no-route-decided` (picks e6 > e5 > base report) |

On the holdout baseline, the 271 `unsupported` verdicts break down by certification rule as `no-route-decided` 167, `single-route` 103, `kernel-contradiction` 1. Top justifications: `proof-integrity` roll-ups "line(s) … could not be verified (unsupported)" (~150), "outside bounded exact calculus rules" 9, "problem itself cannot be analysed (PARSE_ERROR …)" ~15, "conjunction may only join equations" 7, "unsupported character …" ~25, "no lossless natural adapter for …" ~12.

### 3.4 Certification authority (`L/certification-authority.ts`)

- `structuredObligations` (`:41-71`): typed steps → derivation, grounding and answer obligations. A typed step is `proven` only if the reasoner is a registered typed mechanism and the claim identity stamped by the gate equals `typedIdentities(problem, working)` (`:52-54`).
- `standsOnObligations` (`:96-105`): an acceptance stands only if the answer obligation is proven, nothing is blocking, and every proven derivation names a trusted, registered mechanism.
- `adjudicate` (`:108-172`):
  - 1 report → `single-route`.
  - Otherwise, with ≥1 verified: objections from invalid (unless `ruleFormOnly`, `:78-79`), missing-assumption, ambiguous (non-base), or informative open obligations. An objection is `scope-only` if the accepting route proved and grounded everything it leaves open (`:151-152`).
  - With no verified report: indefinite-integral missing constant → `missing-constant-contract`; then invalid → `disproven-claim`; incomplete/missing-assumption → `open-obligations`; then resource, ambiguous, `no-route-decided`.

### 3.5 `assessAnswerFirst` (`L/answer-first.ts:39-93`), student-facing

- Algebra statements only (`:49`); anything else returns `none(..., "unsupported")`.
- It parses the working with `parseNaturalWorking`. On failure it re-reads line by line and keeps the readable lines; an unreadable **last** line gives `unresolved` (`:53-60`).
- Verdict comes first: `answerFirstSolutionSet`, falling back to `answerFirstNumeric` on `Unsupported` (`:66`). Diagnosis runs only when the answer is not correct (`:67`).
- `Unsupported`/`Exhausted` → `answer.status: "unsupported"`, `credit: null` (`:69`). Output `credit` is true/false/null. It always sets `derivationCertified: false` (`:17,73`).
- It does not use the 9-way Classification vocabulary.

### 3.6 `independent-checker.ts` (1359 lines)

- Scope (`:25`): "single-variable rational-coefficient polynomial/rational equations and inequalities, |.|, one sqrt radicand, finite/interval solution sets, closed numeric statements, expression identity via U4". Limits (`:26`): degree 12, 64 critical points, 600 nodes, 80 digits.
- `checkAlgebraSubmission` (`:946`) → `run` (`:954`) dispatches to `evaluationMode`, `linearSystemMode`, `polynomialExpressionMode`, `numericMode`, `identityMode`, or `solutionMode` (`:1024`).
- `profile(stmts)` (`:443`) computes the critical points of all statements. `relate(p,a,b)` (`:455`) compares solution sets by exact membership on gaps and points.
- `solutionMode`: each line → `builtLines` (`:1003`) → status verified-valid / verified-invalid / incomplete / unsupported / inconclusive. After the first invalid or unsupported line, **every later line is `inconclusive`** (`:1049`), which `lineClass` maps to `unsupported`.
- `u4StepEvidence` (`:520`) and `certify` (`:503`) bind U4 proof-kernel certificates (`L/proof-kernel.ts`).
- Answer-first entry points: `answerFirstSolutionSet` (`:1261`), `answerFirstNumeric` (`:1335`), `diagnoseTransition` (`:1225`).

### 3.7 `core/verify.ts` and `core/derivation.ts`

- `verifyStep(effect, before, after)` (`core/verify.ts:103-110`): the independent verifier `V.checkStep` (`reasoner/verifier/verifier.ts:215`) on printed text. It must agree with the legacy `checkTransition` (`domain-state.ts:143`); disagreement throws `Refusal("PROOF_FAILED")`. An unanalysable state → `ok:false`.
- `assessDerivation` (`core/derivation.ts:69`): a solution-wide ledger over `assessWorking` / `verifyWorkingStep`, with obligations opened and discharged. It is advisory and has its own `Mathematical = correct|incorrect|undetermined` and `TransitionStatus` vocabulary (`:13,37`). Callers are tests and `tools/mathematics/core/symbolic-validation/run_derivation.ts` only; `core/educator-evidence.ts` imports it but has no production importer.

### 3.8 `proof-obligations.ts`

- Kinds derivation | grounding | domain | answer; statuses proven | disproven | unresolved | unsupported (`:21-22`).
- `buildObligations` (`:63`) turns the claim ledger, line-account records and gate evidence into per-claim obligations. A recorded line with no claim becomes a synthetic claim; status maps verified-valid→proven, verified-invalid→disproven, incomplete→unresolved, else unsupported (`:72`).

## 4. Planner and search

- `L/core/planner.ts`: `search` (`:116-157`) is breadth-first search with a dedupe key `stateKey` (equation text plus excluded values, `:68`) or `canonicalKey` (`:101`). Moves come from `library.discover` filtered by `strategy.allowed` (`:109-114`). Optional `prune` keeps only the lowest `eager` tier (confluent tidy-ups).
  - Each move goes through `applyMove` (`:19`), which checks preconditions then `verifyStep`. `RuleFailure` counts as precondFailed or verifyRejected.
  - Stops at depth `maxDepth`, or at `maxNodes` (sets `capped`).
  - `searchBest` (`:159`) is weighted best-first (f = depth + w·h), not optimal.
- Strategies (`L/core/solve.ts:16-20`): `linear` (maxDepth 24, maxNodes 100000, prune) and `rational` (maxDepth 14, maxNodes 3000, prune). `chooseStrategy` picks rational iff x appears in a denominator (`:46-49`). Goal `SOLVE`: `x = const` or a closed true/false statement (`:23-32`).
- Global op budget: `L/core/budget.ts:5` `LIMITS = {ops: 3_000_000, maxLines: 40, maxChars: 400, maxNesting: 40}`. `spend()` throws `Refusal("SEARCH_LIMIT")`; `bounded()` scopes it.
- `L/reasoner/planner.ts:23-42`: the K05.1 `plan(text)` is a thin view over `solve(strategy:"linear")`.
- **The planner is not in the student-work assessment path.** `evaluateWorking` calls `solve(problem)` only with `opts.engine !== false`, and `assessWorkingInner` passes `engine:false` (`core/working-assessment.ts:87`, `core/student.ts:328`). Step judging is pairwise verification, not search. Callers: tests and `tools/mathematics/audit/greedy-ablation.ts`, `tools/mathematics/reasoner/*`.

## 5. Domain and assumption propagation

- **Core (single variable x)**: `L/reasoner/domain/domain-state.ts`. Restrictions are derived from written denominators (`denominatorsOf` `:38`, `conditionsOf` `:53`, `zerosOfDenominators` `:90`). Exponents must be integer constants with |k| ≤ 12, else `Refusal` (`:29-35`). Solution sets: `solSet`/`solEquals`/`solSubset` (`:111-133`). `checkTransition` returns `Violation`s (restriction-closure-violated, restriction-dropped, original-restriction-lost, solution-set-changed, solution-set-lost) (`:134-155`). `domain-engine.ts` (11 lines) and `domain-checker.ts` (20 lines) are thin wrappers.
- **Verifier layers**: `verifier.ts:237-253`. `domainLayers` (original / expression / assumptions / carried) and `relateLines` → equivalent | gain | loss | both.
- **Unified engine**: `ProofContext` (`L/proof-context.ts:17-160`) is one immutable, deep-frozen context per submission. Item kinds: task-premise, implied-restriction, proved-fact, student-assumption, unresolved-premise. `relateStudentRestriction` (`:132`) classifies a student restriction as restates | implied | narrows | contradicts | new-quantity | undecided. Each route reports `RouteUse` (consumed / notConsumed). Numeric constraint algebra: `claim-certifier.ts:17-70` (`parseConstraints`, `taskDomain`, `contradictsTask`).
- Independent checker premises (", x<0", "where/for/given …"): collected once in `run` (`independent-checker.ts:968-976`). They intersect the problem's solution set (`withPremises` `:997`); contradictory premises → `Unsupported`.
- **Report staleness**: `MATH_E7_ARCHITECTURE_AUDIT.md:15` cites a module-global mutable `TASK_STATED` and regex-only domain handling. No `TASK_STATED` exists in `L/` today (grep). It was superseded by `proof-context.ts`.

## 6. Kernels: what each supports

| Kernel | File | Supports | Notes |
|---|---|---|---|
| Core equation (x only) | `core/student.ts`, `core/verify.ts`, `reasoner/verifier/verifier.ts` | linear and rational equations in x, rational coefficients; pairwise equivalence/implication with restriction tracking | integer exponents only; split/case lines |
| Number | `core/number/index.ts:103` | exact numeric chains | |
| Symbolic (1 var) | `core/symbolic.ts:139,214` | expand/factorise/simplify/collect; identity / at-values / never; lost/added restrictions | |
| Multivariate | `core/multivariate/index.ts:142` | multi-letter expression working | |
| Independent algebra checker | `independent-checker.ts` | see §3.6; exact Q, Q(√d), interval solution sets, linear systems (`MP_LIMITS` 6 vars, 8 eqs, `:632`) | the student-facing kernel |
| U4 proof kernel | `proof-kernel.ts`, `symbolic-equivalence.ts` | certificate replay of symbolic equivalence under assumptions | |
| Calculus core | `calculus-core.ts` | typed tasks: derivative, implicit-derivative, indefinite/definite integral, limit, continuity | "No numerical sampling is used as proof" (line 1) |
| Calculus methods | `calculus-methods.ts` | substitution, integration-by-parts, partial-fractions, l'Hôpital, piecewise-integral, improper-family | |
| E5 calculus binder | `calculus-binder-e5.ts` | U4 identity vs independently differentiated source; exact rational-function limits; polynomial definite integrals | float may only confirm a rejection |
| E5 geometry binder (TS) | `geometry-binder-e5.ts:65-256` | angle linear equations over compiled premises (vertical, alternate, corresponding, linear pair, triangle sum, isosceles, supplementary, complementary); coordinate point/slope/distance (surds); congruence criterion table | premises requiring nondegenerate/parallel are available only if stated (`:96`) |
| Geometry synthetic prover (Python) | `research/geometry-reasoner/geometry_reasoner/synthetic.py` (rules `:89-236`: parallel pairs, straight line, triangle sum, isosceles, correspondence, congruent parts, circle, quadrilateral, polygon angles, Pythagorean, triangle inequality) | typed geometry steps for `domain:"geometry"`/`"mixed"` | `fractions` only; worker `worker.py` with RLIMIT_AS 512 MB, NDJSON protocol `openpath-geometry-worker@2` |
| E6 CAS | `e6-cas.ts` | separate differentiation; exact equality over Q(x) with formal generators (exp, sin/cos with S²+C²=1, ln\|p\|, radicals, π, e); derived restrictions | |
| E6 series | `e6-series.ts` | exact truncated Laurent limits for rational functions and sin/cos/tan/exp/ln/sqrt/atan compositions | else `Unsupported` |
| E6 numbers | `e6-numbers.ts` | Gaussian-rational chains for probability/combinatorics/statistics and complex/polynomial | |
| M1 | `domains-m1.ts` | typed function, coordinate, inequality, quadratic | |
| M2 | `domains-m2.ts` | typed exponential-log, radical, sequence-series, trigonometry | natural text for these gets "no lossless natural adapter" unless E6 reads it |
| B1 / B2 / B3 | `probability-statistics.ts`, `linear-algebra(-kernel).ts`, `complex-polynomial.ts` + `complex-kernel.ts` | typed step kernels | |

## 7. Existing SymPy / Python usage

- **Requested paths are absent**: `tools/mathematics/grading-audit/oracle/oracle.py` and `mathtext.py` do not exist. No `mathtext.py` exists anywhere. `tools/mathematics/grading-audit/` contains `oracle.ts`, a TS rational oracle that imports nothing from the graders (header lines 1-2). The `oracle.py` that does exist is `tools/mathematics/core/symbolic-validation/oracle.py`: its own recursive-descent parser plus `fractions.Fraction` pointwise grid evaluation. It has **no SymPy and no eval**, and its docstring says grid results are "evidence rather than proof" (lines 1-10).
- **`tools/mathematics/engine-trial/`**: `check.py` uses `sympy` (`requirements.txt: sympy==1.14.0`) and builds values via `sp.Rational(text)` (`:26-28`), not `sympify`. Its README says it is "Not merged and not wired into any learner-facing path" (README lines 3-4). The `.mts` trial files import `math-kernel.ts`.
- **`sympify` / `parse_expr` sites** (all under `tools/**`, offline cross-checks): `check-symbolic.py:11` (`sp.sympify` on stdin JSON), `reasoner/check.py:18,55,69`, `reasoner/gen_sets.py:21`, `domain-reasoner/domain_oracle.py:20`, `domain-reasoner/gen_poly_cases.py:45`, `natural-working-d4/sympy_crosscheck.py:9`, `core/symbolic-validation/sympy_diff.py:13`, `core/symbolic-validation/gen.py:192`, `core/teacher/check_teacher.py:13,26`, `core/student/student_oracle.py:262`, `core/student/adjudicate_F.py:14,26`, `audit/challenge/reference.py:657,676`, `adversarial2/3 generate_*.py:155/154`. Plain `eval(` also appears in `tools/mathematics/reasoner/reject_test.py:15` and `domain-reasoner/verify_datasets.py:18`.
- **Safety**: `sympify` and `parse_expr` call Python `eval` on a transformed string. The SymPy docs say they must not be used on untrusted input; `locals=`/`local_dict=` does not sandbox them. `check-symbolic.py` reads from stdin, and every site parses author-generated corpora. **None is safe for student text as written.** A student-facing SymPy evaluator would need its own tokenizer→AST→SymPy-constructor path (no `sympify` of raw strings), plus process isolation, time and memory limits. The existing `geometry-worker.ts` / `worker.py` pool shows a pattern for the isolation part: RLIMIT_AS, NOFILE, timeouts, queue limit.
- **TS→Python bridges** (grep `spawn|execFile|Bun.spawn|child_process` in `packages/ backend/ frontend/src`):
  - `L/geometry-worker.ts:16`: runtime spawn of `python3 -m geometry_reasoner.worker`, cwd `research/geometry-reasoner`. Reached only via `unified-math-engine.ts:69-73` (`runGeometry`).
  - `L/core/number/number.test.ts:148` and `packages/learning/scripts/check-family.ts:108`: `execFileSync("python3", …)`, test/script only.
  - Backend `backend/family/kernel_grader.py:54` uses `subprocess.run([node, grader.mjs])`, i.e. Python→Node, not TS→Python.
  - `grader.mjs` contains no `child_process`/`spawn` (grep count 0).
  - `backend/` has no SymPy import (grep) and `requirements.txt` does not list sympy. `backend/family/learning.py:17,253` uses its own `answer_types.parse`.
- **Conclusion: no Python or SymPy on any student-facing runtime path.**

## 8. Student-facing wiring

Browser path: `frontend/src/year/Learn.tsx:19,199` `decide` (from `L/session.ts:5-6` → `L/grade.ts:9-12`) → `assessSubmission` (`L/assessment.ts:209`) → `kernel` (`assessment.ts:83-84`) → `assessAnswerFirst({domain:"algebra",statement}, working, {finalAnswer})`. Also `creditOf` (`grade.ts:22`) from `Learn.tsx:13`, `StudySession.tsx:5`, `review/Main.tsx:11`.

Server path: `backend/family/learning.py:189` `_authoritative` → `kernel_grader.kernel_decision` (`kernel_grader.py:67`) → `node grader.mjs` (sha256-pinned by `grader.manifest.json`, `entry: L/server-grader.ts`) → `gradeRequest` → `assessSubmission` → `assessAnswerFirst`. The manifest's `L/` inputs are answer-first, answer-types, assessment, calculus-core, complex-kernel, digest, domains-m2, families, family-kit, graph, independent-checker, linear-algebra-kernel, math-kernel, natural-working, parse-fidelity, probability-statistics, proof-kernel, server-grader and typed-contract. They do **not** include unified-math-engine, certification-authority, proof-obligations, core/*, the E5/E6 modules or geometry-worker.

Working feedback: `frontend/src/year/Learn.tsx:21` and `curriculum/PreviewExperience.tsx:6` use `L/working.ts:214` `checkWorking`, a separate small reader ("no eval", `:12`) for numeric problems and quadratics.

| Component | File | Status | Evidence |
|---|---|---|---|
| assessAnswerFirst | `L/answer-first.ts` | student-facing | `assessment.ts:84`; manifest input; `grade.ts`→`Learn.tsx` |
| independent-checker (answerFirst*, profile/relate) | `L/independent-checker.ts` | student-facing (via answer-first) | `answer-first.ts:7`; manifest input |
| natural parser | `L/natural-working.ts` | student-facing | `answer-first.ts:8`; manifest input |
| typed contract kernels (LA, complex, B1, M2) | `L/typed-contract.ts` + kernels | student-facing | `assessment.ts:16`; manifest inputs |
| working@1 checker | `L/working.ts` | student-facing (feedback only) | `Learn.tsx:21` |
| checkAlgebraSubmission / acceptance gate | `independent-checker.ts:946`, `acceptance-gate.ts` | test/tool only | called only from `unified-math-engine.ts:26,463` and tools |
| assessMathematicalWorking | `L/unified-math-engine.ts` | experimental (tests/tools) | importers only `tools/**`, tests, `research/sympy-transition-eval/e7-dump.ts`; re-exported by `L/index.ts:14`, which has no importer; absent from grader manifest; `grader.mjs` grep count 0 |
| certification-authority, proof-obligations, claim-certifier, proof-context | `L/*.ts` | experimental | imported only by unified-math-engine |
| E5 / E6 routes and binders | `natural-geocalc-e5.ts`, `natural-generalization-e6.ts`, `e6-*.ts`, `*-binder-e5.ts` | experimental | imported only by unified-math-engine and tools |
| geometry Python worker | `L/geometry-worker.ts`, `research/geometry-reasoner` | experimental | only `unified-math-engine.ts:72`, tools |
| core assessWorking / evaluateWorking | `L/core/working-assessment.ts`, `core/student.ts` | experimental | importers: unified-math-engine, `core/derivation.ts`, `tools/mathematics/core/**` |
| core/derivation (assessDerivation) | `L/core/derivation.ts` | test-only | tests, `core/educator-evidence.ts` (no importer), `tools/.../run_derivation.ts` |
| planner / solve / reasoner/planner | `L/core/planner.ts`, `core/solve.ts`, `reasoner/planner.ts` | test/tool only | `engine:false` in assessment path; `tools/mathematics/audit/greedy-ablation.ts` |
| SymPy oracles | `tools/mathematics/**/*.py` | offline tooling | no backend or runtime import |

## 9. E7 evaluation harness

- `tools/mathematics/generalization-e7/holdout/`:
  - `cases.json`: 678 `{id, problem, studentWorking}`. 618 are natural-text dicts; typed ones are lists. Domains: calculus 283, algebra 186, geometry 87, other 122.
  - `labels.json`: 678 `{id, cat, tags, exp, alt, why, author}`.
    - `cat` ∈ other-domains 100, typed-routes 100, algebra-equations 85, geometry 83, algebra-expressions 81, calculus-derivative 81, calculus-integral 78, calculus-limits-series 70.
    - **Label vocabulary (`exp`)**: verified 298, invalid 219, incomplete 85, missing-assumption 57, unsupported 11, ambiguous 8. `alt` (acceptable alternates) uses invalid / incomplete / missing-assumption / verified.
  - `audit.json`: an independent blind second labelling `{id, verdict, note}` (verified 304, invalid 215, incomplete 90, missing-assumption 55, unsupported 9, ambiguous 5).
  - `FREEZE.json`: sha256 of cases/labels/audit/authored; `engineCommit 5d0a7b4…`.
- `run-holdout.ts`: single-shot. It refuses if `results-raw.json` exists or the frozen hashes differ (`:5-8`). It calls `assessMathematicalWorking(c.problem, c.studentWorking, {})` per case and records the final classification, certification rule, routes, integrity and mechanisms (`:12-15`).
- `score.ts`: joins results with labels.
  - `exact` = final === exp; `acceptableAlt` = final ∈ alt.
  - **falseAcceptances** = final verified ∧ exp ≠ verified. **falseRejections** = exp verified ∧ final ≠ verified.
  - Also counts `engineUnsupported`, `contested` (audit disagrees with exp and alt), per-category and per-tag blocks, a confusion matrix, and provenance failures (a verified result lacking integrity/mechanisms/obligations, `:22`). Perf is p50/p95/p99.
  - `score-summary.json` (frozen run at `5d0a7b4`): exact 228/678 (33.6%), FA 5, FR 215, unsupported 272.
- `repair/holdout-diag.ts`: a re-runnable diagnostic over the **exposed** holdout ("never a blind evaluation", `:1`). It reports exact, FA (+ids), FR, frAsInvalid, unsupported, malformed, verified, `frAudit` (FR where the audit also says verified), p50/p95, and route-twin agreement over `route-equivalence` tag pairs (`:19-21`).
- Current baseline (`research/sympy-transition-eval/out/baseline-holdout-diag.json`): exact 236, FA 0, FR 212 (16 as invalid), unsupported 271, malformed 117, verified 86, frAudit 211, twin 8/15, p50 1.35 ms, p95 10.9 ms, total 1.9 s. This matches `repair/out-final/holdout-diag.json`.
- Expected-verified cases rejected as unsupported or malformed, by route:
  - unsupported: statement/natural 56, calculus/natural 21, geometry/natural 17, calculus/typed 6, other ~18.
  - malformed: statement/natural 29, calculus/natural 18, other ~14.
- **Report vs data**: `MATH_E7_REPAIR_REPORT.md:31,33` gives "holdout exact 235; FR/unsupported/malformed/verified 213/272/117/85". The current diag gives 236/212/271/117/86. That is a minor drift, so the report is slightly stale relative to HEAD.

## 10. Call-path map

```
STUDENT-FACING
 frontend Learn.tsx ──decide/creditOf──> grade.ts ──> assessment.assessSubmission ──> answer-first.assessAnswerFirst
 backend learning.py _authoritative ──> kernel_grader.py ──subprocess node──> grader.mjs(server-grader.ts) ──┘    │
                                                                                         natural-working.parse ◄─┤
                                                     independent-checker.answerFirstSolutionSet / Numeric ◄─────┘
                                                        (profile/relate exact sets, U4 proof-kernel)  → credit true|false|null
 frontend Learn.tsx ──> working.checkWorking  (feedback only, own reader)

EXPERIMENTAL (tests, tools/, E7 holdout)
 assessMathematicalWorking (unified-math-engine.ts:598)
   ├─ collectReports
   │    ├─ assessCandidateBase
   │    │    ├─ natural: parseNaturalWorking ──fail──> MALFORMED/UNSUPPORTED/AMBIGUOUS (whole submission)
   │    │    │    ├─ statement → textAssessment → core.assessWorking ─┬ number / symbolic / multivariate
   │    │    │    │                                                 └ student.evaluateWorking → core/verify.verifyStep → verifier.checkStep
   │    │    │    │            → gateTextRoute → proof-integrity.resolveVerdict (any unresolved line ⇒ UNSUPPORTED/MALFORMED)
   │    │    │    └─ other domain → natural-domain-adapters (no adapter ⇒ UNSUPPORTED) → assessConverted
   │    │    ├─ typed: M1/M2/calculus/methods/symbolic/B1/B2/B3/d3/m2-cross
   │    │    └─ geometry/mixed → geometry-worker ──spawn python3──> research/geometry-reasoner (synthetic prover)
   │    ├─ E5 route (geometry|calculus natural) → natural-geocalc-e5 → geometry/calculus binders  (refused ⇒ UNSUPPORTED)
   │    └─ E6 route (calculus|prob|complex natural) → e6-calc / e6-numbers / e6-cas / e6-series (refused ⇒ UNSUPPORTED)
   ├─ per report: applyAcceptanceGate (algebra-text: checkAlgebraSubmission + reconcileAlgebra; converted; structured; natural-other)
   │              → certifyClaims (claim ledger, buildObligations; downgrade only)
   └─ certification-authority.adjudicate → single verdict (+ no-route-decided ⇒ UNSUPPORTED) → optional side-claim retry
 core planner/solve (BFS, linear 24/100k, rational 14/3k, 3M ops) — not used in assessment (engine:false)
```

## 11. Implications for a SymPy transition evaluator (draft notes)

- Most false rejections happen **before any mathematics runs**. They come from parser refusals in `natural-working.ts` (`:`, chained inequalities, `±` inside expressions, comma lists of values, prose after a comma). Next come all-or-nothing line accounting (`proof-integrity.ts:151-166`) and inconclusive propagation after the first unsupported line (`independent-checker.ts:1049`).
- A SymPy-backed checker would be a new, independent mechanism. To count in certification it must be registered in `MECHANISMS` (`evidence-provenance.ts:40`) and emit bound evidence; otherwise `standsOnObligations` withdraws the acceptance.
- Any SymPy path must avoid `sympify`/`parse_expr` on raw student text (§7). It also needs process isolation like the geometry worker, and must stay off the student path until explicitly approved.
