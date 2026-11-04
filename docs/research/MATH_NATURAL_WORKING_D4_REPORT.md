# OpenPath D4 — Natural Mathematical Working

## Decision

**REVISE before broad learner-facing enablement; MERGE READY as a fail-closed bounded parser and algebra/symbolic integration.** D4 safely removes the structured-object requirement for the notation it actually supports. It does not yet provide lossless natural-input adapters for every existing mathematical domain.

## Architecture

The implementation adds `openpath-natural-math-input@1` in `packages/learning/src/natural-working.ts`. It is a deterministic boundary in front of the existing engine:

```
plain text / common LaTeX
  -> bounded tokenizer and Pratt parser
  -> existing calculus-core Expr nodes and typed line relations
  -> existing unified dispatcher
  -> math-core or M3 symbolic assessment
  -> U4 independent certificate verification
  -> assessment steps annotated with original source locations
```

No solver, symbolic algebra implementation or proof checker was added. Existing structured input remains unchanged. The optional public input is `{ format: "natural" | "latex", text: string }` passed to `assessMathematicalWorking`.

## Supported notation

The expression path supports exact integers, decimal rationals, variables and scoped subscript names, `pi`/`π`, `+ - * / ^`, parentheses, implicit multiplication, absolute values, square roots, and bounded `sin`, `cos`, `tan`, `log`/`ln`, and `exp` application. It accepts common Unicode operators and common LaTeX forms including `\frac`, `\sqrt`, `\cdot`, `\times`, `\div`, comparison commands and braces.

Lines recognize expressions, equations, inequalities, multiple solution branches, derivatives, integrals, vectors, matrices, probability/statistics notation and generic function notation. Recognition is distinct from assessment support. Unknown LaTeX commands never execute.

`1/2x` and the corresponding general quotient-followed-by-implicit-product pattern return `ambiguous` with both readings. Unbalanced delimiters and malformed LaTeX return `malformed`. Arbitrary function application is not silently reinterpreted as multiplication.

## Typed IR and line relationships

Algebraic expressions are emitted directly as the existing `calculus-core.Expr`; D4 does not introduce another expression AST. Equations retain two expression sides, inequalities retain their operator, and solution branches retain exact values. Recognized domain notation without a lossless existing adapter is retained as typed line metadata and returns `unsupported` at assessment.

For the supported symbolic path, equations are represented by their exact zero-form before entering M3. Each student line becomes a dependency-ordered `SymbolicStep`. The existing M3 certificate is still required, and U4 independently checks accepted symbolic transformations.

The existing deterministic equation assessor handles ordinary equation working. A bounded completeness guard identifies the exact case `v^2 = n`, `v = r` when `n > 0` and `r^2 = n`: it reports the single root as valid but incomplete and retains the opposite-root obligation. It never promotes that partial line to verified completion.

## Ambiguity and source locations

The result distinguishes parsed/verified, parsed/invalid, parsed/unsupported, ambiguous, malformed, incomplete and resource-exhausted outcomes. Parsing failure never becomes a mathematical mistake.

Every parsed line retains the one-based original line number, original text and exact start/end character span after optional list numbering. Assessment steps carry this location. Mathematical first-invalid-step indices therefore map back to the student's submitted line. Token offsets are used internally; individual subexpression spans are not yet exposed.

## Frozen benchmark

The 300 independently authored cases were frozen before implementation at SHA-256:

`3dad06d2fa23b9f0fe56e04a0b1ebcce28b449ef82d99bbcf559a09a500f14e5`

The corpus contains 60 algebra/equation, 40 trigonometry/function, 40 calculus, 40 geometry/vector, 30 probability/statistics, 30 matrix/complex, 30 mixed-domain and 30 ambiguous/malformed cases. Provenance is recorded as independently authored for this audit; no externally copyrighted problem text was copied.

### D3 baseline

