# E7 Mathematical Integrity Repair — engineering record

Branch `feat/math-generalization-core-e7`, audit baseline `c15786f`. **Nothing merged or deployed.** Stage commits: S1 `f27905f`, S2 `bc07252`, S3 `8138d8d`, S4 (this commit). Spec: `MATH_E7_REPAIR_SPEC.md`. Harness/outputs: `tools/mathematics/generalization-e7/repair/` (`gate.sh`, `out-*`).

## A. Invariant → code map
| Inv | Enforcer (existing component, minimal change) | Mechanism |
|---|---|---|
| A claim-bound evidence | `proof-obligations.ts`, `certification-authority.ts::standsOnObligations`, new helper `evidence-binding.ts` | content-addressed claim identity, whole-token claim containment, premises digest = certifier's task digest; typed evidence bound to the submitted step; `bound:true` required to stand |
| B uniform domain | `e6-calc.ts` (`logDomainGaps`, `singularOnInterval`, `typedCalculusDomainGap`), `unified-math-engine.ts` typed calculus branch | typed route runs the *same* functions as the natural route (divergent integral / `ln x` for ∫1/x non-verified) |
| C premise binding | `independent-checker.ts` (`withPremises`, leading-inequality reorder), `proof-context.ts::statementPremises` | premises collected once, order-independent, restrict the solution set; student assumptions cannot discharge task assumptions |
| D derivation | `claim-grounding.ts::literalProvenance` (one rule), used by `natural-geocalc-e5.ts`, `e6-numbers.ts` (every chain member), `unified-math-engine.ts::algebraGroundings`; `proof-obligations.ts` (dependency inherits ungrounded premise lines); `rule-labels.ts` | every numeral must be task / established / licensed constant or named sum / shown computation over explained operands / previous-line closure / balance parameter; goal value and free `|n|≤2` removed |
| E parse fidelity | `natural-working.ts`, `e6-common.ts`, `claim-ledger.ts`, `natural-geocalc-e5.ts` (list-marker stripper), `parse-fidelity.ts`, `e6-parse.ts`, `e6-common.ts::Builder.add` | `1.5y` keeps `1.`; numeral-loss round trip → `unsupported`; unbracketed `d/dx 1/x` → `ambiguous`; "from a to b" ≡ `[F]_a^b`; a refutation of a partly-interpreted clause → `unsupported`, never `invalid` |
| F capability | `evidence-provenance.ts` (`families`, `claimFamily`, `attribute(…, claim)`) | algebra-checker mechanisms declared algebra-only; a calculus/geometry/probability claim is never proven by them; legacy rule-form `invalid` remains non-refuting (Phase 6 rule 3) |

Rule labels (D): correct+applicable → verified; correct+inapplicable (power rule on `sin 2x`) → `invalid`; correct+unrecognised → verified and recorded `uncertified` in `domainPayload.ruleLabels`; incorrect transformation → `invalid`.

## B. Change log
S1 `f27905f`,`bc07252` evidence binding + ledger fidelity fixes · S2 domain/premise unification · S3 `8138d8d` provenance rule, E5/E6/algebra application, rule labels · S4 parse fidelity, verdict classes, capability families.

## C. Generalization evidence (all property/metamorphic, seeded PRNG, oracle = exact arithmetic for truth only)
`evidence-binding-e7`, `domain-uniform-e7`, `premise-binding-e7`, `derivation-e7` (angle chains with fabricated arithmetic, algebra smuggled numerals, probability chains, rule-label matrix over random n/a/k), `parse-integrity-e7` (decimal-leading lines × list markers, parse round trip with injected loss, evaluation-in-words × random bounds, `d/dx` extent, family declarations). Tests: 1190 → **1226 pass / 0 fail**.

## D. Regression report (exposed corpora; holdout is exposed, diagnostic only)
| | baseline c15786f | final |
|---|---|---|
| unit tests | 1190/0 | 1226/0 |
| 1725-case scan exact / final verified | 1438 / 658 | 1438 / 658 (no verified case lost) |
| scan false acceptances | 6 (contested reference labels) | same 6, unchanged |
| injection: false runs verified | 0/4474 | 0/4474 |
| injection: true runs surviving | 635 | **596** (−39, not individually triaged) |
| 678 exposed holdout: exact | 232 | 235 |
| holdout confirmed false acceptances | 5 | 0 |
| holdout false rejections / unsupported / malformed / verified | 214 / 268 / 117 / 89 | 213 / 272 / 117 / 85 |
| twin (cross-route) agreement | 8/15 | 8/15 |
| latency p50 / p95 (holdout diag) | 1.32 / 11.3 ms | 1.1 / 8.5 ms |
Battery-p6: 1 mismatch (`alg-side`, pre-existing). Holdout figures are exposed performance; no case-specific tuning; original frozen results retained.

## E. Risk register
1. Coincidences among *established* numbers still ground a line (declared residual of the provenance rule).
2. Side calculations are excluded (not credited), so a working that ends on the true conclusion stays verified even if an interior line is fabricated; this is the intended "concise answer entailed by the task" policy.
3. Injection true-survivors fell 635→596: some valid-but-ungrounded insertions are now not verified; not triaged.
4. Typed core cannot differentiate |·| (`ln|x|` typed unsupported); 213 exposed holdout false rejections remain (mostly unsupported scope).
5. `d/dx a/b` unbracketed is now `ambiguous` (honest, but valid shorthand is not credited). `[F] evaluated at a and b` and prose-embedded evaluations remain `unsupported`; the claim ledger works on original text, not the normalised text.
6. Rule-label applicability covers power/chain/product/quotient only; other labels are `uncertified`. Mechanism families are coarse (notation-based `claimFamily`).
7. Authority still does not re-run kernels; two kernels sharing a blind spot are not covered.
8. 6 contested reference cases (e6-251 etc.) decided from obligations, unchanged.

## F. Scope declaration
Reliably certified within declared scope: single-variable exact algebra (linear/polynomial/radical equations with premises, extraneous roots), exact numeric chains, grounded triangle-angle and coordinate-formula geometry, grounded probability/complex/series chains over the task's data, typed derivative/antiderivative steps with checked rule labels and domain audit. Not certified: arbitrary proofs, open-ended geometry theorems, multivariable calculus, non-elementary integrals, prose-only reasoning, anything outside the registered mechanism families (reported `unsupported`/`ambiguous`, not `invalid`). No claim of general completeness; fresh blind evaluation has **not** been run.

## Answers
1. **Enforced?** A–F enforced through the shared mechanisms above; D and F are enforced to the declared residuals (E.1, E.6).
2. **Bypass?** None found: each corpus/injection/holdout false acceptance class closed; verified requires bound evidence, grounding, domain audit and a family-matched mechanism. Untested: routes not exercised by the suites.
3. **General:** exact algebra/number kernels, evidence binding, provenance rule, premise/domain handling, family declarations.
4. **Pattern-dependent/unsupported:** claim-family classification (notation regexes), prose claim extraction, rule-label applicability beyond four rules, geometry beyond angle/coordinate chains, non-elementary calculus.
5. **Evidence:** 36 new generated-property tests (≈ hundreds of generated cases), corpus parity, 0/4474 injection false verifications, exposed-holdout FA 5→0 (diagnostic only).
6. **Before a fresh blind evaluation:** E.3 triage, E.5 ledger on normalised text, broader rule-label kernels, a fresh holdout (requires authorization), re-audit of routes not covered by the suites.
