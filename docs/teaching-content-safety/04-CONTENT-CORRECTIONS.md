# 04 — The four content corrections

Each corrected explanation is a **new revision, not approved**: the doubling correction is `pending_review`; the other three are
`revision_required` after the independent AI review ([08](08-INDEPENDENT-REVIEW.md)): their mathematics is now correct, their teaching
still needs work an educator should direct. Its defective revision stays in the registry as `blocked`
(restoring that text restores the block). Regression tests: `frontend/src/journey/content-corrections.test.ts`; rendering:
`frontend/e2e/a2-explanations.test.mjs` (desktop 1366 × 800 and mobile 390 × 844; screenshots in `screenshots/`).

| # | Explanation (id) | Source | Defect (blocked revision) | Correction (pending revision) | Independent verification |
|---|---|---|---|---|---|
| A | `MATH.number.multiplication-tables#doubling` | `content/learning/modules.v1.json` (hand-written module) | “Start from 7 × 2 = 14 and double three times: 28, then 56.” From 14 the method doubles **twice** (the worked lines 7 × 2, 7 × 4, 7 × 8 were right). | “So 7 × 8 is 7 doubled three times: 7 → 14 → 28 → 56. If you already know 7 × 2 = 14, double twice more: 28, then 56.” Title (“Double, double, double”) and worked lines unchanged. | chain 7 → 14 → 28 → 56 each × 2; three doublings from 7, two from 14; 7 × 8 = 56; each worked line evaluated |
| B1 | `MATH.algebra.missing-number#worked_steps` | family `acmissing` teaching hint `teach.method` (`packages/learning/src/fam/b03.ts`) → `library.v1.json`, `family-specs.v1.json` | rule “Do the opposite to the other number” gives 27 + 9 = 36 for 27 − □ = 9 (the answer is 18) | general inverse-operation rule for each kind of sentence: added to the box → take away; taken away from the box → add back; box multiplied → divide; **box taken away from a number → the gap: the first number take away the answer**; then check by substitution | the rule *as stated* applied to every question of the family in every phase pool (all four kinds of sentence), compared with the checked answer and verified by substituting back; 27 − □ = 9 → 18 |
| B2 | `MATH.algebra.missing-number#check_what_it_uses` | same method text, quoted (“Then the method is: …”) | same rule | same correction | same |
| C | `MATH.number.rational-numbers#spot_the_mistake` | template code `packages/learning/src/library.ts` (`fromTemplate`, spot_the_mistake) | the quoted question was cut to “Work out 2/5 ×”: the note-stripping pattern ` \(.*\)$` was greedy and removed “ (−7/9). (A fraction is fine.)” | pattern now removes only a final parenthetical **note** (balanced, ending in . ! or ?): “Work out 2/5 × (−7/9).” — recovered from the question definition `gen:ajrq:2,5,-7,9,2`, not invented | 2/5 × (−7/9) = −14/45 computed separately; quoted wrong answer 14/45 is the sign error the family models; displayed line “Not 14/45, but −14/45” |

## The same template defect elsewhere

The pattern fix changes two other generated “spot the mistake” explanations outside the 17 audited competencies. They are content
changes, so each has a new pending revision and is in the review packet:

- `MATH.reasoning.propositional-logic#spot_the_mistake` — **the same defect**: “How many rows of the truth table of” → “How many rows of
  the truth table of (¬q → ¬p) ↔ ¬r are true?”
- `MATH.measurement.standard-mass#spot_the_mistake` — not a defect: the conversion note “(1 kg = 1000 g)”, which has no full stop, is now
  kept in the quoted question (only notes that end a sentence inside the brackets, such as “(A fraction is fine.)”, are removed).

Test C′ checks every “spot the mistake” explanation in the library (all modules): the quoted question is the question's own prompt, or that
prompt without a final bracketed note.

## Side effects (expected, recorded)

- `acmissing` family fingerprint `0ddb8c4f → 87f5465d` (teaching hints are part of a family specification): its review@2 entry was a
  draft and stays a draft; nothing was approved.
- The changed modules' review@2 module hashes change (all drafts).
- Unrelated generator drift seen when regenerating at baseline (three family fingerprints and `generated.v1.json`) was **not** committed.
