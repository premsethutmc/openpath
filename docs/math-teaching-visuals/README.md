# Mathematics teaching visuals (visuals@2): handover

**Branch:** `feat/math-teaching-visuals`, from `df0521db` (the `feat/math-teaching-connections` head).
**Specification and corrected package data:** `feat/math-teaching-content` at `4e655e73`: `docs/math-teaching-content/09-MISSING-QUESTIONS-AND-VISUALS.md` V1–V5, and the TP-NUM-01 and TP-GEO-01 explanation visuals. That branch is not changed here.

**Scope: renderer only.** Two files change: `frontend/src/year/Figure.tsx` (drawing and `describe()`) and `frontend/src/year/Learn.tsx` (one routing line). There is a new test file, `frontend/src/year/figure-visuals.test.ts`.

**Not changed:**
- no shared types: `Visual` (`family-kit.ts`) and `Screen["widget"]` (`content.ts`) already allow optional fields;
- no packages, grading, diagnosis, pools, selectors or retention;
- no content registration or approval.

## What now renders

Every new field is optional. Without it, a figure renders exactly as before.

| # | Visual | Data (existing type + optional fields) | Drawing | Screen-reader text (`describe`) |
|---|---|---|---|---|
| 1 | Fraction strips (TP-NUM-01) | `strips` + `bottomShaded`, `labels` | Two strips of the **same length** (one whole each), each cut into its own number of equal parts and shaded for its own fraction, with optional row labels | "Two strips of the same length, each one whole: the first in 9 equal parts with 1 shaded (1/9), the second in 11 …" |
| 2 | Perimeter (TP-MEA-01) | `shape` `kind: "rectangle"` + `outline` | Outline only (no fill, a strong accent edge), with each side's label outside its side | "… with sides 10 cm, 9 cm, 10 cm, 9 cm, drawn as an outline" |
| 3 | Exterior angle (TP-GEO-01) | `triangle` + `exterior: {at: 1, label}`, `notToScale` | Side 0→1 extended (dashed) beyond vertex 1, with an arc between the extension and side 1→2. The two opposite interior angles are labelled at vertices 0 and 2, the adjacent interior angle stays unlabelled, and the figure is captioned "Not to scale" | "A triangle (not drawn to scale) with one side extended. The two interior angles opposite the exterior angle are 39° and 112°; … the exterior angle is marked ?" |
| 4 | Crossing lines (TP-GEO-02) | `angle` + `cross`, `labels[4]` | Both lines pass through the vertex in both directions, drawn to scale at `deg`. Each label sits on its own angle's bisector, moved further out for narrow angles: 0 the given θ, 1 its neighbour, 2 opposite, 3 the other neighbour | "Two straight lines crossing at a point, making four angles: the first angle is 128°; the angle opposite the first is marked ?" |
| 5 | Area model (TP-ALG-01) | `grid` + `labels` (row-major), `rowLabels`, `colLabels` | Larger cells with one centred label each, row labels to the left and column labels above | "… the top side is labelled 5x and 2; the left side is labelled 5x and 2; the parts, row by row, are 25x², 10x, 10x, 4" |

In `Learn.tsx`, strategy screens send `strips` with `bottomShaded` or `labels` to `Figure`. Legacy strips keep their existing path unchanged.

## Protection against impossible or misleading data

Before drawing, each new form is checked. Data that does not fit together is **not drawn**. Instead, the figure says "Picture not available: its numbers do not fit together." (also as its aria-label, marked `data-invalid`).

