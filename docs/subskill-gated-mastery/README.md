# M1 — Evidence-based mastery and retention (sub-skill-gated, shadow)

Branch `feat/subskill-gated-mastery`, based on `integration/d1-e1-subskill-evidence` at `cd40422b`.

The proposed policy `subskill-gated-mastery@1` is computed beside the existing authoritative status.

- It is **not activated**.
- The existing status, the adaptive engine, the selector, the app and the backend are unchanged.

| Document | Content |
|---|---|
| [01-implementation.md](01-implementation.md) | What was built on E1, the gate, the kept-separate records, the shadow variants |
| [02-policy-comparison.md](02-policy-comparison.md) | The existing and proposed rules side by side, and the disagreements on the journeys |
| [03-learner-traces.md](03-learner-traces.md) | The 16 required journeys (`traces/journeys.json`: every submission, verdict, both policies) |
| [04-s2-comparison.md](04-s2-comparison.md) | Existing vs proposed on S2's 500 recorded journeys |
| [05-regressions.md](05-regressions.md) | Test runs |
| [06-independent-review.md](06-independent-review.md) | The reviewer's findings and what was done about each |
| [07-activation-risks.md](07-activation-risks.md) | What would have to be settled before any activation |

To reproduce:

- **Journeys** (from `frontend/`): `node --import tsx --test src/journey/gated-mastery.test.ts`
- **S2 comparison** (from `frontend/`): `node --import tsx ../research/synthetic-learners/experiments/s2/m1/compare.mts`, then `python3 report.py` (in `research/synthetic-learners/experiments/s2/m1/`).
