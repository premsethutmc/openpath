# Teaching access, recommendations and evidence

The mathematics curriculum is a set of chapters a learner may choose to study. Prerequisite evidence guides recommendations and competency claims; it is not permission to open a lesson. Grade is neither a ceiling nor a compulsory sequence starting at Grade 1.

The foundation goal screen now exposes **Open selected lesson**, using the existing `CurriculumPractice → TeachingContent` renderer. Assessment and topic-diagnostic screens expose **Open this lesson**. Grade 7's primary curriculum action opens teaching; the diagnostic shortcut remains an explicitly optional secondary action. The selected goal may still recommend supporting work, but the lesson explicitly offers that support as optional. No planner, renderer, graph or statistical model is duplicated or replaced.

Teaching remains subject to the existing explanation eligibility, demonstration/supervised mode and quarantine rules. Missing content produces a content-gap message, not a readiness denial. Opening teaching alone does not activate the opt-in grading policy.

## Persistence and honest evidence

The lesson records the existing versioned `foundation-lesson-review@1` event against an explanation included by the review filter. This marks subsequent same-session work as assisted through the existing server and replay logic. Resumed lesson practice records exposure for its new session too. Historical events are untouched.

A failed exposure save leaves teaching readable and exposes a retry. Practice/assessment wait for the save, rather than silently treating the displayed help as independent work. If no eligible explanation can be attributed, reading remains available while saved lesson practice reports its content limitation. No fabricated strategy or educator approval is introduced.

## Acceptance inventory

These are separate acceptance dimensions; counts of modules or chapters are not evidence of teaching completeness.

| Dimension | Result / boundary |
|---|---|
| Chapter access | Existing supported lessons can open without prerequisite evidence. The phone regression exercises a selected Grade 7 linear-equations lesson while another competency remains recommended. |
| Lesson completeness | Partial. This change reuses existing teaching and authors no syllabus. It does not establish that every chapter has enough explanation, examples, methods or participation. |
| Adaptive recommendation | Existing prerequisite/support selection retained, presented as optional support for the selected chapter. |
| Competency claims | Evidence, retention, misconception and method rules retained. Viewing a lesson grants no mastery; subsequent lesson practice is assisted. |
| Progress | Failed-save retry, saved exposure, practice, new-session reload and deterministic event replay are exercised against Django. |
| Review safeguards | Existing demonstration labels, eligibility and filtered pools retained; no approvals or flags enabled. |

Read-only inventory of current Grade 7 releases:

- CBSE/NCERT: all **15** chapter entries have mapped competencies. Arithmetic Expressions includes `MLY.alg.distributive`, which has no module. Constructions and Tilings includes `MATH.geometry.constructions-bisectors`, which has a module but no rendered lesson blocks in this inventory.
- Tamil Nadu mathematics: all **17** chapter entries have mapped competencies. Algebra includes missing modules `MLY.pow.whole` and `MLY.alg.distributive`; Geometry also includes the constructions/bisectors teaching gap.
- The sample Grade 7 release has **3** mapped chapter entries; no missing module was found in that limited sample.

This inventory inspects mapped competencies, module availability and rendered blocks under the current demonstration eligibility. It is not an educator review, a claim of complete chapters, or a guarantee of learner outcomes. Tamil Nadu here is a mathematics curriculum board, not Tamil-language product development.

## Validation

- `PATHWAY_ACCESS_ONLY=1 node --import tsx e2e/foundation-pathway.test.mts`: actual CBSE Grade 7 phone journey (390×844), missing prerequisites, teaching access, optional support declined, failed exposure save/retry, assisted practice, another assisted answer after reload, and replay.
- Focused existing pathway/remediation/topic-session/study-time regression: 26 passed.
- The existing Grade 7 entry regression retains its diagnostic and persistence assertions and now also checks teaching as the primary action. It exposed overlapping mathematics navigation and action rows on phones; these now wrap. Its overflow check compares against the actual 360/393-pixel viewport, rather than `innerWidth`, which mobile browsers can expand to accommodate overflow.
- Main, English integration and mathematics integration typechecks rerun as shared regression checks; no language product feature work.
- Profiling found that the closed coverage panel eagerly materialized all curriculum question pools: `releaseCoverage` took 52.46 seconds cold and 0.67–0.68 seconds warm in Node, versus 0.91 seconds cold / 0.02 seconds warm for learner state. The learner panel now reuses existing validated tile metadata and links to the curriculum view; full pool audits remain in coverage tooling. No new global cache, generator or authority policy was added, and existing registry-based tile-cache invalidation is preserved. The CBSE phone journey improved from approximately 33 seconds to **1.621 seconds cold**, with an **86 ms warm return**, in this container. The temporary 90-second diagnostic wait was removed; the original 30-second timeout passes. These are local measurements, not production capacity claims.
- Build and exact-head CI results are recorded in PR96. The seven earlier geometry benchmark-contract migration failures remain a separate, unresolved foundation regression; access changes do not relabel those frozen expectations.
