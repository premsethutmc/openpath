# 09 — Six disputed corpus cases: independent review (closure)

Corpus `tools/mathematics/answer-key-certification/p2-validation/HELDOUT3-corpus.json`, sha256 `cb32bb06…deb1a6` — unchanged, equal to the frozen hash (frozen 2026-10-30T09:52Z, commit d511785). **No label was modified.** The third corpus informed P2 implementation fixes before freezing, so it is not untouched held-out data; its acceptance figures are not independent evidence.

Method: each case was run through the real authority (`assessChain`) with per-line verdicts, the certificate chain, and an independent replay (`replayDerivationChain`, re-normalising the task and re-authorizing every line). Then through the integration interface (`authorizeWorking`/`workingEvidence`), and checked by hand. Adversarial probes on the same task show what a "solve-conclusion" certificate actually establishes.

| Case | Task | Lines | Hand check | P2 per line (move / part:grade) | Replay | Interface | Label | Recommendation |
|---|---|---|---|---|---|---|---|---|
| tr-002 | Compute 52 − 20 (integers, no assumptions) | `52 − 20 = (52 − 20)`; `(52 − 20) = 32` | true; 52−20 = 32 | L1 chain, identity:none; L2 chain, rewrite:determined | ok (2 certs) | unsupported (restatement-only) | unsupported | **Keep unsupported** |
| tr-006 | Compute 82 − 25 | `82 − 25 = (82 − 25)`; `(82 − 25) = 57` | true; 57 | same pattern | ok | unsupported | unsupported | **Keep unsupported** |
| tr-021 | Find the value of 86 − 33 | `86 − 33 = (86 − 33)`; `(86 − 33) = 53` | true; 53 | same pattern | ok | unsupported | unsupported | **Keep unsupported** |
| rl-022 | Solve x² + 11x + 18 = 0 (no domain stated; integer roots, same set over ℝ and ℂ) | `x^2 + 11x + 18 = 0`; `(x + 9)(x + 2) = 0`; `x = −9 or x = −2` | (x+9)(x+2) = x²+11x+18; zero product gives −9, −2; both roots satisfy the equation | L1 identity; L2 side-rewrite, polynomial-normalization:determined; L3 solve-conclusion (no assumptions or domain conditions recorded) | ok (3 certs) | authorized; method-verified on the certified factorisation | unsupported | **Do not relabel (yet)** |
| rl-023 | Solve x² − 2x − 8 = 0 | `…`; `(x − 4)(x + 2) = 0`; `x = 4 or x = −2` | (x−4)(x+2) = x²−2x−8; roots 4, −2 | same as rl-022 | ok | as rl-022 | unsupported | **Do not relabel (yet)** |
| rl-024 | Solve x² − 17x + 72 = 0 | `…`; `(x − 8)(x − 9) = 0`; `x = 8 or x = 9` | (x−8)(x−9) = x²−17x+72; roots 8, 9 | same as rl-022 | ok | as rl-022 | unsupported | **Do not relabel (yet)** |

Why "keep unsupported" for tr-*: every line is true, and P2 certifies it. But line 1 only restates the task, and line 2 states the value: no transformation of the problem is shown beyond its answer. As evidence of a method this is no better than the bare answer. The label category ("task-restatement") encodes exactly that. Note that the authority itself still verifies these chains. The interface's restatement guard (`derivation-interface.ts`) is the only reason they are unsupported for evidence. Whether P2 should refuse the pattern itself is a product decision.

Why not relabel rl-* (correct factorisation is not enough): the factorisation transition (L1→L2) is a certified rewrite (expansion normal forms agree). The root-extraction transition (L2→L3) is certified only as `solve-conclusion`. Probes on the same task show that this certificate checks that the stated solution set equals the task's, not that it follows from L2:
- the answer alone, `x = −9 or x = −2`, is "authorized"; so is the jump `x^2 + 11x + 18 = 0` → `x = −9 or x = −2`;
- one root only → unsupported (no registered move); a wrong root or wrong sign → unsupported (solution-set-differs); `and` for `or` → unsupported (unparsed);
- a wrong factorisation `(x + 3)(x + 6) = 0` → unsupported, **not invalid**: a false step is not identified as false.

So the zero-product step is outcome-checked, not authorized as a derivation. Relabel to "authorized" only after zero-product is a registered move with its own certificate, and after the invalid-factorisation case is decided. Until then the label stays.

Correction made in the integration interface (narrow, tested in `derivation-interface.test.ts`): `workingEvidence` no longer reports method evidence for an authorized chain whose only moves are `identity` and/or `solve-conclusion` (answer-only and jump workings). P2 was not changed. Residual: for the rl-* working, method evidence rests on the certified factorisation line; the conclusion line is outcome-checked. No adaptive decision consumes `workingEvidence` yet (it is logged in the slice trace only).
