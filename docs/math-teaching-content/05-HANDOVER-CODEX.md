# 5. Handover for Codex integration

**Source commit:** every id, partition, hash and check here is computed against the foundation commit `637938c7da0416b03595fae60a80607e60aa84c0` (draft PR #96, unchanged on the remote when this was written). The branch is `feat/math-teaching-content`. Codex owns the canonical dashboard and the runtime; this file is not a tracker.

## Decisions (this revision)

Readiness per package is given in [08-INTEGRATION-MANIFEST.md](08-INTEGRATION-MANIFEST.md) (machine form: `integration-manifest.json`). The categories are integration readiness, **not educator approval**.

| Category (primary) | Packages |
|---|---|
| Ready for integration review | TP-STA-01, TP2-CH-BALL, TP2-PRT-NAME, TP2-SCL-BAR |
| Blocked by shared runtime support | TP-NUM-03 (B1, B2, B3), TP2-PRT-SHADE (B1), TP2-REG-MONEY (B1, B2), TP2-SCL-PICT (B1, P1) |
| Blocked by missing questions or visuals | TP-NUM-01 (visual), TP-NUM-02 (transfer, improper-sum diagnostic; P1), TP-MEA-01 (visual; B1, P1), TP-GEO-01 (visual; B1), TP-GEO-02 (visual; B1, B3), TP-ALG-01 (cross-term retention and diagnostic, visual; B1), TP-PRO-01 (different-size recheck; B1), TP2-CH-BAG (equal-count contrast), TP2-PV-DIGIT ("how many tens" recheck; B1, P1), TP2-REG-TIME (100+ minute recheck and retention; B1, B2) |
| Unresolved mathematical or instructional review | **none**: passes 4–6 leave no outstanding finding (low-severity notes in 04) |

### Priority for Codex

1. **B1 teaching scope** unblocks the most: 11 packages and 33 strategies.

The four "ready" packages need no shared runtime change. Their family is the module's main family (STA-01, SCL-BAR, CH-BALL) or is accepted by its scope (PRT-NAME), their errors are diagnosable, and they have no P1 condition. Integration review should still re-run `tools/build.mts` at the integration commit.
2. **P1 diagnosis policy** (contrast or written-form condition): NUM-01, NUM-02, MEA-01, PV-DIGIT, SCL-PICT. **This is not among the three blockers Codex is handling.** Without it, a greater/smaller reversal (NUM-01), a word swap (MEA-01) or a copied table value (SCL-PICT) could establish the wrong misconception and trigger the wrong fix. Until it exists, the affected fix strategies should stay unregistered.
3. **B2 diagnosis reader**: NUM-03, REG-MONEY, REG-TIME.
4. **B3 addressed misconception**: GEO-02 and NUM-03 (`fix_opposite_as_linear`, `fix_longer_is_larger`). The alternative is to fix family text D1/D3 so it can be quoted verbatim.
5. **Missing questions**: specified in [09-MISSING-QUESTIONS-AND-VISUALS.md](09-MISSING-QUESTIONS-AND-VISUALS.md), with data in `missing-questions.json`. These are **proposed** questions, kept apart from the verified served items in 08. Every proposal uses the existing generator; there is no parallel generator.

   | Package | Proposed question (role) | What changes |
   |---|---|---|
   | TP-ALG-01 | `gen:ahid:0,3,7,1` (diagnostic) | pin the typed form: it is already in the diagnostic partition but served as `:mc` |
   | TP-ALG-01 | `gen:ahid:0,2,9,1` (retention) | partition override: practice → retention |
   | TP2-CH-BAG | `gen:akchance:8,8,0,0` (diagnostic contrast) | partition override: check → diagnostic, typed |
   | TP2-REG-TIME | `gen:addur:0,7` (recheck) | partition override: diagnostic → check |
   | TP2-REG-TIME | `gen:addur:0,291` (retention) | generator bounds only: mode 0, x ≤ 299 |
   | TP-NUM-02 | `gen:fadd:1,2,5,1:w` and others (transfer) | generator: add `fadd.word(p)` |
   | TP-PRO-01 | `gen:akdice:4,5,0,4:mc` (recheck) | selection only, after decision A in 09 |
   | TP2-PV-DIGIT | `gen:aadigit:39,1` (recheck) | selection only, after decision A in 09 |

   - **Partition overrides must be applied after `phasePool` assigns typed/`:mc` forms.** Changing `phaseOf` itself would flip 3 referenced ALG-01 items from typed to `:mc`: the worked example `1,3,8,1` and the delayed checks `1,2,3,1` and `1,2,6,1`.
   - The improper-sum diagnostic for TP-NUM-02 is still unspecified; it was outside this request.
   - **No substitute was used:** each package records the missing case instead of testing a different skill or reusing an exposed question.
   - **Correction.** This file previously said `gen:akchance:6,6,0,0` and `gen:akchance:8,8,0,0` were "in no partition". They are served as `:mc`, in practice and check respectively; the earlier check missed the `:mc` ids. What is actually missing is a typed **diagnostic** equal-count item.
6. **Visual types:** specified in 09 (V1–V5). Each one reuses an existing primitive with one or two optional fields and a `describe()` clause:
   - **V1 fraction strips:** the `strips` widget with `bottomShaded`, plus a `strips` case in `Figure`. The lesson path already has `fraction-strip` + `comparison` for `adfcmp`.
   - **V2 perimeter:** `shape` rectangle with `outline`.
   - **V3 exterior angle:** `triangle` with `exterior` and `notToScale`.
   - **V4 crossing lines:** `angle` with `cross` and `labels`.
   - **V5 area model:** `grid` with `labels`, `rowLabels` and `colLabels`.

   V1 and V3 supersede the packages' provisional visual data:
   - the two `grid` strips drew unequal wholes;
   - the exterior triangle put the second opposite angle on the wrong vertex.

### Item freshness rule (applies to every package)

Fresh checks, rechecks, transfer and delayed items exclude every question already **shown** by the module's existing explanations, by exposure key **and** by the package's number signature (same bag, table or numbers under other labels). Several package items are also ordinary **practice or diagnostic** items of the module (CH-BAG, CH-BALL, STA-01, SCL-BAR, PRO-01; listed in pass 5). At integration, the selector must treat a package item as fresh only if **this learner** has not been served it: per-learner exposure, which is Codex's.

## What to integrate: `batch-*/<id>.json` → `integration`

All objects use the **existing** content shapes. No new engine schema is introduced.

| Field | Shape | Target (not written here) |
|---|---|---|
| `strategies[].strategy` | `Strategy` / `Screen` from `packages/learning/src/content.ts`: `id, title, kind, needs, screens[{title, text, math, widget?, role, instance}], guided, check` | Append to the served module's `strategies`. For synthesised modules that is `library.ts`; for authored modules, `content/learning/modules.v1.json`. |
| `registryRecords[]` | `ExplanationRecord` from `explanation-review.ts`, with one `pending_review` revision, scope `demonstration`, reviewerRole `none` | `content/learning/explanation-review.v1.json`. `contentHash` is computed with the platform's `contentHash()` on these exact objects; recompute it on the integrated revision. |
| `spec` | skill, generator restriction, triggers, allowed methods, fresh-check selection, retention target, answer versus method evidence, ungradable items, existing misconception explanations | Shared teaching selector (Codex). |
| `responsePatterns` (package) and `PAT-*.json` (pattern) | which answer combinations may establish a diagnosis | Diagnosis/selection policy (Codex). |
| `reusedExisting` | existing strategy ids that already address a target belief | No new content: select the existing explanation. |

**Checked with the platform's own functions, in memory, for all 46 proposed strategies (28 in batch 1, 18 in batch 2):**
- `contentEligibility` (demonstration, as an intervention), against an in-memory registry that includes the records: every `fix_*` is **ineligible without** its misconception established and **eligible with** it, and every concept strategy is eligible as general teaching.
- `validateRegistry`: **no problems** for the new records.
- `teachingEligibility` (teaching-contract@1) is **checked today for 13 strategies** (NUM-01, NUM-02, STA-01, SCL-BAR, PRT-NAME, CH-BAG, CH-BALL), with **no violations**. For the other **33** it reports **not checked**: the strategy's guided item belongs to a pool family other than the module's main one, and `teachingScopeFor` accepts only the main family (and instance-taught families). Not checked counts as **ineligible**. The same contract rules were then applied through `lessonBlocks` with the strategy's own family as the lesson scope, and **all 46 pass with no violations**.

An earlier revision of this handover reported "no violations" for every strategy. That result was partly spurious: shared screen titles ("What went wrong") matched sections of other strategies. Titles are now unique per strategy.

`worked-example` is not used as a screen role. The platform verifies worked examples only for families with a teaching-contract instance or a kernel adapter, and these families have neither. The solved lines therefore use role `strategy`. They are checked by this branch's oracle (03), **not** by the platform's worked-example verifier.

Before integrating, rerun `tools/build.mts` against the target commit. Ids, partitions, quarantine and hashes may change, and the build fails loudly if an item no longer validates.

## Platform blockers found (Codex)

- **B1. Teaching scope.** `teaching-presentation.ts teachingScopeFor` accepts only the module's first pool family, so `teachingEligibility` never checks, and never allows, an intervention about any other family of the competency. This is the mechanism behind G5's untaught exterior-angle and crossing-lines misconceptions. It blocks 33 of the 46 proposals: the new strategies of TP-NUM-03, MEA-01, GEO-01, GEO-02, ALG-01, PRO-01, REG-TIME, REG-MONEY, SCL-PICT, PRT-SHADE and PV-DIGIT.
- **B2. Diagnosis reader.** `reasoning.ts probeReading` reads the predicted wrong answer as `other` or `unreadable` in three cases, so misconception-evidence can never establish these misconceptions and their fixes can never trigger:
  - decimal-string predictions: `aedecc` longer-is-larger and shorter-is-larger (e.g. `gen:aedecc:2,2,0,1`, "2.01" → other; `gen:aedecc:1,2,7,7`, "1.2" → other);
  - money predictions: `acmoneyadd` paise-over-100 and no-carry (`gen:acmoneyadd:17,19,11,5,0` "28.120" and `gen:acmoneyadd:14,15,18,12,0` "32.35" → other);
  - tuple answers: `addur` no-carry, `gen:addur:0,84` "(8, 75)" → unreadable. Even the correct "(6, 45)" reads as unreadable.

  The packages mark these triggers **UNREACHABLE** instead of claiming them.

## Policy questions for Codex (not decided here)

1. **Two matches from different causes.** misconception-evidence@1 establishes a misconception from two matching answers. The response-pattern tables mark patterns where a competing explanation fits the same two answers as `establishes: no`:
   - TP-NUM-01: a greater/smaller reversal;
   - TP-MEA-01: a word swap, or "add the numbers given";
   - TP2-PV-DIGIT: a question-word swap;
   - PAT-REGROUP and PAT-CHANCE: mixed answers.
   The engine does not read these tables today. Should "established" require the contrast condition?
2. **Form, not value.** For TP-NUM-02, the add-denominators answer has the same value as "averaging the two fractions" on every item. Only the written form (`8/18` unsimplified) separates them. Should the evidence reader see the raw response text?
3. **B3. The addressed misconception is read from verbatim family text.** `addressedMisconception()` finds the bug whose `says` sentence is quoted verbatim in the screen. Where a package must *replace* a defective family sentence (`fix_longer_is_larger` TP-NUM-03, `fix_opposite_as_linear` TP-GEO-02), the platform reads `addresses: null`. The gate then accepts **any** established misconception for that strategy, which is over-permissive. Fix the family text, or let a record carry `addresses` explicitly.
4. **Teaching for non-seed families.** 726 families have a chapter screen only (01). Each package proposes one per-family concept strategy where the module has no selectable teaching for the family.
5. **Visual types.** These cannot be drawn today: an exterior-angle triangle, crossing lines, a perimeter outline, two equal-length fraction strips, and a labelled 2×2 area model. Each one is an existing `Visual` type that needs one or two optional fields (the union's index signature already allows them) and a `describe()` clause. 09 V1–V5 gives the exact data and renderer requirements.
6. **Partitions.**
   - `ahid`: no unambiguous `(px + q)²` cross-term item is served in a usable form in the diagnostic **or** retention partition. `gen:ahid:0,3,7,1` is in diagnostic but served only as `:mc`, and retention has none. The TP-ALG-01 delayed-check audit shows which retention items do test the cross term; see 09 MQ1.
   - `akchance`: no equal-count contrast item is in the diagnostic partition. `gen:akchance:6,6,0,0` and `gen:akchance:8,8,0,0` are served only as `:mc`, in practice and check (corrected; see 09 MQ2).

## Runtime defects and concerns (reproducible; Codex to verify and repair)

| # | Source location | Question ids (reproduce with `problemOf(id)`) | Expected mathematics | Faulty text / issue |
|---|---|---|---|---|
| D1 | `packages/learning/src/fam/b05.ts:1328`, `aedecc` bug `longer-is-larger`, `says` | 14 items: `gen:aedecc:0,5,0,1` `0,5,0,2` `0,5,0,3` `0,5,0,4` `2,2,0,1` `2,2,0,2` `2,8,0,1` … `2,8,0,8` | The misconception is "more digits after the point means bigger". In `gen:aedecc:0,5,0,3`, 0.5 > 0.03. | "0.03 was taken as greater because 03 is more than 5": **false**, since 3 < 5. The template asserts the two hundredths digits exceed the tenths digit, which fails whenever they read as a number ≤ the tenths digit. |
| D2 | `packages/learning/src/fam/b08.ts:2232`, `ahid` `explain` for the `2ab` step | All 126 `(a − b)²` items, e.g. `gen:ahid:1,3,8,1`, `gen:ahid:1,1,3,1` | 2ab with a = 3x, b = −8 is 2 × 3x × (−8) = −48x | Prints "2ab = 2 × 3x × 8 = -48x" (the product shown is +48x). It also prints "1x²" for p = 1 (`gen:ahid:1,1,3,1`: "a² = (x)² = 1x²"). |
| D3 | `packages/learning/src/fam/b06.ts:1266`, `afcross` bug `opposite-as-linear`, `says` | e.g. `gen:afcross:21,0` | Vertically opposite angles are equal. | "they do not add up to 180°": false at 90°. No served item has 90°, so this is a wording risk only. |
| D4 | `packages/learning/src/fam/b11.ts:634`, `akchance` prompt | 90 items, e.g. `gen:akchance:1,1,0,0` | — | "A bag has 1 red and 1 blue marbles": plural with 1 (grammar). |
| D5 | `families.ts:116`, `fadd` | all | — | No `teach.alternatives` and no `word` (transfer) form for a grade-4 core skill. TP-NUM-02 has text-only transfer candidates, which the grader cannot verify. |
| D6 | `packages/learning/src/fam/b04.ts:1945`, `adshade` bug `top-number`, `says` | e.g. `gen:adshade:1,4,1,2` | — | "1 squares were shaded" (plural with 1). TP2-PRT-SHADE quotes it verbatim, because the platform reads `addresses` from the verbatim text (blocker B3 below). |
| D7 | `packages/learning/src/fam/b06.ts:870`, `afbar` `explain` (read step) | e.g. `gen:afbar:0,0,0` | — | "The bar reaches 1 lines" (plural with 1). This step text appears in TP2-SCL-BAR's worked-example notes. |
| D8 | generator prompts `anbag` / `akchance` transfer forms | e.g. TP2-CH-BALL transfer items, TP2-CH-BAG | — | "a orange toffee", "1 lemon toffees", "1 green marbles" (article and plural agreement). |

## Prerequisite concerns (to examine, not assumed wrong)

| Edge in the graph | What the teaching needs | What to examine |
|---|---|---|
| `MATH.geometry.triangle-properties` ← only `MATH.geometry.basic-constructions` (mandatory) | The exterior-angle theorem uses "angles on a straight line make 180°" (`MATH.geometry.angle-pairs`, grades 5–7). | Whether the intended relationship is captured elsewhere (e.g. through basic-constructions or a curriculum ordering) before adding an edge. |
| `MATH.number.decimal-tenths` ← only `MATH.number.fraction-add-like` (mandatory) | TP-NUM-03 needs tenths and hundredths as parts of one whole and whole-number place value. Adding like fractions is not used. | The edge may encode "decimals after fractions" in the source curriculum (prerequisites@1.1.0). Check the source's intent before changing it. |

## Reused sources (exact)

- **Batch 1 families:** `adfcmp` (`fam/b04.ts:427`), `fadd` (`families.ts:116`), `aedecc` (`fam/b05.ts:1301`), `aeperar` (`fam/b05.ts:861`), `ahext` (`fam/b08.ts:1199`), `afcross` (`fam/b06.ts:1266`), `akmed` (`fam/b11.ts:1729`), `ahid` (`fam/b08.ts:2188`), `akdice` (`fam/b11.ts:803`).
- **Batch 2 families:** `addur` (`fam/b04.ts:2140`), `acmoneyadd` (`fam/b03.ts:1451`), `acpicttab` (`fam/b03.ts:1958`), `afbar` (`fam/b06.ts:824`), `adfname` (`fam/b04.ts:567`), `adshade` (`fam/b04.ts:1945`), `aadigit` (`fam/b01.ts:1691`), `akchance` (`fam/b11.ts:634`), `anbag` (`fam/b14.ts:649`).
- **Reused from these families:**
  - prompts, answers, figures and phase partitions;
  - `bugs` (ids, kinds, predictions, `says` unless overridden);
  - `teach` idea, method and alternatives;
  - `explain` text (not quoted where defective).
- **Reused existing explanations** (selected, not rewritten): listed per package in `integration.spec.existingMisconceptionExplanations` / `reusedExisting`, and per pattern in `PAT-*.md`.
- **Visual types:** `grid`, `triangle`, `angle`, `table`, `numberline`, `bars`, `pictograph`, `blocks` (`family-kit.ts` `Visual`).
- **Engine contracts read, not changed:**
  - `server-grader.ts` `gradeRequest`;
  - `question-status.ts` `selectable`;
  - `content.ts` `Strategy`/`Screen`/`moduleFor`;
  - `teaching-contract.ts` `teachingEligibility`;
  - `explanation-review.ts` `contentEligibility`, `contentHash`, `addressedMisconception`, `validateRegistry`;
  - misconception-evidence@1 (`docs/teaching-content-safety/05-…`);
  - G5 (`docs/geometry-cross-domain-validation/`).
- **openpath-research:** `docs/product/subjects/SUBJECT_CONTRACTS.md` and `docs/product/content/CONTENT_PIPELINE.md`.
