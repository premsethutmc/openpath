# Pilot validation execution v1

Scope: the three Grade 8 pilot competencies (subject–verb agreement, present and past simple, articles). Nothing here
merges, deploys, enables real-child access, promotes provisional content or makes a paid model call. No educator has
reviewed anything and no model has been measured.

| Deliverable | Where |
|---|---|
| Educator review instructions and priority package (A) | [`../educator-review-v1/round-1/`](../educator-review-v1/round-1/): README (coordinator, independence, adjudication), REVIEWER_GUIDE, ORDER, one blank workbook per reviewer |
| Benchmark execution instructions and cost controls (B) | [BENCHMARK_EXECUTION.md](BENCHMARK_EXECUTION.md); runner `backend/evaluation/benchmark_run.py` |
| Pilot assessment policy (C) | [PILOT_ASSESSMENT_POLICY.md](PILOT_ASSESSMENT_POLICY.md) |
| Privacy and safeguarding requirements (D) | [PRIVACY_SAFEGUARDING_REQUIREMENTS.md](PRIVACY_SAFEGUARDING_REQUIREMENTS.md) |
| Reproducible synthetic journey report (E) | [SYNTHETIC_JOURNEY.md](SYNTHETIC_JOURNEY.md); `cd frontend && node --import tsx scripts/essay-pilot-journey.mts` |
| Remaining human decisions | [HUMAN_DECISIONS.md](HUMAN_DECISIONS.md) |

## Blockers, in order

1. **Educator review (H-A1 to H-A4).** All three competencies lack eligible questions at the target band in the bank
   the app ships. Round 1 holds the 41 questions that would close the gap; until they are reviewed and released,
   independent checks and retention are blocked (synthetic journey stages 6 and 7).
2. **Evaluator validity (H-B1 to H-B3).** The LLM evaluator is ready to run but unmeasured. Essay observation (stages
   1, 2, 9) and rewrite judgement (stage 8) work only on recorded outputs.
3. **Privacy and safeguarding (H-D1 to H-D6).** Consent, identifiers, retention, provider, educator access and
   safeguarding decisions are all open. Real-child essays stay disabled.
