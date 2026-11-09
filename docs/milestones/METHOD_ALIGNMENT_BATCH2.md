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

Initial hosted verification exposed inherited integration failures: Node rendering tests imported geometry CSS, a backend parity test assumed a local `.venv`, and geometry fixtures expected unrelated post-lesson credit or a completed mixed-method delayed check. Styles now enter through both app stylesheets (Year/review and curriculum); CI provisions Python dependencies and the parity test supports the configured interpreter. The foundation fixture establishes unrelated knowledge before teaching. G-02 explicitly preserves fresh angle-sum success and replay while requiring the mixed delayed check to remain pending and unverified. These are not removed assertions or content approvals. The 19 targeted geometry/foundation regressions pass.

The existing long calculus browser journeys also assumed every return was retention. All three now test the real method-gap pause and subsequent fresh diagnostic re-entry: visible starting-point wording, genuinely incorrect backend verdict, no retention relabelling or automatic verification, and unchanged saved events/decisions after reload. They pass locally in addition to the three initial-UI method-limited journeys. Unmigrated lessons retain the existing delayed-check/failure/recovery assertions.

The complete maths-expansion browser harness passes all nine cases locally: those three calculus paths plus limits, inequalities, trigonometric equations, geometric sequences, continuity and any-angle trigonometry. The latter six still exercise an actual failed delayed check and fresh recovery, including alternate teaching where the engine selects it.

Hosted Year browser verification exposed one further obsolete assumption in its released-content fixture: a Grade 12 learner was expected to receive arbitrary fresh questions and become verified after substitution teaching. The actual UI correctly paused for missing methods. The focused three-learner case now passes against an isolated real Django database: Grade 10 factorisation and the unfamiliar Grade 9 textbook still reach delayed verification; Grade 12 explicitly pauses despite synthetic content release, preserves all records across reload, returns to a fresh diagnostic question with a genuinely incorrect backend verdict, and remains unverified. Synthetic reviewer roles/releases exist only in test databases; real educator approval stays pending. `year-focused.log` and `year-screens/` contain the evidence.

Not established: educator approval, real-student learning efficacy, physical-device/accessibility audit, all-family method coverage, or a general alternate-solution proof policy. Other explanations remain explicitly unmigrated. New non-calculus routes receive focused selector tests and the existing integrated/Grade 7 CI journeys; no claim is made that every added explanation has a dedicated browser scenario.

Commands from frontend:
- `node --import tsx --test src/journey/method-alignment.test.ts src/journey/method-alignment-batch2.test.ts src/journey/calculus-teaching.test.ts src/geometry/triangle.test.ts src/learning/historical-answers.test.ts src/journey/maths-integration.test.ts src/journey/adaptive-milestone.test.ts`
- `npm run typecheck`
- `node --import tsx scripts/method-alignment-report.mts <report.json>`
- Isolated test Year build, real Django API, then `ALIGNMENT_CASE=1 CASE='calculus teaching' node --import tsx e2e/maths-expansion-browser.test.mts` (runner and environment saved with evidence).
