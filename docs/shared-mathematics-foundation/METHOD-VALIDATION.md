# Method-contract repair: final local validation

This batch includes the bounded repair at `af31466` and the subsequently authorized versioned method-fixture migration. It retains strict learner-method grading, unsupported neutrality and original historical artifacts. It adds no legacy authority, production activation, permissions or language-domain development.

## Implemented changes

- Validate explicitly supplied cross-domain transfer contracts before invoking geometry; malformed dependencies cannot hide behind an unsupported method. Legacy synthesized handoff ordering is preserved.
- Give worker-lifecycle tests explicit valid methods in guarded fixture copies, preserving reuse, timeout and recovery assertions.
- Author method-v2 fixtures for U1/U2 and a synthetic D2 method-stage adapter. All four previously failing aggregate tests now exercise an explicitly named current contract. The [fixture specification and case-by-case ledger](../../tools/mathematics/method-contract-v2/README.md) disclose every changed input/expectation and all 100 derived M1/U2 journeys.
- Keep original U1/U2/D2 corpora and their recorded results byte-identical to published `1a278f1`. Historical oracle mismatches remain documented in [the bounded repair report](REGRESSION-REPAIR.md). No claim of historical parity is made.
- Correct zero-budget geometry refusal to return `firstInvalidStep: null`. Resource exhaustion is not evidence of a learner error. The Python-source manifest was refreshed; the trusted JavaScript grader bundle is unchanged.
- Correct two stale addition-family fingerprints in `docs/learning-year/COVERAGE.md`.

## Validation on the final implementation

| Check | Result |
|---|---|
| Full learning package, `bun test packages/learning/src` | **1790 pass, 41 skip, 0 fail**; 1831 tests / 108 files; 353.68 seconds |
| Four migrated aggregate files | **14/14 pass** |
| Direct historical/current boundary tests | **5/5 pass**, including all 120 original bare geometry conclusions remaining unsupported with no demonstrated derivation |
| Geometry Python suite | **56/56 pass** |
| Django geometry persistence/provenance | **4/4 pass** |
| Mathematics integration TypeScript check | **Zero diagnostics** |
| New fixture generation | Byte-idempotent across both authoring/ledger scripts |
| Historical preservation | Three original corpora and three original recorded result files byte-identical to published head |
| Independent review | No remaining blocker; exact expanded D2 changes and synthetic-test limitations verified |

The full learning run includes certification, grading safety, geometry worker tests, cross-domain checks and quarantine/selection governance. No extra full frontend or browser suite was started locally: there is no UI change in this repair. The affected persisted geometry path was covered by Django checks. Earlier UI results remain evidence for their recorded commits, not a claim that the pending remote year acceptance stages passed.

## Content consistency and remote limits

The coverage generator directly prints family fingerprints. A bounded call to the actual `familySpec` function verified the complete generated rows for `aaadd` and `adcol3`. Bounded regeneration of those two template modules and evaluation of their compiler coverage entries also matched the committed library and coverage matrix exactly. No full local generation was repeated.

The previous year CI run failed its content-consistency stage; its own build and browser stages were skipped. Detailed terminal logs remained unavailable (`Transport closed`), and the denied CLI route was neither retried nor bypassed. The two fingerprint repairs fix a proven dependency mismatch, but only the next remote run can establish whether another mismatch remains. Exact-head CI status is maintained in draft PR96 rather than causing documentation-only pushes.

Mathematics teaching/content breadth and unsupported notation remain bounded as described in the foundation acceptance reports. Passing engineering checks does not assert complete curriculum teaching or guaranteed learner outcomes. Nothing is merged, deployed or globally activated.
