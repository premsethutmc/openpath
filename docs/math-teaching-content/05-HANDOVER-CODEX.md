# 5. Handover for Codex integration

Codex owns shared skill contracts, diagnosis and selection, grading, evidence, persistence and application integration. This branch changes **nothing** outside `docs/math-teaching-content/`. Nothing is registered, served, activated or approved.

## What to integrate (per package, in `batch-1/<id>.json` → `integration`)

| Proposal | Target (not written here) | Shape |
|---|---|---|
| `strategyProposals[]`: one `fix_<bug>` per targeted misconception | strategies of the served module for the competency (`content.ts` `modules`; for synthesised modules the generator is `library.ts`, for authored modules `content/learning/modules.v1.json`) | The same shape as linear equations' `mistake()` strategies (`packages/learning/scripts/linear-equations-module.ts`): screens `misconception` → `worked-example` → practice, with `instance`, `guided` and `check` ids. The screen text is in `misconceptions[].screens`. |
| `registryProposal[]` | `content/learning/explanation-review.v1.json` | `misconceptionSpecific: true`, `addresses: <bug id>`, status `pending_review`, scope `demonstration`. The content hash must be computed from the integrated revision. |
| `generalStrategyProposal` | the same module | A selectable concept explanation for families that today have a chapter screen only: concept + visual + worked examples + the alternative explanation. |
| `diagnostic[]` with `readings` | diagnosis/selection (Codex) | Item ids plus what each answer suggests. `fromPhase: "check"` marks a candidate taken outside the diagnostic partition (TP-ALG-01). |
| `practice` (guided, rechecks, transfer, delayed) | the module's lists, or selection constraints | Every id is a quarantine-filtered generator instance. Rechecks and delayed checks are restricted to items on which a target error is still possible. |

Before integrating, rerun `tools/build.mts` against the target commit. Ids, partitions and quarantine may change; the build fails loudly if an item no longer validates.

## Policy questions for Codex (not decided here)

1. **Two matches from different causes.** misconception-evidence@1 establishes a misconception from two matching answers. In TP-NUM-01 (same-top greater/smaller items) a plain greater/smaller confusion produces the same two matches; only a same-bottom contrast item separates the two. In TP-MEA-01, `two-sides` on an area item and on a perimeter item are different errors. Should "established" require a contrast or item-diversity condition?
2. **Teaching for non-seed families.** 726 families have a chapter screen only (01). Should selection be allowed to choose a per-family general explanation when the diagnosed family is not the seed?
3. **Visual types.** Proposals need new `Visual` kinds: an exterior-angle triangle, crossing lines, a perimeter outline, two equal-length fraction strips, and a labelled 2×2 area model. Renderer ownership is not decided.
4. **Re-partitioning.** The `ahid` diagnostic partition has no unambiguous `(px + q)²` middle-coefficient item.

## Existing content defects found (not fixed: runtime files are outside this workstream)

| Where | Defect | Extent |
|---|---|---|
| `packages/learning/src/fam/b05.ts:1328`, `aedecc` bug `longer-is-larger` `says` | Says "<w.uv> was taken as greater because uv is more than t". This is **false** when the two hundredths digits read as a number are ≤ t (e.g. "0.03 … because 03 is more than 5"). | 14 of 154 items carrying this bug. TP-NUM-03 uses its own wording. |
| `packages/learning/src/fam/b08.ts:2232`, `ahid` `explain` for the `2ab` step | For (px − q)² it prints "2ab = 2 × x × 3 = -6x": the factor b is shown as +3 while the product is negative. It also prints "1x²" for p = 1. | All 126 `(a − b)²` items (form 1). |
| Competency graph | `MATH.geometry.triangle-properties` has only `basic-constructions` as a mandatory prerequisite. The exterior-angle theorem needs angles on a straight line (`MATH.geometry.angle-pairs`). | Suspected graph gap, for curriculum review. |
| Competency graph | `MATH.number.decimal-tenths` has `MATH.number.fraction-add-like` as its only mandatory prerequisite. Decimal place value (tenths, hundredths) builds on fractions as parts of a whole and on whole-number place value, more than on adding like fractions. | Questionable edge, for curriculum review. |
| `packages/learning/src/fam/b06.ts` (`afcross`) bug `opposite-as-linear` `says` | "they do not add up to 180°" is false as a general statement at 90°. No served item has 90° (domain checked), so the statement is never false on a served item. | Wording only. TP-GEO-02 uses its own wording. |
| `fadd` | No `teach.alternatives` and no `word` form, so there is no transfer item for a grade-4 core skill. | Content gap. |

## Reused sources (exact)

- Generator families: `adfcmp` (`fam/b04.ts:427`), `fadd` (`families.ts:116`), `aedecc` (`fam/b05.ts:1301`), `aeperar` (`fam/b05.ts:861`), `ahext` (`fam/b08.ts:1199`), `afcross` (`fam/b06.ts:1266`), `akmed` (`fam/b11.ts:1729`), `ahid` (`fam/b08.ts:2188`), `akdice` (`fam/b11.ts:803`). From these the batch reuses:
  - prompts, answers and phase partitions;
  - `bugs` (ids, kinds, predictions, `says` unless overridden);
  - `teach.idea`/`method`/`alternatives` (e.g. `via_third`, `go_round`, `cross_off`, `area`, `multiply_out`, `tree`, `money`, `draw_both`, `sharing`, `act_it`);
  - `explain` step text (quoted in worked examples).
- Visual types: `grid`, `triangle`, `angle`, `table` from `family-kit.ts` `Visual`.
- Engine contracts read, not changed:
  - the trusted grader `server-grader.ts`;
  - `question-status.ts` `selectable`;
  - `misconception-evidence` policy (`docs/teaching-content-safety/05-…`);
  - the `mistake()` strategy shape (`linear-equations-module.ts`);
  - `explanation-review@1`;
  - G5 findings (`docs/geometry-cross-domain-validation/`).
- openpath-research: `docs/product/subjects/SUBJECT_CONTRACTS.md` (maths: distinguish slip / procedural / conceptual; worked examples, counterexamples, transfer; not final-answer-only) and `docs/product/content/CONTENT_PIPELINE.md` (item fields: tagged misconceptions, roles, provenance, reviewer status).
