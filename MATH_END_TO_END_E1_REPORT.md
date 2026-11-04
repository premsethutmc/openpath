# OpenPath E1 — End-to-End Mathematical Assessment Evaluation

## Executive assessment

**Final classification: BLOCK.**

The structured domain engines retain strong internal regression results, but the complete natural-working path is not safe for learner deployment across the claimed breadth. On 500 independently authored student submissions, only 227 (45.4%) reached a mathematical assessment outcome. The engine produced 16 false mathematical acceptances, accepted only 30 of 75 valid alternative methods, localized 33 of 100 first mathematical errors exactly, and detected none of the 40 intentionally omitted restrictions or solution branches with the expected incomplete/missing-assumption outcome.

The most serious defect is line loss at adapter boundaries. Fifteen false acceptances came from function-evaluation conversion that checked a final expression while omitting an earlier incomplete or invalid line. One came from the complex-modulus conversion. A correct final line therefore concealed earlier bad working in these cases.

## Corpus and provenance

The `openpath-end-to-end-e1` corpus contains 500 newly authored, CC0-1.0 student-style cases. It includes no copied copyrighted problem text. Each record contains the typed problem, natural working, interpretation, classification, first-invalid-step label, missing assumptions/restrictions/branches, completeness, alternative-method status, scope status, and concepts.

| Area | Cases |
|---|---:|
| Algebra, equations, inequalities | 90 |
| Functions, trigonometry, logarithms | 70 |
| Calculus | 70 |
| Geometry and coordinate geometry | 70 |
| Probability, combinatorics, statistics | 60 |
| Vectors and matrices | 50 |
| Complex numbers and polynomial roots | 40 |
| Mixed-domain problems | 50 |

Primary categories match the requested distribution: 150 conventional correct, 75 alternative correct, 100 mathematically invalid, 75 incomplete, 40 missing restriction/branch, 30 ambiguous/malformed, and 30 unsupported.

References were authored before execution and reviewed by a separate rule-based consistency pass that does not import OpenPath. It checked counts, partitions, category/classification consistency, invalid-step bounds, missing-obligation labels, and scope labels. This is independent of the engine, but it is not a second human mathematical review. That is a limitation for any later publication-quality benchmark.

## Freeze and evaluation integrity

- Corpus version: `1.0.0`
- Frozen SHA-256: `1dd38f189df008e2b4e67e5398a1774542d5b27d20a5163092bbdbc3f23867e8`
- Diagnostic partition: 350 cases
- Untouched sealed holdout: 150 cases

All labels and partitions were frozen before the first engine call. The diagnostic partition was evaluated first. The sealed partition was then evaluated once, without engine changes, label changes, or tuning. An evidence-observation bug in the harness was later corrected without rerunning either partition: the first pass recognized only one kernel result shape, while M3 and B1/B2/B3 expose different kernel metadata shapes. The correction changed only the proof-integrity metric; verdicts, timings, and labels were untouched and the correction is recorded in both result artifacts.

This corpus contains parameterized families, so it measures varied executions of independently authored mathematical structures rather than 500 unrelated source problems. It was checked against E1 IDs and does not reuse prior benchmark records. A future external-validation workstream should add human double review and broader genuinely unrelated source structures.

## Complete pipeline

Every primary evaluation used `assessMathematicalWorking(problem, {format, text})`. No structured student working was substituted. The measured path was:

`natural text → parser → canonical IR observation → natural-domain adapter → unified assessment/domain reasoner → proof evidence`.

Canonicalization was observed independently for timing and consistency; the public API itself controls its production use. Evaluation code did not bypass an adapter or reasoner.

## Overall coverage

| Outcome | Count | Percent |
|---|---:|---:|
| Successfully parsed | 349 | 69.8% |
| Mathematically assessable | 227 | 45.4% |
| Verified | 131 | 26.2% |
| Invalid | 87 | 17.4% |
| Incomplete | 9 | 1.8% |
| Unsupported | 202 | 40.4% |
| Ambiguous | 44 | 8.8% |
| Malformed | 27 | 5.4% |
| Inconclusive | 0 | 0% |
| Resource exhausted | 0 | 0% |

Only 224/500 (44.8%) engine classifications exactly matched the independent reference classification. Abstentions remain separate from mathematical successes.

## Correctness among assessed cases

- Exact classification agreement among assessable outcomes: **200/227 (88.1%)**.
- False mathematical acceptances: **16**.
- False rejections or abstentions of correct solutions: **110/225** correct solutions.
- Conventional correct solutions verified: **85/150**.
- Alternative correct solutions verified: **30/75 (40.0%)**.
- Incomplete solutions correctly classified incomplete: **9/75 (12.0%)**.
- Missing-restriction/branch cases correctly classified incomplete or missing-assumption: **0/40**.
- Ambiguous/malformed cases exactly classified: **19/30**; 11 were reported unsupported.

The false acceptances make the current broad natural-working route unsafe even though the assessed-case agreement appears high.

## Error localization

Of 100 independently labelled mathematical-error submissions:

- exact first-invalid-step agreement: **33/100**;
- accurate source-line mapping at that step: **33/100**;
- 47 cases reached an incorrect invalid-step location;
- the remainder abstained or returned another classification.

Earlier valid work was preserved correctly in the 33 exact matches. In the 16 false acceptances, later work concealed or bypassed the earlier defect, directly violating the assessment requirement.

## Domain capability matrix

