# 11 — Readiness recommendation

**Safety gate: ready.** Known-invalid content is blocked in every mode and on every learner path found (interventions, policy C, lesson
page, study session, preview hint); review provenance is enforced per exact revision; forged or altered metadata is refused; a
misconception-specific explanation needs the specific misconception established; policies A, B and C are unchanged; regressions pass
(see [09](09-REGRESSION-RESULTS.md)).

**Educational evaluation: not ready.** Nothing is educator-approved, so a supervised-evaluation build teaches nothing and pauses. That is
the correct, safe behaviour, not a usable evaluation.

Before a small, supervised educational evaluation:

1. The product owner authorises at least one educator in `reviewers` (a reviewed change).
2. The educator works through the packet ([06](06-EDUCATOR-REVIEW-PACKET.md)) — at minimum the explanations and concept sections of the
   competencies to be evaluated — and records approve / revise / block per revision with `explanation-review.ts decide`.
3. Restrict the evaluation to competencies where the approved set covers both a general explanation and the misconception-specific ones
   the scenarios reach (today, for linear equations, there is no general explanation rated better than demonstration-only).
4. Build with `OPENPATH_TEACHING_MODE=supervised-evaluation`, and keep the mathematics unit view (separate remediation content) out of the
   evaluation.
5. Decide the wording of "a common wrong answer" (gap 4).
