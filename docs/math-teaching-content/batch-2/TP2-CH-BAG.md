# TP2-CH-BAG: Count marbles, not colours

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.probability.chance-language` (Compare possible and impossible events, grade 6), family `akchance` (Probability from 0 (impossible) to 1 (certain)).

**Skill.** Probability of picking a colour (or not a colour) from a bag of marbles of different counts.

## Prerequisites

- fractions as part of a whole
- counting
- Graph: MATH.number.addition (mandatory)

## Explanation

Each marble (or ball) is equally likely to be picked, not each colour. So count marbles, not colours.
Probability = (marbles that fit) ÷ (ALL the marbles). It is a number from 0 to 1, never more than 1.

Visual: `{"type":"table","head":["Colour","Number of marbles"],"rows":[["Red",4],["Blue",2],["Green",4]]}`. Reuses the family's own colour table figure.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:akchance:4,2,4,0`** — A bag has 4 red, 2 blue and 4 green marbles, as in the table. Farhan picks one marble without looking. What is the probability that it is red? (A fraction is fine.)

1. All the marbles: 4 red + 2 blue + 4 green = 10, each equally likely
1. Marbles that fit "red": 4
1. P = 4/10 = 2/5

Answer **2/5**. (The family's own step text: There are 4 + 2 + 4 = 10 marbles in all; 4 of them fit: red; Probability = 4 ÷ 10 = 2/5.)

## Hints (graded, per worked example)

For `gen:akchance:4,2,4,0`:

1. Count ALL the marbles.
2. Count the ones that fit.
3. Fit ÷ all.

## Alternative explanation: Scale from 0 to 1

No matching marbles: 0. All of them: 1. Some: in between; more matching marbles means nearer 1.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Number every marble**: number the marbles 1, 2, 3, …; each number is equally likely → P = 4/10 = 2/5

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:akchance:2,3,2,0`: A bag has 2 red, 3 blue and 2 green marbles, as in the table. Karthik picks one marble without looking. What is the probability that it is red? (A fraction is fine.) | unequal colours — colours-equal gives 1/(colours); odds gives red : others | 2/7 | 2/5 → other modelled error odds (conceptual): suspected on one answer; 1/3 → TARGET modelled error colours-equal (conceptual): suspected on one answer; 2 → other modelled error count-only (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `colours-equal` (conceptual) — colours taken as equally likely

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "A bag has 8 red, 2 blue and 1 green marbles, as in the table. Lakshmi picks one marble without looking. What is the probability that it is red? (A fraction is fine.)", one wrong answer is 1/3.
> Each colour was taken as equally likely (1 out of 3 colours). The colours have different numbers of marbles, so count marbles, not colours.
> Colours with more marbles are more likely: count marbles, not colours.
> Not 1/3, but 8/11.

Check: there are 8 red but only 1 green, so green is LESS likely than red. So the colours do not all have the same chance.

Solved correctly:

1. All the marbles: 8 red + 2 blue + 1 green = 11, each equally likely
1. Marbles that fit "red": 8
1. P = 8/11

Example `gen:akchance:8,2,1,0`; guided `gen:akchance:6,6,2,1:mc`; fresh check `gen:akchance:2,7,5,0:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:akchance:5,8,3,0:mc`, `gen:akchance:2,6,3,0`, `gen:akchance:8,8,2,0:mc`
- Rechecks after teaching: `gen:akchance:9,9,4,0:mc`, `gen:akchance:6,4,0,1`
- Transfer (everyday form): `gen:akchance:1,1,6,1:w`, `gen:akchance:7,1,6,1:w`
- Delayed checks: `gen:akchance:7,9,1,0:mc`, `gen:akchance:5,7,5,1`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Probability of picking a colour (or not a colour) from a bag of marbles of different counts.
- **Generator:** `akchance` — akchance with params[3] ∈ {0, 1} (is X / is not X); diagnostics need unequal colour counts (colours-equal differs from the answer).
- **Trigger** `fix_colours_equal`: verified-misconception 'colours-equal' (two matching answers, misconception-evidence@1)
- **Trigger** `worked_steps`: existing explanation reused: favourable over all (general)
- **Trigger** `scale_words`: existing explanation reused: the 0–1 scale
- **Trigger** `spot_the_mistake`: existing explanation reused: odds
- **Allowed methods:** the oracle's method (worked lines); Number every marble
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:akchance:9,9,4,0:mc`, `gen:akchance:6,4,0,1`
- **Retention target:** MATH.probability.chance-language / `akchance`, cases: unequal colours. Candidates: `gen:akchance:7,9,1,0:mc`, `gen:akchance:5,7,5,1`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** `worked_steps` (favourable over all (general)); `scale_words` (the 0–1 scale); `spot_the_mistake` (odds)

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `fix_colours_equal` | pass | 2/2 sections checked, no violations | no (misconception-evidence) | yes | colours-equal |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b11.ts:634 akchance (seed of MATH.probability.chance-language): bugs odds, colours-equal, count-only; figure table

## Uncertainties

- akchance is the seed: worked_steps, scale_words and spot_the_mistake (odds) exist and are REUSED; this package adds colours-equal only.
- CONTRAST GAP: an equal-count two-colour bag (where 1/(number of colours) is RIGHT, so a correct answer there cannot be read as understanding) is served, but not as a typed diagnostic: gen:akchance:8,8,0,0 is served as :mc in the CHECK partition and gen:akchance:6,6,0,0 as :mc in the PRACTICE partition; no equal-count bag is in the diagnostic partition, and gen:akchance:1,1,0,0 (check) is ambiguous (odds and count-only both give 1). Partition change for Codex: 09-MISSING-QUESTIONS-AND-VISUALS.md MQ2. (Corrected: an earlier revision said these bags were in no served partition; that check missed their :mc ids.)
- Family prompt grammar: '1 red and 1 blue marbles' (plural with 1); wording only, recorded in 05.

## Validation: 14/14 items pass; whole-pool oracle + alternatives agreement 317/317
