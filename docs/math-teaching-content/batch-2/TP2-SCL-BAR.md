# TP2-SCL-BAR: Scaled bar charts: read the scale, do not count lines

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.statistics.scaled-bars` (Interpret scaled bar charts, grade 4), family `afbar` (Reading a bar chart with a scale).

**Skill.** Read values from a bar chart whose scale steps by more than 1, then compare or add them.

## Prerequisites

- skip counting in 2s, 5s, 10s
- difference and total
- Graph: MATH.statistics.bar-charts (mandatory)

## Explanation

On a scaled bar chart one line on the side does not always stand for 1: the numbers on the scale say how much each line stands for.
Read the top of each bar against the scale, then add or subtract as the question asks.

Visual: `{"type":"bars","title":"Mangoes sold at a shop","labels":["Mon","Tue","Wed","Thu","Fri"],"values":[100,50,300,150,400],"scale":50}`. Reuses the family's own bars figure (with scale).

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:afbar:4,0,1`** — The bar chart shows mangoes sold at a shop. Read the scale carefully. How many mangoes were sold on Friday?

1. Fri: 8 lines × 50 = 400

Answer **400**. (The family's own step text: The bar reaches 8 lines; each line is 50, so it shows 400.)

**`gen:afbar:1,1,5`** — The bar chart shows mangoes sold at a shop. Read the scale carefully. How many more mangoes were sold on Friday than on Wednesday?

1. Fri: 40; Wed: 5 (scale 5 per line)
1. 40 − 5 = 35

Answer **35**. (The family's own step text: The bar reaches 8 lines; each line is 5, so it shows 40; The bar reaches 1 lines; each line is 5, so it shows 5; How many more: 40 − 5 = 35.)

## Hints (graded, per worked example)

For `gen:afbar:4,0,1`:

1. Look at the numbers on the side of the chart.
2. How much does one line stand for?
3. Read the top of the bar against the scale.

For `gen:afbar:1,1,5`:

1. Look at the numbers on the side of the chart.
2. How much does one line stand for?
3. Read the top of the bar against the scale.

## Alternative explanation: Read the numbers on the side

Look at two numbers next to each other on the scale: their difference is what one line stands for.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Skip count up the bar**: count up in 50s to the top of each bar → Fri: 8 lines × 50 = 400

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:afbar:3,0,4`: The bar chart shows books borrowed from the library. Read the scale carefully. How many books were borrowed on Tuesday? | read one bar — count-lines gives the number of lines, assume-tens 10 per line | 200 | 10 → other modelled error count-lines (conceptual): suspected on one answer; 100 → TARGET modelled error assume-tens (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:afbar:0,1,6`: The bar chart shows visitors to a park. Read the scale carefully. How many more visitors came in February than in May? | how many more — adds an operation error (add-for-more) that is separate from scale reading | 6 | 3 → other modelled error count-lines (conceptual): suspected on one answer; 30 → TARGET modelled error assume-tens (procedural): suspected on one answer; 34 → other modelled error add-for-more (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `assume-tens` (procedural) — each line assumed to be 10 (procedural)

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "The bar chart shows mangoes sold at a shop. Read the scale carefully. How many mangoes were sold on Thursday and on Friday together?", one wrong answer is 60.
> Each line was taken as 10. Read the numbers on the scale: they tell how much each line stands for.
> Do not assume 10: read the numbers on the scale to see what one line stands for.
> Not 60, but 30.

Check: two numbers next to each other on the scale differ by the size of one line.

Solved correctly:

1. Thu: 10; Fri: 20 (scale 5 per line)
1. 10 + 20 = 30

Example `gen:afbar:1,2,13`; guided `gen:afbar:4,0,3:mc`; fresh check `gen:afbar:1,2,10:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:afbar:4,0,2:mc`, `gen:afbar:4,0,0:mc`, `gen:afbar:0,2,8:mc`
- Rechecks after teaching: `gen:afbar:4,0,7`, `gen:afbar:1,1,1`
- Transfer (everyday form): `gen:afbar:3,2,5:w`, `gen:afbar:3,2,3:w`
- Delayed checks: `gen:afbar:4,0,4`, `gen:afbar:1,1,8:mc`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Read values from a bar chart whose scale steps by more than 1, then compare or add them.
- **Generator:** `afbar` — afbar, all forms (params[1] = 0 read, 1 how many more, 2 together); scale > 1.
- **Trigger** `fix_assume_tens`: verified-misconception 'assume-tens' (two matching answers, misconception-evidence@1)
- **Trigger** `worked_steps`: existing explanation reused: reading a scaled bar (general)
- **Trigger** `skip_count`: existing explanation reused: counting up the scale
- **Trigger** `spot_the_mistake`: existing explanation reused: count-lines
- **Allowed methods:** the oracle's method (worked lines); Skip count up the bar
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:afbar:4,0,7`, `gen:afbar:1,1,1`
- **Retention target:** MATH.statistics.scaled-bars / `afbar`, cases: read one bar; how many more. Candidates: `gen:afbar:4,0,4`, `gen:afbar:1,1,8:mc`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** `worked_steps` (reading a scaled bar (general)); `skip_count` (counting up the scale); `spot_the_mistake` (count-lines)

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `fix_assume_tens` | pass | 2/2 sections checked, no violations | no (misconception-evidence) | yes | assume-tens |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b06.ts:824 afbar (seed of MATH.statistics.scaled-bars): bugs count-lines, assume-tens, add-for-more, difference-for-total

## Uncertainties

- afbar is the module's seed: its general teaching (worked_steps, skip_count) and spot_the_mistake (count-lines) already exist and are REUSED; only assume-tens gets a new explanation.

## Validation: 16/16 items pass; whole-pool oracle + alternatives agreement 360/360
