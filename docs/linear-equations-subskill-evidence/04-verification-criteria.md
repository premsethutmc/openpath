# 4. Verification criteria and rationale

No new threshold was introduced. Every number is an existing constant, and its rationale is the existing one:

- `INDEPENDENT_MIN = 2`: status@1 and status@2, "two distinct right first answers without help";
- `RETENTION_DAYS = 7`: retention@1, the seven-day delayed check;
- `RETENTION_CHECK = 2`: the shared verification needs two distinct fresh answers in the check.

There is no probabilistic model.

| Status | Criterion (in this order) |
|---|---|
| `not-attempted` | no attempt of the sub-skill |
| `recovery-required` | the latest delayed check of this sub-skill failed, and it has not been shown again since (retention@2 recovery: `INDEPENDENT_MIN` distinct right answers alone, outside the check) |
| `retention-due` | shown, and its delayed check is due (`RETENTION_DAYS` after first shown) with no qualifying answers yet |
| `independently-demonstrated` | shown (status@2): at least `INDEPENDENT_MIN` **distinct generated variants** right, first attempt, alone, not a probe, not contradicted; and the latest such answer right, or fewer than 2 of the last 3 since wrong. The delayed check is scheduled or passed. |
| `insufficient-evidence` | attempted, but fewer than `INDEPENDENT_MIN` independent (non-contradicted) answers |
| `developing` | enough independent answers to judge, but not shown |

## The seven required considerations

1. **Correctness on appropriate questions.** Only this sub-skill's own family counts, and only through the trusted credit.
2. **Independent vs assisted.** `independentAttempt` decides. Assisted answers are counted and reported, and never count towards being shown.
3. **Distinct variants.** Variants are distinct `exposureKey`s. That is stricter than the authority, which counts question ids, so the typed and mc forms of one problem count once.
4. **Method verification.** It is reported separately (`method.status`), because the grader supports it only for typed working on families with an equation contract. Being shown is decided by answers, as the authoritative state decides it. A **contradicted** answer (right answer, false-step working) is **neutral**: it neither counts as shown nor counts as a wrong answer. The method becomes `contradicted`.
   - Why neutral and not wrong: the reviewer showed that counting it as wrong would fail a delayed check that the trusted credit says was passed. Neutral is never more permissive than the authority, and it does not depend on the derivation authority having no false positives.
5. **Freshness.** It is reported as last independent answer and days since; `fresh` means under `RETENTION_DAYS`. The delayed check is what turns age into a status.
6. **Retention.** It uses the retention@2 cycle, scoped to the sub-skill. `need` follows evidence.ts: min(`RETENTION_CHECK`, the module check's questions of that sub-skill). A sub-skill the module's check never samples (both sides, brackets) keeps the competency's bar of `RETENTION_CHECK`; it is never lowered to one item.
7. **Contradictory or failed evidence.**
   - status@2: two wrong of the last three undo "shown";
   - a failed check gives `recovery-required`;
   - a contradiction is reported.

## Cross-sub-skill relations

**The one explicit relation.** `MATH.algebra.linear-intro → MATH.algebra.linear-equations` is a mandatory edge (audit@1: "Multi-step linear equations build on one-step equations"). A demonstrated two-step, both-sides or bracket sub-skill is therefore **listed** in one-step's `prerequisiteSupport`, and one-step's status does not change.

**No relation between the multi-step sub-skills.** No such relation exists in the graph, so none is listed. A successful two-step equation never establishes brackets.
