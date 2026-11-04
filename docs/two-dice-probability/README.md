# Two-dice probability: TP-PRO-01 candidate (pending educator review)

| | |
|---|---|
| Branch | `feat/two-dice-probability` |
| Base | `integration/fractions-learner-handoff` at `c43b0ee783a6dd6cc66f4bae184b3041e20fe0a5`, the latest integration candidate on 2026-11-04 |
| Package source | `feat/math-teaching-content@4e655e737607bcf9d941193538de7479a40c4fe6` (TP-PRO-01, with the corrected recheck `gen:akdice:4,5,0,5`), read only |

**Status.** Nothing here is approved or served:

- The candidate explanations are pending educator review.
- They are **not connected** to the generated library. That needs one shared-engine change and a regeneration, which belong to the integration worker (see "For the integration worker").

## What already existed (base `c43b0ee7`)

| Piece | State |
|---|---|
| Generator `akdice` (`packages/learning/src/fam/b11.ts:803`) | Served. Covers spinners and dice with 3–6 faces, and totals, "k or more" and "second bigger" events. Modelled errors: `totals-equally-likely`, `added-sides`, `order-ignored` (equal sizes only), plus two for other event types. Phase partitions: diagnostic 13, practice 81, check 34, retention 32. Its teaching table visual is the generator's own. |
| Module `MATH.probability.sample-space` | Synthesised from the `akss` template (counting stages). `akdice` is a **pool family**: one chapter screen, one practice item, one transfer item, and one delayed item (`3,6,1,4:mc`, "k or more"). It has **no dice explanation**. |
| Real path before this branch | Two matching wrong answers establish `totals-equally-likely` (or `order-ignored`). The module then answers `unavailable`: no explanation, no recheck. A single wrong answer establishes nothing; OpenPath investigates with another question. |
| TP-PRO-01 package and `docs/math-teaching-content/` | Only on `feat/math-teaching-content`. Not on the candidate. |
| Related, out of scope | `andice` ("probability with two dice", `MATH.probability.classical`, `sums-equally-likely`) has the same gap: the error is established, and the module is `unavailable`. |

## What this branch adds

- **`content/learning/src/two-dice-candidate.mts`**: two scoped explanations for the existing module, built from the package.
  - Every number is computed from the instance by listing the pairs. None is typed.

  | Explanation | Addresses | Shown example | Guided | Recheck |
  |---|---|---|---|---|
  | `akdice_fix_totals`: "Count the pairs, not the totals" | `totals-equally-likely` | `6,6,0,7` (dice, total 7). Screens: what went wrong ("not 1/11, but 1/6"); why 7 beats 2 (the 6 × 6 table; total 2 = (1, 1), 1 pair, 1/36; total 7 = six pairs, 1/6; "6 times as likely"); solved correctly. | `5,5,0,7:mc` (package) | `4,5,0,5`, the corrected recheck of 4e655e73 |
  | `akdice_fix_order`: "The two dice are different: order matters" | `order-ignored` | `6,6,0,9`: (3, 6) and (6, 3) are different rolls; red/blue dice counter-check | `5,5,0,9:mc` (package) | `6,6,0,3` (package) |

  - Both are scoped to `akdice` with `params[2] = 0` ("the total is exactly k"), the package's stated scope.
  - The package's third screen, `added-sides`, is not added. It is outside the requested focus (equally likely pairs, 7 vs 2), and it remains a gap for akdice: the template's `spot_the_mistake` is scoped to akss.
- **`frontend/src/journey/two-dice.ts`** (test fixture). `composeTwoDice` applies the library's append-only template-extension rules, plus freshness@2 for the recheck:
  - the base is unchanged;
  - ids are unique;
  - instances are explicitly scoped;
  - no reserved exposure is reused;
  - guided comes from practice and the check from the check partition of the scoped family;
  - the declared scope is valid.

  `installForTest` swaps the composed module into the loaded list and registers `pending_review` records (demonstration only) in a test registry.
