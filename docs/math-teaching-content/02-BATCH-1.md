# 2. Teaching batch 1: nine packages (review candidates)

Each package (`batch-1/<id>.md` readable, `.json` machine-readable, schema `teaching-package@0`) contains:
- the precise skill, prerequisite knowledge and graph prerequisites;
- an explanation with a visual (an existing `Visual` type, or a recorded visual gap);
- worked lines, checked by an independent oracle;
- graded hints for each worked example, an alternative explanation, and valid alternative methods;
- the method-credit rule;
- a diagnostic with a reading of every possible answer, and, where repeated wrong answers could have different causes, a **response-pattern table**;
- misconception-specific teaching;
- fresh practice, rechecks, transfer and delayed-check items;
- the **integration specification** and integration objects in the existing `Strategy` / `ExplanationRecord` shapes, run through the platform's own gates;
- sources and uncertainties.

Every question id is a real, quarantine-filtered generator instance. Within a package, no item repeats another item's exposure key or number signature. NUM-02 and PRO-01 also require distinct answers.

| Package | Diagnostic items | Response patterns | New strategies | Guided / recheck / transfer / delayed | Items passing checks | Oracle + alternatives on the whole applicable pool | Platform teaching contract applies today | Errors the platform cannot diagnose |
|---|---|---|---|---|---|---|---|---|
| [TP-NUM-01](batch-1/TP-NUM-01.md) | 4 | 5 | 2 | 3/2/2/2 | 18/18 | 250/250 | yes | — |
| [TP-NUM-02](batch-1/TP-NUM-02.md) | 1 | rule | 3 | 3/2/**0**/2 | 15/15 | 220/220 | yes | — |
| [TP-NUM-03](batch-1/TP-NUM-03.md) | 2 | — | 3 | 3/2/2/2 | 19/19 | 300/300 | outside scope (3) | longer-is-larger, shorter-is-larger |
| [TP-MEA-01](batch-1/TP-MEA-01.md) | 4 | 6 | 4 | 3/2/2/2 | 24/24 | 400/400 | outside scope (4) | — |
| [TP-GEO-01](batch-1/TP-GEO-01.md) | 2 | — | 4 | 3/2/2/2 | 22/22 | 400/400 | outside scope (4) | — |
| [TP-GEO-02](batch-1/TP-GEO-02.md) | 3 | — | 3 | 3/2/2/2 | 20/20 | 300/300 | outside scope (3) | — |
| [TP-STA-01](batch-1/TP-STA-01.md) | 2 | — | 2 (+ reuses spot_the_mistake) | 3/2/2/2 | 22/22 | 400/400 | yes | — |
| [TP-ALG-01](batch-1/TP-ALG-01.md) | 2 | — | 3 | 3/2/2/2 | 19/19 | 90/90 | outside scope (3) | — |
| [TP-PRO-01](batch-1/TP-PRO-01.md) | 2 | — | 4 | 3/2/2/2 | 22/22 | 80/80 | outside scope (4) | — |

Totals: **181/181 instances pass. 2,440/2,440 applicable pool items agree** (oracle and every alternative method). 28 strategies are proposed. The one recorded build "failure" is NUM-02's missing transfer form, which is a content gap.

## Instructional ambiguity resolved (this revision)

- **Fractions (TP-NUM-01).** There are now 4 diagnostic items: same top number asked greater, same top asked smaller, and two same-bottom **contrast** items. Two bigger-bottom answers establish the misconception **only** when both contrast items are right. Wrong contrast answers mean a greater/smaller reversal explains everything, so nothing is established. A mixed result means re-probe.
- **Adding fractions (TP-NUM-02).** The add-denominators value equals "averaging the two fractions" on every item, so no contrast item can separate them by value. The fix trigger requires the answer to be **written** unsimplified (8/18). Even that form can come from halving, so the fix teaches piece size and is rechecked on a new item.
- **Area and perimeter (TP-MEA-01).** There are now 4 items: two covering and two going round, in different contexts. The table separates these patterns:
  - perimeter-for-area: establishes;
  - area-for-perimeter: establishes;
  - two-sides on going-round items only: establishes;
  - a consistent **word swap**: does **not** establish either misconception (teach the meanings);
  - "adds the given numbers" everywhere: does **not** establish (two different errors);
  - one match: suspected only.
- **Binomial delayed checks (TP-ALG-01).** The delayed-check audit lists every retention item: its form, whether it asks the cross term, and whether a copied number could read as the misconception (the same rule the examples use). **14 of 54** retention items ask the cross term. **3** of those are (px + q)², and **none** avoids a copied-number reading.

  **No unambiguous delayed check of the positive square exists.** The delayed checks used are (px − q)² cross-term items, labelled as such. Nothing is substituted silently; the missing item is a generator partition change for Codex (05).

## Integration readiness (05 has the details)

For every package, `integration.spec` gives:
- the skill and the generator restriction;
- the **trigger** of each strategy: general need, or the established misconception plus any response-pattern or written-form condition;
- the allowed methods;
- the fresh-check selection rule and candidates;
- the retention target and candidates;
- **answer evidence** (the trusted grader) versus **method evidence** (none for 8 of 9 families);
- ungradable, text-only items.

Platform findings that block parts of the batch today, recorded rather than hidden:
1. **The teaching scope.** `teachingEligibility` checks only strategies whose guided item belongs to the module's main pool family. For six packages the new strategies fall outside that scope, so today they are "not checked" and therefore ineligible. Under the same contract rules, with the family as the lesson scope, every one of them passes with no violations.
2. **The diagnosis reader.** `reasoning.ts probeReading` cannot read decimal-string predictions (`aedecc`), so TP-NUM-03's two fixes can never be triggered.

Earlier revisions of this document said "no contract violations" for every proposal. That pass was **partly spurious**: identical screen titles matched other strategies' sections. Titles are now unique, and the two kinds of check are reported separately.
