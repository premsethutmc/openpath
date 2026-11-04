# 07 — Test results

Branch `milestone-2/closure-teaching-audit`, base `c58c443`.

## Targeted runs (during development)

| Run | Result |
|---|---|
| `policies.test.ts` (A1–A3, B, C) | 5/5 |
| persistence M2 (decision B across restart) | PASS, 4 learners |
| scenario 3h / 5e event sequences (inspected) | own-skill teach once → independent recheck → retry → pause; 5e unchanged |

## Complete run (one pass, after all changes)

| Suite | Result | M2 baseline |
|---|---|---|
| learning (bun) | 1666 pass / 44 skip / 0 fail | same |
| frontend (all node tests) | 581/581 | 576 (+5 policies) |
| journey scenarios | 41/41 | 41/41 |
| coverage (17 competencies) | 17/17 | 17/17 |
| Django | 308 OK (2 skipped) | same |
| browser e2e (M2 scenarios + M1 slice) | 14/14 + 2/2 | same |
| persistence M1 / M2 | OK / PASS 4 learners | same |
| typecheck main / english | 0 / 0 errors | same |
| typecheck mathematics-integration | 183 errors, all pre-existing (65 `bun:test` types); none in changed files | 187 |
| P2 final checks (cross-task, truncated, tampered, forged) | 0 accepted | 0 |
| corpus agreement (all corpora) | identical to M2, 0 label diffs | — |
| teaching-decision evaluation | 18 scenarios, 15/24 explanations justified | n/a |

## Stage 5 checks

- No unbounded retries: tries ≤ 1 + RETRY_LIMIT in every scenario; C adds one own-skill cycle then escalates.
- No false mastery: B withdraws `verified`; scenarios with `mastery: forbidden` pass.
- No unsupported method shown verified: P2 attacks 0 accepted; corpus unchanged.
- No duplicate retention/recovery cycles: B test asserts cycles `["failed","pending"]`; C asserts one own-skill teaching cycle.
- No bypass of teaching eligibility: C uses `failsChecks`; escalates when no strategy passes.
- No regression of M1/M2 journeys: e2e, persistence and scenarios green.
