# PAT-CHANCE: Count equally likely outcomes, not categories

**Status:** review candidate (not approved, not registered, not served). Strands: probability.

**Why this pattern.** 12 families in 8 competencies (chance, classical, sample spaces, distributions) model treating categories or totals as equally likely; TP-PRO-01 (batch 1) is the two-stage case of the same pattern.

## The one shared strategy

Each marble (or ball) is equally likely to be picked, not each colour. So count marbles, not colours.
Probability = (marbles that fit) ÷ (ALL the marbles). It is a number from 0 to 1, never more than 1.

Alternative: **Number the objects** — Give every marble a number: each number is equally likely, so count numbers that fit.

## Existing material reused (not rewritten)

| Competency | Existing explanation | Covers |
|---|---|---|
| `MATH.probability.chance-language` | `spot_the_mistake` | odds |
| `MATH.probability.classical` | `spot_the_mistake` | odds |
| `MATH.probability.chance-language` | `scale_words` | 0–1 scale (general) |
| `MATH.probability.sample-space` | `(batch 1) TP-PRO-01` | two-stage sample spaces |

## Member packages (family-specific parts only)

- [TP2-CH-BAG](TP2-CH-BAG.md): Count marbles, not colours (`akchance`, `MATH.probability.chance-language`)
- [TP2-CH-BALL](TP2-CH-BALL.md): Balls of different counts: each ball is equally likely (`anbag`, `MATH.probability.classical`)

## Cross-family contrast diagnostic

1. `gen:akchance:2,3,2,0` (TP2-CH-BAG, unequal colours): A bag has 2 red, 3 blue and 2 green marbles, as in the table. Karthik picks one marble without looking. What is the probability that it is red? (A fraction is fine.)
2. `gen:anbag:6,9,7,2` (TP2-CH-BALL, unequal colours): A bag has 6 red, 9 blue and 7 green balls, all of the same size. One ball is taken out without looking. What is the probability that it is green? Give a fraction.

| Answers | Supports | Leaves uncertain | Establishes? |
|---|---|---|---|
| 1/3 (bug:colours-equal); 1/3 (bug:colours-equally-likely) | colours treated as equally likely in two different contexts (marbles, balls) | on unequal bags this answer differs from odds and from a count, so no competing explanation gives both; the equal-count contrast that would show it is not chance is unavailable (gap) | yes |
| 2/5 (bug:odds); 7/15 (bug:odds) | compares with the others, not with all: odds | existing spot_the_mistake (odds) applies in both modules | yes |
| 1/3 (bug:colours-equal); 7/22 (correct) | one matching answer: suspected only | a slip or the belief | **no** |
| 1/3 (bug:colours-equal); 7/15 (bug:odds) | two different errors | no single belief explains both; general teaching, re-probe | **no** |
