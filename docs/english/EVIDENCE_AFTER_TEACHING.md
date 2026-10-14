# Evidence after teaching: what changed, exactly (PR #23)

**Problem:** a pupil could read one lesson, answer the practice right, and move straight from "found hard" to "shown".
Answers given straight after teaching were counted like any independent answer.

**Now** there are four kinds of evidence:

| Kind | What it is | Updates the estimate? | Can establish "shown"? | Counts as a later (retention) check? |
|---|---|---|---|---|
| Guided practice | Hints, second tries, help | No (held, as before) | No | No |
| Practice straight after teaching | First answer, no help, in the same session after a lesson on that skill | **Yes, unchanged** | **No** | **No** |
| Independent assessment | First answer, no help, on a fresh question, in a session with no lesson on that skill | Yes | Yes, by the existing rules | When due, yes |
| Delayed retention | Independent assessment once a check is due | Yes | – | Yes (existing schedule) |

## Engine and ledger changes (the smallest compatible change)

The scoring formulas, policy values, mastery thresholds and the estimate itself are unchanged.

1. **`updater.ts`:**
   - The ledger notes the first teaching (an `intervention` event) per session and skill.
   - An accepted answer on that skill later in the same session gets `observation.setting = "after_teaching"`, a reason
     line, and `qualifying: false` passed to the engine.
2. **`composite.ts`:**
   - An answer with `qualifying: false` updates `combined` and `direct` exactly as before.
   - It does not record a demonstration.
   - The session is marked `teaching`.
   - The demonstrated level shown between answers is the level as of the last qualifying answer (`qualifiedLevel`).
   - `demonstratedLevel` uses qualifying counts (`qualifyingN`, `qualifyingContexts`) against the same
     `demonstrated_min_direct` and `demonstrated_min_contexts`.
   - These fields are created only from the first answer after teaching. Every record without teaching is
     byte-identical to before: the frozen E1 and E2a simulations and the ten-learner simulation reproduce exactly.
3. **`retention.ts`:** a session marked `teaching` is never a first demonstration or a retention check.
4. **`types.ts`:** optional `NodeState.qualifyingN`, `qualifyingContexts`, `qualifiedLevel`, `sessions[].teaching`, and
   `Decision.observation.setting`.

Teaching is recognised from `intervention` events, which the app writes when a lesson is read (`finishLesson`) and in
the doubling journey.

A session with a lesson on one skill does not affect other skills. Answers before the lesson in the same session still
qualify.

## Profile changes (`frontend/src/english/logic/profile.ts`)

| Evidence | Counted as | Why |
|---|---|---|
| Accepted, provenance@1, fresh, not after teaching | `independent` | |
| Marked `after_teaching`, or answered in a session that opened with a lesson on that skill | `afterTeaching` | The session rule covers records made before the mark existed. **Never relabelled independent** |
| A repeated question | `repeats` | It was previously counted as independent in the profile (**fixed**) |
| Accepted with no provenance | `unknown` | As before |

**New standing, "improving":** at least 3 answers after teaching, mostly right. It uses the same draft test as
"found hard", the other way round. It must also be more recent than any independent answer. The plan's response is
"confirm": a fresh check without help, outside the lesson.

**"Shown" and "confirmed" now need all three of:**
- the engine's verification;
- at least `demonstrated_min_direct` independent answers;
- an engine demonstration in a session with no lesson on that skill.

This stops an older record (lessons not tracked, or no provenance) from being reported as shown.

**"Shown" always states the level shown** ("at about level 3 of 8"). It is a level shown, not a ceiling.

## Audit of the learner-profile flow

| Possible inflation | Finding | Action |
|---|---|---|
| Repeated questions counted as new evidence | The engine already ignored repeats for the estimate. The **profile counted them as independent** | Fixed: counted as repeats |
| Second attempts | Already `assisted_response`, never evidence | Test J: same estimate and independent counts as a pupil who never retried |
| Hinted responses | Held (journey) | Unchanged; covered by tests |
| Provisional questions | Held by the content gate | Unchanged; covered by tests |
| Teaching followed by assessment in the same session treated as a later check | **Yes**: a guided session after a due date could pass or fail the retention check | Fixed (engine, above) |
| Practice straight after a lesson establishing "shown" | **Yes** | Fixed (engine, above) |
| "Shown" reported without its level | **Misleading.** J got 4 wrong on harder questions and the engine correctly supports level 3, but the overview just said "Demonstrated independently" | Fixed: the level is always shown |
| Several answers from one activity | Reading questions come two per passage. All 14 "finding details" questions share one family, so after the first they are "variants", which still update the estimate. Two answers on one passage are not independent of each other | **Not changed** (statistical policy). Listed below for review |

## Remaining validity concerns

1. **A later guided session without a new lesson counts as independent.** The lesson was read in an earlier session, so
   the answers qualify. "Immediately after teaching" is defined per session, as specified. A pupil who reads a lesson,
   leaves, and immediately starts another practice session on the same skill gets qualifying answers. A minimum gap
   would be a new policy value.
2. **Passage-level dependence.** Two questions on one passage count as two independent answers, and reading items share
   one family.
3. **The estimate still includes practice after teaching.** By design the maths is unchanged, so after a lesson the
   estimate rises. The card says so. A fresh check after that is judged against the higher estimate.
4. **The journey's rule-level evidence (doubling)** still treats its reassessment, in the same session as the teaching,
   as independent at rule level. It is provisional and never counted, and its report already says "progress, not yet
   mastery". The rule-level mastery model was left unchanged pending its own review.
5. **Draft thresholds** ("found hard" and "improving": 3 answers, P ≥ 0.8) are untested with children.
