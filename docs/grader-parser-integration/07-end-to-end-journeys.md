# 7. End-to-end learner journeys

There are two consumers.

- **The engine** (`assessMathematicalWorking`), whose behaviour B2 changes.
- **The learner journey** (`frontend/src/journey/session.ts`). It calls `derivation-interface.authorizeWorking` (P2 plus replay) and `workingEvidence`, and it never reads the engine envelope. B2 does not change `derivation-interface.ts`, the journey, `assessment-policy` or Agent A's adaptive policy.

The table below is the actual output of both paths. The script is in the regression report; the same cases are asserted in `parser-p2-integration.test.ts` (Stages 4 and 8).

| Submission | Task / working | Engine classification | Engine first invalid line | Final answer correct (separate) | Journey authorisation | Learner evidence (`workingEvidence`) |
|---|---|---|---|---|---|---|
| 1 correct multi-step | `Solve 3(x - 2) = 2x + 5` / `3x - 6 = 2x + 5 ; x - 6 = 5 ; x = 11` | verified | — | true | authorized | method-verified |
| 2 correct answer, invalid working | `Solve 2x + 4 = 10` / `2x = 14 ; x = 3` | invalid | 1 | true | invalid | method-false-step |
| 3 valid partial | `Solve 3(x - 2) = 2x + 5` / `3x - 6 = 2x + 5 ; x - 6 = 5` | incomplete | — | — (no final answer) | authorized | method-verified |
| 4 invalid intermediate | `Solve x^2 - 5x + 6 = 0` / `(x - 2)(x + 3) = 0 ; x = 2 or x = -3` | invalid | 1 | false | invalid | method-false-step |
| 5 ambiguous | `Solve 2x = 6` / `x = 6/2/1` | ambiguous | — | — | unsupported | no-method-evidence |
| 6 unsupported but plausible | `Solve x^2 - 5x + 6 = 0` / `x = (5 ± √(25 - 24))/2 ; x = 2 or x = 3` | unsupported | — | true (P2 evidence only; no credit) | unsupported | no-method-evidence |

What this shows:

- **The six cases are distinct at engine level.** Before B2, cases 1–4 and 6 all came back `unsupported`, because the engine could not read `Solve …`.
- **Learner evidence is unchanged.** The journey suite passes 64 / 64, the same as baseline. The engine change cannot produce mastery, misconception labels or teaching eligibility: none of those layers reads the engine envelope. The backend still refuses any client claim of `derivationVerified`.
- **Case 3 shows existing journey behaviour, not a B2 change.** The trusted contract records a valid partial derivation as a verified method with no final answer, and the answer is judged separately by the answer path. The engine reports `incomplete`.
- **A bare stated answer** (`x = 3` alone) is `verified` at engine level, with `derivationAuthority.methodShown: false`. The journey records `no-method-evidence` (answer-vs-method@1). The engine treats the same answer the same way for the bare statement `2x + 4 = 10`, which it already read before B2.

**Browser tests.** The affected route is the engine's statement-text route, which no browser route uses. The journey route is unchanged, so no browser test applies.
