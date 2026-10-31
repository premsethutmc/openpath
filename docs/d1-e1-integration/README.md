# D1 + E1 integration: trusted grading → sub-skill evidence (shadow)

1. [Integration architecture](01-integration-architecture.md)
2. [Canonical evidence contract](02-canonical-evidence-contract.md)
3. [Alternative E1 comparison](03-alternative-e1-comparison.md)
4. [Learner journey traces](04-learner-journey-traces.md) ([machine-readable](journey-traces.json))
5. [Cross-family leakage findings](05-cross-family-leakage.md) ([scan](leakage-scan.json))
6. [Historical compatibility](06-historical-compatibility.md)
7. [Regression results](07-regression-results.md)
8. [Remaining limitations](08-remaining-limitations.md)
9. [Activation-readiness recommendation](09-activation-readiness.md)

**Integration decision: PASS — INTEGRATED (SHADOW).**

- D1's trusted working verdicts now feed E1's sub-skill evidence through one contract.
- There are no introduced failures and no production decision changed.
- Activating the sub-skill evidence as authoritative is **not** recommended yet (doc 9).
