# 12. Recommended engineering changes

These are ranked by the weakness they address. **None is implemented here.** Each changes production behaviour and needs its own reviewed workstream and approval.

1. **Gate the competency claim on sub-skill evidence.**
   - *Problem (failure modes B, F):* two right answers of any family show the whole competency. 30/124 first claims in A were false; 64% of claims carry E1-unsupported sub-skills.
   - *Change:* make "shown alone" (and verified) require every core sub-skill to be independently demonstrated: promote E1's criterion from shadow to a gate, after an evaluation.
   - *Recovery after a failed check:* also require the failed check's own sub-skill.
2. **Sample the sub-skills that were shown in the delayed check.**
   - *Problem (E):* the retention list is two-step + modelling, so 31% of shown sub-skills are never checked.
   - *Change:* draw each check's questions from the sub-skills E1 shows, with at least one per shown sub-skill, keeping RETENTION_CHECK distinct answers.
3. **Give the paused state a way back.**
   - *Problem (A):* 191/300 journeys end with OpenPath offering nothing again, including after "it will come back".
   - *Change:* add a scheduled re-entry: a fresh diagnostic after N days, or after teacher sign-off is recorded.
   - *Product decision:* the hand-over itself.
4. **Show the delayed check's time, or open it at the start of the due day.**
   - *Problem (D):* 46% of returns on the shown date found nothing, because the check opens minutes after the time the learner arrives.
   - *Change:* either show the time on the topic page, or make the check due from the start of the shown day (`retention@2` due → day start).
5. **Revoke or decay a claim without waiting for the delayed check, and tolerate one slip in it.**
   - *Problem (C):* the claim outlived the knowledge in 20/21 C04 journeys.
   - *Problem (I):* careless S005 failed 64% of delayed checks, since any wrong answer fails one.
   - *Change:* re-test on the next visit after a claim made straight after teaching, and treat a single wrong answer in a delayed check like status@2 (two of the last three).
   - These two pull in opposite directions; evaluate them together.

## Also worth doing

- **Investigate misconceptions earlier (G).** OpenPath's established misconceptions are accurate, 22/24, but rare: 21/351.
- **Unrecognised errors (cohort B).** An error-pattern catalogue grown from D1's first-invalid-step data would let new misconceptions be named.
- **The simulator.**
  - Fix coefficient-dropped (a − c = 1), as a new profile version.
  - Add a teacher/parent actor, so paused journeys can be studied.
  - Add slip-aware ground truth.
