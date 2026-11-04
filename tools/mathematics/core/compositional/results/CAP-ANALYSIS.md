# Node-cap analysis (30 tasks that hit the cap in at least one of planner/bfs)

**Status of the first attempt:** the first run's "repeated equivalent states ~100%" was a measurement artefact (its canonical form, the monic reduced (L-R)/denominator, is identical for every equivalence-preserving state). It is void and kept in cap-firstattempt/. This run uses a spelling-level canonical form (sums/products flattened and sorted, signs extracted), so "repeated" means *the same expression re-ordered or re-associated*, not "mathematically equal".

**What was traced.** The 4000-node prefix of the plain breadth-first search for all 30 tasks, and the 20000-node trace for a sample of 6 (5 distinct tasks + A-5-035, which terminates early). Thresholds (0.30) are fixed, not tuned. Traces: results/cap-analysis-4000-a/b.json, cap-analysis-20000-sample.json. The analysis traces BFS, NOT the best-first planner.

## Who capped
- planner capped AND bfs solved: A-3-003, A-3-024, A-5-035, A-7-030 (BFS needs 12-116 expansions; the planner spends 4.6k-6.2k and caps). **Cause for these 4 is poor goal selection by the planner's size heuristic**, not the task.
- bfs capped AND planner solved: A-2-U039, A-7-001, A-7-024, A-7-027 (the heuristic helps here).
- both capped: 22 tasks (11 reachable-by-reference are A-1-025, A-1-030, A-3-022, A-3-031 plus 7 in the above sets; the rest are reference-unreachable).

## Dominant cause (BFS trace, 4000 nodes, n=30)
- repeated equivalent states (re-orderings/re-associations): 26 tasks, median dup share 0.56 (range 0.03-0.84)
- expression growth: 1 task (A-2-U037, growth share 0.98 at 4000 and 0.99 at 20000)
- genuine combinatorial branching: 3 tasks (A-5-035, A-3-024, A-7-027; dup < 0.30), but the first two are solved by BFS quickly, so their branching is not what stops them.
- inverse-rule cycles: never dominant; share of children equal to an ancestor is 0.00-0.13 (median 0.03).
- Mean branching factor: median 8.0 (5.3-13.5).
Caveat: dedup in the planner already merges identical *text*; the re-spelled duplicates are not merged because the canonical form is NOT used by the search. A spelling-canonical dedup is the obvious, untested mitigation (an engineering suggestion, not applied: the benchmark is frozen).
