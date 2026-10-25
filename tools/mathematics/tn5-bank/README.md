# Tamil Nadu Grade 5 verified bank: T0 results

Release `tn-samacheer-mathematics-grade-5`. Rebuild: `node --import tsx tools/mathematics/tn5-bank/build-bank.mts out`
(writes `bank.jsonl`, about 68 MB, not committed; `results/manifest.json` carries its SHA-256).

| Check | Result |
|---|---|
| Families / released problems | 192 / 60,774 (the earlier 194 / 61,025 included `aatens` and `mul`, which serve competencies outside this release; excluded) |
| Requirements mapped to at least one family | 61 of 61 (0 unmapped), `results/coverage.json` |
| Determinism | two builds, identical SHA-256 `7c1ae862e18db9ea…` |
| Labels (exactly one per item) | T0: kernel-verified 19,144 (31.5%), partial 19,208, answer-verified 22,422, unverified 0. After the T1 pilot: 21,157 (34.8%) / 20,115 / 19,502 / 0 |
| Unchecked (family, step) pairs still to close for 100% | 209 at T0; 197 after the T1 pilot (54,299 step instances left, from 60,352) |
| Depth shortfalls (< 30 items in a band) | 4, listed in `results/manifest.json` |

Soundness guard (same branch): a justification counts as a check only if the step's stated value matches an independent
computation. Corrupting stated values is always caught (9,370 of 9,370 op-based steps; every justification kind has a
pass and a fail test in `packages/learning/src/kernel-soundness.test.ts`). Package tests: 404 pass, 0 fail.

Not done yet: acceptance tests 5 (500 injected wrong answers), 6 (100% step verification), 7 (10,000-item SymPy
re-check), 8 (depth), 9 (journeys), 10 (full re-census against the PR #69 baseline), 11.

## T1 pilot: per-step typed claims (`packages/learning/src/step-claims.ts`)
A claim says, for one (family, step) pair, what the stated value must equal, computed exactly from the step's own
inputs. Pilot on three step types: HCF, LCM and rounding (13 pairs; 4 small claim functions).

- Result: 12 pairs closed (one, `aglcm/lcm`, has no such steps), 6,053 step instances, 2,013 more items fully
  checked. Zero mismatches: every stated value agreed with the independent computation. No family had a wrong step.
- Corruption: every claim is tested with corrupted values (+1, −1, ×2+3, non-numeric); all are rejected.
- The generic equivalence checker from the proposal does not fit: steps carry (op, inputs, value), not before/after.
  The same op also means different things in different families (`add` is a lattice digit in one, a clock time in
  another), so a claim is keyed by (family, step), not by op.
- What is left (197 pairs, 54,299 instances): about 103 pairs (30,478 instances) are computable from the step's inputs
  (add, subtract, regroup, convert, compare, order, estimate …), about 46 (14,517) read a picture or a definition
  (read, count, classify, place), and about 48 (9,304) are one-off step names.

## Phase 1 (arithmetic, units, place value, rounding, comparison): 41 pairs, four parallel agents
Claims live in `packages/learning/src/claims/` (four files + tests); the probe `claim-probe.mts` and the corruption
tool `claim-mutation.mts` reproduce the numbers below.

| | Before Phase 1 | After |
|---|---:|---:|
| Items fully machine-checked | 21,157 (34.8%) | 29,591 (48.7%) |
| Partly checked / answer-verified only | 20,115 / 19,502 | 17,278 / 13,905 |
| Unchecked (family, step) pairs | 197 | 156 |
| Unchecked steps | 54,299 | 41,271 |

- All 41 pairs: every released step confirmed (20,213 steps in all claims), 0 mismatches, 0 unreadable. No family defect found.
- Corruption: 78,722 corrupted values across every claim-checked step; 0 genuine corruptions confirmed (111 were a
  palindromic list reordered with a space, i.e. the same list).
- Bank rebuilt twice: identical SHA-256 `73a759dca087a158…`. Tests: 489 pass, 0 fail.
