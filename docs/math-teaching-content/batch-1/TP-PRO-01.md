# TP-PRO-01: Two dice: totals are not equally likely

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.probability.sample-space` (Enumerate simple sample spaces, grade 8), family `akdice` (Probability from the sample space of two dice or spinners).

**Skill.** Find the probability of a total with two dice/spinners by listing all m × n equally likely pairs.

## Prerequisites

- probability = favourable ÷ total for equally likely outcomes
- listing outcomes systematically
- Graph: MATH.probability.experimental (mandatory)

## Explanation

Each die gives each number equally often, so every PAIR (first, second) is equally likely: m × n pairs.
The totals are not equally likely: a middle total can be made by many pairs, an end total by only one.

Visual: `{"type":"table","head":["","1","2","3","4","5"],"rows":[["1","2","3","4","5","6"],["2","3","4","5","6","7"],["3","4","5","6","7","8"],["4","5","6","7","8","9"],["5","6","7","8","9","10"]]}`. Reuses the table visual (the family's own method: 'Draw a table'); every cell is one equally likely pair.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:akdice:5,5,0,8`** — Divya uses two spinners, each numbered 1 to 5. Each gives a number from 1 to 5, every number equally likely. What is the probability that the total of the two numbers is 8? (A fraction is fine.)

1. All pairs: 5 × 5 = 25, equally likely
1. Pairs with total 8: 3
1. P = 3/25

