# Guarded local-rewrite certification — implementation report

Branch `feat/math-answer-key-certification` (draft PR #83). Not merged, not deployed. Mastery, learner evidence, question certification, teaching decisions and server grading are untouched; the exact kernel is reused, not duplicated (no second truth engine).

## Result
- `bun test packages/learning`: **1353 pass / 0 fail** (baseline 1319/0; +34 new tests: 15 registry unit/property, 19 engine adversarial).
- Decision corpus (280 submissions, old and new engine side by side): 102 unsupported→verified, 29 verified→unsupported, 0 verified→invalid, 0 invalid→anything, 149 unchanged. Against the design labels: old 148 match / 102 false-reject / 29 false-accept; new 279 match / 0 / 0 (1 unlabelled baseline-only case unchanged). **Caveat:** the corpus and labels were written by the same author as the registry, so this measures conformance to the approved design, not independent correctness; the independent evidence is the adversarial tests below.
- Safety invariants held; no check was weakened. Two regressions encountered during development were fixed by *extending the registry correctly*, not by relaxing a gate (see Findings).

## Files changed
| File | Change |
|---|---|
| `packages/learning/src/rewrite-registry.ts` (new) | parser→tree, closed registry (common `RewriteRule` interface), matcher, `RewriteCertificate`, independent `replayRewriteCertificate`, `rewriteLicense`, `hasFlattenedNumberComputation` |
| `packages/learning/src/claim-grounding.ts` | `ProvenanceEnv.rewrite` (numeral → rule + digest); `GroundingSource.rule/certificate`; a licensed numeral becomes `derived-fact` instead of `free-literal` |
| `packages/learning/src/unified-math-engine.ts` (`algebraGroundings`) | license computed per accepted line; symbolic exemption guard made bracket-insensitive; unjustified numeric side recorded as `free-literal` |
| `packages/learning/src/e6-numbers.ts` | same license on the numeric-chain route; unjustified side → grounding not relevant |
| `packages/learning/src/rewrite-registry.test.ts`, `rewrite-grounding-e8.test.ts` (new) | tests |
| `tools/.../derivation-audit/decision-corpus.ts`, `decision-run.ts`, `decision-diff.py`, `decisions-old.json`, `decisions-new.json`, `decisions-side-by-side.txt` | reproducible old/new comparison |

## Certificate format (`openpath-rewrite-certificate@1`)
`{ version, visible, result, steps[], assumptions[], restrictions[], whole: KernelCertificate, digest }`; each step `{ rule, ctx: terms|factors, path[], indices[], source[], replacement[], kernel: KernelCertificate }`. `path` addresses the changed group inside the visible expression (`t<i>` term, `f<i>` factor); `source`/`replacement` are parseable text; `digest` = sha256 of the body. Grounding records `rule` and the certificate digest on every numeral the rewrite introduces.
Replay (`replayRewriteCertificate`) does no search: it checks version and digest, re-parses, re-verifies the whole equality with `checkSymbolicCertificate`, then for each step resolves the path, checks the source is present, re-checks the registry rule's admissibility and re-verifies the block with the kernel, and requires the rebuilt expression to equal the result. Tamper, wrong expressions, unregistered rule (even with a recomputed digest) and nonexistent path are each rejected (tested).

## Registry (closed; unregistered = unsupported, never guessed)
`evaluate` (visible closed group → its lowest-terms value or its *unreduced* fraction result; never an arbitrary equal form, 96→192/2 refused) · `split-additive` (no zero part, no cancelling subset) · `split-multiplicative` (no 1 or 0 factor) · `fraction-scale` · `distribute` · `shifted-transfer` (shifts shown in grouped terms, netting to 0 across distinct visible terms). Identity/commute/associate are handled by canonical comparison. Not registered: ±0, ×1, `+k−k`, unshown equal-sum partitions (`40+56`, `95+1`, `100−4`), re-partitioning the *value of a visible computation* (answer-valued atom), assumptions, two rewrites hidden in one block, variable-restriction-dropping rewrites (`x/x→1`). Only restriction waived: `nonzero` of a nonzero constant (3≠0). Bounds: ≤6 old / ≤8 new terms, ≤80 tokens.

## Policy change (listed per request)
Symbolic exemption in `algebraGroundings` no longer depends on parentheses: it is switched off when any flattened additive/multiplicative group holds ≥2 pure-number terms (union with the old regex). Changed cases (all in `symbolic`):
- `2x + 17 - 11 = 12` unsupported → **verified** (17−11 = visible 6; now equals the bracketed form)
- `(2x+4713)+(6)-(4713) = 12`, `(2x+4713)-(4713)+6 = 12`, `(2x+4713)+(6)-(4700)-(13) = 12` verified → **unsupported**
Historical outcomes are not rewritten; old decisions are kept in `decisions-old.json`.

## Adversarial findings
1. Independent test found a real hole: after `37+59 = 96`, `96 = 95+1` was licensed (a visible numeral that is the *value of a computation* was splittable). Fixed structurally: answer-valued atoms may be restated (evaluate) but not re-partitioned or re-scaled; tests added (`95+1`, `4*24` chains).
2. The first wiring broke 6 existing tests (`(4+8+3)/3 = 5`, `6/10·6/10 = 36/100`): kernel returned "conditional" for a vacuous constant restriction, and `evaluate` did not accept unreduced results. Fixed by registering exactly those forms, not by loosening the refusal.
3. A constant such as 7 in a pad passes both with and without brackets because the **pre-existing** one-operation rule (6+1) already explains it; the bracket dependence is closed, the rule itself is unchanged (consistency test added).
4. `37+59 = 96*1` alone is classed `incomplete` rather than `unsupported` (precedence of the incomplete check); never verified. Tests close with the true value so the provenance verdict is what is asserted.
False acceptances found in new tests after fixes: 0. False rejections: none among the registered forms; known unsupported-by-design false rejections: two rewrites in one block (`6*15 → 6*10+6*5`), neutral-element moves, completing the square without a registered constant.

## Performance
Corpus (280 submissions): 709 ms → 1018 ms total (≈2.5 → 3.6 ms per submission, +44%, all in the matching/kernel calls; kernel results memoised). Full package suite ≈47 s, unchanged within noise.

## Remaining limitations
- Domains not covered: geometry/calculus/linear algebra registries, percentages, surds, exponent/log rules, word-problem semantics, equation-level moves combined with rewrites, chained `a=b=c` (parser contract).
- `natural-geocalc-e5.ts` still calls `literalProvenance` without a license (unchanged behaviour); the e6 numeric-chain route is wired and covered by existing mean/probability suites but has no dedicated adversarial test of its own.
- The registry is a finite catalogue, not a theory of justified steps; pedagogical quality (needless complexity) is advisory and non-gating by design.
- Corpus labels are author-written (see caveat).
