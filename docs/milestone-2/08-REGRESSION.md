# 08 — Full regression results (complete runs on the final code, one after another; logs kept)

| Check | Result | Notes |
|---|---|---|
| Learning package (`bun test packages/learning`) | **1666 pass / 44 skip / 0 fail** (1710 tests, 101 files) | the governance failure is resolved (02 B); the 44 skips are all P2-FINAL (unsupported by design) |
| Frontend unit (`node --import tsx --test "src/**/*.test.ts"`) | **576 / 576 pass** | a complete run; includes the scenario suite and coverage |
| TypeScript typecheck | main **0 errors** · English **0** · integration **pre-existing only** | integration config: 119 errors already present on the source branches, plus missing `bun:test` types (environment). The script still fails at this third config, as it did on every source branch. One M2 type error found by this run (`scenarios.ts`) was fixed, and that config and file were re-checked |
| Django (`manage.py test`) | **308 run, OK** (2 skipped) | the 2 skips are the M1 and M2 round-trip tests, which need their scripts; both ran and passed below |
| Browser journeys (Playwright, desktop + mobile) | M1 slice **2/2**; M2 scenarios **14/14** (7 scenarios × 2 widths) | overflow, accessible names, control size and termination checked on every screen |
| P2 certificate replay (`final-checks.ts HELDOUT3`) | own-task replay failures 0; cross-task, truncated, tampered and forged-consistent chains accepted: 0 | |
| Frozen corpora (labels untouched) | agreement HELDOUT3 317 → 335, HELDOUT2 332 → 339; only unsupported → invalid changes; no verified case touched | 04 |
| Adaptive scenario suite | **41 / 41**, all 10 properties each | 03 |
| Competency coverage | 17 / 17 run; 16 supported with limitations, 1 demonstration-only, 0 needing new logic | 05 |
| Persistence and retention | M1 round trip pass; M2 four learners × two sessions **PASS** | 06 |
| Cross-component boundaries | `slice.test.ts` 6/6, `derivation-interface.test.ts` 9/9, `bounded-interactions.test.ts` 3/3, `test_integration_m1.py` (4 boundary tests + 2 round trips) | |

Blocked or environment-only: frontend `bun:test` types; the npm registry (the type packages were built from GitHub sources, 01).
