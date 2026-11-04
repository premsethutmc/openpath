# 09 — Remaining blockers, limitations and unsupported routes

## Environment
- npm registry unreachable from the sandbox. The frontend typecheck runs with type packages built from GitHub sources (01). `bun:test` types (`bun-types`) are unavailable, so 57 test files report TS2307 in the integration config.
- The project `typecheck` script still fails at its third config, with errors already present on every source branch (137–175 on each). It was red before integration.

## Pre-existing failures left for a decision
- None in the learning package after the governance fix. 44 P2-FINAL skips remain: the routes are unsupported by design, so working on those routes is never certified, and correct acceptance there is not tested.

## Adaptive limitations (reported, not hidden)
- After an isolated slip by a competent learner, the module resumes its unfinished starting check (02, policy 1).
- Recovery escalates instead of teaching when every supporting skill is secure but the problem is still wrong (02, policy 3).
- No competency is "fully supported": each has at least one explanation that is not machine-checked-eligible (the gate skips it). Multiplication tables has no machine-checked explanation at all, so it is demonstration-only for teaching (05).
- A calculated due date is not a scheduling service. The due review appears when the learner opens the skill or reads their record; nothing notifies them, and no background scheduler exists. None is needed for these journeys.
- Discoverability was verified through the evidence (`retention: due`) and the module's next step. The year planner (`nextActivity`) was not exercised for retention, because the scenarios carry no enrolment.

## Renderer limitations
- MathLive (equation editor), JSXGraph (graphs) and in-browser geometry grading are not present. They are not needed by any selected scenario, which use numeric and choice answers only.
- On mobile, the feedback card sits below the navigation buttons: the existing stacked layout, kept unchanged (no redesign).
- The renderer's own demo experiences (`src/math/experiences`, `App.tsx`) still contain demo graders and prompts. They are not on any journey path.

## Unsupported mathematical routes (unchanged unless stated)
- Unregistered P2 moves; tasks with conditions are not refuted; irrational solution sets; systems; radicals and logarithms; the 44 P2-FINAL routes.
- New: a jump from an unfactored polynomial straight to its roots (`solve-jump`, unsupported).
- E7 process policy: shadow only.
