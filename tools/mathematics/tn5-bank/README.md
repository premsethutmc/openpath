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

## Phase 2 (units, fractions, patterns, factors, number properties, arithmetic leftovers): 99 pairs, five parallel agents
| | Before Phase 2 | After |
|---|---:|---:|
| Items fully machine-checked | 29,591 (48.7%) | **48,525 (79.8%)** |
| Partly checked / answer-verified only | 17,278 / 13,905 | 6,491 / 5,758 |
| Unchecked (family, step) pairs | 156 | 60 (42 families) |
| Unchecked steps | 41,271 | 15,771 |

- Every claim confirms every readable released step: 48,313 steps, 0 mismatches. No family defect found in Phase 2.
- Corruption: 182,608 corrupted values; 0 genuine corruptions confirmed (the same 111 whitespace-only list rewrites).
- Left unchecked by design: the first step of each `acmissing` family states a family-internal code (equation form), not a result.
- Bank rebuilt twice: identical SHA-256 `455174e8aa2e1fb6…`. Tests: 702 pass, 0 fail.

### Checks that rest on a convention rather than pure mathematics (owner to review)
- `aechk/estimate`: "a reasonable estimate" is within 30% of a rounded estimate.
- `acstory/choose operation`, `acstory4/…`, `acstory9/…`: the operation is read from fixed template wording; the numeric code (add 0, take away 1, multiply 2, share 3) is the families' own convention.
- `aabig/compare sizes`: a fixed common-sense size order of everyday objects.
- `avfwq/evaluate`: compares a floating-point stated value with a tolerance of 1e-9.

### Left for Phase 3 (60 pairs, 15,771 steps)
All need the data in a picture or table: clock reading and elapsed time (`acelapsed`, `accal`), bar charts, pictographs,
tallies and tables (`afbar`, `adbar`, `adbartf`, `acpict*`, `adrec`, `abcup*`, `advenn`), grids and seating plans
(`abgrid`, `abseat`, `abroute`), symmetry, reflection and nets (`aesym`, `aemirror`, `aerefl`, `afcube`, `afnet`),
solids and cube views (`afsolid`, `afpaint`, `afview`, `afhidden`), lattice multiplication (`avlat`), angles
(`aeang`, `aertang`), directions (`abdir`), and `acmissing`'s code step.
