# Publication and CI follow-up

With explicit user authorization, the completed local branch was pushed without rewriting history and [draft PR #96](https://github.com/premsethutmc/openpath/pull/96) opened against `integration/d1-e1-subskill-evidence` at `cd40422b1d5f2c7c464b0eb10a0c73c340a3f7ec`. Initial remote head was verified as `515eaa9057cc7afa80c189c5ec19493a9eecb15e`. This integrates the PR93/94/95 stack for review, not release to main. No merge, deployment or global policy activation was authorized or performed.

## Initial published-head CI

All six workflows reached terminal failure. Diagnosis separates inherited failures from an introduced defect:

- The completed typecheck jobs reported exactly the same 188 diagnostic identities as integration-base CI [41235993121](https://github.com/premsethutmc/openpath/actions/runs/41235993121), ignoring line-number movement. No new diagnostics were found. These gates prevent later frontend/browser steps from running; local targeted checks are not substitutes for a green full CI run.
- Node 24's legacy exact-research job failed the two preserved E1/E2A simulation hashes. An isolated archive of base `cd40422b` reproduced both exact actual/expected hash pairs on Node 24.19. The English-core source, tools, content and workflow are unchanged by this branch. Node 22's corresponding job passed. Frozen expectations were not rewritten.
- Full Django runs (325 tests, three skips) exposed one introduced content-review parity failure: the generated addition lesson had changed, but its module review hash was stale. The same failure appeared in PostgreSQL Python 3.10/3.12/3.13 and SQLite year/journey jobs. This was missed by the earlier focused acceptance selection.

## Correction

The existing bounded `foundation-lessons.ts` generator now synchronizes the two affected family specifications, their generated-registry fingerprints, and the two family/two module review records. It reloads the effective modules in a fresh subprocess after writing the lesson file, avoiding stale imported JSON. Existing review history is preserved; changed revisions return to draft. The already-current explanation registry remains unchanged.

Only `aaadd` and `adcol3` metadata changed. Question/answer tables, exposure aliases, pools, unrelated registry entries, quarantine and approval permissions are unchanged. The grader bundle and input manifest were rebuilt. Independent review confirmed this dependency closure.

Correction validation: 18 Django content-review/pathway/geometry tests passed; 17 frontend teaching/pathway/remediation tests passed; explanation registry check passed; mathematics typecheck retains 188 inherited diagnostics with zero new. Bounded regeneration was run twice and is byte-idempotent. The historical module/hash parity assertion remains intact. Remote CI on the correction is recorded in the PR description once terminal, so publication status does not require further code-only CI cycles.