- **`frontend/src/journey/two-dice.test.ts`**: 8 tests, listed below.

## Demonstrated learner path

The path runs through the real grader, session, engine and replay, for both misconceptions:

1. A wrong answer that matches the error (`4,5,0,7` → 1/8).
2. **No proof yet.** No hypothesis; OpenPath asks an investigating question.
3. A second matching answer: the error is established.
4. The candidate explanation is shown, labelled *"Demonstration: this explanation has not been approved by an educator"*. It is refused in supervised evaluation.
5. Guided `5,5,0,7:mc`.
6. **Fresh check** `4,5,0,5` (totals) or `6,6,0,3` (order):
   - in scope;
   - not an exposure already presented;
   - not a relabelled problem;
   - the target error is still possible on it.
7. A right answer: **resolved**.
8. Save (JSON of the events with the server decisions) and reload (`learnerState` over the saved events, and a restarted `SliceSession.fromEvents`): identical next step.

Browser/Django was **not** demonstrated. The served library does not contain the explanations until the integration worker regenerates it.

## Gaps found (not fixed here: shared engine)

1. **Library builder** (`packages/learning/src/library.ts` `synthesise`):
   - A template extension may only scope a strategy to the module's main family. Guided and check items are also drawn from the main family's partitions.
   - Reproducer: `cd frontend && node --import tsx ../docs/two-dice-probability/reproducer.mts` → `library@2: akdice_fix_totals: template additions require explicit scoped instances`.
   - Proposed change: `library-scope.patch`, 2 lines. It allows any pool family and draws guided/check from the scoped family. The declared scope is still checked by `strategyScopeProblems`.
   - Verified locally, then reverted: with the patch, the existing template is preserved byte for byte, and the synthesised strategies equal this branch's composition.
2. **Recheck selection** (`hypotheses.ts` / `moduleState`). Scenario: the explanation's own check was already met (the learner answered `6,6,0,3` earlier, then is taught `order-ignored`):
   - `learnerState().module` offers `5,5,0,3`, which is the guided `5,5,0,9:mc` **relabelled** (5 + 5 + 2 − 9 = 3: the same pairs counted). That breaks freshness@2. The engine's freshness uses exposure keys only.
   - The app's call (`moduleState` with the learner's evidence, `SliceSession.next`) offers `gen:akss:2,3,2,2`, a counting-stages question **outside the declared scope**. It cannot resolve the error, and the relabelled `5,5,0,3` follows.
   - Pinned by the test "GAP (pinned, shared engine) …".
   - Between the practice and check partitions alone there are 10 such mirror pairs, e.g. `5,5,0,9:mc ~ 5,5,0,3` and `3,5,0,7:mc ~ 3,5,0,3:mc`.
3. **Delayed check and recovery not connected.**
   - Eight days later, the delayed check asks `gen:akss:1,2,5,2` (counting stages).
   - The module's only dice delayed item is `3,6,1,4:mc` ("k or more"), outside the taught scope.
   - A failed delayed check goes to prerequisite support (`MATH.probability.experimental`), not back to the dice skill.
   - So there is **no fresh delayed check of the taught dice skill**, and no recovery to it. Pinned by "GAP (pinned) …".
4. **One non-discriminating item.** On `5,6,0,9`, the equally-likely-totals value equals the true value (3/30 = 1/10), so the error cannot be seen there. The candidate never uses it; the test skips it explicitly.

## For the integration worker (regeneration)

These are shared files, so they were not edited or regenerated here:

1. Apply `library-scope.patch`, or an equivalent.
2. Add the blueprint to `content/learning/blueprints.v1.json`:
   - `extendsTemplate: true`;
   - `competency: MATH.probability.sample-space`;
   - `family: akss`;
   - `strategies: candidateStrategies()` from `two-dice-candidate.mts`. The reproducer builds exactly this object.
