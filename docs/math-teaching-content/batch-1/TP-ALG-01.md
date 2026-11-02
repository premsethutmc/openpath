# TP-ALG-01: (a + b)²: why the middle term is 2ab

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.algebra.identities` (Use algebraic identities, grade 8), family `ahid` (Expanding with (a + b)², (a − b)² and (a + b)(a − b)).

**Skill.** Expand (px ± q)² with the identity; in particular the middle coefficient ±2pq.

## Prerequisites

- multiplying two binomials term by term
- x × x = x²
- Graph: MATH.algebra.linear-rational (disputed), MATH.algebra.identities-intro (support), MATH.number.integer-add (support)
- the graph's prerequisite relations for identities were not changed

## Explanation

(a + b)² = (a + b)(a + b). Multiplying every term by every term gives a×a, a×b, b×a and b×b.
a×b and b×a are the same, and there are TWO of them: a² + 2ab + b². The area picture shows them as two equal rectangles.

Visual: `{"type":"grid","rows":2,"cols":2,"labels":["a²","ab","ab","b²"]}`. Reuses ahid's own 'area' visual ({type:'grid', rows:2, cols:2}); labels proposed (the existing visual has none).

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:ahid:0,5,2,1`** — Use the identity (a + b)² = a² + 2ab + b² to expand (5x + 2)². (5x + 2)² = 25x² + □x + 4. What number goes in the box? (It may be negative.)

1. (5x + 2)² = 25x² + 20x + 4 (every term times every term)
1. The box is the x coefficient: 20

