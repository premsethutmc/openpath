# Connected mathematical input: integration and boundaries

## Reused and newly supplied capabilities

Reused unchanged: the original SVG/Pointer Events workspace; `openpath-math-input@1`;
OpenPath parent sessions/CSRF and canonical `Pupil`; the `PupilEvent` mathematics
stream; mathematics competency registration; the native `Ledger`, provisional
content gate and verification eligibility; the existing rational/polynomial
question evaluator and Python `Fraction` already used by the mathematics service.

The baseline has no long-division step validator, handwriting draft API or reusable
mathematics-specific diagnostic service. The essay diagnostic engine is coupled to
English observations and policies; treating division as an essay diagnosis would
be incorrect. New `family/writing_math.py` supplies the smallest topic adapter:
integer division operations, exact fraction equivalence and deterministic targeted
follow-ups. It keeps causes provisional and does not introduce another estimator,
learner identity, permanent misconception profile or mastery definition.

The activity state machine persists introduction → worked example → workspace →
optional follow-ups/teaching → retry → completion. It is not a continuously
regenerated lesson plan. The same stored writing is returned after teaching.

## Actual Django API

All endpoints reuse `AccountBase`: existing HttpOnly session authentication, CSRF,
parent ownership filtering, request limits and `Cache-Control: no-store`.

| Endpoint below `/api/pupils/{existingPupilId}/` | Function |
|---|---|
| `POST writing/` | Open/resume by topic and bounded parameters. Returns server lesson/layout and its draft ID. |
| `GET writing/{draftId}/` | Restore original work, stage, support context and practice receipts. |
| `PUT writing/{draftId}/` | Save `{version, work}`; stale CAS versions return 409. Problem, layout, identity, ink and references are checked. |
| `POST writing/{draftId}/action/` | Advance instruction, answer the current follow-up, return from teaching, or dispute a transcription. |
| `POST writing/{draftId}/validate/` | Submit saved `revision`; the server reads authoritative persisted input, never trusts client `correct` flags or display serialization. |

`topic=division` parameters are `dividend` and positive `divisor`; `topic=fraction`
uses `numerator` and `denominator`. The initial examples are 379 ÷ 3 and equivalence
to 1/2. Limits bound operand size and input storage. Unsupported syntax and
unresolved ink return **input clarification**, not a mathematical mistake.
A repeated validation of the same immutable work revision returns the same receipt
instead of appending another attempt. Progress survives page reload and reopening.

Migration `family/0003_writing_draft.py` adds `WritingDraft`, a mutable activity/draft
record belonging to the existing pupil. It is not a second learner model or evidence
ledger. Parent export includes writing drafts; pupil/account deletion cascades to
the drafts and their existing ledger events. No production migration was run.

The browser `WritingLessonRepo` serializes writes before validation, uses CAS and
surfaces failed saves. Work stays visible on failure. The server locks the same pupil
row as the existing event endpoint when appending receipts, preserving one ordered
subject stream. Production uses the repository's normal PostgreSQL configuration;
local acceptance tests used a fresh synthetic SQLite database.

## Validation and diagnostic teaching

The server derives division cycles from actual operands with integer arithmetic.
At each active dividend place it checks the quotient digit, product, difference and
next bring-down, then the final remainder. Quotient tokens are read horizontally,
not sorted by slightly different ink heights. Numeric digit order establishes
place value; this is not a handwriting-neatness test. Interior quotient zeroes,
leading skipped places, zero dividends and dividends smaller than the divisor are
tested. The first missing part is incomplete, not wrong. The first invalid entered
operation is returned before inspecting later steps.

A wrong quotient digit for 7 ÷ 3 triggers separate equal-grouping, multiplication
and quotient-selection probes. Teaching derives the group count, product, remainder
and too-large next group from the operands. An incorrect fact can suggest support
with multiplication; all probes right leaves a possible slip unresolved. These
provisional checks do not establish a scientifically confirmed cause. Small equal
groups can be drawn; larger groups use the numeric explanation instead of truncated
or misleading dot pictures. Fraction teaching uses equal scaling of both parts.

The transcription-dispute action returns directly to existing working without
forcing those mathematical probes. Original validation receipts remain immutable;
a linked `input-correction` receipt marks the transcription as disputed. The native
projection excludes disputed interpretations. This changes no shared evidence rule.

## Evidence: one pupil, one event stream, unchanged gates

Server-only `math_writing` receipts are appended to the existing mathematics
`PupilEvent` stream, alongside existing `math_activity` records. They carry canonical
pupil/draft IDs, server time, lesson version, provisional status, original input
snapshots, operation observations, help/feedback lineage and `admissible:false`.
Clients cannot post arbitrary writing evidence through the old mathematics event
endpoint. Raw receipt history is never reset or rewritten after a correction.

The existing fractions repository now filters **only** the new writing receipt kind
before its strict legacy activity replay; it retains the total sequence count for
future appends. It does not discard or change school/exam program progress. Other
unexpected kinds still reach the existing strict replay rather than being hidden.

`writingEvidence` is an activity projection through the existing
`mathematicsLedger`/`indexContent`/`verificationEligibility`. It creates provisional
native code-item events for server-validated operations, and native
`assisted_response` records after help/repeated feedback. Provisional responses are
held and never change estimates; no new learner estimator is introduced. This
activity-scoped view does not replace the universal learner profile. The canonical
identity and raw history are shared; all new evidence is intentionally inadmissible.

## Reuse with other mathematical engines

The controlled public React component still accepts `work`, `onChange`, a
`Recognizer`, `Validator`, configurable confidence threshold and input callback.
`allowExtraRegions=false` locks the fixed lesson's schema; free writing still uses
configurable layouts, arbitrary regions and the original tools. No separate drawing
engine was made for division or fractions.

The host validator adapter receives `InputPacket`, flushes pending saves and submits
the matching saved revision to Django. Feedback matches contract, work ID and
revision. Late feedback is refused. The server reconstructs numeric region text
from spatial tokens; `steps.text` remains display-only. Original strokes, timestamps,
pressure, positions, correction/entry history and intended symbols remain available.

`engine-adapter.ts` exposes `regionExpression` and `evaluateWithExistingEngine`.
Tests feed this same packet to the **existing** arithmetic, fraction, linear and
polynomial validators without rewriting the workspace or engine. These are contract
compatibility tests; only division and fraction equivalence have full Django/learner
screens in this iteration. No unrestricted handwritten algebra/geometry/calculus
validation is claimed.

All content and recognition scores still need educator/real-device validation.
Future lesson versions must use an explicit version/migration rather than silently
changing stored layouts or reinterpreting historical learner evidence.
