# E7 Phase 6 — Authoritative Certification (gate report)

Branch `feat/math-generalization-core-e7`, from `c3c70dc`. Nothing merged or deployed. E7 is **not** complete: no independent fresh holdout has evaluated the integrated system.
Detail files: `tools/mathematics/generalization-e7/phase6/` (scan, injection, battery, coverage, disputed cases, bench).

## 1. What changed

| Item | Before (Phase 5) | Now |
|---|---|---|
| Final verdict | `mergeE6` route precedence over whole envelopes | `certification-authority.ts::adjudicate` over per-route reports, decided from proof obligations |
| Who may grant `verified` | a route, then withdraw-only checks | nobody alone: a report counts as verified only if `standsOnObligations` holds (answer obligation proven, empty dependency cone, every proven derivation names a registered mechanism) |
| Evidence authority | route-provided `checker` string | `evidence-provenance.ts` registry: label must be registered, produced on a permitted route, and its producer must have taken part (reasoner id present). Each proven derivation records `mechanism` + `kernel`. Internal mechanisms (`grounding`, `proof-context`, `completeness`) can never discharge a derivation |
| Typed steps | one aggregate gate item, no obligations | per-step derivation + grounding obligations and an answer obligation, evidence = the typed domain reasoner (registered); unregistered reasoner / no steps / unproven dependency ⇒ non-certifiable |
| Text-line lists for statement problems | skipped the claim boundary | normalised to natural text, same route, same obligations |
| Calculus / geometry relevance | accepted on kernel equality | grounding obligations from anchoring: derivative, indefinite/definite integral, limit (E6 and E5), geometry numeric lines |
| True but off-task lines | calculus: reported `invalid` | `offTask` judge (incomplete, never invalid, never credited); never blocks if the remainder verifies on its own (re-assessed once; side claims reported unproven) |

### Disagreement rules (no route priority)
1. A report whose own obligations do not stand is not an acceptance.
2. A disproof of a claim the accepting route never proved stands (`invalid`). A disproof of a claim another trusted route proved ⇒ nothing certified (`unsupported`, rule `kernel-contradiction`).
3. The legacy calculus rule kernels (`calculus:exact/methods`) answer "justified by the selected rule"; their `invalid` is non-justification, not a refutation, and cannot contradict exact kernels.
4. `missing-assumption` from a route that models domains stands against an acceptance that does not. A competent route's ambiguity stands; the generic text route's ambiguity over notation a specialised route read abstains.
5. An unresolved objection is scope-only when everything it leaves open was proven and grounded by the accepting route; otherwise it stands.
6. The D5 contract (missing `+C` is `missing-assumption`) is kept as an explicit rule.

## 2. Results (exposed corpus, 1725 natural cases — not a holdout)
- **Exact-match accuracy:** 1438/1725 (83.4%); Phase 5: 1435. 0 exact matches lost, 3 gained.
- **False acceptances (final verified, reference not verified):** 6 — identical set to Phase 5 (below); injection battery: **0/4474** false runs verified; true injections surviving: 635 (Phase 5: 516).
- **Newly rejected valid work:** 0 (no case that was verified and reference-verified is now rejected). Newly verified valid work: 3 matches gained (`r6-026`, `s6-304`, `s6-332`). Status changes vs Phase 5: resource-exhausted→invalid 1, invalid→unsupported 3, unsupported→verified 2. Reference-verified-but-final-`invalid` fell from 5 to 3.
- **Newly blocked unjustified acceptances:** 0 in the corpora (none of the corpus FAs changed). Targeted battery (38 cases written from the mathematics, `battery-p6.ts`): Phase 5 9 mismatches → Phase 6 1. Ungrounded true calculations (`angle C = 100 - 30 = 70°`, `123 - 53`, `17*4+2`) are blocked by a grounding obligation; they were only "incomplete" in Phase 5 because chains such as `angle C = 180 - 110 = 70` were unrecognised, which is now fixed.
- **Tests:** 1190 pass (27 new in `certification-authority-e7.test.ts`).

### The six disputed reference cases (`disputed-cases-p6.json`)
Reference labels are recorded, never used as truth. Each is decided from obligations; every obligation is proven by a registered exact mechanism and grounded, so the verdict is `verified`. The labels each ask for a statement the task already supplies.

