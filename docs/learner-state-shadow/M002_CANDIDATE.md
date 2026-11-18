# Research candidate M002 beside the live estimator

*18 November 2026. Branch `feat/english-shadow-learner-model`. Not merged, not deployed. Comparison only.*

## What it is

`packages/english-core/src/candidate.ts` holds a TypeScript port of the learner model developed in
openpath-research (`results/M001_report.md`, `results/M002_report.md`): one broad ability per learner with strand
and skill offsets, question difficulty that starts from the hand-set band and is corrected by answers, a guessing
floor, and one learned number for how far the hand-set bands can be trusted. The port reproduces the research
reference answer by answer (600 golden answers, `test/fixtures/m002-candidate-golden.json`).

`compareModels()` replays learners' records through the production `Ledger` and the candidate side by side and
scores both on the same answers: those production accepted as fresh, unaided evidence on code-scored questions.
Each model states its chance of a right answer before the answer is used.

## Where it runs

Only on the developer dashboard, **Model check** (`/developer`): press Run and it reads each listed pupil's record
through the audited developer API, replays in the browser and shows both models' log loss, Brier score and
calibration error. Fewer than 500 scored answers or 10 learners is reported as too little to judge.

## Isolation

- Nothing in the updater, planner, selection, retention or any learner-facing screen imports the candidate.
- `compareModels()` builds its own `Ledger` from a copy of the events. It writes nothing: no event, no estimate.
- Tests: the events and a learner's composite are byte-identical before and after a comparison
  (`m2-candidate.test.ts` C-5, `model-check.test.ts` MC-2).

## Limits

- The candidate's step sizes were tuned on simulated learners. They are provisional and should be re-tuned once
  there are real answers; the comparison will under-rate the candidate until then.
- It learns question difficulty across the learners it is run on, in order of learner id, in one pass. With few
  learners that is almost no information per question.
- The dashboard page was compiled and its logic tested; it was not opened in a browser, which needs the account
  server.
- The earlier shadow candidate (`shadow.ts`, wider uncertainty between sessions) is unchanged and still not wired
  to the app.
