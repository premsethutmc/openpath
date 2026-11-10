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
2. **Unchanged.** Today's questions are byte-identical to the certified ones (the certification ledger,
   `content/learning/certified-content.v1.json`: per family, content hashes, the ids not verified, and where it was certified).
3. **Grading certified.** `grading-certifications.v1.json` holds the family for that form.

Also:
- Questions the certification did not verify (ambiguous, defective, notation-only, or the reference could not read them) are
  excluded by id (1,246).
- The everyday-wording form (`:w`) is never admitted: its wording was not checked.
- Quarantined questions and questions outside the release pool are never admitted (`inPool`).
- A hand-written question (222 exist) is admitted when an independent reviewer re-derived its stored answer from the prompt
  and options alone, with the key hidden, and it is unchanged since (content hash). Only integer, choice and fraction
  answers are admitted; no grading audit covers hand-written questions, so rule 3 does not apply to them.
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

## Result (2026-11-10, after re-certification)

Registry: 1,078 of 1,090 families admitted (typed 1,077; multiple choice 842); 215 of 222 hand-written questions.
Held: 12 families (10 added after the certification, with no independent reference yet: `aerot`, `aetfig`, `agchange`,
`ahfibp`, `aipolyc`, `ajmilr`, `ajsize`, `akhtab`, `lboth`, `lbrk`; 2 whose reference cannot read the changed questions:
`ajbase`, `linev`). Hand-written held: 6 set-answer questions, and `wm-tri-d1`, which has two correct options.

Synthetic learner, every answer right, no review fixture, delayed check after 9 days:

| Release | Skills | Verified (first registry) | Verified now | Person-marked | Open |
|---|---|---|---|---|---|
| TN Grade 7 | 50 | 36 | 47 | 2 | 1 |
| CBSE Grade 7 | 46 | 35 | 43 | 3 | 0 |
| TN Grade 8 | 43 | 31 | 42 | 1 | 0 |
| CBSE Grade 8 | 48 | 37 | 48 | 0 | 0 |

Before machine validation the Verified column was 0 everywhere. Open: `MATH.algebra.inequations-intro` (TN 7): the shared
record never demonstrates the skill although every answer is right (one typed-only family); not yet investigated.

What moved the numbers after the first registry:
- **Re-certification** (`packages/learning/scripts/recertify.py`, unchanged runner and references, a status for every
  question): 29 of the 41 held families now have verified questions. Where a reference could not read a changed question,
  that question is excluded, not the family.
- **Hand-written questions**: a blind review (prompt and options only, key hidden) agreed with 221 of 222 stored answers.
- **eligible@1** (`intervention.ts`): a delayed check could include a question that is not validated (a wording form, a held
  family); the check passed on this surface but could never count, and the skill stayed "shown on your own" with nothing
  more to do. After such a check, up to 4 fresh validated questions are offered in the same visit.
- Wording forms (`:w`) were not the blocker and are still not admitted.

## Rebuild

```
eval "$(backend/vendor-deps.sh --audit)"                                  # SymPy/mpmath from GitHub tags
bun tools/mathematics/answer-key-certification/export.ts /tmp/exp
python3 packages/learning/scripts/recertify.py --data /tmp/exp --out /tmp/recert --family f1,f2
bun packages/learning/scripts/machine-validation.ts ledger-add /tmp/exp /tmp/recert recert:<commit>
bun packages/learning/scripts/machine-validation.ts build /tmp/exp
ESBUILD=<esbuild 0.28.2> node tools/mathematics/server-grader/build.mjs      # evidence.ts is in the server bundle
```

Switch: `useMachineValidation(false)` (on by default). Tests: `frontend/src/learning/machine-validation.test.ts`.

## Next (not done)

1. Write independent references for the 10 new families; repair the references for `ajbase` and `linev` and for the
   excluded questions of partly admitted families (`aofund` 64, `afcube` 284, `ahcoef` 226, …).
2. Fix `wm-tri-d1` (option B also fixes exactly one triangle); investigate `inequations-intro`.
3. Run the re-certification in CI so a changed family is re-admitted without manual steps.
