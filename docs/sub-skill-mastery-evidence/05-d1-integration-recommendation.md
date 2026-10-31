# 5. Consuming D1's trusted working verdicts: minimum integration changes

## What D1 stores

D1 (`feat/grader-teaching-integration` `adb27a1`, PR #88, not merged):

- The trusted grader's decision carries `working` (`working-assessment@1`): `status`, `methodEvidence`, `completeness`, `firstInvalid`, certificate digests and authority versions.
- Django keeps the whole decision inside the immutable attempt event and in the decision log.
- A client cannot supply it: a record carrying its own decision is refused.

## What E1 already does with it

The projection reads `event.decision.working` directly from stored events. No D1 code is needed to compute it. The fixture `fixtures/d1-working-decisions.json` comes from D1's real grader at `adb27a1`: 7 attempts covering verified, invalid-with-right-answer, bare, unsupported, invalid-with-wrong-answer, and an assisted verified case. Its results:

| Sub-skill | Answers (alone right / wrong; assisted right) | Method |
|---|---|---|
| two-step | 4 / 0; 0 | verified 1, invalid 1 (with a right answer), no-working 1, unsupported 1 |
| variables-both-sides | 0 / 1; 0 | invalid 1 |
| brackets | 1 / 0; 1 | verified 2 (one of them assisted) |

- Stripping the decisions turns every method into `unverified` (working present) or `not-recorded`. None becomes verified.
- A forged verdict (status `verified` with `method-false-step`) is not counted as verified.

## Minimum changes when D1 and E1 meet (none needed for E1 to run; listed for the merge)

1. **No change to the projection's input.** D1's stored decision shape is already read. Keep the schema check (`working-assessment@1`) so an older or foreign record is `not-recorded` and is never treated as verified.
2. **Historical verdicts.** The projection counts a recorded verdict as recorded, so a D1 record from an older authority version is never re-judged. A report that re-verifies should call D1's `replayWorking` and show `historical-version-not-replayable` beside the count, never replace it.
3. **The D1 reference question** `le-ref-3x-19-4` is an authored question with no family, so it maps to no sub-skill and adds nothing. To count it, give authored questions an explicit `subSkill` (or family) field. This is one optional field on `Question`, set in content. Inference is not acceptable.
4. **Optional pass-through.** `records.ts` could copy `decision.working.status` and `methodEvidence` onto `Attempt` as read-only fields. Consumers other than the projection could then read them without the raw events. This is not needed now.
5. **Activation.** Showing the projection to teachers, or using it in any status, is a separate, approved learner-state change. Its prerequisites:
   - the module's delayed-check list must include both-sides and bracket questions (today: `lin` and `auleq` only, doc 3);
   - a decision on whether a right answer with `invalid` method counts toward "shown".
