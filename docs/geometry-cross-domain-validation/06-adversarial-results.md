# 6. Adversarial geometric reasoning

Authority: the existing geometry authority, unchanged — `unified-math-engine.ts` `assessMathematicalWorking` → `geometry-worker.ts` (`openpath-geometry-worker@2`) → `research/geometry-reasoner`. Cases: `packages/learning/src/geometry-reasoning-g5.ts` (the 12 required cases; R06 and R12 have two variants, 14 runs). Machine-readable: [`reasoning-results.json`](reasoning-results.json). Test: `geometry-reasoning-g5.test.ts` (pass).

**Structured givens only.** Every relation (e.g. "C and D are a linear pair") is given as a predicate. No diagram is read and nothing is inferred from appearance. Each case has an authored oracle (not educator-reviewed).

Outcome classes: `agrees`; `false-acceptance` (verified, oracle invalid/not-established); `accepts-unjustified` (verified a true claim with no reasoning); `false-rejection` (invalid, oracle valid); `abstains` (unsupported, oracle valid); `abstains-on-invalid` (unsupported, oracle invalid).

| Case | Scenario | Oracle | Authority verdict | First invalid step (authority / oracle) | Outcome |
|---|---|---|---|---|---|
| R01 | correct answer, valid reasoning (triangle-sum → straight-line) | valid | verified | — | agrees |
| R02 | correct answer, no working (bare final claim) | unjustified | **verified** (the authority supplies the straight-line justification itself) | — | **accepts-unjustified** |
| R03 | correct answer, invalid reasoning (C = 85) | invalid | invalid | 0 / 0 | agrees |
| R04 | wrong answer, valid partial reasoning | invalid | invalid | 1 / 1 | agrees |
| R05 | first invalid geometric step | invalid | invalid | 0 / 0 | agrees |
| R06 | alternative valid path: vertically opposite | valid | **invalid** ("vertical-opposite does not establish" a measure) | 0 / — | **false-rejection** |
| R06b | the other valid path: straight line | valid | verified | — | agrees |
| R07 | theorem outside the rule set: exterior-angle theorem | valid | **invalid** (no such rule) | 0 / — | **false-rejection** |
| R08 | missing prerequisite (triangle not given nondegenerate) | not-established (formal gap only) | missing-assumption | — | agrees |
| R09 | exterior-angle theorem misapplied (adds the adjacent interior angle) | invalid | invalid | 1 / 1 | agrees |
| R10 | supplementary taken for vertically opposite (B = 120, must be 60) | invalid | **unsupported** | 0 / 0 | **abstains-on-invalid** |
| R11 | diagram-dependent claim (linear pair not given) | not-established | unsupported | — | agrees (not accepted) |
| R12a | valid solution, one order | valid | unsupported | — | abstains |
| R12b | same solution, other order | valid | unsupported | — | abstains |

## Findings

- **No false acceptance.** No false step and no diagram-only relation was verified (R03, R05, R09, R10, R11).
- **Unjustified-theorem rule holds** for wrong or uncited theorems: R07's out-of-rule citation and R09's misapplication are not accepted. But a bare final claim is verified by entailment (R02); this must never count as method evidence.
- **Alternative proofs are not reliably accepted.** R06 (vertically opposite) and R07 (exterior-angle theorem) are valid school proofs reported **invalid**, not unsupported. Root causes: the vertical-opposite rule yields equality of angles but carries no measure; there is no exterior-angle rule. If these verdicts were recorded, valid alternative proofs would count against the learner (see 04).
- **R10** is a provably false step reported only as `unsupported`: safe (not accepted) but not diagnosed.
- **Step order (R12a/b) is not actually tested:** both orders abstain for R06's root cause, so order sensitivity is unknown.
- None of this is connected to learners: geometry working in journeys is `unsupported` (G-07) because the trusted grader does not call this authority.
