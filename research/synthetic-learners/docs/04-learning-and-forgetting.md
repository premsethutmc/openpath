# 4. Learning and forgetting model

**Instruction (`applyInstruction`).** An explanation is understood from its visible title, or failing that its text, through the simulator's own reading table (`learner.ts READING`).
- The outcome is **drawn**: full (`gain` × room to improve), partial (half of that) or none, using the profile's probabilities.
- Only the kind the explanation is about improves. Other kinds get `offTargetGain` × that.
- An explanation the learner cannot place teaches **nothing**. This was a review fix: earlier, any explanation gave a small gain everywhere.
- A share of each gain is **fragile**: it is temporary until consolidated.
- A misconception is reduced only when the explanation addresses that misconception, the outcome was not "none", and a further draw (`misconceptionResponse`) succeeds.

**Practice (`applyPractice`).** Only answers the learner gave **alone** count: no hint shown, decided from the learner's own side, not from OpenPath's classification. Only answers the learner actually worked out count; a guess is not practice.
- Practice consolidates part of the fragile knowledge into stable knowledge.
- It nudges stable knowledge by `gainRight` after a right answer, or by `gainWrong` after a wrong one with feedback seen.
- Practice never changes a misconception.

**Forgetting (`applyForgetting`)** happens on the simulation clock only.
- Stable knowledge decays towards `min(stable, floor)` with half-life `halfLifeDays`.
- Fragile knowledge decays with `fragileHalfLifeDays`.
- A reduced misconception relapses towards its starting strength by `relapse` × (fraction of time decayed).

| Required behaviour | Mechanism | Test |
|---|---|---|
| successful learning | outcome "full" | `full=1` raises the target kind |
| partial improvement | outcome "partial" | outcomes over 60 seeds include full, partial and none |
| no improvement | outcome "none" | `full=partial=0` leaves the state unchanged |
| temporary improvement | the fragile share, plus fast fragile decay | S006 loses more than 0.2 in 14 days |
| misconception persistence | `misconceptionResponse = 0`; a general explanation never reduces it | tested |
| forgetting after delay | half-life decay | S006 forgets; S001 barely does |
| successful / failed recovery | instruction after forgetting, drawn as above | both tested |
| not rewarded for OpenPath's choice | the effect depends on what was delivered and on the draw; an unplaceable or off-target explanation gives nothing or little | tested |
