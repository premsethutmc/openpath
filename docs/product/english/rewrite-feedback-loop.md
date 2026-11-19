# Original-essay rewrite feedback and recovery

The existing 20–50 word rewrite now retains the learner's text before requesting
analysis. The original bundled `rewrite` record remains readable; later
`rewrite_evaluation` records update only its displayed evaluation. Profile history
still counts saved writing, not provider attempts. Evaluation resolution requires
matching essay/rewrite/artifact IDs and ledger order after the original record.

Unavailable analysis can be explicitly retried on the same text and ID. Copied,
instruction-like or rejected responses do not gain a retry button automatically.
Legacy unavailable records without a retryable field retain conservative recovery.
Single-controller writing/check/rewrite operations cannot overlap, and evaluation
metadata is allocated again after the provider responds. This is not a claim of
cross-tab transaction or provider billing deduplication. The gateway accepts
artifact-stable request IDs; it does not use them as a retry cache.

The feedback screen shows actual quoted original ideas and possible rewrite
matches. No match means the evaluator did not locate one, not proof of omission.
One authored question targets the first unmatched idea or a returned dimension
needing attention. Model-written notes are not displayed here because they may
supply a replacement answer. The learner can edit their own saved text into an
optional new, linked revision. Neither attempt nor retry changes mastery.
Older attempts remain in the ledger; the screen shows the latest rewrite.

This remains supported reworking of the original essay, not the separately
reserved fresh-topic argument transfer. No provider activation, real learner
consent, semantic validation or production readiness is asserted. A held/rejected
result is not success, and empty feedback does not imply correct writing.

## Verification

Synthetic controller tests cover saved-before-provider persistence, explicit retry,
immutable original ID/time/text, profile deduplication, optional revision linkage,
legacy held records, nonretryable outcomes, mutual operation guards, mismatched
and pre-submission evaluations, and unchanged skill estimates. The mocked phone
browser test covers unavailable retry, same artifact request, evidence/question
visibility, hidden model answer, and own-text revision. Local Chromium launch is
blocked by the executor's socket permissions; hosted CI is the browser gate.
