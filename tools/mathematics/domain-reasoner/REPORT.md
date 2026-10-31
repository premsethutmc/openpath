# K05.2 Domain-aware reasoner: results (D0 to D5)

Implementation of PR #76. Frozen datasets, hashes, thresholds and scope are unchanged (`git diff` of `frozen/` against the proposal branch is empty). No amendment to section 13 of the milestone doc was needed. The Grade 5 pipeline and the kernel (`math-kernel.ts`) and PR #75 planner are untouched.

## Headline

| Set | Result | Acceptance |
|---|---|---|
| dev (206) | 206/206 on all three iterations | used for development |
| eval (400) | run1 399/400, run2 399/400, **run3 400/400** | needs >=95%: met (run1 alone also met it) |
| holdout (300), run once, D5 | **300/300**, 0 invalid steps | needs >=95% and zero invalid: met |
| unsupported (112) | 112/112 refused with a reason code in the oracle's list; 0 wrong answers | met |
| checker vs adversarial (1,353 invalid) | 1,353/1,353 rejected, reason codes exact | met |
| checker vs valid transitions (1,531) | 1,531/1,531 accepted | met (>=99%) |
| checker vs claims | 294/294 wrong rejected, 106/106 right accepted | met |
| engine traces re-checked by SymPy oracle | eval 2,118 steps, holdout 1,669, dev 1,071: 0 invalid steps, 0 wrong final answers | met |

Accepted invalid solutions: 0. Invalid transformations: 0. Restrictions retained at every step: yes (invariants I1 to I3 are discharged per step). Every solution is accepted only by exact substitution into the original equation (invariant I4, enforced as the precondition of `domain.accept-candidate`).

## Cost (eval / holdout)

States visited: median 23 / 29, p95 73 / 75, worst 92 / 92. Path length: median 6 / 7, worst 9 / 9. Time: median 29 ms / 40 ms, worst 304 ms / 236 ms.

## What was built

- `domain/poly.ts` (D0): exact `Poly` and `RatFun` over the kernel's bigint `Rational`; agrees with SymPy on 5,000 cases.
- `domain/domain-state.ts`, `domain-checker.ts` (D1): `DomainState` with explicit original and current restrictions, exact solution-set reasoning (polynomial gcd, restricted-factor removal, squarefree comparison). No sampling.
- `domain/domain-rules.ts` (D2): 11 rules registered through the kernel `RuleRegistry`. Each is tagged equivalence or implication. `multiply-both-sides` and `divide-both-sides` are inapplicable unless the factor is proven non-zero on the domain. The candidate-expanding variant exists, is tested, and is never used by the search.
- `domain/domain-engine.ts` (D3): refusal gate, BFS over applicable rules, exact candidate check, deterministic traces with per-step preconditions and discharged obligations.
- `run-engine.ts` (runner with stage guards: eval only with `--stage D4`, holdout only with `--stage D5`; every run is appended to `results/run-log.jsonl`) and `check_traces.py` (independent SymPy re-check).

## Failure and tuning history (nothing hidden)

1. D1: the claims checker compared a `Rational` object to a string, so 47 of 106 right claims were wrongly rejected. Fixed in code; no label, hash or threshold changed.
2. D4 eval run1: 399/400. The one failure, e198 `-12=x^2/(x)` (category search-cap), came from the terminal test not recognising `-12 = x`. Fix 1 (accept `c = x`) did not help (run2, still 399/400) because `-12` is parsed as a negated number. Fix 2 (read negated constants as constants) gave run3 400/400. Both fixes are general and were made after inspecting that failure, so eval is no longer a blind measure; run1 is preserved in `results/engine-eval-run1.json` and the run log. Holdout, run after the fixes and never inspected before, is the clean generalisation measure.
3. The unsupported set was first run at D4, because dev contains no unsupported cases. The refusal gate was therefore only developed against hand-written unit cases. It passed 112/112 on its first and later runs.

## Holdout (D5) and contamination

Run exactly once: 300/300, 0 invalid steps, 0 open obligations, 1,669 steps independently re-checked. Exact-text overlap of holdout with dev, eval and unsupported: 0. Overlap with PR #75's reasoner data: 0.

## Limits

- Scope is the frozen boundary: one unknown, linear-factor denominators with rational roots, reduced degree <= 1. Everything else is refused, never guessed.
- The scope gate decides some refusals by exact analysis of the equation, not by search.
- 100% on frozen sets of generated equations is not evidence about equations a real student would type outside the generator's recipes. A harder, differently-built set is the next honest test.
- Quadratics (K05.3) are not started and not approved.

## Reproduce

`bash tools/mathematics/domain-reasoner/run-freeze.sh` (datasets, already frozen), then from `packages/learning/src/reasoner/domain` run `run-engine.ts <set> --stage <stage>` with the node flags in the README, and `python3 -I tools/mathematics/domain-reasoner/check_traces.py <set> <label>`.
