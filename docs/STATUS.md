# OpenPath — working-branch status

## Owner rules
- Read this file first; open other files only as needed. Verify refs: this file is branch-local.
- No merge or deploy without explicit owner approval. No educator approval by an agent.
- One bounded milestone at a time; finish, report, stop.
- Report exact commit, passed/failed/skipped tests, defects and readiness. Keep this file under 60 lines.
- Update at milestones; current verified facts only. Publication needs separate authorisation.

Updated: 2026-11-09. Current milestone: shared lesson-to-question method alignment.

## Branches and ownership
- Working branch: `milestone/method-alignment-2026-11-09`; local only, no PR.
- Base: `milestone/teaching-geometry-handoff-2026-11-09` at `b4392a84` (pushed).
- Adaptive PR #120: `08a6d5aa`; combined maths PR #118: `c62320ef`. Both remain drafts.
- Claude owns Grade 8 PR #119 (`feat/grade8-pilot`, observed `33368b8e`); untouched here.
- Grade 7 PR #117 remains its base (`c1db278d`). No Grade 8 changes integrated here.

## Completed bounded milestone
- Five content-pinned explanations now enforce method compatibility for new follow-ups.
- Initial path: quadratic first principles; generality checks: unlike fractions and triangle angles.
- Radical/rational methods remain valid diagnostics, not unearned follow-ups to quadratic teaching.
- Known methods require qualified prior evidence; unknown coverage and exhausted fresh items stop honestly.
- Correct answers stay recorded; incompatible follow-ups do not qualify as lesson-follow-up evidence.
- Old teaching records retain legacy replay; new records carry a versioned method-alignment marker.
- Existing calculus prose, geometry interaction, consent and default-off research switches preserved.
- No content approved. Exact final commit is reported with the milestone handover (`git rev-parse HEAD`).

## Verification
- 38 focused tests pass; 12 backend tests pass; 45 teaching/generator/grader contracts pass.
- Type checks, generated grader, test/default Year builds and `git diff --check` pass.
- Real Django/browser: actual initial UI wrong responses → quadratic lesson → fresh guided/check → reload.
- Build report: 3,105 pairs = 1,260 covered + 665 incompatible + 1,180 unknown; exhaustion stops 5/5.
- No remaining failing check in this bounded milestone. No skips in the executed suites.
- Unrun: full/hosted CI, physical devices, accessibility audit, fraction/geometry browser reruns.

## Readiness and limits
- Ready for owner/code review; not approved for merge, deployment or educational use.
- Only five explanations migrated. Other lessons and historical records remain explicitly legacy.
- Matching methods do not establish teaching quality or complete competency mastery.
- Educator review remains pending; broad Grade 7 coverage/mapping and other grade gaps are not solved here.
- Earlier teaching/geometry/handoff milestone: `docs/teaching-geometry-handoff/README.md`.
- Details, exact denominator, tests and reproduction: `docs/milestones/METHOD_ALIGNMENT.md`.

## Next decision
- Owner reviews this milestone and decides whether to publish the separate branch for hosted CI.
- Do not start another milestone or clean branches as part of this work.
