# TP-NUM-02: Adding like fractions: the bottom number names the piece size

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.number.fraction-add-like` (Add and subtract like fractions, grade 4), family `fadd` (Adding or subtracting like fractions).

**Skill.** Add two fractions with the same denominator: add the numerators, keep the denominator.

## Prerequisites

- a/n is a pieces of size 1/n
- equal pieces of the same whole can be counted together
- Graph: MATH.number.equivalent-fractions (disputed), MATH.number.fraction-models (support)
- graph: fraction-models (support), equivalent-fractions (disputed). No mandatory prerequisite is recorded; 'fraction as a count of unit pieces' is the real prerequisite.

## Explanation

A fraction with bottom number n counts pieces, each 1/n of the whole. Two fractions with the same bottom number count pieces of the same size.
Adding counts the pieces together; the size of a piece does not change, so the bottom number stays the same.

Visual: `{"type":"grid","rows":1,"cols":6,"shaded":5,"note":"one strip of n equal parts; shade a parts, then b more"}`. Reuses the grid strip used by fraction families ({type:'grid', rows:1, cols:n, shaded:k}). For a sum above one whole, draw a second strip.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:fadd:2,3,6,1`** — 2/6 + 3/6 = ?

1. Every piece has size 1/6: 2 pieces and 3 pieces = 5 pieces of size 1/6
1. 5/6

