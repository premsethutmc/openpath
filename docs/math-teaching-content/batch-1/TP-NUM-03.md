# TP-NUM-03: Comparing decimals: place value, not length

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.number.decimal-tenths` (Represent tenths and hundredths, grade 4), family `aedecc` (Comparing a tenths decimal with a hundredths decimal).

**Skill.** Compare a tenths decimal with a hundredths decimal by place value.

## Prerequisites

- tenths and hundredths place value
- 0.7 = 0.70 (seven tenths = seventy hundredths)
- Graph: MATH.number.fraction-add-like (mandatory)

## Explanation

Decimals are compared place by place from the left: wholes, then tenths, then hundredths.
Writing both with the same number of places makes them easy to compare: 0.7 = 0.70, which is more than 0.65.

Visual: `{"type":"grid","rows":10,"cols":10,"shaded":1,"note":"hundred grid: one shaded square = 0.01; a full column = 0.1"}`. Reuses the hundred grid ({type:'grid', rows:10, cols:10, shaded:k}) of the decimal-tenths module's hundred_grid strategy; shade each number on its own grid.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:aedecc:0,5,0,1`** — Which number is greater: 0.01 or 0.5? Write the greater number.

1. Write both with two decimal places: 0.01 and 0.50
1. 0.01 is 1 hundredth; 0.50 is 50 hundredths. So 0.5 is greater

