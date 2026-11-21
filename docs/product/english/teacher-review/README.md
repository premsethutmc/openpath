# Independent English teacher-review pack v1

Status: **prepared, not reviewed, not a release certificate**. These instructions,
forms and prompts are newly authored research materials, not validated instruments.
No teachers have been recruited, learners sampled or outcomes measured here.

## Existing evidence, not duplicate engineering

Use the existing 16 invented cases in
[workspace-writing-acceptance-v1.json](../../../../content/english/essay/benchmark/workspace-writing-acceptance-v1.json)
for initial review. Its language, clean/variant, one-off-slip and argument cases
already cover useful failure modes. Existing automated
[acceptance scoring](../writing-evaluator-acceptance.md) measures output validity
and reference alignment, not truth or learning. Do not replace its candidate
annotations with teacher labels until independent review is complete and versioned.
The historical spelling/placement owner approvals in
`content/english/pilot/reviews.json` are not educator validation of essay feedback.

Generate a local reviewer packet and a separate coordinator key, with Python
standard library only, from repository root:

```sh
python tools/english/teacher_review/packet.py --out /tmp/english-teacher-packet
python -m unittest discover -s tools/english/teacher_review -p 'test_*.py'
```

The command reads **only the current repository synthetic fixture**, creates a new
directory, and makes no network/provider calls. It refuses to overwrite outputs.
It emits a packet ID, randomized opaque case IDs, a source SHA-256, a blank diagnostic form,
and a separate key containing candidate references. Send teachers only
`reviewer.json`, the blank form and `reviewer-instructions.md`. This README
is coordinator-only: it links to candidate labels and must not accompany a blind packet. Keep
`coordinator-key.json` and engine identity away from them. Do not commit completed
forms. This public suite can support label-blind review, not secrecy from a reviewer
who deliberately looks up the source. Ask reviewers to record previous exposure.

Use the same generated packet for both independent reviewers in a round. Join
forms by packet ID plus case ID, never case ID alone across generated packets.

The forms are Markdown so a coordinator can copy them into an approved private
document or print them. This is **not a data-collection service** and includes no
upload endpoint. Generated packets contain only invented text. Real learner work
requires separate approval, consent/assent where applicable, access control,
retention/deletion terms and a private storage location before collection. Do not
put learner text, recordings, contact details or completed review in this repository,
issues, public artifacts or provider calls.

## Protocol: lock independent judgment before comparison

1. A coordinator records source commit, fixture digest, protocol version, review
   date, intended audience/genre/register and exposure history. Review the existing
   16 cases first; do not call that representative coverage. Add educator-authored
   held-out cases later, not examples tuned from model mistakes alone.
2. Use two English educators independently, preferably with experience teaching
   Indian learners. Calibrate instructions on separate practice examples, not on
   scored cases. Do not show engine names, expected answers, existing labels,
   model confidence, baseline scores or the other reviewer's answers.
3. **Pass A: source only.** Each reviewer identifies minimal exact spans and genuine
   issues, acceptable alternatives, uncertain interpretations and already-effective
   writing. Record scope and evidence. Lock/date this annotation before revealing
   any feedback. Not finding an issue does not establish that the text is perfect.
4. **Pass B: feedback review.** The coordinator gives separately randomized, opaque
   output IDs for deterministic and optional API candidates, same task context,
   without engine identity. Include missing/refused outputs explicitly. Review each
   claim and every hint using the form; do not quietly discard invalid outputs.
   The v1 packet generator intentionally does not import feedback or unblind engines.
5. **Pass C: adjudication.** Preserve both original judgments. A third educator or
   documented reconciliation resolves differences with reasons, not majority vote
   from an AI. Keep unresolved cases explicitly unresolved. Only then reveal candidate
   references/engine identity. Record any later label changes and rerun comparisons
   against the new version rather than silently changing the test.
6. Report case counts, disagreements and individual failure examples before any
   aggregate. Separate grammar, argument, coaching and learning results; do not
   collapse them into a single English score.

## Reviewer decision rules

- **Genuine error:** a defensible grammatical/meaning problem in this context.
  Quote the smallest sufficient span, explain why, and give acceptable alternatives
  privately in the reference form. Avoid inferring a stable misconception from one
  slip. Repeated patterns support a hypothesis, not proof about the learner.
