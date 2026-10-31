# 04 — Independent recheck design

- **Fresh**: each explanation's `check` is a question of the same family as its worked example, never the worked example, and differs from
  it in the answer **and** in the number of x's (no near-copies; asserted for every explanation).
- **Same competency**: every guided and check question is `MATH.algebra.linear-equations`; the trusted grader (`server-grader`) accepts its
  stored answer (asserted).
- **Discriminating**: a misconception explanation's recheck is a question on which that misconception predicts its own wrong answer —
  different from the right answer by at least 2 and from every other misconception's prediction — so a learner who still has it gets it
  wrong for that reason.
- **Alone**: the recheck is asked with no hints (activity `check`, n = 1); the teaching solution is not shown on it.
- **Method evidence**: when the learner writes working, the slice passes it with the generator's own statement of the equation to the
  derivation authority (P2). Plain working ("2x + 9 = 21", "2x = 12", "x = 6") is `method-verified`; lines written as
  "3x + 4 − x = x + 12 − x" are `unsupported` by P2 (no registered move) — recorded, never counted against the learner.
- **Recorded** (journey traces, 05): intervention, displayed, recheck attempted, correct, method evidence, status, verified, recovery
  required, retention.
- **Not success by display**: completing an explanation changes no evidence; verification still needs the delayed check (retention@2).
