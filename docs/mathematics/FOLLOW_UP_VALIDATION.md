# Follow-up validation — actual local execution

Baseline: accepted commit `3ec6b893d6ac141c2a89744094f11993222c97a9`. No merge/deployment authorization. These are local results, not a claim that GitHub CI has passed.

| Command / check                                                        | Actual result                                                                                                                                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`                                                    | Passed: both existing configurations plus the scoped canonical-integration configuration                                                                                                   |
| `node --import tsx --test src/mathematics/canonical.test.ts`           | **10 passed / 0 failed**                                                                                                                                                                   |
| `npm test`                                                             | **266 passed / 0 failed**: 256 previous tests plus 10 canonical integration tests                                                                                                          |
| Mathematics build                                                      | Passed                                                                                                                                                                                     |
| `CHROMIUM_PATH=/usr/bin/chromium node --test e2e/mathematics.test.mjs` | **9 passed / 0 failed**; existing phone/resume/export flows remain intact                                                                                                                  |
| Graph validation                                                       | 200 nodes, 200 prerequisite edges, six justified roots; zero structural errors                                                                                                             |
| Frozen graph hash                                                      | Matches accepted inventory SHA-256; no curriculum or prerequisite changes                                                                                                                  |
| `node --import tsx ../tools/mathematics/audit.mts`                     | Reproducible sample: 4096 seeds × 14 families; committed report matches regenerated output byte-for-byte                                                                                   |
| `node --import tsx --test '../packages/english-core/test/*.test.ts'`   | **203 passed / 2 failed** of 205; existing E1/E2A frozen research fingerprint mismatches remain visible                                                                                    |
| Protected source diff                                                  | No changes to `content/mathematics/`, `packages/english-core/`, `frontend/src/english/`, estimator or evidence policy relative to the accepted commit; no essay/research-repository writes |
| `git diff --check`                                                     | Passed                                                                                                                                                                                     |

Canonical tests exercise: one existing profile identity and one shared ledger/store across school fractions and GRE; separately persisted/resumed program keys and activity percentages; held provisional evidence; unchanged competency nodes; shared profile projection; native replay and duplicate event handling; correct and wrong responses across all 14 families; equivalent numeric answers with original text retained; shuffled choice identities; repeated stems despite unused parameter changes; identity/registration/version/receipt/unsupported-answer rejection; genuine host provenance links and unknown lineage; forbidden eligibility upgrades; and curriculum/audit coverage.

The additional integration TypeScript target inherits the existing English core's `.ts` import/no-unused settings and enables JSON resolution. The original main target excludes only the new canonical test, which is compiled by that explicit target and still runs in `npm test`. This avoids changing unrelated English imports or suppressing existing test assertions. CI now also checks the reproducible audit report.

## Existing failures are not repaired or hidden

The two failures remain in `packages/english-core/test/e2-research.test.ts`. The original foundation validation reproduced the same mismatches on untouched main `b578c7893136fcdea5cd1805296243089e7039ce`; this follow-up reran the complete shared-core suite and again observed 203 passes and those two failures. No baseline file, English test, estimator or policy was rewritten. See [original validation](VALIDATION.md).

## Scope and limits

The host-registration fixture extends the existing index in memory solely to test native transport and its unchanged eligibility gate. It does not solve production's English-only framework loader. Live account persistence/atomic transactions, HTTP authorization, full metadata migrations, educator review and production navigation are not implemented. Mathematics practice remains provisional and cannot support mastery claims. Existing English tests run in the frontend/core suites; Tamil source is untouched, but Tamil's separate-branch browser tests were not rerun during this follow-up. Phone emulation is not a physical-device or complete accessibility audit. No real-child or educator outcomes are claimed.

## GitHub access

Authorized CLI preflight `gh pr list --repo premsethutmc/openpath --head feat/mathematics-foundation-v1 --state all --json number,url,state,isDraft` failed with:

```text
Post "https://api.github.com/graphql": Forbidden
```

No permissions, credentials or network configuration were changed. The prepared draft body is [DRAFT_PR.md](DRAFT_PR.md). The draft-creation attempt after pushing is reported in the engineering handoff. Compare: https://github.com/premsethutmc/openpath/compare/main...feat/mathematics-foundation-v1
