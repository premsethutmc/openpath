# 8. Integration manifest and readiness (18 packages)

Source commit for every id, partition and check: `637938c7da0416b03595fae60a80607e60aa84c0` (foundation, draft PR #96). Regenerate with `tools/build.mts`, then `tools/manifest.mts`, then `tools/manifest-md.py`. The machine-readable form is `integration-manifest.json`.

Categories are **integration readiness only. They are not educator approval**: every package is still a review candidate. A package can be in more than one category; its primary category is the first that applies, in the order review → content → runtime → ready.

Shared runtime requirements (Codex):
- **B1** teaching scope (`teachingScopeFor` accepts only the module's main family).
- **B2** diagnosis reader (`probeReading` cannot read decimal, money or tuple predictions).
- **B3** addressed misconception read from verbatim family text.
- **P1** diagnosis policy: misconception-evidence@1 establishes a misconception from any two matches, while these packages need a contrast or written-form condition. **This is not one of the three blockers Codex is handling; it is flagged here as an unresolved contract requirement.**

## Summary

| Package | Primary | All categories | Runtime | Missing questions / visuals | Review |
|---|---|---|---|---|---|
| [TP-ALG-01](batch-1/TP-ALG-01.md) | **Blocked by missing questions or visuals** | Blocked by missing questions or visuals; Blocked by shared runtime support | B1 | 5 | — |
| [TP-GEO-01](batch-1/TP-GEO-01.md) | **Blocked by missing questions or visuals** | Blocked by missing questions or visuals; Blocked by shared runtime support | B1 | 1 | — |
| [TP-GEO-02](batch-1/TP-GEO-02.md) | **Blocked by missing questions or visuals** | Blocked by missing questions or visuals; Blocked by shared runtime support | B1, B3 | 1 | — |
| [TP-MEA-01](batch-1/TP-MEA-01.md) | **Blocked by missing questions or visuals** | Blocked by missing questions or visuals; Blocked by shared runtime support | B1, P1 | 1 | — |
| [TP-NUM-01](batch-1/TP-NUM-01.md) | **Blocked by missing questions or visuals** | Blocked by missing questions or visuals; Blocked by shared runtime support | P1 | 1 | — |
| [TP-NUM-02](batch-1/TP-NUM-02.md) | **Blocked by missing questions or visuals** | Blocked by missing questions or visuals; Blocked by shared runtime support | P1 | 2 | — |
| [TP-NUM-03](batch-1/TP-NUM-03.md) | **Blocked by shared runtime support** | Blocked by shared runtime support | B1, B2, B3 | — | — |
| [TP-PRO-01](batch-1/TP-PRO-01.md) | **Blocked by missing questions or visuals** | Blocked by missing questions or visuals; Blocked by shared runtime support | B1 | 1 | — |
| [TP-STA-01](batch-1/TP-STA-01.md) | **Ready for integration review** | Ready for integration review | — | — | — |
| [TP2-CH-BAG](batch-2/TP2-CH-BAG.md) | **Blocked by missing questions or visuals** | Blocked by missing questions or visuals | — | 1 | — |
| [TP2-CH-BALL](batch-2/TP2-CH-BALL.md) | **Ready for integration review** | Ready for integration review | — | — | — |
| [TP2-PRT-NAME](batch-2/TP2-PRT-NAME.md) | **Ready for integration review** | Ready for integration review | — | — | — |
| [TP2-PRT-SHADE](batch-2/TP2-PRT-SHADE.md) | **Blocked by shared runtime support** | Blocked by shared runtime support | B1 | — | — |
| [TP2-PV-DIGIT](batch-2/TP2-PV-DIGIT.md) | **Blocked by missing questions or visuals** | Blocked by missing questions or visuals; Blocked by shared runtime support | B1, P1 | 1 | — |
| [TP2-REG-MONEY](batch-2/TP2-REG-MONEY.md) | **Blocked by shared runtime support** | Blocked by shared runtime support | B1, B2 | — | — |
| [TP2-REG-TIME](batch-2/TP2-REG-TIME.md) | **Blocked by missing questions or visuals** | Blocked by missing questions or visuals; Blocked by shared runtime support | B1, B2 | 2 | — |
| [TP2-SCL-BAR](batch-2/TP2-SCL-BAR.md) | **Ready for integration review** | Ready for integration review | — | — | — |
| [TP2-SCL-PICT](batch-2/TP2-SCL-PICT.md) | **Blocked by shared runtime support** | Blocked by shared runtime support | B1, P1 | — | — |

## Per package

### TP-ALG-01 — (a + b)²: why the middle term is 2ab

- **Scope:** `MATH.algebra.identities`, family `ahid` (Expanding with (a + b)², (a − b)² and (a + b)(a − b)). Parameters: ahid with params[0] ∈ {0, 1} ((px + q)², (px − q)²) and params[3] = 1 (the box is the x coefficient); examples need p ≥ 2, p ≠ q, q ≠ 2p, p ≠ 2q. The served module is synthesised, its main family is `expand`, and the family is in its pools: yes.
- **Misconception ids targeted:** `middle-not-doubled` (conceptual; diagnosable) → `fix_middle_not_doubled`, `middle-sign` (procedural; diagnosable) → `fix_middle_sign`. **Reused:** —. **Modelled but not targeted** (general teaching only): —.
- **Diagnostic contrast:** (px + q)², middle `gen:ahid:0,4,9,1` (check); (px − q)², middle `gen:ahid:1,4,3,1` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `integer`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: ahid has no working contract; an expansion written as working is not examined (answer-level only).
- **Visuals:** used `grid`; missing: labelled 2 × 2 area model (spec 09 V5: 'grid' + labels, rowLabels, colLabels).
- **New strategies:** `ahid_concept`, `fix_middle_not_doubled`, `fix_middle_sign`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic ((px + q)², middle) | `gen:ahid:0,4,9,1` | check | typed | taken from the check partition for a diagnostic role |
| diagnostic ((px − q)², middle) | `gen:ahid:1,4,3,1` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:ahid:0,5,2,1` | practice | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:ahid:1,3,8,1` | practice | typed | served, fresh, unexposed |
| misconception example (middle-not-doubled, shown solved) | `gen:ahid:0,5,7,1` | practice | typed | served, fresh, unexposed |
| misconception guided (middle-not-doubled) | `gen:ahid:0,2,5,1:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (middle-not-doubled) | `gen:ahid:1,4,5,1` | check | typed | served, fresh, unexposed |
| misconception example (middle-sign, shown solved) | `gen:ahid:0,5,4,1` | practice | typed | served, fresh, unexposed |
| misconception guided (middle-sign) | `gen:ahid:1,3,4,1:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (middle-sign) | `gen:ahid:0,4,6,1` | check | typed | served, fresh, unexposed |
| guided practice | `gen:ahid:1,2,8,1:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:ahid:1,5,9,1:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:ahid:0,3,5,1:mc` | practice | mc | served, fresh, unexposed |
| fresh recheck | `gen:ahid:0,3,9,1:mc` | check | mc | served, fresh, unexposed |
| fresh recheck | `gen:ahid:1,5,1,1:mc` | check | mc | served, fresh, unexposed |
| transfer | `gen:ahid:0,3,2,1:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:ahid:0,5,6,1:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:ahid:1,2,3,1` | retention | typed | served, fresh, unexposed |
| retention (delayed) | `gen:ahid:1,2,6,1` | retention | typed | served, fresh, unexposed |

**Missing questions:** diagnostic case "(px + q)², middle": the family's diagnostic partition has no usable item (only ambiguous ones); candidate gen:ahid:0,4,9,1 is taken from the CHECK partition and must be re-partitioned or replaced at integration; delayed checks: no usable retention item for case "(px + q)², middle" (another case's item stands in); binomial delayed checks: 14 of 54 retention items ask the cross term; 3 of them are (px + q)² and 0 of those avoid a copied-number reading. The positive-square delayed check is MISSING: the retention partition has no unambiguous (px + q)² cross-term item, so the delayed check of the title skill is not covered (generator partition change: Codex)..

**Proposed questions (NOT served; specification in [09](09-MISSING-QUESTIONS-AND-VISUALS.md)):**

| Need | Role | Proposed question | Served today as | Change |
|---|---|---|---|---|
| MQ1 | diagnostic | `gen:ahid:0,3,7,1` | diagnostic gen:ahid:0,3,7,1:mc | pin typed form (already in the diagnostic partition, served as :mc) |
| MQ1 | retention | `gen:ahid:0,2,9,1` | practice gen:ahid:0,2,9,1:mc | partition override practice → retention, applied after form assignment |

**Unresolved contract requirements (Codex):**

- B1 teaching scope: ahid_concept, fix_middle_not_doubled, fix_middle_sign are outside teachingScopeFor (main family expand); ineligible until the selector accepts 'ahid'
- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family
- visual: labelled 2 × 2 area model (spec 09 V5: 'grid' + labels, rowLabels, colLabels)

**Independent review:** Pass 4: no outstanding finding. The (px + q)² cross-term delayed check is a recorded missing question.

### TP-GEO-01 — The exterior angle of a triangle

- **Scope:** `MATH.geometry.triangle-properties`, family `ahext` (The exterior angle of a triangle). Parameters: ahext, both forms: params[2] = 0 (find the exterior angle) and 1 (find an interior opposite angle); examples avoid coincident angles. The served module is synthesised, its main family is `ahtri`, and the family is in its pools: yes.
- **Misconception ids targeted:** `third-interior` (conceptual; diagnosable) → `fix_third_interior`, `adjacent-interior` (conceptual; diagnosable) → `fix_adjacent_interior`, `exterior-as-interior` (conceptual; diagnosable) → `fix_exterior_as_interior`. **Reused:** —. **Modelled but not targeted** (general teaching only): `one-angle`, `added`.
- **Diagnostic contrast:** find the exterior angle `gen:ahext:51,21,0` (diagnostic); find an interior opposite angle `gen:ahext:32,96,1` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `integer`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: ahext has a geometry task (geometry-task.ts) for the foundation's geometry working adapter; the Python reasoner has NO exterior-angle rule (G5 R07), so a citation of the exterior-angle theorem is not verifiable; the 'via the third angle' route uses supported rules (triangle-sum, straight-line).
- **Visuals:** used `triangle`; missing: triangle with an extended side and its exterior angle (spec 09 V3: 'triangle' + exterior + notToScale; supersedes the provisional data, which put the second opposite angle on the wrong vertex).
- **New strategies:** `ahext_concept`, `fix_third_interior`, `fix_adjacent_interior`, `fix_exterior_as_interior`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (find the exterior angle) | `gen:ahext:51,21,0` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (find an interior opposite angle) | `gen:ahext:32,96,1` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:ahext:39,112,0` | practice | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:ahext:93,36,1` | practice | typed | served, fresh, unexposed |
| misconception example (third-interior, shown solved) | `gen:ahext:34,27,0` | practice | typed | served, fresh, unexposed |
| misconception guided (third-interior) | `gen:ahext:34,53,0:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (third-interior) | `gen:ahext:111,26,0` | check | typed | served, fresh, unexposed |
| misconception example (adjacent-interior, shown solved) | `gen:ahext:108,27,1` | practice | typed | served, fresh, unexposed |
| misconception guided (adjacent-interior) | `gen:ahext:23,76,1` | practice | typed | served, fresh, unexposed |
| misconception fresh check (adjacent-interior) | `gen:ahext:47,45,1` | check | typed | served, fresh, unexposed |
| misconception example (exterior-as-interior, shown solved) | `gen:ahext:45,83,1` | practice | typed | served, fresh, unexposed |
| misconception guided (exterior-as-interior) | `gen:ahext:25,60,1:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (exterior-as-interior) | `gen:ahext:69,32,1:mc` | check | mc | served, fresh, unexposed |
| guided practice | `gen:ahext:62,79,0:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:ahext:34,63,0:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:ahext:80,39,0` | practice | typed | served, fresh, unexposed |
| fresh recheck | `gen:ahext:86,70,0:mc` | check | mc | served, fresh, unexposed |
| fresh recheck | `gen:ahext:44,76,1` | check | typed | served, fresh, unexposed |
| transfer | `gen:ahext:44,105,1:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:ahext:21,85,1:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:ahext:56,89,0:mc` | retention | mc | served, fresh, unexposed |
| retention (delayed) | `gen:ahext:77,74,1` | retention | typed | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- B1 teaching scope: ahext_concept, fix_third_interior, fix_adjacent_interior, fix_exterior_as_interior are outside teachingScopeFor (main family ahtri); ineligible until the selector accepts 'ahext'
- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family
- visual: triangle with an extended side and its exterior angle (spec 09 V3: 'triangle' + exterior + notToScale; supersedes the provisional data, which put the second opposite angle on the wrong vertex)

**Independent review:** Pass 4: no outstanding finding.

### TP-GEO-02 — Vertically opposite angles are equal

- **Scope:** `MATH.geometry.angle-pairs`, family `afcross` (Angles where two straight lines cross). Parameters: afcross, all three forms: params[1] = 0 vertically opposite, 1 adjacent, 2 the other three (contrast); angles within 5° of 90 excluded from examples. The served module is synthesised, its main family is `afpair`, and the family is in its pools: yes.
- **Misconception ids targeted:** `opposite-as-linear` (conceptual; diagnosable) → `fix_opposite_as_linear`, `neighbour-equal` (conceptual; diagnosable) → `fix_neighbour_equal`. **Reused:** —. **Modelled but not targeted** (general teaching only): `full-turn`, `straight-only`, `all-equal`.
- **Diagnostic contrast:** vertically opposite `gen:afcross:105,0` (diagnostic); adjacent `gen:afcross:126,1` (diagnostic); other three `gen:afcross:84,2` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `integer`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: afcross modes 0/1 have a geometry task (foundation adapter); mode 2 (other three) has none (geometry-task.ts excludes b === 2). G5 R06: a vertically-opposite citation for a MEASURE was rejected by the reasoner; route through straight-line steps is supported.
- **Visuals:** used `angle`; missing: two crossing lines with four angles (spec 09 V4: 'angle' + cross + labels).
- **New strategies:** `afcross_concept`, `fix_opposite_as_linear`, `fix_neighbour_equal`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (vertically opposite) | `gen:afcross:105,0` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (adjacent) | `gen:afcross:126,1` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (other three) | `gen:afcross:84,2` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:afcross:128,0` | practice | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:afcross:149,1` | practice | typed | served, fresh, unexposed |
| misconception example (opposite-as-linear, shown solved) | `gen:afcross:104,0` | practice | typed | served, fresh, unexposed |
| misconception guided (opposite-as-linear) | `gen:afcross:109,0:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (opposite-as-linear) | `gen:afcross:70,0` | check | typed | served, fresh, unexposed |
| misconception example (neighbour-equal, shown solved) | `gen:afcross:147,1` | practice | typed | served, fresh, unexposed |
| misconception guided (neighbour-equal) | `gen:afcross:27,1:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (neighbour-equal) | `gen:afcross:146,1:mc` | check | mc | served, fresh, unexposed |
| guided practice | `gen:afcross:29,0:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:afcross:107,1:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:afcross:152,0:mc` | practice | mc | served, fresh, unexposed |
| fresh recheck | `gen:afcross:158,0:mc` | check | mc | served, fresh, unexposed |
| fresh recheck | `gen:afcross:40,1:mc` | check | mc | served, fresh, unexposed |
| transfer | `gen:afcross:35,0:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:afcross:81,0:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:afcross:42,0` | retention | typed | served, fresh, unexposed |
| retention (delayed) | `gen:afcross:37,1` | retention | typed | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- B1 teaching scope: afcross_concept, fix_opposite_as_linear, fix_neighbour_equal are outside teachingScopeFor (main family afpair); ineligible until the selector accepts 'afcross'
- B3 addresses: fix_opposite_as_linear — the platform reads addresses = null (family 'says' overridden); the gate would accept any established misconception
- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family
- visual: two crossing lines with four angles (spec 09 V4: 'angle' + cross + labels)

**Independent review:** Pass 4: no outstanding finding.

### TP-MEA-01 — Area or perimeter? Covering versus going round

- **Scope:** `MATH.measurement.area-squares`, family `aeperar` (Choosing area or perimeter in a problem). Parameters: aeperar, both forms: params[0] = 0 (covering: area) and 1 (going round: perimeter); items where 2(l + w) = l × w are excluded (they cannot separate the two). The served module is synthesised, its main family is `aearea`, and the family is in its pools: yes.
- **Misconception ids targeted:** `perimeter-for-area` (conceptual; diagnosable) → `fix_perimeter_for_area`, `area-for-perimeter` (conceptual; diagnosable) → `fix_area_for_perimeter`, `two-sides` (procedural; diagnosable) → `fix_two_sides`. **Reused:** —. **Modelled but not targeted** (general teaching only): —.
- **Diagnostic contrast:** covering (area), first context `gen:aeperar:0,3,15,2` (diagnostic); going round (perimeter), first context `gen:aeperar:1,4,11,2` (diagnostic); covering (area), another context `gen:aeperar:0,4,16,0` (diagnostic); going round (perimeter), another context `gen:aeperar:1,5,7,2` (diagnostic). Rule: A 'two-sides' answer (length + width) on the covering item and on the going-round item counts as two different errors (adding instead of multiplying; adding only half the sides), so the pair must not establish one misconception. A learner who multiplies on both items is right on the covering item and is suspected of area-for-perimeter only; one who adds all four sides on both is suspected of perimeter-for-area only. Trigger conditions: `fix_perimeter_for_area`: a response pattern below with establishes = true; patterns with competing explanations must not establish it; `fix_area_for_perimeter`: a response pattern below with establishes = true; patterns with competing explanations must not establish it; `fix_two_sides`: a response pattern below with establishes = true; patterns with competing explanations must not establish it.
- **Answer formats:** family type `integer`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used `grid`; missing: perimeter outline (spec 09 V2: 'shape' rectangle + outline).
- **New strategies:** `aeperar_concept`, `fix_perimeter_for_area`, `fix_area_for_perimeter`, `fix_two_sides`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (covering (area), first context) | `gen:aeperar:0,3,15,2` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (going round (perimeter), first context) | `gen:aeperar:1,4,11,2` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (covering (area), another context) | `gen:aeperar:0,4,16,0` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (going round (perimeter), another context) | `gen:aeperar:1,5,7,2` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:aeperar:0,9,11,0` | practice | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:aeperar:1,9,10,1` | practice | typed | served, fresh, unexposed |
| misconception example (perimeter-for-area, shown solved) | `gen:aeperar:0,6,9,1` | practice | typed | served, fresh, unexposed |
| misconception guided (perimeter-for-area) | `gen:aeperar:0,12,16,2:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (perimeter-for-area) | `gen:aeperar:0,2,11,2` | check | typed | served, fresh, unexposed |
| misconception example (area-for-perimeter, shown solved) | `gen:aeperar:1,8,15,2` | practice | typed | served, fresh, unexposed |
| misconception guided (area-for-perimeter) | `gen:aeperar:1,14,15,2` | practice | typed | served, fresh, unexposed |
| misconception fresh check (area-for-perimeter) | `gen:aeperar:1,13,14,1` | check | typed | served, fresh, unexposed |
| misconception example (two-sides, shown solved) | `gen:aeperar:1,2,12,1` | practice | typed | served, fresh, unexposed |
| misconception guided (two-sides) | `gen:aeperar:1,10,16,1:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (two-sides) | `gen:aeperar:1,4,6,2:mc` | check | mc | served, fresh, unexposed |
| guided practice | `gen:aeperar:0,6,14,2` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:aeperar:0,5,6,0:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:aeperar:0,7,12,2:mc` | practice | mc | served, fresh, unexposed |
| fresh recheck | `gen:aeperar:0,11,15,1:mc` | check | mc | served, fresh, unexposed |
| fresh recheck | `gen:aeperar:1,10,13,1` | check | typed | served, fresh, unexposed |
| transfer | `gen:aeperar:0,6,7,1:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:aeperar:0,8,14,1:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:aeperar:0,4,5,1:mc` | retention | mc | served, fresh, unexposed |
| retention (delayed) | `gen:aeperar:1,7,16,0` | retention | typed | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- B1 teaching scope: aeperar_concept, fix_perimeter_for_area, fix_area_for_perimeter, fix_two_sides are outside teachingScopeFor (main family aearea); ineligible until the selector accepts 'aeperar'
- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family
- policy: 'established' requires the contrast/trigger condition (misconception-evidence@1 counts any two matches)
- visual: perimeter outline (spec 09 V2: 'shape' rectangle + outline)

**Independent review:** Pass 4: no outstanding finding.

### TP-NUM-01 — Comparing fractions with the same top number

- **Scope:** `MATH.number.fraction-comparison`, family `adfcmp` (Comparing two fractions with the same bottom or top number). Parameters: adfcmp with params[0] = 1 (same numerator); both asks (params[4] = 0 greater, 1 smaller). Contrast items: params[0] = 0 (same denominator). The served module is authored, its main family is `adfcmp`, and the family is in its pools: yes.
- **Misconception ids targeted:** `bigger-bottom-bigger` (conceptual; diagnosable) → `fix_bigger_bottom_bigger`. **Reused:** —. **Modelled but not targeted** (general teaching only): `more-parts-wrong-way`.
- **Diagnostic contrast:** same top, asks greater `gen:adfcmp:1,1,8,2,0` (diagnostic); same top, asks smaller `gen:adfcmp:1,7,12,11,1` (diagnostic); same bottom, asks greater (contrast) `gen:adfcmp:0,11,1,10,0` (diagnostic); same bottom, asks smaller (contrast) `gen:adfcmp:0,11,6,3,1` (diagnostic). Rule: Read the four items together (response patterns below). Two same-top matches establish bigger-bottom-bigger ONLY when both same-bottom contrast items are right; if the contrast items are wrong too, a reversal explains all the answers and nothing is established. misconception-evidence@1 today would establish it from the two same-top matches alone; the contrast condition is a policy request for Codex (05). Trigger conditions: `fix_bigger_bottom_bigger`: a response pattern below with establishes = true; patterns with competing explanations must not establish it.
- **Answer formats:** family type `fraction`; forms used: typed, word; multiple choice not available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used `grid`; missing: two equal-length fraction strips (spec 09 V1: 'strips' widget + bottomShaded, and a 'strips' case in Figure; the provisional two-grid data draws unequal wholes).
- **New strategies:** `adfcmp_concept`, `fix_bigger_bottom_bigger`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (same top, asks greater) | `gen:adfcmp:1,1,8,2,0` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (same top, asks smaller) | `gen:adfcmp:1,7,12,11,1` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (same bottom, asks greater (contrast)) | `gen:adfcmp:0,11,1,10,0` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (same bottom, asks smaller (contrast)) | `gen:adfcmp:0,11,6,3,1` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:adfcmp:1,1,9,11,0` | practice | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:adfcmp:1,1,3,9,1` | practice | typed | served, fresh, unexposed |
| misconception example (bigger-bottom-bigger, shown solved) | `gen:adfcmp:1,1,9,10,0` | practice | typed | served, fresh, unexposed |
| misconception guided (bigger-bottom-bigger) | `gen:adfcmp:1,1,4,8,1` | practice | typed | served, fresh, unexposed |
| misconception fresh check (bigger-bottom-bigger) | `gen:adfcmp:1,1,6,7,1` | check | typed | served, fresh, unexposed |
| guided practice | `gen:adfcmp:1,1,9,8,0` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:adfcmp:1,1,4,11,0` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:adfcmp:1,1,8,3,1` | practice | typed | served, fresh, unexposed |
| fresh recheck | `gen:adfcmp:1,1,10,5,0` | check | typed | served, fresh, unexposed |
| fresh recheck | `gen:adfcmp:1,2,11,7,1` | check | typed | served, fresh, unexposed |
| transfer | `gen:adfcmp:1,2,9,7,1:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:adfcmp:1,3,8,5,1:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:adfcmp:1,1,2,12,0` | retention | typed | served, fresh, unexposed |
| retention (delayed) | `gen:adfcmp:1,7,10,8,1` | retention | typed | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family
- policy: 'established' requires the contrast/trigger condition (misconception-evidence@1 counts any two matches)
- visual: two equal-length fraction strips (spec 09 V1: 'strips' widget + bottomShaded, and a 'strips' case in Figure; the provisional two-grid data draws unequal wholes)

**Independent review:** Pass 4: no outstanding mathematical/instructional finding.

### TP-NUM-02 — Adding like fractions: the bottom number names the piece size

- **Scope:** `MATH.number.fraction-add-like`, family `fadd` (Adding or subtracting like fractions). Parameters: fadd with params[3] = 1 (addition); examples: gcd(a + b, n) = 1, a ≠ b, a > 1, b > 1 The served module is authored, its main family is `fadd`, and the family is in its pools: yes.
- **Misconception ids targeted:** `add-denominators` (conceptual; diagnosable) → `fix_add_denominators`, `multiply-tops` (procedural; diagnosable) → `fix_multiply_tops`. **Reused:** —. **Modelled but not targeted** (general teaching only): —.
- **Diagnostic contrast:** sum below one `gen:fadd:3,5,9,1` (diagnostic). Rule: The value (a + b)/(2n) is also what 'averaging the two fractions' gives, for EVERY like-fraction sum, so no item can separate add-denominators from averaging by value. Only the written form separates them: '(a+b)/(2n)' written unsimplified (e.g. 8/18) supports add-denominators; a simplified equal value (4/9) leaves both open. The grader compares values, so the raw response text must be read for this (integration note, 05). One diagnostic case only (no improper-sum item in the diagnostic partition). Trigger conditions: `fix_add_denominators`: both matching responses are WRITTEN unsimplified as (a + b)/(2n) (e.g. 8/18), read from the raw response text; a simplified equal value (4/9) also fits 'averaging the two fractions' and must not count. Even the unsimplified form can come from halving 8/9 as 8/18, so the fix teaches piece size and the recheck must use a new item.
- **Answer formats:** family type `fraction`; forms used: typed, mc; multiple choice available; everyday form NOT available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: fadd has a family contract statement (a/n ± b/n), so the existing derivation authority (working-assessment@1) can examine typed arithmetic working; the answer alone earns answer credit only.
- **Visuals:** used `grid`; missing: none.
- **New strategies:** `fadd_concept`, `fix_add_denominators`, `fix_multiply_tops`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (sum below one) | `gen:fadd:3,5,9,1` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:fadd:2,3,6,1` | practice | typed | served, fresh, unexposed |
| misconception example (add-denominators, shown solved) | `gen:fadd:2,3,7,1` | practice | typed | served, fresh, unexposed |
| misconception guided (add-denominators) | `gen:fadd:3,4,12,1:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (add-denominators) | `gen:fadd:7,2,10,1:mc` | check | mc | served, fresh, unexposed |
| misconception example (multiply-tops, shown solved) | `gen:fadd:2,5,9,1` | practice | typed | served, fresh, unexposed |
| misconception guided (multiply-tops) | `gen:fadd:5,4,11,1` | practice | typed | served, fresh, unexposed |
| misconception fresh check (multiply-tops) | `gen:fadd:3,2,11,1:mc` | check | mc | served, fresh, unexposed |
| guided practice | `gen:fadd:3,2,8,1:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:fadd:4,2,7,1:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:fadd:2,9,12,1` | practice | typed | served, fresh, unexposed |
| fresh recheck | `gen:fadd:8,2,11,1:mc` | check | mc | served, fresh, unexposed |
| fresh recheck | `gen:fadd:4,3,11,1` | check | typed | served, fresh, unexposed |
| retention (delayed) | `gen:fadd:4,3,8,1:mc` | retention | mc | served, fresh, unexposed |
| retention (delayed) | `gen:fadd:5,3,11,1` | retention | typed | served, fresh, unexposed |

**Missing questions:** fadd has no word (transfer) form: transfer candidates cannot be drawn from the generator; transfer is MISSING CONTENT (authored candidates below are text only, unverified by the grader).; transfer: the family has no word (everyday) form; authored transfer text is NOT gradable.

**Proposed questions (NOT served; specification in [09](09-MISSING-QUESTIONS-AND-VISUALS.md)):**

| Need | Role | Proposed question | Served today as | Change |
|---|---|---|---|---|
| MQ4 | transfer | `gen:fadd:1,2,5,1:w` | practice gen:fadd:1,2,5,1:mc | generator: add fadd.word(p) (one function; same answer) |

**Unresolved contract requirements (Codex):**

- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family
- policy: 'established' requires the contrast/trigger condition (misconception-evidence@1 counts any two matches)

**Independent review:** Pass 4: no outstanding finding. Transfer is missing content (manifest).

### TP-NUM-03 — Comparing decimals: place value, not length

- **Scope:** `MATH.number.decimal-tenths`, family `aedecc` (Comparing a tenths decimal with a hundredths decimal). Parameters: aedecc, all items (one tenths and one hundredths decimal with the same whole part). The served module is synthesised, its main family is `aedec`, and the family is in its pools: yes.
- **Misconception ids targeted:** `longer-is-larger` (conceptual; NOT diagnosable: other) → `fix_longer_is_larger`, `shorter-is-larger` (conceptual; NOT diagnosable: other) → `fix_shorter_is_larger`. **Reused:** —. **Modelled but not targeted** (general teaching only): —.
- **Diagnostic contrast:** tenths decimal is greater `gen:aedecc:2,8,1,3` (diagnostic); hundredths decimal is greater `gen:aedecc:1,4,8,7` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `exact`; forms used: typed, word; multiple choice not available; everyday form available. Trusted grader: supported. Diagnosis reader: **not supported (B2)**.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used `grid`; missing: none.
- **New strategies:** `aedecc_concept`, `fix_longer_is_larger`, `fix_shorter_is_larger`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (tenths decimal is greater) | `gen:aedecc:2,8,1,3` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (hundredths decimal is greater) | `gen:aedecc:1,4,8,7` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:aedecc:0,5,0,1` | practice | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:aedecc:3,1,4,2` | practice | typed | served, fresh, unexposed |
| misconception example (longer-is-larger, shown solved) | `gen:aedecc:2,2,0,1` | practice | typed | served, fresh, unexposed |
| misconception guided (longer-is-larger) | `gen:aedecc:3,6,1,5` | practice | typed | served, fresh, unexposed |
| misconception fresh check (longer-is-larger) | `gen:aedecc:1,7,6,4` | check | typed | served, fresh, unexposed |
| misconception example (shorter-is-larger, shown solved) | `gen:aedecc:1,2,7,7` | practice | typed | served, fresh, unexposed |
| misconception guided (shorter-is-larger) | `gen:aedecc:3,3,8,1` | practice | typed | served, fresh, unexposed |
| misconception fresh check (shorter-is-larger) | `gen:aedecc:1,1,2,9` | check | typed | served, fresh, unexposed |
| guided practice | `gen:aedecc:0,6,8,7` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:aedecc:1,3,4,8` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:aedecc:2,1,7,9` | practice | typed | served, fresh, unexposed |
| fresh recheck | `gen:aedecc:3,4,3,8` | check | typed | served, fresh, unexposed |
| fresh recheck | `gen:aedecc:2,6,7,7` | check | typed | served, fresh, unexposed |
| transfer | `gen:aedecc:0,7,4,9:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:aedecc:0,9,7,9:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:aedecc:0,8,7,4` | retention | typed | served, fresh, unexposed |
| retention (delayed) | `gen:aedecc:2,7,8,8` | retention | typed | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- B1 teaching scope: aedecc_concept, fix_longer_is_larger, fix_shorter_is_larger are outside teachingScopeFor (main family aedec); ineligible until the selector accepts 'aedecc'
- B2 diagnosis reader: 'longer-is-larger' reads as other (answer type exact); fix_longer_is_larger cannot be triggered
- B2 diagnosis reader: 'shorter-is-larger' reads as other (answer type exact); fix_shorter_is_larger cannot be triggered
- B3 addresses: fix_longer_is_larger — the platform reads addresses = null (family 'says' overridden); the gate would accept any established misconception
- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family

**Independent review:** Pass 4: no content finding. The fixes are unreachable until B2 (and B3 for fix_longer_is_larger). Note: the diagnostic and fix example share tenths digits with items of the module's main family aedec.

### TP-PRO-01 — Two spinners or dice: totals are not equally likely

- **Scope:** `MATH.probability.sample-space`, family `akdice` (Probability from the sample space of two dice or spinners). Parameters: akdice with params[2] = 0 ("the total is exactly k"); totals made by at least two pairs for diagnostics, rechecks and delayed checks. The served module is synthesised, its main family is `akss`, and the family is in its pools: yes.
- **Misconception ids targeted:** `totals-equally-likely` (conceptual; diagnosable) → `fix_totals_equally_likely`, `order-ignored` (conceptual; diagnosable) → `fix_order_ignored`, `added-sides` (procedural; diagnosable) → `fix_added_sides`. **Reused:** —. **Modelled but not targeted** (general teaching only): —.
- **Diagnostic contrast:** same-size spinners, a total made by several pairs `gen:akdice:5,5,0,4` (diagnostic); different-size spinners, a total made by several pairs `gen:akdice:4,5,0,7` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `fraction`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used `table`; missing: none.
- **New strategies:** `akdice_concept`, `fix_totals_equally_likely`, `fix_order_ignored`, `fix_added_sides`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (same-size spinners, a total made by several pairs) | `gen:akdice:5,5,0,4` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (different-size spinners, a total made by several pairs) | `gen:akdice:4,5,0,7` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:akdice:3,3,0,4` | practice | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:akdice:4,5,0,3` | practice | typed | served, fresh, unexposed |
| misconception example (totals-equally-likely, shown solved) | `gen:akdice:3,5,0,6` | practice | typed | served, fresh, unexposed |
| misconception guided (totals-equally-likely) | `gen:akdice:5,5,0,7:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (totals-equally-likely) | `gen:akdice:3,5,0,3:mc` | check | mc | served, fresh, unexposed |
| misconception example (order-ignored, shown solved) | `gen:akdice:6,6,0,7` | practice | typed | served, fresh, unexposed |
| misconception guided (order-ignored) | `gen:akdice:5,5,0,9:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (order-ignored) | `gen:akdice:6,6,0,3` | check | typed | served, fresh, unexposed |
| misconception example (added-sides, shown solved) | `gen:akdice:4,5,0,2` | practice | typed | served, fresh, unexposed |
| misconception guided (added-sides) | `gen:akdice:5,5,0,10` | practice | typed | served, fresh, unexposed |
| misconception fresh check (added-sides) | `gen:akdice:3,5,0,2` | check | typed | served, fresh, unexposed |
| guided practice | `gen:akdice:3,3,0,2` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:akdice:3,3,0,3:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:akdice:5,6,0,11:mc` | practice | mc | served, fresh, unexposed |
| fresh recheck | `gen:akdice:4,4,0,6` | check | typed | served, fresh, unexposed |
| fresh recheck | `gen:akdice:4,6,0,10:mc` | check | mc | served, fresh, unexposed |
| transfer | `gen:akdice:4,6,0,8:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:akdice:3,4,0,4:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:akdice:6,6,0,6` | retention | typed | served, fresh, unexposed |
| retention (delayed) | `gen:akdice:4,6,0,3:mc` | retention | mc | served, fresh, unexposed |

**Missing questions:** rechecks: no usable check item for case "different-size spinners, a total made by several pairs" (another case's item stands in).

**Proposed questions (NOT served; specification in [09](09-MISSING-QUESTIONS-AND-VISUALS.md)):**

| Need | Role | Proposed question | Served today as | Change |
|---|---|---|---|---|
| MQ5 | recheck | `gen:akdice:4,5,0,4:mc` | check gen:akdice:4,5,0,4:mc | selection only, after decision A (a recheck may repeat a diagnostic's answer) |

**Unresolved contract requirements (Codex):**

- B1 teaching scope: akdice_concept, fix_totals_equally_likely, fix_order_ignored, fix_added_sides are outside teachingScopeFor (main family akss); ineligible until the selector accepts 'akdice'
- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family

**Independent review:** Pass 5: the dice/spinner wording is fixed; no outstanding finding.

### TP-STA-01 — The median: order first, then find the middle

- **Scope:** `MATH.statistics.median-mode`, family `akmed` (Finding the median). Parameters: akmed, all items (5–10 different whole numbers); examples, diagnostics and rechecks need |mean − median| ≥ 3. The served module is synthesised, its main family is `akmed`, and the family is in its pools: yes.
- **Misconception ids targeted:** `not-ordered` (procedural; diagnosable) → `None`, `mean-for-median` (conceptual; diagnosable) → `fix_mean_for_median`, `one-middle` (procedural; diagnosable) → `fix_one_middle`. **Reused:** `spot_the_mistake` (not-ordered). **Modelled but not targeted** (general teaching only): —.
- **Diagnostic contrast:** odd count `gen:akmed:13,5` (diagnostic); even count `gen:akmed:23,8` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `fraction`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used none; missing: none.
- **New strategies:** `fix_mean_for_median`, `fix_one_middle`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (odd count) | `gen:akmed:13,5` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (even count) | `gen:akmed:23,8` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:akmed:76,5` | practice | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:akmed:71,10` | practice | typed | served, fresh, unexposed |
| misconception example (not-ordered, shown solved) | `gen:akmed:32,5` | practice | typed | served, fresh, unexposed |
| misconception guided (not-ordered) | `gen:akmed:8,6:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (not-ordered) | `gen:akmed:77,7:mc` | check | mc | served, fresh, unexposed |
| misconception example (mean-for-median, shown solved) | `gen:akmed:71,9` | practice | typed | served, fresh, unexposed |
| misconception guided (mean-for-median) | `gen:akmed:77,5:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (mean-for-median) | `gen:akmed:29,5` | check | typed | served, fresh, unexposed |
| misconception example (one-middle, shown solved) | `gen:akmed:32,6` | practice | typed | served, fresh, unexposed |
| misconception guided (one-middle) | `gen:akmed:79,6:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (one-middle) | `gen:akmed:33,6` | check | typed | served, fresh, unexposed |
| guided practice | `gen:akmed:76,7:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:akmed:13,9` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:akmed:51,9` | practice | typed | served, fresh, unexposed |
| fresh recheck | `gen:akmed:0,9` | check | typed | served, fresh, unexposed |
| fresh recheck | `gen:akmed:0,8:mc` | check | mc | served, fresh, unexposed |
| transfer | `gen:akmed:27,6:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:akmed:35,8:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:akmed:8,7` | retention | typed | served, fresh, unexposed |
| retention (delayed) | `gen:akmed:24,10` | retention | typed | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family

**Independent review:** Pass 5: the shared-answer note is fixed; no outstanding finding.

### TP2-CH-BAG — Count marbles, not colours

- **Scope:** `MATH.probability.chance-language`, family `akchance` (Probability from 0 (impossible) to 1 (certain)). Parameters: akchance with params[3] ∈ {0, 1} (is X / is not X); diagnostics need unequal colour counts (colours-equal differs from the answer). The served module is synthesised, its main family is `akchance`, and the family is in its pools: yes.
- **Misconception ids targeted:** `colours-equal` (conceptual; diagnosable) → `fix_colours_equal`. **Reused:** `worked_steps` (favourable over all (general)), `scale_words` (the 0–1 scale), `spot_the_mistake` (odds). **Modelled but not targeted** (general teaching only): `count-only`, `event-itself`.
- **Diagnostic contrast:** unequal colours `gen:akchance:2,3,2,0` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `fraction`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used none; missing: none.
- **New strategies:** `fix_colours_equal`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (unequal colours) | `gen:akchance:2,3,2,0` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:akchance:4,2,4,0` | practice | typed | served, fresh, unexposed |
| misconception example (colours-equal, shown solved) | `gen:akchance:8,2,1,0` | practice | typed | served, fresh, unexposed |
| misconception guided (colours-equal) | `gen:akchance:6,6,2,1:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (colours-equal) | `gen:akchance:2,7,5,0:mc` | check | mc | served, fresh, unexposed |
| guided practice | `gen:akchance:5,8,3,0:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:akchance:2,6,3,0` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:akchance:8,8,2,0:mc` | practice | mc | served, fresh, unexposed |
| fresh recheck | `gen:akchance:9,9,4,0:mc` | check | mc | served, fresh, unexposed |
| fresh recheck | `gen:akchance:6,4,0,1` | check | typed | served, fresh, unexposed |
| transfer | `gen:akchance:1,1,6,1:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:akchance:7,1,6,1:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:akchance:7,9,1,0:mc` | retention | mc | served, fresh, unexposed |
| retention (delayed) | `gen:akchance:5,7,5,1` | retention | typed | served, fresh, unexposed |

**Missing questions:** CONTRAST GAP: an equal-count two-colour bag (where 1/(number of colours) is RIGHT, so a correct answer there cannot be read as understanding) is served, but not as a typed diagnostic: gen:akchance:8,8,0,0 is served as :mc in the CHECK partition and gen:akchance:6,6,0,0 as :mc in the PRACTICE partition; no equal-count bag is in the diagnostic partition, and gen:akchance:1,1,0,0 (check) is ambiguous (odds and count-only both give 1). Partition change for Codex: 09-MISSING-QUESTIONS-AND-VISUALS.md MQ2. (Corrected: an earlier revision said these bags were in no served partition; that check missed their :mc ids.).

**Proposed questions (NOT served; specification in [09](09-MISSING-QUESTIONS-AND-VISUALS.md)):**

| Need | Role | Proposed question | Served today as | Change |
|---|---|---|---|---|
| MQ2 | diagnostic contrast | `gen:akchance:8,8,0,0` | check gen:akchance:8,8,0,0:mc | partition override check → diagnostic, typed, applied after form assignment |

**Unresolved contract requirements (Codex):**

- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family

**Independent review:** Pass 5: bag reuse is fixed; no outstanding finding. Notes: some items are also module practice or diagnostic items (selection must exclude anything this learner has seen); generator wording '1 green marbles' (D4).

### TP2-CH-BALL — Balls of different counts: each ball is equally likely

- **Scope:** `MATH.probability.classical`, family `anbag` (Probability of a colour drawn from a bag). Parameters: anbag, all three asked colours; diagnostics need unequal counts. The served module is synthesised, its main family is `anbag`, and the family is in its pools: yes.
- **Misconception ids targeted:** `colours-equally-likely` (conceptual; diagnosable) → `fix_colours_equally_likely`. **Reused:** `worked_steps` (favourable over all (general)), `out-of` (numbering the balls), `spot_the_mistake` (odds). **Modelled but not targeted** (general teaching only): `count-not-probability`.
- **Diagnostic contrast:** unequal colours `gen:anbag:6,9,7,2` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `fraction`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used none; missing: none.
- **New strategies:** `fix_colours_equally_likely`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (unequal colours) | `gen:anbag:6,9,7,2` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:anbag:1,8,4,2` | practice | typed | served, fresh, unexposed |
| misconception example (colours-equally-likely, shown solved) | `gen:anbag:2,6,2,2` | practice | typed | served, fresh, unexposed |
| misconception guided (colours-equally-likely) | `gen:anbag:3,2,3,0:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (colours-equally-likely) | `gen:anbag:6,8,0,1:mc` | check | mc | served, fresh, unexposed |
| guided practice | `gen:anbag:9,2,4,2` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:anbag:7,6,1,0` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:anbag:5,6,2,2` | practice | typed | served, fresh, unexposed |
| fresh recheck | `gen:anbag:1,4,3,0` | check | typed | served, fresh, unexposed |
| fresh recheck | `gen:anbag:6,8,6,2:mc` | check | mc | served, fresh, unexposed |
| transfer | `gen:anbag:1,6,1,1:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:anbag:3,5,0,1:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:anbag:1,9,3,2:mc` | retention | mc | served, fresh, unexposed |
| retention (delayed) | `gen:anbag:8,8,5,2` | retention | typed | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family

**Independent review:** Pass 5: bag reuse and answer collisions are fixed; no outstanding finding. Notes: the fix check's bag also appears in a module diagnostic with a different target colour; generator wording 'a orange toffee' (D8).

### TP2-PRT-NAME — Naming a shaded fraction: out of ALL the equal parts

- **Scope:** `MATH.number.fraction-models`, family `adfname` (Naming the shaded fraction of a shape). Parameters: adfname, all items (grids of equal squares); diagnostics need shaded ≠ unshaded so the two errors differ. The served module is authored, its main family is `adfname`, and the family is in its pools: yes.
- **Misconception ids targeted:** `shaded-to-unshaded` (conceptual; diagnosable) → `fix_shaded_to_unshaded`, `count-only` (conceptual; diagnosable) → `fix_count_only`. **Reused:** `equal_parts` (equal parts (authored, general)). **Modelled but not targeted** (general teaching only): `unshaded`.
- **Diagnostic contrast:** shaded fraction `gen:adfname:2,6,7` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `fraction`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used `grid`; missing: none.
- **New strategies:** `adfname_concept`, `fix_shaded_to_unshaded`, `fix_count_only`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (shaded fraction) | `gen:adfname:2,6,7` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:adfname:1,7,1` | practice | typed | served, fresh, unexposed |
| misconception example (shaded-to-unshaded, shown solved) | `gen:adfname:4,2,1` | practice | typed | served, fresh, unexposed |
| misconception guided (shaded-to-unshaded) | `gen:adfname:5,2,7` | practice | typed | served, fresh, unexposed |
| misconception fresh check (shaded-to-unshaded) | `gen:adfname:2,7,1:mc` | check | mc | served, fresh, unexposed |
| misconception example (count-only, shown solved) | `gen:adfname:4,3,1` | practice | typed | served, fresh, unexposed |
| misconception guided (count-only) | `gen:adfname:3,5,8` | practice | typed | served, fresh, unexposed |
| misconception fresh check (count-only) | `gen:adfname:2,9,11:mc` | check | mc | served, fresh, unexposed |
| guided practice | `gen:adfname:3,2,1:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:adfname:1,5,2:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:adfname:1,8,3:mc` | practice | mc | served, fresh, unexposed |
| fresh recheck | `gen:adfname:4,4,9` | check | typed | served, fresh, unexposed |
| fresh recheck | `gen:adfname:1,9,1` | check | typed | served, fresh, unexposed |
| transfer | `gen:adfname:2,10,11:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:adfname:1,10,3:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:adfname:2,3,1` | retention | typed | served, fresh, unexposed |
| retention (delayed) | `gen:adfname:2,2,1:mc` | retention | mc | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family

**Independent review:** Pass 4: no outstanding finding.

### TP2-PRT-SHADE — Shading a fraction of a grid: parts of the whole, not the top number

- **Scope:** `MATH.number.fraction-models`, family `adshade` (How many squares to shade to show a fraction). Parameters: adshade, all items; diagnostics need n > b so 'top-number' differs from the answer. The served module is authored, its main family is `adfname`, and the family is in its pools: yes.
- **Misconception ids targeted:** `top-number` (conceptual; diagnosable) → `fix_top_number`. **Reused:** `equal_parts` (equal parts (authored, general)). **Modelled but not targeted** (general teaching only): `one-part`, `unshaded`.
- **Diagnostic contrast:** grid larger than the bottom number `gen:adshade:2,8,3,8` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `integer`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used `grid`; missing: none.
- **New strategies:** `adshade_concept`, `fix_top_number`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (grid larger than the bottom number) | `gen:adshade:2,8,3,8` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:adshade:5,3,2,5` | practice | typed | served, fresh, unexposed |
| misconception example (top-number, shown solved) | `gen:adshade:3,6,7,9` | practice | typed | served, fresh, unexposed |
| misconception guided (top-number) | `gen:adshade:4,4,5,8:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (top-number) | `gen:adshade:6,5,7,10` | check | typed | served, fresh, unexposed |
| guided practice | `gen:adshade:2,5,3,5:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:adshade:6,2,1,2` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:adshade:3,5,1,5:mc` | practice | mc | served, fresh, unexposed |
| fresh recheck | `gen:adshade:4,8,3,8:mc` | check | mc | served, fresh, unexposed |
| fresh recheck | `gen:adshade:2,9,1,3:mc` | check | mc | served, fresh, unexposed |
| transfer | `gen:adshade:4,9,5,9:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:adshade:4,5,1,10:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:adshade:6,3,5,9` | retention | typed | served, fresh, unexposed |
| retention (delayed) | `gen:adshade:5,4,3,10` | retention | typed | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- B1 teaching scope: adshade_concept, fix_top_number are outside teachingScopeFor (main family adfname); ineligible until the selector accepts 'adshade'
- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family

**Independent review:** Pass 5: '1 squares' is avoided (the example now has a top number of 2 or more); no outstanding finding.

### TP2-PV-DIGIT — The value of a digit, and how many tens

- **Scope:** `MATH.number.place-value-tens`, family `aadigit` (The value of a digit in a two-digit number). Parameters: aadigit, all three forms (params[1] = 0 value of the tens digit, 1 how many tens, 2 value of the ones digit); numbers with two equal digits excluded (the question would be ambiguous). The served module is synthesised, its main family is `aatens`, and the family is in its pools: yes.
- **Misconception ids targeted:** `face-value` (conceptual; diagnosable) → `fix_face_value`, `value-not-count` (conceptual; diagnosable) → `fix_value_not_count`. **Reused:** `bundles` (tens as bundles (general)), `spot_the_mistake` (count-blocks). **Modelled but not targeted** (general teaching only): `wrong-digit`, `times-ten`.
- **Diagnostic contrast:** value of the tens digit `gen:aadigit:42,0` (diagnostic); how many tens `gen:aadigit:34,1` (diagnostic); value of the ones digit `gen:aadigit:91,2` (diagnostic); value of the tens digit, another number `gen:aadigit:95,0` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers. Trigger conditions: `fix_face_value`: a response pattern below with establishes = true; patterns with competing explanations must not establish it; `fix_value_not_count`: a response pattern below with establishes = true; patterns with competing explanations must not establish it.
- **Answer formats:** family type `integer`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used `blocks`; missing: none.
- **New strategies:** `aadigit_concept`, `fix_face_value`, `fix_value_not_count`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (value of the tens digit) | `gen:aadigit:42,0` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (how many tens) | `gen:aadigit:34,1` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (value of the ones digit) | `gen:aadigit:91,2` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (value of the tens digit, another number) | `gen:aadigit:95,0` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:aadigit:18,0` | practice | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:aadigit:56,1` | practice | typed | served, fresh, unexposed |
| misconception example (face-value, shown solved) | `gen:aadigit:49,0` | practice | typed | served, fresh, unexposed |
| misconception guided (face-value) | `gen:aadigit:69,0:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (face-value) | `gen:aadigit:83,0:mc` | check | mc | served, fresh, unexposed |
| misconception example (value-not-count, shown solved) | `gen:aadigit:75,1` | practice | typed | served, fresh, unexposed |
| misconception guided (value-not-count) | `gen:aadigit:82,1` | practice | typed | served, fresh, unexposed |
| misconception fresh check (value-not-count) | `gen:aadigit:68,1:mc` | check | mc | served, fresh, unexposed |
| guided practice | `gen:aadigit:13,1:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:aadigit:26,1:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:aadigit:43,1` | practice | typed | served, fresh, unexposed |
| fresh recheck | `gen:aadigit:50,0` | check | typed | served, fresh, unexposed |
| fresh recheck | `gen:aadigit:20,0` | check | typed | served, fresh, unexposed |
| transfer | `gen:aadigit:31,0:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:aadigit:37,0:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:aadigit:74,0` | retention | typed | served, fresh, unexposed |
| retention (delayed) | `gen:aadigit:92,1:mc` | retention | mc | served, fresh, unexposed |

**Missing questions:** rechecks: no usable check item for case "how many tens" (another case's item stands in).

**Proposed questions (NOT served; specification in [09](09-MISSING-QUESTIONS-AND-VISUALS.md)):**

| Need | Role | Proposed question | Served today as | Change |
|---|---|---|---|---|
| MQ6 | recheck | `gen:aadigit:39,1` | check gen:aadigit:39,1 | selection only, after decision A (a recheck may repeat a diagnostic's answer) |

**Unresolved contract requirements (Codex):**

- B1 teaching scope: aadigit_concept, fix_face_value, fix_value_not_count are outside teachingScopeFor (main family aatens); ineligible until the selector accepts 'aadigit'
- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family
- policy: 'established' requires the contrast/trigger condition (misconception-evidence@1 counts any two matches)

**Independent review:** Pass 4: no outstanding finding.

### TP2-REG-MONEY — Adding rupees and paise: 100 paise make ₹1

- **Scope:** `MATH.measurement.money-decimals`, family `acmoneyadd` (Adding and taking away rupees and paise). Parameters: acmoneyadd with params[4] = 0 (addition); diagnostics, rechecks and delayed checks need paise that add to 100 or more. The served module is synthesised, its main family is `acpaise`, and the family is in its pools: yes.
- **Misconception ids targeted:** `paise-over-100` (conceptual; NOT diagnosable: other) → `fix_paise_over_100`, `no-carry` (procedural; NOT diagnosable: other) → `fix_no_carry`. **Reused:** `drop_dot` (money as paise (general)). **Modelled but not targeted** (general teaching only): —.
- **Diagnostic contrast:** paise add to 100 or more `gen:acmoneyadd:3,7,11,13,0` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `fraction`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: **not supported (B2)**.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used `table`; missing: none.
- **New strategies:** `acmoneyadd_concept`, `fix_paise_over_100`, `fix_no_carry`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (paise add to 100 or more) | `gen:acmoneyadd:3,7,11,13,0` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:acmoneyadd:25,18,14,15,0` | practice | typed | served, fresh, unexposed |
| misconception example (paise-over-100, shown solved) | `gen:acmoneyadd:17,19,11,5,0` | practice | typed | served, fresh, unexposed |
| misconception guided (paise-over-100) | `gen:acmoneyadd:19,13,11,11,0:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (paise-over-100) | `gen:acmoneyadd:29,15,15,6,0` | check | typed | served, fresh, unexposed |
| misconception example (no-carry, shown solved) | `gen:acmoneyadd:14,15,18,12,0` | practice | typed | served, fresh, unexposed |
| misconception guided (no-carry) | `gen:acmoneyadd:26,17,15,9,0` | practice | typed | served, fresh, unexposed |
| misconception fresh check (no-carry) | `gen:acmoneyadd:16,7,20,19,0:mc` | check | mc | served, fresh, unexposed |
| guided practice | `gen:acmoneyadd:17,17,19,18,0:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:acmoneyadd:15,14,11,7,0` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:acmoneyadd:6,7,10,18,0:mc` | practice | mc | served, fresh, unexposed |
| fresh recheck | `gen:acmoneyadd:28,9,19,11,0:mc` | check | mc | served, fresh, unexposed |
| fresh recheck | `gen:acmoneyadd:2,15,7,15,0:mc` | check | mc | served, fresh, unexposed |
| transfer | `gen:acmoneyadd:26,17,12,15,0:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:acmoneyadd:4,18,6,15,0:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:acmoneyadd:1,16,6,15,0:mc` | retention | mc | served, fresh, unexposed |
| retention (delayed) | `gen:acmoneyadd:25,17,11,15,0:mc` | retention | mc | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- B1 teaching scope: acmoneyadd_concept, fix_paise_over_100, fix_no_carry are outside teachingScopeFor (main family acpaise); ineligible until the selector accepts 'acmoneyadd'
- B2 diagnosis reader: 'paise-over-100' reads as other (answer type fraction); fix_paise_over_100 cannot be triggered
- B2 diagnosis reader: 'no-carry' reads as other (answer type fraction); fix_no_carry cannot be triggered
- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family

**Independent review:** Pass 4: no content finding. The fixes are unreachable until B2.

### TP2-REG-TIME — Adding durations: 60 minutes make an hour

- **Scope:** `MATH.measurement.time-unit-conversion`, family `addur` (Adding durations and changing seconds into minutes and seconds). Parameters: addur with params[0] = 0 (adding two durations in h and min); diagnostics, rechecks and delayed checks need minutes that add to 60 or more (the no-carry error is possible). The served module is synthesised, its main family is `adhmin`, and the family is in its pools: yes.
- **Misconception ids targeted:** `no-carry` (conceptual; NOT diagnosable: unreadable) → `fix_no_carry`. **Reused:** `spot_the_mistake` (hour-as-100 (an hour taken as 100 minutes)), `clock_round` (the 60-minute hour (general)). **Modelled but not targeted** (general teaching only): `carry-kept`.
- **Diagnostic contrast:** minutes add to 100 or more `gen:addur:0,27` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `tuple`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: **not supported (B2)**.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used `numberline`; missing: none.
- **New strategies:** `addur_concept`, `fix_no_carry`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (minutes add to 100 or more) | `gen:addur:0,27` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:addur:0,57` | practice | typed | served, fresh, unexposed |
| misconception example (no-carry, shown solved) | `gen:addur:0,84` | practice | typed | served, fresh, unexposed |
| misconception guided (no-carry) | `gen:addur:0,35:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (no-carry) | `gen:addur:0,92` | check | typed | served, fresh, unexposed |
| guided practice | `gen:addur:0,36:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:addur:0,97` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:addur:0,37:mc` | practice | mc | served, fresh, unexposed |
| fresh recheck | `gen:addur:0,44:mc` | check | mc | served, fresh, unexposed |
| fresh recheck | `gen:addur:0,87` | check | typed | served, fresh, unexposed |
| transfer | `gen:addur:0,95:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:addur:0,23:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:addur:0,91:mc` | retention | mc | served, fresh, unexposed |
| retention (delayed) | `gen:addur:0,26` | retention | typed | served, fresh, unexposed |

**Missing questions:** rechecks: no usable check item for case "minutes add to 100 or more" (another case's item stands in); delayed checks: no usable retention item for case "minutes add to 100 or more" (another case's item stands in).

**Proposed questions (NOT served; specification in [09](09-MISSING-QUESTIONS-AND-VISUALS.md)):**

| Need | Role | Proposed question | Served today as | Change |
|---|---|---|---|---|
| MQ3 | recheck | `gen:addur:0,7` | diagnostic gen:addur:0,7:mc | partition override diagnostic → check, applied after form assignment |
| MQ3 | retention | `gen:addur:0,291` | not served | generator bounds: addur mode 0 x ≤ 299 (hashes into retention without override) |

**Unresolved contract requirements (Codex):**

- B1 teaching scope: addur_concept, fix_no_carry are outside teachingScopeFor (main family adhmin); ineligible until the selector accepts 'addur'
- B2 diagnosis reader: 'no-carry' reads as unreadable (answer type tuple); fix_no_carry cannot be triggered
- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family

**Independent review:** Pass 4: no content finding beyond the recorded missing questions (no 100+ minute item in the check or retention partitions, so rechecks cannot separate no-carry from regrouping at 100). The fix is unreachable until B2.

### TP2-SCL-BAR — Scaled bar charts: read the scale, do not count lines

- **Scope:** `MATH.statistics.scaled-bars`, family `afbar` (Reading a bar chart with a scale). Parameters: afbar, all forms (params[1] = 0 read, 1 how many more, 2 together); scale > 1. The served module is synthesised, its main family is `afbar`, and the family is in its pools: yes.
- **Misconception ids targeted:** `assume-tens` (procedural; diagnosable) → `fix_assume_tens`. **Reused:** `worked_steps` (reading a scaled bar (general)), `skip_count` (counting up the scale), `spot_the_mistake` (count-lines). **Modelled but not targeted** (general teaching only): `add-for-more`, `difference-for-total`.
- **Diagnostic contrast:** read one bar `gen:afbar:0,0,10` (diagnostic); how many more `gen:afbar:0,1,6` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.
- **Answer formats:** family type `integer`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used none; missing: none.
- **New strategies:** `fix_assume_tens`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (read one bar) | `gen:afbar:0,0,10` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (how many more) | `gen:afbar:0,1,6` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:afbar:3,0,8` | practice | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:afbar:1,1,5` | practice | typed | served, fresh, unexposed |
| misconception example (assume-tens, shown solved) | `gen:afbar:0,2,5` | practice | typed | served, fresh, unexposed |
| misconception guided (assume-tens) | `gen:afbar:3,2,3` | practice | typed | served, fresh, unexposed |
| misconception fresh check (assume-tens) | `gen:afbar:1,1,1` | check | typed | served, fresh, unexposed |
| guided practice | `gen:afbar:0,2,8:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:afbar:0,2,4:mc` | practice | mc | served, fresh, unexposed |
| guided practice | `gen:afbar:0,2,2` | practice | typed | served, fresh, unexposed |
| fresh recheck | `gen:afbar:5,0,10:mc` | check | mc | served, fresh, unexposed |
| fresh recheck | `gen:afbar:1,1,0:mc` | check | mc | served, fresh, unexposed |
| transfer | `gen:afbar:3,2,1:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:afbar:4,2,5:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:afbar:1,0,15` | retention | typed | served, fresh, unexposed |
| retention (delayed) | `gen:afbar:3,1,11:mc` | retention | mc | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family

**Independent review:** Pass 6 (confirmation): minor B is FIXED (the guided item predicts 120, the check predicts 10). Notes (low): two guided items share a question template with different values; the family step text 'The bar reaches 1 lines' is D7.

### TP2-SCL-PICT — Pictographs: each picture stands for the key

- **Scope:** `MATH.statistics.pictographs`, family `acpicttab` (Pictographs and tables: completing, totals and the largest group). Parameters: acpicttab, all three forms: params[3] = 0 draw a row (÷ key), 1 total (× key), 2 largest group; key > 1 in diagnostics. The served module is synthesised, its main family is `acpict`, and the family is in its pools: yes.
- **Misconception ids targeted:** `one-each` (conceptual; diagnosable) → `fix_one_each`. **Reused:** `spot_the_mistake` (no-key (reading a pictograph)), `table` (pictures × key (general, seed acpict)). **Modelled but not targeted** (general teaching only): `no-key`, `missed-row`.
- **Diagnostic contrast:** draw a row `gen:acpicttab:2,22,2,0` (diagnostic); read a total `gen:acpicttab:2,1,0,1` (diagnostic). Rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers. Trigger conditions: `fix_one_each`: a competing explanation ('copied the table value', or 'answered children instead of pictures') gives the SAME number on every draw item, so answers alone cannot establish one-each: establish it only from a drawn pictograph (the learner draws one symbol per child) or after asking the learner what one symbol stands for.
- **Answer formats:** family type `integer`; forms used: typed, mc, word; multiple choice available; everyday form available. Trusted grader: supported. Diagnosis reader: supported.
- **Evidence:** answer evidence comes from grading-decision@1 correctness from the trusted server grader (every item here is gradable). Method evidence: none: no method evidence can be recorded; a correct answer never implies the method.
- **Visuals:** used `table`; missing: none.
- **New strategies:** `acpicttab_concept`, `fix_one_each`.

| Role | Question | Partition | Form | Reconciliation |
|---|---|---|---|---|
| diagnostic (draw a row) | `gen:acpicttab:2,22,2,0` | diagnostic | typed | served, fresh, unexposed |
| diagnostic (read a total) | `gen:acpicttab:2,1,0,1` | diagnostic | typed | served, fresh, unexposed |
| worked (shown solved) | `gen:acpicttab:0,9,2,0` | practice | typed | served, fresh, unexposed |
| misconception example (one-each, shown solved) | `gen:acpicttab:2,7,0,0` | practice | typed | served, fresh, unexposed |
| misconception guided (one-each) | `gen:acpicttab:2,4,3,0:mc` | practice | mc | served, fresh, unexposed |
| misconception fresh check (one-each) | `gen:acpicttab:1,5,2,0:mc` | check | mc | served, fresh, unexposed |
| guided practice | `gen:acpicttab:1,29,3,0` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:acpicttab:0,16,3,0` | practice | typed | served, fresh, unexposed |
| guided practice | `gen:acpicttab:1,19,1,0:mc` | practice | mc | served, fresh, unexposed |
| fresh recheck | `gen:acpicttab:0,13,3,0:mc` | check | mc | served, fresh, unexposed |
| fresh recheck | `gen:acpicttab:1,0,2,0` | check | typed | served, fresh, unexposed |
| transfer | `gen:acpicttab:0,23,2,0:w` | practice | word | served, fresh, unexposed |
| transfer | `gen:acpicttab:1,6,2,0:w` | practice | word | served, fresh, unexposed |
| retention (delayed) | `gen:acpicttab:0,4,3,0` | retention | typed | served, fresh, unexposed |
| retention (delayed) | `gen:acpicttab:2,2,1,0:mc` | retention | mc | served, fresh, unexposed |

**Missing questions:** none.

**Unresolved contract requirements (Codex):**

- B1 teaching scope: acpicttab_concept, fix_one_each are outside teachingScopeFor (main family acpict); ineligible until the selector accepts 'acpicttab'
- worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family
- policy: 'established' requires the contrast/trigger condition (misconception-evidence@1 counts any two matches)

**Independent review:** Pass 6 (confirmation): minor A is FIXED; all 15 items use distinct calculations and tables, and all use the key. Note (low): the 'Another way: Make a table' screen repeats the same working rather than a different computation.

