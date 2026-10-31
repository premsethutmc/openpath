# 06 Corpus comparison (frozen corpora, labels untouched)

**Data:** `tools/mathematics/grader-generalization/results/frozen-corpora/`. Every authority result is listed with its replay outcome.

## Authority level (the authority API alone: line authorization, without the engine's completeness gate)

| Corpus | Legitimate certified (M2 → @3) | Invalid detected | First invalid exact | Labelled-unsupported certified | False mathematical accepts |
|---|---|---|---|---|---|
| HELDOUT3 | 131 → **147** / 186 | 82 → **100** / 114 | 100 | 48 → 53 | 0 |
| HELDOUT3 bare | 131 → **142** / 186 | 82 → **91** / 114 | 91 | 48 → 53 | 0 |
| HELDOUT2 | 114 → **135** / 181 | 104 → **117** / 125 | 117 | — | 0 |
| HELDOUT2 bare | 110 → **122** / 181 | 103 → **115** / 125 | 115 | — | 0 |

Every verified chain replays; there are 0 replay failures.

**What the "labelled-unsupported certified" column means.** It counts true derivations whose labels say the grader is not expected to support them. None is a false acceptance.
- The 48 on Milestone 2 are truncated chains and restatements. They are explained in the P2-FINAL report: line authorization is not completeness, and the engine enforces completeness.
- The 5 new ones:
  - `rl-018` … `rl-021`: correct linear inequality derivations, labelled unsupported because inequalities were out of surface when the corpus was written;
  - `td-002`: a truncated substitution chain (`6x² + 9x + 9 = 6×(−5)² + 9×(−5) + 9`).

## Engine level (the unified engine, `run-corpus.ts`; its own statement parser is unchanged)

| Corpus | Legitimate certified | Invalid detected | Labelled-unsupported certified |
|---|---|---|---|
| HELDOUT3 | 57 → 58 | 70 → 70 | 3 → 3 |
| HELDOUT3 bare | 106 → 107 | 82 → 82 | 6 → 10 (`rl-018` … `rl-021`: correct inequalities, as above) |
| HELDOUT2 | 71 → 71 | 100 → 100 | — |
| HELDOUT2 bare | 96 → 96 | 110 → 110 | — |

**Why the engine moves so little.** The engine's own problem parser stops most authored algebra before it reaches the authority. That parser is a P1 / E7 component outside this workstream ("no new grading engine"; activation needs authorization). Opening it would carry the authority gains through, and is listed as an integration decision (09).

## Changes in debatable items (labels untouched)

| Item | Working | M2 → @3 |
|---|---|---|
| `vl-069`, `vl-070` (HELDOUT3) | "Expand and simplify", expansion and collection in one line | unsupported → verified, because the verb is now read. Their own note calls it "arguably a standard transformation" |
| `rl-044`, `rl-045`, `domain-division-by-zero-017` | as in 01 | unchanged |

## Recorded fallback-removal calls

8 of the 39 P2-FINAL calls recorded as "must stay unsupported" are now certified by the generalized rules. Each is listed with the rule that certifies it, and each replays independently. The snapshot test now asserts both facts.

| Statement | Rule that now certifies it |
|---|---|
| `3x = 9, x > -2` | condition `x > −2` parsed; one-step solve; 3 is in the domain |
| `-2x < 6`, `-5x < 20` | divide by a negative number, relation reversed |
| `3x + 2 >= -1` | subtract 2, then divide by 3 |
| `x^2 = 9`, `x^2 = 16` | subtract the whole right side, factorise, zero product |
| `x^2 - 1000000007x + 1000000006 = 0` | exact factorisation with big integers |
| `a^2 - 3b when a = 2 and b = 1` | substitution under bindings |

The list is in `RECOVERED-BY-GENERALIZATION.json`. The other 31 calls keep their recorded class.
