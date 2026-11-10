# Machine validation (machine-validation@1)

**Why.** "Verified" mastery needs validated questions, and the only route to validated was an educator's release
(`review.ts`). OpenPath has no educators: 0 of 1,428 review entries were approved, so no real learner could ever reach
"verified". Tests reached it only through a test-only fixture.

**What changed.** A second, automated route. A generated question now counts as validated when its family's entry in
`content/learning/machine-validation.v1.json` admits it. The educator route is unchanged and still takes precedence.
Nothing machine-validated is ever labelled educator-reviewed (item label: "Machine-checked … Not educator-reviewed").

## The rule

A family's presentation form (typed, multiple choice) is admitted only when all three hold:

1. **Independent answer key.** The answer-key certification (`tools/mathematics/answer-key-certification`, references that
   never read the generator) checked every question of the family exhaustively.
2. **Unchanged.** Today's questions are byte-identical to the certified ones (`data/certified-content.json`, hashes of
   the export at the certified commit `901c907`).
3. **Grading certified.** `grading-certifications.v1.json` holds the family for that form.

Also:
- Questions the certification classed ambiguous, defective or notation-only are excluded by id (455).
- The everyday-wording form (`:w`) is never admitted: its wording was not checked.
- Quarantined questions and questions outside the release pool are never admitted (`inPool`).
- Hand-written questions have no certification and stay provisional.
- Each entry is locked to the family's fingerprint. Any change to a generator, its options or wording switches the entry
  off until the family is certified again and the registry rebuilt. A stale entry is inert, never wrong.
- Answers given before the registry's `validatedAt` (2026-11-10) do not count, as with an educator release.

## Effect on existing records

A machine-validated question is validated content for the shared engine, so the engine now forms its own picture of the skill
from every answer to it, including answers before `validatedAt` (those can inform, never verify). Two visible effects: the
engine status is no longer "unavailable", and a delayed check is dated from the engine's own demonstration of the skill
(verification@3), which can be later than this surface's first "shown on your own". "Verified" still needs both the engine's
verification and this surface's own delayed check, including a taught skill's own delayed answer (`evidence.ts`).

## What it does not establish

That the teaching is good, that a question suits its grade, or that it measures the skill it is mapped to. Those were
part of an educator's review and are not machine-checked here. Synthetic learners show what the program decides, never
that anyone learned.

## Result (2026-11-10)

Registry: 1,049 of 1,090 families admitted (typed 1,048; multiple choice 817). Held: 41 (31 changed since
certification, 10 added after it). 33 admitted with one form held.

Synthetic learner, every answer right, no review fixture, delayed check after 9 days:

| Release | Skills | Verified | Stops earlier | Person-marked |
|---|---|---|---|---|
| TN Grade 7 | 50 | 36 | 12 | 2 |
| CBSE Grade 7 | 46 | 35 | 8 | 3 |
| TN Grade 8 | 43 | 31 | 11 | 1 |
| CBSE Grade 8 | 48 | 37 | 11 | 0 |

Before this change the Verified column was 0 everywhere. With the test fixture (everything treated as reviewed) Grade 7
reached 48 (TN) and 43 (CBSE), so the "stops earlier" skills are the remaining gap: they need evidence from a form or
family that is not admitted yet (wording forms, changed families, hand-written questions).

## Rebuild

```
bun tools/mathematics/answer-key-certification/export.ts /tmp/exp
bun packages/learning/scripts/machine-validation.ts build /tmp/exp
```

Switch: `useMachineValidation(false)` (on by default). Tests: `frontend/src/learning/machine-validation.test.ts`.

## Next (not done)

1. Re-certify the 41 held families (run the certification in CI, where SymPy can be installed) and snapshot again.
2. Certify the wording forms, so `:w` questions can count.
3. Work the "stops earlier" skills per grade from the table above.
