# TP-PRO-01: Two spinners or dice: totals are not equally likely

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.probability.sample-space` (Enumerate simple sample spaces, grade 8), family `akdice` (Probability from the sample space of two dice or spinners).

**Skill.** Find the probability of a total with two dice/spinners by listing all m × n equally likely pairs.

## Prerequisites

- probability = favourable ÷ total for equally likely outcomes
- listing outcomes systematically
- Graph: MATH.probability.experimental (mandatory)

## Explanation

Each spinner (or die) gives each of its numbers equally often, so every PAIR (first number, second number) is equally likely: m × n pairs.
The totals are not equally likely: a middle total can be made by many pairs, an end total by only one.

Visual: `{"type":"table","head":["","1","2","3"],"rows":[["1","2","3","4"],["2","3","4","5"],["3","4","5","6"]]}`. Reuses the table visual (the family's own method: 'Draw a table'); every cell is one equally likely pair.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:akdice:3,3,0,4`** — Farhan uses two spinners, each numbered 1 to 3. Each gives a number from 1 to 3, every number equally likely. What is the probability that the total of the two numbers is 4? (A fraction is fine.)

1. All pairs: 3 × 3 = 9, equally likely
1. Pairs with total 4: 3
1. P = 3/9 = 1/3

Answer **1/3**. (The family's own step text: There are 3 × 3 = 9 equally likely pairs; 3 pairs fit: the total of the two numbers is 4; Probability = 3 ÷ 9 = 1/3.)

**`gen:akdice:4,5,0,3`** — Anu uses a spinner numbered 1 to 4 and a spinner numbered 1 to 5. The first gives a number from 1 to 4 and the second a number from 1 to 5, every number equally likely. What is the probability that the total of the two numbers is 3? (A fraction is fine.)

1. All pairs: 4 × 5 = 20, equally likely
1. Pairs with total 3: 2
1. P = 2/20 = 1/10

Answer **1/10**. (The family's own step text: There are 4 × 5 = 20 equally likely pairs; 2 pairs fit: the total of the two numbers is 3; Probability = 2 ÷ 20 = 1/10.)

## Hints (graded, per worked example)

For `gen:akdice:3,3,0,4`:

1. Is each TOTAL equally likely, or each PAIR?
2. Draw the table of all pairs.
3. Count the cells with the total you want; divide by all the cells.

For `gen:akdice:4,5,0,3`:

1. Is each TOTAL equally likely, or each PAIR?
2. Draw the table of all pairs.
3. Count the cells with the total you want; divide by all the cells.

## Alternative explanation: Why middle totals are more common

The smallest total can be made in only one way: the smallest number on both spinners.
A total in the middle can be made in several ways, and each way is equally likely, so a middle total is more likely.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Tree diagram**: one branch per first number, then per second number; count the ticked paths → P = 3/9 = 1/3

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract for probability.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:akdice:5,5,0,4`: Meena uses two spinners, each numbered 1 to 5. Each gives a number from 1 to 5, every number equally likely. What is the probability that the total of the two numbers is 4? (A fraction is fine.) | same-size spinners, a total made by several pairs — all three errors give different values: totals-equally-likely 1/(2m−1), added-sides k/(2m), order-ignored (unordered pairs)/m² | 3/25 | 1/9 → TARGET modelled error totals-equally-likely (conceptual): suspected on one answer; 3/10 → TARGET modelled error added-sides (procedural): suspected on one answer; 2/25 → TARGET modelled error order-ignored (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:akdice:4,5,0,7`: Kavya uses a spinner numbered 1 to 4 and a spinner numbered 1 to 5. The first gives a number from 1 to 4 and the second a number from 1 to 5, every number equally likely. What is the probability that the total of the two numbers is 7? (A fraction is fine.) | different-size spinners, a total made by several pairs — order-ignored is not modelled with different sizes; a learner who errs only on the first item points to order, one who errs on both to the totals or the sample-space size | 3/20 | 1/8 → TARGET modelled error totals-equally-likely (conceptual): suspected on one answer; 1/3 → TARGET modelled error added-sides (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `totals-equally-likely` (conceptual) — conceptual: outcomes (totals) taken as equally likely

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Meena uses a spinner numbered 1 to 3 and a spinner numbered 1 to 5. The first gives a number from 1 to 3 and the second a number from 1 to 5, every number equally likely. What is the probability that the total of the two numbers is 6? (A fraction is fine.)", one wrong answer is 1/7.
> The 7 possible totals were taken as equally likely. They are not: list all 15 pairs and count the ones that fit.
> The pairs are equally likely, not the totals: count the pairs that give each total.
> Not 1/7, but 1/5.

Check: total 2 can only be made as 1 + 1, but total 6 can be made in 3 ways: 1 + 5, 2 + 4, 3 + 3. The totals do not all have the same chance.

Solved correctly:

1. All pairs: 3 × 5 = 15, equally likely
1. Pairs with total 6: 3
1. P = 3/15 = 1/5

Example `gen:akdice:3,5,0,6`; guided `gen:akdice:5,5,0,7:mc`; fresh check `gen:akdice:3,5,0,3:mc`.

### `order-ignored` (conceptual) — conceptual: (1,2) and (2,1) counted once

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Karthik uses two ordinary dice. Each gives a number from 1 to 6, every number equally likely. What is the probability that the total of the two numbers is 7? (A fraction is fine.)", one wrong answer is 1/12.
> Pairs such as (1, 3) and (3, 1) were counted once. They are different outcomes: the first and second number are different.
> First 1 then 2 and first 2 then 1 are different pairs: the first and the second spinner (or die) are different objects.
> Not 1/12, but 1/6.

Check: colour the first one red and the second one blue: red 1 with blue 6, and red 6 with blue 1, are two different outcomes.

Solved correctly:

1. All pairs: 6 × 6 = 36, equally likely
1. Pairs with total 7: 6
1. P = 6/36 = 1/6

Example `gen:akdice:6,6,0,7`; guided `gen:akdice:5,5,0,9:mc`; fresh check `gen:akdice:6,6,0,3`.

### `added-sides` (procedural) — procedural: sample space m + n instead of m × n

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Lakshmi uses a spinner numbered 1 to 4 and a spinner numbered 1 to 5. The first gives a number from 1 to 4 and the second a number from 1 to 5, every number equally likely. What is the probability that the total of the two numbers is 2? (A fraction is fine.)", one wrong answer is 1/9.
> The sample space was taken as 4 + 5 = 9 outcomes. Each of the 4 first numbers goes with each of the 5 second numbers: 4 × 5 = 20.
> Each first number goes with EACH second number: m × n pairs, not m + n.
> Not 1/9, but 1/20.

Counter-check: two spinners numbered 1 to 3 give the pairs 11, 12, 13, 21, 22, 23, 31, 32, 33: 9 = 3 × 3 pairs, not 3 + 3 = 6.

Solved correctly:

1. All pairs: 4 × 5 = 20, equally likely
1. Pairs with total 2: 1
1. P = 1/20

Example `gen:akdice:4,5,0,2`; guided `gen:akdice:5,5,0,10`; fresh check `gen:akdice:3,5,0,2`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:akdice:3,3,0,2`, `gen:akdice:3,3,0,3:mc`, `gen:akdice:5,6,0,11:mc`
- Rechecks after teaching: `gen:akdice:4,4,0,6`, `gen:akdice:4,5,0,5`
- Transfer (everyday form): `gen:akdice:4,6,0,8:w`, `gen:akdice:3,4,0,4:w`
- Delayed checks: `gen:akdice:6,6,0,6`, `gen:akdice:4,6,0,3:mc`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Find the probability of a total with two dice/spinners by listing all m × n equally likely pairs.
- **Generator:** `akdice` — akdice with params[2] = 0 ("the total is exactly k"); totals made by at least two pairs for diagnostics, rechecks and delayed checks.
- **Trigger** `akdice_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_totals_equally_likely`: verified-misconception 'totals-equally-likely' (two matching answers, misconception-evidence@1)
- **Trigger** `fix_order_ignored`: verified-misconception 'order-ignored' (two matching answers, misconception-evidence@1)
- **Trigger** `fix_added_sides`: verified-misconception 'added-sides' (two matching answers, misconception-evidence@1)
- **Allowed methods:** the oracle's method (worked lines); Tree diagram
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:akdice:4,4,0,6`, `gen:akdice:4,5,0,5`
- **Retention target:** MATH.probability.sample-space / `akdice`, cases: same-size spinners, a total made by several pairs; different-size spinners, a total made by several pairs. Candidates: `gen:akdice:6,6,0,6`, `gen:akdice:4,6,0,3:mc`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** none

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `akdice_concept` | **not checked**: outside the module's teaching scope (ineligible today) | 4/4 sections checked, no violations | yes | yes | — |
| `fix_totals_equally_likely` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | totals-equally-likely |
| `fix_order_ignored` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | order-ignored |
| `fix_added_sides` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | added-sides |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b11.ts:803 akdice: teach idea/method, alternative tree; bugs totals-equally-likely, added-sides, order-ignored, more-than, equal-included
- library.v1.json MATH.probability.sample-space (seeded from akss; akdice has a chapter screen only)

## Uncertainties

- Only 'total is exactly k' (mode 0) is taught here; 'k or more' (mode 1) and 'second bigger than first' (mode 2) are not.
- The family models order-ignored only for equal-size spinners (fam/b11.ts akdice bugs); that is a modelling choice, not a mathematical fact.

## Validation: 22/22 items pass; whole-pool oracle + alternatives agreement 80/80
