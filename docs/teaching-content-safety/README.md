# Teaching content safety and evidence integrity (Workstream A2)

Branch `feat/teaching-content-safety`, from `milestone-2/closure-teaching-audit` @ `4a7244f`.

1. [Pipeline audit](01-PIPELINE-AUDIT.md)
2. [Content review schema](02-CONTENT-REVIEW-SCHEMA.md)
3. [Eligibility enforcement](03-ELIGIBILITY-ENFORCEMENT.md) (data: `teaching-decisions-a2.json`)
4. [Four content corrections](04-CONTENT-CORRECTIONS.md)
5. [Misconception evidence policy](05-MISCONCEPTION-EVIDENCE-POLICY.md)
6. [Educator-review packet](06-EDUCATOR-REVIEW-PACKET.md) (18 explanations: every one the audited scenarios reach, before and after the gate, and every changed one)
7. [End-to-end safety tests](07-SAFETY-TESTS.md)
8. [Independent review findings](08-INDEPENDENT-REVIEW.md)
9. [Regression results](09-REGRESSION-RESULTS.md)
10. [Remaining educational-quality gaps](10-GAPS.md)
11. [Readiness recommendation](11-READINESS.md)

## Summary

| | Count |
|---|---|
| Approved explanations (educator) | **0** (no authorised reviewer) |
| Pending review | 1467: 1131 explanations (17 screened ready, 1 corrected, 1113 unscreened) + 336 concept sections |
| Revision required | 43 (38 Milestone 2 screening + 5 from this review, mathematics correct) |
| Demo-only | 5 |
| Blocked | 0 current revisions; 4 blocked revisions (the known-invalid originals) on the blocklist |
| Known unsafe explanations still reachable through teaching | **0** (the 4 are corrected; their old revisions are refused in every mode and on every path) |
| Unsupported misconception-specific interventions still reachable | **0** (gate requires the addressed misconception to be established; 18 scenarios: 0, baseline 4) |

Demonstration mode (the default app) shows pending, revision-required and demo-only content labelled "not approved by an educator";
supervised-evaluation mode (build-time) shows approved content only, so today it teaches nothing and pauses.
