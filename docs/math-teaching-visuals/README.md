# Mathematics teaching visuals (visuals@2): handover

**Branch:** `feat/math-teaching-visuals`, from `df0521db` (the `feat/math-teaching-connections` head).
**Specification and corrected package data:** `feat/math-teaching-content` at `4e655e73`: `docs/math-teaching-content/09-MISSING-QUESTIONS-AND-VISUALS.md` V1–V5, and the TP-NUM-01 and TP-GEO-01 explanation visuals. That branch is not changed here.

**Scope: renderer only.**
- `frontend/src/year/Figure.tsx`: drawing, `describe()` and the strips policy.
- `frontend/src/year/Learn.tsx`: `Picture` and an optional `competency` prop on `Lesson`.
- `frontend/src/year/StudySession.tsx` and `frontend/src/curriculum/TeachingContent.tsx`: pass the lesson's competency to the picture.
- Tests: `frontend/src/year/figure-visuals.test.ts` and `frontend/src/year/learn-visuals.test.ts` (the learner path).

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
| 3 | Exterior angle (TP-GEO-01) | `triangle` + `exterior: {at: 1, label}`, `notToScale`, optional `vertices: [n0, n1, n2]` and `extendedTo` | Side 0→1 extended (dashed) beyond vertex 1, with an arc between the extension and side 1→2. The two opposite interior angles are labelled at vertices 0 and 2, the adjacent interior angle stays unlabelled, and the figure is captioned "Not to scale". With `vertices`, the names are drawn outside each corner, and `extendedTo` at the end of the extension | Unnamed: "A triangle (not drawn to scale) with one side extended. The two interior angles opposite the exterior angle are 39° and 112°; … the exterior angle is marked ?". Named: "Triangle with vertices A, C and B (not drawn to scale). Side AC is extended beyond C to D, making an exterior angle at C. The interior angles opposite it, at A and B, are 39° and 112° …" |
| 4 | Crossing lines (TP-GEO-02) | `angle` + `cross`, `labels[4]` | Both lines pass through the vertex in both directions, drawn to scale at `deg`. Each label sits on its own angle's bisector, moved further out for narrow angles: 0 the given θ, 1 its neighbour, 2 opposite, 3 the other neighbour | "Two straight lines crossing at a point, making four angles: the first angle is 128°; the angle opposite the first is marked ?" |
| 5 | Area model (TP-ALG-01) | `grid` + `labels` (row-major), `rowLabels`, `colLabels` | Larger cells with one centred label each, row labels to the left and column labels above | "… the top side is labelled 5x and 2; the left side is labelled 5x and 2; the parts, row by row, are 25x², 10x, 10x, 4" |

### Legacy fraction strips (revised)

Legacy strips data `{top, bottom, shaded}` states only the **first** fraction. The old renderer derived the second row as `round(shaded × bottom / top)`. That picture is an equivalence, and the same data also comes from comparisons: the `b04` unit-fraction comparison sends `{top: 2, bottom: 4, shaded: 1}` for 1/2 vs 1/4 and drew 2 of 4 shaded. So, on both learner paths (`Learn.tsx` `Lesson`/`Picture` and the curriculum `TeachingContent`):

| Strips data | Lesson | Shows |
|---|---|---|
| `bottomShaded` (and optional `labels`) | any | Two equal wholes, each with its own shading (`Figure`) |
| Legacy, derived shading exact | an equivalence lesson (`EQUIVALENCE_COMPETENCIES`: `MATH.number.equivalent-fractions`) | **Preserved**: the existing two-row picture (for example 1/2 = 4/8), now with a description that says "the same amount" |
| Legacy one whole: `{top: 1, bottom: k, shaded: 1}` (1 = k/k) | any | **Preserved**: both strips fully shaded; true in any lesson (`acequal` "equal parts") |
| Legacy, derived shading not exact, or any other lesson | — | **Text:** "A strip in 2 equal parts with 1 shaded. A second strip, in 4 equal parts, is not drawn because how much of it is shaded is not given" |
| First shading beyond its parts; labels without `bottomShaded` | — | "Picture not available …" |

The equivalence mark is a JavaScript `Symbol`, set only by `stripsFor` from the lesson's competency. Content data (JSON) cannot set it, so `equivalent: true` in data is ignored.

