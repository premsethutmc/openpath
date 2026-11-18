# Argument coaching quality: safeguards and unresolved semantic risk

This change concerns argument feedback, not spelling. It does not enable a provider, deploy the app or permit real learner data. Existing synthetic/developer-only access and quota controls remain unchanged.

## What is enforced

Server and client independently reject a small class of explicit copying directives in questions/hints: sentence-initial copy/write/use this sentence/paragraph/answer/argument (including selected polite directive forms); labelled model/suggested answers or replacement paragraphs; and explicit “consider writing:” or “write instead:” prompts. The server returns its existing invalid-response refusal, not the rejected prose. The workspace already saves the draft and marks rejected analysis unavailable.

This is deliberately a **narrow output-format/content guard**, not deterministic English assessment, a semantic safety classifier, or a guarantee of learner ownership. It rejects the whole response rather than silently filtering evidence. It may reject benign quoted mentions of its trigger phrases; it is English-only and trivially bypassable by paraphrase. No confidence or mastery claim follows from passing it.

The model prompt now explicitly requires open questions rather than invented presuppositions, fair treatment of defensible opposing positions, task-appropriate evidence requests, and no model answer disguised as a hint. Fewer/no findings are preferable to manufactured gaps. These are instructions, not measured compliance.

## Shared adversarial regression corpus

`content/english/essay/benchmark/argument-coaching-quality-boundaries-v1.json` is used by both backend and client tests. It contains 19 invented responses:

- Eight recognizable copying directives: rejected on both sides.
- Six reasonable coaching candidates: structurally accepted, still tentative.
- Five harmful but structurally valid responses: invented premise, opinion bias, disproportionate evidence demand, and a leading question supplying the desired conclusion, and a Unicode spelling bypass of the ASCII directive vocabulary.

The last five deliberately **pass current structural validation** and would be delivered as tentative observations by the current path, not automatically held for human review. The fixture label `accept-needs-human-review` is an audit annotation, not an implemented moderation queue. Tests expose this ceiling rather than claim that valid JSON, exact quotes or the new guard establish quality. Their acceptance is not a desired policy or release criterion. If future semantic checking can reliably reject them, revise the expected boundary and add independently reviewed counterexamples; do not retain acceptance merely to satisfy old tests.

All model transport in these tests is mocked. There is no evidence here that a live model follows the new prompt more reliably.

## Review gate for an approved future synthetic model run

Review every returned question and hint in context, including responses with no findings. Separate task appropriateness from logical quality. For each response, record:

1. **Grounding:** does the question presuppose an outside fact or statistic that the learner did not establish? A genuine exact quote does not ground a new premise in the hint.
2. **Fairness:** would the same critique apply to a defensible writer taking the other side? Disagreement alone is not a gap.
3. **Task fit:** does a short school/personal explanation actually require statistics, citations or formal counterargument? Missing rubric areas need not become findings.
4. **Learner ownership:** does the feedback ask the writer to reason and choose, or supply a stance, example, supporting evidence or replacement wording to copy?
5. **Usefulness:** is there one understandable next thinking step, suitable for the learner's age? A generic request to “add detail” may be harmless but unhelpful.
6. **Uncertainty:** does feedback remain tentative without inferring inability, improvement, retention or mastery?

Mark each dimension acceptable / unsafe-or-misleading / unclear, quote the relevant feedback, and record a reason. Keep reviewer disagreements visible. Treat any unsafe result as a release blocker for the affected behavior; do not average it away with harmless cases. The current AI-authored fixtures and engineering review are not educator validation. Representative unseen writing, educator review and actual revision outcomes remain necessary before learner-facing reliability claims.

Whitespace is normalized before directive matching; ASCII case handling is aligned for the shared fixtures. Known bypasses include “Copy this exact sentence”, “Here is a sentence you can use”, “Model answer — ...”, and non-ASCII letter substitutions. This is not an exhaustive Unicode equivalence guarantee.
