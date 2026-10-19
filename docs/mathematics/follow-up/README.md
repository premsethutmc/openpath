# Mathematics prerequisite safety and fingerprint follow-up

Branch: `fix/mathematics-prerequisites-reproducibility-v1`, based on accepted milestone `d99879cd96550364178831c56b8fe9b8e19116e0` (`feat/grade1-6-mathematics-foundation`). The two workstreams are isolated: graph implementation versus fingerprint investigation/deferral. The owner preview procedure is documentation only. No curriculum expansion, merge, deployment, estimator change, mastery-policy change or learner-record reset.

## 1. Implemented: 34 minimal mandatory-edge corrections

The active mathematics prerequisite graph is **1.1.0**. It applies exactly 34 edge removals from immutable graph 1.0.0. The patch is `content/mathematics/graphs/prerequisites.v1.1.json`; executable application/validation is `packages/mathematics/src/prerequisites.ts`. See [the complete before/after table](GRAPH_DIFF.md) and [machine-readable sequential checks](graph-before-after.json).

**Scope is deliberately narrower than the old proposal:** remove the incorrect mandatory gate, without adopting its proposed replacement gates. The remaining 49 educator-dependent proposal records are untouched, as are the original 92-record audit and 200-competency inventory. There are no new competencies or new prerequisite edges. For example, equivalent fractions no longer requires long division; this does not make equal-group fluency a newly mandatory replacement. Support suggestions remain review material.

Graph counts: **200 IDs**, **200 → 166 mandatory edges**, **6 → 40 justified roots**. A root here means no externally imposed mandatory competency, not that the target needs no concrete preparation. Concrete foundations must still be taught within each scoped program; further mandatory assignments need review. The original inventory remains version 1.0.0; the separate relationship graph and native registration are version 1.1.0. Curriculum alignment remains provisional.

Before/after every removal, the patch runner checks IDs, missing references, cycles, root justifications and exact expected old edges. Stale patches or malformed graphs fail closed. It does not mutate input nodes. Tests inspect all 34 intermediate graphs and replay native synthetic histories containing provisional answers, future releases, released answers and repeats. Both registrations also reject a purported validated item without a release date. At every intermediate step, item eligibility, policy/prior, evidence, decisions, all composite nodes and verification claims are identical. Only prerequisite planning information is changed. This does not approve any real lesson/question for mastery.

### Integration and history compatibility

- `mathematicsContext()` and `mathematicsLedger(id)` default to graph 1.1.0; explicit `mathematicsContext('1.0.0')` / `mathematicsLedger(id, '1.0.0')` preserve historical graph replay.
- The language adapter publishes both `curriculumVersion: '1.0.0'` and `prerequisiteGraphVersion: '1.1.0'` and exposes corrected relationships. The old standalone mathematics preview displays the corrected graph version too.
- Framework keys differ (`math@1.0.0` vs `math@1.1.0`) so an old cached aggregate cannot silently masquerade as the new graph. Existing mathematical receipts, native event IDs, item/family versions, competency IDs, learner IDs and school/exam program keys are unchanged.
- Existing mathematics pages derive state by replaying the existing append-only account receipt stream; no database migration or pupil reset is needed. Tests show old/new native replay differs only in the declared framework key, not estimates, decisions or eligibility.
- If a future host persists native composite caches, retain the event log and rebuild a cache under its selected graph version; never relabel a 1.0.0 snapshot as 1.1.0 or move historical evidence to different competencies. An explicit 1.0.0 context remains available for exact historical graph interpretation. This branch does not write or erase stored snapshots.
- The native estimator, content validator, verification policy, released-content gate, English/Tamil/essay interfaces and competitive scoring rules are unchanged. Program completion remains activity completion, not proficiency. New roots may affect future prerequisite support recommendations, not evidence admission.

The three existing reference journeys are the runnable scope; the other mapped competencies are not newly completed programs. Grade 3 equal-groups and Grade 5 equivalent-fractions receive graph corrections; Grade 1 addition is a control whose educator-dependent proposal was **not** adopted. Fixed programs, previously completed activities, draft/resume, delayed-review requirements and school/exam separation remain unchanged.

## 2. Investigated and deferred: portable output fingerprints

See [FINGERPRINT_PORTABILITY.md](FINGERPRINT_PORTABILITY.md) and [actual runtime comparison](fingerprint-results.json). Node 22.18.0 reproduces both frozen legacy digests; Node 24.19.0 differs only in 10/8 last-bit misconception strengths. A safe replacement fingerprint contract was not established: exact serialization still differs; rounding/omission can hide genuine state changes; input-only signatures are not output regression guards. No new production fingerprint or snapshot migration was implemented. Legacy code and baseline files are unchanged.

The diagnostic exporter (`tools/mathematics/fingerprint-portability.mts`) only records the existing exact output/hash and runtime in a versioned investigation file; it is not a replacement hash format and is not used by inference. The Node 24 failures remain real failures, not rewritten snapshots, disabled assertions or accepted alternate hashes.

## Private owner preview and validation

[PRIVATE_PREVIEW.md](PRIVATE_PREVIEW.md) provides one complete startup/build/URL command inside a dedicated owner-authenticated Codespace. Port 4175 must stay Private; there is no public deployment or unauthenticated tunnel. The exact owner URL comes from that actual Codespace's bindings, not a guessed address from this runner.

[VALIDATION.md](VALIDATION.md) records actual Node 22/24 tests and browser results. The new CI workflow runs separate mathematics and legacy-research jobs under both exact versions. The Node 24 legacy job is intentionally allowed to fail visibly: no `continue-on-error`, skipped cases or baseline regeneration. Remote CI results are not claimed without access to GitHub evidence.
