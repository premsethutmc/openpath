# Teaching presentation acceptance

Validated on 21 October 2026 from `feat/universal-teaching-presentation-v1`.

## Generated family audit

The reproducible audit generated 18 valid problems from each family's declared domain, `keep` and `reject` rules. “Accepted” means the answer, worked operations and typed diagram all passed independent invariants. “Rejected” means the deterministic worked mathematics remained valid but the adapter explicitly withheld a diagram it could not represent faithfully. No unsupported case is counted as accepted.

| Family | Generated | Accepted | Safely rejected | Failures |
| --- | ---: | ---: | ---: | ---: |
| `aeind` | 18 | 18 | 0 | 0 |
| `aiint` | 18 | 18 | 0 | 0 |
| `eqfrac` | 18 | 18 | 0 | 0 |
| `fadd` | 18 | 0 | 18 | 0 |
| `adfcmp` | 18 | 18 | 0 | 0 |
| `adfname` | 18 | 18 | 0 | 0 |
| `adshade` | 18 | 18 | 0 | 0 |
| `aocart` | 18 | 17 | 1 | 0 |
| `apcartn` | 18 | 10 | 8 | 0 |
| `lin` | 18 | 18 | 0 | 0 |
| `ahone` | 18 | 18 | 0 | 0 |
| `lneg` | 18 | 18 | 0 | 0 |
| `rect` | 18 | 18 | 0 | 0 |
| `aearea` | 18 | 18 | 0 | 0 |
| `rperim` | 18 | 18 | 0 | 0 |
| **Total** | **270** | **243** | **27** | **0** |

The rejected diagram cases are like-denominator fraction operations (`fadd`, 18), relation counting (`aocart`, 1), and triple-product/union variants (`apcartn`, 8). Their existing deterministic working is not represented by a misleading strip or two-dimensional pair grid.

## Checks run

- `npm run typecheck` — passed.
- `npm run build` — passed.
- `node --import tsx --test ../packages/learning/src/teaching-presentation.test.ts ../packages/learning/src/teaching-presentation-audit.test.ts` — 12 passed, 0 failed.
- `npm test -- --test-name-pattern='teaching|curriculum'` — passed.
- `python manage.py test family.test_learning family.test_mathematics` — 27 passed, 0 failed.
- `node --test e2e/universal-teaching-presentation.test.mjs` — 2 passed at 360px and 393px. Six visual families rendered, one step appeared per tap, the initial worked-step count was zero, practice opened, return worked, and preview made zero API writes.
- `node --test e2e/teaching-first-learner.test.mjs` — 4 passed at 360px and 393px for Tamil Nadu Grade 10 and CBSE Grade 7. Authenticated attempts persisted, helped correction remained assisted, reload resumed, a fresh question followed, and no verified mastery was granted.

## Learner-facing boundary

The tested representations—Indian place value, integer movement, equivalent fractions, Cartesian product grids, structured one/two-step equations, and rectangle area/perimeter—are ready for a controlled synthetic or supervised learner evaluation within the parameter boundaries in `UNIVERSAL_TEACHING_PRESENTATION.md`.

This is not universal mathematics coverage. Unlike-fraction operation diagrams, relation-subset diagrams, three-set products, union diagrams, arbitrary algebraic transformations, non-rectangle geometry, constructions and proofs remain unsupported. Content retains its existing provisional or educator-review status.
