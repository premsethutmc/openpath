| contender | reachable solved (verified) | incorrect results (claimed success, judge fails) | ended without goal, no claim (reachable / unreachable) | unreachable correctly refused | reachable falsely refused | node-cap stops | median / p95 expansions | median / p95 ms |
|---|---|---|---|---|---|---|---|---|
| planner | 245/272 (90.1%) | 1 | 0 / 0 | 250/262 | 26 | 24 | 7 / 4613 | 30.8 / 51578 |
| bfs | 245/272 (90.1%) | 1 | 0 / 0 | 250/262 | 26 | 24 | 10 / 3585 | 45.7 / 61420 |
| P1 | 108/272 (39.7%) | 0 | 164 / 262 | 0/262 | 0 | 0 | 4 / 11 | 9.2 / 56 |
| P2 | 172/272 (63.2%) | 0 | 100 / 260 | 0/262 | 0 | 0 | 6 / 31 | 17.0 / 256 |
| P4 | 175/272 (64.3%) | 0 | 97 / 258 | 0/262 | 0 | 0 | 5 / 31 | 19.7 / 355 |

**By family** (reachable tasks solved / reachable tasks)

| family | n | planner | bfs | P1 | P2 | P4 |
|---|---|---|---|---|---|---|
| complexity-up | 36 | 26 | 26 | 8 | 14 | 17 |
| goal-variety | 44 | 41 | 41 | 35 | 39 | 38 |
| local-trap | 36 | 29 | 30 | 13 | 14 | 4 |
| order | 36 | 32 | 32 | 16 | 19 | 19 |
| restriction-gate | 36 | 35 | 36 | 18 | 33 | 33 |
| shortest-not-obvious | 48 | 47 | 47 | 4 | 29 | 31 |
| solve-mixed | 36 | 35 | 33 | 14 | 24 | 33 |

**By goal** (reachable tasks solved / reachable tasks)

| goal | n | planner | bfs | P1 | P2 | P4 |
|---|---|---|---|---|---|---|
| CLEARED | 12 | 12 | 12 | 12 | 12 | 11 |
| EXPANDED_POLY | 76 | 68 | 69 | 14 | 37 | 43 |
| ONE_FRACTION_ZERO | 35 | 35 | 35 | 31 | 34 | 31 |
| REDUCED | 9 | 8 | 8 | 7 | 9 | 7 |
| SOLVE | 140 | 122 | 121 | 44 | 80 | 83 |

**By compositional depth** (reachable tasks solved / reachable tasks)

| compositional depth (shortest witness length) | n | planner | bfs | P1 | P2 | P4 |
|---|---|---|---|---|---|---|
| 1 | 28 | 28 | 28 | 27 | 28 | 27 |
| 2 | 37 | 34 | 34 | 25 | 31 | 25 |
| 3 | 160 | 139 | 141 | 44 | 82 | 83 |
| 4 | 33 | 30 | 31 | 8 | 23 | 27 |
| 5 | 6 | 6 | 5 | 2 | 4 | 6 |
| 6+ | 8 | 8 | 6 | 2 | 4 | 7 |
| unreachable | 0 | 0 | 0 | 0 | 0 | 0 |
