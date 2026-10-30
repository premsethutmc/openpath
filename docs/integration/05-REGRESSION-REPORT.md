# 05 — Regression report (final code, one machine, run sequentially)

| Suite | Result | Notes |
|---|---|---|
| Learning package (`bun test packages/learning`) | 1659 pass / 44 skip / 1 fail | 1 fail PRE-EXISTING (also on baseline): "selectors never return a quarantined question … selection code is registered". 44 skips are the P2-FINAL tests skipped by design. Baseline was 1453 pass / 1 fail. |
| Frontend unit (`node --import tsx --test "src/**/*.test.ts"`) | 518 tests: 517 pass, 1 fail on the first complete run; the 1 was fixed (see below) and re-verified; the first run before the import fix had 17 fails | Baseline run was killed by timeout (no baseline number: INCOMPLETE). Run takes ~25-30 min. |
| Django (`manage.py test`) | 306 OK (baseline 302 + 4 new boundary tests) | |
| Browser journeys (Playwright, desktop 1366x800 + mobile 390x844) | 2/2 pass | against the bundled page, real grader/engine in-page |
| Slice integration tests (`slice.test.ts`) | 6/6 | ownership, grader->evidence->adaptive->renderer, progressive teaching, recheck, retention |
| P2 interface + disputed labels (`derivation-interface.test.ts`) | 7/7 | |
| Math authority replay tests | inside the learning suite (derivation-authority*, p2-final-*): pass; skips as above | the final-checks replay script was not re-run separately |

Defects found by this integration and fixed: (1) lost `reason` import in the hand-merged `intervention.ts` (17 frontend failures; learning suite did not exercise it); (2) renderer had no multiple-choice input; (3) renderer overflowed on prose questions; (4) `learner-hypothesis` test vs loop stopping rule contradiction (03-RECONCILIATION #4).

Not run / incomplete: frontend typecheck (no `@types/react`, registry blocked); frontend baseline; the standalone replay script.
Flaky under load: E3 differential fuzz test (passes alone).
