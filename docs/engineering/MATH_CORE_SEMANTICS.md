# Mathematical Intelligence Core: domain, obligation and state-identity semantics

Status: implemented on `feat/math-core` (draft PR #81). Code: `packages/learning/src/reasoner/verifier/verifier.ts` (`relateLines`, `domainLayers`), `packages/learning/src/core/student.ts`, `packages/learning/src/core/planner.ts` (`canonicalKey`), `packages/learning/src/core/compose.ts` (goal predicates). Tests: `semantics.test.ts`, `defects.test.ts`, `identity.test.ts`, `goals.test.ts`, `student.test.ts`.

## 1. Four layers of domain, never mixed
For a one-unknown equation with problem text P and a student line L:

| layer | meaning | lifetime |
|---|---|---|
| original domain D0 | real zeros of the denominators written in P | permanent: every line is judged with D0 removed |
| expression domain D(L) | real zeros of the denominators written in L | belongs to L only |
| temporary assumptions | D(L) minus D0: values excluded only because L was written with a denominator the student introduced | L only; they restrict L's meaning, never the original solution set, and never later lines |
| carried assumptions | explicit case assumptions (`case x != c`) | the lines of that branch |

The **meaning** of a line is its solution set over R minus (D0 U D(L) U carried). A step from line A to line B is judged by comparing the two meanings, computed exactly (rational roots, irrational parts compared as polynomials):

* equal -> `valid` (equivalent step);
* old set strictly inside new set -> `valid-with-obligation` (an implication: every old solution is kept, new candidates appear);
* new set strictly inside old set, or both directions changed -> not equivalent: `invalid`, **except** the legitimate discharge below;
* a finite set replaced by "every x" (multiplying by 0) -> `invalid` (information destroyed).

A student-introduced denominator is therefore not a permanent restriction. Multiplying it away again gains its zero as a *candidate* (an obligation); dividing by an expression that can be zero, or cancelling a common factor that can be zero, loses that zero and is invalid unless it is covered by an explicit case split.

## 2. Proof obligations
Gaining candidates opens an obligation. It is closed only by a later line that **shrinks** the set while (a) an obligation is open, (b) the previous set was finite, and (c) the new set still contains every solution of the ORIGINAL problem (computed on D0 U carried). Nothing is ever certified by the student's own later lines: the final claim is always checked by exact substitution against the original problem (`checkClaim`), so a claim that keeps a gained root, drops a true root, or contains a root excluded by D0 is `invalid` at `final-claim` even if every step was valid. A transformation that loses solutions can never reach `valid-complete`.

## 3. Explicit case splits (input syntax)
Directly after a line L:
* `case x = c: E` where E is a variable-free equation: valid iff its truth equals the truth of L at x = c (c must not be excluded by D0 or L; if it is, E must read `excluded`). A true case records c as a solution found.
* `case x != c: E` (or `≠`): E is an ordinary equation; valid iff its solutions equal L's solutions with c removed. The working continues from E under the standing assumption x != c.
* A later line equal to (branch result U recorded case roots), written for example `x = 0 or x = 8`, closes the split and releases the assumption. Omitting a true case root is caught at the final claim.

## 4. Evidence chain
A line the verifier cannot analyse exactly is `unsupported`. The step *into* it and the step *out of* it are not judged (`evidence-chain-broken`). Later steps between two readable lines are assessed pairwise only where the verdict does not depend on the missing context: an equivalent step is `valid` (flagged), a gain is an implication, a change that loses a solution of the original problem is `invalid` in every context; a shrink that keeps all original solutions might be a discharge of an unknown obligation and stays `unsupported`. The overall status of a working with an unsupported line is never `valid-complete`.

## 5. Notation
Glyphs `− – — ‐ ‑ ‒` (minus), `× · ⋅ ∙ ∗ ⨯` (multiplication), `÷ ∕ ⁄` (division), `² ³` are normalised. A number after `/` followed by juxtaposed factors (`7/2x`, `7 / 2 x`, `3/2(x+1)`) is ambiguous: both readings `(7/2)x` and `7/(2x)` are evaluated and a working whose verdict depends on the reading is `ambiguous`, never guessed.

## 6. Search-state identity (planner)
`stateKey` (printed text + restrictions) remains the default. `canonicalKey` (opt-in per `Strategy.key = "canonical"`) merges two states only if they differ by nothing but the order of the terms of a sum or the factors of a product and the sign convention `a - b = a + (-b)`. It never merges different restrictions, constraints, open obligations, sides of the equation, numerator/denominator, subtraction order, or bracket groups (a sum on the right of +/- or a sum factor stays a visible group, because EXPANDED_POLY and REDUCED read it). Nodes keep the first-reached state, written as the rules wrote it.

## 7. Goals
`REDUCED` counts fraction terms against the start's **reduced** fraction count (a term such as 3(2x-2)/(x-1) is the polynomial 6 and is not a fraction). Permanent regression: A-6-017 (`goals.test.ts`).

## Known limits
Degree <= 2 after clearing; rational roots; one unknown; case-split syntax is a minimal interface, not general natural language; hand-drawn or free-text working is out of scope.
