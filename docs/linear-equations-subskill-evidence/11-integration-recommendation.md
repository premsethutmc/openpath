# 11. Integration recommendation

## Status: PASS — SHADOW EVIDENCE IMPLEMENTED

| Criterion | Evidence |
|---|---|
| All supported linear-equation families have documented mappings | doc 1. lin, lboth, lbrk, auleq and aulwp are mapped; ahone is the one-step prerequisite; meet is deliberately unmapped. A test checks that every family of the competency is mapped or explicitly unmapped. |
| The projection is deterministic | journey 15; store round trip (two processes, reversed order); property tests on 5 seeds |
| Evidence provenance is preserved | per-answer attempt ids; credit from the server decision; method recomputed by the trusted authority; client claims ignored (test) |
| Unsupported cross-family claims are exposed | `discrepancies` in journeys 2–4, 6, 7, 13, 14, 16 and 17, and store learners 2a, 4b and 1g |
| Independent and assisted evidence stay distinct | tests; journey 10 |
| Retention and recovery semantics are preserved | `retentionCycles` equals `skillEvidence` (test); journeys 13 and 14 |
| Historical events replay safely | journey 16; unreadable and malformed events fail safe; no migration |
| Authoritative decisions are unchanged | no existing source file was modified; shadow-invariant test; all existing suites pass (doc 9) |
| Regression tests pass with no introduced failures | doc 9 |

Not done (boundaries respected):

- no shadow-estimator activation;
- no production mastery change;
- no grader or P2 change;
- no content, teaching or frontend change;
- D1's branch untouched;
- no merge or deployment.

## Minimum changes to integrate E1 with D1 (after both are complete)

D1 (`feat/grader-teaching-integration`) attaches `working-assessment@1` (`grading/working.ts`) to the server's grading decision.

1. **Method source.**
   - In `subskill-evidence.ts` `methodOf`, prefer the server-recorded `decision.working.methodEvidence`, but only when the record's decision is server-decided (`decidedBy: "server"`, schema `grading-decision@1`) and `working.schema === "working-assessment@1"`.
   - Fall back to the current recomputation for records without it (history).
   - Never read `assessment.*` claims.
   - About 10 lines and one test: a client-written `working` field is ignored.
2. **Statement source.** D1 and E1 both take the task statement from the family contract. Confirm they are the same function, or have E1 call D1's statement reader, so method verdicts cannot diverge.
3. **Recheck and partial working.**
   - Map D1's `completeness: "incomplete"` (a valid partial derivation) to `method: "partial"` in the projection.
   - Keep it out of `contradicted`.
4. **Backend allowlist.** Keep `decision` and `working` server-set only: a test that a client-sent `decision.working` is dropped, in `family/learning.py`.
5. **Rebase.** E1 changes no file D1 changes; a merge needs no conflict resolution.

## Before any authoritative use (needs approval, not in E1)

These need explicit approval:

- making a sub-skill status visible to learners or teachers, or using it in `moduleState`;
- extending the module's delayed check to sample both sides and brackets;
- educator review of the sub-skill boundaries and of `INDEPENDENT_MIN` per sub-skill.
