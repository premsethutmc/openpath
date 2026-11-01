# Activation risks

The proposed policy is **not activated**. This is the list of what would have to be settled before anyone considered activating it. Nothing here
is a recommendation to activate.

1. **Data gap from the current selector (dominant).**
   - The S2 histories were produced by the existing selector. It ends a journey when the competency-level delayed check passes, and it is not required to ask every sub-skill.
   - Many learners were never asked both-sides or brackets alone (04, coverage).
   - Under the gate those learners can never be shown, however strong they are. The "missed competence" figures for the gate are therefore mostly "never asked", not evidence that the gate is wrong or right.
   - Activating the gate without a selector that schedules the missing sub-skills would block completion for those learners.

2. **Grading mode.**
   - The invalid-working rule (a right answer with a false step is neutral) and `gated-method` need trusted D1 working verdicts on the record. That means `grading-decision@1`, `decidedBy: "server"`.
   - The backend's default grading mode is `shadow`, which stores the unified decision beside the record rather than on it.
   - Under that default, the gate reads answers only. Correctness and method are no longer separated in practice.

3. **Delayed checks the app does not ask.**
   - The module's delayed check samples only two-step and modelling.
   - Both-sides and brackets go `retention-due` and stay counted as shown for good, unless the per-sub-skill plan (`proposedRetentionPlan`) is actually asked.
   - S2 reports how many claims rest on a never-checked due sub-skill.

4. **Check timing.**
   - A sub-skill's check runs from its own `independentAt + 7 days`. A wrong delayed-check answer that comes earlier is ignored by that sub-skill's cycle.
   - The existing competency check counts it. The two policies can disagree in the proposal's favour (04: `gatedClaimsDespiteEarlyWrongCheck`).

5. **Unresolved policy choices.** These are kept as shadow variants and have no recommended setting:
   - **Multiple-choice and choice items (`gated-typed`).** Excluding them removes guessing, but also removes the module's own modelling practice (`auleq` is a choice item). Learners shown only through `auleq` lose modelling (journey 5).
   - **Verified working required (`gated-method`).** Unsatisfiable under risk 2.
   - **Slip tolerance in a delayed check (`gated-slip`).** Fewer recoveries, but a real failure can be read as a slip.

6. **Provenance.**
   - An attempt with an untrusted decision is excluded from evidence. A record with no decision is read as before D1, with the answer re-graded.
   - Removing a server decision outright (as opposed to replacing it) therefore still lets an answer count by its answer alone.
   - This needs write access to stored records. The server refuses client decisions, and mathematics imports are refused.

7. **Ordering.**
   - Both policies here read events in E1's canonical order; the app reads store order. These are identical for server-stamped records.
   - Legacy or imported records with out-of-order timestamps, or duplicate ids with different content, could differ.

8. **Modelling breadth.**
   - `auleq` (choose an equation) and `aulwp` (form and solve) are one sub-skill.
   - Success on either clears the other's failure.

9. **Historical semantics.**
   - An older authority's false-step verdict still makes an answer neutral (never regraded away).
   - Its verified verdict is never upgraded.
   - This is deliberate and tested, and it is asymmetric.

10. **Synthetic validity.**
    - S2's ground truth is the simulator's hidden state, not real learners.
    - Fewer claims is not, by itself, better learning, and this branch makes no such claim.
