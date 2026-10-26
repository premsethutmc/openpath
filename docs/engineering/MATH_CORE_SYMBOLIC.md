# Symbolic algebra in the unified core

One-variable polynomial and rational expressions: expand, collect, factorise, simplify, rational simplification. Advisory only: educators mark written work.

**Design.** No second engine. The independent verifier (`reasoner/verifier/verifier.ts`) gained an expression layer on its existing parser and rational-function builder: `analyseExpression`, `relateExpressions` (identical / conditional / never, plus domain dropped/added), `irreducible` (rational roots + Kronecker, refuses when too large), `formFacts`. `core/symbolic.ts` sequences it over a student's lines; `core/expression-errors.ts` names causes with the same single-fault, rewrite-at-a-node approach as `misconceptions.ts`. Routing: `assessWorking` / `verifyWorkingStep` take a no-`=` one-variable problem after the number engine; equations are untouched.

**Judgement.** A line is an identity with the previous line iff the exact cross-product difference is the zero polynomial (BigInt rationals, no sampling). Chains `A = B = C` claim every link. Four separate results: correctness (`outcome`/`correct`), required skills (`skills`), final form (`final`, option `form`), domain obligations (`domain`, option `requireDomain`). Refusals are `unsupported`/`ambiguous` with `correct: null`.

**Identity vs value.** `relateSymbolic` returns `identity`, `at-values` (with the exact x where they agree, e.g. `(x+1)^2` vs `x^2+1` agree only at 0) or `never`.

**Domain.** Cancelling (x²−1)/(x−1) to x+1 is a valid identity but widens the domain: the step is `valid-with-obligation`, `domain.missing` lists x = 1 until the student states `x ≠ 1` (on the line or its own line). With `requireDomain` an unstated loss makes the outcome `incomplete`. A line that adds a restriction the previous one lacked is invalid.

**Limits.** One variable (any single letter, renamed to x); no functions, roots, or x in exponents; integer exponents ≤ 1000; irrational restrictions are flagged, not stated; Kronecker factor search is capped, so exotic high-degree irreducibility claims return `unsupported`/not-factorised rather than a guess; skill detectors are structural (a skill is "shown" when a line performs that transformation); cause naming covers single faults only and is a candidate, never a finding; `a/2x` style lines are `ambiguous`.

**Measured.** 11 tests (adversarial cancellations, exponent errors, domain, separation of judgements, refusals, routing); 300 random expansion assessments against a naive polynomial multiplier: 150/150 correct verified, 150/150 perturbed invalid, mean ≈1 ms, worst pair ≈13 ms; 60 held-out pairs vs vendored SymPy (`cancel`/`solve`): 60/60 same relation. Full learning package: 716 pass, 0 fail.
