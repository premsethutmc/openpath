# 5. Handover for Codex integration

Codex owns shared skill contracts, diagnosis and selection, grading, evidence, persistence, application integration, generator fixes and prerequisite changes. This branch changes **nothing** outside `docs/math-teaching-content/`. Nothing is registered, served, activated or approved: every package is a **review candidate**.

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
5. **Visual types.** These are missing from the `Visual` union: an exterior-angle triangle, crossing lines, a perimeter outline, two equal-length fraction strips, and a labelled 2×2 area model.
6. **Partitions.**
   - `ahid`: no unambiguous `(px + q)²` cross-term item exists in the diagnostic **or** retention partition. The TP-ALG-01 delayed-check audit shows which retention items do test the cross term.
   - `akchance`: the equal-count contrast item (`gen:akchance:6,6,0,0`, `gen:akchance:8,8,0,0`) is in the generator pool but in no served partition.

## Runtime defects and concerns (reproducible; Codex to verify and repair)

| # | Source location | Question ids (reproduce with `problemOf(id)`) | Expected mathematics | Faulty text / issue |
|---|---|---|---|---|
| D1 | `packages/learning/src/fam/b05.ts:1328`, `aedecc` bug `longer-is-larger`, `says` | 14 items: `gen:aedecc:0,5,0,1` `0,5,0,2` `0,5,0,3` `0,5,0,4` `2,2,0,1` `2,2,0,2` `2,8,0,1` … `2,8,0,8` | The misconception is "more digits after the point means bigger". In `gen:aedecc:0,5,0,3`, 0.5 > 0.03. | "0.03 was taken as greater because 03 is more than 5": **false**, since 3 < 5. The template asserts the two hundredths digits exceed the tenths digit, which fails whenever they read as a number ≤ the tenths digit. |
| D2 | `packages/learning/src/fam/b08.ts:2232`, `ahid` `explain` for the `2ab` step | All 126 `(a − b)²` items, e.g. `gen:ahid:1,3,8,1`, `gen:ahid:1,1,3,1` | 2ab with a = 3x, b = −8 is 2 × 3x × (−8) = −48x | Prints "2ab = 2 × 3x × 8 = -48x" (the product shown is +48x). It also prints "1x²" for p = 1 (`gen:ahid:1,1,3,1`: "a² = (x)² = 1x²"). |
| D3 | `packages/learning/src/fam/b06.ts:1266`, `afcross` bug `opposite-as-linear`, `says` | e.g. `gen:afcross:21,0` | Vertically opposite angles are equal. | "they do not add up to 180°": false at 90°. No served item has 90°, so this is a wording risk only. |
| D4 | `packages/learning/src/fam/b11.ts:634`, `akchance` prompt | 90 items, e.g. `gen:akchance:1,1,0,0` | — | "A bag has 1 red and 1 blue marbles": plural with 1 (grammar). |
| D5 | `families.ts:116`, `fadd` | all | — | No `teach.alternatives` and no `word` (transfer) form for a grade-4 core skill. TP-NUM-02 has text-only transfer candidates, which the grader cannot verify. |
| D6 | `packages/learning/src/fam/b04.ts:1945`, `adshade` bug `top-number`, `says` | e.g. `gen:adshade:1,4,1,2` | — | "1 squares were shaded" (plural with 1). TP2-PRT-SHADE quotes it verbatim, because the platform reads `addresses` from the verbatim text (blocker B3 below). |

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
