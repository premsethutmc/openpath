# 01 — Existing competency and teaching flow

Competency **`MATH.algebra.linear-equations`** ("Solve linear equations", grade 7). No new competency was created.

| Part | Before A3 (baseline `0d825e6`) | After A3 |
|---|---|---|
| Questions and generators | families `lin` (ax + b = c), `auleq` (choosing the equation), `aulwp` (word problems) | the same, plus `lboth` (x on both sides) and `lbrk` (a bracket), both in this competency, both with independent substitution validators and generator contracts |
| Teaching explanations | a module **built by template** from `lin`: `worked_steps` (machine-blocked: steps unverified), `spot_the_mistake` (forgot-divide), `check_what_it_uses` (demo-only). Only ax + b = c was taught | an authored module (stands in for the template, `content.ts`): concept section + 4 general explanations (A–E) + 7 misconception explanations (F); all 11 machine-checked by the teaching contract |
| Prerequisite relations | graph supports: linear-intro (one-step), rational-numbers, integer-add, integer-multiply | unchanged; one-step equations (linear-intro, family `ahone`) are used as the bridge in the `balance` explanation |
| Misconception definitions | `lin` bugs: forgot-divide, added-not-subtracted, divided-first | plus `lboth`: x-sign-kept, number-sign-kept, only-one-side; `lbrk`: first-term-only, bracket-sign, x-sign-kept |
| Adaptive interventions | `intervention.moduleState` (policies A, B, C; bounded retries), content gate (explanation-review@1), evidence (misconception-evidence@1) | unchanged, except: an eligible misconception-specific explanation (its misconception established) is ranked before general ones (`orderStrategies`) |
| Independent rechecks | each strategy's `check` (fresh question alone), then pool checks | each explanation's recheck is a fresh question of the same family as its worked example; a misconception explanation's recheck is a question on which that misconception predicts a different answer |
| Retention | retention@2: delayed check after a week; failure → review, recovery required (decision B) | unchanged; module retention questions unchanged |
| Renderer screens | app lesson (`Learn.tsx` Lesson), lesson page (`TeachingContent.tsx`), slice renderer | unchanged components; worked lines now carry their reason ("2x + 5 − 5 = 17 − 5 — Take 5 from both sides …") |

## What prevented effective teaching (baseline)

- Only one equation type (ax + b = c) was taught or rechecked; nothing on x on both sides or brackets, although the competency covers them.
- The only general explanation with worked steps (`worked_steps`) failed the teaching contract, so a struggling learner without an established
  misconception got `check_what_it_uses`, a generic "practise the prerequisite, then the method is …" screen rated demonstration-only.
- Worked steps had no reasons ("Take 17 from both sides: 18") and no check by substitution.
- One misconception explanation (forgot-divide) existed; learners with another established misconception got general teaching only.
