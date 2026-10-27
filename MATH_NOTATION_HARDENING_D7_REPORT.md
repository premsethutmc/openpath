# OpenPath D7 — Natural Mathematical Notation Hardening

## Recommendation

**REVISE.** D7 fixes the exposed derivative defect, preserves every D6 verdict, and achieves perfect parse classification and mathematical-verdict agreement on the new sealed holdout. However, the holdout revealed 14 typed-metadata mismatches: partial derivatives do not duplicate `dependent` into `functionName`, and four non-nested arguments were labelled nested by the frozen reference. Because the sealed set was evaluated once and not used for tuning, these remain documented limitations.

## Baseline and root cause

Branch base: `feat/math-natural-working-d6` at `11393b1c15f17ef86f3e271528385fd043609d66`.

The five exposed inputs were `g'(t)=nt^(n-1)` variants from the D6 sealed holdout. In D6:

- the special-notation detector recognized only `f'` and narrow Leibniz patterns;
- `g'(t)` therefore bypassed derivative parsing and failed as unsupported notation;
- the calculus adapter reparsed raw text using another prime-specific regular expression;
- the parser produced no typed function identity, variable, derivative order, or result expression.

All five reproduced as parse `unsupported` and assessment `unsupported`. Their frozen diagnostic records are in `tools/mathematics/notation-d7/exposed-d6-regressions.v1.json`.

## Parser and grammar changes

D7 extends the existing D4 parser. It does not introduce a second parser or expression tree.

- `NaturalDerivativeNotation` records function/dependent identity, differentiation variable, derivative order, partial status, optional evaluation point, exact result expression, original notation, and existing source location.
- `NaturalFunctionNotation` records function identity, argument notation, nested-application status, optional result expression, and source location.
- Derivative detection is now based on notation structure rather than the letter `f`.
- The calculus adapter consumes the typed derivative relation. It no longer reparses derivative text.
- Unary minus now binds below exponentiation: `-x^2` means `-(x^2)`, while `(-x)^2` remains grouped.
- Unicode square root and superscript spellings normalize through the existing expression parser.
- `sin^2(x)` and equivalent supported spellings map to the same exact function-power expression.
- `1/2x` remains explicitly ambiguous.

All parsed mathematics still flows through the existing domain reasoner and U4 boundary. Parser or adapter success never establishes correctness.

## Supported derivative notation

Bounded typed parsing covers:

- prime notation: `f'(x)`, `g′(t)`, `h''(x)`, and `y'`;
- LaTeX prime notation: `g^{\prime}(t)`;
- Leibniz notation: `dy/dx`, `d^2y/dx^2`, `\frac{dy}{dx}`, and `\frac{d^2y}{dx^2}`;
- operator notation: `\frac{d}{dx}f(x)`;
- first partial derivative notation: `∂f/∂x` and `\frac{\partial f}{\partial x}`;
- bounded derivative orders 1–8;
- a numeric prime-notation argument as an evaluation point.

Partial derivatives and derivative evaluation at a point are typed but return explicit `unsupported` outcomes because the current calculus reasoner does not assess them. Conflicting or excessive orders fail closed.

## Function application and precedence

Generic applications such as `P(x)`, `rate(t)`, and `f(g(x))` retain symbol and argument notation rather than being treated as multiplication. Known exact functions (`sin`, `cos`, `tan`, `log`/`ln`, `exp`, `sqrt`, `abs`) continue through the existing `Expr` IR. Generic nested applications are typed notation but remain unsupported unless an existing adapter supplies mathematical semantics.

Supported implicit multiplication remains bounded and deterministic for forms such as `2x`, `3(x+1)`, `(x+1)(x-2)`, `2sin(x)`, and the documented single-symbol form `xsqrt(x+1)`. Parentheses, powers, built-in function application, and unary signs retain explicit precedence.

## Frozen 250-case notation benchmark

Before implementation D7 froze:

- 175 development cases, SHA-256 `60c7db7d777b169c24eade10a655c5370cd812cdfc32e593c0f39cc506710ca8`;
- 75 sealed holdout cases, SHA-256 `7ecfde9618efa08c5d825d4fdb38f233cd71920d117562cd4b8e076d9d700684`.

The corpus covers 60 derivatives, 40 function applications, 40 implicit-multiplication/precedence cases, 40 equivalent-notation cases, 30 multiline cases, and 40 ambiguous/malformed/adversarial cases. The 75 holdout cases were not inspected during implementation and were evaluated once.

### D6 baseline on accessible development cases

- Parse-class agreement: 111/175
- Typed-interpretation agreement: 63/175
- Mathematical-verdict agreement: 28/98 assessable cases
- False mathematical acceptances: 0
- False mathematical rejections: 62

### D7 development result

