# Milestone proposal: multiple-choice and everyday-situation forms in the Grade 5 bank

**Status: proposal, awaiting approval.** No code is written until the owner approves the scope and acceptance tests.
Follows `docs/milestones/TN5_VERIFIED_BANK.md` (PR #71) and the bank in PR #72 (`feat/tn5-verified-bank`).

## Why
The learner journeys on the bank found that the shared learning engine claims a skill as shown on its own only with
evidence in two answer formats (for example a typed answer and a multiple-choice answer). The Grade 5 bank holds only
the typed form of each problem, so 28 of 57 skills can never reach that status from bank items, however well a child
does. The other forms already exist in the question families; they are simply not in the bank, and they have not been
verified. This milestone adds them, verified to the same standard.

## Measured starting point (24–25 Oct 2026, on the 60,774 Grade 5 problems)
| Form | Problems that have it | Already fully machine-checked | Partly | Not at all |
|---|---:|---:|---:|---:|
| Multiple choice (4 options) | 51,513 (155 of 192 families) | 35,845 (70%) | 10,361 | 5,307 |
| Everyday situation (word form) | 55,960 (178 of 192 families) | 20,674 (37%) | 17,639 | 17,647 |

182 (family, form) pairs have steps the claims do not yet read. The reason is that most claims read the typed prompt
text; a word-form prompt is worded differently, and a multiple-choice prompt adds "Choose one" and replaces the answer
with an option letter. Unlike the typed form, whose gap closed with 99 claim modules in one working session, the gap
here is mostly re-reading the same mathematics from different wording.

## Scope
Add both forms to the bank file (same fields as today, plus `form`, `options` and the correct option), only for
families and parameters the typed bank already contains. Verify each. No new question content, no other grades or
boards, no change to the learning engine, no learner interface change, no LLM, no deployment.

## Definitions
- **Multiple-choice item verified:** the correct option equals the verified typed answer; every other option differs
  from it under the app's own answer comparison; each recorded wrong-answer explanation points at an option that exists
  and is not the correct one; the steps are the typed form's checked steps.
- **Word-form item verified:** the same as the typed form: every step independently checked, from the word prompt's own
  numbers (not copied from the typed form).
- Items not verified to this standard are excluded from the learner-facing bank and listed by family, not hidden.

## Stages (estimates are guesses until the first stage is measured)
| | Stage | Output | Estimate |
|---|---|---|---|
| M0 | Export both forms, label them, measure the gap per (family, form) | Bank file, gap list, determinism | under a day |
| M1 | Multiple choice: close the 5,307 + 10,361 gap, mostly by letting existing claims read the option-bearing prompt | MC share fully verified | 1–2 days |
| M2 | Word form: re-read each family's word prompt, most common first, parallel agents | Word share fully verified | 2–4 days |
| M3 | Check skills now have two answer types; rerun the 10 journeys; report | Journey report, per-skill form counts | under a day |

## Acceptance tests (proposed)
1. **Skills with two answer types.** Every Grade 5 skill that has a family with a multiple-choice or word form has at
   least two answer types in the bank; skills that cannot (no such family) are listed by name.
2. **Every served item verified.** 100% of bank items carry exactly one label; unverified items are not served.
3. **MC integrity.** For every multiple-choice item: exactly one option equals the verified answer, no two options are
   equal, every wrong-answer explanation points at an existing wrong option. Injected defects (a duplicate option, a
   missing right option, a mis-pointed explanation), at least 500, are all rejected.
4. **Step verification.** Every step of every served item is machine-checked, as in the typed bank, with corrupted
   values never confirmed (at least 100,000 corruptions, zero genuine confirmations).
5. **Answer independence.** The final answer of word and multiple-choice items is tied to the verified typed answer or
   independently re-derived; the re-check sample is at least 10,000 items; disagreements zero; families that cannot be
   re-derived are listed.
6. **Determinism and no regression.** Byte-identical rebuild; all existing tests pass; a re-census of all problems
   shows none labelled worse than before.
7. **Journeys.** The 10 scripted journeys rerun on the larger bank; the journey where a skill is shown on its own with
   two answer types now succeeds for the skills covered by test 1.

## Stop rules
- If M1 cannot get multiple-choice items to the same standard at a reasonable cost, report before starting M2.
- If any acceptance test finds a wrong answer, the affected family and form are pulled from the bank and fixed first.
- Do not merge, deploy or start another milestone without approval.

## Risks and limits
- Word forms can be ambiguous or lose information (a clock in words, a chart described in a sentence); some may be
  excluded rather than forced.
- Items that rest on a picture's own data or a convention stay labelled as such (the owner accepted these on 25 Oct).
- The other engine findings (a failed delayed check cannot be cleared; two lucky answers can look like "shown on their
  own"; mastery needs reviewed content) are not part of this milestone. They need a separate decision.
- Simulated learners test system behaviour only, never educational effectiveness.

## Decisions for the owner
1. Approve this scope and these tests?
2. Do multiple choice first and report before the word forms (recommended), or both together?
3. Parallel agents as before (faster, spends usage faster)?
