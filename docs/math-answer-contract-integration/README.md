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

Local checks: 59 focused integration checks passed before the retention change; the final shared-contract/readiness group has 16 passing Node 22 checks, with four readiness checks also passing Node 24. All three frontend TypeScript configurations and seven affected backend tests pass. Independent review's duplicate-provenance finding was fixed and re-reviewed. The seven modified family specification fingerprints are unchanged; the trusted grader and its input manifest have been rebuilt together. There is no final combined aggregate or remote CI claim yet.

## Pending dependency before publication

Claude owns domain mapping/content files. PR100's `pictographs.half-symbol@1` currently maps every `acpicthalf` row-read task, although the generator guarantees a half symbol only somewhere in the chart. For example, check item `gen:acpicthalf:0,8,1,0` asks about a row containing two halves (one whole picture), with answer 2. A selected whole-symbol row therefore does not establish the declared half-symbol skill. This mapping needs a mathematically valid scope correction from Claude before the combined candidate is publishable. Do not silently rename or count it as a verified chain.

Claude also owns filling the 16 teaching gaps in its 17-skill batch. Those are not 17 completed teaching chains. The `aaname` unmapped explanation and numeric-only blocker text in the imported breadth documentation describe its old baseline; the shared numeric-only restriction is fixed here, but numeral-to-name still requires an explicit domain skill mapping. The imported connection audit snapshots await regeneration after the domain correction; they are structural evidence, not semantic certification of that disputed mapping.

After that handoff: reconcile only changed domain inputs, regenerate the connection audit and dependent review/manifest artifacts, run one coherent final aggregate, publish a separate stacked draft and own its exact-head CI. Keep PR98/99 stable. No merge, production deployment or content approval is implied.
