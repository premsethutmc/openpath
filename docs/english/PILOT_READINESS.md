# Pilot readiness: the five-capability pilot (PR #25)

Date: 2026-10-14. Branch `english/pilot-evidence-integrity`, stacked on PR #24 (`english/pilot-content`).

This PR adds no new subject, dashboard, scoring system or feature.

| Document | What it covers |
|---|---|
| READING_EVIDENCE_DEPENDENCE.md | The reading rule |
| PILOT_PROTOCOL.md | The supervised pilot protocol (draft) |
| EDUCATOR_DECISION_PACK.md | The decisions only an educator can make |
| PILOT_CONTENT_REPORT.md | Coverage and review status, generated from the content |

## Decision

| Stage | Decision | What is still needed |
|---|---|---|
| 1. Internal demonstration | **GO** | Nothing. Present it as synthetic learners and candidate content |
| 2. Adult usability testing | **GO, with conditions** | Adults only, answering as themselves or from a script. A short information and consent note. The facilitator says the content is unreviewed. No children's data |
| 3. Supervised testing with children | **NO-GO** | Blockers 1–6 below. The software side is technically coherent; what remains is human approval and the paperwork around it |
| 4. Public release | **NO-GO** | Everything for stage 3, then pilot evidence, accounts and data-protection work that are out of scope here |

**Technically coherent** means all of the following hold:
- The app can run each of the five capabilities through four stages:
  - a first check;
  - a lesson with practice;
  - a fresh confirming check;
  - a later check.
- Each stage uses questions reserved for it.
- Teaching never uses up assessment questions.
- Reading answers count once per passage.
- Every review decision is recorded, auditable and never applied silently.

It does **not** mean the content or the rules are educationally valid. No educator has approved anything yet.

## What PR #25 changed

1. **Assessment-pool leakage fixed.**
   - **The fault.** Practice during teaching drew on first-check (diagnosis) questions as well as practice ones. The
     "more practice" session used first-check questions only. So grammar teaching could use up and expose the
     questions a first check needed. The spelling module's practice also inserted a diagnosis question.
   - **The fix.** Practice now uses practice questions only. When they run out, practice asks nothing more rather than
     borrowing.
   - **New candidate practice material (33 questions).**

     | Capability | New practice questions | Covers |
     |---|---|---|
     | Inflections | 5 | One per taught step |
     | Subject–verb agreement | 8 | A full session plus two |
     | Articles | 8 | A full session plus two |
     | Finding details | 6 | Three lessons × three, with the 3 from PR #24 |
     | Main idea | 6 | As above |

   - **Reading practice sessions** now ask 3 questions, each on its own passage, not 6.
   - **Two main-idea first-check questions** were added on their own passages. Once only one answer per passage
     counts, main idea had only two first-check answers at the easier levels.
   - **Preserved.** No existing question, id or version changed. No learner record changed.
2. **Reading evidence dependence (passage@1).**
   - **The rule.** Only the first counted answer on a reading passage changes that skill's estimate. Later answers on
     the passage are held: kept with their scores for diagnosis and shown separately to a parent.
   - **Scope.** It applies only to answers recorded from now on, marked in their provenance. Records made before it
     replay exactly as they were scored. A record made by the PR #24 app replays byte-identically, and the frozen
     simulation is identical.
   - **Selection.** Selection never returns to a passage already answered for that skill.
   - **Not a redesign.** It is one branch in the updater, using the existing "held" verdict. There is no new model and
     no new parameters. The alternatives that would be a redesign are listed for decision, not implemented.
3. **Review workflow.** The round trip is complete:
   - The export (CSV and HTML) carries each row's current review state.
   - The import records decisions and refuses anything incomplete or stale.
   - The status, and the generated report, list what is approved, rejected, to revise, to discuss, changed since a
     decision, and outstanding.

   Only an educator's "approve" on the exact current content counts. A change after approval puts the row back to
   "re-review". Nothing is applied to the app: approval never makes content "validated" by itself.
4. **Pilot protocol** (draft): consent, assent, age, session length and stopping rules, supervision, frustration and
   distress, data minimisation and retention, withdrawal and deletion, failure logging, and manual review of
   questionable judgements.
