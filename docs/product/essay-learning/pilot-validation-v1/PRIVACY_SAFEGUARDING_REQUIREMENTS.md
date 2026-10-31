# Privacy and safeguarding: implementation requirements for children's essays

**Real-child essay access stays disabled.** This change does not enable it:

- `REAL_LEARNER_ESSAYS_ENABLED = false` in the core;
- the server accepts only `data_use: "synthetic_test"` from developer accounts;
- the essay studio uses only its synthetic, device-only profile.

This document sets out what must be built, and what must be decided, before that changes. It invents no consent
wording, retention period or provider choice. Where a value is needed, it says *to be decided* and who decides.

*Not legal advice.* India's DPDP Act 2023 treats everyone under 18 as a child and requires verifiable parental
consent. A qualified reviewer must approve the plan (decision D11, PILOT_PROTOCOL.md §7).

Key:

- **Now** means it can be implemented and tested without any policy decision. It is engineering only, and it stays
  behind the disabled switch.
- **Needs approval** means a human must decide first. Building it before the decision would be inventing policy.

## 1. Essay-specific parental consent

**Today:**

- `PurposeConsent` (backend/evaluation/models.py) has one purpose, `ai_evaluation` ("AI evaluation of written
  answers"), given by guardian or school, with a policy version. The latest record wins, so consent can be withdrawn.
- Parent accounts record an enrolment consent version (`2026-10-prototype`).
- Nothing covers essays.

| Requirement | Now / approval |
|---|---|
| A separate consent purpose for essays (e.g. `essay_analysis`), never implied by `ai_evaluation` or enrolment consent. Recorded per learner, with who gave it, the policy version and the time; withdrawable; the latest record wins. | **Now**: the model choice, migration and tests. The purpose's wording is not part of this. |
| Every essay request, on the server and in the core, refused unless the latest essay consent is granted and its policy version is one the server accepts. Withdrawal stops new requests at once. | **Now**: the check, with an empty list of accepted versions, so it refuses everything until a version is approved. |
| Consent covers each processing step separately, or names all of them: storing the essay, sending it to a model provider (named), showing observations to the child and parent, educator access. | **Needs approval**: which steps, and whether one consent or several. |
| The consent mechanism: verifiable parental consent (written form for the pilot, or an in-app flow with verification), plus the child's own assent. | **Needs approval** (D11): mechanism, wording, verification method, language versions. |
| The information sheet text for essays. | **Needs approval**. |

## 2. Minimising names and identifying information

**Today:**

- Before any model call, the core and server remove email addresses, links, phone numbers and @handles.
- The server also removes "Mr/Ms X", "my name is X", sign-off names and "class 8B".
- Essays keep **first names of friends and family, school names, towns and streets**.
- Essay records carry a pseudonymous learner id, never a name.

| Requirement | Now / approval |
|---|---|
| A pre-send **identifier check** that flags (does not silently send) likely names, schools and places. Capitalised words not in a word list or the prompt; known place names; "my school, X". The child or supervisor confirms or replaces them before the essay leaves the device. Tested against an extended `scrub-cases.json`. | **Now** (the check and its tests). |
| The scrubbed text, not the original, is what any evaluator sees and what is fingerprinted for provenance. Quotes in observations are validated against the scrubbed text. | **Now** (already true for the server path; add a test that the studio path does the same). |
| The rule for names: remove automatically; replace with placeholders; ask children to use made-up names; or human review before sending. | **Needs approval**. |
| Whether an essay that still contains a flagged identifier may be sent at all. | **Needs approval**. |
| No raw essay text in server logs, error messages or analytics (already designed; keep it under test). | **Now**: extend the existing test that logs and records hold metadata only. |

## 3. Essay retention and deletion

**Today:**

- The server stores no essay text. `EssayEvaluationRecord` keeps metadata only: task, protocol, model, fingerprint,
  length, tokens and status.
- Essays, analyses and rewrites live in the learner's ledger: on the device for the studio, and in an account if one is
  ever synced.
- A parent can delete a pupil or the whole account, and scrub material from a pupil's record. A device learner can be
  deleted from the device.
- No essay-specific retention period exists. The pilot protocol proposes deletion dates but has not decided them.
- *Note:* the written-answer evaluator's `EvaluationRecord` stores the scrubbed request. That is not used for essays.

| Requirement | Now / approval |
|---|---|
| An **essay deletion** operation: remove the essay text, its analysis and its rewrite from the learner's record (device and server). Keep, or also remove, the competency evidence derived from it, as configured. Record that a deletion happened (no content). Tested, including after a reload and a sync. | **Now**: the mechanism, with both options. |
| A **retention sweep** that deletes essay text older than a configured period. Ships with no period set, so it does nothing until a period is approved, and a test fails if a period is set in code without a decision reference. | **Now**: the mechanism. |
| Deletion on consent withdrawal: withdrawal triggers the essay deletion above. | **Now**: the wiring. What is kept is a policy question (next row). |
| How long essay text, analyses and rewrites are kept. Whether derived evidence (answers to questions, which contain no essay text) is kept after the essay is deleted. Where essays live (device only, as in the pilot protocol, or the server, and how they are encrypted). | **Needs approval**. |
| Deletion confirmation to the guardian (the protocol's step 4). | **Needs approval** (process), then **now** (a deletion receipt in the app). |

## 4. Model-provider data handling

**Today:**

- The model is off by default (`OPENPATH_ESSAY_EVALUATOR=disabled`).
- The key is in the server environment only, and is never logged or returned.
- When the model is on, the scrubbed essay **is sent to the provider**.
- The client can talk to Anthropic's Messages API or any OpenAI-compatible service. No provider has been chosen.

| Requirement | Now / approval |
|---|---|
| The provider is configured per environment and refused unless it is on an **approved-provider list** (provider, model, region, data-terms reference, approval date). Ships empty, so it refuses real-learner traffic until an entry is approved. | **Now**: the list and the check. |
| Request minimisation: send only the scrubbed essay, prompt and rubric, never the learner id, profile, name or history. (Already true; keep it under test.) | **Now**. |
| Daily request and token caps (exist), plus a per-run cost cap for benchmarks (added in this change). | Done / **Now**. |
| Which provider, under which terms: no training on inputs, retention period at the provider, data location, sub-processors, a children's-data agreement, breach notice. | **Needs approval** (owner, with the data-protection reviewer). |
| Whether a zero-data-retention arrangement is required. | **Needs approval**. |
| What happens when the provider is unavailable (the studio's local fallback exists for synthetic data). | **Needs approval** for real children. |

## 5. Educator access controls

**Today:**

- There is no educator role in the app.
- Educator review happens offline on content files, which hold no child data.
- Developer diagnostics are read-only and audited, and see a pupil only if the parent shares them.

| Requirement | Now / approval |
|---|---|
| Keep content review (questions, lessons, standards, the synthetic essay benchmark) completely separate from any child data. (True today; keep it so.) | **Now**. |
| If educators are to see children's essays or results: an educator role, scoped to named learners whose guardian consented to educator access. Read-only by default; every view audited (who, what, when); no export of essay text; access ends with the pilot. | **Needs approval** first (whether educators see children's work at all, which educators, for how long). Then **now**: the role, scoping and audit, modelled on the existing developer-diagnostics audit. |
| Educators' identifiers in review files are codes, never children's names (the review guide says so). | Done. |

## 6. Safeguarding responses to disclosures of harm

**Today:**

- The written-answer pathway has a `safeguarding` flag. A flagged answer is rejected for learning (updater check 8:
  "route to the safeguarding process").
- **The essay pathway has no safeguarding flag.** The essay prompts and the observation contract do not ask for one.
- The pilot protocol says any safeguarding concern follows the host organisation's procedure, and goes to its
  safeguarding lead, not into the pilot records.

| Requirement | Now / approval |
|---|---|
| An essay **safeguarding hold** in the contract: the evaluator may return a safeguarding flag (no detail, no quote) for an essay that may disclose harm. The core then stops that essay's analysis: no observations, no hypotheses, no journey, no rewrite. It shows a neutral message and records only that a hold happened. | **Now**: the contract field, the core rule and tests with synthetic cases. The prompt change is a new prompt version. |
| A **local, conservative screen** on the device (a word and phrase list) that also triggers the hold, so the hold does not depend on a model. | **Now**: the mechanism. **Needs approval**: the list, from a safeguarding lead. |
| The hold never auto-sends anything anywhere, and never stores the essay longer than it would otherwise be kept. | **Now**. |
| Who is told, how fast, by whom, and what the child sees. The route to the host organisation's safeguarding lead. Whether the supervisor must be present whenever essays are written. What is recorded, and where (not in the pilot records, per the protocol). | **Needs approval** (host organisation's safeguarding lead and the owner). |
| Wording shown to a child when a hold happens. | **Needs approval**. |

## Summary

**Can be implemented now:**

- essay consent purpose and check (refusing everything until a version is approved);
- identifier flagging before send;
- essay deletion and withdrawal wiring;
- a retention sweep with no period set;
- an approved-provider list (empty);
- request-minimisation tests;
- the essay safeguarding hold and local screen mechanism.

All of these stay behind `REAL_LEARNER_ESSAYS_ENABLED = false`. None is built in this change, which is documentation
and pilot preparation only; they are proposed as the next engineering change.

**Needs human approval first:**

- consent mechanism and wording;
- the names rule;
- retention periods and where essays live;
- provider and terms;
- educator access to children's work;
- the safeguarding process, word list and child-facing wording.

These are listed with owners in `HUMAN_DECISIONS.md`.
