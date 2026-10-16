# E003 actual production-ledger experiment (research only)

This is an additive research harness. It imports the **actual** production `Ledger.rebuild`, `binaryUpdate`, and content/framework loaders. It does not change the application, production updater, model defaults, or learner records.

Run from repository root using Node >=22.18:
```sh
node tools/english/research/e003.ts
```

The harness generates 120 synthetic learners per scenario, 20 training answers per learner, 10 held-out answers, with identical simulated evidence for the baseline and robust candidate. The actual production ledger performs scoring and updating. Synthetic items are injected into a temporary in-memory content index; no production item bank changes.

Metrics: nominal 80% normal-approximate interval coverage, held-out log loss/Brier, false mastery, missed mastery, interval width. These are diagnostic measures; they do **not** measure learning gain or question efficiency. The baseline and robust prediction scores use plug-in means rather than posterior predictive integration, which is a known approximation.

Important: E002's session-aware model cannot be represented faithfully by the current stateless binary-update hook. E003 deliberately tests baseline versus robust only. It does not claim to implement a session-aware candidate.

CI on this branch executes the harness and uploads machine-readable results. No model is deployed and no PR may be merged without explicit user approval.
