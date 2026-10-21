# Universal teaching presentation

## Architecture trace

1. `family-kit.ts` defines a deterministic mathematical family: parameters, solver steps, validation, misconceptions, teaching hints and optional typed visual data.
2. `library.ts` synthesises the family and an authored blueprint into the canonical module library. It assigns diagnostic, teaching, practice, transfer and retention questions without changing the mathematics.
3. `teaching-presentation.ts` resolves scope from `module.pool` and family metadata, then adapts a module screen and a real family problem to `openpath-teaching-presentation@1`. The contract carries the concept, objective, explanation, ordered worked steps, typed visual, misconception explanation and canonical practice references. Each typed adapter is validated against the same family problem before rendering.
4. `TeachingContent.tsx` renders that contract through `TeachingVisualRenderer`. The renderer switches on the visual data's `kind`; it does not route by grade, board or competency.
5. `PreviewExperience.tsx` uses the same teaching and keyboard practice components without API writes. `CurriculumPractice.tsx` uses the canonical authenticated `Ask`/`Feedback` path and evidence ledger. Both disclose when the existing valid question pool is exhausted.

The first typed adapters cover place-value charts, number-line movement, fraction strips, Cartesian grids, equation transformations and labelled rectangles. Place-value digits are extracted by decimal position from the family's validated answer. These adapters translate existing family parameters and figures; they do not solve questions or introduce a content database.

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