- Parse-class agreement: 175/175
- Typed-interpretation agreement: 175/175
- Mathematical-verdict agreement: 98/98
- False mathematical acceptances: 0
- False mathematical rejections: 0
- Invalid first-step localization: 8/8
- Parse latency: p50 0.019 ms, p95 0.104 ms
- Full assessment latency: p50 0.142 ms, p95 0.634 ms

### Untouched sealed holdout

- Parse-class agreement: 75/75
- Typed-interpretation agreement: 61/75
- Mathematical-verdict agreement: 30/30 assessable cases
- False mathematical acceptances: 0
- False mathematical rejections: 0
- Invalid first-step localization: 12/12
- Parse latency: p50 0.034 ms, p95 0.218 ms
- Full assessment latency: p50 0.093 ms, p95 0.427 ms

The 14 typed-reference mismatches were inspected only after the final run:

- 10 partial-derivative cases expected both `dependent` and a duplicate `functionName`; D7 retains the mathematically sufficient dependent symbol but does not duplicate it.
- 4 generic applications with arguments such as `x+1` were frozen with `nested: true`; D7 correctly reserves `nested` for an argument containing another function application.

No post-holdout tuning was performed.

## D6 preservation

- Exposed `g'(t)` regressions: 5/5 verified through `calculus-core`, with exact source spans.
- Original D6 300-case benchmark: unchanged at 250 verified, 20 incomplete, 10 ambiguous, and 20 malformed; zero false acceptance.
- D6 development benchmark: unchanged at 150/150 verified; zero false acceptance or rejection.
- D4 and D5 natural-working behavior remains unchanged.

## Adversarial validation

A separately frozen 100-case set covers incorrect orders, conflicting orders, missing parentheses, division ambiguity, unary-minus traps, nested applications, malformed LaTeX, unsupported Unicode double-prime notation, symbol shadowing, and excessive nesting.

- False mathematical acceptances: 0/100
- Parse outcomes: 40 parsed, 30 malformed, 10 ambiguous, 10 unsupported, 10 resource-exhausted
- Assessment outcomes where a typed problem was supplied: 20 invalid, 20 unsupported, 20 malformed/ambiguous, and none verified

The corpus checksum is recorded in `tools/mathematics/notation-d7/ADVERSARIAL_SHA256`.

## Independent mathematical oracle

SymPy 1.14.0 cross-checked 100 exact claims:

- 40 first/higher polynomial derivatives;
- 20 unary-minus precedence claims;
- 20 trigonometric function-power identities;
- 20 radical notation equivalences.

Result: 100/100 passed. SymPy was used as an exact oracle, not as the parser or verdict source.

## Source locations and U4 boundary

Every parsed line retains its original line number, start/end character span, and raw text. Converted derivative claims preserve that location in the unified assessment step. Invalid mathematics is reported only after a typed relation reaches the calculus/symbolic reasoner. Malformed, ambiguous, unsupported, incomplete, inconclusive, and resource-exhausted states remain separate. No parsed relation is promoted directly into a verified D3 fact.

## Regression and build results

- `bun test packages/learning`: **853 passed, 0 failed**, 9,270 assertions across 56 files.
- Geometry G2–G4 Python suite: **47 passed, 0 failed**.
- Frontend `bun run build`: passed.
- D4/D5/D6 focused natural-working tests: **18 passed, 0 failed** before the full run.
- D7 focused tests: **5 passed, 0 failed**, including 175 frozen development cases and all five exposed failures.

The full Bun run includes D1–D3, U3/U4, M1–M3, C2/C3, B1–B3, worker-pool tests, domain tests, and unified learning tests.

## Resource bounds

Existing bounds remain in force: 8,192 input characters, 64 nonblank lines, 2,048 tokens, parse depth 32, bounded expression and proof sizes, and existing reasoner budgets. D7 caps derivative order at 8 and introduces no backtracking grammar or unbounded interpretation search. Excessive nesting and derivative order return resource-exhausted outcomes.

## Remaining limitations

- Partial derivatives and evaluated derivatives are represented but not assessed by the current calculus engine.
- Unicode double-prime `″` is not normalized; repeated Unicode prime `′′` and ASCII `''` are supported.
- Generic function applications cannot be evaluated without a typed function definition and an existing adapter.
- Generic functions are not added to the shared `Expr` union, so expressions such as `e^{f(x)}` remain outside exact symbolic assessment.
- Prime notation without an argument, such as `y'`, cannot determine the differentiation variable from notation alone. A capital identifier such as `A'` is classified ambiguous because it may denote transpose.
- The sealed typed-metadata score is 61/75 for the documented reference-shape reasons, despite 75/75 parse-class and 30/30 verdict agreement.

No merge or deployment was performed.
