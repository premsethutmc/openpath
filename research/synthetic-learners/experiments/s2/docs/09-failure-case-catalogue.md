# 9. Failure-case catalogue

**The suite.** `test/failure-cases.test.ts` covers the 20 required cases through the real integrated journey (**20 / 20 pass**). Cases marked *observed weakness* pin down current OpenPath behaviour, so a change in that behaviour fails the test and must be reviewed.

**How to read the labels.**

| Label | Meaning |
|---|---|
| **Observed** | what OpenPath did |
| *Assumption* | what the synthetic learner was |
| *Inferred* | the weakness that follows, given the assumptions |
| *Unverified* | an educational claim nothing here checks |

| # | Case | Observed (OpenPath decision) | Verdict |
|---|---|---|---|
| 1 | correct bare answer | right; D1 "answer-only"; the message says the method was not checked; E1 has no method evidence | **correct handling** |
| 2 | correct answer, invalid working | right answer; D1 "invalid", first false line 1, shown to the learner; E1 method "contradicted" | **correct handling**. The authoritative status still counts the answer: 33/2551 right answers in A had a false step. |
| 3 | repeated guessing (C02) | no authoritative claim, and no E1 demonstration, in any of the 20 C02 journeys | **correct handling** |
| 4 | assisted answers | never "shown alone", never E1-demonstrated | **correct handling** |
| 5 | persistent misconception (C01) | taught; nothing changes; no claim in any of the 20 C01 journeys; every C01 journey ends in a hand-over to a teacher | correct, but see stalls |
| 6 | unrecognised misconception | the error is graded wrong, but no hypothesis names it. Over cohort B, 0 of 114 held unrecognised misconceptions were established. That is true **by construction**: OpenPath has no explanation for them. 9 of B's 10 established explanations were about prerequisite skills. | *Inferred*: OpenPath can see that the answers are wrong but cannot say what is wrong, and its teaching is general. |
| 7 | wrong intermediate step | D1 points at that exact line | **correct** |
| 8 | right steps, wrong final answer | verdict incorrect; the working is not called wrong before its final line | **correct** |
| 9 | partial working | D1 "partial"; feedback level "partial"; nothing invented | **correct** |
| 10 | unsupported notation | not a false step | **correct** |
| 11 | early apparent mastery, then failure (C04) | claimed "transfer" on visit 1, while the fragile knowledge was there; **still claimed** after it had gone (20/21 C04 journeys: the true first claim outlived the knowledge); the delayed check then catches it (C04: 23/23 checks failed) | **observed weakness:** the claim stays until a delayed check. *Assumption:* fragile knowledge decays in about 1.5 days. |
| 12 | successful teaching, then independent success | the taught kind improves and "shown alone" follows (the instruction outcome was forced to full) | works when instruction lands |
| 13 | failed teaching, then inappropriate mastery | C01 is never credited | **correct handling** in this case. But in A, 30/124 journeys with a claim made a **false first claim** (S003: 53/53 claims, because both-sides and brackets are weak; S006: 16/16). |
| 14 | retention failure | the failed check is kept in the history (all 146 failed cycles in A) | **correct** |
| 15 | recovery targeting the wrong sub-skill | a failed **modelling** check was recovered with two-step and bracket answers (journey s2-A-S001-143543). Overall, 41/75 recoveries in A completed without a right answer of the failed kind, and only 27% of recovery answers were of the failed kind. | **observed weakness:** retention@2 recovery is competency-wide |
| 16 | bracket mastery from two-step success | two-step answers alone earn "shown alone"; E1 shows brackets not demonstrated, and the discrepancy is exposed | **observed weakness** (authoritative), **caught** by E1 (shadow). 64% of A's claims carry unsupported sub-skills. |
| 17 | both-sides mastery from unrelated success | E1 never credits both-sides from other families | **correct** (E1) |
| 18 | historical authority-version evidence | a decision recorded under authority @2 is not upgraded to current method evidence | **correct** |
| 19 | forged client grading claims | the adapter drops them; the server grades; nothing is verified | **correct** |
| 20 | restart and replay | identical journeys; state rebuilt from records equals the live state | **correct** |

## Failure modes the experiment found

| Failure mode | Measurement | What lies behind it |
|---|---|---|
| **A. Journeys end in a permanent hand-over** | A: 191/300 "stalled": OpenPath offered nothing on 3 or more consecutive visits, almost always after its own pause ("ask a teacher or parent"). The reviewer re-ran stalls to 80 days: nothing resumed. | **Observed.** The pause never lifts on its own in this journey, including the variant that says "it will come back". *Limitation:* the simulator has no teacher, and in the full app the year planner would move to other topics. |
| **B. A false competency claim from one or two kinds** | A: 30/124 claiming journeys had a false **first** claim (S003 all 53 claims, S006 16/16); 64% of claims carry E1-unsupported sub-skills | **Observed** status, plus *assumed* hidden weakness: any two right answers alone, of any family, show the whole competency |
| **C. Claims outlive the knowledge** | C04: 20/21 true first claims later held while the knowledge had gone | **Observed:** only a delayed check revokes "shown alone" |
| **D. The shown date is too early** | 214/468 returns on the date shown were before the due minute; the visit offered nothing | **Observed product gap:** the date is shown without the time; the check opens minutes later |
| **E. Delayed checks do not sample what was shown** | 31% of E1-shown sub-skills were never sampled; retention questions in A: two-step 185, modelling 149, both-sides 52, brackets 27 | **Observed:** the retention list is two-step + modelling |
| **F. Cross-family recovery** | 41/75 recoveries without the failed kind | **Observed** (retention@2) |
| **G. Misconceptions are rarely established** | A: 330/351 held catalogued misconceptions never established (OpenPath's established ones are right 22/24 times). Many held misconceptions were addressed by general teaching instead. | *Inferred:* establishing needs two matching answers in an investigation; most learners are taught or paused first |
| **H. Teaching after slips** | S001 and S005 (strong; slips): explanations on strong kinds, 37% of A's explanations | *Partly a metric artefact:* the hidden "strong" label ignores slip rate. OpenPath reacts to real errors. |
| **I. Careless learners fail delayed checks** | S005: 64% of checks failed | **Observed:** any wrong answer fails the check (retention@2); no slip tolerance |