In today's content:
- **Kept:** 2 legacy module pictures, both in the equivalent-fractions lesson.
- **Now text (5):**
  - fraction comparison 3/8 vs 5/8, which drew two 3/8 strips;
  - fraction models;
  - unit fractions;
  - two ratio-division pictures.
- **Refused (1):** the unit-fractions "fold" strip, `{top: 1, bottom: 4, shaded: 2}`.
- **Alternatives:** the `b04`, `b03` and `b09` family alternatives have no lesson context, so they are now text where they previously showed "A picture" or a derived picture.

## Protection against impossible or misleading data

Before drawing, each new form is checked. Data that does not fit together is **not drawn**. Instead, the figure says "Picture not available: its numbers do not fit together." (also as its aria-label, marked `data-invalid`).

| Visual | Refused when |
|---|---|
| Strips | Parts are not whole numbers from 1 to 60; shading exceeds the parts; the row labels are not exactly two; a fraction label (n/d) is not the fraction that row shows |
| Rectangle / square | Labelled opposite sides differ (or a square's sides differ). Blank labels are not compared, so partly labelled figures stay valid |
| Exterior angle | Any of these: `vertices` are not three distinct capital letters (an optional ′ allowed), or `extendedTo` repeats one of them; `at` is not 1; a label is not a number of degrees, "?" or blank; the angles are not between 0° and 180°; the interior angles add to 180° or more; the exterior angle is not the sum of the two opposite angles; the exterior and adjacent angles are not on a straight line; an opposite angle is not smaller than the exterior angle; it is drawn on a right-triangle figure |
| Crossing lines | θ is below 15° or above 165° (the labels cannot sit between the lines, so the figure is refused rather than drawn unreadably; the `afcross` pool uses 21–159°); there are not exactly four labels; a numeric label is not θ (angles 0 and 2) or 180° − θ (angles 1 and 3) |
| Labelled grid | Label counts do not match the rows, columns or cells; a square area model is not symmetric (compared as single terms); a labelled cell is not its row label × column label. The product check is exact for **single terms only** (25x², −24x, ab, 4). When a model has side labels and a labelled cell whose row, column or cell label is **compound** (x + 3, 10x + 0), it cannot be checked, so it is **not drawn**: "Picture not available: its labels cannot be checked." A labelled cell with no side labels claims no product and is drawn. A cell with only one side's labels cannot be checked and is refused |

## Evidence

| Check | Result |
|---|---|
| `frontend/src/year/figure-visuals.test.ts` (real `Figure` server-rendered, SVG geometry parsed) and `learn-visuals.test.ts` (rendered through `Learn.tsx` `Lesson`) | **17/17 pass** |
| Learner path (`learn-visuals.test.ts`) | Covered: 1/2 vs 1/4 with both fractions stated (equal wholes, 1 of 2 and 1 of 4); the same legacy data in a comparison lesson and with no context (text, no picture); preserved equivalences 1/2 = 2/4, 1/2 = 4/8 and 2/3 = 4/6 (two-row picture, correct shading); an inexact equivalence (text); missing or inconsistent comparison data (refused); a named exterior angle (names at their corners, description matches, bad names refused); area models (single terms drawn, a wrong product refused, compound labels true or false both "cannot be checked"); **phone width 375 px**, checked in Chromium with no horizontal overflow |
| Corrected package examples (strips 1/9 vs 1/11 and 1/3 vs 1/9; the two exterior-angle examples; crossing 128° and 149°; area models (5x + 2)² and (3x − 8)²; the 10 cm × 9 cm outline) | All render, with descriptions |
| Every pool item (data as the packages build it) | strips: all 500 `adfcmp` items; exterior angle: all 400 `ahext` items; crossing lines: all `afcross` items, plus 3°, 10°, 170° and 177°; area model: every `ahid` (px ± q)² item; outline: every `aeperar` perimeter item |
| Refused inputs | 22 impossible or misleading inputs are not drawn, each with the fallback text |
| Legacy pictures: every family figure (first 40 items of each pool), every teaching-alternative visual and every module widget, old vs new `Figure` | **21,237 of 21,322 identical.** The differences are the 84 legacy strips reaching `Figure` without lesson context (previously the placeholder "A picture", now the text above, or "not available" for invalid data) and the identities widget, which now shows its labels |
| Typecheck: `tsc -p tsconfig.json`, `tsc -p tsconfig.english.json` | Clean |
| Typecheck: `tsconfig.mathematics-integration.json` | Clean for the changed files. The base fails to load `bun` types in this environment both before and after the change; with `--types node`, the only errors are the existing `bun:test` imports |
| Screenshots: `screenshots/<n>-mobile.png` (375 px) and `<n>-desktop.png`; 1 strips, 2 perimeter, 3 exterior angle, 4 crossing lines, 5 area model, 6 refused data and legacy, **7 learner path** (`Learn.tsx` `Lesson`: 1/2 vs 1/4, legacy text, preserved equivalence, named exterior angle, area models) | Inspected; no horizontal overflow at 375 px |
| Independent review 2 (focused: legacy strips, vertex names, area-model honesty, learner path) | **No blockers.** No misleading strip picture and no unchecked label reaches a learner on any path. Acted on:
- one whole = k/k is now drawn in any lesson (`acequal`);
- the equivalence mark can no longer be set from data;
- labels without the second shading now give their own message;
- products beyond exact arithmetic (> 10⁶) are not checked;
- zero products compare equal;
- look-alike vertex names (`A'` vs `A′`) are refused;
- a test checks that every learner path passes the competency. |
| Independent review 1 (placement and accessibility; a separate agent, working from the rendered SVG and its own geometry) | **No blockers. Placement is correct** for every pool item and for its edge cases. Legacy pictures are identical, and the descriptions never give the answer. Its four should-fix findings were fixed, and the tests were extended: a strip label that disagrees with its row; an area-model cell that is not row × column; empty cell labels in the description; crossing-line labels overlapping the lines at very narrow angles. Notes acted on: the crossing lines were clipped near 90° (viewBox 200 → 240); long row labels were clipped; `notToScale` on a plain triangle now draws its caption; outline now applies to unnamed polygons; and `cross` must be `true`, not just truthy |

## Remaining limits

- **Package integration is Codex's.** The TP-NUM-01 and TP-GEO-01 integration screens on `feat/math-teaching-content` still carry no widget (`visualBlocked`). They can now use the V1 and V3 data once the packages are integrated.
- **The package `description` field is not used.** The aria text is always generated from the drawn data, so it cannot drift from the picture.
- **Not to scale.** The exterior-angle triangle has fixed vertices, so a labelled 112° may be drawn at about 79°. The caption and description say so. Crossing lines are drawn to scale.
- **Legacy strips outside equivalence lessons are text only.** To show a picture there, the data must state the second fraction (`bottomShaded`): `b04` comparisons, the fraction-comparison module (3/8 vs 5/8), fraction models, unit fractions and ratio division. Data and module changes are Codex's.
- **The unit-fractions "fold" alternative is not drawn.** `achalf` sends `{top: 1, bottom: 4, shaded: 2}`, so 74 of its 103 items show "Picture not available". The old renderer drew them wrongly. The data must say what it means (for example `top: 4, shaded: q`); that is Codex's.
- **No family's own alternative strips are an equivalence lesson today.** `adfnl`, `adfunit`, `adfcmpu`, `adfordu`, `aifword` and `ajrdiv` alternatives show the text unless they move to `bottomShaded`. The preserved equivalence pictures are the equivalent-fractions module's and one-whole strips.
- **The two paths look different.** In equivalence lessons, `Learn.tsx` keeps its existing HTML rows, while the curriculum page draws the `Figure` SVG. Both have the same description.
- **The equivalence-lesson list is one competency** (`MATH.number.equivalent-fractions`). Another lesson that uses derived equivalences needs adding to `EQUIVALENCE_COMPETENCIES`.
- **Other existing defects, unchanged:**
  - the legacy rectangle `shape` places its right-side label across the edge;
  - its description reads "A 0-sided shape" when `name` is missing.

  The new outline mode avoids both.
- **Compound area-model labels are not drawn** (with side labels). The exact single-variable kernel `e6-cas` `compareExpr` can check products such as (x + 3) × x = x² + 3x. Using it would add the CAS (about 85 kB of source) to the client bundle, so that is left as a decision for Codex; until then such models are shown as text.
- **Unit spelling counts in the rectangle check.** "10cm" and "10 cm" count as different labels, so the figure is refused.
- **Vertex names need data.** The TP-GEO-01 concept text refers to vertex "C", so its widget must carry `vertices: ["A", "C", "B"]`; adding that is Codex's integration step. The renderer then draws and describes the names.
