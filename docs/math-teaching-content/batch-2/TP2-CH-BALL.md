# TP2-CH-BALL: Balls of different counts: each ball is equally likely

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.probability.classical` (Calculate equally likely event probabilities, grade 9), family `anbag` (Probability of a colour drawn from a bag).

**Skill.** Classical probability of a colour from a bag with unequal colour counts.

## Prerequisites

- probability = favourable ÷ total for equally likely outcomes
- Graph: MATH.probability.sample-space (mandatory)

## Explanation

Each marble (or ball) is equally likely to be picked, not each colour. So count marbles, not colours.
Probability = (marbles that fit) ÷ (ALL the marbles). It is a number from 0 to 1, never more than 1.

Visual: `{"type":"table","head":["Colour","Balls"],"rows":[["red",1],["blue",8],["green",4]]}`. anbag has no figure; a colour table (existing table visual) is proposed.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:anbag:1,8,4,2`** — A bag has 1 red, 8 blue and 4 green balls, all of the same size. One ball is taken out without looking. What is the probability that it is green? Give a fraction.

1. All the balls: 1 red + 8 blue + 4 green = 13, each equally likely
1. Balls that fit "green": 4
1. P = 4/13

Answer **4/13**. (The family's own step text: All the balls: 1 + 8 + 4 = 13; 4 of them are green; P = 4/13.)

## Hints (graded, per worked example)

For `gen:anbag:1,8,4,2`:

1. Count all the balls.
2. Count the balls of the colour asked.
3. Write the second over the first.

## Alternative explanation: Out of

The probability is how many balls belong to the colour, out of how many balls there are.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Number every ball**: number the balls; each number is equally likely → P = 4/13

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:anbag:6,9,7,2`: A bag has 6 red, 9 blue and 7 green balls, all of the same size. One ball is taken out without looking. What is the probability that it is green? Give a fraction. | unequal colours — colours-equally-likely gives 1/(colours) | 7/22 | 7/15 → other modelled error odds (conceptual): suspected on one answer; 1/3 → TARGET modelled error colours-equally-likely (conceptual): suspected on one answer; 7 → other modelled error count-not-probability (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `colours-equally-likely` (conceptual) — colours taken as equally likely

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "A bag has 2 red, 6 blue and 2 green balls, all of the same size. One ball is taken out without looking. What is the probability that it is green? Give a fraction.", one wrong answer is 1/3.
> Each colour was taken as equally likely; the colours have different numbers of balls, and it is the balls that are equally likely.
> It is the balls that are equally likely, not the colours.
> Not 1/3, but 1/5.

Check: 6 blue balls and only 2 green balls: a green ball is less likely to come out than a blue one, so the colours cannot all have the same chance.

Solved correctly:

1. All the balls: 2 red + 6 blue + 2 green = 10, each equally likely
1. Balls that fit "green": 2
1. P = 2/10 = 1/5

Example `gen:anbag:2,6,2,2`; guided `gen:anbag:3,2,3,0:mc`; fresh check `gen:anbag:6,8,0,1:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:anbag:9,2,4,2`, `gen:anbag:7,6,1,0`, `gen:anbag:5,6,2,2`
- Rechecks after teaching: `gen:anbag:1,4,3,0`, `gen:anbag:6,8,6,2:mc`
- Transfer (everyday form): `gen:anbag:1,6,1,1:w`, `gen:anbag:3,5,0,1:w`
- Delayed checks: `gen:anbag:1,9,3,2:mc`, `gen:anbag:8,8,5,2`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Classical probability of a colour from a bag with unequal colour counts.
- **Generator:** `anbag` — anbag, all three asked colours; diagnostics need unequal counts.
- **Trigger** `fix_colours_equally_likely`: verified-misconception 'colours-equally-likely' (two matching answers, misconception-evidence@1)
- **Trigger** `worked_steps`: existing explanation reused: favourable over all (general)
- **Trigger** `out-of`: existing explanation reused: numbering the balls
- **Trigger** `spot_the_mistake`: existing explanation reused: odds
- **Allowed methods:** the oracle's method (worked lines); Number every ball
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:anbag:1,4,3,0`, `gen:anbag:6,8,6,2:mc`
- **Retention target:** MATH.probability.classical / `anbag`, cases: unequal colours. Candidates: `gen:anbag:1,9,3,2:mc`, `gen:anbag:8,8,5,2`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** `worked_steps` (favourable over all (general)); `out-of` (numbering the balls); `spot_the_mistake` (odds)

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `fix_colours_equally_likely` | pass | 2/2 sections checked, no violations | no (misconception-evidence) | yes | colours-equally-likely |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b14.ts:649 anbag (seed of MATH.probability.classical): bugs odds, colours-equally-likely, count-not-probability

## Uncertainties

- anbag is the seed: its spot_the_mistake (odds) is REUSED; this package adds colours-equally-likely only.

## Validation: 14/14 items pass; whole-pool oracle + alternatives agreement 400/400
