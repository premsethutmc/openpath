# Milestone K05.2: domain-aware algebraic reasoning — proposal

Status: **proposal, tests frozen, no planner code written.** Stacked on PR #75. Pathway 2 (general mathematical engine); independent of the Grade 5 release pipeline. Nothing here is merged or deployed, and implementation waits for explicit approval.

Numbering: the K00–K12 board is unchanged. K05 is the solution planner. PR #75 is **K05.1** (one-unknown linear equations). This milestone is **K05.2**: the same planner made aware of the conditions under which each step is valid.

## 1. Why this milestone

PR #75 refuses `(9*x)/x = 10` instead of cancelling `x/x`. That is safe but it is a wall, not a capability. School algebra meets it constantly: `(x²−4)/(x−2) = 4` has no solution because the only candidate, x = 2, is a value the original expression excludes. A learner who cancels and answers x = 2 has made the most common mistake in rational equations. An engine that cannot represent *why* that answer is wrong cannot teach it, and an engine that says it is right would be actively harmful.

## 2. What already exists (inventory)

| Component | Where | Reuse |
|---|---|---|
| Exact arithmetic (`Rational`, bigint) | `math-kernel.ts` (PR #69) | Reuse as is. |
| Expression tree `MathExpr` with `div`, `pow`, `neg`; `evaluate` throws on division by zero | `math-kernel.ts` | Reuse. |
| `MathStatement`, `MathState {expressions, statements, constraints, bindings}` | `math-kernel.ts` | Reuse as the carrier. |
| `MathConstraint {kind: "nonzero", expr}` | `math-kernel.ts` | **A restriction is exactly a `nonzero` constraint.** Reuse, do not reinvent. |
| `MathRule {precondition, apply, verify, explain}` and `RuleRegistry` | `math-kernel.ts` | New rules are registered here. This is how we avoid a second engine. |
| Text parser/printer, BFS planner, forced-tidy policy, trace and statistics | `packages/learning/src/reasoner/` (PR #75) | Extend. |
| Independent checker: parser of its own (SymPy), domain read from the **unevaluated** expression, rejects steps that change solution set or domain | `tools/mathematics/reasoner/check.py` | Extend. |
| Rejection, domain and no-shortcut tests; frozen sets with hashes; `run-e3.sh` | PR #75 | Pattern to copy. |

**Genuinely missing**

1. No polynomial representation. The planner works on trees and recognises only `k*x`. Cancelling `(x²−4)/(x−2)` needs polynomial division or gcd.
2. No restriction set in the state. PR #75's `Eq` is just two expressions, so a restriction cannot survive a step.
3. No candidate bookkeeping: nothing records "this value came from a transformed equation and is not yet proven".
4. No evidence objects: steps carry a rule name and a sentence, not preconditions and obligations.
5. Moves are unconditional. The kernel's `MathRule` has preconditions, but the PR #75 planner does not call the registry.

Decision in this proposal: keep the PR #75 planner and the kernel, add only a small univariate polynomial helper (section 6), and register the new moves as kernel `MathRule`s. No second symbolic engine and no CAS dependency.

## 3. Mathematical state

```
DomainState {
  statement      : MathStatement          // the current equation (kernel type)
  original       : { text, statement, restrictions }   // frozen at the start, never modified
  restrictions   : Restriction[]          // nonzero constraints; only ever grows
  candidates     : Candidate[]            // values proposed by the transformed equation
  evidence       : Evidence[]             // one entry per step, append-only
}
Restriction = MathConstraint{kind:"nonzero", expr}  + { value: Rational | null, origin: "input" | ruleId, step: n }
Candidate   = { value, fromStep, status: "pending" | "accepted" | "rejected",
                proof: { excluded: boolean, residual: Rational | "undefined" } }
Evidence    = { step, rule, effect: "equivalence" | "implication",
                preconditions: { name, held: boolean, detail }[],
                obligations:   { id, kind, discharged: boolean, how }[] }
```

**Invariants** (checked after every step, by the engine and again by the independent checker):

- I1 Monotone: the restriction set of step n+1 contains that of step n. A step may add restrictions, never drop one.
- I2 Closure: every denominator that contains x in the current equation has its zero set inside `restrictions`.
- I3 Origin: `original.restrictions` is derived from the input text alone and is contained in `restrictions` at every step.
- I4 Honest ending: a value is reported as a solution only if its status is `accepted`, which requires (a) it is not excluded by `original.restrictions`, and (b) exact substitution into the **original** equation gives equal, defined sides.

**Why this representation is sound.** Let D₀ be the real line minus the zeros of the input's denominators, and Sol(E, D) the real solutions of E in D. Every rule is declared one of two kinds. An **equivalence** step keeps Sol(Eₙ₊₁, Dₙ₊₁) = Sol(Eₙ, Dₙ) with Dₙ₊₁ ⊆ Dₙ never dropping below what I1 and I2 allow. An **implication** step only guarantees Sol(Eₙ, Dₙ) ⊆ Sol(Eₙ₊₁, Dₙ₊₁): it can add values (multiplying by an expression that might be zero) but never lose one. Rules that can lose a solution (dividing by an expression that may be zero) are not applicable unless the divisor is provably nonzero on D. So after any chain of such steps, the true solution set is contained in the candidate set, and step (b) of I4 removes every extra value by direct substitution into the original. Containment gives completeness, substitution gives soundness, and the restrictions give the one thing neither can: the right answer for an identity such as `(x²−4)/(x−2) = x+2`, which is true on ℝ∖{2}, not on ℝ.

Worked example, `(x²−4)/(x−2) = 4`: restriction x≠2 (origin: input). Cancel the factor (x−2): equivalence, restriction kept. `x+2 = 4`, candidate x = 2, status rejected (excluded). No accepted candidate, so the final answer is *no solution*, with the reason attached.

## 4. Rules: preconditions, effect, proof obligations

| Rule | Precondition | Effect | Proof obligation the checker verifies |
|---|---|---|---|
| `domain.restrict-denominators` (start) | Every x-containing denominator factors into linear factors over ℚ (section 6) | Adds `nonzero(factor)` for each | Zero set of each denominator ⊆ restrictions (I2) |
| `domain.multiply-both-sides` by e | Zero set of e ⊆ restrictions, else the step is an *implication* and creates unproven candidates | Equivalence (or implication) | Sol over D before = after (or ⊆) |
| `domain.divide-both-sides` by e | Zero set of e ⊆ restrictions (e nonzero on D). Otherwise not applicable | Equivalence | Sol sets equal, restriction for e present |
| `domain.cancel-common-factor` f | f divides both numerator and denominator (polynomial division, remainder 0) | Equivalence | Restriction f≠0 still present after the step (I1); Sol sets equal over D |
| `domain.simplify-rational` | Repeated cancel using the polynomial gcd | Equivalence | As above, every intermediate |
| `domain.combine-terms` a/b ± c/d | b·d's zero set ⊆ restrictions | Equivalence | Sol sets equal; new denominator restricted |
| `domain.clear-denominators` | Multiply by the LCD of the written denominators, then expand | Equivalence | Sol sets equal over D |
| `domain.solve-linear` | Reuses PR #75's both-sides moves on a denominator-free equation | Equivalence | Sol sets equal |
| `domain.check-candidates` | Candidates exist | Final | I4 (a) and (b) |
| `domain.classify` | Candidates resolved | Final | Matches the oracle class |

There are no equation-specific templates. The six equations PR #75 refuses are ordinary members of the removable-singularity family in the datasets and receive no special handling anywhere.

## 5. Scope and capability matrix

| Capability | K05.2 |
|---|---|
| One unknown x, equations with x in denominators, every term's numerator of degree ≤ 2 that splits into rational-root linear factors (or a constant), every denominator a product of ≤ 3 linear factors (repeats count) with rational roots | **Supported** |
| Equations whose reduced form is linear: unique solution, no solution, identity on a restricted domain | **Supported** |
| Removable singularities, extraneous candidates, several excluded values, multi-step simplification | **Supported** |
| Reduced equation of degree ≥ 2 (genuine quadratics) | Refused: `reduced-degree>=2` |
| Irreducible or irrational-root denominators/numerators (`x²+1`, `x²−2`) | Refused: `denominator-outside-boundary` / `numerator-outside-boundary` |
| Numerators beyond degree 2, more than three denominator factors | Refused (same codes) |
| No variable in any denominator (belongs to PR #75) | Refused here: `no-variable-denominator` |
| Inequalities, systems, several unknowns, radicals, absolute value, trigonometry | Not planned in this milestone |

**Limited factorization (the only factoring allowed).** Extract the integer content; split a polynomial of degree ≤ 3 into linear factors using the rational-root theorem; compute the gcd of two univariate polynomials of degree ≤ 3 over ℚ. If a polynomial does not split completely over ℚ the equation is refused. Coefficients stay below 10⁶ in absolute value. Nothing else is factored.

## 6. New component: `Poly`

A univariate polynomial over the kernel's `Rational` (coefficient array; add, multiply, divide with remainder, gcd, evaluate, rational roots). Roughly 150 lines plus tests. This is the only new mathematical machinery and it is verified against SymPy on randomised inputs before any rule uses it.

## 7. Independent oracle specification

`tools/mathematics/domain-reasoner/domain_oracle.py` decides everything from the equation text alone. It is never fed by, and does not import, any planner code.

- **Excluded set X**: real zeros of every x-containing denominator, read from the *unevaluated* expression (SymPy `evaluate=False`), so a factor that evaluation would silently cancel is still seen.
- **Candidates**: real roots of the polynomial obtained by multiplying (L − R) by the LCD of the written denominators. This is what a student gets by clearing denominators.
- **Rejected**: candidates that lie in X.
- **Solution set**: roots of the numerator of the fully cancelled (L − R), minus X. Classes: `unique`, `none`, `identity-on-domain` (the solution set is ℝ∖X and the exclusions are part of the answer).
- **Tags**: `removable` (an excluded value at which the cancelled function is defined), `extraneous-candidate`, `all-candidates-rejected`, `extraneous-and-valid-root`, `restricted-identity`, `multi-excluded` (|X| ≥ 2), `multi-step` (domain operations ≥ 4: terms with x in a denominator + excluded values + 1 if removable).
- **Scope**: `supported` is true exactly when the section 5 boundary holds and the reduced numerator has degree ≤ 1. Otherwise the oracle lists reason codes.
- **Step validity**: a step from (E₁, X₁) to (E₂, X₂) is valid iff (i) X₂ contains the zeros of E₂'s own denominators, (ii) X₂ ⊇ X₁, and (iii) Sol(E₁, ℝ∖X₁) = Sol(E₂, ℝ∖X₂). Violations are reported as `restriction-closure-violated`, `restriction-dropped`, `solution-set-changed`.
- **Claim validity**: a claimed solution set is right iff it equals the oracle's solution set; claiming "all reals" for a restricted identity is wrong.

**Second oracle, no SymPy** (`verify_datasets.py`): exact `Fraction` evaluation of the text. (1) A grid of 1,441 rationals: expected solutions satisfy the equation exactly, every excluded value makes a denominator zero, no grid point outside the expected set satisfies it, identities hold at every defined grid point. (2) An exact solver with no CAS: it evaluates (L − R) times the cube of every excluded factor at 24 points, interpolates the polynomial, divides out the excluded factors and reads off the remaining roots, so solutions with any denominator are checked, not only grid values. Every transition verdict and every claim is decided by (2), with the grid as a backup. It also re-runs the main oracle on every stored record, so the frozen files cannot drift.

**A finding about the tools.** While building the oracle, SymPy's `solveset` returned an empty set for a true identity on a restricted domain (`x+5/(x-9) = (x²-9x+5)/(x-9)`). A cross-check I wrote caught it. SymPy's `solveset` on rational equations is therefore *not* used as an authority; the oracle uses exact polynomial reduction plus the independent Fraction grid. This is also a warning for the checker we ship.

## 8. Frozen datasets

<!-- DATASETS:BEGIN -->

Generated by `gen_domain_sets.py`; SymPy 1.14.0. Seeds: dev 20261101, eval 20261102, holdout 20261103, unsupported 20261104, adversarial 20261105.

| File | Items | SHA-256 | Verified by the SymPy-free Fraction oracle |
|---|---|---|---|
| `dev.json` | 206 | `ec299ae02e95f516a31fadcd83161ad02ca4df82f28af719e26740bce9cfc487` | 206/206 agree |
| `eval.json` | 400 | `6147a52e23e0028323e9fb4d714234171e484c03c8ad0c3f121d69c3e236603d` | 400/400 agree |
| `holdout.json` | 300 | `bff66089d1e2047618082c78f9f4741099aa3df3d18a13a633acbd9c9b08751a` | 300/300 agree |
| `unsupported.json` | 112 | `4301bfe43af1a17a88b28e2e227de181bb43ab08285b6f68841fa2125ec8b0ea` | 112/112 agree |
| `adversarial.json` | 2884 | `00d7821dd54c3c2aaf4ffc16ed204c213d99e2b9b6e9c3d9a8c3b790cb8a113d` | 2884/2884 agree |
| `claims.json` | 400 | `ef6fdd221c06ea0ce5975af734efd36163d3f612fb98c889658852e7413a632c` | 400/400 agree |

### Overlap between files (identical equation text)

| | dev.json | eval.json | holdout.json | unsupported.json |
|---|---|---|---|---|
| dev.json | 206 | 0 | 0 | 0 |
| eval.json | 0 | 400 | 0 | 0 |
| holdout.json | 0 | 0 | 300 | 0 |
| unsupported.json | 0 | 0 | 0 | 112 |

Diagonal = size; off-diagonal must be 0.

### Supported sets: what each contains (oracle-assigned tags; one equation can carry several)

| Tag | dev.json | eval.json | holdout.json |
|---|---|---|---|
| unique-solution | 118 | 230 | 183 |
| no-solution | 53 | 101 | 73 |
| restricted-identity | 35 | 69 | 44 |
| removable | 106 | 204 | 137 |
| extraneous-candidate | 71 | 135 | 93 |
| all-candidates-rejected | 44 | 79 | 62 |
| extraneous-and-valid-root | 27 | 56 | 31 |
| multi-excluded | 140 | 268 | 213 |
| multi-step | 143 | 274 | 220 |
| plain | 22 | 47 | 39 |
| items | 206 | 400 | 300 |

| Excluded values per equation | dev.json | eval.json | holdout.json |
|---|---|---|---|
| 1 | 66 | 132 | 87 |
| 2 | 124 | 226 | 166 |
| 3+ | 16 | 42 | 47 |

| Recipe family | dev.json | eval.json | holdout.json |
|---|---|---|---|
| `h_lead` | 0 | 0 | 46 |
| `h_pair` | 0 | 0 | 27 |
| `h_scaled` | 0 | 0 | 29 |
| `h_three` | 0 | 0 | 25 |
| `legacy-refused-family` | 6 | 0 | 0 |
| `r_cross` | 23 | 44 | 21 |
| `r_cross_ex` | 21 | 34 | 0 |
| `r_ident` | 39 | 73 | 20 |
| `r_poly_rat` | 1 | 6 | 5 |
| `r_remov` | 33 | 71 | 39 |
| `r_simple` | 26 | 55 | 42 |
| `r_sum` | 41 | 75 | 24 |
| `r_three` | 16 | 42 | 22 |

The holdout contains four recipe families (`h_*`) that appear in neither dev nor eval, so it tests structure as well as new numbers. `dev.json` also holds the six previously refused `(a*x)/x = c` style equations (tag `legacy-refused`) as visible regression cases; they are not special-cased anywhere.

### Unsupported / out-of-scope set

112 equations the oracle places outside the stated scope. Expected behaviour: refuse, with a reason code from the oracle's list for that equation.

| Primary reason | Items |
|---|---|
| `denominator-outside-boundary` | 32 |
| `no-variable-denominator` | 16 |
| `numerator-outside-boundary` | 32 |
| `reduced-degree>=2` | 32 |

### Adversarial transitions (state → state)

2884 transitions; validity labelled by the oracle (`intent` records what the generator meant; the oracle's label wins).

| Kind | Intent | Oracle: invalid | Oracle: valid |
|---|---|---|---|
| add-to-both-sides | legal | 0 | 140 |
| cancel-common-factor-drop-restriction | illegal | 167 | 0 |
| cancel-common-factor-keep-restriction | legal | 0 | 90 |
| cancel-non-factor | illegal | 170 | 10 |
| clear-denominators-drop-restriction | illegal | 140 | 0 |
| clear-denominators-keep-restriction | legal | 0 | 88 |
| combine-fractions-add-denominators | illegal | 81 | 9 |
| combine-fractions-correctly | legal | 0 | 90 |
| cross-multiply | legal | 0 | 90 |
| cross-multiply-drop-restriction | illegal | 90 | 0 |
| cross-multiply-wrong | illegal | 78 | 12 |
| divide-by-expression-no-restriction | illegal | 281 | 144 |
| divide-by-expression-record-restriction | conditional | 65 | 216 |
| factor-numerator | legal | 0 | 77 |
| multiply-by-expression-no-check | illegal | 216 | 209 |
| multiply-by-expression-record-restriction | conditional | 65 | 216 |
| scale-both-sides-by-nonzero-constant | legal | 0 | 140 |
| **total** | | **1353** | **1531** |

Generator intent contradicted by the oracle in 384 transitions (kept, with the oracle's label). Invalid-reason counts: restriction-closure-violated 421, restriction-dropped 487, solution-set-changed 787.

### Claimed solution sets

400 claims; 294 wrong, 106 right.

| Kind | Wrong | Right |
|---|---|---|
| accept-extraneous-candidate | 39 | 0 |
| claim-excluded-value | 90 | 0 |
| claim-no-solution | 59 | 0 |
| claim-spurious-root | 31 | 0 |
| ignore-domain-all-reals | 16 | 0 |
| true-claim | 0 | 106 |
| wrong-root | 59 | 0 |
<!-- DATASETS:END -->

Separation of purpose: **dev** may be used freely while building. **eval** is the acceptance set: it is run for decisions and any tuning against it must be disclosed in the report. **holdout** is not to be run until the final evaluation, is run once, and contains recipe families that dev and eval lack. Every expected value was produced by the oracle, not by a planner. Test-data generators propose equations from recipes; the oracle alone decides class, solution set, exclusions, tags and scope, and the recipes cannot influence those. Recipes were tuned (before freezing) only to make the tag minimums reachable.

## 9. Adversarial test specification

Transitions are state pairs `{eq, excluded[]}` with an oracle label and reason codes. Illegal kinds: multiplying by an expression and accepting the result with no check; dividing by an expression with no restriction recorded; dividing with the restriction recorded when the divisor is the solution (the root is lost); clearing denominators and dropping the restrictions; cancelling a common factor and dropping its restriction; cancelling a non-factor (`(x+p)/(x+q)` to `p/q`); combining `a/b + c/d` as `(a+c)/(b+d)`; cross-multiplying wrongly or while dropping restrictions. Legal controls of the same shapes make sure the checker is not simply rejecting everything. Claims test the final answer: accepting an extraneous candidate, claiming "all reals" for a restricted identity, claiming no solution when one exists, claiming an excluded value.

Requirement on the checker: **100% of invalid transitions rejected, at least 99% of valid controls accepted, 100% of wrong claims rejected.**

## 10. Acceptance criteria (frozen with the datasets)

On the **eval** set, supported equations:

1. At least 95% solved with the correct class **and** exactly the oracle's solution set (or, for restricted identities, the same exclusion list).
2. **Zero** accepted invalid final solutions (any reported value outside the oracle's solution set).
3. **Zero** transformations in the engine's own traces that the independent checker finds violating I1, I2 or step equivalence over the tracked domain.
4. Restrictions retained through every step of every trace (I1–I3, checked per step).
5. Every reported solution verified against the original equation by exact substitution (I4).
6. Traces byte-identical across runs.
7. Every **unsupported** equation refused, with a reason code that is in the oracle's list for that equation; **zero** wrong answers on unsupported equations. A refusal of a supported equation counts as a failure under criterion 1.
8. The checker meets the adversarial thresholds in section 9.
9. **Holdout**, run once at the end: at least 95%, zero invalid solutions. Between 90% and 95% is reported as a generality gap, not a pass.

Report: states visited, path length and time (median, 95th percentile, worst) per set; failure list in this format:

```
{ "id", "category": "wrong-solution | accepted-excluded | missed-solution | wrong-class | false-refusal | missing-refusal | invalid-step | restriction-lost | search-cap",
  "expected", "got", "trace" }
```

**Change control.** These criteria and datasets are frozen with this document. Any later change to a threshold, a dataset or the oracle must be recorded in section 13 with the date, the reason, and whether results had already been seen.

## 11. Implementation plan

| Stage | Work | Gate before the next stage | Estimate |
|---|---|---|---|
| D0 | `Poly` helper with tests against SymPy | Randomised agreement on 5,000 cases | 0.5–1 day |
| D1 | `DomainState`, restriction/candidate/evidence types, invariant checks; checker extended to read `{eq, excluded}` states | Checker passes the adversarial set (section 9 thresholds) | 1 day |
| D2 | Rules of section 4 registered as kernel `MathRule`s | Each rule's unit tests; dev set not yet used | 1–2 days |
| D3 | Planner extension (search, forced policies, candidate checking) | Dev set run; failures categorised | 1 day |
| D4 | Iterate on dev; run eval once per iteration; disclose tuning | Eval criteria 1–7 | 1 day |
| D5 | Holdout once, adversarial acceptance, report, STATUS update, draft PR | Criterion 9 | 0.5 day |

Total about 4–6 days of agent work, with an owner review point after D1 and after D4. Stop rules: if eval stays below 80% after D4, stop and report rather than widen the move set; if the checker misses any invalid transition, nothing proceeds until the checker is fixed.

## 12. Trade-offs and recommendation

| Decision | Options | Recommendation |
|---|---|---|
| Representation | (a) convert everything to rational functions in normal form; (b) keep trees, add restrictions and a polynomial helper | **(b).** (a) hides the steps a learner should see and is a second engine. |
| Where restrictions live | (a) recompute from the expression each time; (b) explicit set with closure invariant | **(b).** With (a), cancelling `x/x` loses the information by construction. |
| Strategy | (a) clear denominators first; (b) cancel first; (c) offer both and let search choose | **(c).** Both are valid and teach different things; search is cheap. |
| Extraneous values | (a) filter at the end; (b) carry candidates with proof obligations | **(b),** and still verify by substitution into the original. |
| Rules | (a) new moves inside the planner; (b) kernel `MathRule`s | **(b).** Uses the existing contract and gives per-rule preconditions and `verify`. Cost: a small adapter, because the registry expects the caller to name the rule. |
| Factoring | (a) none; (b) the limited form in section 5; (c) general | **(b).** (a) cannot cancel `(x²−4)/(x−2)`; (c) is a scope explosion. |
| Quadratics after clearing | In scope or not | **Not in K05.2.** They are the natural K05.3; keeping them out keeps the domain logic testable on its own. |
| SymPy | Use `solveset` as the oracle | **No.** It failed on a true identity (section 7). Exact reduction plus the Fraction grid. |

## 13. Amendments

None yet.

## 14. Decisions needed from the owner

1. Approve K05.2 as scoped (section 5), including the refusal list and the limited-factorization boundary.
2. Approve the frozen datasets and the acceptance criteria in section 10 as written, including 95% on eval and holdout.
3. Approve registering the new moves as kernel `MathRule`s (adds a small adapter) rather than extending the planner only.
4. Approve the `Poly` helper as the only new mathematical component.
5. Decide whether quadratics after clearing denominators follow as K05.3 or wait.
6. Authorise starting D0 (nothing starts without this).