Answer **0.5**. (The family's own step text: Compare the tenths: 5 and 0. The greater number is 0.5.)

**`gen:aedecc:3,1,4,2`** — Which number is greater: 3.1 or 3.42? Write the greater number.

1. Write both with two decimal places: 3.10 and 3.42
1. 3.10 is 310 hundredths; 3.42 is 342 hundredths. So 3.42 is greater

Answer **3.42**. (The family's own step text: Compare the tenths: 1 and 4. The greater number is 3.42.)

## Hints (graded, per worked example)

For `gen:aedecc:0,5,0,1`:

1. Compare the tenths digits first.
2. Write both with two places: 0.01 and 0.50.
3. Compare 1 hundredth with 50 hundredths.

For `gen:aedecc:3,1,4,2`:

1. Compare the tenths digits first.
2. Write both with two places: 3.10 and 3.42.
3. Compare 310 hundredths with 342 hundredths.

## Alternative explanation: Number line in tenths

Mark 0, 0.1, 0.2, … 1 on a line.
Find which tenth each number is in first; only if they are in the same tenth do the hundredths decide.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Money (paise)**: ₹0.01 is 1 paisa; ₹0.50 is 50 paise → 50 paise is more, so 0.5 is greater

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: comparison answers have no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:aedecc:2,8,1,3`: Which number is greater: 2.13 or 2.8? Write the greater number. | tenths decimal is greater — longer-is-larger picks the hundredths number | 2.8 | 2.13 → TARGET modelled error longer-is-larger (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:aedecc:1,4,8,7`: Which number is greater: 1.4 or 1.87? Write the greater number. | hundredths decimal is greater — the opposite belief (shorter is larger, from 'tenths are bigger than hundredths') errs here instead | 1.87 | 1.4 → TARGET modelled error shorter-is-larger (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `longer-is-larger` (conceptual) — digits after the point read as a whole number

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Which number is greater: 2.2 or 2.01? Write the greater number.", one wrong answer is 2.01.
> 2.01 was taken as greater because it has more digits after the point. Compare the tenths first.
> More digits after the point does not mean bigger: compare the tenths first.
> Not 2.01, but 2.2.

Counter-check: 0.5 is half; 0.45 is less than half (45 of 100). So 0.5 > 0.45 although 0.45 has more digits.

Solved correctly:

1. Write both with two decimal places: 2.20 and 2.01
1. 2.20 is 220 hundredths; 2.01 is 201 hundredths. So 2.2 is greater

Example `gen:aedecc:2,2,0,1`; guided `gen:aedecc:3,6,1,5`; fresh check `gen:aedecc:1,7,6,4`.

### `shorter-is-larger` (conceptual) — over-generalised 'tenths beat hundredths'

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Which number is greater: 1.77 or 1.2? Write the greater number.", one wrong answer is 1.2.
> 1.2 was taken as greater because hundredths are small pieces; but 1.77 has more tenths (7 against 2).
> A tenths number is not always bigger than a hundredths number: compare the tenths digits.
> Not 1.2, but 1.77.

Counter-check: 0.91 is 9 tenths and 1 hundredth; 0.1 is only 1 tenth. 0.91 > 0.1.

Solved correctly:

1. Write both with two decimal places: 1.77 and 1.20
1. 1.77 is 177 hundredths; 1.20 is 120 hundredths. So 1.77 is greater

Example `gen:aedecc:1,2,7,7`; guided `gen:aedecc:3,3,8,1`; fresh check `gen:aedecc:1,1,2,9`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:aedecc:0,6,8,7`, `gen:aedecc:1,3,4,8`, `gen:aedecc:2,1,7,9`
- Rechecks after teaching: `gen:aedecc:3,4,3,8`, `gen:aedecc:2,6,7,7`
- Transfer (everyday form): `gen:aedecc:0,7,4,9:w`, `gen:aedecc:0,9,7,9:w`
- Delayed checks: `gen:aedecc:0,8,7,4`, `gen:aedecc:2,7,8,8`

## Integration mapping (proposal for Codex; nothing written)

```json
{
 "strategyProposals": [
  {
   "id": "fix_longer_is_larger",
   "title": "More digits after the point does not mean bigger",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:aedecc:2,2,0,1"
    },
    {
     "role": "worked-example",
     "instance": "gen:aedecc:2,2,0,1"
    },
    {
     "role": "practice",
     "instance": "gen:aedecc:3,6,1,5"
    }
   ],
   "guided": "gen:aedecc:3,6,1,5",
   "check": "gen:aedecc:1,7,6,4"
  },
  {
   "id": "fix_shorter_is_larger",
   "title": "A tenths number is not always bigger than a hundredths numbe",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:aedecc:1,2,7,7"
    },
    {
     "role": "worked-example",
     "instance": "gen:aedecc:1,2,7,7"
    },
    {
     "role": "practice",
     "instance": "gen:aedecc:3,3,8,1"
    }
   ],
   "guided": "gen:aedecc:3,3,8,1",
   "check": "gen:aedecc:1,1,2,9"
  }
 ],
 "registryProposal": [
  {
   "competency": "MATH.number.decimal-tenths",
   "strategy": "fix_longer_is_larger",
   "misconceptionSpecific": true,
   "addresses": "longer-is-larger",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  },
  {
   "competency": "MATH.number.decimal-tenths",
   "strategy": "fix_shorter_is_larger",
   "misconceptionSpecific": true,
   "addresses": "shorter-is-larger",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  }
 ],
 "generalStrategyProposal": {
  "id": "aedecc_concept",
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

- packages/learning/src/fam/b05.ts:1301 aedecc: teach idea/method, alternative money; bugs longer-is-larger, shorter-is-larger
- library.v1.json MATH.number.decimal-tenths (seeded from aedec; aedecc has only a chapter screen; spot_the_mistake addresses one aedec bug)

## Uncertainties

- aedecc has no figure; the hundred grid is a proposal reusing an existing visual.
- CONTENT DEFECT (existing family text, fam/b05.ts aedecc bugs, longer-is-larger 'says'): it claims the hundredths digits 'uv' are more than the tenths digit t; this is false whenever uv ≤ t (e.g. '03 is more than 5'). The package replaces that sentence for its own screens; the family text itself is not changed here.
- The competency is 'Represent tenths'; comparison sits inside it (the family is one of its five).

## Validation: 19/19 items pass; whole-pool oracle + alternatives agreement 300/300
