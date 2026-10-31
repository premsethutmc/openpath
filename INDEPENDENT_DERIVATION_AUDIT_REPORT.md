# Independent audit — local-rewrite certification at 32c7f2c

No production code was modified. Nothing merged or deployed. Evidence: `tools/mathematics/answer-key-certification/independent-audit/` (`heldout-corpus.json` 281 cases authored by a separate agent that was forbidden from reading the implementation, design documents and prior labels; `run-corpus.ts`, `analyze.py`, raw `results-{new,old}[-bare].json`). "Old" = parent commit 5d6003e. Labels are the author-agent's mathematical judgement (125 verified / 86 unsupported / 61 invalid / 9 debatable); I disputed one label (see 2).

## Decision
**Do not merge as is.** No mathematically false claim became verified (0 of 61 invalid-labelled cases verified; 60 reported invalid at the correct first false line, 1 unsupported). But the registry does **not** yet reliably refuse unjustified derivations it was not designed against, and it **regresses** several common legitimate steps.

## 1. Reconciliation
- 279/280: the corpus has 280 cases; 279 carry a design label and all 279 match. The unmatched case is `symbolic-37` (`x²+6x+5=0 → ((x+3)²−9)+5=0 → …`), intentionally unlabelled; it is verified both before and after the change. (279/280 therefore means "all labelled cases", not "one failure".)
- Tests: `bun test packages/learning` = **1353 pass / 0 fail** (82 files), reproduced in 2 further full runs here.
- Performance (280-case corpus, per submission): total 702→1013 ms; median 1.0→3.0 ms, p90 5→6, p99 23→24, max 31→42. Held-out 281: total 563→897 ms; median 1.21→1.54, p90 4.0→6.4, p99 13.4→29.9, max 25→40.7. The reported +44% is confirmed (+~60% on held-out); worst-case latency is still tens of ms.

## 2. Held-out results
Statements exactly as authored ("Compute 18+27"): new 172 match / 71 false-reject / **16 false-accept** / 13 other; old 172 / 65 / 22 / 13.
Statements reduced to the bare task (verbs and "for x≠0" stripped, to isolate the registry from input-contract effects): new **204 match / 55 false-reject / 10 false-accept / 3 other / 9 debatable**; old 187 / 54 / 28 / 3 / 9.
Transitions old→new on the bare corpus: smuggling verified→refused **19**; legitimate unsupported→verified **17**; legitimate verified→unsupported **18 (regressions)**; new false accepts that old refused **1**.

**False acceptances (true but unjustified; bare corpus, 10):** one is a label dispute (`9×8=72; 72=8×9`: 8×9 is a commutation of a visible expression, acceptable). Real: (a) `46+29 → 46+29+17−17` (cyclic split, F1); (b) `−9+5=−4; −4=−10+6` ×2 (negative answer, F3); (c) five equation-route lines: `3x+5=24+5`, `3x×1=24`, `x=2×4`, `x=1+5`, `2x=3+13` (F4; the last one old refused — a new acceptance).
**False rejections (bare, 55):** ~9 are artefacts of stripping domain conditions, ~7 are algebra tasks stated as expressions (route contract), the remaining ~39 are registry-attributable (F5, F6). **Certificate replay failures:** none on honest certificates; see 3.

## 3. Certificate audit
Every accepted rewrite carries rule, source, replacement, path, kernel certificate and digest, and replay re-derives them without search. Tamper test: 1200 single-field mutations without recomputing the digest: 0 changed certificates passed (165 passes were unchanged no-ops). That is integrity only. **Forgery that passes replay without justifying the claim:** with the digest recomputed, 244/1200 mutated certificates replay; 24 differ from the honest steps. More importantly:
- **F1 cyclic split (safety).** `46+29 → 46+29+17−17` is certified as `46→29+17` plus `29→46−17`: each block is true and kernel-verified, replay passes, the whole is equal, yet it is the forbidden `+k−k` pad. Cause: replacement parts may be other source terms, and the matcher reuses them. Verified through the full engine (verified, ASCII and unicode).
- **Context is not in the certificate.** `96→95+1`, `6→4713−4707`, `2x+6→2x+4713−4707`, `37+59→(37+20000)+(59−20000)` all certify and replay; the answer-valued restriction lives only in `rewriteLicense`. Replay is therefore internal consistency, not provenance. Through the engine, `2x+4713−4707=12` and the 20000 shift are **verified**: arbitrary constants are admitted whenever a visible numeral is split or a shift is shown (inherent to the design as approved; its acceptance criterion "without arbitrary free constants" is only met for *undetermined* constants).
- Domain: `x/x→1`, `(x²−1)/(x−1)→x+1` refused as plain rewrites; only vacuous nonzero-constant restrictions are waived. Assumptions are refused rather than carried.

