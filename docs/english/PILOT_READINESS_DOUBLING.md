# Pilot readiness: the consonant-doubling journey

Date: 2026-10-14. Branch `english/pilot-prep` (on PR #19). Feature work is frozen; this pass closes one evidence gap,
prepares the educator review and re-verifies the journey in a browser.

## Decision

| Stage | Decision | Still needed before this stage |
|---|---|---|
| 1. Internal demonstration | **GO** | Nothing. Present it as synthetic learners and provisional content (the demo page says so). |
| 2. Adult usability testing | **GO, with conditions** | Adult participants only, answering as themselves or from a script; a short participant information and consent note; facilitator says the content is unreviewed and no result is a measure of anyone. No children's data. |
| 3. Supervised testing with children | **NO-GO** | All of the approvals and decisions listed below. |
| 4. Public release | **NO-GO** | Everything for stage 3, then pilot evidence, plus the release items listed below. |

## What stage 3 (children, supervised) needs

1. **Educator approval** in `review/doubling-educator-review.xlsx`, by a named reviewer with a date:
   - all 3 lessons and 9 hints, with the 8 overgeneralisation flags decided;
   - the 12 practice words;
   - the 40 lines of child and parent wording.
   - Questions may stay provisional for a supervised session (they change no levels), but each must still be approved as
     suitable before a child sees it.
2. **Your decision on three behaviours found in this pass** (planner and content changes, not made here):
   - **P-1.** A child who makes one typing slip and is otherwise always right is taught a lesson they did not need.
     The slip is correctly not counted, so after the 5 diagnostic questions only 3 count (4 are needed), and the planner
     teaches. The screen says "Not yet right on new words: teaching the rule", which is untrue for that child. Seen with
     demo learner G.
   - **OG-7.** No "must not double" word appears in practice or in the check after teaching. A child who learns "always
     double" would pass that check.
   - **OG-6.** Hint level 3 gives the answer.
3. **Safeguarding and consent:** written information for parents or guardians and their consent, the child's own agreement,
   a supervising adult present throughout, and a note on what the supervisor does when the app recommends adult help.
   Data stays on the device: no accounts, no remote storage and no external evaluation are enabled.
4. **Data-protection review** of the above for the country of the pilot (rules on children's data differ).
5. **A session protocol:** device, how long, what is observed, how sessions are stopped, and how observations are recorded
   (not from the app's own estimates).

## What stage 4 (public release) also needs

- Results from stage 3 that show the journey is understandable and not harmful, reviewed by an educator.
- Validated questions (switched one by one after approval), and enough of them for a second delayed check.
- Threshold review based on pilot data (the planner and rule-evidence values are still drafts).
- Privacy notice, terms, accessibility audit, security review, support route.
- Your approval to deploy or expose anything publicly. None has been given and nothing is deployed.

## What changed in this pass

**Evidence gap closed.** The journey used two bank questions (swim, run) that were not gated, so answers to them still
changed the estimate. The journey now uses its own copies, `spl.infl.j02` and `spl.infl.j11`, marked provisional. The bank
items `spl.infl.02` and `spl.infl.11` are unchanged and keep their status; no other bank question changed. A word the learner
has already answered elsewhere counts as seen, so swim is not asked twice.

Regression tests (`journey-reliability.test.ts`, R-8 and R-8b):
- every question in the journey is provisional and not in the ordinary question pool;
- for all six learners, a full journey, then a return 30 days later, leaves the capability estimate exactly where it started,
  with no accepted decision;
- no learner's rule state can count as verified (`countsAsVerified` is false);
- the bank items keep no evidence status, and answering bank swim first means the journey does not ask its own swim.

**Demo extended.** Learner A returns after 30 days and is right; F returns after 7 days and is wrong; new learner G makes one
slip. The demo now checks each parent summary and fails if any check fails.

## Test results

| Check | Result |
|---|---|
| Core tests (`packages/english-core`) | 149 pass, 0 fail |
| Frontend tests | 56 pass, 0 fail (one added: a slip is reported as a slip) |
| Typecheck (core, web app) | clean |
| Browser tests, phone size, production build | 6 pass, 0 fail |
| Phone-size demo, 7 learners, 42 screenshots | 9 of 9 parent-summary checks pass |
| Framework lock, generated items, bank gates, E3 harness | unchanged |
| Ten-learner simulation | output identical to `main` |

### Parent summaries in the browser

| Learner | What happened | What the parent summary says | Right? |
|---|---|---|---|
| A | All right; returns after 30 days, still right | No difficulty, no help; "Confirmed: still right after at least a week"; status adds "(on provisional questions: a demonstration, not a verified result)" | Yes |
| B | Wrong twice, one lesson, then right | Two "on their own" errors and the pattern; 1 lesson; "2 of 2 new words right"; "Progress, not yet mastery" | Yes |
| C | First lesson fails, second works | Independent and helped answers listed separately; "Yes: 2 approaches tried" | Yes |
| D | Right only after a hint | "0 right at the first try, 12 right after a hint"; "Right with help in practice, not yet without help"; adult help recommended | Yes |
| E | Never right | 3 approaches, 36 hints (each counted once), adult help recommended | Yes |
| F | Right, then wrong after 7 days | "Not kept: wrong at the check after a week. Earlier progress is still recorded"; first-shown date kept | Yes |
| G | One slip, otherwise right | "letters swapped, the rule itself was applied"; no pattern, no rule error | Yes (but see P-1: an unneeded lesson was given) |

Every summary carries the provisional note and shows no percentages or probabilities.

### Minor wording points (for the reviewer, not blockers)

- Answers at the delayed check read "on their own (no hint, first try)", without saying they were at the check.
- The delayed-check question is labelled "A week later" whether it is 7 or 30 days.
- Two practice words (sitting, winning) have no tagged wrong answer, because "siting" and "wining" are real words; a wrong
  answer there is not labelled a doubling error.

## Limits

Synthetic learners show that the software behaves as specified. They show nothing about whether children learn. No
educational claim follows from these results.
