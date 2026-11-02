# Mathematics skill connections

Stacked on foundation PR96, `feat/shared-math-foundation-local` at `637938c7da0416b03595fae60a80607e60aa84c0`. This branch does not merge or alter that PR. No deployment or global activation.

## Reuse and ownership

| Responsibility | Existing implementation reused | This milestone |
|---|---|---|
| Question semantics and answers | `families.ts`, family validators, server grader | Validate parameter-selected tasks; no new solver |
| Evidence and retention | `subskill-projection.ts`, existing ledger and retention cycles | Optional parameter predicates, reject ambiguous mappings, preserve older mappings |
| Teaching and selection | `intervention.ts`, review gates, `foundation-runtime.ts` | Preserve a delivered block's skill through guided work and reassessment |
| Diagnosis | `hypotheses.ts`, discriminating probes | Opt-in saved hypotheses require same-skill teaching and resolution evidence |
| UI and persistence | Existing Year, lessons, working input, Django event API | Reused without layout or theme changes |
| Content authorship | Claude owns `docs/math-teaching-content/` | Untouched here; no runtime content changes or new approvals |
| Research | `openpath-research` at `46fcf5f` | Read-only; no estimator or experimental-state activation |

## Contract

A `SubSkillDef` may supply `parameters: [{index, values}]`. These are AND conditions on parameters of a valid generator question; matching multiple skills fails closed. Classification verifies the matched skill's actual competency, including the existing explicit linear-intro prerequisite mapping. No question-text inference is used.

`skill-connections.ts` configures square-identity coefficient tasks and five angle relationships. Existing linear-equation, addition and triangle configurations are reused. The older angle mapping remains available and unchanged; the opted-in pathway uses version 2. Correct constants cannot establish the square's middle coefficient, and opposite-angle answers cannot establish adjacent-angle calculations.

Teaching connections require valid guided and check tasks for the same skill, nonempty teaching screens and the existing teaching/content review gates. This is mechanical validation, not educator approval or proof of explanation quality. A missing connection produces an unavailable/content-gap result. Ordinary chapter access and optional prerequisite help remain available.

A delivered block keeps its skill through guided practice and a fresh reassessment. An assisted reassessment completes the instructional block without becoming independent evidence. Later independent practice/transfer/retention also prevents an old lesson from reopening. Active investigation, recovery and handover retain ownership. Checks exclude previously attempted, unresolved, pending and explicitly taught examples.

Existing misconception thresholds remain: one wrong answer does not diagnose a misconception. For opted-in sessions, saved teaching and resolution probes must match the observed skill as well as the existing diagnostic requirements. Other sessions preserve their historical interpretation.

Working stays with the existing trusted checker contracts and immutable decisions. These mappings add no checker authority. Square-identity expression working remains unsupported; a correct numeric coefficient is answer evidence only.

## Audit and limits

Run from `frontend`: `node --import tsx ../tools/mathematics/connection-audit.mts`.

The deterministic report inventories all 353 shared mathematics graph competencies, distinguishing missing modules, missing skill metadata, teaching/check/retention/diagnostic gaps, and bounded versus unsupported working. It checks candidate answers with the generator validator, validates teaching guided/check alignment, and applies quarantine/review gates. Counts describe engineering connections, not curriculum completion or learner outcomes. Content currently has connected answer chains in more than one domain, but every configured competency still has gaps. Numeric identity calculation (`ahidn`) is deliberately unmapped.

Claude candidate schema: competency; family; parameter conditions; guided and fresh-check IDs; explanation/worked-example/hints; diagnostic predictions with evidence requirements; source references; proposed retention task; mathematical validation; educator-review status. Staging stays under `docs/math-teaching-content/`, outside runtime and generated registries.

## Validation

See `validation.md` for final commands and outcomes. Frozen benchmarks, historical results and workflow definitions are unchanged.