| case | reference | decision | basis |
|---|---|---|---|
| e5-sealed-007 | invalid | verified | AB = CA ⇒ B = C; 20 + 2B = 180 ⇒ B = 80; all claims true (9/9 proven) |
| e6-204 | ambiguous | verified | independence is a task assumption; (1/2)(1/3) = 1/6 |
| e6-263 | missing-assumption | verified | x > 0 is implied by `ln(x)` in the posed function; derivative 3/x |
| **e6-251** | missing-assumption | verified by obligations, **explicitly CONTESTED** | whether the answer must restate x ≠ 2 is the open question between adjudicator A (verified) and B (missing-assumption); not settled here and not counted as settled |
| r6-194 | ambiguous | verified | stated independence; (1/3)(1/2) = 1/6 |
| r6-220 | missing-assumption | verified | n, p, 1−p all from the posed data; 21/10 |

## 3. Coverage of every input route
7937 assessments produced by the full test suite, 3 input kinds × 40 (kind, domain) cells (`route-coverage.json`): natural text (1699), text-line lists (265), typed steps (5973). **All 7937 carry proof obligations and a certification record; 0 verified without obligations, 0 aggregate-only acceptances, 0 unattributed.** Typed domains covered: symbolic, calculus (exact/methods), geometry, mixed, complex-polynomial, linear-algebra, probability-statistics, m1 (function, quadratic, inequality, coordinate), m2 (trigonometry, exp-log, sequence-series, radical), m2- and d3-cross-domain.

## 4. Evidence provenance integrity
In the 658 verified corpus results: 1670 proven derivations, 1670 attributed to a registered mechanism (0 unattributed): `e6-independent-exact` 540, `u4+exact-solution-set` 399, `e5-independent-geocalc` 218, `u4+exact-linear-system` 190, `u4-kernel` 125, `exact-solution-set` 122, `independent-ir-evaluator` 26. Tests prove that an unregistered label, a label on the wrong route and a label whose producer did not take part are all untrusted.
Honest limit: the authority attributes and validates provenance; it does not re-execute the kernels, so it is exactly as sound as the registered kernels.

## 5. Performance (1020-case bench)
p50 1.05 → 1.42 ms, p95 6.8 → 9.4 ms, p99 16.1 ms, RSS 153 MB. Cause: every route's report now passes the claim/obligation boundary (up to 3× on geometry/calculus) plus rare side-claim re-assessment.

## 6. Remaining unsupported scope
- Definite-integral and continuity/differentiability lines have no explicit grounding obligation (481/573 calculus lines in verified corpus results are grounded; geometry 147/151). In the definite-integral family a line about a different integral is still `invalid` (transcription error and side claim cannot be told apart without evaluating it); true side claims there block rather than being excluded.
- Side-claim exclusion exists for derivative, indefinite integral, limit and geometry numeric lines; not for algebra prose (`Note that 2 + 2 = 4.` as a first line parses as malformed — pre-existing parser limit), definite integrals or probability numbers (where Phase 5 cone semantics apply).
- 3 reference-verified corpus cases are still final `invalid`, and 7 pre-existing corpus cases label valid work invalid (E6 treats ∫ statements with equal integrals over the same bounds as function identities); 16 of the true-injection runs inherit this. Not changed in Phase 6.
- Scenario-dependent probabilities (`e6-280`) are `incomplete`, never "false", but remain uncertifiable.

## 7. Unresolved certification bypasses
1. **Coincidence-level grounding:** a number one arithmetic step away from two task numbers counts as explained, so `5*1/2 = 5/2`-type and `9/6 = 3/2`-type lines are still grounded.
2. **Rule-form rule (3 above)** assumes the exact specialist kernels are right: a wrong acceptance by a single exact kernel against a rule-kernel dissent would stand. Two exact kernels sharing a blind spot are only covered by the existing domain-component test.
3. **Generic-route ambiguity abstention** assumes the specialised route read the notation correctly.
4. **Typed-step relevance is structural** (the reasoner binds each step to the typed problem); there is no independent relevance check beyond the reasoner.
5. **Legacy limits (Phase 4)** remain: base algebra ignores restrictions and branches (contained by "missing-assumption stands"), module-global resource counters in `e6-cas`, E5 flattens domain components.
6. **Authority does not re-run kernels** (section 4).
None of these produced a false acceptance in the corpora or the 4474-run injection battery; they are risks for the independent holdout.

## 8. Reproduce
`bun test packages/learning/src` · `bun tools/mathematics/generalization-e7/phase6/scan.ts <out.json>` · `cd tools/mathematics/generalization-e7/phase2 && bun injection-battery.ts` · `bun .../phase2/bench.ts` · `bun .../phase6/battery-p6.ts` (`ENGINE_ROOT=<worktree>` for a baseline) · `bun .../phase6/disputed-cases.ts`.
