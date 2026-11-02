# TP-MEA-01: Area or perimeter? Covering versus going round

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.measurement.area-squares` (Measure area in square units, grade 4), family `aeperar` (Choosing area or perimeter in a problem).

**Skill.** Decide whether a rectangle problem asks for area (covering) or perimeter (going round), then compute it.

## Prerequisites

- area of a rectangle as rows × squares in a row
- perimeter as the total length of all sides
- Graph: none recorded

## Explanation

Area is the space inside: how many unit squares cover the shape. For a rectangle, rows × squares in each row = length × width.
Perimeter is the distance round the edge: add all four sides, length + width + length + width.

Visual: `{"type":"grid","rows":9,"cols":11,"shaded":99,"note":"every square inside is shaded: covering"}`. Reuses the grid of squares (aearea / rows_of_squares); perimeter needs the outline emphasised, which the grid visual cannot do (visual gap).

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:aeperar:0,9,11,0`** — A rectangular floor is 11 m long and 9 m wide. How many square tiles of side 1 m are needed to cover the floor?

1. Covering the inside: area
1. 9 rows of 11 squares = 11 × 9 = 99

Answer **99**. (The family's own step text: Covering needs the area: 9 rows of 11 squares = 99.)

**`gen:aeperar:1,9,10,1`** — A rectangular card is 10 cm long and 9 cm wide. How many centimetres of lace are needed to go once round the edge of the card?

1. Going once round the edge: perimeter
1. 10 + 9 + 10 + 9 = 38

Answer **38**. (The family's own step text: Going round needs the perimeter: 10 + 9 + 10 + 9 = 38.)

## Hints (graded, per worked example)

For `gen:aeperar:0,9,11,0`:

1. Is something covering the inside, or going round the edge?
2. Covering: count the squares inside, rows × squares in a row.
3. Multiply length by width.

For `gen:aeperar:1,9,10,1`:

1. Is something covering the inside, or going round the edge?
2. Going round: add all four sides.
3. Add length + width + length + width.

## Alternative explanation: Act it out

Tiling a floor: you lay squares all over it (area).
Fencing a garden: you walk round the edge (perimeter).

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Another way to compute it (perimeter: 2 × (length + width); area: add the rows)**: area, row by row: 11 + 11 + 11 + 11 + 11 + 11 + 11 + 11 + 11 = 99

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A 'two-sides' answer (length + width) on the covering item and on the going-round item counts as two different errors (adding instead of multiplying; adding only half the sides), so the pair must not establish one misconception. A learner who multiplies on both items is right on the covering item and is suspected of area-for-perimeter only; one who adds all four sides on both is suspected of perimeter-for-area only.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:aeperar:0,3,15,2`: A rectangular stage is 15 m long and 3 m wide. How many square mats of side 1 m are needed to cover the stage? | covering (area) — perimeter-for-area gives 2(l+w) | 45 | 36 → TARGET modelled error perimeter-for-area (conceptual): suspected on one answer; 18 → TARGET modelled error two-sides (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:aeperar:1,4,11,2`: A rectangular playground is 11 m long and 4 m wide. How many metres of rope are needed to go once round the playground? | going round (perimeter) — area-for-perimeter gives l×w; a learner who always multiplies is right on the first item only | 30 | 44 → TARGET modelled error area-for-perimeter (conceptual): suspected on one answer; 15 → TARGET modelled error two-sides (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `perimeter-for-area` (conceptual) — conceptual: area and perimeter not distinguished

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "A rectangular card is 9 cm long and 6 cm wide. How many 1 cm squares of coloured paper are needed to cover the card?", one wrong answer is 30.
> The perimeter was found, but covering the inside needs the area (how many squares fit inside).
> Covering needs the squares INSIDE, not the length of the edge.
> Not 30, but 54.

Counter-check: draw 6 rows of 9 squares: there are 54 squares, not 30.

Solved correctly:

1. Covering the inside: area
1. 6 rows of 9 squares = 9 × 6 = 54

Example `gen:aeperar:0,6,9,1`; guided `gen:aeperar:0,12,16,2:mc`; fresh check `gen:aeperar:0,2,11,2`.

### `area-for-perimeter` (conceptual) — conceptual, the reverse

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "A rectangular playground is 15 m long and 8 m wide. How many metres of rope are needed to go once round the playground?", one wrong answer is 120.
> The area was found, but going round the edge needs the perimeter (the length all the way round).
> Going round needs the length of the EDGE, not the squares inside.
> Not 120, but 46.

Counter-check: walk round: 15 + 8 + 15 + 8 = 46, not 120.

Solved correctly:

1. Going once round the edge: perimeter
1. 15 + 8 + 15 + 8 = 46

Example `gen:aeperar:1,8,15,2`; guided `gen:aeperar:1,14,15,2`; fresh check `gen:aeperar:1,13,14,1`.

### `two-sides` (procedural) — procedural: added one length and one width

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "A rectangular card is 12 cm long and 2 cm wide. How many centimetres of lace are needed to go once round the edge of the card?", one wrong answer is 14.
> Only one length and one width were added (2 + 12). Going round passes all four sides.
> Going round a rectangle passes all FOUR sides: two lengths and two widths.
> Not 14, but 28.

Counter-check: 12 + 2 = 14 is only half the way round.

Solved correctly:

1. Going once round the edge: perimeter
1. 12 + 2 + 12 + 2 = 28

Example `gen:aeperar:1,2,12,1`; guided `gen:aeperar:1,5,7,1:mc`; fresh check `gen:aeperar:1,4,6,2:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:aeperar:0,6,14,2`, `gen:aeperar:0,5,6,0:mc`, `gen:aeperar:0,7,12,2:mc`
- Rechecks after teaching: `gen:aeperar:0,11,15,1:mc`, `gen:aeperar:1,10,13,1`
- Transfer (everyday form): `gen:aeperar:0,6,7,1:w`, `gen:aeperar:0,8,14,1:w`
- Delayed checks: `gen:aeperar:0,4,5,1:mc`, `gen:aeperar:1,10,16,0`

## Integration mapping (proposal for Codex; nothing written)

```json
{
 "strategyProposals": [
  {
   "id": "fix_perimeter_for_area",
   "title": "Covering needs the squares INSIDE, not the length of the edg",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:aeperar:0,6,9,1"
    },
    {
     "role": "worked-example",
     "instance": "gen:aeperar:0,6,9,1"
    },
    {
     "role": "practice",
     "instance": "gen:aeperar:0,12,16,2:mc"
    }
   ],
   "guided": "gen:aeperar:0,12,16,2:mc",
   "check": "gen:aeperar:0,2,11,2"
  },
  {
   "id": "fix_area_for_perimeter",
   "title": "Going round needs the length of the EDGE, not the squares in",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:aeperar:1,8,15,2"
    },
    {
     "role": "worked-example",
     "instance": "gen:aeperar:1,8,15,2"
    },
    {
     "role": "practice",
     "instance": "gen:aeperar:1,14,15,2"
    }
   ],
   "guided": "gen:aeperar:1,14,15,2",
   "check": "gen:aeperar:1,13,14,1"
  },
  {
   "id": "fix_two_sides",
   "title": "Going round a rectangle passes all FOUR sides",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:aeperar:1,2,12,1"
    },
    {
     "role": "worked-example",
     "instance": "gen:aeperar:1,2,12,1"
    },
    {
     "role": "practice",
     "instance": "gen:aeperar:1,5,7,1:mc"
    }
   ],
   "guided": "gen:aeperar:1,5,7,1:mc",
   "check": "gen:aeperar:1,4,6,2:mc"
  }
 ],
 "registryProposal": [
  {
   "competency": "MATH.measurement.area-squares",
   "strategy": "fix_perimeter_for_area",
   "misconceptionSpecific": true,
   "addresses": "perimeter-for-area",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  },
  {
   "competency": "MATH.measurement.area-squares",
   "strategy": "fix_area_for_perimeter",
   "misconceptionSpecific": true,
   "addresses": "area-for-perimeter",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  },
  {
   "competency": "MATH.measurement.area-squares",
   "strategy": "fix_two_sides",
   "misconceptionSpecific": true,
   "addresses": "two-sides",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  }
 ],
 "generalStrategyProposal": {
  "id": "aeperar_concept",
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

- packages/learning/src/fam/b05.ts:861 aeperar: teach idea/method, alternative act_it; bugs perimeter-for-area, area-for-perimeter, two-sides
- library.v1.json MATH.measurement.area-squares (seeded from aearea; aeperar has a chapter screen only)

## Uncertainties

- The oracle decides area vs perimeter from the words 'cover'/'round'; every pool prompt was checked (see validation) but a new context word would need review.

## Validation: 22/22 items pass; whole-pool oracle + alternatives agreement 400/400
