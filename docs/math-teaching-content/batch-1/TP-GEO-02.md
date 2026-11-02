# TP-GEO-02: Vertically opposite angles are equal

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.geometry.angle-pairs` (Use linear pairs, vertically opposite, complementary and supplementary angles, grades 5–7), family `afcross` (Angles where two straight lines cross).

**Skill.** At two crossing lines: vertically opposite angles are equal; adjacent angles make 180°; all four make 360°.

## Prerequisites

- angles on a straight line add to 180°
- a full turn is 360°
- Graph: MATH.geometry.angle-measure (plausible), MATH.geometry.lines-segments (support), MATH.geometry.parallel-angles (support)

## Explanation

Where two straight lines cross, angles next to each other lie on a straight line, so they add to 180°.
Go round: x, then 180° − x, then 180° − (180° − x) = x again. So opposite angles are equal, and all four add to 360°.

Visual: `{"type":"angle","deg":128,"note":"reuses go_round; a full crossing-lines figure is not in the Visual union"}`. Reuses the family's own go_round visual ({type:'angle', deg}); a two-line crossing figure is a MISSING VISUAL CAPABILITY.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:afcross:128,0`** — Two straight lines cross each other, making four angles. One of the angles is 128°. What is the angle opposite it (vertically opposite), in degrees?

1. next angle round = 180° − 128° = 52° (straight line)
1. the one after = 180° − 52° = 128° (straight line): the opposite angle is 128°

