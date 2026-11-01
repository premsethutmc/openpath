# Bounded repair of the seven learning failures

Continuation from `1a278f1a2efe70357b8e970aa42de34fd5e972bd`. Mathematics only. No frozen fixture, expected benchmark label, safety assertion, production flag or permission was changed.

## Repairs and unresolved tests

| Original failing test | Cause | Result |
|---|---|---|
| U1: `200 independently labelled arithmetic, algebra, geometry and mixed cases` | 23 expected indices identify unestablished steps rather than disproven steps. All 200 classifications agree. | Still fails; strict unsupported neutrality retained. |
| M1/U2: `100 independently labelled mixed-domain journeys preserve the first failing domain` | Geometry stages contain bare conclusions, while the frozen oracle treats entailment as demonstrated reasoning. First failure: `geometry-quadratic-0`. | Still fails; no invented method evidence. |
| U2: `250 independently labelled proof-carrying transfer cases` | Bare conclusions, legacy unestablished-step indices, and wrong-citation labels conflict with strict method semantics. | Still fails; frozen assertions unchanged. |
| U2: `repeated and concurrent requests reuse the bounded persistent pool` | Its successful-request fixture was an uncited conclusion, so it never reached the intended successful-method lifecycle. | Passes. Clone the fixture and supply its actual `triangle-sum` citation; retain every reuse/concurrency assertion. |
| U2: `worker termination and timeout fail closed and recover` | Same invalid success-fixture assumption. | Passes. Supply a valid method in a clone; retain PID change, timeout refusal, algebra isolation and recovery assertions. |
| U2: `proof-carrying obligations reject circular, mismatched, and missing-domain transfers` | Geometry's unsupported result returned before validating the explicitly supplied transfer contract. | Production fix: validate that contract before invoking the worker. Original assertions pass, plus malformed results with the worker unavailable. |
| D2: `the frozen external benchmark improves without label changes` | The benchmark repeatedly embeds the same bare U2 geometry conclusion. | Still fails: 105/120 legacy-valid cases accepted; 15 unsupported, zero false acceptances against the frozen labels. |

The lifecycle helper refuses inputs with multiple steps or an existing citation, so a future fixture change cannot silently overwrite an intentional justification. Frozen input objects are not mutated.

The transfer fix distinguishes a caller-supplied contract from the old handoff that this adapter synthesizes. Supplied contracts are validated first. Synthesized handoffs retain their previous validation order, so unsupported geometry retains its refusal and historical classifications. Neither path grants new credit or changes the Python authority.

## Exact contract conflicts requiring a decision

- `u1-geometry-33`: frozen result is `missing-assumption`, index `0`; strict result is the same classification with index `null`. No step is disproven. Returning index 0 as learner-invalid feedback would contradict the corrected contract.
- `u2-angle-00`: geometry submission is only `A = 120`, with no cited rule or intermediate geometry step. The frozen expectation is `verified`; strict method assessment is `unsupported`. The conclusion may be true without being demonstrated learner reasoning.
- `u2-angle-34`: the true triangle-angle conclusion cites `parallel-alternate`, without the necessary premises. The frozen oracle calls it `invalid`; the strict checker refuses unsupported reasoning without calling a valid conclusion false.
- `d2-geometry-00`: repeatedly embeds the uncited U2 conclusion. More stages do not create missing method evidence.

A diagnostic pass over every row found U1: 23 index-only mismatches out of 200; U2: 195 mismatches out of 250 (120 formerly verified bare methods, 40 downstream-invalid labels blocked by unsupported geometry, 20 missing-assumption indices, 15 wrong-citation labels); D2: 17 mismatches out of 200 (15 formerly verified and two formerly incomplete).

These are unresolved foundation compatibility regressions, not upstream failures. An independent reviewer rejected redirecting these tests to a legacy API just to report green. No such API was added. The bounded decision is whether to introduce a separately versioned method benchmark with explicitly authored proofs and safety-consistent labels while retaining the original frozen corpus as historical evidence. That would be a visible contract migration, not a claim that the original assertions passed. The strict method default must remain unchanged.

## Content-consistency defect found without full regeneration

The failed year job runs `specs → library → families-parity → coverage → expansion → board-releases → compile-coverage`, then checks generated-file differences. Local dependency inspection found that `COVERAGE.md` still printed the old fingerprints for `aaadd` and `adcol3`, although the committed specifications already contained the repaired addition content's fingerprints.

Updated only those two rows: `8f685f8a → 6890d45d`, `3ed23af6 → 9e9bb198`. A bounded evaluation of the actual `familySpec` function for those families verified both specification fingerprints and the complete coverage-row strings using the generator's format. No counts, approvals, pools or frozen question tables were changed. This is a definite consistency defect; it is not proof that it was the only cause of remote failure.

Remote job `124820299863` in run `41297161567` failed the content stage after 41m 9s. Its own build and browser acceptance stages were skipped. Terminal log retrieval repeatedly returned `Transport closed`. The earlier CLI fallback was denied HTTP Forbidden and was not retried or evaded. No duplicate full generation was started.

## Focused validation

- Original four failing test files: **10 pass, 4 fail**, versus 7 pass / 7 fail before this repair.
- Repaired U2 lifecycle/transfer tests: **3 pass**, including worker-unavailable validation and unchanged recovery assertions.
- Certification, geometry adversarial reasoning, worker pool, grading working and grading contract: **63 pass, 0 fail**.
- D1, D3 and calculus cross-domain regressions: **8 pass, 0 fail**.
- Mathematics integration typecheck: passes with zero diagnostics.
- Bounded addition-spec/coverage-row comparison: both complete rows match current generator inputs.
- Independent review: no blocker in the minimal diff; remaining oracle conflicts must stay visible.

No full frontend suite, full content regeneration or browser rerun was needed for this local iteration: no UI, Python checker, persisted schema or trusted grader bundle input changed. The affected unified boundary is covered by certification and cross-domain tests. A later aggregate learning run must still report the four retained failures until a contract decision is made. The year consistency and its skipped acceptance stages still require remote validation after publication; prior browser passes cannot substitute for them.
