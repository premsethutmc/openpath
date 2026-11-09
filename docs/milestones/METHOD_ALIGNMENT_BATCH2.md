# Method alignment: second bounded batch

PR: [#121](https://github.com/premsethutmc/openpath/pull/121), draft, do not merge.
Working branch: `milestone/method-alignment-2026-11-09`; base `milestone/teaching-geometry-handoff-2026-11-09` (`b4392a84`). Initial alignment commit `5412f8e8` is preserved. Claude's Grade 8 PR #119 remains separate. No deployment, educator approval or branch cleanup.

## Why these eight explanations

This batch addresses concrete reversals or extra operations, not a count target:

| Explanation | Actually taught | Unsupported follow-up previously possible |
|---|---|---|
| Isosceles / base | subtract vertex from 180, halve | double a given base angle to find vertex |
| Isosceles / vertex | double base, subtract from 180 | halve the remainder to find base |
| Exterior via third angle | interior sum, then straight-line subtraction | reverse the relation to find a far interior angle |
| Pythagoras / worked steps | subtract squares, square root | add squares for hypotenuse |
| Pythagoras / squares on sides | add the small-square areas, square root | subtract squares for shorter side |
| Fraction multiplication / worked steps | whole number × numerator, keep denominator | divide a whole quantity into denominator parts, then multiply |
| Substitution / why du | quadratic substitution, changed bounds, integral of u² | integral of u or u³ without its antiderivative being shown |
| Substitution / limits table | the same antiderivative plus an endpoint table | treating a limits table as teaching another antiderivative |

Screen hashes and mapping rationales are in `content/learning/method-alignment.v1.json`. All text and question IDs are unchanged. These are engineering compatibility mappings, not educator decisions. The substitution lesson's concrete u³/3 result does not silently license the general power-integration rule. Qualified prior working may supply that missing method; a numeric final integral alone cannot.

The Pythagoras classifier reuses the generator's `teach.caseOf`. The existing `applies`/`textFor` remains authoritative for generated teaching. In particular the `triples` explanation is **not migrated**: its specific scaled 8–15–17 example must not be labelled as every hypotenuse or shorter-side method. No alternate-method proof contract is invented here. Unknown remains explicit.

## Shared behavior retained

The original method contract continues to own compatibility, diagnostic separation, content fingerprints, fresh-question selection, evidence qualification and legacy replay. New records for the eight migrated explanations carry the existing policy marker; old records keep their previous selection behavior. No answer, answer letter, grading rule, stored record or review gate is changed. Research and interactive geometry controls remain default off.

Known first-principles/substitution methods require authoritative assessed working in addition to the existing two distinct, validated, unaided-answer rule. Other case support keeps the existing conservative evidence policy. Latest failure revokes support. Neither eligibility nor a correct answer asserts that a lesson is educationally sufficient.

## Exact denominator

The current report covers **13 pinned explanations across six competencies**. There are **11,188 unique question-ID × explanation pairs**: **3,035 covered, 2,141 incompatible, 6,012 unknown**. Each explanation's denominator is the union of its configured guided/check IDs and the module's practice/check pools; formats count separately. Unknown includes unmapped sibling families, not just malformed questions. This is not a product-wide coverage percentage.

All 13 explanations have a covered candidate with no prior exposure, and all 13 return `no-fresh-question` when every candidate has been seen. Exhaustion is an opportunity state with denominator 13 scenarios, not another per-question class. Every Year build emits the full report at `year/method-alignment-report.json`; the standalone report command is unchanged.

## Checks and evidence

Local focused regressions: 49 pass, zero failures/skips, including 22 method-alignment tests. They check each new lesson's actual guided/check selector, incompatible configured pairs, known prerequisite versus unknown, stale content hashes, no fresh candidate, legacy selection and reload. Existing calculus, geometry, historical answers/letters, combined-maths and adaptive regressions are included.

The real Django browser harness now uses the compatibility contract for its missing-method student model. It starts with actual UI responses, displays pending-review explanations, answers only taught methods, verifies definite backend verdicts, then tests fresh guided/check questions and reload. The derivative and both substitution scenarios run as a dedicated `method-alignment` suite in My Learning Year CI. Existing broad browser suites still run; this does not replace them.

Hosted results must be read for the exact final head in PR #121; initial-head results are not substituted for the expanded branch. Final workflow links, results, local logs, screenshots and full reports are saved in `/workspace/shared/method-alignment-batch2-2026-11-09/` and the PR description.

Not established: educator approval, real-student learning efficacy, physical-device/accessibility audit, all-family method coverage, or a general alternate-solution proof policy. Other explanations remain explicitly unmigrated. New non-calculus routes receive focused selector tests and the existing integrated/Grade 7 CI journeys; no claim is made that every added explanation has a dedicated browser scenario.

Commands from frontend:
- `node --import tsx --test src/journey/method-alignment.test.ts src/journey/method-alignment-batch2.test.ts src/journey/calculus-teaching.test.ts src/geometry/triangle.test.ts src/learning/historical-answers.test.ts src/journey/maths-integration.test.ts src/journey/adaptive-milestone.test.ts`
- `npm run typecheck`
- `node --import tsx scripts/method-alignment-report.mts <report.json>`
- Isolated test Year build, real Django API, then `ALIGNMENT_CASE=1 CASE='calculus teaching' node --import tsx e2e/maths-expansion-browser.test.mts` (runner and environment saved with evidence).
