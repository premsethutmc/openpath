# Shared answer-contract integration checkpoint

This local follow-on starts from green PR98 `6c2dadadbcaa33eab553f0db63ad2743ab743594`, incorporates PR99 `1bfb1e1352a3f5abf8c33d0d8e950c2c5f9476f2` and stages PR100 `559697b2489049162bb9ae2be0843aaee72e993d`. It is not merged, deployed, educator approved, or a completed curriculum claim. The canonical product tracker remains `openpath-research/dashboard/data/architecture.json`.

## Behavior and reused contracts

- `validSkillTask` now uses the existing trusted grader on the actual requested question form. Fraction, choice, ordered tuple and set tasks are no longer rejected merely because their answers are not JavaScript numbers. Unsupported forms, quarantine and contract holds remain refusals. This grants answer credit only, not method credit or automatic domain mappings.
- Existing canonical answer handling is tested for equivalent forms, raw diagnosis and ordered tuples. A narrowly scoped hours/minutes session demonstrates fresh checks, saved replay, delayed checking and recovery without claiming all tuple tasks are connected.
- The curriculum fraction renderer distinguishes equal and unequal comparisons and refuses invalid strip data. PR99's other renderers remain its implementation.
- PR100's grid test now narrows the visual type explicitly, fixing its TypeScript failure without weakening the mathematical assertions.
- The existing `fix_assume_tens` explanation is constrained to `scaled-bars.total@1`; its guided and fresh questions now test the same skill. Its changed explanation and module revisions remain pending review; earlier review history is retained.
- Readiness no longer suppresses retention/recovery of an exact target already demonstrated through persisted server decisions. Initial prerequisite readiness is unchanged. Ignored events and conflicting duplicate IDs cannot lend trusted provenance. Prerequisite mastery is not manufactured.

## Evidence

`bar-browser-results.json` records the actual Year UI and Django flow: two diagnostic questions, two teaching screens, independent fresh total question, save/reload and a delayed same-skill question with saved replay. This is one bounded candidate teaching path using the explicit acceptance-test build; that build must not be deployed.

Local checks at checkpoint `ad0780d`: the full Node 24 aggregate completed with 865 passed, zero failed and one existing optional phone-browser test skipped because that test could not locate a browser (1,540,268 ms). The final shared-contract/readiness group also has 16 passing Node 22 checks, with four readiness checks passing Node 24. All three frontend TypeScript configurations and seven affected backend tests pass. Independent review's duplicate-provenance finding was fixed and re-reviewed. The seven modified family specification fingerprints are unchanged; the trusted grader and its input manifest were rebuilt together. This aggregate predates the PR101 reconciliation below; it is not a final combined-candidate or remote CI claim.

## PR101 reconciliation

PR101 `cffd0c4dd32aee26c2d710e9681cb9d55e35e59c` adds candidate teaching and conversion mappings. Its half-picture authoring filter fixed worked/guided/check examples only. The subsequent shared tuple integration below fixes runtime evidence classification; `known-mapping-gap.json` preserves the before/after regression evidence.

The combined source preserves the original total intervention `fix_assume_tens` byte-for-byte at explanation hash `sha256:b196094b658057a96ba8addfba5044fe039077e9032d9f0ed610a9dd78065d92`. PR101's read-bar intervention is `fix_assume_tens_read`, with its own pending review. The authoring script reserves the retained total exposures, so regeneration preserves that distinction. Both source branches' complete module histories and explanation revisions were checked as preserved in order; no approval was added.

The shared connection predicate now excludes prerequisite-kind and prerequisite-only explanations from target teaching. Optional prerequisite help stays available. Conversion tests verify supported native-choice answer contracts and reject unsupported variants; prepared choice mappings remain unregistered pending domain review. Historical numeric-only claims in the breadth handover are superseded explicitly.

Reconciliation validation: 96 of 97 focused checks initially passed; the obsolete scaled-bar template-preservation assertion was replaced with a pinned preservation check for the retained total intervention, and all 14 candidate tests then passed. Another 28 shared compatibility tests, all three frontend typechecks and seven backend tests passed. `pr101-bar-browser-results.json` demonstrates the retained total intervention in the actual app, with fresh check `gen:afbar:1,2,13`, save/reload and delayed check `gen:afbar:3,2,7`. The new combined grader records 214 source inputs. The subsequent full aggregate on `6a9ce36` passed 907 checks, zero failures and one optional phone-browser skip (1,635,307 ms). That run predates the tuple/routing changes; exact-head remote CI remains a separate gate.

## Versioned half-symbol correction

