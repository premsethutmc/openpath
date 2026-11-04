# 05 Held-out adversarial evaluation

## The two sets

Both were written by separate agents that did not see the implementation, from a written specification of labels. Each was cross-checked with SymPy by its author (0 disagreements) and frozen by sha256 before the first run.

| Set | Items | sha256 | Labels |
|---|---|---|---|
| HELDOUT4 | 275 | `fe629f55…` | 141 valid, 4 valid-jump, 90 invalid, 10 incomplete, 30 malformed |
| HELDOUT5 | 163 | `6ee51511…` | 62 valid, 17 valid-jump, 59 invalid, 9 incomplete, 16 malformed |

- **HELDOUT4 categories:** multi-path, unfamiliar coefficients, domain counterexamples, inequalities, correct-answer-invalid-working, wrong-answer-valid-start, reordered-equivalent, malformed or ambiguous.
- **HELDOUT5 categories:** linear paths, quadratic factorisation, rational equations, squaring, inequalities, substitution, expression rewrites, malformed.

**What is honest about "held out":**
- HELDOUT4's first run was clean.
- That run exposed defects, which were then fixed:
  - 4 false accepts on ambiguous notation;
  - candidate lists rejected as invalid;
  - expression lines not refuted;
  - disjunction lines unsupported.
- HELDOUT4 is therefore **no longer held out**.
- HELDOUT5 was written after those fixes and run once frozen. Its frozen-run numbers are the clean measurement.
- After the HELDOUT5 run, three more things were fixed or generalised:
  - substitution judged with values;
  - ambiguous lines excluded from validity;
  - common-denominator multipliers and factorisation of non-expanded polynomials.
- The post-fix HELDOUT5 numbers are reported separately and are informed by it.

## Results

| | HELDOUT5 M2 | **HELDOUT5 frozen run** | HELDOUT5 post-fix (informed) | HELDOUT4 M2 | HELDOUT4 first run | HELDOUT4 final (informed) |
|---|---|---|---|---|---|---|
| False mathematical accepts (verified, labelled invalid/malformed) | 0 | **0** | 0 | **4** | 4 | 0 |
| Transition-level false certifications | 0 | **0** | 0 | 0 | 0 | 0 |
| Valid derivations certified | 7 / 62 | **28 / 62** | 38 / 62 | 57 / 141 | 101 / 141 | 110 / 141 |
| Invalid detected | 15 / 59 | **59 / 59** | 59 / 59 | 49 / 90 | 70 / 90 | 90 / 90 |
| First invalid line exact | 15 | **58** | 58 | 49 | 63 | 83 |
| False rejects (labelled valid / jump / incomplete, reported invalid) | 3 | **1** | 0 | 0 | 3 | 0 |
| Malformed: never certified / reported invalid | 15 / 1 | 15 / **1** | 16 / 0 | 26 / 0 | 26 / 0 | 30 / 0 |
| Valid reported unsupported | 55 | **34** | 24 | 84 | 37 | 31 |
| Incomplete reported `incomplete` | — | 8 / 9 | 8 / 9 | — | 9 / 10 | 9 / 10 |

Notes on the table:
- The 4 HELDOUT4 false accepts under M2 were malformed or ambiguous notation (`1/2x`, `x/2/4`, `1/2(x+4)`). They were also present on Milestone 2. They are fixed by `notation@1`.
- The single HELDOUT5 frozen-run false reject was `h5-sub-010`: substituting and factorising in one line was judged against the unbound expression. It is fixed: such a line is now `substitution-combined-with-other-steps` (unsupported).
- The HELDOUT5 malformed item reported invalid on the frozen run, `x = 18/6x`, was also invalid on M2. It is fixed, because ambiguous lines are excluded from validity.

**Zero known false mathematical accepts:**
- Across both held-out sets and all four frozen corpora, at authority level and at engine level, no item labelled invalid or malformed is certified.
- No transition labelled `implied-by` or `neither` is certified, except discarding a candidate after an implication step, which is a different, labelled status.

**HELDOUT5 frozen run per category** (valid certified / invalid detected):

| Category | Valid certified | Invalid detected |
|---|---|---|
| expression rewrites | 4 / 10 | 10 / 10 |
| inequalities | 7 / 9 | 9 / 9 |
| linear paths | 1 / 10 | 5 / 5 |
| quadratic factorisation | 6 / 8 | 9 / 9 |
| rational equations | 3 / 9 | 8 / 8 |
| squaring | 0 / 7 | 9 / 9 |
| substitution | 7 / 9 | 9 / 9 |

**Unsupported, not concealed.** Valid working left unsupported is reported as unsupported, never as invalid. The reasons on the post-fix HELDOUT5 valid items:
- `no-registered-equation-move`: mostly two operations in one line (for example, clearing a fraction and expanding at once);
- `no-registered-rewrite`;
- `no-registered-inequality-move`;
- replay-limit refusals.

See 08.

## Independent SymPy cross-check of the authority's own output

`scripts/sympy-crosscheck.py` takes every `certified-equivalence` transition and every invalid transition with an exact lost witness, on HELDOUT4, HELDOUT5 and the four frozen corpora.

**Result: 1,274 checked, 0 disagreements.** 27 tasks were skipped by the script itself: several variables, or conditions it does not parse.

## Certificate safeguards (`results/integrity.txt`)

843 verified chains across all six sets. Each was replayed, then attacked:

| Check | Accepted |
|---|---|
| Own-task replay failures | 0 |
| Another task's statement | 0 / 843 |
| Truncated lines | 0 / 728 |
| Tampered result | 0 / 843 |
| Forged but self-consistent (digests recomputed and re-linked) | 0 / 843 |
| Forged move kind | 0 / 843 |
| First two lines swapped | 2, both items whose two lines are textually identical |

Move kinds exercised by the verified chains include:
- `balance-add` ×58, `balance-divide` ×59, `balance-multiply` ×16;
- `implication:square` ×13, `check-candidates` ×13, `candidates` ×8, `candidates-before-domain` ×2;
- `split-*` ×4, `branchwise*` ×5.
