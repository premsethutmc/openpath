# 8. Certificate compatibility

## Question

B2 (P2 `aac35c6`) changed P2 behaviour but kept the labels `openpath-derivation-authority@3` and `openpath-derivation-certificate@3`. Did certificate semantics change without a version change?

## Method (empirical, real code on both sides)

1. Took a worktree of `be91d17`: authority @3 as first released, before B2.
2. In both trees, ran `assessChain` over every item of the frozen corpora (HELDOUT2, HELDOUT3, HELDOUT4, HELDOUT5, HELDOUT6), 1,579 chains in all.
3. Compared, item by item: status, first invalid line and certificate digests.
4. Replayed every be91d17-issued certificate chain (563 verified chains) with the integrated replayer, and the reverse.
5. Probed the three behaviour changes B2 documents, using inputs chosen to exercise each one.

## Findings

| Check | Result |
|---|---|
| Corpus verdicts and digests, be91d17 vs B2 | **identical** (1,579 / 1,579). The corpora do not exercise the B2 changes. |
| be91d17 certificates replayed by B2 | 563 / 563 replay as current |
| B2 certificates replayed by be91d17 | 563 / 563 (byte-identical chains) |
| B2 change 1: notation@2 ambiguity | `2^3x = 64` with `8x = 64; x = 8` is **verified** at be91d17 (2^3·x) and **refused** by B2 (`task-unparsed`, ambiguous). A stored be91d17 chain for it is reported `failed-replay` under B2, which is indistinguishable from tampering. |
| B2 change 2: bounded balance+symmetry | `6 < 2x` with `x > 3` is **unsupported** at be91d17 and **verified** by B2 (move `balance-divide+symmetry`). A B2 certificate labelled @3 is refused by an @3 replayer from be91d17 ("no-registered-inequality-move"). |
| B2 change 3: completeness@2 (lowest-terms quotients) | The completeness of `(x − 3)/2` changes from `incomplete` to `complete`. This is working evidence, not certificate validity. |

**Conclusion.** Under one label, @3 named two different rule sets. An @3 certificate did not identify the rules that issued it. An old certificate could not acquire a new meaning silently, because replay re-authorises every line. But it would be reported as a replay *failure* instead of as historical. Certificates from the newer rules would carry a label that older code reads as its own. **A version bump is required.**

## Change (smallest compatible)

- **`AUTHORITY_VERSION` becomes `openpath-derivation-authority@4`.**
  - Rules: unchanged from `aac35c6`.
  - Certificate format: unchanged (`openpath-derivation-certificate@3`).
  - The reason is in the source comment above the constant.
- **Historical handling** (the B2 helper, unchanged):
  - `chainVerificationStatus` reports any chain issued under authority @3 as `historical-version-not-replayable`, with the versions found. Its recorded result stands, unverified.
  - It is never replayed as @4 and never relabelled.
  - Relabelling an @3 certificate to @4 gives `failed-replay`, because the digest binds the versions.
- **Persisted evidence.** D1 starts storing working assessments in grading decisions: Django keeps them in the event body and the decision log. Each one carries `versions {authority, registry, kernel}` and the certificate digests.
  - `replayWorking(decision)` re-derives a current record and requires the same status, first invalid step, certificate digests and replayed prefix.
  - A record from another version is reported historical. It is never re-judged in place. A re-assessment would be a new, separate event.
- **Nothing was migrated or rewritten.** No certificate table existed before D1 (B2 doc 5). The B2 proposal for historical journey logs is still unexecuted, as it requires approval.

## Regression tests

- `packages/learning/src/certificate-compatibility.test.ts` uses fixtures: real chains issued at be91d17 (`fixtures/historical-authority-v3-certificates.json`), including the `2^3x = 64` chain whose meaning changed. It tests that:
  - the label changed and the format did not;
  - every @3 chain is historical, never current, and the replayer refuses it;
  - the recorded result is not rewritten, and a new assessment is separate;
  - relabelling to @4 fails;
  - the same derivations issued now replay as current @4;
  - a B2-only move is issued only under @4.
- `parser-p2-integration.test.ts` and `derivation-generalization.test.ts`: the pinned label assertion was updated @3 → @4. The v2-is-never-v3 checks are unchanged and pass.
- `grading/working.test.ts`: a recorded assessment replays as current; another authority version is historical; tampered digests or status fail.
- Journey D1-15 replays every stored working assessment of a full journey (all `replayable-current`). It also checks the historical-version path.
- Replay integrity on all corpora after the bump: 889 certified chains, 0 own-replay failures, 0 accepted cross-task, truncated, tampered, forged or move-forged chains. 2 / 770 swapped-lines accepted: both are `tr-017`, whose two lines are identical, as recorded by B and B2.

## Status

Certificate replay is sound and compatible. No silent invalidation, no reinterpretation, no change to the certificate engine.
