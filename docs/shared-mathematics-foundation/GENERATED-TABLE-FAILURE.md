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

`git diff --quiet --exit-code -- content/learning/generated.v1.json` returns **1** in the reproduction checkout. The CI gate includes this exact file and no later generator rewrites it, so this difference necessarily fails that final gate if reached. The initial investigation stopped at this first reproduced failing condition. The subsequent complete-gate validation is recorded below. This does not establish that no other failure exists or that the unavailable remote log reached its final comparison.

## Minimal repair and regression

Copy the exact generator-produced table. No question, answer, specification, review state, approval, history or runtime code changes. This table is not an input to the bundled trusted grader, so no bundle rebuild is needed.

Add a cheap regression comparing all specification/table family sets and fingerprints. Before the repair, it fails specifically with:

```text
AssertionError: '0ddb8c4f' != '87f5465d' : acmissing
```

This closes the gap in the earlier bounded checks, which verified selected family changes without comparing the entire answer-table fingerprint map. It does not suppress or weaken the content gate.

Focused content-review and trusted-grader tests passed: **22/22**, 45.943 seconds; independent review found no blocker. The test names the specified revision, not educator approval.

Logs retained locally: `/tmp/ee68235-stage1-specs.log`, `/tmp/ee68235-stage1-result.json`, `/tmp/ee68235-table-parity-before.log`, `/tmp/ee68235-table-parity-after.log`.

No publication or later-stage regeneration occurred during the initial diagnosis. The authorized continuation then completed the remaining stages as described below. If an exact remote first-error attribution is required, the smallest missing evidence is the failed step's command/error excerpt (or its final generated-file diff), not the whole workflow log.

## Complete local gate after the correction

On implementation commit `ab2399b`, preserved successful specs output was verified byte-for-byte against all three current files; the 23-minute specs command was not repeated. Each remaining workflow command then ran sequentially with separate captured output and diff checks:

| Stage | Exit | Output diff | Seconds |
|---|---:|---|---:|
| Library | 0 | None | 137.45 |
| Answer parity | 0 | None | 1.15 |
| Coverage report | 0 | None | 662.14 |
| Expansion | 0 | None | 0.14 |
| Board releases | 0 | None | 0.38 |
| Coverage matrix | 0 | None | 1005.95 |

Finally, the workflow's complete `git diff --exit-code` command ran verbatim from `frontend` and returned **0**. No further generated mismatch or command failure was found; no additional repair was needed. The two expensive report generators were repeated because their earlier execution lacked an exact input snapshot across prior metadata edits. No full learning/frontend suite was repeated locally.

[Machine-readable command results and preserved output hashes](generated-gate-validation.json). Local runtime: Node24.19.0 and Python3.12.14. Remote exact-head CI, including its own build/browser stages, remains a separate publication check tracked in PR96. Remote historical first-error attribution remains unconfirmed because its logs are unavailable.
