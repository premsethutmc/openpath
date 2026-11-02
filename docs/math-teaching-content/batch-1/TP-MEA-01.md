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

- **Perimeter as twice (length + width); area row by row**: area, row by row: 11 + 11 + 11 + 11 + 11 + 11 + 11 + 11 + 11 = 99

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A 'two-sides' answer (length + width) on the covering item and on the going-round item counts as two different errors (adding instead of multiplying; adding only half the sides), so the pair must not establish one misconception. A learner who multiplies on both items is right on the covering item and is suspected of area-for-perimeter only; one who adds all four sides on both is suspected of perimeter-for-area only.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:aeperar:0,3,15,2`: A rectangular stage is 15 m long and 3 m wide. How many square mats of side 1 m are needed to cover the stage? | covering (area), first context — perimeter-for-area gives 2(l+w); two-sides gives l+w | 45 | 36 → TARGET modelled error perimeter-for-area (conceptual): suspected on one answer; 18 → TARGET modelled error two-sides (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:aeperar:1,4,11,2`: A rectangular playground is 11 m long and 4 m wide. How many metres of rope are needed to go once round the playground? | going round (perimeter), first context — area-for-perimeter gives l×w; a learner who always multiplies is right on the covering item only | 30 | 44 → TARGET modelled error area-for-perimeter (conceptual): suspected on one answer; 15 → TARGET modelled error two-sides (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:aeperar:0,4,16,0`: A rectangular floor is 16 m long and 4 m wide. How many square tiles of side 1 m are needed to cover the floor? | covering (area), another context — a second covering item, so one answer is not taken as a pattern | 64 | 40 → TARGET modelled error perimeter-for-area (conceptual): suspected on one answer; 20 → TARGET modelled error two-sides (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:aeperar:1,5,7,2`: A rectangular playground is 7 m long and 5 m wide. How many metres of rope are needed to go once round the playground? | going round (perimeter), another context — a second going-round item | 24 | 35 → TARGET modelled error area-for-perimeter (conceptual): suspected on one answer; 12 → TARGET modelled error two-sides (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

### What each response pattern supports

| Answers on the diagnostic items (in order) | Supports | Leaves uncertain | Establishes? |
|---|---|---|---|
| 36 (bug:perimeter-for-area); 30 (correct); 40 (bug:perimeter-for-area); 24 (correct) | perimeter-for-area: the boundary is computed when the inside is asked, while perimeter itself is done correctly | whether the area idea (squares inside) is missing or only the word 'cover' is misread; the concept strategy first, then fix_perimeter_for_area | yes |
| 45 (correct); 44 (bug:area-for-perimeter); 64 (correct); 35 (bug:area-for-perimeter) | area-for-perimeter: multiplies whenever two lengths are given | a 'multiply the two numbers' habit and the misconception give the same answers; both are treated by the same fix | yes |
| 36 (bug:perimeter-for-area); 44 (bug:area-for-perimeter); 40 (bug:perimeter-for-area); 35 (bug:area-for-perimeter) | the two words are consistently swapped | a vocabulary swap (which word means which), not missing concepts: both computations are done correctly. Teach the meanings (act_it), not the formulas; do NOT establish either single misconception | **no** |
| 45 (correct); 15 (bug:two-sides); 64 (correct); 12 (bug:two-sides) | two-sides on going-round items only: half the boundary (one length and one width) is taken as the whole way round, while covering is right | no competing explanation gives both: 'adding the given numbers' as a general habit would also fail the covering items | yes |
| 18 (bug:two-sides); 15 (bug:two-sides); 20 (bug:two-sides); 12 (bug:two-sides) | adds the two given numbers whatever is asked | two different errors (adding instead of multiplying; half the sides) or no model of the situation at all; general teaching, no misconception established | **no** |
| 36 (bug:perimeter-for-area); 30 (correct); 64 (correct); 24 (correct) | one matching answer: suspected only | a slip or the misconception | **no** |

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

Example `gen:aeperar:1,2,12,1`; guided `gen:aeperar:1,10,16,1:mc`; fresh check `gen:aeperar:1,4,6,2:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:aeperar:0,6,14,2`, `gen:aeperar:0,5,6,0:mc`, `gen:aeperar:0,7,12,2:mc`
- Rechecks after teaching: `gen:aeperar:0,11,15,1:mc`, `gen:aeperar:1,10,13,1`
- Transfer (everyday form): `gen:aeperar:0,6,7,1:w`, `gen:aeperar:0,8,14,1:w`
- Delayed checks: `gen:aeperar:0,4,5,1:mc`, `gen:aeperar:1,7,16,0`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Decide whether a rectangle problem asks for area (covering) or perimeter (going round), then compute it.
- **Generator:** `aeperar` — aeperar, both forms: params[0] = 0 (covering: area) and 1 (going round: perimeter); items where 2(l + w) = l × w are excluded (they cannot separate the two).
- **Trigger** `aeperar_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_perimeter_for_area`: verified-misconception 'perimeter-for-area' (two matching answers, misconception-evidence@1) AND a response pattern below with establishes = true; patterns with competing explanations must not establish it
- **Trigger** `fix_area_for_perimeter`: verified-misconception 'area-for-perimeter' (two matching answers, misconception-evidence@1) AND a response pattern below with establishes = true; patterns with competing explanations must not establish it
- **Trigger** `fix_two_sides`: verified-misconception 'two-sides' (two matching answers, misconception-evidence@1) AND a response pattern below with establishes = true; patterns with competing explanations must not establish it
- **Allowed methods:** the oracle's method (worked lines); Perimeter as twice (length + width); area row by row
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:aeperar:0,11,15,1:mc`, `gen:aeperar:1,10,13,1`
- **Retention target:** MATH.measurement.area-squares / `aeperar`, cases: covering (area), first context; going round (perimeter), first context. Candidates: `gen:aeperar:0,4,5,1:mc`, `gen:aeperar:1,7,16,0`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** none

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `aeperar_concept` | **not checked**: outside the module's teaching scope (ineligible today) | 4/4 sections checked, no violations | yes | yes | — |
| `fix_perimeter_for_area` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | perimeter-for-area |
| `fix_area_for_perimeter` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | area-for-perimeter |
| `fix_two_sides` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | two-sides |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b05.ts:861 aeperar: teach idea/method, alternative act_it; bugs perimeter-for-area, area-for-perimeter, two-sides
- library.v1.json MATH.measurement.area-squares (seeded from aearea; aeperar has a chapter screen only)

## Uncertainties

- The oracle decides area vs perimeter from the words 'cover'/'round'; every pool prompt was checked (see validation) but a new context word would need review.

## Validation: 24/24 items pass; whole-pool oracle + alternatives agreement 400/400
