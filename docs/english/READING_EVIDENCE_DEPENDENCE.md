# Reading evidence dependence: passage@1 (PR #25)

**Status:** implemented as a draft policy for the supervised pilot. It needs an educator's and an assessment
specialist's agreement (see EDUCATOR_DECISION_PACK.md, decision D5). It changes no scoring maths, no thresholds and
no historical result.

## 1. The problem

Several questions on one reading passage are not independent evidence. A child who misreads the passage, or who
finds its topic unfamiliar, tends to get every question on it wrong. A child who happens to know the topic tends to
get them all right. Until now the engine counted each answer as an independent observation, so two questions on one
passage gave twice the confidence that one passage justifies.

Example (synthetic: four right answers, two on each of two passages, all on locate_detail):

| | Counted answers | Estimate | Uncertainty (sd) | Demonstrated |
|---|---|---|---|---|
| Before passage@1 | 4 | 5.10 | 1.02 | level 4 |
| Under passage@1 | 2 | 4.63 | 1.19 | not yet (needs 3 independent answers) |

Before, two passages were enough for "demonstrated". Under passage@1 they are not.

PR #24 limited the problem in selection only: at most one question per passage per session. A passage could still
come round again in a later session, and historical records already contain same-passage pairs.

## 2. The policy

**Only the first counted answer on a reading passage changes that capability's estimate.** A later fresh answer
on the same passage, for the same capability, is **held**:

- The answer and its score stay in the ledger. The decision carries the item, right or wrong, the misconception
  tags, and `samePassage: { passage, counted }`, which names the passage and the decision that counted it.
- It changes no estimate, adds no context, and counts towards nothing: not "shown", "found hard", "improving" or a
  retention check.
- The parent's profile lists it separately ("0 of 1 right on a passage already counted (not counted again)") and
  the capability card says so. It is never shown as help or as independent evidence.

**Scope:**

| Case | What happens |
|---|---|
| Per capability | A main-idea question and a detail question on one passage each count once, for their own skill. Each estimate gets one answer per passage. See section 6 for the residual dependence across skills. |
| Across sessions | A passage counted in any earlier session, including in history before the policy, is not counted again. |
| What "counted" means | An accepted answer that changed the estimate, including practice straight after a lesson (which changes the estimate but cannot demonstrate). A held, assisted, provisional or revoked answer does not use up its passage. |
| Repeats | A repeated question (the same item again) keeps its existing handling: recorded for retention checks only, with no change to the estimate. |
| Selection | The app no longer offers a question on a passage the learner has already answered for that skill, for any purpose. So in normal use the held path is a safeguard rather than a cost to the child. |

The rule is one branch in the updater (`packages/english-core/src/updater.ts`). It reuses the existing "held"
verdict, the same path that assisted and provisional answers take. It has no new parameters and no new statistical
model. It is deterministic: the same events always give the same decisions.

## 3. The version boundary: no historical result changes

New answers carry the policy in their provenance: `provenance.policies: ["passage@1"]`. The updater applies the rule
only to answers that carry it.

- **Records made before PR #25** carry no mark. They replay exactly as they were scored. Test PI-1 replays a learner
  record made by the PR #24 app and requires byte-identical results:
  - the composite;
  - all 82 decisions (from 267 events);
  - the engine's view of every capability;
  - the profile's standing, evidence counts and shown levels.

  That record contains same-passage pairs and teaching that used first-check questions.
- **Continuing an old record:** the historical answers keep their results. A new answer on a passage already counted
  in that history is held (test PI-2).
- **Frozen simulations** use the engine without the mark, and their output is identical (`cmp` against the baseline).
- **Legacy records without provenance** are unaffected.

There is no migration step, no rewrite of stored events, and no silent change. A parent who looks at an old record
sees the same results as before. The capability card adds a note when older answers came from fewer passages than
answers.

## 4. Regression impact

| Area | Effect |
|---|---|
| Scoring maths, thresholds, priors, policies | None |
| Historical records (fixture from PR #24) | Identical (PI-1) |
| Frozen simulation | Identical |
| Core tests (V2-1 to V2-8) | New: held answer, preserved response, history unchanged, continuing a record, per-capability scope, confidence from passages, repeats and revokes, determinism |
| App tests (PI-1, PI-2, PI-7, PI-8) | New: historical replay, continuation, selection never returns to an answered passage, profile reporting |
| Reading supply | Counted by passage: the readiness report now counts the answers a check can count, one per passage. Main idea had only two first-check passages at difficulty ≤ 4, so two candidate diagnosis questions on their own passages were added (plt.main.18–19) |
| Profile demo (scenarios A–L), journey demo, browser tests | Pass unchanged |

## 5. Alternatives considered, not implemented

These would change how evidence is weighed and need a separate decision:

1. **Testlet weighting:** count each answer on a passage as 1/k of an observation. This is a new scoring rule.
2. **A passage random effect** in the engine (a testlet model). This is a new statistical model and needs
   calibration data the project does not have.
3. **Hold only within a session:** this is weaker, because a passage seen days later is still the same text.
4. **Score the passage as one unit** (for example, all right or not): this loses item-level diagnosis.

passage@1 is the most conservative of these that keeps every response. It throws away the confidence that the
evidence does not justify, never the response itself.

## 6. Known limits

- **Across capabilities:** if a child misreads a passage, both the detail and the main-idea answers on it may be
  wrong. Each estimate gets one answer from that passage. The coupling between the two skills, a small capped
  shift, can still carry part of the same passage effect. This is not corrected.
- **Diagnostic information:** held answers are not used by the engine's misconception record. They are kept in the
  ledger and shown in the profile for a teacher to read.
- **Cost:** the older reading bank has two questions per passage per skill, so it supplies half as many counted
  answers as questions. The readiness report counts by passage.
