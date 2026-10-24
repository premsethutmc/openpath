# Tamil Nadu Grade 5 verified bank: T0 results

Release `tn-samacheer-mathematics-grade-5`. Rebuild: `node --import tsx tools/mathematics/tn5-bank/build-bank.mts out`
(writes `bank.jsonl`, about 68 MB, not committed; `results/manifest.json` carries its SHA-256).

| Check | Result |
|---|---|
| Families / released problems | 192 / 60,774 (the earlier 194 / 61,025 included `aatens` and `mul`, which serve competencies outside this release; excluded) |
| Requirements mapped to at least one family | 61 of 61 (0 unmapped), `results/coverage.json` |
| Determinism | two builds, identical SHA-256 `7c1ae862e18db9ea…` |
| Labels (exactly one per item) | kernel-verified 19,144 (31.5%), partial 19,208 (31.6%), answer-verified 22,422 (36.9%), unverified 0 |
| Unchecked step types still to close for 100% | 209 (family, step) pairs, listed by size in `results/manifest.json` |
| Depth shortfalls (< 30 items in a band) | 4, listed in `results/manifest.json` |

Soundness guard (same branch): a justification counts as a check only if the step's stated value matches an independent
computation. Corrupting stated values is always caught (9,370 of 9,370 op-based steps; every justification kind has a
pass and a fail test in `packages/learning/src/kernel-soundness.test.ts`). Package tests: 392 pass, 0 fail.

Not done yet: acceptance tests 5 (500 injected wrong answers), 6 (100% step verification), 7 (10,000-item SymPy
re-check), 8 (depth), 9 (journeys), 10 (full re-census against the PR #69 baseline), 11.
