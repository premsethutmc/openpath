# R2 frozen acceptance datasets

Generated once by `tools/mathematics/r2/gen_r2_sets.py` (seeded) and checked by `check_sets.py`.
Any change is an amendment recorded in the milestone document, never an edit of these files.

Generator seed: `20260513` (family jobs use seed + 1000*family; tuning seed + 9000; reuse seed + 7000; limits seed + 8000)

## SHA-256

| file | sha256 |
|---|---|
| composition.json | `8db2e4ea42a4f5284336f4580a521c6cdf5c42fd9d0b45bc5421787d23328255` |
| reuse.json | `7ced040c75123f8c463ee32886934cc5ccfa421c00f00b0eb16ebc6c95197584` |
| limits.json | `5207bc435a6b7088b3fd793207319e7187f5af3546727176159454139b5a8246` |
| tuning.json | `0fc50abb1e5db2f3bd563ba0f617dbd751bd8cd946726cd6099376a66505d386` |

Source files at freeze time:

| file | sha256 |
|---|---|
| refimpl.py | `db93fb5c7ffba33c818aa82f69d3a0b64a0974591c403152aa71f36c17e7bd5d` |
| gen_r2_sets.py | `0d273bf4fa76611aaf8a52ad0e38591365ff69c9c9b102c7b8693e705eaee616` |
| check_sets.py | `0f175bf2bf29b9587344563a7676223edafe402b13e42da29f8e150480c1ec40` |
| README.md | `874191211dfaac9771cbecff1ba4f44c7ad06dc9ae9dd88be4f18289e60660b0` |

## Counts

| family | reachable | unreachable (proven, depth<=8) |
|---|---|---|
| order | 36 | 32 |
| shortest-not-obvious | 48 | 34 |
| local-trap | 36 | 31 |
| complexity-up | 36 | 30 |
| restriction-gate | 36 | 30 |
| goal-variety | 44 | 34 |
| solve-mixed | 36 | 33 |
| total | 272 | 224 |

Tasks marked `unreachable-unproven` (node cap hit before exhaustion, NOT claimed unreachable): 37; re-check cap hits: 37.

### Reachable tasks per family and goal

| family | SOLVE | CLEARED | REDUCED | ONE_FRACTION_ZERO | EXPANDED_POLY |
|---|---|---|---|---|---|
| order | 25 | 0 | 0 | 0 | 11 |
| shortest-not-obvious | 27 | 0 | 0 | 0 | 21 |
| local-trap | 25 | 0 | 1 | 3 | 7 |
| complexity-up | 18 | 0 | 0 | 0 | 18 |
| restriction-gate | 4 | 0 | 0 | 20 | 12 |
| goal-variety | 5 | 12 | 8 | 12 | 7 |
| solve-mixed | 36 | 0 | 0 | 0 | 0 |
| all | 140 | 12 | 9 | 35 | 76 |

tuning.json: 60 tasks (SOLVE=24, CLEARED=8, REDUCED=8, ONE_FRACTION_ZERO=10, EXPANDED_POLY=10); reuse.json: 60 pairs (add-sub-both-sides=12, collect-terms=12, expand=12, move-to-left=12, mul-div-const=12); limits.json: 80 tasks (deep-nesting=8, domain-unresolved=10, large-coefficients=10, malformed=14, near-boundary=23, unsupported=15).

## Self-check and baseline results (output of `check_sets.py`)

```
composition: 533 tasks, reachable 272, unreachable 261; tuning 60; reuse pairs 60; limits 80
tuning/composition overlap by start text: 0
tuning P2 on tuning.json only ...
  P2[SOLVE]: tuned on 24 tasks, best order solves 18 of them
  P2[CLEARED]: tuned on 8 tasks, best order solves 8 of them
  P2[REDUCED]: tuned on 8 tasks, best order solves 8 of them
  P2[ONE_FRACTION_ZERO]: tuned on 10 tasks, best order solves 8 of them
  P2[EXPANDED_POLY]: tuned on 10 tasks, best order solves 8 of them
(a) witnesses replayed: 272; failing replay/solution-set/restriction/goal checks: 0
    starts outside the scope boundary: 0
(b) claimed-unreachable tasks: 261; BFS reaches the goal: 0; cap hit (unreachable-unproven): 37; proven unreachable within depth 8: 224
    baselines claiming success on an unreachable task: 0
    proven-unreachable per family: order=32, shortest-not-obvious=34, local-trap=31, complexity-up=30, restriction-gate=30, goal-variety=34, solve-mixed=33
(c) family properties recomputed from the stored witnesses (independent code path):
    order: 36/36 tasks satisfy the family property
    shortest-not-obvious: 48/48 tasks satisfy the family property
    local-trap: 36/36 tasks satisfy the family property
    complexity-up: 36/36 tasks satisfy the family property
    restriction-gate: 36/36 tasks satisfy the family property
    goal-variety: 12/12 start-groups have >= 3 goals with diverging witnesses (44 tasks)
    solve-mixed: 36/36 tasks satisfy the family property
    local-trap: greedy P4 fails on 34/36 tasks (local move leads to a state needing >= 2 extra steps or unreachable on 36/36)
    complexity-up: witness passes through a state with more terms or higher degree than the start on 36/36 tasks
(d) baselines on reachable composition tasks (success = goal predicate holds and the final state is equivalent to the start over the original domain):
    family                    n       P1       P2       P3       P4
    order                    36    50.0%    58.3%   100.0%    58.3%
    shortest-not-obvious     48    16.7%    52.1%   100.0%    62.5%
    local-trap               36    36.1%    44.4%   100.0%     5.6%
    complexity-up            36    25.0%    47.2%   100.0%    66.7%
    restriction-gate         36    47.2%    83.3%   100.0%    91.7%
    goal-variety             44    81.8%    95.5%   100.0%    95.5%
    solve-mixed              36    13.9%    13.9%    88.9%    88.9%
    ALL                     272    39.0%    57.4%    98.5%    67.6%
    by goal (ALL families):
    SOLVE                   140    30.0%    38.6%    97.1%    62.9%
    CLEARED                  12   100.0%   100.0%   100.0%   100.0%
    REDUCED                   9    77.8%   100.0%   100.0%    88.9%
    ONE_FRACTION_ZERO        35    85.7%    97.1%   100.0%    88.6%
    EXPANDED_POLY            76    19.7%    61.8%   100.0%    59.2%
    best of P1/P2/P4 on ALL reachable: 67.6%; P3 hit the 20000-node limit on 4 tasks
    P3 nodes visited: median 28, p95 2506, max 20000
goal counts (reachable): SOLVE=140, CLEARED=12, REDUCED=9, ONE_FRACTION_ZERO=35, EXPANDED_POLY=76
reuse pairs replayed with the shared rule: failing sides 0 of 120
limits: reference classification crashed on 0 of 80, slower than 5 s on 0
total check time 276s
```

Baselines are reported as measured; the datasets were not tuned to push any baseline to zero. P2 orders were selected on tuning.json only. P3 uses the same operations with the 20000-node limit.