5. **Educator decision pack.** It covers:
   - coverage per capability;
   - lessons;
   - the prerequisite;
   - every evidence and mastery rule with its current value;
   - difficulty;
   - retention intervals;
   - a review checklist;
   - decisions D1–D12.

## Unresolved blockers before supervised testing with children

Exactly these:

1. **Educator review of the content.** 0 of 250 rows are approved:
   - 177 questions;
   - 43 passages;
   - 28 lessons;
   - 2 prerequisite edges.

   Before a child sees a row, a named educator must approve it on the review CSV (D2).
2. **Educator decisions D1 and D3–D10, and D12** (EDUCATOR_DECISION_PACK.md). They cover:
   - the pilot age range;
   - `grm.art.02`;
   - the main-idea prerequisite;
   - passage@1;
   - the found-hard, improving and shown tests;
   - the retention intervals;
   - the session lengths;
   - the minimum supply;
   - the bar for starting.

   Every rule is a draft (`development-policy@0-draft`).
3. **The age range does not match yet.** The framework is written for ages 10–15. The pilot's reserved content sits
   at difficulty 2–4. The proposal is 10–12, pending D1.
4. **Agreement to the pilot protocol** by the host organisation and its safeguarding lead (D11), including the
   supervisor's safeguarding approval.
5. **A data-protection review** for the country of the pilot, and the actual **information sheet and consent form**.
   The protocol lists what they must say, but they are not written. Children's data rules differ by country.
6. **Supply is enough for one cycle only, at difficulty ≤ 4.** That is one first check, one teaching cycle, one fresh
   check and one later check per capability.
   - Nothing is reserved for fresh or later checks above difficulty 4.5.
   - A learner who needs a second teaching cycle, or a second later check, runs out of reserved questions. The plan
     then says so ("more reviewed questions are needed").
   - Either restrict the pilot to one cycle and the easier levels, or write and review more questions.

**Not blockers, but for the reviewer:**
- **After review, apply the approvals visibly.** Mark approved content validated, and remove or replace rejected
  rows, in a separate change that cites the recorded decisions. No such step exists yet, by design.
- **Shared families.** All 14 older "finding details" questions share one family, so after the first, the ledger
  labels the rest "variants". This is cosmetic: it changes no estimate.
- **Passage effects across skills.** If a child misreads a passage, both skills can be affected. Each skill counts the
  passage once, but the small coupling between them is not corrected (READING_EVIDENCE_DEPENDENCE.md §6).
- **Devices.** Browser tests run in Chromium at phone size only. Check each pilot device with a test learner first
  (protocol §10).

## Test results (this branch, local)

| Check | Result |
|---|---|
| Engine tests (`packages/english-core`) | 187 of 187 pass. New: V2-1 to V2-8 (passage dependence); PR-6 and PR-7 (review round trip, no silent validation) |
| App tests (`frontend`) | 94 of 94 pass. New: PI-1 to PI-8 (historical replay, continuation, contamination, practice exhaustion, spelling pools, supply, reading selection, reporting). Updated: PC-4 (PR #25 origin), PC-5 (supply counted by passage), PC-7 (practice uses practice questions only) |
| Typecheck (engine, app, English app) | Clean |
| English build | Built |
| Browser tests (Playwright, phone size) | 7 of 7 pass. The test harness now knows the pilot items, because spelling practice inserts a practice question |
| Profile demo (scenarios A–L) | 25 of 25 checks pass, 62 screenshots. Scenario L's practice now shows a practice question only |
| Journey demo | 11 of 11 checks pass, 55 screenshots |
| Frozen simulation | Byte-identical to the baseline |
| Framework lock, generated spelling items, bank report, E3 harness, CLI demo | OK |
| Pilot report check | Up to date |

**Regression tests asked for in the request:**

| Asked for | Tests |
|---|---|
| Assessment contamination | PI-3, PI-4, PI-5, PC-7 |
| Reading evidence dependence | V2-1 to V2-8, PI-7, PI-8 |
| Review round trip | PR-6, PR-7 |
| Preservation of historical records | PI-1, PI-2, V2-3, V2-4, and the identical frozen simulation |

All results come from synthetic learners and show software behaviour only. They do not validate anything
educationally.
