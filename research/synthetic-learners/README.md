# Synthetic learner simulator (S1, research)

Branch `research/synthetic-learner-simulator`, from A3 `4f97427b2734b448a15d4f0601fe5596957c42b8`. This is research only. It is not used by the app and is not activated anywhere. **No production file is changed.**

- **What it is.** A deterministic synthetic learner that goes through OpenPath's real linear-equations journey. The simulator generates only the student's behaviour: answers, working, hint requests and return visits.
- **What OpenPath still decides.** OpenPath decides what to ask, grades, teaches, rechecks and schedules.
- **What is kept apart.** The hidden knowledge state stays inside the learner.

| Deliverable | Where |
|---|---|
| 1. Six versioned learner profiles | `profiles/S001–S006.json`, [docs/01](docs/01-learner-profiles.md) |
| 2. Synthetic response generator | `src/reading.ts`, `src/responder.ts`, [docs/02](docs/02-response-generator.md) |
| 3. Hidden knowledge-state model | `src/model.ts`, [docs/03](docs/03-hidden-state-model.md) |
| 4. Learning and forgetting model | `src/model.ts`, `src/learner.ts`, [docs/04](docs/04-learning-and-forgetting.md) |
| 5. Deterministic simulation clock | `src/clock.ts`, [docs/05](docs/05-simulation-clock.md) |
| 6. Seeded replay harness | `src/rng.ts`, `src/harness.ts`, `scripts/traces.mts`, [docs/06](docs/06-replay-harness.md) |
| 7. Integration adapter contract | `src/adapter.ts`, [docs/07](docs/07-integration-adapter.md) |
| 8. Simulator test results | `test/simulator.test.ts`, [docs/08](docs/08-test-results.md) |
| 9. Proposed end-to-end experiment specification | [docs/09](docs/09-experiment-specification.md) |
| 10. Independent review and limitations | [docs/10](docs/10-independent-review-and-limitations.md) |

Machine-readable traces are in `traces/S00x.{boundary,hidden,openpath}.json` and `traces/summary.json`.

Run from `frontend/`:

```
node --import tsx --test ../research/synthetic-learners/test/simulator.test.ts
node --import tsx ../research/synthetic-learners/scripts/traces.mts
```
