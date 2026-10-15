# Proposal C: a mastery rule that tells old mistakes from recent improvement

**Status:** approved on 15 October and **implemented**; see `MASTERY_RULES.md` for the rules as built and the
before-and-after results. This document is kept as the record of the proposal.

**Reproduce (now the production rules):** `node --import tsx scripts/mastery-scenarios.mts` (from `frontend/`).

## The problem

**What the profile requires today for "shown":**
- the engine demonstrates a level: P(ability ≥ level) ≥ 0.8, with at least 3 qualifying answers in at least 2
  formats;
- the pupil has at least 3 independent answers;
- the skill is not "found hard".

**What goes wrong:**
- The engine's demonstration can rest on easy questions and on the starting estimate. A pupil can be "shown at
  level 2" after getting most questions wrong, as long as none was easy enough to contradict level 2.
- The obvious fix, "at least half of all independent answers right", was rejected. Counted over a pupil's whole
  history, it punishes pupils who were wrong before they were taught and right afterwards.

## Proposed rule C′ (added to the engine's demonstration, which stays unchanged)

A capability is shown at level **L** (the engine's demonstrated level) only if all of these hold:

| Part | Rule | Why |
|---|---|---|
| 1. Recent evidence | Only the latest 6 independent answers count. None from before the latest lesson on the skill counts. | Earlier mistakes stay in the history and the report, but they do not block a newer claim. Teaching is recorded, so "before" and "after" are facts, not guesses. |
| 2. Evidence at the level claimed | At least 2 of those recent answers are right on questions at **L − 0.25 or harder**. | A level must be shown at that level, not inferred from easy questions plus the starting estimate. |
| 3. No contradiction | No recent wrong answer on a question at **L − 1 or easier**. | Failing clearly easier questions contradicts a claim of L. |
| 4. Diversity | The right answers at level are on 2 or more different questions. The engine also requires 2 formats. | A single question, or one format, can be a fluke or a format effect. |
| 5. Retention | "Confirmed" still needs a right answer at a later check, 7 or more days after the claim. | Unchanged. |

**How it fits A:**
- Independent answers only, as now. Help, practice and answers given straight after a lesson never count.
- A level shown on draft questions is still "provisional"; on approved questions it is "verified".

**What it does not change:**
- the scoring formula;
- the estimates;
- the plan's sequencing, unless you also want the plan to wait for C′.

## Examples (same histories, three rules)

The rules compared are: the current standing, the rejected lifetime rule (at least 50% right), and C′.

| Scenario | Answers (independent) | Engine level | Current standing | Lifetime ≥ 50% right (rejected) | Proposed C' |
|---|---|---|---|---|---|
| S1 wrong before teaching, right after (separate sessions) | 5 of 10 right | 3 | shown | allows | allows: 5 recent right answers at or near level 3; no recent error on easier questions |
| S2 two right early, then four wrong on easier words (the 2-of-6 case) | 3 of 8 right | 2 | shown | blocks | blocks: only 1 recent right answer(s) at level 2 or near it |
| S3 consistently right | 6 of 6 right | 5 | shown | allows | allows: 2 recent right answers at or near level 5; no recent error on easier questions |
| S4 right on easy words only, wrong at harder ones | 4 of 6 right | 3 | shown | allows | blocks: only 0 recent right answer(s) at level 3 or near it |
| S5 alternating right and wrong at one level | 3 of 6 right | 2.5 | shown | allows | allows: 3 recent right answers at or near level 2.5; no recent error on easier questions |
| S6 an old error, then steady recent success (no teaching) | 6 of 8 right | 3.5 | shown | allows | allows: 4 recent right answers at or near level 3.5; no recent error on easier questions |

**Reading the examples:**
- **S1 (wrong before a lesson, right after):** C′ allows it, because the errors predate the teaching. The lifetime
  rule allows it here only because the history is exactly 5 of 10. With 5 wrong and 4 right, it would block for
  ever.
- **S2 (the defect we found):** the current rule says "shown at level 2". C′ blocks it: there is only 1 recent right
  answer near level 2, and later words were all wrong.
- **S4 (right only on easy words, wrong on harder ones):** the current rule and the lifetime rule both claim level
  3. C′ blocks it: no right answer at level 3. The engine's level 3 there rests on easy questions plus the starting
  estimate.
- **S5 (alternating right and wrong around band 3):** all three rules allow a modest level of 2.5. That is
  defensible: about half right at band 3 supports a level a little below 3.
- **S3 and S6 (consistent success, or an old error followed by steady success):** C′ allows both. An old error does
  not block S6.

## A finding behind this

**Dictation alone can never make a spelling skill "shown".**
- The engine requires answers in 2 formats, and every dictation word has the same format.
- In practice "shown" for spelling comes from dictation plus the hand-written fill-in questions in placement and
  checks.
- That is probably right: a second format is diversity. Please confirm it is intended.

## Audit: are two right answers enough to resolve a misconception?

**Current rule:** two later independent right answers on different questions that test the misconception.

| Scenario | Current status | Proposed |
|---|---|---|
| R1 error on a hard word (admitted, 5.75), then right on 2 easy words (stopped, clapped: 3.0) | resolved (2 right answers on different questions that test it, after the last error) | not yet resolved: fewer than 2 later right answers at the difficulty of the error (b ≥ 5.25) |
| R2 error on admitted, then right on 2 words as hard (regretted, permitted: 6.0) the next day | resolved (2 right answers on different questions that test it, after the last error) | resolved: 2+ right answers at b ≥ 5.25, including on a later day |
| R3 error on admitted, then right on regretted and permitted straight away, same session | resolved (2 right answers on different questions that test it, after the last error) | not yet resolved: not yet on a later day (straight after the error it may be short-term) |
| R4 error on stopped (3.0), then right on dropped and grabbed (3.0–3.25) the next day | resolved (2 right answers on different questions that test it, after the last error) | resolved: 2+ right answers at b ≥ 2.5, including on a later day |

**Findings:**
1. **Too easy (R1).** Two right answers on **easier** words resolve an error made on a harder word. "admitted"
   (stress doubling, 5.75) is "resolved" by "stopped" and "clapped" (3.0), which test only short-word doubling. The
   harder form of the rule was never shown.
2. **Too soon (R3).** Two right answers **straight after** the error, in the same session, also resolve it. Right
   after a correction or follow-up, success may be short-term.
3. **Count:** two is a reasonable minimum, provided both are at the difficulty of the original error and on
   different questions.

**Proposed resolution rule (for decision):**
- at least 2 later independent right answers on different questions that test the misconception;
- each at **b ≥ (hardest tagged error) − 0.5**;
- at least one on a **later day**;
- no tagged error since.

**Otherwise there are two softer statuses:**
- **Improving:** right since, but not yet at the difficulty or not yet on a later day.
- **Resolved below level X:** right at easier levels only. The rule is secure on short words but not yet on harder
  ones.

**What it changes:** only the status label and what B lets the plan do. A misconception that is "improving" or
"resolved below X" would still allow targeted teaching at the harder level. Nothing stored changes.

## Decisions requested

1. Adopt C′ as written, or with different numbers: the window of 6, L − 0.25, L − 1, and 2 questions.
2. Should the plan also wait for C′ before moving on, or only the label?
3. Adopt the stricter resolution rule (difficulty plus a later day), with "improving" and "resolved below level X".
4. Confirm that dictation alone should not make spelling "shown" (two formats required).

**Limitations:** these are synthetic histories through the engine's own model. Difficulty bands are uncalibrated
estimates, so "L − 0.25" is only as good as the bands. Every number is a starting point for review with an
educator.
