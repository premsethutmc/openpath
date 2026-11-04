# Two-dice probability: TP-PRO-01 (pending educator review)

**Connected** in `integration/geometry-dice-candidate`. See `docs/geometry-dice-integration/README.md` for:

- what pupils can use;
- the shared-engine changes;
- the tests;
- the remaining blockers.

## Source and registration

The source is `feat/math-teaching-content@4e655e73` TP-PRO-01, with its corrected recheck `gen:akdice:4,5,0,5`.

To register or regenerate, run `cd frontend && node --import tsx ../content/learning/src/two-dice-candidate.mts`. This writes the template extension into `blueprints.v1.json`; the library is then rebuilt.

## The lessons

All three are scoped to `sample-space.dice-exact-total@1` (`akdice`, "the total is exactly k").

| Explanation | Addresses | Shown | Guided | Recheck |
|---|---|---|---|---|
| `akdice_fix_totals` | totals-equally-likely | `6,6,0,7`: total 2 = (1, 1), 1 pair, 1/36; total 7 = six pairs, 1/6 | `5,5,0,7:mc` | `4,5,0,5` |
| `akdice_fix_order` | order-ignored | `6,6,0,9`: (3, 6) and (6, 3) are two rolls | `5,5,0,9:mc` | `6,6,0,3` |
| `akdice_pairs` | (general; no misconception claimed) | `6,6,0,8`: every pair equally likely | `4,6,0,4` | `5,6,0,9` |

## Generator facts the tests rely on

- All 80 "total is exactly k" pool items agree with a pair-by-pair count.
- On `5,6,0,9`, the equally-likely-totals value equals the true value (3/30 = 1/10), so that error cannot show there.
- `4,5,0,6:mc` is the corrected recheck `4,5,0,5` relabelled (5 + 4 + 2 − 6 = 5), so it is never used as that learner's delayed check.
