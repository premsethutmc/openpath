# Runtime assessment of Claude handover ee03d92

Claude's docs-only branch was inspected without merging or editing it. This note owns runtime integration decisions, not teaching content authorship.

## Local explanation repairs

`aedecc` no longer asserts that the digit string 03 is greater than 5. Feedback compares tenths. `ahid` now prints signed middle-term multiplication, signed products in the missing-double explanation, and the negative constant of a difference of squares as −b². Unit leading coefficients render as x².

All 2,916 accepted decimal parameter tuples and 333 identity tuples retain their answers and bug IDs/predictions (SHA-256 baselines in the regression test). Both families pass validateFamily. Four focused tests pass, including polynomial invariants at four x values across all identity tuples and the learner-facing rendered multiplication. The relevant Node test aggregate passes 42/42. A mistaken Node invocation of the Bun-only teaching-stage2 suite failed to load bun:test; that suite was not run successfully locally. Mathematics integration TypeScript passes after the final renderer change. Independent review identified a second rendering path that dropped the third factor; the shared multiplication fallback now renders all factors, and review found no remaining mathematical blocker.

Generated dependency mapping: only these two family specifications and server-table fingerprints change. The existing builders produced identical stored lesson explanation hashes for the two affected competencies; library and explanation review revisions therefore remain unchanged. All diagnostic/practice/check/retention IDs are unchanged. Targeted regeneration used familySpec/validateFamily, rebuilt each family's answer table and asserted it matched before updating fingerprints. All other family rows and answer tables are unchanged. The trusted grader bundle was rebuilt (212 inputs); bundle and all input hashes verified. Existing family approvals referencing 4d750dcd or 09bb7499 are stale against cc507e15 and e54c66e1. No approvals or review history were rewritten. These fixes require review before release.

## Next implementation batch

1. Extend the existing template/blueprint composition path to create selectable general/fix strategies for non-primary families. Use existing strategy selection, review eligibility, guided/check alignment, displayed-example exclusion and recovery ownership. Chapter-only supplementary screens do not establish a complete teaching chain.
2. Add explicit contrast evidence requirements to diagnosis contracts. Repeated same wrong answers alone must not establish a cause when another cause predicts them. For fraction comparison, require a correct same-denominator contrast before attributing same-numerator errors to bigger-bottom-bigger. Keep area/perimeter instances of two-sides in separate task scopes.
3. Validate teaching-package phase membership, parameter predicates, freshness, quarantine and trusted checker capability before registration. Use existing positive-square middle retention candidates rather than silently moving a check item into diagnosis or reusing negative-square coverage. Preserve old evidence and partition version if repartition becomes necessary.

No broad runtime import is appropriate yet. Proposal kind must resolve to conceptual or procedural and screens to complete text. No full-expansion working contract exists for coefficient-fill ahid; retain answer-only grading. Like-fraction story transfer text remains ungraded, above-one diagnostic sums need content, exterior-angle theorem citation remains unsupported (straight-line plus triangle-sum route is supported), and crossing-line mode 2 lacks a geometry task. Prerequisite anomalies require curriculum review, not automatic graph changes.

## Reusable staging schema requirements

For each proposed package provide competency, family, explicit parameter scope/subskill, actual strategy kind, resolved screens and worked instance IDs, guided IDs, fresh check IDs, retention IDs, original partition for each ID, competing hypotheses and required contrast outcomes, mathematical verification and provenance. Include required checker type and limitations. Reviews must name exact resulting content hashes; drafts confer no approval. Continue authoring under Claude-owned docs/math-teaching-content/ only.

Actual ahid release-pool counts (positive-middle / negative-middle): diagnostic 6/4; practice 23/19; check 13/11; retention 3/11. Thus positive-middle retention is absent from the proposal, not the entire underlying pool. gen:ahid:0,4,9,1 belongs to check, not diagnosis. Counts are released-pool candidates, not approved teaching packages.