Answer **20**. (The family's own step text is not quoted: it has a recorded defect.)

**`gen:ahid:1,3,8,1`** — Use the identity (a − b)² = a² − 2ab + b² to expand (3x − 8)². (3x − 8)² = 9x² + □x + 64. What number goes in the box? (It may be negative.)

1. (3x − 8)² = 9x² − 48x + 64 (every term times every term)
1. The box is the x coefficient: -48

Answer **-48**. (The family's own step text is not quoted: it has a recorded defect.)

## Hints (graded, per worked example)

For `gen:ahid:0,5,2,1`:

1. Write the square as a product of two brackets.
2. Multiply each term in the first bracket by each term in the second: four products.
3. Two of the four products are the same; add them.

For `gen:ahid:1,3,8,1`:

1. Write the square as a product of two brackets.
2. Multiply each term in the first bracket by each term in the second: four products.
3. Two of the four products are the same; add them.

## Alternative explanation: Multiply it out

Write (px + q)² as (px + q)(px + q) and multiply each term by each term.
The two middle products come out equal, so the middle term is doubled.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Multiply it out: four products**: 25x² + 10x + 10x + 4 (first×first, first×second, second×first, second×second) → collect the two x terms: 10 + 10 = 20

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: ahid has no working contract; an expansion written as working is not examined (answer-level only).

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:ahid:0,4,9,1`: Use the identity (a + b)² = a² + 2ab + b² to expand (4x + 9)². (4x + 9)² = 16x² + □x + 81. What number goes in the box? (It may be negative.) | (px + q)², middle — middle-not-doubled gives pq; middle-sign gives −2pq | 72 | 36 → TARGET modelled error middle-not-doubled (conceptual): suspected on one answer; -72 → TARGET modelled error middle-sign (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:ahid:1,4,3,1`: Use the identity (a − b)² = a² − 2ab + b² to expand (4x − 3)². (4x − 3)² = 16x² + □x + 9. What number goes in the box? (It may be negative.) | (px − q)², middle — the same two difficulties with the sign reversed: separates a sign slip from the missing doubling | -24 | -12 → TARGET modelled error middle-not-doubled (conceptual): suspected on one answer; 24 → TARGET modelled error middle-sign (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `middle-not-doubled` (conceptual) — conceptual: (a+b)² read as a² + ab + b² (or a² + b²)

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Use the identity (a + b)² = a² + 2ab + b² to expand (5x + 7)². (5x + 7)² = 25x² + □x + 49. What number goes in the box? (It may be negative.)", one wrong answer is 35.
> The middle term was written as ab. The identity has 2ab: the two products 5x × 7 and 7 × 5x are both there.
> There are two middle products, a×b and b×a; together they make 2ab.
> Not 35, but 70.

Check at x = 1: the left side is 144. With the middle term 70: 25 + 70 + 49 = 144. With 35 instead: 109, which is not 144.

Solved correctly:

1. (5x + 7)² = 25x² + 70x + 49 (every term times every term)
1. The box is the x coefficient: 70

Example `gen:ahid:0,5,7,1`; guided `gen:ahid:0,2,5,1:mc`; fresh check `gen:ahid:1,4,5,1`.

### `middle-sign` (procedural) — procedural sign slip

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Use the identity (a + b)² = a² + 2ab + b² to expand (5x + 4)². (5x + 4)² = 25x² + □x + 16. What number goes in the box? (It may be negative.)", one wrong answer is -40.
> The middle term of (a + b)² is +2ab.
> Square of a sum: +2ab. Square of a difference: −2ab.
> Not -40, but 40.

Check at x = 1: the left side is 81. With the middle term 40: 25 + 40 + 16 = 81. With -40 instead: 1, which is not 81.

Solved correctly:

1. (5x + 4)² = 25x² + 40x + 16 (every term times every term)
1. The box is the x coefficient: 40

Example `gen:ahid:0,5,4,1`; guided `gen:ahid:1,3,4,1:mc`; fresh check `gen:ahid:0,4,6,1`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:ahid:1,2,8,1:mc`, `gen:ahid:1,5,9,1:mc`, `gen:ahid:0,3,5,1:mc`
- Rechecks after teaching: `gen:ahid:0,3,9,1:mc`, `gen:ahid:1,5,1,1:mc`
- Transfer (everyday form): `gen:ahid:0,3,2,1:w`, `gen:ahid:0,5,6,1:w`
- Delayed checks: `gen:ahid:1,2,3,1`, `gen:ahid:1,2,6,1`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Expand (px ± q)² with the identity; in particular the middle coefficient ±2pq.
- **Generator:** `ahid` — ahid with params[0] ∈ {0, 1} ((px + q)², (px − q)²) and params[3] = 1 (the box is the x coefficient); examples need p ≥ 2, p ≠ q, q ≠ 2p, p ≠ 2q.
- **Trigger** `ahid_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_middle_not_doubled`: verified-misconception 'middle-not-doubled' (two matching answers, misconception-evidence@1)
- **Trigger** `fix_middle_sign`: verified-misconception 'middle-sign' (two matching answers, misconception-evidence@1)
- **Allowed methods:** the oracle's method (worked lines); Multiply it out: four products
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:ahid:0,3,9,1:mc`, `gen:ahid:1,5,1,1:mc`
- **Retention target:** MATH.algebra.identities / `ahid`, cases: (px + q)², middle; (px − q)², middle. Candidates: `gen:ahid:1,2,3,1`, `gen:ahid:1,2,6,1`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** ahid has no working contract; an expansion written as working is not examined (answer-level only)
- **Ungradable / text-only:** none
- **Reused existing explanations:** none

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `ahid_concept` | **not checked**: outside the module's teaching scope (ineligible today) | 4/4 sections checked, no violations | yes | yes | — |
| `fix_middle_not_doubled` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | middle-not-doubled |
| `fix_middle_sign` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | middle-sign |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Delayed-check audit (cross term)

| Retention item | Form | Asks | Tests the cross term | not-doubled distinct | copied-number risk |
|---|---|---|---|---|---|
| `gen:ahid:0,2,5,2` | (px + q)² | constant | no | no | no |
| `gen:ahid:1,4,5,2:mc` | (px − q)² | constant | no | no | no |
| `gen:ahid:0,4,8,1` | (px + q)² | x coefficient (cross term) | yes | yes | yes |
| `gen:ahid:1,2,8,0:mc` | (px − q)² | x² coefficient | no | no | no |
| `gen:ahid:0,3,3,0` | (px + q)² | x² coefficient | no | no | no |
| `gen:ahid:1,3,5,1:mc` | (px − q)² | x coefficient (cross term) | yes | yes | no |
| `gen:ahid:2,4,1,0` | (px + q)(px − q) | x² coefficient | no | no | no |
| `gen:ahid:2,2,1,0:mc` | (px + q)(px − q) | x² coefficient | no | no | no |
| `gen:ahid:1,1,7,1` | (px − q)² | x coefficient (cross term) | yes | yes | yes |
| `gen:ahid:2,3,7,0:mc` | (px + q)(px − q) | x² coefficient | no | no | no |
| `gen:ahid:1,4,1,0` | (px − q)² | x² coefficient | no | no | no |
| `gen:ahid:2,2,4,2:mc` | (px + q)(px − q) | constant | no | no | no |
| `gen:ahid:2,5,1,0` | (px + q)(px − q) | x² coefficient | no | no | no |
| `gen:ahid:2,3,4,0:mc` | (px + q)(px − q) | x² coefficient | no | no | no |
| `gen:ahid:0,4,3,2` | (px + q)² | constant | no | no | no |
| `gen:ahid:1,5,6,2:mc` | (px − q)² | constant | no | no | no |
| `gen:ahid:1,5,6,1` | (px − q)² | x coefficient (cross term) | yes | yes | no |
| `gen:ahid:1,2,5,2:mc` | (px − q)² | constant | no | no | no |
| `gen:ahid:1,2,5,1` | (px − q)² | x coefficient (cross term) | yes | yes | no |
| `gen:ahid:2,4,3,0:mc` | (px + q)(px − q) | x² coefficient | no | no | no |
| `gen:ahid:1,4,9,1` | (px − q)² | x coefficient (cross term) | yes | yes | no |
| `gen:ahid:0,2,1,1:mc` | (px + q)² | x coefficient (cross term) | yes | yes | yes |
| `gen:ahid:0,5,5,0` | (px + q)² | x² coefficient | no | no | no |
| `gen:ahid:0,2,2,1:mc` | (px + q)² | x coefficient (cross term) | yes | yes | yes |
| `gen:ahid:1,2,7,2` | (px − q)² | constant | no | no | no |
| `gen:ahid:1,1,3,2:mc` | (px − q)² | constant | no | no | no |
| `gen:ahid:0,4,1,0` | (px + q)² | x² coefficient | no | no | no |
| `gen:ahid:0,2,9,0:mc` | (px + q)² | x² coefficient | no | no | no |
| `gen:ahid:1,1,9,1` | (px − q)² | x coefficient (cross term) | yes | yes | yes |
| `gen:ahid:1,1,9,2:mc` | (px − q)² | constant | no | no | no |
| `gen:ahid:1,3,3,0` | (px − q)² | x² coefficient | no | no | no |
| `gen:ahid:1,3,2,2:mc` | (px − q)² | constant | no | no | no |
| `gen:ahid:2,4,6,0` | (px + q)(px − q) | x² coefficient | no | no | no |
| `gen:ahid:1,4,3,0:mc` | (px − q)² | x² coefficient | no | no | no |
| `gen:ahid:1,4,2,2` | (px − q)² | constant | no | no | no |
| `gen:ahid:2,2,7,0:mc` | (px + q)(px − q) | x² coefficient | no | no | no |
| `gen:ahid:2,2,9,2` | (px + q)(px − q) | constant | no | no | no |
| `gen:ahid:1,3,6,0:mc` | (px − q)² | x² coefficient | no | no | no |
| `gen:ahid:0,4,4,0` | (px + q)² | x² coefficient | no | no | no |
| `gen:ahid:1,1,4,2:mc` | (px − q)² | constant | no | no | no |
| `gen:ahid:1,2,3,1` | (px − q)² | x coefficient (cross term) | yes | yes | no |
| `gen:ahid:2,4,9,0:mc` | (px + q)(px − q) | x² coefficient | no | no | no |
| `gen:ahid:0,3,7,0` | (px + q)² | x² coefficient | no | no | no |
| `gen:ahid:1,3,9,1:mc` | (px − q)² | x coefficient (cross term) | yes | yes | no |
| `gen:ahid:2,2,5,0` | (px + q)(px − q) | x² coefficient | no | no | no |
| `gen:ahid:2,1,9,2:mc` | (px + q)(px − q) | constant | no | no | no |
| `gen:ahid:1,5,7,0` | (px − q)² | x² coefficient | no | no | no |
| `gen:ahid:0,5,9,2:mc` | (px + q)² | constant | no | no | no |
| `gen:ahid:2,4,4,0` | (px + q)(px − q) | x² coefficient | no | no | no |
| `gen:ahid:1,4,6,1:mc` | (px − q)² | x coefficient (cross term) | yes | yes | no |
| `gen:ahid:1,5,5,1` | (px − q)² | x coefficient (cross term) | yes | yes | yes |
| `gen:ahid:1,5,5,2:mc` | (px − q)² | constant | no | no | no |
| `gen:ahid:1,2,6,1` | (px − q)² | x coefficient (cross term) | yes | yes | no |
| `gen:ahid:1,2,6,2:mc` | (px − q)² | constant | no | no | no |

## Sources

- packages/learning/src/fam/b08.ts:2188 ahid: teach idea/method; alternatives area, multiply_out; bugs middle-not-doubled, middle-sign, minus-squared, q-doubled, p-not-squared
- MATH.algebra.identities (authored module seeded from 'expand'; ahid has no misconception-specific explanation)

## Uncertainties

- The question asks one coefficient at a time (by design, so the unexpanded form is not accepted); the package teaches the full expansion but checks the middle coefficient.
- The area picture fits (a + b)² only; for (a − b)² use the four-products method.
- CONTENT DEFECT (existing family step text, fam/b08.ts:2232 ahid explain): for every (px − q)² item it prints e.g. '2ab = 2 × 3x × 8 = -48x' (b shown as +8 while the product is negative) and '1x²' when p = 1. The package does NOT quote the family's step text for this family. Not changed here.
- diagnostic case "(px + q)², middle": the family's diagnostic partition has no usable item (only ambiguous ones); candidate gen:ahid:0,4,9,1 is taken from the CHECK partition and must be re-partitioned or replaced at integration
- delayed checks: no usable retention item for case "(px + q)², middle" (another case's item stands in)
- binomial delayed checks: 14 of 54 retention items ask the cross term; 3 of them are (px + q)² and 0 of those avoid a copied-number reading. The positive-square delayed check is MISSING: the retention partition has no unambiguous (px + q)² cross-term item, so the delayed check of the title skill is not covered (generator partition change: Codex).

## Validation: 19/19 items pass; whole-pool oracle + alternatives agreement 90/90
