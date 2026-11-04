# E7 shadow evaluation: integration proposal (not implemented)

**Status:** proposal only.

E7 (the unified mathematical engine with its claim ledger, proof obligations and process policy) has no effect on any production path.
- It does not reach grading, mastery or intervention selection.
- The only learner-path code that imports it is the test harness.
- **Nothing here may be activated without explicit approval.**

## Goal

Record what E7 *would* conclude about a learner's working, next to the authoritative decision. This builds a reviewable comparison corpus. Learners, credit, evidence and hypotheses must not be affected.

## 1. Certification requirements

| Requirement | Rule |
|---|---|
| Authority | `grading-policy@1` and its server bundle remain the only authority for credit. E7 output is labelled `e7-process-shadow@1`, `authority: none`. |
| Scope | Algebra kernel questions with a certified answer form only (`formCertified`), not quarantined, and whose contract has an algebra statement. Every other question is recorded as `not-applicable`. |
| Gate to leave shadow | No E7 finding may influence learners until all of these hold on a frozen corpus: 0 conflicts with the authoritative verdict, 0 mathematical false acceptances, the policy false-acceptance list reviewed by an educator, and a blind holdout passed. A separate approval is still needed after that. |
| Recertification | Any change to E7 code, rule tables or conventions invalidates earlier shadow records for comparison. The corpus is re-run, never mixed across versions. |

## 2. Evidence provenance

Each shadow record carries:
- `questionId` and contract hash;
- the authoritative decision fields (verdict, reason, method);
- the E7 contract and version: `openpath-e7-process-policy@1`, `openpath-unified-math-assessment@1`, `openpath-claim-ledger@1`;
- the mechanism provenance (`evidence-provenance.ts attribute()`: mechanism, kernel, trusted);
- the findings `{kind, line}`;
- the agreement class (`agree`, `process-unresolved`, `process-decided`, `conflict`).

Findings without trusted provenance are stored as `untrusted` and excluded from any later use.

## 3. Independent replay

- Store the learner's working text and the question contract hash with the record, so every shadow record can be replayed offline from the stored input with the pinned E7 build.
- A nightly replay job compares stored versus recomputed records. Any difference is a defect, and the record is excluded from evaluation.
- Replay runs outside the request path.

## 4. Failure isolation

| Rule | Effect |
|---|---|
| Off the request path | E7 runs after the authoritative decision is returned, in a separate worker. |
| Hard timeout | 250 ms. The worst observed pair is about 162 ms. A timeout is stored as `unresolved: timeout`. |
| Exceptions | Caught and recorded as `unresolved: error`; never propagated. |
| Learner record | No E7 output is written into the learner's attempt record. Shadow records live in a separate store keyed by attempt id. |
| Read restrictions | `records.ts`, `evidence.ts`, `hypotheses.ts`, `intervention.ts` and `plan.ts` must never read the shadow store, enforced by an import-graph test like the existing E7 gate test. |

## 5. Version pinning

- The E7 bundle is built reproducibly (as the grader bundle is today), with a sha256 manifest of its inputs.
- The bundle hash is stored in every shadow record.
- Rule tables, notation conventions and the reasoner set are pinned by hash.
- Upgrades are a new version id, never in place.

## 6. Performance measurements

**Existing measurements** (`research/e7-safety`, this environment):
- answer-only shadow mapping: about 1.0 ms per submission over 611 submissions;
- fresh holdout: median 3.5 ms;
- random 3-letter expansions: mean 6.1 ms, worst pair 162 ms.

**Required before any rollout:** p50, p95 and p99 latency, plus memory, measured on production-shaped working text in the shadow worker. Budget: p99 < 250 ms, and no measurable effect on the grading response time, which is unaffected by design (off the request path).

## 7. Rollback behaviour

- A single flag (`OPENPATH_E7_SHADOW=off`) stops recording. Because nothing reads the shadow store, turning it off changes no learner-visible behaviour, credit or evidence.
- Shadow records can be deleted wholesale without affecting learner records.
- If an import-graph violation is ever detected, the build fails, so no code path can come to depend on E7 by accident.

## Approval needed

- Recording shadow records at all.
- The storage location and the retention period for learners' working text (privacy review).
- The gate criteria in §1.
