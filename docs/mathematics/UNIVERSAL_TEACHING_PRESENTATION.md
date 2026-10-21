# Universal teaching presentation

## Architecture trace

1. `family-kit.ts` defines a deterministic mathematical family: parameters, solver steps, validation, misconceptions, teaching hints and optional typed visual data.
2. `library.ts` synthesises the family and an authored blueprint into the canonical module library. It assigns diagnostic, teaching, practice, transfer and retention questions without changing the mathematics.
3. `teaching-presentation.ts` resolves scope from `module.pool` and family metadata, then adapts a module screen and a real family problem to `openpath-teaching-presentation@1`. The contract carries the concept, objective, explanation, ordered worked steps, typed visual, misconception explanation and canonical practice references. Each typed adapter is validated against the same family problem before rendering.
4. `TeachingContent.tsx` renders that contract through `TeachingVisualRenderer`. The renderer switches on the visual data's `kind`; it does not route by grade, board or competency.
5. `PreviewExperience.tsx` uses the same teaching and keyboard practice components without API writes. `CurriculumPractice.tsx` uses the canonical authenticated `Ask`/`Feedback` path and evidence ledger. Both disclose when the existing valid question pool is exhausted.

The first typed adapters cover place-value charts, number-line movement, fraction strips, Cartesian grids, equation transformations and labelled rectangles. Place-value digits are extracted by decimal position from the family's validated answer. These adapters translate existing family parameters and figures; they do not introduce a content database. `validateTeachingPresentation` independently checks the family arithmetic, the ordered step operations and each visual invariant before React receives the contract.

The screen audit retains the module's opening concept screen and every non-duplicate strategy screen whose guided problem belongs to the selected family scope. Screens belonging to another family in a broad competency module are left for that family's own teaching sequence. This prevents Cartesian-product counting from silently including relation-property teaching while retaining meaningful alternatives such as the ordered-pair grid.

## Support boundary

The presentation contract reports `status: "unsupported"` and an `unsupportedReason` when a module has no deterministic family example, ordered worked steps, or a typed diagram that passes its mathematical invariants. The learner interface says that a checked worked example is unavailable instead of generating generic mathematics.

Current limitations:

- Explicit family adapters currently cover `aeind`, `aiint`, `eqfrac`, `fadd`, `adfcmp`, `adfname`, `adshade`, `aocart`, `apcartn`, `lin`, `ahone`, `lneg`, `rect`, `aearea` and `rperim`. Other families receive their existing typed `Visual` only where the generic visual conversion is mathematically unambiguous; otherwise they render checked worked text without a new diagram.
- Labelled geometry currently validates rectangles. Triangle, circle, construction and proof families are not claimed as supported by the labelled-geometry adapter; their existing `Figure` rendering remains in use where supplied.
- Fraction strips cover existing single-strip parameterisations. Mixed numbers and unlike-fraction comparisons need a family visual that supplies the optional comparison strip.
- Equation transformations show the existing deterministic operation sequence. They do not typeset arbitrary LaTeX or infer missing algebraic steps.
- Place-value charts depend on a family supplying column headings or the supported Indian place-value parameter contract.
- Family pools are finite. Practice stops with an explicit exhaustion message when no unseen valid variation remains.
- All current content remains provisional unless its existing review registry says otherwise.

## Adapter audit

The parameter tuple below is the family generator's canonical tuple. Every adapter uses the existing family solver as its source, then applies the separate checks listed here.

| Family | Concept and parameters | Independent answer and step checks | Diagram boundary |
| --- | --- | --- | --- |
| `aeind` | Indian place value `[lakhs, thousands, hundreds, remainder]` | Reconstruct the integer and its lakh/thousand/remainder components by decimal position. | Six columns through lakhs; values outside the safe six-digit range are unsupported. |
| `aiint` | Integer addition/subtraction `[a,b,operation]` | Calculate `a+b` or `a-b`; verify the signed movement and endpoint. | One movement on a number line, including zero and negative movement. |
| `eqfrac` | Equivalent fractions `[numerator, denominator, target denominator]` | Require an integer scale factor and exact cross multiplication; check divide then multiply steps. | Two strips of the same whole. Zero denominators and improper shaded regions are rejected. |
| `fadd` | Like-denominator fraction addition/subtraction `[a,b,denominator,sign]` | Calculate `(a ± b)/denominator` exactly and check the numerator operation. | Worked mathematics is supported; an operation diagram is not yet supported because an equivalence strip would misrepresent addition. |
| `adfcmp` | Fraction comparison `[mode,common value,x,y,selection]` | Build both fractions and choose by exact cross products. | Two same-length wholes. Invalid denominators or shading are rejected. |
| `adfname` | Name a shaded fraction `[rows,columns,shaded]` | Verify total cells and `shaded/total`. | A strip representation of the same part-to-whole count. |
| `adshade` | Fraction of a grid `[rows,columns,numerator,denominator]` | Require an integral shaded count; verify divide then multiply. | Shading is checked against total grid cells. |
| `aocart` | Cartesian-product counting `[m,n,mode]` | Calculate `m×n`, `2^(m×n)`, or the missing set size according to mode. | Product count and missing-size modes use an `m×n` grid; relation counting needs a subset visual and is explicitly unsupported. |
| `apcartn` | Product cardinality variants `[variant,m,n,overlap]` | Check the variant formula and final deterministic step. | Two-set product and intersection are supported; triple product and union variants require different visuals. |
| `lin` | Two-step linear equation `[coefficient,constant,solution]` | Reconstruct the original right side, then verify subtract and divide are equivalent transformations and the solution satisfies the original equation. | Structured equation lines only; arbitrary algebraic text is never treated as proof. |
| `ahone` | One-step equation `[form,operand,right-side seed]` | Apply the inverse operation and substitute the result into the original equation. Division form correctly distinguishes the displayed right side from the solution. | Structured equation lines for add, subtract, multiply and divide forms. |
| `lneg` | Linear equation with negative values `[coefficient,constant,solution]` | Same solution-set and substitution checks as `lin`, including negative coefficients and constants. | Structured equation lines. |
| `rect` | Rectangle area `[length,width]` | Verify positive dimensions, multiplication, answer and square-centimetre units. | Labelled rectangle. |
| `aearea` | Area by unit squares `[rows,columns]` | Verify positive dimensions, unit-square count and multiplication. | Labelled rectangle with generic units and square units. |
| `rperim` | Rectangle perimeter `[length,width]` | Verify `length+width`, doubling, final answer and centimetre units. | Labelled rectangle. |

The generator domain, `reject` predicate and optional `keep` predicate define supported input parameters. Cases outside those constraints are not silently repaired. A mathematically valid worked example may also carry `diagramUnsupported`; this prevents the UI from claiming that an unrelated diagram verifies the operation.
