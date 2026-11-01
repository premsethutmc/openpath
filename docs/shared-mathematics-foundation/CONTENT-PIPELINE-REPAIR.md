# Content-consistency repair after method-contract validation

At `1fa1ed0072fb72ba04bb41fd20b2a77fcef0802b`, five CI workflows passed. My Learning Year run 41305400491 failed “Library, parity and coverage are up to date”; its build and browser stages were skipped. Fetching terminal job 124844639815's logs through the authorized connector returned `Transport closed`. The previously denied CLI route was not retried or bypassed. These local reproductions establish actual generated-file failures, but unavailable logs prevent identifying every command executed remotely or claiming these were its only failures.

## Reproduced causes

1. `content/learning/src/expansion.py` wrote graph version 1.0.0 and undid the existing adaptive-loop audit at commit `5289948`: it reintroduced distance-formula/trigonometry dependencies into Pythagoras and removed their correctly directed advisory replacements. The committed artifact is version 1.0.1. A read-only interception of the generator's writes reproduced this exact diff with four Python hash seeds in under one second. The same source/artifact conflict exists on integration base `cd40422`.
2. `docs/learning-year/COVERAGE.md` had a stale registry row: 1389 drafts / 27 submitted, versus the actual registry's 1394 / 24. The baseline registry has the same current counts. No approvals were altered. Other existing review-state labels and family fingerprints in the report were stale too; regeneration updates them from current sources.
3. The coverage reports omitted the already-existing equation families `lboth` and `lbrk`: actual family registry 1082, reports 1080. The mathematical coverage matrix also retained 361 expansion relations instead of the committed graph's 363. Both families already have committed specifications and generated question data; this is stale reporting, not new curriculum authoring.

4. Three existing specification fingerprints (`anncr`, `atgen`, `avfexp`) were stale. Current hashes reproduce on both Node22 and Node24 and on pre-foundation `d8cd680`. Each current specification differs only in its fingerprint; all released answers match the committed question table and all deterministic/property/boundary validation passes. The three specification/table fingerprints and registry hashes are synchronized, preserving history and adding draft entries. No approval is granted.

## Correction

The four existing audited relations and their original reasons are now explicit generator source data in `content/learning/src/expansion-audit.v1.json`. The generator requires each replacement to match exactly once, rejects unknown/duplicate appended relations, and applies the existing cycle check to active audited edges. It emits the existing version 1.0.1 graph byte-for-byte. This does not change learner graph semantics, historical evidence, curriculum release hashes, quarantine or permissions.

Only the coverage report and coverage-matrix generators are rerun for the identified stale outputs, in one process to reuse generated pools. The full seven-stage pipeline is not rerun locally. Board-release and answer-parity checks are separately bounded and produce no changes.

## Validation

- `python -m unittest discover -s content/learning/src -p test_expansion.py -v`: 2/2 pass. Checks all 25 emitted files against committed bytes, the two disputed/reversed advisory edge pairs, and stale-audit failure before any write.
- `python content/learning/src/expansion.py`: 138 new competencies, 363 relations, 8 disputes, no generated-file changes.
- `node --import tsx packages/learning/scripts/board-releases.ts`: zero new releases, 57 existing releases, no diff.
- `node --import tsx packages/learning/scripts/families-parity.ts`: 2465 rows / 2444 supported, no diff.
- Targeted report generation completed successfully: coverage remains 327 awaiting / 9 partial; matrix remains 1197 requirements (1102 awaiting / 95 partial), 336 required competencies / 329 complete / zero approved. Matrix differences are exactly two existing integer families, their 800 questions, and two audited graph relations. All 1082 report fingerprints match the corrected specification registry.
- Three-family validation: 742 deterministic checks, 1200 property cases and 52 boundary cases, zero failures; all released answers unchanged.
- Django content-review plus geometry persistence: 14/14 pass. Explanation-review registry check passes. Trusted grader rebuilt after registry metadata correction.
- Independent review: no blocker in audit-source migration or regression checks; confirmed registry count against the actual report generator.

The completed learning aggregate at 1fa1ed0 (1790 pass / 41 skip / zero failures) is not rerun for unchanged learning runtime and method fixtures. This repair concerns generator reproducibility and derived reporting. Remote content/build/browser validation remains necessary on the eventual correction head; passing other workflows is not a substitute.
