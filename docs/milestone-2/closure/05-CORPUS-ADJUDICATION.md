# 05 — Three corpus adjudications (labels preserved; no P2 rule added)

Corpus files are unchanged (HELDOUT3 sha256 `cb32bb06…deb1a6`, frozen). P2 version `openpath-derivation-authority@2`. For each case, the actual P2 run was recorded: the per-line verdicts, the certificate of the authorized prefix with its independent replay, and the refutation. Raw output is in `adjudication.json`.

| Case | Original task, domain, assumptions | Student derivation | P2 per line | Certificate / replay | Mathematics | Adjudication |
|---|---|---|---|---|---|---|
| rl-044 (HELDOUT3), label "debatable" ("gives only the positive root; claim true but incomplete") | `Solve x^2 = 25`; equation mode; no conditions, no assumptions, so the real numbers (or ℂ; same set here) | `x^2 = 25` → `x = 5` | L1 authorized: identity (digest `6b4dace4308d`). L2 not authorized ("no registered equation move"), and refuted: `loses-solution: x = -5 satisfies the line before but not this one` | prefix replay: ok (re-authorized in the original task context) | x² = 25 ⇔ x = 5 or x = −5. The step concludes x = 5, which x = −5 contradicts: the inference x² = 25 ⇒ x = 5 is false. Read as "5 is a solution", the claim is true, but the line is a solving step in a chain under "Solve", not a membership claim | **invalid** (a false solving step: an incomplete solution set) |
| rl-045 (HELDOUT3), label "debatable" (same note) | `Solve x^2 = 49`; same | `x^2 = 49` → `x = 7` | L1 identity (`a921754e33c8`); L2 refuted at x = −7 | prefix replay ok | same reasoning with ±7 | **invalid** |
| domain-division-by-zero-017 (HELDOUT2), label "debatable" ("divides by x without condition, losing root x=0; second line not equivalent") | `Solve x^2=6x`; same; no condition x ≠ 0 stated | `x^2=6x` → `x=6` | L1 identity (`fefc03d3f9da`); L2 refuted at x = 0 | prefix replay ok | x² = 6x ⇔ x(x − 6) = 0 ⇔ x = 0 or x = 6. Dividing by x without x ≠ 0 loses x = 0. The corpus note itself names this error | **invalid** |

## Why not "unsupported" or "authorized"
- **Not unsupported:** "unsupported" means the authority cannot judge the step. Here it can: there is a certain counterexample under the task's own (absent) assumptions.
- **Not authorized:** no sound move derives `x = 5` from `x² = 25`; authorizing it would accept a lost solution.
- **When "authorized" would be right:** only if the task restricted the domain (for example `x > 0`, or "the side length"). No such condition is stated, and P2 refutes nothing when a task carries conditions.

## Soundness check of the refutation (loses-solution@1)
For each case: the previous line splits over ℚ with exact roots (±5, ±7, and {0, 6}); the refuting root makes both sides of the new line evaluate, and they differ. The rule refutes only in that situation, so no soundness defect was found and no rule was added.

## For the adjudicator
- Recommendation: relabel all three from "debatable" to "invalid". This audit does not do it; the labels stay frozen until adjudication.
- If the corpus should separate an "incomplete solution set" from other false steps, that is a labelling-scheme decision. The E7 shadow path already reports `incomplete` for `x² = 9` → `x = 3`, but P2 has three outcomes only.