Answer **3/25**. (The family's own step text: There are 5 × 5 = 25 equally likely pairs; 3 pairs fit: the total of the two numbers is 8; Probability = 3 ÷ 25 = 3/25.)

**`gen:akdice:4,5,0,3`** — Anu uses a spinner numbered 1 to 4 and a spinner numbered 1 to 5. The first gives a number from 1 to 4 and the second a number from 1 to 5, every number equally likely. What is the probability that the total of the two numbers is 3? (A fraction is fine.)

1. All pairs: 4 × 5 = 20, equally likely
1. Pairs with total 3: 2
1. P = 2/20 = 1/10

Answer **1/10**. (The family's own step text: There are 4 × 5 = 20 equally likely pairs; 2 pairs fit: the total of the two numbers is 3; Probability = 2 ÷ 20 = 1/10.)

## Hints (graded, per worked example)

For `gen:akdice:5,5,0,8`:

1. Is each TOTAL equally likely, or each PAIR?
2. Draw the table of all pairs.
3. Count the cells with the total you want; divide by all the cells.

For `gen:akdice:4,5,0,3`:

1. Is each TOTAL equally likely, or each PAIR?
2. Draw the table of all pairs.
3. Count the cells with the total you want; divide by all the cells.

## Alternative explanation: Why 7 is common with two dice

Total 2 needs (1,1): one way. Total 7 can be (1,6), (2,5), (3,4), (4,3), (5,2), (6,1): six ways.
Each way is equally likely, so 7 is six times as likely as 2.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Tree diagram**: one branch per first number, then per second number; count the ticked paths → P = 3/25

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

Counter-check with two dice: total 2 is only (1,1), total 7 has six pairs; they cannot both be 1/11.

Solved correctly:

1. All pairs: 3 × 5 = 15, equally likely
1. Pairs with total 6: 3
1. P = 3/15 = 1/5

Example `gen:akdice:3,5,0,6`; guided `gen:akdice:5,5,0,7:mc`; fresh check `gen:akdice:4,5,0,5`.

### `order-ignored` (conceptual) — conceptual: (1,2) and (2,1) counted once

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Farhan uses two spinners, each numbered 1 to 3. Each gives a number from 1 to 3, every number equally likely. What is the probability that the total of the two numbers is 4? (A fraction is fine.)", one wrong answer is 2/9.
> Pairs such as (1, 3) and (3, 1) were counted once. They are different outcomes: the first and second number are different.
> (1,2) and (2,1) are different pairs: the first die and the second die are different objects.
> Not 2/9, but 1/3.

Counter-check: colour one die red: red 1 & blue 2 and red 2 & blue 1 are clearly two outcomes.

Solved correctly:

1. All pairs: 3 × 3 = 9, equally likely
1. Pairs with total 4: 3
1. P = 3/9 = 1/3

Example `gen:akdice:3,3,0,4`; guided `gen:akdice:5,5,0,9:mc`; fresh check `gen:akdice:5,5,0,3`.

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

Example `gen:akdice:4,5,0,2`; guided `gen:akdice:5,5,0,10`; fresh check `gen:akdice:4,5,0,4:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:akdice:3,5,0,7:mc`, `gen:akdice:3,5,0,4`, `gen:akdice:3,5,0,5:mc`
- Rechecks after teaching: `gen:akdice:6,6,0,3`, `gen:akdice:3,5,0,3:mc`
- Transfer (everyday form): `gen:akdice:3,3,0,2:w`, `gen:akdice:5,6,0,10:w`
- Delayed checks: `gen:akdice:5,5,0,5`, `gen:akdice:4,5,0,6:mc`

## Integration mapping (proposal for Codex; nothing written)

```json
{
 "strategyProposals": [
  {
   "id": "fix_totals_equally_likely",
   "title": "The pairs are equally likely, not the totals",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:akdice:3,5,0,6"
    },
    {
     "role": "worked-example",
     "instance": "gen:akdice:3,5,0,6"
    },
    {
     "role": "practice",
     "instance": "gen:akdice:5,5,0,7:mc"
    }
   ],
   "guided": "gen:akdice:5,5,0,7:mc",
   "check": "gen:akdice:4,5,0,5"
  },
  {
   "id": "fix_order_ignored",
   "title": "(1,2) and (2,1) are different pairs",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:akdice:3,3,0,4"
    },
    {
     "role": "worked-example",
     "instance": "gen:akdice:3,3,0,4"
    },
    {
     "role": "practice",
     "instance": "gen:akdice:5,5,0,9:mc"
    }
   ],
   "guided": "gen:akdice:5,5,0,9:mc",
   "check": "gen:akdice:5,5,0,3"
  },
  {
   "id": "fix_added_sides",
   "title": "Each first number goes with EACH second number",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:akdice:4,5,0,2"
    },
    {
     "role": "worked-example",
     "instance": "gen:akdice:4,5,0,2"
    },
    {
     "role": "practice",
     "instance": "gen:akdice:5,5,0,10"
    }
   ],
   "guided": "gen:akdice:5,5,0,10",
   "check": "gen:akdice:4,5,0,4:mc"
  }
 ],
 "registryProposal": [
  {
   "competency": "MATH.probability.sample-space",
   "strategy": "fix_totals_equally_likely",
   "misconceptionSpecific": true,
   "addresses": "totals-equally-likely",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  },
  {
   "competency": "MATH.probability.sample-space",
   "strategy": "fix_order_ignored",
   "misconceptionSpecific": true,
   "addresses": "order-ignored",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  },
  {
   "competency": "MATH.probability.sample-space",
   "strategy": "fix_added_sides",
   "misconceptionSpecific": true,
   "addresses": "added-sides",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  }
 ],
 "generalStrategyProposal": {
  "id": "akdice_concept",
  "screens": [
   "concept + visual",
   "worked example(s)",
   "alternative explanation"
  ],
  "note": "for modules where this family has only a chapter screen"
 },
 "target": "module strategies of the competency's served module (content.ts modules) + explanation-review.v1.json entries; NOT written here (Codex owns integration)"
}
```

## Sources

- packages/learning/src/fam/b11.ts:803 akdice: teach idea/method, alternative tree; bugs totals-equally-likely, added-sides, order-ignored, more-than, equal-included
- library.v1.json MATH.probability.sample-space (seeded from akss; akdice has a chapter screen only)

## Uncertainties

- Only 'total is exactly k' (mode 0) is taught here; 'k or more' (mode 1) and 'second bigger than first' (mode 2) are not.
- The family models order-ignored only for equal-size spinners (fam/b11.ts akdice bugs); that is a modelling choice, not a mathematical fact.

## Validation: 22/22 items pass; whole-pool oracle + alternatives agreement 80/80