Answer **5/6**. (The family's own step text: 2 + 3 = 5 pieces of the same size.)

## Hints (graded, per worked example)

For `gen:fadd:2,3,6,1`:

1. What size is each piece in these fractions?
2. Every piece is 1/6. Count all the pieces together.
3. Add the top numbers; the pieces are still 6ths.

## Alternative explanation: Units that do not change

Apples added to apples are still apples.
In the same way, pieces of one size added to pieces of the same size are still pieces of that size: the bottom number names the size, like the word 'apples'.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Number line in steps of 1/n**: Start at 2/6 and jump 3 steps of 1/6 → You land on 5/6

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: fadd has a family contract statement (a/n ± b/n), so the existing derivation authority (working-assessment@1) can examine typed arithmetic working; the answer alone earns answer credit only.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: The value (a + b)/(2n) is also what 'averaging the two fractions' gives, for EVERY like-fraction sum, so no item can separate add-denominators from averaging by value. Only the written form separates them: '(a+b)/(2n)' written unsimplified (e.g. 8/18) supports add-denominators; a simplified equal value (4/9) leaves both open. The grader compares values, so the raw response text must be read for this (integration note, 05). One diagnostic case only (no improper-sum item in the diagnostic partition).

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:fadd:3,5,9,1`: 3/9 + 5/9 = ? | sum below one — add-denominators gives (a+b)/2n, multiply-tops gives ab/n: distinct values | 8/9 | 8/18 → TARGET modelled error add-denominators (conceptual): suspected on one answer (competing explanation: see the trigger condition; answers alone may not establish it); 15/9 → TARGET modelled error multiply-tops (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `add-denominators` (conceptual) — fractions treated as two whole numbers (add top, add bottom)

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "2/7 + 3/7 = ?", one wrong answer is 5/14.
> The bottom numbers were added too; they name the size of the pieces, which does not change.
> The bottom number is the SIZE of the pieces. Adding pieces does not make them smaller.
> Not 5/14, but 5/7.

Check with one strip cut into 7 equal parts: shade 2 parts, then 3 more. 5 parts are shaded and the strip still has 7 parts: 5/7. Nothing cut the strip into 14 parts.

Solved correctly:

1. Every piece has size 1/7: 2 pieces and 3 pieces = 5 pieces of size 1/7
1. 5/7

Example `gen:fadd:2,3,7,1`; guided `gen:fadd:3,4,12,1:mc`; fresh check `gen:fadd:7,2,10,1:mc`.

### `multiply-tops` (procedural) — wrong operation on the numerators

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "2/9 + 5/9 = ?", one wrong answer is 10/9.
> The top numbers were multiplied; adding fractions adds the pieces.
> Adding fractions adds the pieces; multiplication is a different operation.
> Not 10/9, but 7/9.

Check: 2 pieces and 5 more pieces make 7 pieces, not 10.

Solved correctly:

1. Every piece has size 1/9: 2 pieces and 5 pieces = 7 pieces of size 1/9
1. 7/9

Example `gen:fadd:2,5,9,1`; guided `gen:fadd:5,4,11,1`; fresh check `gen:fadd:3,2,11,1:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:fadd:3,2,8,1:mc`, `gen:fadd:4,2,7,1:mc`, `gen:fadd:2,9,12,1`
- Rechecks after teaching: `gen:fadd:8,2,11,1:mc`, `gen:fadd:4,3,11,1`
- Transfer (everyday form): **none: the family has no word form (content gap)**
  - authored candidate (text only, arithmetic checked, NOT grader-verified): Meena ate 2/8 of a cake in the morning and 3/8 of the same cake in the evening. What fraction of the cake did she eat? → 5/8
  - authored candidate (text only, arithmetic checked, NOT grader-verified): A ribbon is cut into 10 equal pieces. Ravi uses 3 pieces and Anu uses 4 pieces. What fraction of the ribbon did they use together? → 7/10
- Delayed checks: `gen:fadd:4,3,8,1:mc`, `gen:fadd:5,3,11,1`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Add two fractions with the same denominator: add the numerators, keep the denominator.
- **Generator:** `fadd` — fadd with params[3] = 1 (addition); examples: gcd(a + b, n) = 1, a ≠ b, a > 1, b > 1
- **Trigger** `fadd_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_add_denominators`: verified-misconception 'add-denominators' (two matching answers, misconception-evidence@1) AND both matching responses are WRITTEN unsimplified as (a + b)/(2n) (e.g. 8/18), read from the raw response text; a simplified equal value (4/9) also fits 'averaging the two fractions' and must not count. Even the unsimplified form can come from halving 8/9 as 8/18, so the fix teaches piece size and the recheck must use a new item
- **Trigger** `fix_multiply_tops`: verified-misconception 'multiply-tops' (two matching answers, misconception-evidence@1)
- **Allowed methods:** the oracle's method (worked lines); Number line in steps of 1/n
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:fadd:8,2,11,1:mc`, `gen:fadd:4,3,11,1`
- **Retention target:** MATH.number.fraction-add-like / `fadd`, cases: sum below one. Candidates: `gen:fadd:4,3,8,1:mc`, `gen:fadd:5,3,11,1`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** fadd has a family contract statement (a/n ± b/n), so the existing derivation authority (working-assessment@1) can examine typed arithmetic working; the answer alone earns answer credit only
- **Ungradable / text-only:** "Meena ate 2/8 of a cake in the morning and 3/8 of the same cake in the evening. What fraction of the cake did she eat?" (text only: no generator form, not gradable by the trusted grader); "A ribbon is cut into 10 equal pieces. Ravi uses 3 pieces and Anu uses 4 pieces. What fraction of the ribbon did they use together?" (text only: no generator form, not gradable by the trusted grader)
- **Reused existing explanations:** none

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `fadd_concept` | pass | 3/3 sections checked, no violations | yes | yes | — |
| `fix_add_denominators` | pass | 2/2 sections checked, no violations | no (misconception-evidence) | yes | add-denominators |
| `fix_multiply_tops` | pass | 2/2 sections checked, no violations | no (misconception-evidence) | yes | multiply-tops |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/families.ts:116 fadd: teach idea/method only, NO alternatives, NO word form; bugs add-denominators, multiply-tops
- content/learning/modules.v1.json MATH.number.fraction-add-like (authored; one strategy count_pieces)

## Uncertainties

- fadd has no word (transfer) form: transfer candidates cannot be drawn from the generator; transfer is MISSING CONTENT (authored candidates below are text only, unverified by the grader).
- The family's diagnostic pool has no sum-above-one item, so the diagnostic cannot test improper results (one case only).
- Some fadd items give the same value for both bugs (e.g. 1/3 + 1/3: both predict 1/3); the builder excludes such items from diagnostics.
- The subtraction bug 'subtract-reversed' predicts a negative value although the family rejects b > a; not targeted here.

## Validation: 15/15 items pass; whole-pool oracle + alternatives agreement 220/220
