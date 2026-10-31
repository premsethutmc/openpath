# Fingerprint portability decision: defer a replacement contract

**Status: investigated, no production or research fingerprint change.** Legacy exact fingerprints, frozen baselines, estimator arithmetic, evidence logs and mastery policy remain untouched. The two Node 24 snapshot failures remain visible. An output fingerprint migration has not been established safely enough to implement.

## Exact cause and reproduction

`packages/english-core/src/composite.ts:57` calculates misconception decay with `m.strength * 0.5 ** (days / p.misconception_half_life_days)`. The frozen half-life is 30 days. `0.5 ** (14/30)` is `0.723634618720189` on Node 22.18.0 / V8 12.4.254.21-node.27, versus `0.7236346187201891` on Node 24.19.0 / V8 13.6.233.17-node.51.

`tools/english/sim/simulate.ts:90–93` hashes exact JSON of the final composite, decisions and recommendations. A last-bit difference therefore changes SHA256. The legacy format has no explicit schema/runtime tag. Neither item count nor selected item sequence causes these two failures.

| Bank | Exact saved / Node 22.18.0 hash | Node 24.19.0 hash |
|---|---|---|
| E1 | `f66325454dfd2e24a2e84baf4d48ee21c98dc7462adffc204653dd43b02637fb` | `feb221e68259ede60ed4d9786983c5f42e19135547b7fad7382cf09fd4523ed0` |
| E2A | `94def3e4c98a7ba4dab463bb1672180c5bb2ba5bc08925bea0b6be978a07c0db` | `931a9c11fff42b5464714f54722066d5e575efb8eb585bbde428ba31c628245e` |

Only 10 E1 and 8 E2A final misconception-strength fields differ; maximum absolute difference is `5.551115123125783e-17`. Compared decisions, recommendation objects, estimates and other composite fields match. The prior investigation reproduced the same outputs from pristine historical commit `c58549b8069b490ecdfdc9da43565b6462ad2335`, separating runtime drift from later application changes. This follow-up reruns the current unchanged research code under both runtimes.

Run from `frontend` (output files outside the repository):

```sh
node --import tsx ../tools/mathematics/fingerprint-portability.mts /tmp/fingerprint-node24.json
npm exec --cache /workspace/.npm --yes --package=node@22.18.0 -- node --import tsx ../tools/mathematics/fingerprint-portability.mts /tmp/fingerprint-node22.json
```

The diagnostic tool writes a versioned **investigation export**, runtime/V8 identity, raw compared outputs and the existing exact hash. It is not a new fingerprint algorithm and is never consumed by learner inference or legacy assertions.

## Why no safe replacement was adopted

| Candidate | Finding |
|---|---|
| Sort object keys / encode exact IEEE-754 bits | Deterministic serialization of an identical value cannot make two different floating-point values identical. The 1-bit numeric difference remains. |
| Round only the fingerprint representation | Leaves the estimator unchanged but weakens the regression/evidence guard. For example, 12 significant digits maps both `0.21053613734161722` and the deliberately different `0.21053613734161822` to `0.210536137342`. There is no approved tolerance or proof that future values stay away from quantization boundaries. |
| Omit misconception strengths or hash only event inputs | Could be portable here, but a changed misconception-decay result would become invisible. It is a different contract, not a backward-compatible output fingerprint. |
| Recalculate strengths with a new deterministic math implementation solely for the hash | Risks a second calculation path disagreeing with the actual engine; correctness and compatibility have not been established. It must not be introduced merely to pass snapshots. |
| Regenerate the old hashes under Node 24 | Overwrites the record of the old runtime and silently changes baseline meaning. Not performed. |

The historical baseline files store hashes and summarized research measures, not a versioned full-output canonical manifest. They cannot be converted losslessly to a new output-hash contract by relabeling the digest. This task does not define a new numerical equivalence policy.

## Backward-compatible future route (not implemented)

Keep legacy exact digests readable and reproducible with Node 22.18.0. If a portable semantic comparator is approved later, add a **separate, explicitly named/versioned representation**, retain the legacy digest plus original runtime and raw evidence, declare exactly which fields/equivalences it covers, and dual-run it against archived outputs. New hashes must never overwrite old identifiers, authenticate old records by retroactive rounding, or be used as learner evidence. Unknown versions should fail closed. A generic "round all numbers" migration is unsuitable.

For now the safe operational comparison is the original exact fingerprint under its known runtime. Running research with Node 24 remains supported for investigation, with the known two exact-hash failures explicitly reported. No global Node pin, runtime change, snapshot update, baseline rewrite or inference change is included in this branch.
