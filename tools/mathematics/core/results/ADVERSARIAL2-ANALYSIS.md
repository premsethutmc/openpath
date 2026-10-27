# Adversarial corpus 2 — first pass of the UNMODIFIED evaluator (frozen)

Corpus: adversarial2/adversarial2.json sha256 2f14c5e1a13fe4dc0316991c97229ddf08a3b4684f73170e27462dcda921c5dc (440 tasks, written by an independent agent, labels from SymPy routes; checker passes). Evaluator: packages/learning/src/core/student.ts at the commit before this file. First-pass output: results/adversarial2-firstpass.json (frozen, commit 33a538d). **No evaluator change was made before or after this run.**

| metric | count | rate |
|---|---|---|
| false acceptance (valid verdict where the oracle says invalid/ambiguous/unsupported) | 0 | 0/250 |
| false rejection (invalid where the oracle says valid-complete/valid-incomplete) | 16 | 16/190 = 8.4% |
| over-refusal (unsupported/ambiguous where the oracle decides) | 64 | 64/368 = 17.4% |
| under-refusal (a verdict where the oracle says ambiguous/unsupported) | 3 | 3/72 |
| status agreement | 355 | 355/440 = 80.7% |
| crashes / unsafe certifications | 0 / 0 | |

## Causes (from per-task triage, /results/adversarial2-triage.json)
1. **Unnormalised glyphs (64 over-refusals + 2 knock-on false rejections).** All 64 over-refusals are lines using U+22C5 "⋅" (38) or U+2215 "∕" (28) that the parser rejects. This is the safe direction (the line is not judged). Two false rejections (domain-change-008, -024) are knock-on: the unparsed early lines meant the obligation was never recorded, so a later correct discharge looked like a lost root. Verdict "invalid" after an unsupported line is itself a defect to fix (should become unsupported or not-assessed).
2. **Student-introduced denominators treated as permanent restrictions (14 false rejections).** The student writes `(x+6)(..)/(x+6)=0` then `(x+6)(..)=0`; the evaluator reports "restriction-dropped" and invalid. The oracle's convention (README): only the problem's original exclusions are permanent; multiplying by an introduced factor is a valid step carrying an obligation that is later discharged. Mathematically the step is a valid implication that gains a root, so the evaluator is too strict here. This is a scope-policy decision plus a defect; IDs: H2-domain-change-004, H2-domain-change-005, H2-domain-change-009, H2-domain-change-014, H2-domain-change-017, H2-domain-change-030, H2-domain-change-031, H2-domain-change-034, H2-domain-change-036, H2-domain-change-038, H2-domain-change-039, H2-domain-change-040, H2-domain-change-042, H2-domain-change-043.
3. **Ambiguity under-detection (3 tasks).** p/qx forms were treated as a definite reading and judged invalid: H2-ambiguous-notation-003, H2-ambiguous-notation-005, H2-ambiguous-notation-025, H2-ambiguous-notation-042, H2-ambiguous-notation-043. (ambiguous-notation-043 is the glyph issue.) Here the evaluator gave a verdict where it should have refused.

## Not done, by rule
No fix was made. Any fix must be tested against a third untouched holdout. Suggested fix set: (a) normalise ⋅ and ∕, (b) let a restriction introduced by a student line be droppable with an obligation (needs your policy decision), (c) extend ambiguity detection to p/qx, (d) after an unsupported line report later steps as not-assessed rather than invalid.
