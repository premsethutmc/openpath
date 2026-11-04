# 05 — Regression report (closure; final code; one machine; suites run sequentially, full logs kept)

| Suite | Result | Notes |
|---|---|---|
| Learning package (`bun test packages/learning`) | 1660 pass / 44 skip / 1 fail (1705 tests, 100 files) | the 1 fail is PRE-EXISTING (below) |
| Frontend unit (`node --import tsx --test "src/**/*.test.ts"`, full) | 518 tests, 518 pass, 0 fail | a complete run, not a targeted rerun |
| Frontend typecheck | BLOCKED (environment) | `TS2688 Cannot find type definition file for 'node'`; `@types/node`, `@types/react`, `@types/react-dom` cannot be installed (npm registry unreachable: `npm ci` ENOTFOUND, `bun install` 403). Partial `tsc` (`types: []`): M1 files clean except `slice-app.tsx` `key` (needs React types). See 06. |
| Django (`manage.py test`) | 307 run, OK, 1 skipped | the skip is `PersistenceRoundTrip`, which needs the slice's events and runs in the persistence row below |
| Browser journeys (Playwright, desktop 1366x800, mobile 390x844) | 2/2 pass | real grader and engines in the page; screenshots regenerated |
| Persistence round trip (`frontend/scripts/m1-persistence.sh`) | pass | slice -> Django store -> fresh login -> new process; see 04 |
| P2 certificate replay (`final-checks.ts HELDOUT3-corpus.json`) | own-task replay failures 0; cross-task 0 accepted; truncated 147 tested / 0 accepted; tampered 182 / 0; forged-consistent 182 / 0 | same figures as the recorded `final-checks-heldout3.txt` |
| Cross-boundary tests | `slice.test.ts` 6/6; `derivation-interface.test.ts` 8/8; `test_integration_m1.py` 4/4 + round trip | grader / evidence / adaptive / renderer, and app <-> Django |

## The one failure: pre-existing, classified after reproduction
`question-status.test.ts` › "selectors never return a quarantined question" › "selection code is registered" — `expect(hits.sort()).toEqual(ALLOWED)` receives one extra file, `packages/learning/src/hypotheses.ts`, which imports the pool selector `modulePhasePool`.
Reproduced on the baselines with the same command:

| Baseline | Result |
|---|---|
| Phase 3 `e2176d2` | 16/16 pass |
| Adaptive loop `5289948` | 16/16 pass |
| Adaptive evidence `2db1c44` | 15/16, same assertion, same extra file |
| Integration | 15/16, same |

It was introduced on the evidence branch by `5b0c429` (Phase 4). It is a governance check (a new selector must be added to the list in a reviewed change). It is not a quarantine leak: `hypotheses.ts` applies `selectable()` to every pooled question, and the five other quarantine tests (pools, module lists, library, journeys) pass. Left unchanged; adding the file to `ALLOWED` is a review decision.

## The 44 skipped tests (one justified category)
All 44 are `P2-FINAL` skips added by the P2 Final Authority Review (49a6be8). Each was marked "relied on the legacy numeral-provenance fallback; now unsupported by design" (see `P2_FINAL_AUTHORITY_REVIEW_REPORT.md`, new-unsupported list).
- 33 named `test.skip`: verification-closure-e4 (14: radical equations and extraneous roots, no-real-solution claims, rational equations and excluded values, quadratic formula with ±, large coefficients, linear systems), e6r (5: comma lists, conjugate-product detour, complex roots, C(n,r)/P(n,r) notation, exact e and complex forms), e3 (3: alternative methods, inequality sign reversal, extraneous roots from squaring), e6 (2), proof-obligations-e7 (2), proof-context-e7 (2), premise-binding-e7, proof-integrity-e2, rewrite-grounding-e8, parse-integrity-e7, claim-ledger-e7 (1 each).
- 11 data-driven: proof-obligations-e7 `P2_FINAL_SKIP` (6: Vieta sum and product, binomial mean, quadratic roots with the discriminant) and semantic-grounding-e7 `P2_FINAL_SKIP` (5: Vieta product forms).

What remains unverified: acceptance (certification) of the working on those routes. They are unsupported by P2 by design, so such working is never certified, which is the safe direction. That they are correctly ACCEPTED is untested until the routes are registered. Refusal and safety tests for them still run.

## Defects found by the integration and closure, all fixed and re-tested
1. Lost `reason` import in the hand-merged `intervention.ts` (17 frontend failures).
2. Vacuous relaxed assertion in `learner-hypothesis.test.ts`, replaced by five non-vacuous checks (03 #4).
3. Interface overclaim: an answer-only or jump working (P2 `solve-conclusion`) counted as method evidence; fixed in `derivation-interface.ts` (09).
4. Slice clock hard-coded to 2026-11-02, so the reported 9 November due date was fictitious; real clock now (04).
5. Renderer: no multiple-choice input; prose questions overflowed; "Try it yourself" shown during guided practice and teaching; harness missing KaTeX CSS (each formula rendered twice). All fixed.

Load-sensitive (not a regression): the E3 differential fuzz test can fail under heavy load and passes alone; it passed in this run.