| Domain | Cases | Assessable | Exact among assessed | False accept | False reject | Unsupported | First invalid |
|---|---:|---:|---:|---:|---:|---:|---:|
| Algebra | 90 | 78 | 70/78 | 0 | 0 | 0 | 23/23 |
| Functions/trig/log | 70 | 58 | 43/58 | 15 | 0 | 8 | 0/13 |
| Calculus | 70 | 0 | — | 0 | 39 | 33 | 0/12 |
| Geometry/coordinate | 70 | 0 | — | 0 | 37 | 70 | 0/8 |
| Probability/combinatorics/statistics | 60 | 25 | 25/25 | 0 | 10 | 25 | 0/7 |
| Vectors/matrices | 50 | 32 | 32/32 | 0 | 0 | 16 | 0/13 |
| Complex/polynomial roots | 40 | 14 | 13/14 | 1 | 11 | 26 | 0/14 |
| Mixed domain | 50 | 20 | 17/20 | 0 | 13 | 24 | 10/10 |

Algebra is the only evaluated natural-working area close to a controlled bounded pilot, and even there none of eight restriction/branch omissions received the intended restriction-aware classification. Vectors/matrices and probability are sound on the narrow converted subset but have limited route and error-localization coverage. Calculus and geometry have no assessable complete natural-working cases in this corpus.

## Proof-verification integrity

Of 131 accepted submissions, 86 exposed an M3/B1/B2/B3 kernel-backed path. Forty-five accepted algebra/mixed submissions routed through `math-core:equation` without observable U4 evidence in the assessment envelope. This does not prove those 45 results are mathematically unsound, but E1 cannot confirm the required U4 invocation or independently replay a certificate from the returned evidence.

For kernel-backed results, the code audit confirms that M3 verifies equivalent certificates with the independent symbolic proof kernel and that B1/B2/B3 use their bounded kernel extensions. Nevertheless, 16 accepted verdicts contradicted the independently labelled complete working because adapters discarded relevant lines before kernel verification. A valid certificate for a reduced payload does not certify the student's omitted working.

D3 did not appear in the accepted natural routes in this corpus, so the evaluation found no evidence of unverified D3 promotion. D8 canonical identities were deterministic during observation and did not alter verdicts. No numerical approximation was used by the harness as proof.

## Failure taxonomy

| Primary cause | Cases |
|---|---:|
| Missing domain adapter | 122 |
| Unsupported mathematical operation | 80 |
| Incorrect error localization | 47 |
| Ambiguous notation | 44 |
| Parsing failure | 27 |
| Incorrect mathematical verdict | 23 |
| Resource exhaustion | 0 |

The taxonomy assigns one primary cause per unsuccessful assessment. Case-level evidence contains parser outcome, adapter outcome, reasoners, obligations, source mapping, and the selected cause.

## Performance

| Stage | p50 | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|
| Parsing | 0.028 ms | 0.113 ms | 0.322 ms | 1.938 ms |
| Canonical observation | 0.028 ms | 0.144 ms | 0.232 ms | 1.051 ms |
| Adapter conversion | 0.002 ms | 0.207 ms | 0.408 ms | 2.844 ms |
| Reasoning and embedded proof verification | 0.000 ms | 2.002 ms | 5.321 ms | 21.623 ms |
| End-to-end API assessment | 0.053 ms | 2.251 ms | 5.446 ms | 21.754 ms |

The public API does not expose separate reasoner and proof-kernel timers, so those are reported together rather than inventing a split. Per-request memory was not available from the in-process runtime and is not claimed. No case exhausted configured resources.

## Sealed holdout

The untouched 150-case holdout produced:

- parsed: 102/150;
- assessable: 65/150;
- exact classification: 66/150;
- false acceptances: 4;
- false rejections/abstentions of correct solutions: 41;
- alternative methods accepted: 8/20;
- exact first-invalid-step: 9/29;
- missing restrictions/branches detected: 0/8;
- verified results lacking observable kernel evidence: 13/40.

These results agree with the diagnostic finding and were not used for tuning.

## Regression results

- Learning and unified-engine Bun suite: **862 passed, 0 failed**, 10,399 assertions across 57 files.
- Geometry G2–G4 Python suite: **47 passed, 0 failed**.
- Frozen corpus checksum: passed.
- Independent reference consistency review: 500/500 records passed.

No production mathematical behavior or expected regression label was changed.

## Top ten capability gaps by impact

1. **Adapter line loss permits false acceptance.** Function conversion can validate only the final result and ignore earlier invalid or incomplete work.
2. **Natural calculus coverage is effectively absent** for realistic multiline solutions in this corpus.
3. **Natural geometry coverage is absent** beyond specialized adapters; all 70 geometry cases abstained.
4. **Restriction and branch detection failed 40/40 cases.** Domain correctness is not preserved end to end.
5. **First-error localization is only 33%.** Domain adapters commonly collapse several lines into one checked claim.
6. **Alternative-method acceptance is only 40%.** Forty-five valid alternatives abstained.
7. **Natural adapter coverage is narrow.** Missing adapters caused 122 primary failures.
8. **Proof evidence is not uniform.** Forty-five accepted envelopes expose no U4-checkable certificate.
9. **Unsupported versus malformed/ambiguous classification is inconsistent**, limiting useful learner feedback.
10. **Complex natural conversion has a soundness defect** in modulus handling and loses earlier working context.

## Recommendation and next workstream

**BLOCK broad learner deployment.** The false acceptances are critical, and coverage is too narrow for the stated cross-domain learner experience.

The next single workstream should be **Natural-Working Adapter Soundness and Full-Line Preservation**. It should first require every adapter to map or explicitly account for every student line, reject partial conversions that omit proof-relevant work, and retain line-level dependencies through the kernel boundary. It should then repair restriction/branch propagation and expose kernel evidence consistently. The frozen E1 corpus should remain an evaluation set; fixes should use a separate development corpus before one new holdout evaluation.

No merge or deployment was performed.