D3 classified all 300 optional natural-input objects as malformed. Assessable inputs: **0/300**.

### D4 result

| Result | Count |
|---|---:|
| Correct parse classification | 300/300 |
| Correct final classification | 300/300 |
| Mathematically verified | 60 |
| Valid but incomplete | 20 |
| Parsed/recognized but unsupported | 190 |
| Ambiguous | 10 |
| Malformed | 20 |
| False mathematical acceptances | 0 |
| False mathematical rejections | 0 |

The measurable improvement is 60 verified and 20 correctly incomplete natural solutions versus zero assessable inputs at baseline. Unsupported results are not counted as mathematical success.

SymPy 1.14 independently checked 80 exact supported algebra/trigonometric benchmark claims: **80/80 passed**. SymPy was a cross-check, not the source of benchmark labels or U4 verdicts.

## Adversarial validation

The separate 100-case corpus covers ambiguous division, missing parentheses, precedence, malformed LaTeX, scoped symbols, invalid equation chains, missing square-root branches, invalid restrictions, conflicting notation and depth exhaustion.

- parse/ambiguity/resource classification: **100/100**;
- first-invalid-step localization for independently labelled invalid chains: **10/10**;
- a later correct line did not repair an earlier invalid line;
- malformed or ambiguous input produced no mathematical-error verdict;
- false acceptances: **0**.

## Regression results

- Bun learning/unified suite: **840 passed, 0 failed**, 7,773 assertions across 53 files.
- Geometry G2–G4: **47 passed, 0 failed**.
- Frontend production bundle: passed.
- D3 frozen binding benchmark and all earlier structured-input suites remain green.
- No existing structured mathematical verdict or public structured-input call was changed.

Commands:

```
/tmp/bun-bin/bun-linux-x64/bun test packages/learning
PYTHONPATH=. python3 -m unittest discover -s tests   # research/geometry-reasoner
/tmp/bun-bin/bun-linux-x64/bun tools/mathematics/natural-working-d4/run_final.ts
python3 tools/mathematics/natural-working-d4/sympy_crosscheck.py
```

## Performance and limits

Warm parser measurements over 500 iterations:

| Input | p50 ms | p95 ms | p99 ms |
|---|---:|---:|---:|
| Plain three-line algebra | 0.016 | 0.056 | 0.161 |
| LaTeX rational expression | 0.015 | 0.041 | 0.058 |
| Ambiguous quotient | 0.0007 | 0.0014 | 0.0069 |
| 64-line boundary | 0.164 | 0.348 | 3.207 |
| Depth boundary | 0.011 | 0.025 | 0.050 |

Hard bounds are 8,192 input characters, 64 nonblank lines, 2,048 tokens, parse depth 32, four ambiguity alternatives, and the existing proof-state/expression budgets. Parsing is deterministic and has no evaluation, shell, JavaScript, Python or LaTeX execution path.

## Remaining limitations

- The lossless assessment adapter currently covers ordinary algebra/equation working and M3/U4 symbolic transformations. Recognized calculus, arbitrary functions, vectors, matrices, geometry, probability/statistics and complex notation fail closed as unsupported through natural input.
- General equation solution-set equivalence remains bounded by the existing reasoners. D4 handles the explicit positive-square two-branch completeness case but does not add a new equation solver.
- Generic function application, derivative operators, integrals, intervals, matrices and vectors need domain-specific conversion into their existing IR before they can be assessed from text.
- Individual token/subexpression source spans are not included in the public result; the complete line span is.
- Multiline aligned LaTeX environments, cases environments, tensor notation, user-defined macros and prose proof parsing are unsupported.
- The benchmark uses independently authored student-style notation. No claim is made that it represents all classroom conventions or languages.

The next bounded step should add lossless adapters one domain at a time, beginning with calculus and linear algebra, while retaining this parser's ambiguity and provenance boundary. Broad enablement before those adapters exist would overstate D4's coverage.
