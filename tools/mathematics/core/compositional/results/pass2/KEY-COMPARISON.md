| configuration | reachable solved (verified) | unreachable-by-reference but solved (verified) | incorrect results | unreachable correctly refused | reachable falsely refused | node-cap stops | unique states median / p95 / total | expansions median / p95 / total | runtime ms median / p95 / total |
|---|---|---|---|---|---|---|---|---|---|
| planner (text key) | 245/272 | 9 | 0 | 252/261 | 27 | 25 | 14 / 16452 / 748298 | 7 / 4657 / 254223 | 17 / 36770 / 2192 s |
| planner (canonical key) | 246/272 | 9 | 0 | 252/261 | 26 | 16 | 12 / 6547 / 544287 | 6 / 2928 / 197841 | 18 / 28645 / 2088 s |
| bfs (text key) | 246/272 | 8 | 0 | 253/261 | 26 | 25 | 15 / 16474 / 791651 | 10 / 3828 / 232573 | 27 / 37106 / 2502 s |
| bfs (canonical key) | 246/272 | 9 | 0 | 252/261 | 26 | 16 | 14 / 9067 / 620147 | 9 / 3250 / 203022 | 26 / 35833 / 2493 s |

**planner**: solved with canonical key but not text key: ['A-3-003']; solved with text key but not canonical key: none
  on the 254 tasks solved by both, unique states are reduced by a median of 0.0% (max 81.2%)

**bfs**: solved with canonical key but not text key: ['A-2-U039']; solved with text key but not canonical key: none
  on the 254 tasks solved by both, unique states are reduced by a median of 0.0% (max 55.8%)
