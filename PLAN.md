# Worker 3 (Evidence and progress) plan, baseline 9830b27e

Will write / may edit (owned):
- packages/learning/src/evidence.ts, records.ts, session.ts, grade.ts, foundation-runtime.ts (fixes only, after a failing regression)
- frontend/src/year/* (status label/reason display only)
- new tests: frontend/src/journey/evid-*.test.ts (real SliceSession paths; engine chooses questions)

Will not touch: intervention.ts, skill-units.ts, hypotheses/diagnosis files, content sources, generated files
(library/generated/family-specs/coverage/blueprints/review/explanation-review, backend grader bundle), English, backend/,
.github/, lockfiles, docs/math-skill-connections/README.md, docs/consolidation/*. Selection bugs go to
scratchpad/m112/proposals/evidence-<n>.patch with a reproducer. records.ts:144 assisted-after-review rule is reported, not changed.
No stored event shape changes.
