# Frozen replay runtime, version 1

E1/E2A frozen experiments record exact hashes of floating-point model traces. They were produced with V8's historical power implementation. Node 24 enables `std::pow` by default; for example `0.5 ** (14 / 30)` changes from `0.723634618720189` to `0.7236346187201891`. Those differences propagate into the two frozen fingerprints even though the model and serialization are unchanged.

`frozen-runtime.mjs` inspects the selected Node runtime, disables `use-std-math-pow` when available, and checks the historical power result before launching tests or replay. Unsupported behavior fails explicitly. The selected Node/V8 version and flags are printed. The flag must be a CLI argument; Node does not permit it in `NODE_OPTIONS`.

From the repository root:

```sh
node tools/english/research/frozen-runtime.mjs --test packages/english-core/test/e2-research.test.ts
node tools/english/research/frozen-runtime.mjs tools/mathematics/fingerprint-portability.mts /tmp/frozen-replay.json
```

`npm test` in `packages/english-core` uses the same launcher. The original frozen hashes and all assertions remain unchanged. Under Node 24.19 the unchanged four E2 research tests pass, and both historical hashes are reproduced exactly:

- E1: `f66325454dfd2e24a2e84baf4d48ee21c98dc7462adffc204653dd43b02637fb`
- E2A: `94def3e4c98a7ba4dab463bb1672180c5bb2ba5bc08925bea0b6be978a07c0db`

This profile is limited to test/research replay. Production inference does not invoke it. It is not a new estimator, a migration of learner records, rounding of model values, or a promise of exact numerical portability in every browser. Investigations of native runtime differences may still invoke `fingerprint-portability.mts` directly without the launcher.
