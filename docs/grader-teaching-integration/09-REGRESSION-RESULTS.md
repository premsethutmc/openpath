# 9. Regression results

## The run

- **Final complete run:** commit `5395d2e` (no code changed after it), Sat 31 Oct 2026, 13:08 → 14:44 UTC.
- **Script:** `/tmp/d1run.sh`, sequential, with a fixed clock where the suites use one (`T0`). Outputs are in `/tmp/d1r/final/`.
- **Baseline:** the A3 final run on `4f97427` (`/tmp/a3r/full/`). For the authority corpora, the baseline is P2 `aac35c6`.

## Results

| Suite | Command | A3 baseline (`4f97427`) | D1 final | Introduced failures |
|---|---|---|---|---|
| Learning package: unit, P2 parser, certificate replay, E7 safety, unified engine, working assessment | `bun test packages/learning` | 1666 pass / 44 skip / 0 fail (1710) | **1752 pass / 41 skip / 0 fail (1793)** | 0 |
| Type check: app | `tsc --noEmit -p tsconfig.json` | 0 | **0** | 0 |
| Type check: english | `-p tsconfig.english.json` | 0 | **0** | 0 |
| Type check: mathematics-integration | `-p tsconfig.mathematics-integration.json` | 183 (known debt) | **187** | 0 new kinds. The 4 extra are `TS2307 Cannot find module 'bun:test'`, the known pattern for every bun test file: 2 P2 test files and 2 D1 test files. |
| Django | `manage.py test` | 308, OK (2 skipped) | **310, OK (2 skipped)** (+2 `test_grader_teaching`) | 0 |
| Browser: M1 slice, M2 scenarios, A2 explanations, A3 explanations (desktop + mobile) | `e2e/*.test.mjs` | 2 + 14 + 8 + 24 | **2 + 14 + 8 + 24 pass** | 0 |
| Browser: D1 reference feedback (7 cases × desktop + mobile) | `e2e/d1-grader-feedback.test.mjs` | — | **14 / 14 pass** | 0 |
| Frontend (full) | `node --import tsx --test "src/**/*.test.ts"` | 622 pass / 1 fail (the diagnosis-generalisation test before A3's fix) | **639 / 639 pass** | 0 |
| Content safety, corrections, A3 linear-equations | `content-safety`, `content-corrections`, `linear-equations` tests | 42 / 42 | **42 / 42** | 0 |
| Adaptive policy scenarios (M2 matrix) | `scenarios.test.ts` | 41 / 41 | **41 / 41** | 0 |
| Coverage | `coverage.test.ts` | 17 / 17 | **17 / 17** | 0 |
| Policies | `policies.test.ts` | 5 / 5 | **5 / 5** | 0 |
| D1 integrated journeys | `grader-teaching.test.ts` | — | **16 / 16** | 0 |
| D1 journey traces / A3 journeys / A2 teaching decisions | scripts | — / 8 / 18 | **15 + replay / 8 / 18 generated** | 0 |
| Explanation registry | `explanation-review.ts check` | OK | **OK** | 0 |
| Persistence M1 (slice → Django → fresh client) | `m1-persistence.sh` | OK | **OK** (22 attempts stored, all decided by the server, verdicts match) | 0 |
| Persistence M2 (4 learners, two sessions 8 days apart) | `m2-persistence.sh` | PASS 4 learners | **PASS 4 learners** | 0 |
| P2 final checks (HELDOUT3) | `final-checks.ts` | 0 accepted attacks | **182 chains; 0 own-replay failures; 0 cross-task, truncated, tampered or forged-consistent accepted** | 0 |
| Replay integrity, all 7 corpora | `grader-generalization/scripts/integrity.ts` | 889; 0 accepted (2 swapped-lines, `tr-017`) | **identical** | 0 |

## The two A3 fixes

1. **Diagnosis generalisation** (per-family seeded RNG in `generalisation.test.ts`): 13 / 13 run alone, and it passes inside the full frontend suite (639 / 639). In the A3 baseline full run this was the one failure.
2. **m2-persistence recovery phase** (`verify` accepted in check 4b): `m2-persistence.sh` gives PASS 4 learners.

## Mathematical safety

### Grading parity with A3

- 109,108 decisions were compared.
- Every question in every module list, strategy and authored question was graded with:
  - the right answer, 0, 1, −1, `x = 3`, unreadable input and each modelled misconception value;
  - each of those with no working and with two working lines.
- The decision was compared without the new `working` field.
- **109,096 identical, 0 different.** The 12 extra decisions are the new reference question.

### Frozen corpora (authority, final code; expected labels untouched)

| Corpus | Items | False mathematical accepts | Legit verified | Invalid detected | First invalid exact | Replay failures |
|---|---|---|---|---|---|---|
| HELDOUT2 | 442 | **0** | 135/181 | 117/125 | 117 | 0 |
| HELDOUT2 bare | 442 | **0** | 122/181 | 115/125 | 115 | 0 |
| HELDOUT3 | 477 | **0** | 147/186 | 100/114 | 100 | 0 |
| HELDOUT3 bare | 477 | **0** | 142/186 | 91/114 | 91 | 0 |
| HELDOUT4 | 275 | **0** | — | 90/90 | 83 | 0 |
| HELDOUT5 | 163 | **0** | — | 59/59 | 58 | 0 |
| HELDOUT6 | 222 | **0** | — | 67/91 | 67 | 0 |

- 2,498 verdicts are identical to P2 `aac35c6`: 0 differences.
- The relabel to @4 moved no verdict.

### Invalid working cannot become verified method evidence

`grading/working.test.ts` (in the learning run) covers:

- 6 hand cases on the reference problem;
- **160 generated** `ax + b = c` questions with a false line followed by the right answer.

Every one is graded `correct` for the answer and `invalid` / `method-false-step` for the method, with `replayedLines` 0 and never `method-verified`. Journey D1-04 shows the same in the screen.

### Historical certificate compatibility on the final code

- All 563 chains issued by the pre-B2 authority (`be91d17`, @3) are classified **`historical-version-not-replayable`**: 563 / 563, with none replayed as current.
- `certificate-compatibility.test.ts` passes, including:
  - relabelling an @3 certificate to @4 fails;
  - the meaning-changed chain `2^3x = 64` stays historical.

## Introduced failures

- **Found in the preliminary run (on `7c55293`):** one frontend failure. `engine.test.ts` requires every question in the independent second answer key. The reference question was missing.
- **Fix in `5395d2e`:** the key entry `String((19 - 4) / 3)`.
- **Final run:** none.

## Baseline failures

- None in the final run.
- The only known debt is the mathematics-integration type check: 183 errors at baseline. 4 more errors of the same `bun:test` pattern now come from new test files.
