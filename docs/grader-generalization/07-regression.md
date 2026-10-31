# 07 Regression report

Every run below finished. The frontend run used a clean worktree of commit `be91d177`.

| Check | Milestone 2 (`c58c443`) | This branch | Notes |
|---|---|---|---|
| Learning package (`bun test packages/learning/src`) | 1,666 pass / 44 skip / 0 fail | **1,689 pass / 41 skip / 0 fail** | +19 new generalization tests; 3 skipped P2-FINAL tests re-enabled |
| P2 rule and certificate tests (`derivation-authority`, `p2-final-regressions`, `derivation-interface`, `decision-replay`) | pass | pass | |
| E7 grading tests (`e7-finalisation`, `*-e7`, `verification-closure-*`) | pass | pass | 3 E7 shadow-credit assertions changed: the derivations are now certified, so E7 is back to its own pre-P2 values. Comments are in the test |
| Certificate replay and adversarial integrity | 0 accepted | **0 accepted** | 843 verified chains, each own-task replayed, then cross-task, truncated, tampered, forged-consistent and move-forged. See 05 |
| Frozen corpora (labels untouched) | — | 0 false mathematical accepts; more legitimate derivations certified and more invalid working detected | See 06 |
| Fallback-removal snapshot (39 calls) | 39 not verified | 31 keep their class; 8 now verified by listed rules | Each of the 8 replays independently. Test updated |
| Student-working interface / learner journey (`frontend/src/journey`) | 64 / 64 | **64 / 64** | |
| Frontend unit tests (all) | 576 / 576 | **576 / 576** | |
| Django (`manage.py test`) | 308 OK (2 skipped) | **308 OK (2 skipped)** | The server grader bundle rebuilds byte-identical (`b4a2e637…`), so P2 is not in production |
| Type check: main / English / mathematics-integration | 0 / 0 / 183 | 0 / 0 / 184 | The +1 is the missing `bun:test` types in the new test file, the same environment class as the other Bun test files |
| SymPy cross-check of the authority's output | — | 1,274 transitions, 0 disagreements | |

## Performance (authority, per item)

| Corpus | Milestone 2 p50 / p99 (ms) | This branch p50 / p99 (ms) |
|---|---|---|
| HELDOUT3 | 0.50 / 7.5 | 1.7 / 14.9 |
| HELDOUT2 | 0.24 / 7.7 | 1.2 / 11.4 |
| HELDOUT5 | 0.69 / 17.7 | 4.9 / 44.5 |

The slowest single item is 111 ms, during the HELDOUT5 run that first added the common-denominator rule. The cost comes from the exact solution-set checks and the extra move candidates. It is acceptable for working evaluation but not free.

## Pre-existing items not changed

- 41 P2-FINAL skipped tests remain skipped (01).
- The engine's statement parser is unchanged (06).