Answer **128**. (The family's own step text: Vertically opposite angles are equal: 128°.)

**`gen:afcross:149,1`** — Two straight lines cross each other, making four angles. One of the angles is 149°. What is an angle next to it (they form a straight line together), in degrees?

1. adjacent angles lie on a straight line: 180° − 149° = 31°

Answer **31**. (The family's own step text: Angles on a straight line add to 180°: 180° − 149° = 31°.)

## Hints (graded, per worked example)

For `gen:afcross:128,0`:

1. Which angles lie on the same straight line?
2. Angles next to each other make 180°.
3. Go round twice: 180° − (180° − x) is back to x.

For `gen:afcross:149,1`:

1. Which angles lie on the same straight line?
2. Angles next to each other make 180°.
3. 180° minus the angle you know.

## Alternative explanation: Two crossed pencils

Hold two straight pencils crossed like an X.
Open them wider: the top and bottom angles grow together while the two side angles shrink together. Opposite angles stay equal.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Full turn**: each angle next to 128° is 180° − 128° = 52° (straight line) → all four make 360°: opposite angle = 360° − 128° − 2 × 52° = 128°

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: afcross modes 0/1 have a geometry task (foundation adapter); mode 2 (other three) has none (geometry-task.ts excludes b === 2). G5 R06: a vertically-opposite citation for a MEASURE was rejected by the reasoner; route through straight-line steps is supported.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:afcross:105,0`: Two straight lines cross each other, making four angles. One of the angles is 105°. What is the angle opposite it (vertically opposite), in degrees? | vertically opposite — opposite-as-linear gives 180 − x | 105 | 75 → TARGET modelled error opposite-as-linear (conceptual): suspected on one answer; 255 → other modelled error full-turn (recall): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:afcross:126,1`: Two straight lines cross each other, making four angles. One of the angles is 126°. What is an angle next to it (they form a straight line together), in degrees? | adjacent — neighbour-equal gives x; a learner with the swapped rule errs on both items in mirror image | 54 | 126 → TARGET modelled error neighbour-equal (conceptual): suspected on one answer; 234 → other modelled error full-turn (recall): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:afcross:84,2`: Two straight lines cross each other, making four angles. One of the angles is 84°. What do the other three angles add up to, in degrees? | other three — straight-only / all-equal separate a full-turn gap from the opposite/adjacent confusion | 276 | 96 → other modelled error straight-only (procedural): suspected on one answer; 252 → other modelled error all-equal (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `opposite-as-linear` (conceptual) — vertically opposite taken as a linear pair

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Two straight lines cross each other, making four angles. One of the angles is 104°. What is the angle opposite it (vertically opposite), in degrees?", one wrong answer is 76.
> Vertically opposite angles were taken as a pair on a straight line. They are not on one straight line together; they are equal.
> Opposite angles do not lie together on one straight line, so they need not add to 180°: they are equal. Angles next to each other make 180°.
> Not 76, but 104.

Counter-check: going round the crossing, each angle makes 180° with the next one: 104°, then 76°, then 104° again. The angle opposite 104° is the third one round, so it is 104°, not 76°.

Solved correctly:

1. next angle round = 180° − 104° = 76° (straight line)
1. the one after = 180° − 76° = 104° (straight line): the opposite angle is 104°

Example `gen:afcross:104,0`; guided `gen:afcross:109,0:mc`; fresh check `gen:afcross:70,0`.

### `neighbour-equal` (conceptual) — adjacent taken as equal

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Two straight lines cross each other, making four angles. One of the angles is 147°. What is an angle next to it (they form a straight line together), in degrees?", one wrong answer is 147.
> Angles next to each other are not equal (unless both are 90°); together they make a straight line, 180°.
> Angles next to each other lie on a straight line: they add to 180°. They are equal only when both are 90°.
> Not 147, but 33.

Check: the two angles together fill one side of a straight line, which is 180°. 147° + 147° = 294° is more than a straight line.

Solved correctly:

1. adjacent angles lie on a straight line: 180° − 147° = 33°

Example `gen:afcross:147,1`; guided `gen:afcross:27,1:mc`; fresh check `gen:afcross:146,1:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:afcross:29,0:mc`, `gen:afcross:107,1:mc`, `gen:afcross:152,0:mc`
- Rechecks after teaching: `gen:afcross:158,0:mc`, `gen:afcross:40,1:mc`
- Transfer (everyday form): `gen:afcross:35,0:w`, `gen:afcross:81,0:w`
- Delayed checks: `gen:afcross:42,0`, `gen:afcross:37,1`

## Integration mapping (proposal for Codex; nothing written)

```json
{
 "strategyProposals": [
  {
   "id": "fix_opposite_as_linear",
   "title": "Opposite angles do not lie together on one straight line, so",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:afcross:104,0"
    },
    {
     "role": "worked-example",
     "instance": "gen:afcross:104,0"
    },
    {
     "role": "practice",
     "instance": "gen:afcross:109,0:mc"
    }
   ],
   "guided": "gen:afcross:109,0:mc",
   "check": "gen:afcross:70,0"
  },
  {
   "id": "fix_neighbour_equal",
   "title": "Angles next to each other lie on a straight line",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:afcross:147,1"
    },
    {
     "role": "worked-example",
     "instance": "gen:afcross:147,1"
    },
    {
     "role": "practice",
     "instance": "gen:afcross:27,1:mc"
    }
   ],
   "guided": "gen:afcross:27,1:mc",
   "check": "gen:afcross:146,1:mc"
  }
 ],
 "registryProposal": [
  {
   "competency": "MATH.geometry.angle-pairs",
   "strategy": "fix_opposite_as_linear",
   "misconceptionSpecific": true,
   "addresses": "opposite-as-linear",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  },
  {
   "competency": "MATH.geometry.angle-pairs",
   "strategy": "fix_neighbour_equal",
   "misconceptionSpecific": true,
   "addresses": "neighbour-equal",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  }
 ],
 "generalStrategyProposal": {
  "id": "afcross_concept",
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

- packages/learning/src/fam/b06.ts:1266 afcross: teach idea/method, go_round; bugs opposite-as-linear, full-turn, neighbour-equal, straight-only, all-equal
- docs/geometry-cross-domain-validation (G5) G-06

## Uncertainties

- The 'adjacent' full-turn route uses the opposite-angle fact; it is valid but not independent of it.

## Validation: 20/20 items pass; whole-pool oracle + alternatives agreement 300/300
