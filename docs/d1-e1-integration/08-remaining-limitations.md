# 8. Remaining limitations

1. **The authoritative state still overgeneralises** (doc 5).
   - Competency status counts any two distinct right answers given alone, from any family.
   - Its delayed check samples only two-step and modelling questions.
   - Reported, not changed: changing it is the learner-state decision this milestone does not take.
2. **A sub-skill's delayed check can pass sooner than the competency's.**
   - Two-step needs `min(RETENTION_CHECK, its module check items)`, which is 1 item.
   - The competency needs 2 (the two-step and the modelling item).
   - In J14 as first written, two-step read `passed` while the competency read `due`. The journey now answers the whole module check.
   - The projection keeps E1's per-sub-skill rule.
3. **Both-sides and brackets are never sampled by the module's delayed check.** They keep the competency's bar (2 answers), so they can only become `retention-due`, never `passed`. Fixing this is a content change (the module retention list).
4. **Answers from before D1 carry no method verdict** (`not-recorded`). Their method is unknown, by design: re-judging them under the current authority would reinterpret old evidence.
5. **A right answer with false working is `contradicted`.**
   - It is excluded from demonstration in the projection, but still counts fully in the authoritative state.
   - Whether it should count there needs an approved policy.
6. **Authored questions map to no sub-skill.** An example is D1's reference question `le-ref-3x-19-4`, reported `not-a-generated-question`. Counting them needs an explicit sub-skill field in content, not inference.
7. **Unsupported working** (e.g. working in words) is neither verified nor false. A learner who always writes working the authority cannot read never gets a verified method. This is fail-closed and intended.
8. **Sub-skill boundaries and thresholds** (`INDEPENDENT_MIN` per sub-skill) have not been reviewed by an educator.
9. **The mathematics-integration type check carries 188 diagnostics.** These are inherited: 183 at A3, plus 5 of the same `bun:test` kind for bun test files added by P2 (2), D1 (2) and E1 (1). None comes from integration code (doc 7).
