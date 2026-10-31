# 01 Baseline and gap report (Milestone 2, `c58c443`)

## Responsibilities

### P2: the derivation authority

`packages/learning/src/derivation-authority.ts`, `openpath-derivation-authority@2`.

The authority is the **only** thing that may authorize a line of working. It keeps two judgments apart:
- **validity:** is the line true?
- **authorization:** is it a justified derivation from what is visible in this task?

What it decides:
- The task is normalised once (`normalizeTask`).
- Each line is checked by:
  - registered rewrites (`rewrite-registry.ts`, graded `determined` / `anchored` / `parametric`);
  - kernel-checked polynomial normalisation;
  - a small set of equation moves: identity, symmetry, side rewrite, balance by a nonzero number, transposition, cancelling a factor or divisor, a one-step linear solve, zero-product and square-root reading.
- Every accepted line becomes a certificate. `replayDerivationChain` re-authorizes every line from scratch.

Invalidity was detected only in two cases:
- a false closed equality;
- `loses-solution@1`, a dropped rational root, and only for tasks with no stated conditions.

### E7: the unified math engine

`unified-math-engine.ts`, `assessment-policy.ts`, `process-shadow.ts`.

It parses natural working and routes algebra lines to the P2 authority (`routeDecision`). It adds claim ledgers, proof obligations and the process policy. It runs in **shadow only** and is not part of production grading.

### Student-working interfaces

- **`derivation-interface.ts`:**
  - `authorizeWorking` wraps `assessChain`;
  - `workingEvidence` maps the result to `method-certified` / `method-false-step` / `answer-only` / …
  - It is used by the M1/M2 learner journey (`frontend/src/journey/session.ts`).
- **`working.ts`:** a display-only step checker (6 families).

## Reproduced measurements

These match the stored P2-FINAL results, except for 1 item on HELDOUT2 and 1 on the bare variant, both changed by Milestone 2. Outputs are in `results/frozen-corpora/*baseline*`.

**Engine level (`run-corpus.ts`):**

| Corpus | Legitimate certified | Invalid detected | False mathematical accepts |
|---|---|---|---|
| HELDOUT3 | 57 / 186 | 70 / 114 | 0 |
| HELDOUT3 bare | 106 / 186 | 82 / 114 | 0 |
| HELDOUT2 | 71 / 181 | 100 / 125 | 0 |
| HELDOUT2 bare | 96 / 181 | 110 / 125 | 0 |

**Authority level** (the authority API on its own; it authorizes lines and does not check completeness):

| Corpus | Legitimate certified | Invalid detected |
|---|---|---|
| HELDOUT3 | 131 | 82 |
| HELDOUT3 bare | 131 | 82 |
| HELDOUT2 | 114 | 104 |
| HELDOUT2 bare | 110 | 103 |

All verified chains replay; there are 0 replay failures.

**Learning package:** 1,666 pass / 44 skip / 0 fail.

## The 44 skipped P2-FINAL tests

These are E7 behaviours whose derivations P2 refused after the legacy fallback was removed. With this branch, 3 now pass and are re-enabled:
- inequality multiplied by a negative number;
- large exact coefficients;
- substitution with the given values / swapped bindings.

The other 41 still need capabilities outside P2's surface:
- Vieta and discriminant formulas, binomial mean (11 loop cases);
- radicals: sqrt equations and squaring with a radical;
- systems of equations;
- the claim ledger and modelling assumptions;
- complex conjugation;
- the C(n,r) / P(n,r) conventions;
- e-forms.

They stay skipped and are listed in `P2_FINAL_SKIPPED_TESTS.md`.

## The three disputed cases

Labels are untouched.

| Case | Working | Milestone 2 | This branch |
|---|---|---|---|
| `rl-044` | `x^2 = 25` → `x = 5` | invalid (`loses-solution`, x = −5) | invalid, same witness |
| `rl-045` | `x^2 = 49` → `x = 7` | invalid (x = −7) | invalid, same witness |
| `domain-division-by-zero-017` | `x^2 = 6x` → `x = 6` | invalid (x = 0) | invalid, same witness |

At engine level all three stay `unsupported` / `incomplete`, because the engine's completeness gate decides there.

**Reading.** As a *solving step* each line is false: it drops a real solution, and the counterexample is exact. As a *claim*, "5 is a solution" is true but incomplete.

**Recommendation for the label owner:** label each `invalid` (method), with the final answer `incomplete`. The new evidence keeps the two apart:
- `transitions[k].status = invalid`;
- `finalAnswer.correct = false` (incomplete set).

## Largest missing general capabilities (before this work), ranked by effect on the corpora

1. **Task-statement normalisation.** 69 corpus items failed `task-unparsed`:
   - "Expand and simplify", "Solve for x:", "Find x:";
   - brackets, superscripts;
   - conjunctive conditions ("x ≠ 20 and x ≠ −20");
   - substitution tasks ("Given x = 3, …", "… when x = 4").
2. **Equation moves beyond closed-number balance.** Adding a variable term, moving a whole side, multiplying by a denominator or a common denominator, dividing by a provably nonzero expression.
3. **Exact solution-set reasoning.**
   - Only rational roots of condition-free tasks could refute a line.
   - Irrational roots, domains, rational equations and inequalities could not be decided.
   - Implication-only steps (squaring, multiplying by a possibly-zero expression) had no representation.
4. **Inequalities.** Entirely outside the surface.
5. **Structured per-line evidence.**
   - `assessChain` stopped at the first refused line.
   - There was no first-invalid-step localisation independent of authorization.
   - There was no completeness or final-answer judgment.
6. **Notation ambiguity.** `1/2x`, `x/2/4`, `9^1/2` were read with one meaning, which caused 4 false accepts on the new held-out set.
