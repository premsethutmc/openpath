# 10. Integration recommendation

## Recommendation: PASS for integration into the P2 line (feat/p2-general-derivations), not for production activation

**Release gate (zero known false mathematical accepts): met.**

| Corpus | Result |
|---|---|
| HELDOUT6 (independent, frozen, run once) | 0 false accepts |
| HELDOUT4 and HELDOUT5 (informed) | 0 false accepts |
| Frozen corpora | 0 verified items labelled invalid |
| Notation items | none received a mathematical verdict |
| Integrity | no attack accepted |

**Coverage improvement on independent HELDOUT6 (engine level).** Each line compares baseline eca220f0 with B2:

- valid certified: 0 / 95 → 43 / 95;
- invalid detected: 0 / 91 → 65 / 91, with the first invalid line exact on all 65;
- parser reach (the engine agrees with P2 on items P2 decides): 0 / 113 → 108 / 113;
- final answer reported separately: 121 / 121 agree with the labels.

## What B2 did not do

- It added no new grader. P2 decides, the existing gate, ledger, obligations and adjudication still apply, and P2 is consulted only where the established route abstained.
- It did not activate E7.
- It did not change teaching policy or Agent A's adaptive policy. `derivation-interface`, the journey and the backend are untouched.
- It added no automatic marking-score policy.
- It did not relabel any corpus.
- It ran no migration.
- It did not change the server-grader bundle.
- It did not merge or deploy.

## Unresolved risks

1. **Policy: a bare answer counts as `verified` at engine level.** A bare stated answer (P2 `answer-claim`) is `verified` at engine level, flagged `methodShown: false`. This matches how the engine already treats bare statements. The journey's evidence rule keeps it from counting as a method, but any future consumer of the engine envelope must read `methodShown`.
2. **Policy: valid jumps are certified.** Jumps that P2 certifies (`solve-linear`, `answer-claim` reached from an equation in one line) are `verified`. This is Workstream B's policy, unchanged. Product should confirm it before teaching layers rely on engine verdicts.
3. **HELDOUT6 exposed parser gaps that fail closed but cost coverage.** These are `=`-continuation lines, conclusions in words, `, for` conditions and multi-binding `find`. The first needs a change to the shared line parser, which is a server-bundle input, and so needs a separate, parity-reviewed change.
4. **Partial disclosure before the HELDOUT6 run.** The corpus author's summary named its ambiguity patterns before the run, and one rule (the chained exponent) was added afterwards. It did not affect any HELDOUT6 verdict (doc 6).
5. **Notation rule maintenance.** notation@2 adds ambiguity rules to P2's `ambiguousNotation`. They fire on none of the earlier corpora. New typed notations in content must be checked against them.
6. **The P2 version string is unchanged (@3).** The certificate format and moves are unchanged except for one new move label (`<balance>+symmetry`), which existing @3 chains never contain. New completeness and ambiguity rules can change verdicts on inputs that @3 previously read differently, namely the newly-ambiguous notation and rational final forms. If historical @3 chains containing such notation exist, they now replay as `failed-replay`, not as success. This is safe, and is surfaced by `chainVerificationStatus`. A version bump to @4 is advisable before any production use.

**Next step (needs approval):** a review of risks 1, 2 and 6, then a decision on whether to bump P2 to @4 and whether to schedule the shared-parser `=`-continuation fix as its own parity-tested change.
