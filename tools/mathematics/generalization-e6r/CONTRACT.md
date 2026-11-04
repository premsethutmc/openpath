# Verdict, domain and ambiguity contract (E6-R)

Applies to the E6 route (`packages/learning/src/e6-*.ts`) and the unified-engine merge. Versioned with the code; changes since E6 are marked **(E6-R)**.

## 1. Verdict semantics (unchanged since E3 unless marked)
| Verdict | Meaning | Examples |
|---|---|---|
| `invalid` | some line is mathematically false or unjustified; precedence over everything except resource/ambiguity abstentions | wrong chain rule, `sqrt(x^2)=x` for all real x, `∫5x^4+1 dx = x^4+x` (no `+C` does **not** rescue it) |
| `incomplete` | every line is true, but the requested final answer is not reached | a true detour that stops at `conj(product)`; one root of two; unevaluated expression. **(E6-R)** a true unlabelled chain that ends at a different quantity is `incomplete`, previously `invalid` |
| `missing-assumption` | lines hold only under an assumption/restriction that neither the task nor the working supplies | `P(A∩B)=P(A)P(B)` without independence; `ln(x^2)=2ln(x)` for the function `ln(x^2)`; indefinite integral without `+C` |
| `ambiguous` | the notation has materially different readings the task does not resolve | bare `log`, `±` in a numeric answer, `P(A, B)` outside a typed joint task |
| `unsupported` / `resource-exhausted` | outside the binders / bound reached; fail closed. Resource exhaustion is its own operational outcome and is **never** counted as a correct verdict **(E6-R evaluator)** |

### Missing `+C` (E6 revision, audited in E6-R)
`missing-assumption` is retained: the transformation is valid, the solution is not a complete indefinite integral, and the constant is a stated-or-missing convention, not an error in a step. Classification is identical for single-line, multi-line and substitution working (tests in `verification-closure-e6r.test.ts`). `invalid` dominates (a wrong antiderivative without `+C` is `invalid`). Migration: consumers that mapped D5 `invalid` for a missing constant must also accept `missing-assumption` (both are non-accepting); the frozen D5 record keeps the old label and the D5 tests carry the mapping. Residual: a constant that is written and then dropped on a later line is fail-closed `unsupported` (arbitrary constant inside an expression), not `invalid`.

## 2. Domain tracking **(E6-R)**
For a task with posed expression `f`, `D0` is the real domain of `f` (non-zero denominators, positive logarithm arguments, with even powers inside a logarithm requiring only non-zero). A step `A = B` is judged by the requirements that only one side carries (`reqs`):
1. **Implied by the task**: a requirement already guaranteed by `D0` is not missing (a product-log `ln(x^2-1)` guarantees *product > 0*; the single factors being positive implies it, not the converse).
2. **Carried forward**: a restriction stated by the working (`Assume x>0.`, `For x>1: …`, `x ≠ 2`) satisfies matching requirements from that line on.
3. **Genuinely missing**: a requirement that `D0` does not imply and the working does not state → `missing-assumption` on that line (e.g. `ln(x^2)=2ln(x)` for `ln(x^2)`, `ln(x^2-1)=ln(x-1)+ln(x+1)`).
4. **Invalid domain expansion / restricted-domain equality**: an equality that is false on part of `D0` (`sqrt(x^2)=x`) is `invalid`; one that is true on all of `D0` although the sides have different natural domains (`ln x + ln 3x = ln 3x^2` for the function `ln x + ln 3x`; cancellation inside a function whose own domain excludes the cancelled point) is accepted.
Indefinite integrals: a logarithm without absolute value needs `p>0` stated (`ln|x|` is accepted for `∫1/x dx`).

## 3. Ambiguity **(E6-R)**
`P(A, B)` (comma list inside `P(...)`/`Pr(...)`) is read as the joint event only when the typed task is `independent-intersection` and the list is plain event names; with `|`, comparison signs or any other task it is `ambiguous`. `P(n, r)` with numeric arguments is the permutation count. A spaced sign after a limit point (`x->2 + 1/x`) is arithmetic; an attached sign (`x->2+`, `x→1-`) is a one-sided marker; a one-sided or two-sided limit of the posed function at the posed point is a legitimate lemma and is evaluated on its own side.

## 4. Number domain **(E6-R)**
`quadratic-roots` with `coefficientDomain: "complex"` requires every root; `"real"` with a negative discriminant requires the conclusion that there are no real roots (and complex roots offered as real roots are `invalid`) unless the problem lists the `complex-roots` assumption. `±` in a root list stays `ambiguous` (not expanded).

## 5. Second-round revisions (found by fresh holdout #1; documented as contract, not tuned to cases)
1. **Argument sign belongs to the domain.** `ln(-x)` requires `-x > 0`; the kernel keeps the sign of the argument's content (it used to discard it, so `ln(-x)` was treated as `ln(x)` with the wrong requirement - a soundness bug). `ln` symbols are sign-canonical (`ln|p|`) so `ln(x^2) = 2ln(-x)` is an identity exactly where `-x > 0`. Positivity requirements with an empty intersection (`x > 0` with `-x > 0`) are unstatable: `ln(x) = ln(-x)` is never accepted. The logarithm of a negative constant or a negative-definite expression is `unsupported` over the reals.
2. **`exp(ln u) = u` keeps the logarithm's domain** in the expression's domain D0 (it used to be dropped, producing spurious "state x ≠ 0").
3. **Square roots of rational-factorable radicands** are split into one radical per factor; `√(ab) = √a·√b` is accepted exactly where each factor is non-negative (typed restriction or stated), recorded like logarithm factors.
4. **Counting notation carries its convention.** `C(n,r)`, `\binom`, `nCr` state the unordered reading, `P(n,r)` (numeric arguments) / `nPr` the ordered one. A task of the other kind is not rescued.
5. **Finite probability**: a product of two equal probability-sized factors (`6/10·6/10`) is a model of replacement/independence; it needs `with-replacement` or `independent` from the task or the working (`without-replacement` contradicts it). Otherwise `missing-assumption`.
6. **`+C` on a chain** (revision of the E6 chain rule): one constant at the end of an equality chain covers the chain (conventional notation); a chain whose final member is closed and lacks `+C` is `missing-assumption`; a wrong antiderivative is still `invalid`. Migration: working like `∫f = F₁ = F₂ + C` was `missing-assumption` in E6 and is `verified` now; nothing becomes accepted that lacks a final constant.
7. **Final forms**: `e^1`, `e^(-1)` terms are accepted in an exact closed form; `(a + bi)/c` with whole `a, b, c` and no common factor is a reduced complex quotient.
8. **Route merge**: an earlier route's `incomplete` (all lines true, its narrower final-form grammar not satisfied) is completed by the independent exact route when that route returns `verified`. `verified` still requires the E6 exact kernel; no route can certify on its own what the kernel rejects.
