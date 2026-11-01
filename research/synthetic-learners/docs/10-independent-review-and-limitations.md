# 10. Independent review and limitations

A separate AI agent reviewed the code (probe scripts, about 9,600 generated responses). It had not written the code. **AI review does not establish that the synthetic learners behave like real students.**

| # | Finding | Label | Action |
|---|---|---|---|
| 1 | Any explanation, even one the learner cannot place, gave a small gain to every kind | **DEFECT** | **Fixed**: an unplaceable explanation teaches nothing. The test is now strict (state unchanged). |
| 2 | With unsupported notation, the operation line ignored the misconception, so the error appeared on the next line | **DEFECT** | **Fixed**: notation is written only for steps done right; an erroneous step is written plainly. New test (4 misconceptions × 12 variants). |
| 3 | One-step "full working" was only `x = v`, so no method was visible | **DEFECT** | **Fixed**: the operation line (`x = 11 + 4`, `x = 33/3`, `x = 12*2`) comes first. Method-verified for a correct learner (tested). |
| 4 | When a modelling multiple-choice item had no matching option, the trace said "solved" | **DEFECT** (minor) | **Fixed**: labelled guessed. |
| 5 | `A3Port.flow` was public | RISK | **Fixed**: the flow is private and created by the harness. The test checks the port's own keys are `["contract"]`. |
| 6 | Practice counted as independent only when OpenPath showed no hint button, which is circular | RISK | **Fixed**: independence is the learner's own: it did not use a hint. |
| 7 | A guessed answer still counted as practice | RISK | **Fixed**: guesses are not practice (tested). |
| 8 | The reading table matches OpenPath's 12 explanation titles, and the misconceptions are OpenPath's catalogue (a closed-world fit that favours OpenPath) | RISK (major) | **Partly addressed**: an off-catalogue misconception (`divide-wrong-way`, S002) and unmodelled conceptual errors exist. **Remaining limitation**, below. |
| 9 | No modelling explanation exists in OpenPath, so modelling misconceptions can never be reduced | LIMITATION | documented |
| 10 | Unreadable questions (`:w` word variants, prerequisite fraction questions, find-the-mistake) are guessed by every profile, including S001 | LIMITATION | documented. OpenPath's evidence from those items is noise from the simulator. |
| 11 | The fixed return schedule ignores OpenPath's due dates | RISK | documented; the experiment uses two schedules; the learner-visible next-check date is a missing integration point (doc 7) |
| 12 | Single-seed traces are not representative | RISK | the experiment spec requires 50 seeds |
| 13 | S001 and S005 differ mostly in slip rate; their high forgetting floors make retention failure rare | LIMITATION | intended by the descriptions; documented |
| 14 | Practice never changes misconceptions; quality of an explanation's content does not matter, only its title | LIMITATION | documented |
| 15 | Seed reproducibility, no leakage of ids, keys or estimates, correct algebra (all phases), each misconception produces exactly one invalid step, all sessions end at OpenPath's own summary | OK | — |

## Limitations

- **Not calibrated.** The parameters are invented for each profile's description and are not calibrated against real students.
- **A narrow reading model.** The learner reads equations only in OpenPath's prompt formats and seven story templates. Anything else is guessed.
- **A closed-world error model.** Errors are mostly OpenPath's own catalogue, plus small unmodelled conceptual errors and one off-catalogue misconception. Real students make other errors.
- **Explanations work through their titles.** An explanation's effect depends on the learner recognising its subject, not on its quality.
- **Not tested beyond one competency.** It runs only on the single-competency A3 journey. The integration points are in doc 7.