## 4. Answer-valued restriction
- Does not block legitimate continuation of a larger expression: `96×2=(90+6)×2`, `(100−4)×2` verified; `95×2+1×2` refused.
- Blocks bare restatement of an intermediate/final value, including **legitimate place-value splits**: `85=80+5`, `383=300+80+3`, `3.75=3+0.75`, and scaling `5/6=10/12` (6 held-out cases). These are indistinguishable from `95+1` under the generic split rule, but a place-value rule (parts are digit×10^k of the numeral itself, no free choice) would admit them and still refuse `95+1`/`44+1`; fraction scaling by a factor adds no unattached witness. **Not relaxed**; recommended only with those rules plus the anti-smuggle tests rerun.
- **F3:** the restriction does not apply to negative values (`−4` is not an atom): `−4=−10+6` is verified. Mathematically false equalities are unaffected throughout.

## 5. Route consistency (documented, not forced)
- **Statement parsing (F2, safety).** When the statement is not a bare parseable expression ("Compute 18+27"), the license finds no visible expression and silently falls back to the old rule: `45+0`, `44+1`, `45×1` verified, legitimate decompositions unsupported. "Find 18+27." and "What is 18+27?" are unsupported across the board (fail-closed). 16 of 20 original-statement false accepts are this.
- `natural-geocalc-e5` (unwired): `C=(180−50−60)*1=70` verified; arbitrary pads (`+4713−4713`, bracketed or not), `2*35`, `100−30` unsupported (pre-existing rules). Not compared with old.
- `e6-numbers` (mean): `(4+8+3)/3*1=5` and `((2+2)+8+3)/3=5` verified (the first member is never judged against a visible expression); `100−100` pads, `15/3` unshown and `10/2` smuggles are refused. No route-specific regression test exists.
- Parentheses: pad verdicts are now bracket-invariant. Legitimate regrouping is not: `(38+2)+(60−2)` verified, `38+2+60−2` unsupported (flat shifts are not matched).
- Equation lines: the registry yields no refusal for symbolic lines, so answer re-expression on the equation route (`x=6 → x=1+5`) stays verified (F4).

## 6. Fixes ranked by mathematical-safety impact
1. **F1** forbid replacement parts that equal/reuse other source terms; add a conservation check in replay (no term both kept and produced).
2. **F2** fail closed: a numeric line with no parseable visible expression must not fall back to the old rule; extract the expression from the statement or from line 1 explicitly.
3. **F3** make the answer-valued test sign-aware (signed atoms).
4. **F4** apply the refusal to equation lines (answer re-expression, `×1`); investigate why `2x=3+13` became verified.
5. Record premises/visible-expression ids and the answer-valued status in the certificate and re-check them in replay; decide a policy for determined-but-arbitrary constants (e.g. advisory flag or magnitude bound).
6. Regressions to fix (legitimate, old verified → new unsupported, 18): decimals (`0.3+0.45=0.75`, `1.2×0.5=0.6`, `−1.5+3.5=2` — licensed numerals are stored as fractions, not as the written decimal), unevaluated distribution `5×(2+9)=5×2+5×9` / `(90+3)÷3=90÷3+3÷3`, common-denominator addition `(3+2)/9`, fraction multiply `(2×3)/(3×5)`, factor-context evaluation `25×4×9=100×9`, flat regroup `38+2+60−2`.
7. Coverage: place-value rule for answer-valued numerals; fraction scaling of answer-valued fractions; domain-conditioned simplification (statement conditions currently yield ambiguous/unsupported — fail-closed).

## Final answer
**No, not yet.** It certifies truth safely and refuses most designed smuggles, but it admitted unanticipated unjustified derivations (cyclic-split pad, negative answers, equation-route re-expressions, unparsed-statement fail-open, arbitrary constants via splits/shifts) and refused ~39 legitimate held-out cases, 18 of which the previous engine verified. Fixes 1–4 and 6 are needed before a merge decision.
