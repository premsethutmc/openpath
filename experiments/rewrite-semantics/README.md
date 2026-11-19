# Rewrite meaning contrast checks (offline)

Depends on the unmerged #246 rewriteQuestion/saved-rewrite work. This branch does
not change its UI, prompt, production routing or green CI commit.

Eight newly written synthetic cases form four matched pairs:
- lexical rewording with preserved purpose vs changed replacement purpose;
- almost identical text with preserved vs reversed negation/condition;
- preserved eligibility subset vs universal scope;
- acceptable omission of meeting decor/date vs lost urgent-care constraint.

All tasks explicitly request summaries preserving purpose and essential conditions.
Reference judgments are AI-authored and independently AI-reviewed, not educator
labels. Changed cases allow a range of meaning ratings, not spurious precision.

## Run, without a provider or key

From repository root:

```
node --import ./frontend/node_modules/tsx/dist/loader.mjs experiments/rewrite-semantics/check.mts
node --import ./frontend/node_modules/tsx/dist/loader.mjs experiments/rewrite-semantics/check.mts --requests > /tmp/rewrite-semantic-requests.json
cd frontend
node --import tsx --test src/english/logic/essay-live/rewrite-semantics.test.ts
```

The exported batch contains eight actual `essay-rewrite.v2` request bodies, no
reference answers. Request/reference/prompt SHA-256 digests prevent stale inputs.
Reports additionally bind the scorer and validator source with a scoring digest.
No network function, credential lookup or provider invocation exists in this tool.

## Measured offline result

- Eight annotated fixture outputs agree with their eight synthetic references.
  This is a harness sanity check, NOT eight successful model judgments.
- All four deliberately false-preservation outputs pass the existing structural
  validator, despite wrong purpose, polarity, scope or missing constraint.
  All four fail the synthetic reference rating and focal-mapping checks.
  No useful revision question emerges from those false fully-preserved ratings.
- All four false-omission outputs on faithful texts also pass structural validation
  and produce unnecessary meaning questions. The contrast scorer flags them.
- Actual model outputs: ZERO. All eight live cases remain unassessed.

The key gap is semantic entailment, not quote existence: both quotes can exist
while saying opposite things. No deterministic semantic fix was introduced.

## Future bounded provider run

Do not use `workspace_writing_benchmark` with this file: its approved manifest
contract accepts observation tasks only, not these rewrite tasks. This export is
a reusable request batch, not an enabled paid runner. A safe live run still needs
an explicitly approved configured developer endpoint, model/version and prices,
and an adapted/tested runner with at most eight requests, no automatic retries,
a positive pre-reserved cost ceiling, per-case checkpointing and stop-on-error.
The previous temporary key is not used or searched for. No new secrets are needed
for any offline step. Do not paste a key into a command or report.

Record successful endpoint output objects as `results:[{id,output}]` alongside the
exported suite/referenceDigest/promptDigest/requestDigest, mode
`provider-recording`, and declared provenance `{provider,model,version,capturedAt}`.
Then run `check.mts --recorded /path/to/recording.json`. Declared provenance is not
authenticated by this offline tool. Missing results retain the full denominator.

## Honest limits

Exact reference spans are deliberately conservative: a different valid span may
be flagged for human review. Focal-idea agreement is not completeness; extra
mappings are shown for review. Duplicate focal mappings are not accepted as an
agreement. Legitimate nonmeaning questions are not scored as meaning failures.
The question checks verify linkage to one expected idea, not pedagogical quality.
Multiple valid issue priorities still need human review. No score certifies model
accuracy, teaching quality, real-learner readiness or mastery.
