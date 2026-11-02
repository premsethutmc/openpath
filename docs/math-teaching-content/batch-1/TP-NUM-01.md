# TP-NUM-01: Comparing fractions with the same top number

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.number.fraction-comparison` (Compare fractions with like denominators, grade 3), family `adfcmp` (Comparing two fractions with the same bottom or top number).

**Skill.** Compare two fractions with the same numerator: more equal parts in the whole means each part is smaller.

## Prerequisites

- a fraction a/b means a of b equal parts of one whole
- the parts must be equal and of the same whole
- Graph: MATH.number.fraction-models (mandatory)

## Explanation

The bottom number says how many equal parts the whole is cut into. Cutting the same whole into more parts makes each part smaller.
So with the same top number (the same number of parts), the fraction with the smaller bottom number is greater.

Visual: `[{"type":"grid","rows":1,"cols":9,"shaded":1,"note":"1/9: the same whole cut into 9 equal parts"},{"type":"grid","rows":1,"cols":11,"shaded":1,"note":"1/11: the same whole cut into 11 equal parts"}]`. Reuses the family's own grid strip (adfcmp draw_both: {type:'grid', rows:1, cols:b, shaded:a}) once per fraction; the two strips must be drawn the SAME length. The existing Visual union has no two-strip comparison; draw two grid strips.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:adfcmp:1,1,9,11,0`** — Which fraction is greater: 1/9 or 1/11? Write that fraction.

1. Both fractions have 1 part. In 1/9 the whole is cut into 9 equal parts; in 1/11 into 11.
1. Cutting the same whole into fewer parts makes each part bigger, so 1/9 is greater.
1. The greater fraction is 1/9.

