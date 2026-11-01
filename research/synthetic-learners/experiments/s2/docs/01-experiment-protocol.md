# 1. Experiment protocol (pre-registered)

This protocol was written, and its manifest hashed (`preregistration.json`), **before** any final-seed run. A pilot used seeds that are not in the experiment (1, 3, 5), to check the plumbing only. No synthetic parameter, cohort definition, metric definition or return policy changes after the final runs. Any later correction of a *code defect* is recorded in doc 10 together with its effect.

## Questions

1. Can OpenPath (D1 + E1 integration `cd40422b`) guide a learner from a specific weakness to independently demonstrated, retained competence?
2. Does it keep correct answers, genuine understanding and accidental success apart?

## System under test, and what the simulator may do

| Decided by OpenPath (real components, unchanged) | Done by the synthetic learner |
|---|---|
| The entry question (the module's own `diagnostics[0]`), every later question, explanation, recheck, delayed check and recovery step (`SliceFlow` → `moduleState` / `recover`) | Answers, working lines and hint requests, built from its hidden state |
| Every verdict (trusted `gradeRequest`), working feedback (D1 `working-assessment@1`, shown in the feedback message and the working panel) | Reads only learner-visible frames (adapter@2) |
| Misconception diagnosis (`hypotheses`), learner state (`learnerState` / `evidenceFor`), the retention schedule (retention@2) | Decides **when** to come back, from the topic page's delayed-check fact (a date) and the summary message |
| E1 shadow projection (`projectFromEvents`, non-authoritative) | — |

## Return policy (the same for every cohort)

- **A date is shown:** the learner comes back on that date at 09:00 UTC.
- **"Passed" is shown:** the journey is complete.
- **Otherwise:** the learner comes back the next day, or 2 days later after a "teacher or parent" pause.

## Bounds

- 16 visits, 120 simulated days, and 250 interactions per visit. One revealed explanation step counts as one interaction.
- A journey where OpenPath offers nothing (no question and no explanation) on 3 consecutive visits is classified **stalled**.
- Every bound reached is reported.

## Sample sizes

| Cohort | Profiles | Seeds per profile | Journeys |
|---|---|---|---|
| A, the primary cohort | S001–S006 | 50 | **300** |
| B, blinded | S001B–S006B | 20 | 120 |
| C, negative controls | C01–C04 | 20 | 80 |

Seed `i` = `profile.seed + 7919 · i`. Every learner id is unique: `s2-<cohort>-<profile>-<seed>`.

## Ground truth and metrics

Ground truth is the learner's hidden state: a **simulator assumption, not a fact about real students**. The definitions, numerators and denominators are in `src/metrics.ts` (`synthetic-experiment-metrics@1`) and doc 8. Results are reported per profile and per cohort, never as one success rate.

## What is recorded per journey (`traces/<cohort>.jsonl.gz`)

Each journey record holds:

- the learner id, profile and version, seed, cohort, and the initial and final hidden state;
- for every visit:
  - the delayed-check fact the learner saw;
  - OpenPath's questions, with kind, activity and hints;
  - the learner's responses and working;
  - the trusted verdicts and D1 working status;
  - teaching interventions, with their kind;
  - the phase sequence (rechecks, retention, recovery);
  - the learner state after the visit (status, retention, due date, history, recovery);
  - established hypotheses;
  - the E1 shadow projection;
  - the feedback the learner saw;
  - the hidden state after the visit;
- the learner's hidden instruction outcomes.
