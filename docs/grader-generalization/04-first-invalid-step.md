# 04 First-invalid-step evaluation

## Contract

`assessChain(statement, lines).evidence` (`openpath-working-evidence@1`) gives one record per line:

| Status | Meaning |
|---|---|
| `certified-equivalence` / `certified-implication` / `certified-candidate-check` / `certified-rewrite` | Authorized and replayable (certificate digest attached) |
| `invalid` | Provably does not follow from the line before. Reason, counterexample, and relation (`implied-by` / `neither`, or `not-equal` for expressions) |
| `unsupported` | Neither certified nor refuted. Reason given (outside the surface, unjustified, ambiguous notation, after an uncertified line) |

The record also carries:
- `firstInvalid`;
- `method` (`certified` / `invalid` / `unsupported`);
- `completeness` (`complete` / `incomplete`);
- `finalAnswer` (`present`, `correct`, `claimed`), judged on its own;
- `progress`: the certified steps, never a score.

**How validity is judged:**
- Validity is judged per transition, relative to the line immediately before. A line that correctly follows from an earlier wrong line is **not** labelled invalid.
- The first invalid line is the earliest provably invalid transition.
- An implication step (squaring, clearing a possibly-zero factor) is not invalid. If the working ends by claiming an extraneous or excluded value, the **final claim** is the first invalid transition.
- Expressions are compared exactly as rational functions, with a counterexample at a rational point of the domain.

## Results

| Set | Invalid items | Detected invalid | First invalid line exact | Reported unsupported (never invalid) |
|---|---|---|---|---|
| HELDOUT5, frozen run (fresh, unseen) | 59 | **59** | **58** | 0 |
| HELDOUT5, Milestone 2 | 59 | 15 | 15 | 44 |
| HELDOUT4, first run (unseen) | 90 | 70 | 63 | 20 |
| HELDOUT4, final (informed by its first run) | 90 | 90 | 83 | 0 |
| HELDOUT4, Milestone 2 | 90 | 49 | 49 | 41 |
| HELDOUT3, authority | 114 | 100 (M2: 82) | 100 | — |
| HELDOUT2, authority | 125 | 117 (M2: 104) | 117 | — |

**Every non-exact first-invalid line is a stated convention difference, not a detection error:**
- **HELDOUT4 (7 items, `dc-010/011/013/016/020/021/035`):** the labels blame the implication step (clearing a denominator or squaring) when an extraneous or excluded candidate is later kept. The authority blames the final claim. The implication step is a valid implication, so the final claim is the earliest *provably* invalid transition. The later HELDOUT5 conventions adopt the authority's reading.
- **HELDOUT5 (1 item, `h5-ineq-016`):** the first line multiplies only the left side of an inequality by 12. It widens the solution set without losing any solution. The label convention treats widening as invalid only at the final line. The authority requires every inequality step to be an equivalence, so it reports line 0, with the gained witness x = 0.

**Per-line relations agree with the SymPy-verified labels:**
- HELDOUT5: 395 / 395.
- HELDOUT4: 568 / 575. The 7 differences are the same convention: the labels treat clearing the task's denominator as `implies`, the authority as `equivalent` within the task's natural domain.

**Final answers, judged independently of the method:** 132 / 132 agree on HELDOUT5.

`correct-answer-invalid-working` (HELDOUT4): **30 / 30** detected invalid (final; first run 23 / 30), against 20 / 30 on Milestone 2. `wrong-answer-valid-start`: 30 / 30 (first run 22 / 30; M2 19 / 30). A correct final answer never hides an invalid step.