3. Regenerate `library.v1.json`, the explanation-review sync (two `pending_review` records, as in `pendingRecords`), and the grader bundle/manifest.
4. Then `two-dice.test.ts` can drop `installForTest`, and the "not connected in the loaded library" assertion should flip.
5. Gaps 2 and 3 need an engine decision: freshness@2 problem keys in recheck selection, and scoped delayed checks.

## Tests

| Test | Checks |
|---|---|
| Outcomes vs stored answers | All 80 "total is k" pool items, counted pair by pair, agree with the stored answer and with the trusted grader |
| 7 vs 2 screens | The screen lines are exactly the listed pairs and probabilities; every "not X" value is the modelled wrong value; every final line is the stored answer |
| freshness@2 keys | Mirror totals and `:mc`/`:w` forms; 4,5,0,4 = 4,5,0,7 relabelled |
| Composition | Append-only; refuses a duplicate, a reserved exposure, a reused check, an out-of-partition check, and a relabelled check (`5,5,0,3`) |
| Real path × 2 | `totals-equally-likely`, `order-ignored` |
| Gaps pinned × 2 | Delayed check and recovery; out-of-scope or relabelled recheck |

## Integration on the #106 candidate (branch `integration/geometry-dice-107-108`)

- **Library builder**: `library-scope.patch` is not applied. #107's change to `synthesise` (the scope may name any pool family of the
  module, of the same competency; guided and check come from the scoped family) already covers it; `reproducer.mts` now synthesises.
- **Gaps 2 and 3 are fixed in the shared engine** (skill-units@1, freshness@2): the recheck after a scoped explanation is a fresh
  question inside the declared scope, never the same problem relabelled (`akdice` declares `problemKey`: the mirror total is the
  same problem) and, for a fix, one where its misconception would still show; a delayed check after the dice skill was taught
  includes a fresh "total is exactly k" question, and a wrong one recovers on the dice skill. The two "GAP (pinned)" tests are now
  positive tests.
- **Not connected (blocked): the blueprint is not registered and the library does not serve these explanations.** Both are
  misconception fixes whose first screen states the error as what happened ("what went wrong: not 1/11, but 1/6"). `akdice`
  declares no contrast evidence (`bug.evidence.correctContrasts`) for `totals-equally-likely` or `order-ignored`, so two matching
  answers are a suspicion, not a fact (contrast-wording@1). Serving them needs an educator/content decision: declare contrast
  evidence for these errors, or write general (not misconception-specific) dice teaching. The fixture (`installForTest`) still
  demonstrates the engine path; nothing here is approved.

## General teaching connected (branch `integration/dice-general-teaching`, product owner's decision 2026-11-04)

Decision: general dice teaching now; contrast checks can improve diagnosis later. `two-dice-candidate.mts` now builds two GENERAL
explanations (no `addresses`, no "what went wrong" screen, nothing about why a learner answered as they did), reworded from TP-PRO-01:

| Explanation | Teaches | Guided | Recheck |
|---|---|---|---|
| `akdice_pairs` "Two dice: count the pairs" | the 6 × 6 = 36 ordered pairs, all equally likely; total 2 (1 pair, 1/36) against total 7 (6 pairs, 1/6); solved step by step | `5,5,0,7:mc` | `4,5,0,5` |
| `akdice_order` "Red die, blue die: every order counts" | (a, b) and (b, a) are different cells of the table; the ordered pairs for the total; solved | `5,5,0,9:mc` | `6,6,0,3` |

Registered by `content/learning/src/two-dice-register.mts` (template extension of `MATH.probability.sample-space`, scoped to `akdice`
"total is exactly k"); library and explanation-review registry regenerated (two `pending_review` records). Demonstration content: not
educator-approved; refused in supervised evaluation. The test-only composition/installation (`composeTwoDice`, `installForTest`) is
removed. Phone finding fixed: see `docs/math-skill-connections/README.md` §15.
