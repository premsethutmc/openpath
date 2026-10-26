# Compositional benchmark — final judged summary (supersedes STATUS.md "PARTIAL")

Dataset: R2 frozen composition.json sha256 8db2e4ea42a4f5284336f4580a521c6cdf5c42fd9d0b45bc5421787d23328255 (533 tasks judged; one task, A-2-U043, was removed by the dataset author's re-freeze and is excluded). 272 reachable by the reference implementation, 261 not. Judge: independent Python reference semantics (goal holds, every state equivalent to the start over the original domain). All 533 tasks x 5 contenders are judged; **no task is incomplete**. Tables: SUMMARY-tables.md. Per-task evidence: PLANNER-VS-BASELINES.md. Cap analysis: CAP-ANALYSIS.md.

## Headline
- Verified successes on reachable tasks: planner 244/272, shared BFS 245/272, P2 priority list 172, P4 greedy 175, P1 fixed pipeline 108.
- Incorrect results (claimed success, judge disagrees): planner 1, bfs 1 (A-6-017, REDUCED goal predicate mismatch — unresolved defect), baselines 0.
- Correct refusals on reference-unreachable tasks: planner 252/261, bfs 253/261. The 9 "wrong" ones are tasks our stronger cancel/add-sub semantics DO solve (each judged successful and verified), i.e. the reference's "unreachable" label is conservative, not our error.
- Node-cap stops: 26 each for planner and bfs; timeouts: none recorded.
- Median / p95 expansions: planner 7 / 4664; bfs 10 / 3873.

## Does the shared planner beat the baselines?
- **Versus the fixed baselines (P1/P2/P4): yes, large.** 40 tasks solved by the planner that none of P1/P2/P4 solve (PLANNER-VS-BASELINES.md, with composition, verified final state, expansions, runtime). Baseline-only successes over the planner are listed in the same file.
- **Versus plain BFS over the same rules: no advantage in correctness (244 vs 245).** The best-first search lowers median expansions (7 vs 10) but has a worse p95 (4664 vs 3873). Planner-only vs BFS-only: 4 tasks each (planner: A-2-U039, A-7-001, A-7-024, A-7-027; BFS: A-3-003, A-3-024, A-5-035, A-7-030). The gain from the shared rule library is therefore the rule contract + verification, not the search.

## Node-cap causes
Corrected analysis (first attempt voided): 26 of 30 capped tasks are dominated by re-spelled duplicates (reorderings of the same sums/products; the search dedups only identical text), 1 by expression growth (A-2-U037), 3 not dominated by any measured cause. Inverse-rule cycles are never dominant. For the 4 tasks the planner caps and BFS solves, the cause is the planner's size heuristic (poor goal selection). See CAP-ANALYSIS.md.

## Known limitations
- A-6-017: planner and bfs claim success on a REDUCED goal the judge rejects (goal predicate mismatch in core/compose.ts).
- Node-cap analysis traces BFS, not the best-first planner.
- P2's 90 priority orders per goal were selected on tuning.json only; P2/P4 never claim wrongly but stop early.
- Re-freeze: after A-2-U037..U042 were changed by the dataset author, those six were re-run; fields of other tasks were not re-verified beyond SHA match of the final file.
- Reproduction: `cd /home/claude/core && /tmp/runts.sh tools/mathematics/core/compositional/run-compositional.ts` (SET/ONLY/ORDERS env as in the script header), then `python3 tools/mathematics/core/compositional/judge.py` and `summarize.py`.
