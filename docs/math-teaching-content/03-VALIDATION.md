# 3. Mathematical validation

Run: `cd frontend && node --import tsx ../docs/math-teaching-content/tools/build.mts ../docs/math-teaching-content` (read-only against the runtime). Results: `batch-1/validation.json` and `batch-2/validation.json`, and per item in each package's `validation.checks`.

**Totals (this revision):** batch 1 has 181/181 instances and 2,440/2,440 pool items; batch 2 has 142/142 instances and 2,395/2,395 pool items. Both totals include the oracle **and every alternative method**.

## What is checked for every instance used (323)

1. **Trusted grader:** `server-grader.ts` `gradeRequest` marks the stored answer `correct`. For multiple-choice items it marks the correct option letter correct, and that letter matches the typed answer.
2. **Every modelled wrong answer** of the item is graded `incorrect` (or is not an option). This shows the misconception screens never present a value the grader would accept.
3. **Independent oracle:** a second solution computed from the **prompt text** (or the question's **figure data object**, for pictographs, bars, grids and tables), never from the generator's parameters or `solve()`, with exact rational arithmetic (BigInt). It must equal the stored answer, and its lines are the worked reasoning shown. Methods by package:
   - fractions: part size or part count;
   - decimals: whole hundredths;
   - area and perimeter: decided from the words "cover"/"round";
   - exterior angle: via the third angle and the straight line;
   - crossing lines: going round;
   - median: sort;
   - identities: polynomial multiplication;
   - dice: enumerating pairs.
4. **Every alternative method** reaches the same answer.
5. **Quarantine:** `question-status` `selectable`. The family matches.
6. **Transfer items** (`:w`) have the same answer as their typed form.

## Whole-pool agreement

The oracle and every alternative method were run on **every applicable generated item** of each family. That is 2,440 items, and all 2,440 agree with the stored answers. This checks the general statements the explanations make: for example "exterior = sum of the two opposite interior angles" on all 400 `ahext` items, and "same top number: smaller bottom is greater" on all 250 same-numerator `adfcmp` items.

## Diagnostic quality checks

- Diagnostic items must be **discriminating**: all modelled wrong answers are distinct from each other and from the answer.
- No target wrong answer may be a number already printed in the question. Bugs whose wrong answer is by nature one of the printed numbers are exempt: picking the other fraction, repeating the given angle, or the middle of the unsorted list.
- Worked examples avoid coincidences: no repeated angle, the denominator stays visible, `p ≠ q`, no angle near 90°, and no wrong value within 3 of the answer.
- Signatures stop the same numbers from reappearing in another role within a package.

## Generators affected (tests run)

No generator or runtime file is changed. The relevant existing suites were run on the foundation tree:

| Suite | Result |
|---|---|
| `generator-contracts.test.ts` | 6 pass, 0 fail |
| `teaching-contract.test.ts` | 14 pass, 0 fail |
| `mathematical-explanation.test.ts` + `question-status.test.ts` | 45 pass, 0 fail |

As instructed for documentation-only changes, the full repository, phone and UI suites were not run.

## Checks added in this revision

- **Response patterns** (TP-NUM-01, TP-MEA-01, TP2-PV-DIGIT, and the cross-family PAT-*): every cell is rendered on the real diagnostic item. A `correct` cell must be graded correct; a `bug:` cell must be a modelled wrong answer on that item, graded incorrect.
- **Learner-facing text through the platform's functions** (05): `teachingEligibility`, plus the same `lessonBlocks` rules with the family as the lesson scope; `contentEligibility` with and without the misconception established; `validateRegistry`.
- **Diagnosability:** `reasoning.ts probeReading` on each misconception example's wrong answer. It must read as `predicted`, or the trigger is marked UNREACHABLE.
- **Delayed-check audit** for the binomial cross term (TP-ALG-01).
- **Reuse within a package:** exposure keys, number signatures (fraction pair, angle, rectangle, coefficient pair, bag, table, grid, number) and, where the answer range allows, answers.

## Affected checks run (this revision)

| Suite | Result |
|---|---|
| `generator-contracts.test.ts`, `teaching-contract.test.ts`, `mathematical-explanation.test.ts`, `question-status.test.ts` (the suites that read the families, the teaching contract and quarantine; no test file in `packages/learning/src` exercises `contentEligibility`/`probeReading` directly, so the build calls them itself) | **65 pass, 0 fail** |

## Not verified (recorded explicitly)

- **Prose quality and age-appropriateness.** Covered by the independent passes in 04. Machine checks cover numbers and claims only. The last author fixes are **not** independently re-cleared (04).
- **Authored transfer text for `fadd`.** Arithmetic is checked; the grader cannot verify it (no generator form).
- **Visual proposals.** No renderer was run; the visuals use existing `Visual` types or are recorded as missing.
- **Method evidence.** There is no working checker for 17 of the 18 families (only `fadd`). Exterior-angle citations are unverifiable (no reasoner rule).
- **Educator approval: none.** Every package is `review-candidate`.
