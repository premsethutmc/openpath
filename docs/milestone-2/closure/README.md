# Milestone 2 closure and teaching-quality audit

1. [Adaptive policy decisions](01-POLICY-DECISIONS.md)
2. [Regression tests](02-REGRESSION-TESTS.md)
3. [Teaching-content matrix](03-TEACHING-CONTENT-MATRIX.md) (`teaching-content-matrix.json`, AI reviews `ai-review-batch*.json`)
4. [Teaching decisions](04-TEACHING-DECISIONS.md) (`teaching-decisions.json`)
5. [Corpus adjudication](05-CORPUS-ADJUDICATION.md) (`adjudication.json`)
6. [Educational-quality gaps](06-QUALITY-GAPS.md)
7. [Test results](07-RESULTS.md)

## Readiness

- Adaptive policies A, B, C: implemented, bounded, tested, persistent.
- Teaching content: **not ready** for a supervised educational evaluation as a whole. 17/64 explanations are ready; 4 are mathematically wrong or broken, 2 of which pass the teaching gate today. No educator has reviewed any explanation; the reviews here are AI reviews.
- Before a small supervised evaluation: block or correct the 4 unsafe explanations through a reviewed change, have an educator review at least the explanations the 18 scenarios actually reach, and restrict the evaluation to competencies whose explanations are rated ready.
