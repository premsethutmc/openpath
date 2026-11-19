# Reading brief Item 1: ordinary answer and sentence evidence

Scope: only Item 1 of `docs/english/READING_NEXT_FOR_CODEX.md`. No seventh skill, long-text route, AI answer calls, or other owned English stream changes.

## Learner behavior
All 144 check questions across six existing skills and six levels now ask for sentence evidence after the answer is locked. The full two-question check remains unmarked and unhinted until both parts are submitted. Answer accuracy, unit progression and historical scores retain their previous meaning; evidence is reported separately (complete, partial, mixed, unmatched). Historical answer-only results remain unassessed, not failed evidence.

Authored spans are matched by exact text position to sentences. Optional `evidenceAlternatives` are complete authoritative alternative sets; no keyword/semantic heuristic grades the selection. Content audit strengthened 21 question keys and existing Level 4 views of character and plot without changing passage text, question IDs or answer options. Existing SCREENED entries still cover every changed content file. Class 8 R2 refers to choosing textual support for character/plot views, not independently composing literary analysis.

## Interrupted work and freshness
Check checkpoints live in the same learner event ledger; answer draft, lock, evidence draft and first submitted question survive Back/reload. Reopening continues that unmarked attempt without recording another exposure or spending another pair. The ordinary course still uses fresh questions and prefers unread passages; previously read text is explicitly labelled, not called unseen. Exposure of a pending passage elsewhere, content drift or invalid checkpoint fails closed and preserves earlier records. An explicit “Close this attempt and learn” archives an interrupted check without deleting drafts/exposures or awarding a score, then reopens the lesson. Later checks still exclude all opened questions. Completed records are not rescored. Concurrent tabs remain outside the single-device session guarantee.

Existing save-before-display gate is retained, and actions are single-flight. Save failure hides content until the queued ledger writes succeed. No migration rewrites existing history.

## Verification and finish line
- Local reading tests cover every key, all answer/evidence result combinations, partial support, recovery, exposure, corrupt/content-drift quarantine and legacy history.
- Browser coverage at 390px covers all 36 units, distinct answer/evidence scores, no early hints, character/plot selection, locked-answer draft recovery and existing flows.
- Exact command: `cd frontend && node --import tsx scripts/sim-english.mts --runs 20 --strict`. The eight simulated profiles now select evidence and resume a pending evidence draft in every reading visit. A separate shared-exposure recovery preflight checks explicit close/reopen without adding learner success or learning gains. Needless repeats mean a correctly answered question repeated within seven days; pending-draft resume has separate no-duplicate-exposure tests. Strict mode explicitly rejects Reading needless repeats as well as stuck/error visits. Simulation validates routing/state behavior, not real learning gains.
- Draft PR / exact-head integrated CI: pending publication.
- Main merge and openpath-family live confirmation: root-owned, pending. Item 1 is not complete until this last finish-line item is verified. Do not begin Item 2 yet.
