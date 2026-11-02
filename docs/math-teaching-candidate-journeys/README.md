# Candidate teaching integration after PR97

Base: `df0521db6b8d7a9723bc4a262258667b1a3fe984` (PR97, six workflows / 16 jobs passed). Follow-on branch: `feat/math-teaching-candidate-journeys`. Candidate source: Claude `4e655e737607bcf9d941193538de7479a40c4fe6`, inspected read-only. Claude's documentation is not changed here. Product tracking remains the existing research `dashboard/data/architecture.json`.

## Review boundary

The existing `explanation-review@1` demonstration mode permits exact-hash `pending_review` revisions and visibly labels them unapproved. Supervised evaluation requires educator approval and rejects these candidates. Seven new records are pending; no educator approval, deployment or global activation is made. Four whole-module hashes return to draft with their old history preserved. Tests use the existing synthetic preview/test mechanisms, not production activation.

## Reuse and integration

| Candidate | Existing consumer and addition | Demonstrated boundary |
|---|---|---|
| TP-STA-01, median | Existing `akmed` template plus `fix_mean_for_median` and `fix_one_middle` | Odd-count mean/median fix and even-count middle-value fix have separate declared parameter scopes. No claim every median form is mastered. |
| TP2-CH-BALL, bag probability | Existing `anbag` template plus `fix_colours_equally_likely` | Exact established target required; guided item changed to the package's existing `gen:anbag:9,2,4,2` because the original is already module practice. |
| TP2-PRT-NAME, shaded fraction | Existing authored module plus concept, shaded-to-unshaded and count-only strategies | Existing grid renderer reused. Precise fraction connection contracts remain unsupported; see retention limit below. |
| TP2-SCL-BAR, scaled bars | Existing `afbar` template plus `fix_assume_tens` | Guided item changed to the package's existing `gen:afbar:0,2,2` because the original is already module practice. Reading/difference/total success is not interchangeable mastery evidence. |

`Blueprint.extendsTemplate` is an append-only option in the existing library builder: it constructs the unchanged template, then adds explicit scoped strategies. Existing chapters, strategies, question arrays and pools remain byte-for-byte equal. Duplicate IDs, unavailable/wrong-partition tasks and exposures reserved by existing or earlier candidate teaching/assessment are rejected. Repeated screens within the same explanation remain possible. Authored fraction strategies are appended at their existing source. No generator, partition, answer table, visual renderer or separate registry was introduced.

The real session tests exposed an odd-count lesson receiving an even-count resolution probe. The shared `hypotheses.ts` selector and reconstruction now apply the delivered declared scope consistently. A single relevant-teaching predicate covers both pathway and non-pathway use; historical unscoped behavior remains. Same-timestamp unrelated teaching cannot supply the scope. An out-of-scope correct answer cannot resolve the declared lesson obligation. Teaching records still reference current content rather than snapshotting its scope revision; cross-revision replay is not claimed.

## Actual application evidence

`browser-results.json` records the existing Year UI against Django and trusted grading with synthetic pupils. Each of the four packages rendered two candidate teaching screens with pending-review labels, served a fresh in-scope resolution question, saved the server decision, resolved the target hypothesis and preserved events/decisions after reload. Ordinary/diagnostic exposures and shown examples were excluded by the existing exposure identity. No claim that all relabelled semantic duplicates are universally handled follows from these cases.

A later independent visit and test-only per-pupil clock exercised delayed questions for median (`gen:akmed:43,7`), probability (`gen:anbag:3,4,7,1`) and bars (`gen:afbar:3,2,7`), including UI answering and saved reload. These are observed delayed answers in the declared family/parameter scope, not evidence of mastery of every family form or real-student retention.

Shaded-fraction retention is **not connected**: the existing selector returns authored `fm-r1`, asking how many fifths have no flowers. That is a complementary-part count, not the taught shaded-fraction naming task. Its answer was not used as a successful scoped retention demonstration. Fraction chains also remain outside numeric-only `validSkillTask`. No substitute check or new mastery lock was introduced.

Candidate-specific selection restrictions (for example the median package's mean/median separation margin), arbitrary relabelled semantic freshness, unmodelled causes, and broader retention coverage still require explicit contracts before stronger claims or approved release. Exact target IDs and repeated evidence do not certify the learner's method or eliminate copying/guessing.

## Validation

- Focused tests cover pending versus approved gates, exact template preservation, reserved exposure rejection, six target diagnosis/teaching/resolution/replay paths, and declared-scope regressions on both pathway and non-pathway records.
- Existing Year browser test: `cd frontend && node --import tsx e2e/candidate-teaching.test.mts`, with a test build, synthetic Django API at port 8200 and `OPENPATH_TEST_CLOCK_FILE=/tmp/candidate-clock.json`.
- Final focused batch: **39 passed, zero failed** (candidate, declared-teaching, foundation-remediation and policy tests). The initial candidate batch exposed the median scope mismatch; the shared fix and adversarial regressions pass. Initial generation rejected two guided/practice collisions; distinct existing package items resolved them.
- Full library/review pipeline consistency: **1 passed**; it rebuilds the library and checks current module review hashes. Mathematics integration TypeScript passes.
- Backend teaching/pathway: **6 passed**. Final rebuilt-bundle integrity/pathway: **5 passed** (overlaps the pathway batch). Trusted grader bundle prefix `bacbae87ad3f`, 212 recorded inputs.
- Browser: four teaching/resolution/reload cases, three observed scoped delayed answers; shaded-fraction delayed connection remains incomplete. Later relevance hardening preserves these strict-pathway cases and is covered by the final focused batch.
- The first Node 24 CI aggregate exposed an import-order cycle (`LINEAR_EQUATIONS_CONFIG` before initialization): 795 passed and one test file failed. The unchanged static linear configuration now lives in `subskill-config-linear.ts`; existing exports remain compatible. The failing four projection tests pass on Node 22 and Node 24; the Node 24 candidate/scope batch passes 30 tests. This is an initialization repair, with no mapping or review-state change.
- Exact-head configured CI is reported on the follow-on draft PR. No duplicate unchanged local full aggregate was run. PR97 remains unchanged.

Competitive teaching/adaptation quality and separate real-student learning, retention and transfer evidence remain unmet release gates. This engineering milestone establishes neither competitor parity nor learner-outcome guarantees.
