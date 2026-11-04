# 04 — Mathematical authority findings (P2 boundary kept; E7 not activated; no corpus label changed)

P2 authority version is now `openpath-derivation-authority@2`; `@1` certificates no longer replay as current, and no `@1` certificate is stored anywhere. The Django grader bundle does not contain P2: it was rebuilt and is byte-identical.

## 1. Answer versus method (general rule: answer-vs-method@1)
- Production grading never records a verified method: `derivationVerified` is `false` on every path (`assessment.ts`, `grading/decision.ts`, `grading/read.ts`); test added.
- The integration interface (`derivation-interface.ts` `workingEvidence`) now uses one general rule instead of case-by-case guards: a method is shown only by a certified line that **produces something new**, meaning an expression that is neither one of the task's own expressions nor the final answer. With that rule, `x = 11`, `32`, `52 − 20 = 32`, `52 − 20 = (52 − 20)` / `(52 − 20) = 32`, and task-then-roots are all `no-method-evidence`, while `2x = 22` / `x = 11` and the factorised quadratics are `method-verified`. This corrects the M1 closure claim, which held for the tested pairs only.

## 2. Zero-product reasoning (zero-product@1, square-root@1) — implemented as general rules
In P2's solution-set conclusion, the roots may now be read off only where they are visible:
- **zero-product:** the previous line is `A1·A2·…·Ak = 0`, with every factor linear in the variable or a non-zero constant. Over a field (ℚ, ℝ, ℂ), a product is 0 exactly when some factor is 0, so `v = r1 or … or rk` is equivalent to that line. The certificate records the roots of the factors; replay re-authorizes the line from scratch.
- **square-root:** the previous line is `L² = c`, with L linear and c constant, giving L = ±√c (rational roots only).
- **first line:** a bare answer claim is certified as `answer-claim`, the same kind the linear rule already used.
- **anything else** (a jump from an unfactored polynomial to its roots) → `solve-jump`, unsupported. This is the same rule P2 already applied to linear jumps.
- Assumptions: tasks carrying conditions (for example x ≠ 3) are not refuted, and no new acceptance is granted there (fail-closed). Irrational and unparsed routes stay unsupported.
- There is no rule specific to `rl-022/023/024`. They pass because they are factorisations followed by zero-product reading. They are still **not relabelled** (09 in docs/integration stands); this change gives the adjudicator a real derivational certificate for the L2→L3 step.

## 3. Invalid versus unsupported (loses-solution@1)
- **Why unsupported before:** P2 refuted only false closed equalities (numbers, in expression tasks). A false equation step with a variable reached "no registered equation move", which is outside the authority's surface, and was therefore unsupported.
- **New general refutation:** a step from equation P to the claim N is false when some exact root r of P (P splits over ℚ) does not satisfy N, because then N does not follow from P and a solution has been lost. The counterexample is stated in the reason (`loses-solution: x = −2 satisfies the line before but not this one`). It applies only when it is certain: tasks without conditions, an exact root, and both sides evaluating.
- **Examples:** `(x + 3)(x + 6) = 0` from `x² + 11x + 18 = 0`, one root only, a wrong root, `3x = 8` from `3x + 5 = 14`, and a forgotten division are now invalid.

## Effect on the frozen corpora (labels untouched)
| Corpus | Cases | Matches its labels: M1 → M2 | Changed | Changes |
|---|---|---|---|---|
| HELDOUT3 (and its bare variant) | 477 | 317 → 335 | 20 | 18 labelled invalid: unsupported → invalid; 2 labelled debatable: unsupported → invalid |
| HELDOUT2 (and bare-corpus) | 442 | 332 → 339 (327 → 334) | 8 | 7 labelled invalid: unsupported → invalid; 1 labelled debatable: unsupported → invalid |

No case labelled "verified" changed, and none became verified; nothing newly accepted. **For adjudication (labels not changed):** `rl-044` (x² = 25 → x = 5), `rl-045` (x² = 49 → x = 7) and `domain-division-by-zero-017` (x² = 6x → x = 6) are labelled debatable and are now invalid. In each, a root of the previous line fails the new one, so as a solving step the line is false; read only as "5 is a solution" it is true. P2 final checks (replay attacks) are unchanged: see 08.
