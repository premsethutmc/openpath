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
- The everyday-wording form (`:w`) is admitted only when a wording reference (`wordrefs.py`), reading the wording alone,
  verified every wording of the family, the wordings are unchanged and the form has a grading certification.
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

## Result (2026-11-10)

Registry: 1,093 of 1,094 families admitted (typed 1,093; multiple choice 857; everyday wording 1); 216 of 222 hand-written
questions (the other 6 have set answers, not admitted for hand-written questions).
Held: 10 families. Nine now have an independent reference and every question verified (`aerot`, `agchange`, `ahfibp`,
`aipolyc`, `ajmilr`, `ajsize`, `akhtab`, `lboth`, `lbrk`), but no grading certification yet (rule 3): the grading audit
(`tools/mathematics/grading-audit`) has not been run for them. `aetfig` (picture-based choice) has no reference.

Synthetic learner, every answer right, no review fixture, delayed check after 9 days (#128; not re-run for every skill since):

| Release | Skills | Verified (first registry) | Verified (#128) | Person-marked |
|---|---|---|---|---|
| TN Grade 7 | 50 | 36 | 47 | 2 |
| CBSE Grade 7 | 46 | 35 | 43 | 3 |
| TN Grade 8 | 43 | 31 | 42 | 1 |
| CBSE Grade 8 | 48 | 37 | 48 | 0 |

`MATH.algebra.inequations-intro` (TN 7), the one skill left open in #128, is fixed by the wording reference below.

What moved the numbers after the first registry:
- **Re-certification** (`packages/learning/scripts/recertify.py`, unchanged runner, a status for every question). Where a
  reference cannot read a changed question, that question is excluded, not the family.
- **New references** (`refs/held_2026_11.py`) for nine families added after the certification, and repaired prompt patterns
  for `ajbase` and `linev`: every question verified on the first run.
- **Hand-written questions**: a blind review (prompt and options only, key hidden) agreed with 221 of 222 stored answers.
  The one disagreement, `wm-tri-d1`, had two correct options (SSA with the longer side opposite the angle also fixes one
  triangle); option B was reworded so that it gives two triangles, and the question re-reviewed.
- **eligible@1** (`intervention.ts`): after a delayed check that included a question that is not validated, up to 4 fresh
  validated questions are offered in the same visit, so the check can count.
- **Wording references** (`packages/learning/scripts/wordrefs.py`): the certification never read everyday wordings. A wording
  reference reads the wording alone and derives the answer; a family's `:w` form is admitted only when every wording is
  verified. First family: `aeineqz` (450 of 450). Its typed form is its only other kind of question, so without the wording
  form the shared record could never see two kinds and the skill was never demonstrated (23 useless checks in a row).

## Keeping it current (recert@1)

```
eval "$(backend/vendor-deps.sh --audit)"     # SymPy/mpmath from GitHub tags
tools/recertify.sh                            # export, re-certify changed families, ledger, registry, server bundle
```

CI runs `tools/recertify.sh --check` (workflow My Learning Year): it fails when a family changed since it was certified, or
the committed registry is not what the ledger and today's content build. A family that changed is already inert on its own
(fingerprint lock); the check makes sure it is noticed and re-admitted. Run with Node, as regen@1 does.

Switch: `useMachineValidation(false)` (on by default). Tests: `frontend/src/learning/machine-validation.test.ts`.

## Next (not done)

1. Write a reference for `aetfig` (picture-based choice), the one family still held. Done 2026-11-12: the grading audit was run for the nine answer-verified families and the four ICSE Grade 5 families (`akromr`, `akromw`, `aesym3`, `adline`), 3,872 cases, no blocking finding on either route; their certifications were added with `tools/mathematics/grading-audit/merge-certifications.py`.
2. Repair references for the excluded questions of partly admitted families (`aofund` 64, `afcube` 284, `ahcoef` 226, …).
3. Wording references for more families (one small parser per family); typed-only families first.
