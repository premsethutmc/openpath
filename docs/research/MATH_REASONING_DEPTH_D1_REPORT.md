# OpenPath D1 Generalized Multi-Step Mathematical Reasoning

## Recommendation

**MERGE READY for the bounded supported rewrite families.** D1 accepts additional noncanonical composite steps without weakening U4, domain restrictions, earliest-error behavior or fail-closed outcomes. It is deterministic rewrite discovery, not unrestricted theorem search.

## Existing reasoning audit

Before D1, OpenPath already accepted student-selected sequential lines, alternative rational-polynomial forms, supported log/trig/radical rewrites, explicit cross-domain stages and non-reference calculus methods. It preserved restrictions, assumptions, obligations and first invalid lines.

The concrete depth limitation was recursive composition. M3 applied supported rewrites once to each side. A student line such as `log(exp(log(exp(x)))) -> x` requires the same exact inverse rule twice; it remained unsupported even though both operations were individually supported. U4 likewise replayed only one recursive pass. Valid routes could therefore be refused solely because supported rewrites were nested rather than written on separate lines.

Cross-domain coordination remains explicit typed stages. D1 does not infer arbitrary transitions or turn a correct final result into proof of earlier work.

## Bounded composite-step verification

D1 adds deterministic fixed-point rewriting to M3 and the independent U4 kernel:

1. normalize the current typed expression;
2. apply the existing supported assumption-aware rules recursively;
3. normalize again;
4. stop when the exact canonical state is unchanged;
5. reject cycles and stop at the existing rewrite/resource budget.

The default maximum remains 32 rewrite applications, with M3's existing limits of 256 nodes, depth 24, 512 terms/canonicalization candidates and 64 submitted lines. No heuristic numerical comparison, unrestricted enumeration or reference-solution matching was added.

The mechanism composes expansion/factorization, exact rational normalization, cancellation, log/exp inverses, supported identities, radical/absolute-value rules and simplification where each operation already exists. Unsupported functions remain unsupported.

## Proof trace and U4 integration

U4's result now includes an ordered trace:

```text
{ index, rule }
```

The trace is produced by the independent kernel while it replays the original source and target expressions. It is not copied from the M3 certificate. For the new nested example the kernel trace contains two ordered `log-exp-inverse` applications. M3 accepts the step only when U4 returns `verified`.

Dependencies remain unique and acyclic. Restrictions and assumptions are checked on every line. A kernel rejection or exhausted search becomes unsupported/resource-exhausted rather than an incorrect student verdict.

## Alternative routes newly supported

D1 newly verifies nested compositions of existing rules, including repeated log/exp inverse simplification and combinations followed by exact rational-polynomial normalization. In the independent corpus, **30 valid trig/log composite routes** change from unsupported under U4 to verified under D1. No new subject or mathematical identity was introduced.

Other corpus routes demonstrate:

- expanded, factored and reordered polynomial forms;
- several valid transformations compressed into one student line;
- radical-to-absolute-value reasoning;
- calculus-context symbolic simplification;
- explicit M1-to-symbolic cross-domain stages;
- correct final expressions following an earlier invalid line.

## Independent validation

The committed corpus contains **300 independently labelled cases**, 60 in each requested category. The first **100** are explicitly frozen before final tuning.

| Category | Cases |
|---|---:|
| Alternative algebraic routes | 60 |
| Trigonometric and logarithmic routes | 60 |
| Radical and equation routes | 60 |
| Calculus transformations | 60 |
| Cross-domain reasoning | 60 |

Outcomes:

- verified: **150**;
- invalid: **60**;
- unsupported: **30**;
- incomplete: **30**;
- resource exhausted: **30**;
- false acceptances: **0**;
- false rejections: **0**;
- first-invalid-step/classification agreement: **300/300**;
- valid alternative routes newly accepted: **30**;
- unsupported valid routes reduced: **30**.

Cases include combined transformations, wrong first and second lines, missing/unavailable reasoning, a correct later expression after an invalid step, unfinished working and 65-line exhaustion. Unsupported outcomes are not counted as mathematical successes.

## Regression results

- Full learning/unified suite: **818 passed, 0 failed, 4,806 assertions, 0 skipped** across 47 files.
- Geometry G2-G4: **47 passed, 0 failed**.
- U4 adversarial certificate corpus remains green.
- U3 audit and M3 independent/held-out corpora remain green.
- M1/M2, C2/C3 and worker-pool fault/concurrency suites remain green.

No previously invalid transformation became verified without a U4-checked proof.

## Performance

Local warm measurements, 100 assessments per category:

| Workload | p50 ms | p95 ms | p99 ms |
|---|---:|---:|---:|
| One-step exact transformation | 0.541 | 1.403 | 6.252 |
| Five-step solution | 1.528 | 3.552 | 4.883 |
| Ten-step solution | 1.994 | 3.092 | 7.028 |
| Nested combined transformation | 0.025 | 0.133 | 0.364 |
| 65-line adversarial limit | 0.002 | 0.004 | 0.010 |

The adversarial case exits immediately at the line budget. These are development-container microbenchmarks, not production latency guarantees.

## Remaining limitations

1. Discovery only composes the existing typed rewrite rules; it does not invent substitutions, auxiliary constructions or arbitrary theorem routes.
2. The trace identifies independently replayed rules but is not a general serialized proof calculus with every subexpression state.
3. General trigonometric, logarithmic, radical and piecewise identities outside M3/U4 remain inconclusive.
4. Cross-domain paths must use explicit supported stages and proof obligations.
5. Missing assumptions remain missing assumptions; D1 does not search for assumptions that the student did not establish.
6. Exact solution-set construction and geometry theorem search remain owned by their existing domain reasoners.

D1 deepens supported reasoning while preserving the key boundary: unfamiliar unproved mathematics remains inconclusive rather than guessed.
