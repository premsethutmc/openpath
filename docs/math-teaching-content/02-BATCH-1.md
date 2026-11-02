# 2. Teaching batch 1: nine packages (review candidates)

Each package (`batch-1/<id>.md` readable, `.json` machine-readable, schema `teaching-package@0`) contains:

- the precise skill, prerequisite knowledge and graph prerequisites;
- a conceptual explanation and a visual (using an existing `Visual` type, or a recorded visual gap);
- worked examples with valid line-by-line reasoning;
- three graded hints and an alternative explanation;
- valid alternative methods;
- the method-credit rule and checker status;
- a diagnostic with an interpretation of each possible answer;
- misconception-specific screens (wrong answer → why → fix → counter-check → correct solution), each with a fresh guided item and a fresh check item;
- fresh guided practice, rechecks, transfer (everyday form) and delayed-check items;
- integration proposals (strategy shape and explanation-review entry);
- exact sources and uncertainties.

Every question id is a real generator instance from the family's own phase partition, with quarantine applied. Within a package, no item repeats another item's exposure key or number signature (the same fraction pair, angle, rectangle or coefficient pair).

| Package | Title | Diagnostic items | Worked | Misconception screens | Guided / recheck / transfer / delayed | Items passing checks | Oracle + alternatives agree on the whole applicable pool |
|---|---|---|---|---|---|---|---|
| [TP-NUM-01](batch-1/TP-NUM-01.md) | Comparing fractions with the same top number | 3 | 2 | 1 | 3/2/2/2 | 17/17 | 250/250 |
| [TP-NUM-02](batch-1/TP-NUM-02.md) | Adding like fractions: the bottom number names the piece size | 1 | 1 | 2 | 3/2/**0**/2 | 15/15 | 220/220 |
| [TP-NUM-03](batch-1/TP-NUM-03.md) | Comparing decimals: place value, not length | 2 | 2 | 2 | 3/2/2/2 | 19/19 | 300/300 |
| [TP-MEA-01](batch-1/TP-MEA-01.md) | Area or perimeter? Covering versus going round | 2 | 2 | 3 | 3/2/2/2 | 22/22 | 400/400 |
| [TP-GEO-01](batch-1/TP-GEO-01.md) | The exterior angle of a triangle | 2 | 2 | 3 | 3/2/2/2 | 22/22 | 400/400 |
| [TP-GEO-02](batch-1/TP-GEO-02.md) | Vertically opposite angles are equal | 3 | 2 | 2 | 3/2/2/2 | 20/20 | 300/300 |
| [TP-STA-01](batch-1/TP-STA-01.md) | The median: order first, then find the middle | 2 | 2 | 3 | 3/2/2/2 | 22/22 | 400/400 |
| [TP-ALG-01](batch-1/TP-ALG-01.md) | (a + b)²: why the middle term is 2ab | 2 | 2 | 2 | 3/2/2/2 | 19/19 | 90/90 |
| [TP-PRO-01](batch-1/TP-PRO-01.md) | Two dice: totals are not equally likely | 2 | 2 | 3 | 3/2/2/2 | 22/22 | 80/80 |

Totals: **178 instances checked, 178 pass. Whole-pool agreement is 2,440 of 2,440 applicable generated items** (oracle and every alternative method). The one recorded failure is the content gap noted below; it is not a check failure.

## Principles applied

- **Suspected or established.** One answer matching a modelled error is labelled *suspected*. Misconception screens are marked "only after the misconception is established" (misconception-evidence@1: two matching answers). Where two items could both match through a *different* cause, the package gives an extra interpretation rule (TP-NUM-01, TP-MEA-01). The engine does not apply that rule today; it is listed in 05.
- **Procedural slips are not called misconceptions.** `not-ordered` (median), `two-sides`, `multiply-tops` and `added-sides` are marked procedural.
- **Valid alternative methods** are included and checked: part size and common denominator; number line; money; repeated addition and 2(l + w); the theorem directly and via the third angle; going round and a full turn; crossing off; four products; tree diagram.
- **Answer credit is not method credit.** Every package states that a correct final answer earns answer credit only, and names its checker status. Only `fadd` has a working checker today (the equation statement through the derivation authority). The two geometry families have an adapter that is not authoritative for method credit, and the reasoner has no exterior-angle rule.
- **Rechecks test the same skill.** Rechecks and delayed checks are drawn only from items on which a target error is still possible and still gives a distinct wrong value. They cover each taught case (for example both area and perimeter, both directions of the exterior angle, same-size and different-size spinners).

## Recorded gaps inside the batch

- `fadd` has no everyday (transfer) form. Two authored transfer candidates are included as **text only**: their arithmetic is checked, but the grader cannot verify them until a generator form exists. Its diagnostic partition has no improper-sum item, so the diagnostic has one case.
- `ahid`: the diagnostic partition's only `(px + q)²` middle-term item is ambiguous ((4x + 4)², where copied numbers look like the misconception). The candidate is taken from the **check** partition and flagged for re-partitioning at integration.
- Visual capabilities missing from the `Visual` union: a triangle with an extended side and its exterior angle; two crossing lines; a perimeter outline; two equal-length fraction strips side by side; a labelled area model.