- **Valid variant:** Indian/British spelling, regional vocabulary and appropriate
  register must not be penalized just for differing from American usage. Do not
  blanket-approve every Indian expression either: record audience, task and meaning.
  For example, locally intelligible vocabulary may merit an optional audience note,
  not a grammar accusation. Uncertain cases require educator adjudication.
- **Style suggestion:** optional improvement, clearly labelled optional. Treating
  preference as error is a false accusation. Repetition can be deliberate.
- **Argument gap:** identify a missing link relevant to this short task, not disagreement
  with the position. Do not demand citations, statistics or a counterargument from
  every short school paragraph. Distinguish unsupported numerical certainty from
  plausible opinion, and do not invent the evidence yourself.
- **Abstention:** useful when the text/context is ambiguous or beyond validated local
  coverage. Classify justified versus avoidable abstention. Silence alone is not a
  correct diagnosis. A service error is operational failure, not a considered abstention.
- **Coaching:** point to a manageable next step, preserve the learner's idea and voice,
  use age-appropriate language, and let the learner supply the answer. A full corrected
  sentence/paragraph, supplied argument, or question containing its answer is leakage
  when presented as independent practice. Worked examples on a different problem may
  teach, but record that support and never count copying as independent success.

## Counts and denominators to publish

Define a finding as one localized, non-duplicate claim. Adjudicate broad spans and
duplicate claims before counting; a quote overlap is not automatically a correct finding.

- Claim precision = supported error claims / all adjudicable error claims.
  Report unsupported claims and unresolved claims separately. Zero claims => N/A.
- Issue recall = distinct adjudicated actionable issues found / all adjudicated
  actionable issues in the sampled texts. Missing outputs remain missed opportunities.
- False-positive case rate = adjudicated clean/valid-variant cases receiving at least
  one false error accusation / all adjudicated clean/valid-variant cases.
- Coverage = cases receiving a usable diagnosis / all scheduled cases. Also show
  justified abstentions, avoidable abstentions, outages and rejected outputs separately.
- For routing, report local-only, escalated and abstained cases separately; correctness
  conditional on answered cases alone cannot justify a deterministic-first confidence gate.
- Coaching: counts of factual mistakes, answer leakage, voice/meaning changes and
  misleading mastery claims, plus anchored ratings from the form. Missing feedback
  remains missing, never a zero-quality or perfect-quality rating.
- Reviewer agreement: raw agreement and disagreement counts by decision type before
  adjudication; do not describe reconciled labels as independent agreement.

Show numerator and denominator with every rate, source version and uncertainty
(small samples are not stable estimates). Report valid-variant and clean controls
separately. No numerical pass threshold is validated by this pack. Any release gate
must be agreed before looking at evaluation outcomes, with educator input.

## Revision is not transfer

Use the original prompt bank for a later consented pilot only after educator review.
A same-draft improvement after hints is **supported revision**. Log exactly what
support was visible and whether corrections were copied. Do not infer mastery.

Independent transfer uses a fresh, comparable task, with no previous draft, feedback,
answer, hints or generated wording visible. Record any help honestly; supported
transfer is a different category. Collect delayed transfer on a third fresh task
after a predeclared interval (candidate: seven days), not by reopening the revision.
Record time, device, spelling/grammar aids and input mode consistently; do not disable
necessary accessibility support. No opportunity to use the target skill => not assessed,
not mastered. Compare opportunities, not raw error totals in essays of different length.

For a first feasibility pilot, counterbalance prompt order where possible and record
attrition and task difficulty. Educators must check prompt comparability and burden.
Without a suitable comparison design, improvement can reflect practice, task familiarity
or outside teaching; it is not a causal effect of OpenPath.

Speech-to-text text may contain recognition errors. A learner must confirm the transcript
before writing analysis. Record correction support separately; never interpret an
unconfirmed transcription error as the learner's grammar deficit. This pack cannot
measure pronunciation, fluency or listening. No audio collection is included.

## Still required

Educator review of this protocol, prompts and labels; broader held-out coverage;
actual blinded feedback review; culturally/register-appropriate adjudication; a
privacy-reviewed pilot and transfer design; real usability observations; and evidence
that the resulting feedback improves independent writing. Passing packet unit tests
only establishes packaging behavior.