| Visual | Refused when |
|---|---|
| Strips | Parts are not whole numbers from 1 to 60; shading exceeds the parts; the row labels are not exactly two; a fraction label (n/d) is not the fraction that row shows |
| Rectangle / square | Labelled opposite sides differ (or a square's sides differ). Blank labels are not compared, so partly labelled figures stay valid |
| Exterior angle | Any of these: `at` is not 1; a label is not a number of degrees, "?" or blank; the angles are not between 0° and 180°; the interior angles add to 180° or more; the exterior angle is not the sum of the two opposite angles; the exterior and adjacent angles are not on a straight line; an opposite angle is not smaller than the exterior angle; it is drawn on a right-triangle figure |
| Crossing lines | θ is below 15° or above 165° (the labels cannot sit between the lines, so the figure is refused rather than drawn unreadably; the `afcross` pool uses 21–159°); there are not exactly four labels; a numeric label is not θ (angles 0 and 2) or 180° − θ (angles 1 and 3) |
| Labelled grid | Label counts do not match the rows, columns or cells; a square area model (same row and column labels) is not symmetric; when every side and cell label is a monomial (25x², −24x, ab, 4), a cell is not its row label × column label |

## Evidence

| Check | Result |
|---|---|
| `frontend/src/year/figure-visuals.test.ts`: real `Figure` server-rendered, SVG geometry parsed | **8/8 pass** |
| Corrected package examples (strips 1/9 vs 1/11 and 1/3 vs 1/9; the two exterior-angle examples; crossing 128° and 149°; area models (5x + 2)² and (3x − 8)²; the 10 cm × 9 cm outline) | All render, with descriptions |
| Every pool item (data as the packages build it) | strips: all 500 `adfcmp` items; exterior angle: all 400 `ahext` items; crossing lines: all `afcross` items, plus 3°, 10°, 170° and 177°; area model: every `ahid` (px ± q)² item; outline: every `aeperar` perimeter item |
| Refused inputs | 22 impossible or misleading inputs are not drawn, each with the fallback text |
| Legacy pictures: every family figure (first 40 items of each pool), every teaching-alternative visual and every module widget, old vs new `Figure` | **21,321 of 21,322 identical** (markup and description). The one difference is the existing identities module widget `{grid 2×2, labels: a², ab, ab, b²}`, which now shows its labels |
| Typecheck: `tsc -p tsconfig.json`, `tsc -p tsconfig.english.json` | Clean |
| Typecheck: `tsconfig.mathematics-integration.json` | Clean for the changed files. The base fails to load `bun` types in this environment both before and after the change; with `--types node`, the only errors are the existing `bun:test` imports |
| Screenshots: `screenshots/<n>-mobile.png` (375 px) and `<n>-desktop.png`; 1 strips, 2 perimeter, 3 exterior angle, 4 crossing lines, 5 area model, 6 refused data and legacy | Inspected; no horizontal overflow at 375 px |
| Independent review of placement and accessibility (a separate agent, working from the rendered SVG and its own geometry) | **No blockers. Placement is correct** for every pool item and for its edge cases. Legacy pictures are identical, and the descriptions never give the answer. Its four should-fix findings were fixed, and the tests were extended: a strip label that disagrees with its row; an area-model cell that is not row × column; empty cell labels in the description; crossing-line labels overlapping the lines at very narrow angles. Notes acted on: the crossing lines were clipped near 90° (viewBox 200 → 240); long row labels were clipped; `notToScale` on a plain triangle now draws its caption; outline now applies to unnamed polygons; and `cross` must be `true`, not just truthy |

## Remaining limits

- **Package integration is Codex's.** The TP-NUM-01 and TP-GEO-01 integration screens on `feat/math-teaching-content` still carry no widget (`visualBlocked`). They can now use the V1 and V3 data once the packages are integrated.
- **The package `description` field is not used.** The aria text is always generated from the drawn data, so it cannot drift from the picture.
- **Not to scale.** The exterior-angle triangle has fixed vertices, so a labelled 112° may be drawn at about 79°. The caption and description say so. Crossing lines are drawn to scale.
- **Legacy strips still use the old Learn path**, which derives the second row as `round(shaded × bottom / top)`. That is wrong for comparisons (for example 1/2 vs 1/4) and for some existing family data, such as `achalf`'s "fold" strips with `top: 1`. It is unchanged here, because changing it would alter existing teaching. Families should move to `bottomShaded`.
- **Other existing defects, unchanged:**
  - the legacy rectangle `shape` places its right-side label across the edge;
  - its description reads "A 0-sided shape" when `name` is missing.

  The new outline mode avoids both.
- **The monomial check covers only labels that parse as monomials.** Labels such as "3x + 1" are not checked, only drawn.
- **Unit spelling counts in the rectangle check.** "10cm" and "10 cm" count as different labels, so the figure is refused.
- **Vertex letters are not drawn.** The TP-GEO-01 concept text names vertex "C"; that needs a vertex-name field if the text keeps the letter.
