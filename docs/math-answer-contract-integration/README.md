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

PR101 `cffd0c4dd32aee26c2d710e9681cb9d55e35e59c` adds candidate teaching and conversion mappings. Its half-picture authoring filter fixes worked/guided/check examples only: it does not fix the runtime evidence classification described below. `known-mapping-gap.json` records the exact failing expectation, separately from passing mechanical checks.

The combined source preserves the original total intervention `fix_assume_tens` byte-for-byte at explanation hash `sha256:b196094b658057a96ba8addfba5044fe039077e9032d9f0ed610a9dd78065d92`. PR101's read-bar intervention is `fix_assume_tens_read`, with its own pending review. The authoring script reserves the retained total exposures, so regeneration preserves that distinction. Both source branches' complete module histories and explanation revisions were checked as preserved in order; no approval was added.

The shared connection predicate now excludes prerequisite-kind and prerequisite-only explanations from target teaching. Optional prerequisite help stays available. Conversion tests verify supported native-choice answer contracts and reject unsupported variants; prepared choice mappings remain unregistered pending domain review. Historical numeric-only claims in the breadth handover are superseded explicitly.

Reconciliation validation: 96 of 97 focused checks initially passed; the obsolete scaled-bar template-preservation assertion was replaced with a pinned preservation check for the retained total intervention, and all 14 candidate tests then passed. Another 28 shared compatibility tests, all three frontend typechecks and seven backend tests passed. `pr101-bar-browser-results.json` demonstrates the retained total intervention in the actual app, with fresh check `gen:afbar:1,2,13`, save/reload and delayed check `gen:afbar:3,2,7`. The new combined grader records 214 source inputs. A final full aggregate and remote CI remain pending the semantic mapping correction.

## Pending dependency before publication

Claude owns domain mapping/content files. PR100's `pictographs.half-symbol@1` currently maps every `acpicthalf` row-read task, although the generator guarantees a half symbol only somewhere in the chart. For example, check item `gen:acpicthalf:0,8,1,0` asks about a row containing two halves (one whole picture), with answer 2. A selected whole-symbol row therefore does not establish the declared half-symbol skill. This mapping needs a mathematically valid scope correction from Claude before the combined candidate can be considered integration-ready. A draft may expose the implementation and this known blocker for review; it is not approval or activation. Do not silently rename or count it as a verified chain.

Claude also owns filling the 16 teaching gaps in its 17-skill batch. Those are not 17 completed teaching chains. The `aaname` unmapped explanation and numeric-only blocker text in the imported breadth documentation describe its old baseline; the shared numeric-only restriction is fixed here, but numeral-to-name still requires an explicit domain skill mapping. The connection audit snapshots have been regenerated for the combined source; they remain structural evidence, not semantic certification of the disputed mapping, and must be refreshed after its correction.

The shared implementation may be published as a separate stacked draft with the known mapping blocker explicit. After the domain handoff: reconcile only changed inputs, regenerate dependent review/manifest artifacts, validate the corrected candidate and own its exact-head CI. Keep PR98/99 stable. No merge, production deployment or content approval is implied.

## Shared mapping contract for Claude

`SubSkillDef.parameters` is one conjunction of independent allowed values. It cannot express all selected-row half-picture cases: `gen:acpicthalf:0,3,1,0` has seven halves and `gen:acpicthalf:0,8,3,0` has five, but combining their seed/row values also admits `gen:acpicthalf:0,8,1,0`, which has two halves (one whole picture).

The shared extension is optional `parameterCases`: an array of nonempty conjunctions, with OR between cases and AND with the existing `parameters`. For example, a **test-only subset**, not the full domain mapping:

```ts
parameters: [{ index: 3, values: [0] }],
parameterCases: [
  [{ index: 0, values: [0] }, { index: 1, values: [3] }, { index: 2, values: [1] }],
  [{ index: 0, values: [0] }, { index: 1, values: [8] }, { index: 2, values: [3] }],
]
```

All cases are validated, including branches that do not match. Empty or malformed cases fail closed. Overlapping cases inside one skill do not duplicate evidence; overlapping different skills still abstain. The classifier remains based on validated generator parameters, not displayed text or arbitrary runtime predicates. Existing teaching scopes that name the subskill, task validity, projection, selection and the connection audit reuse this same classifier. No domain configuration is automatically changed or registered.

Claude owns deriving and mathematically validating the complete bounded parameter cases, updating mapping/projection versions, and checking worked/guided/fresh/delayed pools against them. If the corrected scope lacks a required role, report that gap rather than broadening evidence. Native choice support uses the actual served variant through the trusted grader; prepared choice skill registration remains an explicit domain decision. Neither answer support nor a correct final answer establishes method evidence or a specific misconception.

The case-list extension passes three focused Node 24 tests and the Node 22 integration group (86 unique checks, with two configuration-identity assertions corrected to compare complete semantic contracts). All three TypeScript configurations pass. No runtime domain mapping uses `parameterCases` yet, so the known half-row gap remains real, not merely historical.
