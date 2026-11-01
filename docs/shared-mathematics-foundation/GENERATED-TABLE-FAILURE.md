# Exact generated-table failure on ee68235

My Learning Year run 41314647481 / job 124872008976 failed content consistency. Its terminal log remains unavailable through the authorized connector (`Transport closed`). The previously denied CLI route was not retried or bypassed. Remote status alone does not identify its first failed command; the following is an exact local reproduction of a condition that necessarily fails the workflow's final comparison.

## First-stage reproduction

Detached checkout: `/tmp/openpath-content-repro-ee68235`, exact commit `ee68235b5974654d6c9db9bb2cd8499fef1c0d12`, Node 24.19.0.

From `frontend`, ran the workflow's first command:

```sh
node --import tsx ../packages/learning/scripts/specs.ts
```

Exit **0**, 1392.57 seconds. Captured output:

```text
1082 families, 342283 problems (857526 question ids, with the multiple-choice forms); 0 failing validation
```

The specifications and marking-parity files are byte-identical. Only `content/learning/generated.v1.json` differs. Parsing and comparing the complete old/new tables finds exactly one changed field:

```text
families.acmissing.fingerprint: 0ddb8c4f -> 87f5465d
```

All released answers and all other fields are identical. Both files are 16,393,478 bytes. The current family specification and draft review registry already name `87f5465d`. The same stale table/specification mismatch exists on integration base `cd40422`.

`git diff --quiet --exit-code -- content/learning/generated.v1.json` returns **1** in the reproduction checkout. The CI gate includes this exact file and no later generator rewrites it, so this difference necessarily fails that final gate if reached. No later pipeline stage was run: investigation stopped at the first reproduced failing condition. This does not establish that no other failure exists or that the unavailable remote log reached its final comparison.

## Minimal repair and regression

Copy the exact generator-produced table. No question, answer, specification, review state, approval, history or runtime code changes. This table is not an input to the bundled trusted grader, so no bundle rebuild is needed.

Add a cheap regression comparing all specification/table family sets and fingerprints. Before the repair, it fails specifically with:

```text
AssertionError: '0ddb8c4f' != '87f5465d' : acmissing
```

This closes the gap in the earlier bounded checks, which verified selected family changes without comparing the entire answer-table fingerprint map. It does not suppress or weaken the content gate.

Focused content-review and trusted-grader tests passed: **22/22**, 45.943 seconds; independent review found no blocker. The test names the specified revision, not educator approval.

Logs retained locally: `/tmp/ee68235-stage1-specs.log`, `/tmp/ee68235-stage1-result.json`, `/tmp/ee68235-table-parity-before.log`, `/tmp/ee68235-table-parity-after.log`.

No further publication or full regeneration was performed during diagnosis. Later stages remain unverified on this local correction; their previously verified unchanged outputs should be reused where applicable. If an exact remote first-error attribution is required, the smallest missing evidence is the failed step's command/error excerpt (or its final generated-file diff), not the whole workflow log.
