# TP2-SCL-PICT: Pictographs: each picture stands for the key

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.statistics.pictographs` (Interpret pictographs with a key, grade 2), family `acpicttab` (Pictographs and tables: completing, totals and the largest group).

**Skill.** Use a pictograph key (each symbol stands for k) to draw a row and to read totals.

## Prerequisites

- multiplying and sharing by 2, 5, 10
- reading a table
- Graph: MATH.statistics.picture-data (mandatory)

## Explanation

In a pictograph one picture does not always stand for 1 thing: the key says how many it stands for.
To read, count the pictures and multiply by the key; to draw, share the number into groups of the key.

Visual: `{"type":"table","head":["Choice","Children"],"rows":[["Mango",12],["Banana",12],["Guava",16],["Apple",8]]}`. Reuses the family's own table / pictograph figures.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:acpicttab:0,9,2,0`** — The table shows the favourite fruits of the children of a school. A pictograph of it is drawn with each ● standing for 2 children. How many ● should be drawn for Guava?

1. Guava: 16 children, each ● for 2
1. 16 ÷ 2 = 8 pictures

Answer **8**. (The family's own step text: 16 children ÷ 2 = 8 pictures.)

## Hints (graded, per worked example)

For `gen:acpicttab:0,9,2,0`:

1. What does one picture stand for?
2. Share the number into groups of the key.
3. One picture for each group.

## Alternative explanation: Bundles

Think of each picture as a bundle of children tied together.
Count bundles, then children in the bundles.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Make a table**: pictures × key = children, or children ÷ key = pictures, row by row → 16 ÷ 2 = 8 pictures

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:acpicttab:2,22,2,0`: The table shows how the children of a school come to school. A pictograph of it is drawn with each ● standing for 10 children. How many ● should be drawn for Cycle? | draw a row — one-each draws one picture per child | 7 | 70 → TARGET modelled error one-each (conceptual): suspected on one answer (competing explanation: see the trigger condition; answers alone may not establish it); anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:acpicttab:2,1,0,1`: The pictograph shows how the children of a school come to school. Each ● stands for 10 children. How many children are there in all? | read a total — no-key counts pictures; drawing and reading separate 'ignores the key both ways' from a one-direction gap | 240 | 24 → other modelled error no-key (conceptual): suspected on one answer; 180 | 220 | 160 → other modelled error missed-row (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `one-each` (conceptual) — one picture per child when drawing

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "The table shows how the children of a school come to school. A pictograph of it is drawn with each ● standing for 10 children. How many ● should be drawn for Walk?", one wrong answer is 40.
> One ● was drawn for each child, but each ● stands for 10 children: share the number into groups of 10.
> Each picture stands for the key's number of children, so draw one picture for each GROUP, not each child.
> Not 40, but 4.

Check: 10 children make one picture.

Solved correctly:

1. Walk: 40 children, each ● for 10
1. 40 ÷ 10 = 4 pictures

Example `gen:acpicttab:2,7,0,0`; guided `gen:acpicttab:2,4,3,0:mc`; fresh check `gen:acpicttab:1,5,2,0:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:acpicttab:1,29,3,0`, `gen:acpicttab:0,16,3,0`, `gen:acpicttab:1,19,1,0:mc`
- Rechecks after teaching: `gen:acpicttab:0,13,3,0:mc`, `gen:acpicttab:1,0,2,0`
- Transfer (everyday form): `gen:acpicttab:0,23,2,0:w`, `gen:acpicttab:1,6,2,0:w`
- Delayed checks: `gen:acpicttab:0,4,3,0`, `gen:acpicttab:2,2,1,0:mc`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Use a pictograph key (each symbol stands for k) to draw a row and to read totals.
- **Generator:** `acpicttab` — acpicttab, all three forms: params[3] = 0 draw a row (÷ key), 1 total (× key), 2 largest group; key > 1 in diagnostics.
- **Trigger** `acpicttab_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_one_each`: verified-misconception 'one-each' (two matching answers, misconception-evidence@1) AND a competing explanation ('copied the table value', or 'answered children instead of pictures') gives the SAME number on every draw item, so answers alone cannot establish one-each: establish it only from a drawn pictograph (the learner draws one symbol per child) or after asking the learner what one symbol stands for
- **Trigger** `spot_the_mistake`: existing explanation reused: no-key (reading a pictograph)
- **Trigger** `table`: existing explanation reused: pictures × key (general, seed acpict)
- **Allowed methods:** the oracle's method (worked lines); Make a table
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:acpicttab:0,13,3,0:mc`, `gen:acpicttab:1,0,2,0`
- **Retention target:** MATH.statistics.pictographs / `acpicttab`, cases: draw a row. Candidates: `gen:acpicttab:0,4,3,0`, `gen:acpicttab:2,2,1,0:mc`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** `spot_the_mistake` (no-key (reading a pictograph)); `table` (pictures × key (general, seed acpict))

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `acpicttab_concept` | **not checked**: outside the module's teaching scope (ineligible today) | 3/3 sections checked, no violations | yes | yes | — |
| `fix_one_each` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | one-each |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b03.ts:1958 acpicttab: teach idea/method, alternative table, figures table/pictograph; bugs one-each, no-key, missed-row, smallest

## Uncertainties

- no-key (reading) is already taught by the pictographs module's spot_the_mistake (seed acpict); this package adds one-each (drawing) and the shared concept for the family.
- one-each always predicts the number printed in the table, so it competes with copying: see the trigger condition.

## Validation: 15/15 items pass; whole-pool oracle + alternatives agreement 300/300