Answer **1/9**. (The family's own step text: Both have the same number of parts on top. The bottom number tells how many equal parts the whole is cut into: more parts are smaller parts. So 1/9 and 1/11 compare the other way to their bottom numbers..)

**`gen:adfcmp:1,1,3,9,1`** — Which fraction is smaller: 1/3 (one-third) or 1/9? Write that fraction.

1. Both fractions have 1 part. In 1/3 the whole is cut into 3 equal parts; in 1/9 into 9.
1. Cutting the same whole into fewer parts makes each part bigger, so 1/3 is greater.
1. The smaller fraction is 1/9.

Answer **1/9**. (The family's own step text: Both have the same number of parts on top. The bottom number tells how many equal parts the whole is cut into: more parts are smaller parts. So 1/3 and 1/9 compare the other way to their bottom numbers..)

## Hints (graded, per worked example)

For `gen:adfcmp:1,1,9,11,0`:

1. Is the top number or the bottom number the same?
2. Both are 1 part(s). Which whole is cut into bigger parts: 9 parts or 11 parts?
3. A whole cut into 9 parts has the bigger parts, so 1/9 is greater.

For `gen:adfcmp:1,1,3,9,1`:

1. Is the top number or the bottom number the same?
2. Both are 1 part(s). Which whole is cut into bigger parts: 3 parts or 9 parts?
3. A whole cut into 3 parts has the bigger parts, so 1/3 is greater.

## Alternative explanation: Sharing a roti

One roti shared by 3 children, another identical roti shared by 8.
Each of the 8 gets less: 1/8 is less than 1/3. More sharers, smaller shares.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Same number of parts, compare part size**: Both have 1 part. A whole cut into 9 parts has bigger parts than one cut into 11. → So 1/9 is greater; the greater is 1/9.
- **Common denominator (later grades; computing check)**: 1/9 = 11/99 and 1/11 = 9/99 → 11/99 is more, so the greater fraction is 1/9

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: comparison answers have no working contract (answer-level evidence only).

## Diagnostic (distinguishes the difficulties)

Interpretation rule: Read the three items together. bigger-bottom-bigger is SUSPECTED only when both same-top items are answered with the bigger-bottom fraction AND the same-bottom item is right. If the same-bottom item is also wrong (its modelled reading is 'more-parts-wrong-way'), all three answers fit a greater/smaller (or reversal) confusion instead, and no misconception is suspected. misconception-evidence@1 today would establish bigger-bottom-bigger from the two same-top matches alone; adopting this contrast condition is a policy decision for Codex (05).

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:adfcmp:1,1,8,2,0`: Which fraction is greater: 1/8 or 1/2 (one-half)? Write that fraction. | same top, asks greater — bigger-bottom-bigger answers the larger denominator | 1/2 | 1/8 → TARGET modelled error bigger-bottom-bigger (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:adfcmp:1,7,12,11,1`: Which fraction is smaller: 7/12 or 7/11? Write that fraction. | same top, asks smaller — the belief gives the opposite wrong answer here; a greater/smaller mix-up gives the SAME answers on these two items, which only the same-bottom item separates | 7/12 | 7/11 → TARGET modelled error bigger-bottom-bigger (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:adfcmp:0,11,1,10,0`: Which fraction is greater: 1/11 or 10/11? Write that fraction. | same bottom (contrast) — the bigger-bottom belief is right here; a greater/smaller mix-up (or answering in reverse) is wrong here too | 10/11 | 1/11 → other modelled error more-parts-wrong-way (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `bigger-bottom-bigger` (conceptual) — whole-number thinking: a bigger denominator is read as a bigger fraction

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Which fraction is greater: 1/9 or 1/10? Write that fraction.", one wrong answer is 1/10.
> The fraction with the bigger bottom number was chosen as greater. A bigger bottom number means the whole is cut into more parts, so each part is smaller.
> A bigger bottom number means MORE pieces from the same whole, so each piece is SMALLER.
> Not 1/10, but 1/9.

Check with two strips of the SAME length: cut one into 9 equal parts and the other into 10. One part of the 10-part strip is shorter than one part of the 9-part strip, so 1/10 is less than 1/9.

Solved correctly:

1. Both fractions have 1 part. In 1/9 the whole is cut into 9 equal parts; in 1/10 into 10.
1. Cutting the same whole into fewer parts makes each part bigger, so 1/9 is greater.
1. The greater fraction is 1/9.

Example `gen:adfcmp:1,1,9,10,0`; guided `gen:adfcmp:1,1,4,8,1`; fresh check `gen:adfcmp:1,1,6,7,1`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:adfcmp:1,1,9,8,0`, `gen:adfcmp:1,1,4,11,0`, `gen:adfcmp:1,1,8,3,1`
- Rechecks after teaching: `gen:adfcmp:1,1,10,5,0`, `gen:adfcmp:1,2,11,7,1`
- Transfer (everyday form): `gen:adfcmp:1,2,9,7,1:w`, `gen:adfcmp:1,3,8,5,1:w`
- Delayed checks: `gen:adfcmp:1,1,2,12,0`, `gen:adfcmp:1,7,10,8,1`

## Integration mapping (proposal for Codex; nothing written)

```json
{
 "strategyProposals": [
  {
   "id": "fix_bigger_bottom_bigger",
   "title": "A bigger bottom number means MORE pieces from the same whole",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:adfcmp:1,1,9,10,0"
    },
    {
     "role": "worked-example",
     "instance": "gen:adfcmp:1,1,9,10,0"
    },
    {
     "role": "practice",
     "instance": "gen:adfcmp:1,1,4,8,1"
    }
   ],
   "guided": "gen:adfcmp:1,1,4,8,1",
   "check": "gen:adfcmp:1,1,6,7,1"
  }
 ],
 "registryProposal": [
  {
   "competency": "MATH.number.fraction-comparison",
   "strategy": "fix_bigger_bottom_bigger",
   "misconceptionSpecific": true,
   "addresses": "bigger-bottom-bigger",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  }
 ],
 "generalStrategyProposal": {
  "id": "adfcmp_concept",
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

- packages/learning/src/fam/b04.ts:427 adfcmp: teach.idea/method, alternatives draw_both, sharing; bug bigger-bottom-bigger
- content/learning/modules.v1.json MATH.number.fraction-comparison (authored module; one strategy same_size_pieces; no misconception-specific explanation)

## Uncertainties

- The family's mc flag is false, so no multiple-choice delayed check exists; delayed checks are typed.
- The two-strip picture needs a renderer decision (two grid strips of equal width).

## Validation: 17/17 items pass; whole-pool oracle + alternatives agreement 250/250
