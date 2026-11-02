# TP2-PRT-SHADE: Shading a fraction of a grid: parts of the whole, not the top number

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.number.fraction-models` (Represent fractions of a whole, grade 3), family `adshade` (How many squares to shade to show a fraction).

**Skill.** Shade a/b of a grid of n equal squares: n ÷ b squares per part, a parts.

## Prerequisites

- sharing into equal groups
- what a/b means
- Graph: none recorded

## Explanation

A fraction names equal parts of ONE whole. The bottom number is how many equal parts the whole is cut into, all of them, shaded or not.
The top number is how many of those parts we mean. So the fraction of a shape that is shaded is (shaded parts) over (all the equal parts).

Visual: `{"type":"grid","rows":5,"cols":3,"shaded":0}`. Reuses the family's own empty grid figure.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:adshade:5,3,2,5`** — The grid in the picture has 15 equal squares. How many squares must be shaded to show 2/5 of the grid?

1. Share 15 squares into 5 equal parts: 15 ÷ 5 = 3 squares in each part
1. 2 parts: 2 × 3 = 6 squares

Answer **6**. (The family's own step text: 1/5 of 15 squares is 3 squares; 2 of those parts: 2 × 3 = 6 squares.)

## Hints (graded, per worked example)

For `gen:adshade:5,3,2,5`:

1. Into how many equal parts must the grid be shared for /5?
2. How many squares are in each part?
3. Shade 2 of those parts.

## Alternative explanation: Two wholes

Half of a small grid and half of a big grid are different numbers of squares, but each is half of its own grid.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Multiply first**: 2 × 15 = 30; ÷ 5 = 6

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:adshade:2,8,3,8`: The grid in the picture has 16 equal squares. How many squares must be shaded to show 3/8 of the grid? | grid larger than the bottom number — top-number shades a squares instead of a × (n ÷ b) | 6 | 3 → TARGET modelled error top-number (conceptual): suspected on one answer; 2 → other modelled error one-part (procedural): suspected on one answer; 10 → other modelled error unshaded (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `top-number` (conceptual) — the top number read as a count of squares

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "The grid in the picture has 18 equal squares. How many squares must be shaded to show 7/9 of the grid?", one wrong answer is 7.
> 7 squares were shaded, the top number. The top number counts parts of size 1/9 of the WHOLE grid, and each such part here is 2 squares.
> The top number counts PARTS of the whole, and each part may be several squares.
> Not 7, but 14.

Check: 7 squares out of 18 is 7/18, not 7/9.

Solved correctly:

1. Share 18 squares into 9 equal parts: 18 ÷ 9 = 2 squares in each part
1. 7 parts: 7 × 2 = 14 squares

Example `gen:adshade:3,6,7,9`; guided `gen:adshade:4,4,5,8:mc`; fresh check `gen:adshade:6,5,7,10`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:adshade:2,5,3,5:mc`, `gen:adshade:6,2,1,2`, `gen:adshade:3,5,1,5:mc`
- Rechecks after teaching: `gen:adshade:4,8,3,8:mc`, `gen:adshade:2,9,1,3:mc`
- Transfer (everyday form): `gen:adshade:4,9,5,9:w`, `gen:adshade:4,5,1,10:w`
- Delayed checks: `gen:adshade:6,3,5,9`, `gen:adshade:5,4,3,10`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Shade a/b of a grid of n equal squares: n ÷ b squares per part, a parts.
- **Generator:** `adshade` — adshade, all items; diagnostics need n > b so 'top-number' differs from the answer.
- **Trigger** `adshade_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_top_number`: verified-misconception 'top-number' (two matching answers, misconception-evidence@1)
- **Trigger** `equal_parts`: existing explanation reused: equal parts (authored, general)
- **Allowed methods:** the oracle's method (worked lines); Multiply first
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:adshade:4,8,3,8:mc`, `gen:adshade:2,9,1,3:mc`
- **Retention target:** MATH.number.fraction-models / `adshade`, cases: grid larger than the bottom number. Candidates: `gen:adshade:6,3,5,9`, `gen:adshade:5,4,3,10`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** `equal_parts` (equal parts (authored, general))

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `adshade_concept` | **not checked**: outside the module's teaching scope (ineligible today) | 3/3 sections checked, no violations | yes | yes | — |
| `fix_top_number` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | top-number |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b04.ts:1945 adshade: teach idea/method, alternative two_wholes, figure grid; bugs top-number, one-part, unshaded

## Uncertainties


## Validation: 14/14 items pass; whole-pool oracle + alternatives agreement 300/300
