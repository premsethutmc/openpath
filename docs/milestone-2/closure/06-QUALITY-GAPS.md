# 06 — What prevents consistently effective instruction (remaining educational-quality gaps)

Ordered by how directly each gap would harm a learner in a supervised evaluation.

1. **The eligibility gate passes content with verified errors.** The gate's machine checks verify the worked arithmetic. They do not verify a general rule's truth, a template's text, or explanations that are never machine-checked. Three erroneous explanations the engine can show today:
   - `missing-number/check_what_it_uses` and `worked_steps` teach "do the opposite to the other number", which gives 36 for 27 − □ = 9 (answer 18). `check_what_it_uses` is eligible; `worked_steps` is blocked for another reason.
   - `rational-numbers/spot_the_mistake` cuts the question off at "Work out 2/5 ×".
   - `multiplication-tables/doubling` (never machine-checked) says "double three times" where it doubles twice.

   **Before any supervised evaluation**, these must be blocked or corrected through a reviewed change. No such teaching-status mechanism exists yet (the quarantine is for questions only).
2. **No explanation has had an educator review.** There are 64 explanations: 37 machine-checked and eligible, 22 blocked by the gate, 5 never machine-checked. AI review is not educator approval.
3. **Second-line teaching is generic.** When the first explanation fails, the engine usually picks "check what it uses". In 5 skills it is demonstration-only: a template sentence naming prerequisites, with no example and a check that does not test what it names. In the scenarios it was the second explanation in 5 of the 9 runs that needed one (2b, 4a, 4c, 5a–5c), and the first own-skill explanation in 3h.
4. **Explanations aimed at a misconception are shown without evidence of that misconception.** For learners who succeed only with hints, or who are never right (4a, 4c, 5b), the engine teaches "spot the mistake" (about forgot-divide) with no established misconception. In all, 9 of 24 teaching decisions in 04 rest on an unverified diagnosis. What is missing: a general method explanation preferred when nothing is established, or one more discriminating question before teaching.
5. **Content quality is mostly "requires revision".** 38 of 64 explanations, according to three independent AI reviews. Common faults:
   - the text and the worked lines teach different things;
   - steps are given without reasons;
   - examples skip the case being taught;
   - checks do not test what was taught;
   - grade fit: remainders at grade 3, `y = mx + c` wording at grade 6, "rational coefficients" taught with whole numbers only.

   17 of 64 are judged ready for supervised evaluation (all subject to item 2).
6. **The recheck sometimes tests something else.** Examples: an addition check after a multiplication-sign explanation, and a one-step check with a different operation. The check is independent, but it does not always show that this explanation worked.
7. **Retention without reteaching.** After a failed delayed check, recovery asks re-check questions. Repeated retention failure leads to more re-checks, not new teaching, unless the module's ordinary rules choose a chapter.
8. **No learner-outcome data.** Every effectiveness statement here comes from content review and simulated learners. Whether an explanation actually helps can only be measured in the supervised evaluation the next decision is about.

## Already reliable (within the declared scope)
- Grading authority and provenance on every frame.
- Bounded retries and recovery.
- No false mastery in 41 scenarios plus the policy tests.
- Investigation separated from assessment (decision A).
- Retention failure state, durable across restarts (decision B).
- Own-skill teaching before escalation (decision C).
- Persistence and reconstruction.
- P2 answer-versus-method and lost-solution refutation.
