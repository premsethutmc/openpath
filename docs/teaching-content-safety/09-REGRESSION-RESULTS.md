# 09 — Regression results

## Targeted runs (during development)

| Run | Result |
|---|---|
| content-safety (0–14, 3b) + content-corrections | 21/21 |
| rendering of corrected explanations (desktop + mobile) | 8/8 |
| scenarios / policies A, B, C / coverage / slice | 41/41, 5/5, 17/17, 6/6 |
| teaching-decision re-run (18 scenarios) | 21 explanations: 15 justified, 6 general, 0 misconception-specific without its misconception |
| Django `family.test_content_review` after the review@2 hash update | OK |
| grader bundle rebuilt with the same esbuild toolchain (baseline rebuild is byte-identical to the committed bundle); token diff of old vs new bundle: only the corrected teaching text | as expected |

A first complete run found two regressions, both fixed before the final run: the review@2 registry still held the `acmissing` family's
old fingerprint (Django `test_the_server_hashes_content_exactly_as_the_app_does`), and importing the content gate from `main.tsx` pulled
the family sources into the root typecheck (the build-time mode is now read inside `explanation-review.ts`).

## Complete run (final state)

| Suite | Result | Milestone 2 closure |
|---|---|---|
| learning package (bun; includes E7 integration gate, P2 authority, generator contracts, grader bundle manifest) | 1666 pass / 44 skip / 0 fail | same |
| frontend, all node tests | 602/602 | 581 (+21 content-safety and correction tests) |
| content safety + corrections | 21/21 | new |
| journey scenarios / policies / coverage | 41/41, 5/5, 17/17 | same |
| Django | 308 OK (2 skipped) | same |
| browser: M1 slice, M2 scenarios, A2 corrected explanations | 2/2, 14/14, 8/8 | 2/2, 14/14, — |
| persistence across restart: M1 / M2 (incl. decision B) | OK / PASS 4 learners | same |
| typecheck main / english / mathematics-integration | 0 / 0 / 183 (error list identical to the M2 closure; all pre-existing) | same |
| P2 final checks (cross-task, truncated, tampered, forged) | 0 accepted | same |
| corpus results (1838 items) | 0 differences from Milestone 2 | — |
| explanation-review registry check | OK | new |

P2 and E7 authority behaviour is unchanged: no P2 or E7 source was modified; the grader bundle differs only in embedded teaching text;
corpus verdicts and P2 attack checks are identical.
