# TP2-PRT-NAME: Naming a shaded fraction: out of ALL the equal parts

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.number.fraction-models` (Represent fractions of a whole, grade 3), family `adfname` (Naming the shaded fraction of a shape).

**Skill.** Name the shaded fraction of a shape cut into equal parts.

## Prerequisites

- equal parts
- counting squares
- Graph: none recorded

## Explanation

A fraction names equal parts of ONE whole. The bottom number is how many equal parts the whole is cut into, all of them, shaded or not.
The top number is how many of those parts we mean. So the fraction of a shape that is shaded is (shaded parts) over (all the equal parts).

Visual: `{"type":"grid","rows":1,"cols":7,"shaded":1}`. Reuses the family's own grid figure.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:adfname:1,7,1`** — What fraction of the shape in the picture is shaded? All the small squares are the same size.

1. All the equal squares: 1 × 7 = 7
1. Shaded: 1
1. 1/7

Answer **1/7**. (The family's own step text: The whole has 1 × 7 = 7 equal squares: the bottom number; 1 of them are shaded: 1/7.)

## Hints (graded, per worked example)

For `gen:adfname:1,7,1`:

1. How many equal parts make the whole shape?
2. How many of them are shaded?
3. Write shaded over ALL the parts.

## Alternative explanation: Same fraction on a cake

Cut a round cake into the same number of equal pieces and colour the same number. The fraction is the same.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Unshaded first**: unshaded 6, so shaded = 7 − 6 = 1 of 7

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:adfname:2,6,7`: What fraction of the shape in the picture is shaded? All the small squares are the same size. | shaded fraction — shaded-to-unshaded gives shaded/unshaded; count-only gives the shaded count | 7/12 | 7/5 → TARGET modelled error shaded-to-unshaded (conceptual): suspected on one answer; 5/12 → other modelled error unshaded (procedural): suspected on one answer; 7 → TARGET modelled error count-only (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `shaded-to-unshaded` (conceptual) — part-to-part instead of part-to-whole

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "What fraction of the shape in the picture is shaded? All the small squares are the same size.", one wrong answer is 1/7.
> The shaded squares were put over the unshaded ones. The bottom number is ALL the equal parts of the whole.
> The bottom number counts ALL the equal parts of the whole, the shaded ones too.
> Not 1/7, but 1/8.

Check: the whole shape is cut into 8 equal squares, so each square is 1/8 of it, and 1 shaded square is 1/8.

Solved correctly:

1. All the equal squares: 4 × 2 = 8
1. Shaded: 1
1. 1/8

Example `gen:adfname:4,2,1`; guided `gen:adfname:5,2,7`; fresh check `gen:adfname:2,7,1:mc`.

### `count-only` (conceptual) — a count, not a fraction

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "What fraction of the shape in the picture is shaded? All the small squares are the same size.", one wrong answer is 1.
> Only the shaded squares were counted. A fraction also says how many equal parts make the whole.
> A fraction says how many parts out of how many: write the shaded parts over all the parts.
> Not 1, but 1/12.

Check: 1 shaded square out of 12 is a part of the shape; the number 1 alone does not say out of how many.

Solved correctly:

1. All the equal squares: 4 × 3 = 12
1. Shaded: 1
1. 1/12

Example `gen:adfname:4,3,1`; guided `gen:adfname:3,5,8`; fresh check `gen:adfname:2,9,11:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:adfname:3,2,1:mc`, `gen:adfname:1,5,2:mc`, `gen:adfname:1,8,3:mc`
- Rechecks after teaching: `gen:adfname:4,4,9`, `gen:adfname:1,9,1`
- Transfer (everyday form): `gen:adfname:2,10,11:w`, `gen:adfname:1,10,3:w`
- Delayed checks: `gen:adfname:2,3,1`, `gen:adfname:2,2,1:mc`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Name the shaded fraction of a shape cut into equal parts.
- **Generator:** `adfname` — adfname, all items (grids of equal squares); diagnostics need shaded ≠ unshaded so the two errors differ.
- **Trigger** `adfname_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_shaded_to_unshaded`: verified-misconception 'shaded-to-unshaded' (two matching answers, misconception-evidence@1)
- **Trigger** `fix_count_only`: verified-misconception 'count-only' (two matching answers, misconception-evidence@1)
- **Trigger** `equal_parts`: existing explanation reused: equal parts (authored, general)
- **Allowed methods:** the oracle's method (worked lines); Unshaded first
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:adfname:4,4,9`, `gen:adfname:1,9,1`
- **Retention target:** MATH.number.fraction-models / `adfname`, cases: shaded fraction. Candidates: `gen:adfname:2,3,1`, `gen:adfname:2,2,1:mc`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** `equal_parts` (equal parts (authored, general))

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `adfname_concept` | pass | 3/3 sections checked, no violations | yes | yes | — |
| `fix_shaded_to_unshaded` | pass | 2/2 sections checked, no violations | no (misconception-evidence) | yes | shaded-to-unshaded |
| `fix_count_only` | pass | 2/2 sections checked, no violations | no (misconception-evidence) | yes | count-only |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b04.ts:567 adfname: teach idea/method, alternative pie, figure grid; bugs shaded-to-unshaded, unshaded, count-only

## Uncertainties

- MATH.number.fraction-models is an authored module (one strategy equal_parts); no misconception-specific explanation exists.

## Validation: 17/17 items pass; whole-pool oracle + alternatives agreement 145/145
