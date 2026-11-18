# Narrow local SVA detector: rejected integration candidate

Research only, not imported by any application. No dependencies or network. Run `node --test rules.test.mjs` and `node evaluate.mjs` here.

This tests whether tightly restricted declarative noun-subject agreement rules could add a safe local first pass for Harper's missed gaps. It emits provisional evidence/questions, never mastery or correctness. No hit explicitly means abstention. It avoids complex contexts, quotation, questions, coordination and possible subjunctive triggers through deliberately broad document-level exclusions. The verb/noun vocabularies are finite.

## Frozen independent holdout

A separate AI reviewer authored 60 cases before seeing implementation. The detector was frozen before the cases were revealed. Exact hashes are checked by evaluate.mjs. Neither rules nor cases were tuned after evaluation. All three development tests passed.

- 14 of 20 intended positive cases detected, six missed.
- No alerts on 40 intended abstention/counterexample cases.
- Five misses are verbs outside the allowlist; one is a valid target suppressed by an unrelated instruction sentence containing `and`.
- Correct irregular past forms, questions, quotations, coordination, subjunctives and possessives abstained in these cases.

**Failure on realistic scope:** all 30 original paragraph acceptance cases abstain. Therefore this adds **zero whole-writing coverage** to the existing benchmark. Broad safety exclusions avoid some risks but discard too much usable text.

Decision: preserve the experiment and negative result, do not integrate or represent it as high-precision production grammar assessment. No confidence threshold, API routing, learner-facing claim, mastery update or production dependency is added. Zero alerts in 40 synthetic counterexamples is not proof of zero false positives. A future parser-aware clause-scoping approach would require a new unseen corpus, not tuning to this exposed holdout.