Claude's `81923a1` handoff supplied the finite row relation and regression cases. Independent enumeration verified all 275 genuine rows among 472 valid row tasks (142 genuine among 242 served tasks). The integrated `pictographs-subskills@3` / `pictographs-subskill-projection@3` (first labelled @2 here, renumbered because PR101's withdrawal already used @2; see `PICTOGRAPHS_MAPPING_HISTORY`) uses that supplied data as complete `parameterTuples`, with the data declared before the configuration reads it.

`gen:acpicthalf:0,8,1,0` still earns ordinary correct-answer credit, but no half-symbol evidence. The three former TODO regressions are enabled and pass. The strengthened tests require actual assessment, delayed checking and recovery, and show that old whole-row answers remain unchanged in the ledger while the explicitly versioned projection no longer overclaims their meaning. All 52 Node 22 tuple/domain tests pass with zero TODOs. The correction is isolated on Codex's integration branch; no Claude branch was changed, and a forthcoming interim exclusion must not overwrite this verified relation.

The same blueprint authoring command produces byte-identical output after adopting the tuple mapping: no question partition, teaching prose or explanation approval changed. The current generated audit includes the explicit tuple relation. Remaining breadth/content limitations and market-release evidence requirements are unchanged. Final aggregate and exact-head CI results must be recorded separately; passing local regressions do not approve or deploy this candidate.

## Shared mapping contract for Claude

`SubSkillDef.parameters` is one conjunction of independent allowed values. It cannot express all selected-row half-picture cases: `gen:acpicthalf:0,3,1,0` has seven halves and `gen:acpicthalf:0,8,3,0` has five, but combining their seed/row values also admits `gen:acpicthalf:0,8,1,0`, which has two halves (one whole picture).

The final shared extension is optional `parameterTuples`: complete generator parameter vectors, matched by exact membership and AND with any existing `parameters`. For example, a **test-only subset**, not the full domain mapping:

```ts
parameters: [{ index: 3, values: [0] }],
parameterTuples: [[0, 3, 1, 0], [0, 8, 3, 0]],
```

Every tuple is validated for full generator arity, dense safe-integer values, uniqueness and the existing family rejection/bounds contract, including tuples that do not match the current question. Empty or malformed lists fail closed. The actual selected question still passes generator construction and the trusted answer contract. Overlapping different skills still abstain. No display-text predicates or new solver are introduced. Existing teaching scopes that name the subskill, task validity, projection, selection and the connection audit reuse the same classifier. The field itself does not automatically register domain mappings; the pictograph adoption is an explicit versioned integration of Claude’s supplied data.

The preliminary unpublished `parameterCases` experiment was replaced by this smaller tuple allowlist: complete tuples allow direct generator-bound validation without enumerating Cartesian combinations. No production mapping used that preliminary field.

Claude's `81923a1` handoff supplies `HALF_SYMBOL_ROWS` as 275 unique `ki,s,j` strings. The contract consumer appends the fixed row-task parameter `0` to obtain full four-parameter tuples; it must version the mapping/projection, preserve immutable learner records and verify the actual worked/guided/fresh/delayed pools. If a required role is missing, report that gap rather than broadening evidence. The handoff’s three TODO regressions are now active tests in the corrected mapping.

Native choice support uses the actual served variant through the trusted grader. Prepared choice registration remains an explicit domain decision. Neither answer support nor a correct final answer establishes method evidence or a specific misconception.

## Final tuple and recovery validation

The final tuple contract passes four focused tests on Node 24 and the combined tuple/domain group passes 52 tests on Node 22, with no skipped or TODO regressions. Six readiness/routing tests also pass on Node 22; all three TypeScript configurations and seven affected backend tests pass. The generated grader's bundle hash and all 214 source-input hashes match. Blueprint regeneration is byte-identical, so unchanged library/review outputs are reused.

The actual browser initially exposed an additional routing defect: a correct scoped recovery plan was suppressed by the ordinary chapter's initial diagnostic. The narrow shared `withFoundation` fix lets supported recovery override initial exploration, while preserving active investigation, teaching, pause, handover and review ownership. Independent review found no blocking gate regression.

`half-row-browser-results.json` now passes through the real Year UI and Django: whole-row answers keep ordinary credit without half-symbol credit; a genuine half-picture delayed question fails; two fresh same-skill recovery questions restore independent demonstration; stored events/decisions survive reload unchanged. This test makes no teaching or all-curriculum completion claim. Its 1.9–2.6 second page-ready measurements are synthetic test-build observations, not production or competitor benchmarks.
