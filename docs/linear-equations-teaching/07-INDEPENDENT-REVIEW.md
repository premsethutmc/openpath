# 07 — Independent review results

A separate AI reviewer (no access to my conclusions; read-only) reviewed the complete sequence twice. **AI screening, not educator
approval.** It recomputed every worked, check and "Not X, but Y" line and every predicted wrong answer, and ran the tests.

## Round 1 findings and what was done

| # | Finding | Kind | Done |
|---|---|---|---|
| 1 | `fix_inverse`: the `added-not-subtracted` text said "4 was added to both sides" — adding to both sides is valid; the wrong answer comes from adding to one side | MATH-DEFECT | **Fixed** in the family (`lin` bug text): "b was added to c instead of taken away: ax = c + b. To remove the + b, take b from both sides" |
| 2 | `bracket-sign` predicted a wrong answer for a **plus** bracket, with meaningless text | IMPLEMENTATION | **Fixed**: predicted only when the bracket holds a minus |
| 3 | rechecks near-copies of the worked example (same answer 11; only the last number different) | IMPLEMENTATION | **Fixed**: a recheck differs from its explanation's worked example in answer and number of x's; no practice/recheck question is close to any worked example, or to another recheck, in the module (asserted) |
| 4 | general explanations not matched to the kind of equation (a two-step learner got `both_sides`) | IMPLEMENTATION | **Fixed** (adaptive ranking): explanations about the kind the learner last got wrong come first, and general explanations of another kind are not offered while one of that kind exists (then a pause) |
| 5 | one-step `balance` after two-step; repeated example; no check | PEDAGOGY | **Fixed**: `balance` first; its two-step screen uses 3x + 4 = 19 with a check |
| 6 | "Now solve one on your own." shown before the worked lines | IMPLEMENTATION | **Fixed**: a final "Your turn" screen in every explanation |
| 7 | `fix_divide_all` claimed dividing first is invalid; odd wrong answer 0; ambiguous guided question | PEDAGOGY | **Fixed**: text "divide every term, or take away b first"; example with a positive wrong answer; rechecks on which the misconception's prediction is unique and ≥ 2 from the answer |
| 8 | `fix_finish` recheck with tiny numbers | PEDAGOGY | **Fixed**: misconception rechecks use 3 or more x's and a clear gap |
| 9 | `two_steps` wording hard for 12-year-olds | PEDAGOGY | **Fixed** ("If you check in a later line, a mistake you made before it will not show up.") |
| 10 | concept section: kept template sections use jargon and a bracket problem early | PEDAGOGY | **Not fixed**: recorded as `revision_required` on the concept-section record |
| 11 | presentation: one long numbered list, same badge on every step, mobile badge squeezes text, em-dash beside minus signs | PEDAGOGY / accessibility | **Partly**: reasons now on their own line (no em-dash); the slice renderer's layout is unchanged (no UI redesign) — recorded as a gap |
| 12 | `number-sign-kept` had no explanation; several explanations not reached by any journey | NOTE | **Fixed**: `fix_number_sign` added; J15 reaches every misconception explanation, J16/J17 the kind-specific general ones |
| 13 | two misconception examples looked alike (both 2x + 4 = …) | NOTE | **Fixed**: each misconception example of a family has its own number of x's |

## Round 2 (re-verification)

Confirmed fixed: 1, 2, 3 (within each explanation), 4 (no defect in the ranking), 5, 6, the new `fix_number_sign` maths. Two further
defects found and **fixed**: the sub-skill recheck could fall back to a question of another kind or none (now: a fresh check of the same
kind, never close to the worked example — test J17), and near-copies **across** explanations (now excluded module-wide — test 1c).

Unresolved pedagogical weaknesses are listed in [10](10-GAPS-AND-READINESS.md).
