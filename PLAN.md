# Worker 1 (Diagnosis) plan — baseline 9830b27e

Trace wrong-answer journeys (one wrong; repeated modelled error; unmodelled careless error; right except one sub-skill) in:
addition (MATH.number.addition), fractions (fraction-comparison), equations (linear-intro, missing-number), geometry (triangle-properties, angle-pairs).
Check: module reason / lesson introduction, answer-feedback@1, recovery target, chosen support.

Files I may write:
- new `frontend/src/journey/diag-*.test.ts` (reproducers, failing on baseline)
- owned fixes only: `packages/learning/src/{reasoning,hypotheses,answer-feedback,recovery,misconception-evidence,skill-connections,graph}.ts`,
  `content/learning/competency-additions.v1.json`, `content/learning/graph-audit.v1.json`
- `PLAN.md`
- patch proposals for non-owned files (intervention.ts etc.) under scratchpad `m112/proposals/diagnosis-<n>.patch`

Will not touch: intervention.ts, teaching sources, evidence/records/session, generated content files, English, backend, .github, lockfiles,
docs/math-skill-connections/README.md, docs/consolidation/*. No push, no PR, no merge.
