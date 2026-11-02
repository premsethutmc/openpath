# TP-NUM-02: Adding like fractions: the bottom number names the piece size

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.number.fraction-add-like` (Add and subtract like fractions, grade 4), family `fadd` (Adding or subtracting like fractions).

**Skill.** Add two fractions with the same denominator: add the numerators, keep the denominator.

## Prerequisites

- a/n is a pieces of size 1/n
- equal pieces of the same whole can be counted together
- Graph: MATH.number.equivalent-fractions (disputed), MATH.number.fraction-models (support)
- graph: fraction-models (support), equivalent-fractions (disputed). No mandatory prerequisite is recorded; 'fraction as a count of unit pieces' is the real prerequisite.

## Explanation

3/8 means 3 pieces, each 1/8 of the whole. 2/8 means 2 more pieces of the same size.
Adding counts the pieces: 3 + 2 = 5 pieces, still eighths. The size of a piece does not change, so the bottom number stays 8.

Visual: `{"type":"grid","rows":1,"cols":9,"shaded":8,"note":"one strip of n equal parts; shade a parts, then b more"}`. Reuses the grid strip used by fraction families ({type:'grid', rows:1, cols:n, shaded:k}). For a sum above one whole, draw a second strip.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:fadd:6,2,9,1`** — 6/9 + 2/9 = ?

1. Every piece has size 1/9: 6 piece(s) and 2 piece(s) = 8 piece(s) of size 1/9
1. 8/9

Answer **8/9**. (The family's own step text: 6 + 2 = 8 pieces of the same size.)

## Hints (graded, per worked example)

For `gen:fadd:6,2,9,1`:

1. What size is each piece in these fractions?
2. Every piece is 1/9. Count all the pieces together.
3. Add the top numbers; the pieces are still 9ths.

## Alternative explanation: Units that do not change

3 apples + 2 apples = 5 apples, not 5 'double apples'.
3 eighths + 2 eighths = 5 eighths: 'eighths' is the unit, like 'apples'.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Number line in steps of 1/n**: Start at 6/9 and jump 2 steps of 1/9 → You land on 8/9

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: fadd has a family contract statement (a/n ± b/n), so the existing derivation authority (working-assessment@1) can examine typed arithmetic working; the answer alone earns answer credit only.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:fadd:3,5,9,1`: 3/9 + 5/9 = ? | sum below one — add-denominators gives (a+b)/2n, multiply-tops gives ab/n: distinct values | 8/9 | 8/18 → TARGET modelled error add-denominators (conceptual): suspected on one answer; 15/9 → TARGET modelled error multiply-tops (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `add-denominators` (conceptual) — fractions treated as two whole numbers (add top, add bottom)

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "2/6 + 3/6 = ?", one wrong answer is 5/12.
> The bottom numbers were added too; they name the size of the pieces, which does not change.
> The bottom number is the SIZE of the pieces. Adding pieces does not make them smaller.
> Not 5/12, but 5/6.

Check with one strip cut into 6 equal parts: shade 2 parts, then 3 more. 5 parts are shaded and the strip still has 6 parts: 5/6. Nothing cut the strip into 12 parts.

Solved correctly:

1. Every piece has size 1/6: 2 piece(s) and 3 piece(s) = 5 piece(s) of size 1/6
1. 5/6

Example `gen:fadd:2,3,6,1`; guided `gen:fadd:3,4,12,1:mc`; fresh check `gen:fadd:7,2,10,1:mc`.

### `multiply-tops` (procedural) — wrong operation on the numerators

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "2/7 + 3/7 = ?", one wrong answer is 6/7.
> The top numbers were multiplied; adding fractions adds the pieces.
> Adding fractions adds the pieces; multiplication is a different operation.
> Not 6/7, but 5/7.

Check: 2 pieces and 3 more pieces make 5 pieces, not 6.

Solved correctly:

1. Every piece has size 1/7: 2 piece(s) and 3 piece(s) = 5 piece(s) of size 1/7
1. 5/7

Example `gen:fadd:2,3,7,1`; guided `gen:fadd:5,2,9,1:mc`; fresh check `gen:fadd:3,2,11,1:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:fadd:3,2,8,1:mc`, `gen:fadd:4,2,7,1:mc`, `gen:fadd:2,9,12,1`
- Rechecks after teaching: `gen:fadd:4,3,9,1:mc`, `gen:fadd:5,6,12,1:mc`
- Transfer (everyday form): **none: the family has no word form (content gap)**
  - authored candidate (text only, arithmetic checked, NOT grader-verified): Meena ate 2/8 of a cake in the morning and 3/8 of the same cake in the evening. What fraction of the cake did she eat? → 5/8
  - authored candidate (text only, arithmetic checked, NOT grader-verified): A ribbon is cut into 10 equal pieces. Ravi uses 3 pieces and Anu uses 4 pieces. What fraction of the ribbon did they use together? → 7/10
- Delayed checks: `gen:fadd:4,3,8,1:mc`, `gen:fadd:2,5,11,1:mc`

## Integration mapping (proposal for Codex; nothing written)

```json
{
 "strategyProposals": [
  {
   "id": "fix_add_denominators",
   "title": "The bottom number is the SIZE of the pieces. Adding pieces d",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:fadd:2,3,6,1"
    },
    {
     "role": "worked-example",
     "instance": "gen:fadd:2,3,6,1"
    },
    {
     "role": "practice",
     "instance": "gen:fadd:3,4,12,1:mc"
    }
   ],
   "guided": "gen:fadd:3,4,12,1:mc",
   "check": "gen:fadd:7,2,10,1:mc"
  },
  {
   "id": "fix_multiply_tops",
   "title": "Adding fractions adds the pieces; multiplication is a differ",
   "kind": "conceptual|procedural (from bug kind)",
   "needs": [],
   "screens": [
    {
     "role": "misconception",
     "instance": "gen:fadd:2,3,7,1"
    },
    {
     "role": "worked-example",
     "instance": "gen:fadd:2,3,7,1"
    },
    {
     "role": "practice",
     "instance": "gen:fadd:5,2,9,1:mc"
    }
   ],
   "guided": "gen:fadd:5,2,9,1:mc",
   "check": "gen:fadd:3,2,11,1:mc"
  }
 ],
 "registryProposal": [
  {
   "competency": "MATH.number.fraction-add-like",
   "strategy": "fix_add_denominators",
   "misconceptionSpecific": true,
   "addresses": "add-denominators",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  },
  {
   "competency": "MATH.number.fraction-add-like",
   "strategy": "fix_multiply_tops",
   "misconceptionSpecific": true,
   "addresses": "multiply-tops",
   "status": "pending_review",
   "scope": [
    "demonstration"
   ]
  }
 ],
 "generalStrategyProposal": {
  "id": "fadd_concept",
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

- packages/learning/src/families.ts:116 fadd: teach idea/method only, NO alternatives, NO word form; bugs add-denominators, multiply-tops
- content/learning/modules.v1.json MATH.number.fraction-add-like (authored; one strategy count_pieces)

## Uncertainties

- fadd has no word (transfer) form: transfer candidates cannot be drawn from the generator; transfer is MISSING CONTENT (authored candidates below are text only, unverified by the grader).
- The family's diagnostic pool has no sum-above-one item, so the diagnostic cannot test improper results (one case only).
- Some fadd items give the same value for both bugs (e.g. 1/3 + 1/3: both predict 1/3); the builder excludes such items from diagnostics.
- The subtraction bug 'subtract-reversed' predicts a negative value although the family rejects b > a; not targeted here.

## Validation: 15/15 items pass; whole-pool oracle + alternatives agreement 220/220
