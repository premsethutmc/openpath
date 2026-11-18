# Reading comprehension course

*18 November 2026. Branch `feat/english-reading-comprehension`. Not merged, not deployed.*

A learner opens **Reading** from the English home screen, picks a skill and a level (or takes the suggested next
step), and goes through three stages:

1. **Lesson** – the strategy in two sentences, then a worked example on a teaching text, shown one step at a time.
2. **Practice** – two questions on practice texts. Feedback is immediate. Help comes in three rungs: the strategy,
   a nudge for this question, then the part of the text to reread is marked. A wrong option is crossed out; after
   two wrong tries the answer is explained.
3. **Fresh check** – two questions the learner has never been shown, each on a text never used for teaching or
   practice. No hints, and nothing is marked until both are answered. "Check me" on the map goes straight here.

## What exists

| | |
|---|---|
| Skills (6) | finding details, order of events, why it happened (cause), feelings and reasons, main idea, fact or opinion |
| Levels (3) | Starter (framework band 2), Builder (band 4), Challenger (band 6) |
| Per skill and level | 1 lesson with a 3-step worked example, 2 hinted practice questions, 4 check questions on 4 texts (two fresh checks) |
| Totals | 21 original texts, 18 lessons, 36 practice questions, 72 check questions |

Content: `content/english/reading/`. Logic: `frontend/src/english/logic/reading/`. Screen:
`frontend/src/english/ui/Reading.tsx`.

## Rules

- **Fresh means never displayed.** A check question counts as seen from the moment it is shown, answered or not.
  When fewer than two unseen check questions are left, the unit says so; it never repeats one.
- **What a pass is called.** "Shown on your own" only when the learner asked to be checked and had no lesson,
  practice, hint or marked check in that unit. Otherwise "Solved independently after help". A pass needs both
  questions right.
- **Moving between levels.** A pass offers the next level. A miss above an unpassed level offers a step back to
  it. Otherwise a miss means practise again, then the second fresh check.
- **Practice-only.** The course writes `reading` events to the learner's record and nothing else: no engine
  evidence, no capability estimate, no mastery claim. It is hidden in a pilot build.
- **Content checks run on load and in tests:** evidence is quoted from the text, hints do not contain the answer,
  texts stay within each level's word range, levels step up in length and sentence load, and the right answer
  cannot be guessed from position or length.

## Not done

- No one other than the author has read the texts, questions or explanations. They are checked by rules only.
- Six of the framework's reading capabilities have no unit: summarising, non-fiction structure, purpose and
  audience, and the uncored ones (prediction, tone, viewpoint, comparing texts, and so on). No band 8 level.
- Two fresh checks per unit. After both, the unit has nothing new to ask.
- All questions are multiple choice. No typed or spoken answers, so the writing evaluator is not involved.
- A text can come round again for a different skill (unread texts are used first).
- No later (retention) check, and results do not feed Today's plan, the Journey tab or the parent's progress view.
- A visit that is left half-way starts again from the lesson; only check questions already shown stay used up.
- Not run on a physical phone; the browser test emulates an Android-sized screen.
