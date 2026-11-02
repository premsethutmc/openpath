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

Visual: `{"type":"table","head":["in order"],"rows":[["25"],["27"],["28"],["35"],["40"]]}`. Reuses the table visual to show the ordered list; crossing off from both ends is the family's own cross_off alternative.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:akmed:54,5`** — Find the median of these numbers: 35, 40, 25, 27, 28.

1. In order: 25, 27, 28, 35, 40 (5 values)
1. The middle one is the 3rd value: 28

Answer **28**. (The family's own step text: In order: 25, 27, 28, 35, 40; The middle value is 28.)

**`gen:akmed:33,8`** — Find the median of these numbers: 49, 43, 38, 57, 60, 30, 39, 55.

1. In order: 30, 38, 39, 43, 49, 55, 57, 60 (8 values)
1. The two middle values are the 4th and 5th: 43 and 49; halfway: (43 + 49) ÷ 2 = 46

Answer **46**. (The family's own step text: In order: 30, 38, 39, 43, 49, 55, 57, 60; The two middle values are 43 and 49: (43 + 49) ÷ 2 = 46.)

## Hints (graded, per worked example)

For `gen:akmed:54,5`:

1. Are the numbers in order?
2. Write them from smallest to largest.
3. Find the middle one (or halfway between the two middle ones).

For `gen:akmed:33,8`:

1. Are the numbers in order?
2. Write them from smallest to largest.
3. Find the middle one (or halfway between the two middle ones).

## Alternative explanation: Line up by height

Line the numbers up from smallest to largest, like children by height.
The child in the middle of the line is the median; with two in the middle, take halfway.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Cross off from both ends**: cross off smallest and largest repeatedly; left: 28 → median 28

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

> In "Find the median of these numbers: 75, 14, 80, 65, 66.", one wrong answer is 80.
> The middle number of the list as given was taken. Put the numbers in order first.
> The middle of the list only means something once the list is in order.
> Not 80, but 66.

Counter-check: in the order given the middle is 80; in order it is 66. Reorder the same data and the 'middle' would change, so it cannot be a fact about the data.

Solved correctly:

1. In order: 14, 65, 66, 75, 80 (5 values)
1. The middle one is the 3rd value: 66

Example `gen:akmed:76,5`; guided `gen:akmed:77,9:mc`; fresh check `gen:akmed:77,7:mc`.

### `mean-for-median` (conceptual) — conceptual: averages not distinguished

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Find the median of these numbers: 59, 50, 87, 86, 81.", one wrong answer is 72.6.
> The mean was worked out. The median is the middle value once the numbers are in order.
> The mean shares the total equally; the median is the middle value in order. They are different averages.
> Not 72.6, but 81.

Counter-check: for 1, 2, 30 the mean is 11 but the middle value is 2.

Solved correctly:

1. In order: 50, 59, 81, 86, 87 (5 values)
1. The middle one is the 3rd value: 81

Example `gen:akmed:32,5`; guided `gen:akmed:3,10:mc`; fresh check `gen:akmed:27,5`.

### `one-middle` (procedural) — procedural: even count

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Find the median of these numbers: 27, 83, 21, 62, 73, 63, 34, 52, 80, 90.", one wrong answer is 62 or 63.
> With 10 numbers there are two middle numbers (62 and 63); the median is halfway between them.
> With an even number of values there are two middle values: take halfway between them.
> Not 62 or 63, but 62.5.

Counter-check: for 2, 4, 6, 8 the middle values are 4 and 6; the median is 5.

Solved correctly:

1. In order: 21, 27, 34, 52, 62, 63, 73, 80, 83, 90 (10 values)
1. The two middle values are the 5th and 6th: 62 and 63; halfway: (62 + 63) ÷ 2 = 62.5

Example `gen:akmed:71,10`; guided `gen:akmed:8,6:mc`; fresh check `gen:akmed:33,6`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:akmed:77,5:mc`, `gen:akmed:76,7:mc`, `gen:akmed:13,9`
- Rechecks after teaching: `gen:akmed:0,9`, `gen:akmed:0,8:mc`
- Transfer (everyday form): `gen:akmed:32,6:w`, `gen:akmed:76,9:w`
- Delayed checks: `gen:akmed:8,7`, `gen:akmed:24,10`

## Integration mapping (proposal for Codex; nothing written)

```json
{
 "strategyProposals": [
  {
   "id": "fix_not_ordered",
   "title": "The middle of the list only means something once the list is",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:akmed:76,5"
    },
    {
     "role": "worked-example",
     "instance": "gen:akmed:76,5"
    },
    {
     "role": "practice",
     "instance": "gen:akmed:77,9:mc"
    }
   ],
   "guided": "gen:akmed:77,9:mc",
   "check": "gen:akmed:77,7:mc"
  },
  {
   "id": "fix_mean_for_median",
   "title": "The mean shares the total equally; the median is the middle ",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:akmed:32,5"
    },
    {
     "role": "worked-example",
     "instance": "gen:akmed:32,5"
    },
    {
     "role": "practice",
     "instance": "gen:akmed:3,10:mc"
    }
   ],
   "guided": "gen:akmed:3,10:mc",
   "check": "gen:akmed:27,5"
  },
  {
   "id": "fix_one_middle",
   "title": "With an even number of values there are two middle values",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:akmed:71,10"
    },
    {
     "role": "worked-example",
     "instance": "gen:akmed:71,10"
    },
    {
     "role": "practice",
     "instance": "gen:akmed:8,6:mc"
    }
   ],
   "guided": "gen:akmed:8,6:mc",
   "check": "gen:akmed:33,6"
  }
 ],
 "registryProposal": [
  {
   "competency": "MATH.statistics.median-mode",
   "strategy": "fix_not_ordered",
   "misconceptionSpecific": true,
   "addresses": "not-ordered",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  },
  {
   "competency": "MATH.statistics.median-mode",
   "strategy": "fix_mean_for_median",
   "misconceptionSpecific": true,
   "addresses": "mean-for-median",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  },
  {
   "competency": "MATH.statistics.median-mode",
   "strategy": "fix_one_middle",
   "misconceptionSpecific": true,
   "addresses": "one-middle",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  }
 ],
 "generalStrategyProposal": {
  "id": "akmed_concept",
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

- packages/learning/src/fam/b11.ts:1729 akmed: teach idea/method, alternative cross_off; bugs not-ordered, mean-for-median, one-middle
- library.v1.json MATH.statistics.median-mode (seeded from akmed: this is the seed family; spot_the_mistake addresses one bug only)

## Uncertainties

- 'not-ordered' is procedural: under misconception-evidence@1 a single match is a suspected error; only two matching answers establish it.

## Validation: 22/22 items pass; whole-pool oracle + alternatives agreement 400/400
