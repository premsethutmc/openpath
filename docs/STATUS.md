# OpenPath — working-branch status

## Owner rules
- Read this file first; verify refs because status is branch-local. Open other files only as needed.
- No merge or deploy without explicit owner approval. No educator approval by an agent.
- One bounded milestone at a time; finish, report exact commit/tests/defects/readiness, stop.
- Keep this file under 60 lines; update at milestones with verified facts.
- Publishing updates to this branch for PR #121 CI is authorised; no force push or branch cleanup.

Updated: 2026-11-09. Milestone: method-alignment expansion and hosted verification.

## Branches and ownership
- Current: `milestone/method-alignment-2026-11-09`; draft PR #121, do not merge.
- PR base: `milestone/teaching-geometry-handoff-2026-11-09` at `b4392a84`.
- Original alignment implementation: `5412f8e8`; its five mappings and legacy replay retained.
- Adaptive PR #120 (`08a6d5aa`) and combined maths PR #118 (`c62320ef`) remain separate drafts.
- Claude owns Grade 8 PR #119, `feat/grade8-pilot` (observed `33368b8e`); untouched here.
- Grade 7 PR #117 (`c1db278d`) remains Grade 8's base. No Grade 8 work integrated.

## Completed local scope
- Eight additional content-pinned explanations; total 13 across six competencies.
- New distinctions: isosceles base/vertex, exterior reversal, Pythagoras add/subtract,
  fraction-times-whole versus fraction-of-quantity, and substitution antiderivative powers.
- New follow-ups require actual taught methods or qualified prior evidence; diagnostics stay separate.
- Unknown mappings and exhausted compatible questions stop honestly; no automatic mastery.
- Numeric substitution answers alone cannot establish examined antiderivative working.
- Old IDs, grading, histories, legacy selection, review gates and default-off features preserved.
- Triples and other unmigrated explanations remain unknown, not silently labelled compatible.

## Verification and exact coverage
- Local: 49 focused regressions pass (22 alignment tests); type checks and isolated Year build pass.
- Three real Django/browser journeys pass: actual UI responses, pending lesson, fresh guided/check, reload.
- New method-limited browser suite is wired into My Learning Year alongside the existing suites.
- Report: 11,188 pairs = 3,035 covered + 2,141 incompatible + 6,012 unknown; exhaustion stops 13/13.
- Hosted full-suite status must be matched to the exact final head: PR #121 Checks and milestone handover.
- Earlier component or initial-head CI does not certify a successor commit.
- Initial CI failures addressed: Node CSS import, local-only Python path, obsolete mixed-method fixtures.
- Geometry/foundation regressions: 19 pass; G-02's mixed delayed check correctly stays pending/unverified.

## Readiness and remaining limits
- Local implementation ready for code review; release/merge/deployment are not authorised.
- Educator review remains pending. Method compatibility is not educational quality or product-wide coverage.
- Not established: real-student efficacy, physical-device/accessibility audit, general alternate-method proof.
- No dedicated browser scenario for every added geometry/fraction explanation; focused selectors are tested.
- Final exact commit, hosted pass/fail/skips and any unresolved defects are recorded in PR #121 and handover.
- Current details/commands: `docs/milestones/METHOD_ALIGNMENT_BATCH2.md`.
- Earlier milestone: `docs/milestones/METHOD_ALIGNMENT.md`; geometry: `docs/teaching-geometry-handoff/README.md`.

## Stop point
- Finish final-head CI and report. No further milestone, cleanup, merge or deployment as part of this work.
