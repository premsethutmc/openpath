# PAT-PARTS: The bottom number counts all the equal parts

**Status:** review candidate (not approved, not registered, not served). Strands: number.

**Why this pattern.** 9 families in 5 competencies model a part–whole error in naming or making fractions (count-only, shaded-to-unshaded, top-number, add-bottoms).

## The one shared strategy

A fraction names equal parts of ONE whole. The bottom number is how many equal parts the whole is cut into, all of them, shaded or not.
The top number is how many of those parts we mean. So the fraction of a shape that is shaded is (shaded parts) over (all the equal parts).

Alternative: **Whole first** — Before naming a fraction, say what the whole is and how many equal parts it has.

## Existing material reused (not rewritten)

| Competency | Existing explanation | Covers |
|---|---|---|
| `MATH.number.fraction-models` | `equal_parts` | equal parts (general, authored) |

## Member packages (family-specific parts only)

- [TP2-PRT-NAME](TP2-PRT-NAME.md): Naming a shaded fraction: out of ALL the equal parts (`adfname`, `MATH.number.fraction-models`)
- [TP2-PRT-SHADE](TP2-PRT-SHADE.md): Shading a fraction of a grid: parts of the whole, not the top number (`adshade`, `MATH.number.fraction-models`)

## Cross-family contrast diagnostic

1. `gen:adfname:2,6,7` (TP2-PRT-NAME, shaded fraction): What fraction of the shape in the picture is shaded? All the small squares are the same size.
2. `gen:adshade:2,8,3,8` (TP2-PRT-SHADE, grid larger than the bottom number): The grid in the picture has 16 equal squares. How many squares must be shaded to show 3/8 of the grid?

| Answers | Supports | Leaves uncertain | Establishes? |
|---|---|---|---|
| 7/5 (bug:shaded-to-unshaded); 6 (correct) | names the fraction part-to-part (shaded over unshaded) while shading a given fraction is right | a conceptual part-to-part reading of naming, or a habit only in naming tasks; one answer: suspected only | **no** |
| 7/12 (correct); 3 (bug:top-number) | names fractions but reads the top number as squares when shading | the size of a part in a bigger whole; fix_top_number | **no** |
| 7 (bug:count-only); 3 (bug:top-number) | fractions treated as plain counts in both directions | the two answers are different errors, and typing only the top number also explains the first; teach the shared concept as general teaching, but do NOT establish either misconception from this pair | **no** |
