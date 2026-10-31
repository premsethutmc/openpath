# Pilot assessment policy (locked for the first pilot)

**Policy:** `essay-policy@2-draft` (`ESSAY_POLICY_DRAFT`, `packages/english-core/src/essay/competencies.ts`), unchanged.
**Scope:** the three pilot competencies only:

- subject–verb agreement;
- present and past simple;
- articles.

**Locked by:** test K7 (`packages/english-core/test/k7-pilot-validation.test.ts`). Any change to a value below fails it.
A change needs the owner's approval and an educator's view.

The brief's sequence fits the existing policy without changing any value, the estimator, the evidence rules, or any
question's pool. **No code change was needed to lock it.** What "locking" adds is the content requirement below: a
pilot sequence needs only **one** later check of content, while the policy still *allows* up to three later checks
when they are justified.

## The sequence

| # | Step | What happens | Policy values | Evidence |
|---:|---|---|---|---|
| 1 | Diagnostic assessment | After an essay suggests a gap, unseen questions from the **diagnosis pool**, near the target. At least 2 must be answered without help. 2 wrong answers confirm the gap; all right weakens it (no teaching). | `diagnosticItems` 3, `diagnosticMinIndependent` 2, `confirmMinWrong` 2, `weakenAllRight` true | Independent: counts |
| 2 | Targeted teaching and guided practice | Candidate lessons, then practice questions (below the target, or practice pool) answered with help available. | `guidedItems` 3 | Assisted (`assisted@1`): held, never evidence |
| 3 | Independent verification | The journey's check: unseen questions between band 5 and 6.5, in a new sitting (never straight after teaching). | `checkItems` 2 | Independent: counts |
| 4 | One subsequent verification sitting, **where required** | Planned only if step 3 did not show the target. The engine treats the target as shown only when its lower 80% bound reaches it, from at least 3 qualifying independent answers in at least 2 contexts (question formats), as the framework policy requires. A learner with a confirmed gap almost always needs this sitting. It is held at least 1 day after the journey. | `followUpSpacingDays[0]` 1 | Independent: counts |
| 5 | One delayed retention check | Planned only after the target has been shown without help; at least 7 days after it was first shown. It uses questions kept back from the start. Verified = shown, then kept at this check. | `retentionDelayDays` 7, `retentionItems` 2 | Independent (retention): counts |

### Additional later checks: available, not mandatory

`followUpChecks` stays **3** and `followUpSpacingDays` stays **[1, 3, 7]**. So after a first later check that still
does not show the target, a second and third may be offered, 3 and 7 days on. They are offered only when **all** of
these hold:

- the target is still not shown;
- the previous later check had at least one right answer (otherwise teaching comes first: stop rule);
- the allowance is not used up (stop rule);
- unseen eligible questions remain (stop rule).

No learner is required to take them, and the pilot's content requirement does not count them. A learner who stops
after one later check keeps an honest "not yet shown" with the reason. Nothing is recycled.

### What is not changed (by design)

- **No question changes pool.** Diagnostic questions stay diagnostic. The allocation still reserves retention
  questions first, then verification questions; questions are taken only from their pilot pool's roles.
- **Verified mastery is not weakened:** lower 80% bound at the target, 3 qualifying answers, 2 contexts (formats), a delayed check at least
  7 days later; practice never counts.
- **The estimator is not altered.** The shadow estimators from PR #47 stay research only.

One consequence of keeping `followUpChecks` at 3: the allocation's shortfall messages still count the full allowance
(the journey's check plus 3 later checks = 8 questions). That is reporting only. For the pilot, read the requirement
below.

## Content requirement per competency (one complete pilot sequence)

| Step | Questions needed |
|---|---:|
| Diagnostic | 3 |
| Guided practice | 3 |
| Independent check | 2 |
| One later check | 2 |
| Delayed retention | 2 |
| **Total** | **12**, plus at least one lesson |

## Competencies that lack eligible questions

From `node tools/english/educator/pilot-matrix.ts` (allocation for one learner; a question used in one step is not
counted again):

| Competency | Diagnostic | Practice | Check | One later check | Retention | Enough now? | If round 1 is approved? |
|---|---:|---:|---:|---:|---:|---|---|
| Subject–verb agreement | 3/3 | 3/3 | **1/2** | **0/2** | **1/2** | **no** | yes |
| Present and past simple | 3/3 | 3/3 | **0/2** | **0/2** | 2/2 | **no** | yes |
| Articles | 3/3 | 3/3 | **1/2** | **0/2** | **1/2** | **no** | yes |

**All three competencies lack enough eligible questions in the bank the app ships today.** The gap is always at the
target band (5 to 6.5): the independent check, the later check and (for two of them) retention. Diagnosis and practice
are covered. The synthetic journey shows the effect. For agreement, the independent check is blocked, so the target
cannot be shown and retention is never reached. The engine says so instead of claiming anything
(`SYNTHETIC_JOURNEY.md`).

The round-1 review package (`../educator-review-v1/round-1/`) contains exactly the questions that close this gap: 36
required plus 5 optional, of which 19 are from the provisional supplement. They become usable only after:

1. two educators review them;
2. any disagreement is adjudicated;
3. a separate, owner-approved content-release change applies the approved decisions.

**Even then:**

- present and past simple has 3 questions for later checks, not 6. A second additional later check would stop for lack
  of content; the stop rule handles that;
- every difficulty is an uncalibrated expert estimate;
- band 5 is a provisional target (`../G8_STANDARDS_REVIEW.md`).

## What this policy does not decide

- Whether band 5 is the Grade 8 standard (educator decision; round 1 asks it).
- Whether essay observations may be shown to a child before the evaluator is validated (decision D6).
- Session length and how many competencies a learner works on at once (pilot protocol).
