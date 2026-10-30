# Milestone 2 — Robust adaptive learning: report

Branch `milestone-2/robust-adaptive` from the accepted M1 commit `9f3f65d`. Commit SHA: see the final message and `git log`. Not merged to main; not deployed. E7 is not activated; no corpus label was changed.

| # | Deliverable | File |
|---|---|---|
| 1 | Baseline and gap analysis | 01-BASELINE-AND-GAPS.md |
| 2 | Reliability fixes and policy decisions | 02-RELIABILITY.md |
| 3 | Adaptive scenario matrix | 03-SCENARIO-MATRIX.md, scenario-matrix.json |
| 4 | Mathematical authority findings | 04-MATH-AUTHORITY.md |
| 5 | Competency coverage and generalization | 05-COVERAGE.md, coverage.json |
| 6 | Persistence and retention | 06-PERSISTENCE-RETENTION.md, persistence-report.json |
| 7 | Desktop / mobile screenshots | 07-SCREENSHOTS.md, screenshots/ |
| 8 | Full regression | 08-REGRESSION.md |
| 9 | Remaining blockers and unsupported routes | 09-BLOCKERS.md |

## Acceptance criteria
| Criterion | Status | Evidence |
|---|---|---|
| Works across materially different learner behaviours | met | 41 scenarios in 6 categories, 10/10 properties each; 7 of them also in a real browser on desktop and mobile |
| Retry and recovery terminate safely | met (after fixes) | three unbounded paths found and bounded (unreadable input, app retry, recovery return); every run stops in pause, done or escalate |
| No unsupported method represented as verified | met (after fixes) | general answer-vs-method rule; production never sets `derivationVerified`; P2 refuses jumps and refutes lost solutions; no verified corpus case changed |
| Evidence and uncertainty distinct | met | a lone slip is kept and establishes nothing; unreadable input produces no attempt and no hypothesis; a failed retention check is recorded, never hidden |
| Teaching respects eligibility | met | every delivered explanation passes the gate; the provenance check covers every frame |
| History survives reconstruction | met | four learners, two sessions, Django store, separate processes |
| Retention recovery works (supported scenarios) | met | failed delayed checks open a re-check and a new cycle; passed checks are recorded; reviews are discoverable when due |
| No regression of integration behaviour | met | learning 1666/0 fail, frontend 576/576, Django OK, M1 browser journey 2/2 |
| Reuse across competencies, no question-specific patches | met | 17 competencies, 0 needing new logic |

## Recommendation
**Accept Milestone 2 with documented limitations** (09). Three product decisions are open (02 "Policy decisions"): starting-check resumption after a slip; status after a failed delayed check; escalation versus teaching when recovery finds no gap. In addition, three corpus cases await adjudication (04).
