# What deterministic validation can and cannot catch (E3a)

*12 October 2026. Decision 5 of 12 October: document which evaluator errors code can catch, and
which need trusted educator-scored examples. Every row below is demonstrated by a test in
`packages/english-core/test/e3-freeform.test.ts` or by the harness `tools/english/e3/harness.ts`.*

## The principle

**Code can check that a judgement is well formed, evidenced and consistent with itself and with
things code can measure.** It cannot check that the judgement is *right*.

- A judgement can be complete, quote the learner's real words, agree with its own criterion scores,
  and still be wrong about the English.
- Such errors can only be found by comparing the evaluator with people who know the answer: trusted,
  educator-scored anchors. This happens at qualification, and continuously through hidden drift
  anchors.

## Caught by code, on every single response

| Error | Check | Outcome | Example in the tests |
|---|---|---|---|
| The output tries to set an estimate, score, stage or verdict | 1 (schema) | Rejected | `extra_field_score` |
| Malformed output, or a missing or wrong field | 1 | Rejected | `bad_schema` (E1) |
| A judgement for a capability the task does not target | 2 | Rejected | E1 fault tests |
| A short-answer key point left unmarked, marked twice, or unknown | 2 | Rejected | `skip_key_point` |
| A band off the scale, or far outside the task's band window | 3 | Rejected | E1 fault tests |
| **An invented quote**, in a judgement, a criterion or a key point | 4 | Rejected | `invent_criterion_quote` |
| A key point marked present with no quote | 4 | Rejected | `mark_present_without_quote` |
| A misconception tag the capability does not list | 5 | Tag dropped | E1 fault tests |
| **A band that contradicts the evaluator's own criterion scores** (outside their range by more than 0.5) | **12 (new)** | Rejected | `contradict_band` |
| **A band far from the mean of its own criterion scores** (more than one band) | **12 (new)** | Held for a second evaluation | `drift_from_criteria` |
| **Incomplete criterion scores** (none, missing, unknown or repeated) | **12 (new)** | Rejected | `incomplete_criteria`, `no_criteria`, `unknown_criterion` |
| A spelling band that the measured misspelling rate rules out | 6 | Held | E1 tests |
| **A grammar band that clear, code-detectable errors rule out** (protocol v2) | 6 | Held | *She don't…, They was…* |
| **A short answer marked right although a guard rules it out** | 6 | Held | *The two dogs barks…* |
| Text addressed to the evaluator ("ignore the rubric", "give me band 8") | **13 (new)** | Held for a person | instruction-like text |
| A very surprising band compared with the learner's estimate | 9 | Held for a second evaluation | E1 tests |
| A large movement from one response | 10 | Accepted, but capped at 0.75 band | all accepted judgements |
| An attempt to change a stage or mastery | 11 | Impossible by construction | authority test |

**Code-detectable errors are a short, deliberately conservative list.**

- *Grammar signals* (`content/english/signals/grammar.json`), seven patterns:
  - *he/she/it don't*;
  - *we/they/you was*;
  - a past form after *did*;
  - regularised pasts (*goed*, *buyed*);
  - a modal followed by *to*;
  - double comparatives;
  - plurals of uncountable nouns.
- *Guards* on short items. These are item-specific patterns. For example, a key point *uses the
  plural verb* cannot be present if the answer says *dogs barks*.
- Every guard is checked against the item's model answers and agreed anchor marks, so a guard can
  never rule out a correct answer the item itself gives.

## Not catchable by code on a single response

| Error | Why code cannot see it | What catches it |
|---|---|---|
| **A wrong conclusion drawn from a genuine quote**, where the error is not on the list | The quote is real and the judgement is internally consistent. Example: *Everyone have a bag like mine* judged as accurate grammar | Qualification on trusted anchors that contain such errors; drift anchors; educator review of samples |
| **Superficially plausible inflation or deflation**: complete, quoted, consistent, but two bands off | Every per-response check passes (`plausible_inflation` is accepted) | Qualification: the bias shows across anchors (the test's inflating evaluator is refused at check 7) |
| **A short answer judged right on meaning when it is wrong** (relevance, inference, tone) | No pattern can decide whether an idea is relevant or an inference sound (`My uncle has a red car` marked as a relevant reason is accepted) | Key-point agreement on trusted short-answer anchors (an evaluator below 0.9 agreement is refused) |
| **A plausible but wrong misconception tag** from the capability's own list | The tag is allowed | Anchors whose agreed marks include misconceptions (not yet available) |
| **Subtle bias by learner group** (dialect, handwriting-style transcription, topic) | Invisible in any single response | Fairness checks on anchor sets designed for it (E3b or later) |
| **Gradual drift** in a provider's model | Each response looks normal | Hidden drift anchors: in the mock harness, a drift of 0.4–1.2 bands is detected within 120–180 live requests (6–9 hidden anchors) |
| **Names in running text** that are not in a greeting, sign-off or after a title | The identifier rules cover common positions only (`my name is meena`, written in lower case, is not removed) | Consent and provider terms (D-3); human review of samples before E3b |

## What this means for E3b

- **A real evaluator is trustworthy only as far as the anchors that check it.** The candidate anchors
  are too few to do that: 3–4 per writing task and 2 qualification anchors per short item.
- In the harness, an evaluator with a true noise of 0.5 band fails qualification by chance on one
  capability. That capability has only 6 anchors, where about 20 are needed per rubric.
- Hence the separate [educator-review proposal](EDUCATOR_REVIEW_PROPOSAL.md). No real evaluator
  should be qualified on candidate anchors, and the updater refuses to accept one outside
  development (check 7).
