# 9. Proposed end-to-end experiment specification (for after D1 + E1 integration; NOT run)

**Fixed before any run:**
- profiles `@1.0.0`;
- seeds 1–50 per profile;
- return schedules {1, 8, 3, 8} and {7, 7, 7, 14} days;
- OpenPath at the integrated commit.

The ground truth is the simulator's **hidden** state, read only after a run. A sub-skill counts as "weak" when its ability is below 0.6, or when a misconception of strength 0.3 or more applies to it. **Parameters will not be tuned to improve OpenPath's scores.** A parameter change is a new profile version, and the old results are kept.

| Group | Metric | Numerator / denominator | Expected behaviour |
|---|---|---|---|
| Diagnosis | correct identification of weak sub-skills | weak sub-skills OpenPath marks as needing work (E1 status not "independently-demonstrated", or teaching delivered for that kind) / hidden-weak sub-skills | high for S002, S003 and S006; near 0 weak sub-skills for S001 and S005 |
| | false diagnosis | OpenPath-established misconceptions the learner does not hold (hidden strength 0) / OpenPath-established misconceptions | low; S005's slips must not become misconceptions |
| | missed misconceptions | hidden misconceptions with strength ≥ 0.3 that had at least 2 opportunities and are not established / such misconceptions | low for the catalogued ones; `divide-wrong-way` is outside the catalogue, so it is expected to be missed and reported separately |
| Teaching | appropriate intervention | explanations delivered whose kind or misconception matches a hidden weakness / explanations delivered | high |
| | unnecessary remediation | explanations delivered on a kind with hidden ability ≥ 0.9 and no misconception / explanations delivered | low for S001 and S005 |
| | repeated ineffective intervention | the same explanation delivered again after its earlier delivery drew outcome "none" / repeated deliveries | reported, not judged: it depends on policy |
| Mastery | false mastery declaration | competency or sub-skill declared shown alone or verified while hidden ability < 0.6 or a misconception ≥ 0.3 applies / declarations | **0 is the target**; S004's guessing and S006's fragile knowledge are the stress cases |
| | missed genuine competence | hidden ability ≥ 0.9 with no misconception, and ≥ 4 independent answers seen, but not shown / such sub-skills | low |
| | cross-sub-skill leakage | competency-level claims where E1 reports unsupported sub-skills / competency-level claims | measured (E1 discrepancies) |
| | answer vs method | right answers whose working has a false step and are counted as verified method / right answers with false-step working | **0** |
| Retention | appropriate delayed checks | delayed checks taken ≥ 7 days after shown / delayed checks | 1 |
| | missed retention checks | sub-skills shown but never sampled by a delayed check / sub-skills shown | expected to be high for both-sides and brackets (the known gap in E1) |
| | incorrect cross-family recovery | recoveries completed by answers of another kind / recoveries | measured |
| | recovery success / failure | recovery-required that ends recovered with hidden ability ≥ 0.6, or recovered with ability < 0.6 / recovery-required | reported per profile |
| Efficiency | questions to diagnose | answers before the first teaching or explanation decision | median per profile |
| | questions to demonstrate competence | answers until shown alone, per sub-skill | median; not computed where it never happens |
| | teaching interventions per learner | explanations delivered | median per profile |
| | total simulated sessions | sessions until summary with no further step, or the schedule ends | per profile |

**Reporting.** Every metric is reported per profile with its denominator and a 50-seed distribution, never a single seed. The review found single-seed outcomes vary a lot: S005 ends in 8 different status combinations over 30 seeds.
