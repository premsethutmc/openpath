# PAT-SCALE: One picture or line stands for the key

**Status:** review candidate (not approved, not registered, not served). Strands: statistics.

**Why this pattern.** 6 families in 5 competencies (pictographs, tallies, bar charts, scaled bars) model reading a key or scale as 1 or 10.

## The one shared strategy

In a pictograph or a scaled bar chart, one picture or one line does not always stand for 1. The key or the scale says how many it stands for.
Read the key first. Then count pictures (or lines) and multiply by the key; to draw, share the number into groups of the key.

Alternative: **Read the key first** — Before counting anything on a chart, find what one picture or one line stands for.

## Existing material reused (not rewritten)

| Competency | Existing explanation | Covers |
|---|---|---|
| `MATH.statistics.pictographs` | `spot_the_mistake` | no-key (reading) |
| `MATH.statistics.scaled-bars` | `spot_the_mistake` | count-lines |
| `MATH.statistics.scaled-bars` | `skip_count` | reading a scale (general) |

## Member packages (family-specific parts only)

- [TP2-SCL-PICT](TP2-SCL-PICT.md): Pictographs: each picture stands for the key (`acpicttab`, `MATH.statistics.pictographs`)
- [TP2-SCL-BAR](TP2-SCL-BAR.md): Scaled bar charts: read the scale, do not count lines (`afbar`, `MATH.statistics.scaled-bars`)

## Cross-family contrast diagnostic

1. `gen:acpicttab:2,1,0,1` (TP2-SCL-PICT, read a total): The pictograph shows how the children of a school come to school. Each ● stands for 10 children. How many children are there in all?
2. `gen:afbar:0,0,10` (TP2-SCL-BAR, read one bar): The bar chart shows visitors to a park. Read the scale carefully. How many visitors came in May?

| Answers | Supports | Leaves uncertain | Establishes? |
|---|---|---|---|
| 24 (bug:no-key); 4 (bug:count-lines) | every symbol and line read as 1 on both displays: the key/scale idea is missing | none competing; teach the shared concept | yes |
| 240 (correct); 40 (bug:assume-tens) | uses keys but assumes scales go in 10s | a habit from charts seen before; fix_assume_tens | **no** |
| 24 (bug:no-key); 8 (correct) | pictograph key ignored, bar scale read | a pictograph-specific reading slip; existing spot_the_mistake | **no** |
