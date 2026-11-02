# TP-STA-01: The median: order first, then find the middle

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.statistics.median-mode` (Calculate median and mode, grade 7), family `akmed` (Finding the median).

**Skill.** Find the median of 5–10 whole numbers (order first; halfway between the two middle values for an even count).

## Prerequisites

- ordering whole numbers
- halfway between two numbers
- Graph: MATH.statistics.data-frequency (mandatory)

## Explanation

The median is the middle value once the data are IN ORDER: half the values are below it, half above.
With an even number of values there are two middle values; the median is halfway between them.

Visual: `{"type":"table","head":["in order"],"rows":[["14"],["65"],["66"],["75"],["80"]]}`. Reuses the table visual to show the ordered list; crossing off from both ends is the family's own cross_off alternative.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:akmed:76,5`** — Find the median of these numbers: 75, 14, 80, 65, 66.

1. In order: 14, 65, 66, 75, 80 (5 values)
1. The middle one is the 3rd value: 66

Answer **66**. (The family's own step text: In order: 14, 65, 66, 75, 80; The middle value is 66.)

**`gen:akmed:71,10`** — Find the median of these numbers: 27, 83, 21, 62, 73, 63, 34, 52, 80, 90.

1. In order: 21, 27, 34, 52, 62, 63, 73, 80, 83, 90 (10 values)
1. The two middle values are the 5th and 6th: 62 and 63; halfway: (62 + 63) ÷ 2 = 62.5

Answer **62.5**. (The family's own step text: In order: 21, 27, 34, 52, 62, 63, 73, 80, 83, 90; The two middle values are 62 and 63: (62 + 63) ÷ 2 = 62.5.)

## Hints (graded, per worked example)

For `gen:akmed:76,5`:

1. Are the numbers in order?
2. Write them from smallest to largest.
3. Find the middle one (or halfway between the two middle ones).

For `gen:akmed:71,10`:

1. Are the numbers in order?
2. Write them from smallest to largest.
3. Find the middle one (or halfway between the two middle ones).

## Alternative explanation: Line up by height

Line the numbers up from smallest to largest, like children by height.
The child in the middle of the line is the median; with two in the middle, take halfway.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Cross off from both ends**: cross off smallest and largest repeatedly; left: 66 → median 66

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract for statistics.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:akmed:13,5`: Find the median of these numbers: 54, 56, 58, 59, 16. | odd count — not-ordered (middle of the list as given) and mean-for-median give different values | 56 | 58 → TARGET modelled error not-ordered (procedural): suspected on one answer; 48.6 → TARGET modelled error mean-for-median (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:akmed:23,8`: Find the median of these numbers: 72, 57, 32, 74, 65, 86, 28, 89. | even count — one-middle (a single middle value) appears only with an even count | 68.5 | 69.5 → TARGET modelled error not-ordered (procedural): suspected on one answer; 65 | 72 → TARGET modelled error one-middle (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `not-ordered` (procedural) — PROCEDURAL slip or missing step: treat a single occurrence as a suspected error, not a misconception

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Find the median of these numbers: 59, 50, 87, 86, 81.", one wrong answer is 87.
> The middle number of the list as given was taken. Put the numbers in order first.
> The middle of the list only means something once the list is in order.
> Not 87, but 81.

Counter-check: in the order given the middle is 87; in order it is 81. Reorder the same data and the 'middle' would change, so it cannot be a fact about the data.

Solved correctly:

1. In order: 50, 59, 81, 86, 87 (5 values)
1. The middle one is the 3rd value: 81

Example `gen:akmed:32,5`; guided `gen:akmed:8,6:mc`; fresh check `gen:akmed:77,7:mc`.

### `mean-for-median` (conceptual) — conceptual: averages not distinguished

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Find the median of these numbers: 21, 74, 25, 41, 80, 81, 64, 47, 62.", one wrong answer is 55.
> The mean was worked out. The median is the middle value once the numbers are in order.
> The mean shares the total equally; the median is the middle value in order. They are different averages.
> Not 55, but 62.

Check: the total 495 shared equally among 9 values is 55 (the mean); in order, 21, 25, 41, 47, 62, 64, 74, 80, 81, the middle value is different.

Solved correctly:

1. In order: 21, 25, 41, 47, 62, 64, 74, 80, 81 (9 values)
1. The middle one is the 5th value: 62

Example `gen:akmed:71,9`; guided `gen:akmed:77,5:mc`; fresh check `gen:akmed:29,5`.

### `one-middle` (procedural) — procedural: even count

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Find the median of these numbers: 66, 58, 75, 81, 14, 95.", one wrong answer is 66 or 75.
> With 6 numbers there are two middle numbers (66 and 75); the median is halfway between them.
> With an even number of values there are two middle values: take halfway between them.
> Not 66 or 75, but 70.5.

Check: 6 values have no single middle; the 3rd and 4th values, 66 and 75, share the middle, so the median is halfway: 70.5.

Solved correctly:

1. In order: 14, 58, 66, 75, 81, 95 (6 values)
1. The two middle values are the 3rd and 4th: 66 and 75; halfway: (66 + 75) ÷ 2 = 70.5

Example `gen:akmed:32,6`; guided `gen:akmed:79,6:mc`; fresh check `gen:akmed:33,6`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:akmed:76,7:mc`, `gen:akmed:13,9`, `gen:akmed:51,9`
- Rechecks after teaching: `gen:akmed:0,9`, `gen:akmed:0,8:mc`
- Transfer (everyday form): `gen:akmed:27,6:w`, `gen:akmed:35,8:w`
- Delayed checks: `gen:akmed:8,7`, `gen:akmed:24,10`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Find the median of 5–10 whole numbers (order first; halfway between the two middle values for an even count).
- **Generator:** `akmed` — akmed, all items (5–10 different whole numbers); examples, diagnostics and rechecks need |mean − median| ≥ 3.
- **Trigger** `fix_mean_for_median`: verified-misconception 'mean-for-median' (two matching answers, misconception-evidence@1)
- **Trigger** `fix_one_middle`: verified-misconception 'one-middle' (two matching answers, misconception-evidence@1)
- **Trigger** `spot_the_mistake`: already exists for 'not-ordered': reuse, do not add
- **Allowed methods:** the oracle's method (worked lines); Cross off from both ends
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:akmed:0,9`, `gen:akmed:0,8:mc`
- **Retention target:** MATH.statistics.median-mode / `akmed`, cases: odd count; even count. Candidates: `gen:akmed:8,7`, `gen:akmed:24,10`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** `spot_the_mistake` (not-ordered)

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `fix_mean_for_median` | pass | 2/2 sections checked, no violations | no (misconception-evidence) | yes | mean-for-median |
| `fix_one_middle` | pass | 2/2 sections checked, no violations | no (misconception-evidence) | yes | one-middle |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b11.ts:1729 akmed: teach idea/method, alternative cross_off; bugs not-ordered, mean-for-median, one-middle
- library.v1.json MATH.statistics.median-mode (seeded from akmed: this is the seed family; spot_the_mistake addresses one bug only)

## Uncertainties

- 'not-ordered' is procedural: under misconception-evidence@1 a single match is a suspected error; only two matching answers establish it.

## Validation: 22/22 items pass; whole-pool oracle + alternatives agreement 400/400
