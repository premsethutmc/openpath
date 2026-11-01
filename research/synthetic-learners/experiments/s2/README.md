# S2: integrated synthetic learner experiment

Branch `research/synthetic-learner-experiment`, from the D1 + E1 integration `cd40422b1d5f2c7c464b0eb10a0c73c340a3f7ec`, plus the S1 simulator from `750e20e`. **Research only:**

- no production file changed;
- E1 stays shadow;
- nothing activated, merged or deployed.

| Deliverable | Where |
|---|---|
| 1. Experiment protocol (pre-registered) | [docs/01](docs/01-experiment-protocol.md), `preregistration.json`, `config.json` |
| 2. Cohort definitions | [docs/02](docs/02-cohort-definitions.md), `profiles/` |
| 3. Integration adapter | [docs/03](docs/03-integration-adapter.md), `src/port.ts` |
| 4. Simulation-clock and retention adapter | [docs/04](docs/04-clock-and-retention-adapter.md), `src/port.ts`, `src/journey.ts` |
| 5. Raw machine-readable journey traces | [docs/05](docs/05-raw-traces.md), `traces/` |
| 6. Per-profile results | [docs/06](docs/06-per-profile-results.md), `results/metrics-*.json` |
| 7. Per-cohort results | [docs/07](docs/07-per-cohort-results.md) |
| 8. Aggregate metrics and denominators | [docs/08](docs/08-aggregate-metrics.md), `src/metrics.ts` |
| 9. Failure-case catalogue | [docs/09](docs/09-failure-case-catalogue.md), `test/failure-cases.test.ts` |
| 10. Independent review | [docs/10](docs/10-independent-review.md) |
| 11. Regression report | [docs/11](docs/11-regression-report.md) |
| 12. Recommended engineering changes | [docs/12](docs/12-recommended-engineering-changes.md) |

**PASS here means the experiment was executed correctly. It does not mean OpenPath's teaching is effective.**
