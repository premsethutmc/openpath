# Mathematics learner journey v2: authenticated fixed fractions program

Continues accepted foundation commit `22e28c7` on a separate integration branch. Adds a real-account fractions journey at `/mathematics.html`, served alongside the existing English app. It reuses Django account/pupil identity and the reserved mathematics event stream, CSRF/session transport, the canonical TypeScript Ledger/code scorer/profile, and unchanged eligibility rules. Subject registration is an explicit opt-in extension; default English behavior remains unchanged.

One complete fixed program for the existing equivalent-fractions competency includes explanations, an interactive equal-parts bar, worked/contrasting examples, ten original questions spanning guided, independent, story/application, reverse/number-line transfer and delayed retention activities. All content is provisional and mathematically checked, not educator approved. Activity completion is never mastery. Server-owned retention scheduling preserves completed work and rejects early checks and client-supplied eligibility fields.

School, JEE Main, JEE Advanced and GRE foundation journeys retain separate activity histories under the same pupil/competency and shared response history. Official scoring, exam readiness and timed simulations remain disabled. Broader exam topic practice and the other 199 competency programs remain scaffolds/planned.

The existing English entry point/navigation, Tamil source, essay branches, estimator and eligibility policies are not changed. This additive route is opt-in; subject-menu placement remains a coordination boundary with active navigation work. No merge or deployment is authorized. This draft targets the foundation feature branch for a focused stacked review.

Run instructions, architecture, screenshots and exact limitations: [v2/README.md](docs/mathematics/v2/README.md). Actual results, including existing shared-core research failures and the local SQLite concurrency diagnosis: [v2/VALIDATION.md](docs/mathematics/v2/VALIDATION.md).
