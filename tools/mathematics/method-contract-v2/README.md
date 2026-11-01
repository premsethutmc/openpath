# Submitted-method benchmark contract v2

These are new method fixtures, not edits to the historical U1/U2/D2 corpora or their recorded results. They exercise the existing strict `assessMathematicalWorking` API. No compatibility mode or legacy grading authority is introduced.

## What each aggregate measures

| Aggregate | Current method route | Historical incompatibility retained in original artifacts |
|---|---|---|
| U1 200 cases | Same inputs, explicit neutral refusal/index semantics | The original index included unestablished steps. It cannot serve as a learner-invalid-step index. |
| U2 250 cases | Cited rule applications, typed transfer validation, calculations and domain restrictions | The original generator submitted bare goals as geometry proofs; 15 wrong-citation labels also treated unsupported justification as invalid mathematics. |
| M1/U2 100 journeys | Existing journey definitions use U2 method-v2 stages; M1 cases remain unchanged | The original U2 stages asserted conclusions without demonstrating their geometry method. |
| D2 200 cases plus 150 adversarial states | Same frozen expected labels; a new synthetic method-stage adapter supplies explicit triangle-sum working | The historical synthetic adapter substituted an uncited U2 stage. This benchmark is not execution of the literal externally authored reference-solution text. |

An answer-entailment API could legitimately establish a bare conclusion, but would not reproduce all these historical labels: an unsupported citation does not refute its true conclusion, and an unestablished index is not an invalid-step index. Routing the entire old corpus to an answer API would conflate those meanings again. Historical compatibility is therefore reported separately; no unsafe legacy API was added just to make tests green.

## Authorship and review

`generate.py` never calls a checker or derives labels from its outputs. It copies the historical inputs and authors explicit rule applications using the transfer family. It preserves supplied givens, existing citations, calculation errors, domain restrictions and dependency graphs. Restated givens remain restatements. Parallel fixtures use the corresponding-angle rule because their premises contain `corresponding_pair`.

Expected outcomes change only for non-refuted-step indices and unsupported wrong citations. Genuine invalid calculations and malformed transfer assertions remain in the suite. The zero-budget runtime path was also corrected to return no invalid-step index.

`migration-ledger.v2.json` records source hashes and every case, including unchanged ones:

- U1: 200 cases; 29 index expectations changed, zero working inputs changed.
- U2: 250 cases; 220 working inputs now explicitly cite their rule; 45 expectations changed. The union is 235 changed cases. Original wrong citations are retained.
- D2: 200 cases; 19 expanded synthetic working inputs changed, zero mathematical labels changed. The historical fixture builder's default output is preserved.
- M1/U2: all 100 journey dependencies recorded; 60 use changed U2 stages, 40 are unchanged.

Independent review checked source hashes, rule mappings, wrong-citation neutrality and the absence of checker-derived labels. Direct regression tests still run all 120 historically accepted bare geometry conclusions through the strict API and require unsupported/no method evidence. They also cover missing assumptions, exhausted budgets, false steps despite correct final calculations and the unchanged historical D2 builder.

## Reproduce the new artifacts

From the repository root:

```sh
python tools/mathematics/method-contract-v2/generate.py
node --import tsx tools/mathematics/method-contract-v2/record-expanded-migration.ts
bun test packages/learning/src/unified-math-engine.test.ts packages/learning/src/unified-math-engine-u2.test.ts packages/learning/src/math-m1-u2-integration.test.ts packages/learning/src/reasoning-depth-d2.test.ts packages/learning/src/method-contract-v2.test.ts
```

The historical evaluation scripts continue to reference their original corpora and remain historical comparison tools. Do not overwrite their recorded results with new-contract output, or describe new method passes as old benchmark parity.
