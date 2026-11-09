# Method alignment — bounded milestone, 9 November 2026

Branch: `milestone/method-alignment-2026-11-09`, based on `b4392a84d532e9a85e31d35018b70ee4b0d9c6f4`. No PR or publication authorised. Exact final commit is reported in the workspace handover; the commit containing this document is the milestone. No merge, deployment, content approval, deletion or Grade 8 integration.

## What the learner sees

A learner who has just been shown quadratic first-principles expansion now gets a fresh quadratic guided question and independent check. A radical requiring a conjugate or a rational difference is not silently substituted. Diagnostics can still ask those questions to discover the gap. If no supported fresh question exists, the app pauses for help; this is not mastery. A later independent practice/transfer question also passes the compatibility guard after a migrated lesson.

The real Django/browser test starts with the actual first UI response, without inserting a wrong attempt through the API. It records two wrong diagnostics (quadratic and rational), displays all four `expand_cancel` screens with pending-review status, asks `gen:aqfp:0,3,2,4` guided and `gen:aqfp:0,2,4,-4` independently, and preserves events/decisions and the policy marker on reload. Its student model can solve only quadratic cases after the lesson; it continues to fail untaught methods. This is a synthetic behavior check, not a real-student learning study.

## Shared contract and migration

`packages/learning/src/method-alignment.ts` classifies each generated question's parameters. First principles distinguishes quadratic expansion, rational difference, conjugate, cubic expansion, sine limit and cosine limit. Fractions distinguish common-denominator addition/subtraction and mixed-number conversion. Geometry distinguishes triangle angle sum from the extra isosceles base/vertex method. Other generators' existing `teach.caseOf` can supply a case requirement; an unmapped requirement/lesson stays unknown.

Five explanations in `content/learning/method-alignment.v1.json` have explicit engineering mappings pinned to SHA-256 of their actual screens: three quadratic derivative explanations, triangle `worked_steps`, and unlike-fraction `worked_steps`. Changing the text invalidates the mapping until deliberately reconciled. Existing `applies`/`textFor` still author the instance-specific screens, existing scopes still constrain the selector, and `alignedPractice` still orders candidate questions. Neither a family label nor a matching tag alone asserts educational quality. This mapping is not educator approval.

New teaching records for these five explanations carry `methodAlignment: method-alignment@1:<screen hash>`. Old records without this field remain explicitly legacy: they keep their existing selection/replay behavior and are not relabelled “compatible.” Other lessons remain unmigrated. Hash mismatch and unknown cases fail closed for migrated follow-ups. This is a bounded rollout, not a claim that the whole catalogue is aligned.

Prior-method support requires two distinct, validated, first unaided answers before the lesson, using the existing independence, grading and release policy. Guided/check answers do not bootstrap this prerequisite exemption. For first principles, a final derivative alone is insufficient: the existing authoritative assessment must additionally say the method was examined and the derivation verified. Later independent failure revokes prior support. This is conservative: without such existing evidence, the app does not assume the method is known. Synthetic unit fixtures exercise the verified-working case; the browser makes no claim of producing that working evidence.

Correctness and compatibility are separate. A correct mismatched follow-up stays correct in immutable records, but does not qualify as lesson-follow-up evidence in the planner, skill view or shared ledger. Wrong attempts remain evidence of difficulty. No stored answer, old ID, grading rule or historical record is rewritten. Review and release gates remain pending; research and geometry switches retain their existing default-off behavior.

## Exact build report

Every Year build emits `year/method-alignment-report.json`; standalone: `cd frontend && node --import tsx scripts/method-alignment-report.mts <output.json>`.

Denominator: unique question-ID × explanation pairs, union of configured guided/check IDs and the module's practice/check pools. Answer formats are separate IDs. Scope is five explanations across three competencies, not the full catalogue.

| Explanation | Total | Covered | Incompatible | Unknown |
|---|---:|---:|---:|---:|
| Derivatives / spot_the_mistake | 431 | 119 | 96 | 216 |
| Derivatives / expand_cancel | 431 | 119 | 96 | 216 |
| Derivatives / why_limit | 432 | 119 | 97 | 216 |
| Triangle / worked_steps | 929 | 290 | 107 | 532 |
| Unlike fractions / worked_steps | 882 | 613 | 269 | 0 |
| **Total** | **3,105** | **1,260** | **665** | **1,180** |

Unknown includes sibling families not mapped in this milestone. The old configured radical guided item and rational check remain in content for ID/history compatibility; new selectors replace them, and the report explicitly marks those pairs incompatible. For all five explanations an empty exposure set yields a covered opportunity; marking every candidate seen yields `no-fresh-question` (5/5 exhaustion scenarios). Exhaustion is an opportunity state, not a fourth class of question. Full row-level data is in the build report and saved evidence.

## Verification and remaining limits

- Focused integration: 38 passed, zero failures/skips (11 new alignment tests plus calculus, geometry, historical answer/choice replay, combined maths and adaptive regressions).
- Backend record validation/compatibility: 12 passed, zero skips; legacy records accepted, new marker round-trips, malformed/future markers rejected.
- Teaching/generator/server-grader contracts: 45 passed; final regenerated grader input manifest matches.
- TypeScript checks and test/default Year builds pass. Actual UI/Django path and reload pass, with definite backend verdicts for intentional wrong answers.
- Resolved development failures: test helper called `readRecords` without learner ID; one test supplied a generator-rejected quadratic; an interim grader-manifest mismatch was fixed by regeneration after the source changes. No runtime safety gate was weakened.
- Not run: full repository/hosted CI, physical-device/accessibility audit, fraction/geometry browser journeys on this milestone, exhaustive learner simulations or real educator/student validation. Earlier geometry/calculus teaching work is preserved; this milestone does not expand its prose or approve it.
- Limits: only five explanations migrated; others retain legacy behavior. Complete method-coverage verification of an entire competency is not claimed. Diagnostic success is not evidence that an explanation taught that method. A follow-up's exact arithmetic answer does not demonstrate the quality of its teaching.

Commands: from `frontend`, run `node --import tsx --test src/journey/method-alignment.test.ts src/journey/calculus-teaching.test.ts src/geometry/triangle.test.ts src/learning/historical-answers.test.ts src/journey/maths-integration.test.ts src/journey/adaptive-milestone.test.ts`; `npm run typecheck`; `bun test ../packages/learning/src/teaching-contract.test.ts ../packages/learning/src/teaching-stage2.test.ts ../packages/learning/src/generator-contracts.test.ts`. From root: `.venv/bin/python backend/manage.py test family.test_method_alignment family.test_learning.LearningRecordTests --noinput`; `ESBUILD=frontend/node_modules/.bin/esbuild node tools/mathematics/server-grader/build.mjs`.

Browser: existing real-backend maths-expansion harness with `ALIGNMENT_CASE=1 CASE='calculus teaching: derivative'`, an isolated Year `--test` build, synthetic account and test clock. Reproduction runner, logs, exit codes, screenshots and reports are saved under `/workspace/shared/method-alignment-2026-11-09/`. Test review fixtures are never evidence of educator approval.
