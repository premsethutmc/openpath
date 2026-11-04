# 5. Cross-family leakage findings

Source: `frontend/scripts/d1e1-leakage-scan.mts`. It runs the real module flow (real grader, evidence and adaptive engine) for every Milestone-2 scenario on linear equations, plus two learners who are right on two-step questions and wrong on every both-sides and bracket question. It then projects the stored events. These figures come from the final regression run (doc 7); the full record is [`leakage-scan.json`](leakage-scan.json).

**29 learners.** 23 of them get a broad authoritative claim (independent or transfer). In **5** of those, the sub-skill evidence does not support the claim:

| Scenario | Learner | Answers by family (✓ right, ✗ wrong) | Authoritative status / delayed check | Sub-skills not supporting the claim |
|---|---|---|---|---|
| 6a | strong, slips once on the delayed check | lin ✓✓✓✓✓✓✓✓✓✓✗✓✓; auleq ✓; aulwp ✓✓; lboth ✓✓✓✓✓; lbrk ✓✓✓✓ | transfer / scheduled | both-sides=retention-due, brackets=retention-due |
| 6c | strong (always right) | lin ✓✓✓✓✓✓✓✓✓✓✓; auleq ✓✓; aulwp ✓✓; lboth ✓✓✓✓✓; lbrk ✓✓✓✓ | transfer / passed | both-sides=retention-due, brackets=retention-due |
| 6d | misconception forgot-divide until 1 explanation(s) | lin ✗✗✗✗✓✓✓✓✓✓✓✓✓✓✓; auleq ✓✓; aulwp ✓✓; lboth ✓✓✓✓✓; lbrk ✓✓✓✓ | transfer / passed | both-sides=retention-due, brackets=retention-due |
| X1 | right only on lin, auleq, aulwp | lin ✓✓✓✓✓✓✓✓✓; auleq ✓; aulwp ✓✓; lboth ✗✗✗✗; lbrk ✗ | transfer / scheduled | both-sides=developing, brackets=insufficient-evidence |
| X2 | right only on lin, auleq, aulwp | lin ✓✓✓✓✓✓✓✓✓✓; auleq ✓✓; aulwp ✓✓; lboth ✗✗✗✗; lbrk ✗ | transfer / passed | both-sides=developing, brackets=insufficient-evidence |

## What this shows

1. **X1 and X2: two-step success establishes neither brackets nor both-sides, yet the authoritative state says transfer.**
   - The learner was wrong on all 4 both-sides questions and the only bracket question.
   - The authoritative status reaches `transfer`. On return 8 days later, its delayed check is `passed`.
   - The projection: both-sides `developing` (0 right alone) and brackets `insufficient-evidence`. Two-step is the only core sub-skill shown.
2. **6a, 6c, 6d: the module's delayed check samples only two-step and modelling questions.**
   - Both-sides and brackets are shown, but their own delayed check is never sampled, so they stay `retention-due` while the competency check is scheduled or passed.
   - This is a content gap: the module retention list holds one `lin` item and one `auleq` item only.
3. **The other 18 learners with a broad claim are supported by every core sub-skill.**
4. **The J10, J11 and J12 journeys (doc 4):** four two-step answers, three both-sides answers, or three bracket answers given alone each give the authoritative status `independent` for the whole competency. The projection shows only that one sub-skill and reports the discrepancy.
5. **J03 and J17 (current verdicts):** right answers reached through false working count fully in the authoritative state, which reports `independent`. The projection marks them contradicted and does not count the sub-skill as demonstrated.

## Authoritative decisions

None was changed. Every discrepancy is reported, not acted on.
