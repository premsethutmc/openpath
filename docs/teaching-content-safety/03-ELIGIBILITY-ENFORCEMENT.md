# 03 — Eligibility enforcement

`contentEligibility(module, strategy, { competency, mode, misconceptionEvidence, usage })` (`explanation-review.ts`) evaluates every
check and returns a structured result (`eligible`, `status`, `educatorApproved`, `contentHash`, `checks[]`, `failed[]`, `label`):

| # | Check | Fails when |
|---|---|---|
| 1 | `exists` | no module, no strategy, the strategy is not in the module, or it has no text |
| 2 | `record` / `revision` | no review record, or no decision for this exact content hash (edited since review) |
| 3 | `not-blocked` | the revision is blocked in the registry or listed in the blocklist (all modes) |
| 4 | `integrity` | record metadata disagrees with the content (competency, strategy, intervention type, misconception flag), or an approval lacks educator provenance, an authorised reviewer, a valid date, or a matching digest; a non-approved revision claims supervised scope |
| 5 | `approved-for-usage` | the status is not allowed in the mode (supervised evaluation: `approved` with supervised scope only) |
| 6 | `competency` | the explanation is not for the skill being taught |
| 7 | `intervention` | the intervention type is not permitted in the mode |
| 8 | `misconception-evidence` | misconception-specific, used as an intervention, and **the misconception it addresses** is not established for this learner |

## Where it is enforced (every path that shows an explanation)

| Path | Code | Effect of a refusal |
|---|---|---|
| intervention selection | `intervention.orderStrategies` → `teachable` (machine contract **and** content gate) | the explanation is not a candidate; the planner chooses another; none → `pause` (`NO_EXPLANATION`: "no educator-approved explanation" in supervised mode) |
| "it showed again" (different explanation) | same `orderStrategies(…, true)` | all tried or none eligible → `pause` |
| availability count for the planner | `teachable` | no new check counted for a refused explanation |
| policy C (no prerequisite gap) | `recovery`: own-skill eligibility uses `teachable` | none eligible → `escalate` |
| lesson page | `teaching-contract.teachingLesson` (usage `lesson`), concept section included; app `TeachingContent.tsx` (cache per mode, label) | the section is left out; nothing substituted |
| study session | `StudySession.tsx`: the saved choice is re-checked on every render; concept section gated; label shown | falls through to the module (gated) |
| preview hint | `PreviewExperience.tsx`: concept text used as a hint only when the concept section is cleared | generic hint |
| learner label | `ModuleState.contentReview.label` → app `Learn.tsx`, slice `flow.ts` | "Demonstration: this explanation has not been approved by an educator." unless `educatorApproved` |
| provenance | session trace `explanation-review.contentEligibility` (mode, status, failed checks, evidence basis) | auditable per decision |

Policies A, B and C are unchanged: the gate only removes candidates, so it can refuse teaching that a policy permits (→ pause), never add
teaching or retries. Teaching shown is never evidence; the recheck is a fresh question alone, as before.

## Modes

| | demonstration (default) | supervised-evaluation |
|---|---|---|
| approved | shown, "Approved by an educator…" | shown |
| pending_review, revision_required, demo_only | shown, labelled not educator-approved | refused |
| blocked, unregistered, changed since review, integrity failure | refused | refused |

Set per process with `setTeachingMode` (state shared across module copies via `globalThis`, as review.ts does). The app's mode is fixed
at build time: `OPENPATH_TEACHING_MODE=supervised-evaluation node scripts/build.mjs` (default demonstration); it cannot be switched from
the page.

## Teaching decisions re-run (same 18 scenarios as the Milestone 2 closure)

| | Milestone 2 closure | A2 (demonstration mode) |
|---|---|---|
| explanations shown | 24 | 21 |
| justified by evidence | 15 | 15 |
| general explanation, no diagnosis claimed | — (counted as unverified) | 6 |
| misconception-specific **without** an established misconception | 3 (4a, 4c, 5b) | **0** |
| misconception-specific about a **different** misconception than the one established | 1 (2c: added-not-subtracted established, forgot-divide explanation shown; counted "justified" at baseline) | **0** |
| plausible but unverified, total | 9 | 0 misconception-specific; the 6 general ones carry their evidence basis (`repeated-difficulty`) |

4a, 4c and 5b now teach the general `check_what_it_uses` (demo-only status: shown only in demonstration, labelled) and then pause,
instead of "spot the mistake" for forgot-divide; 2c teaches the general `check_what_it_uses` instead of the forgot-divide explanation. Data: `teaching-decisions-a2.json` (script `frontend/scripts/a2-teaching-decisions.mts`).

In supervised mode with nothing approved (the committed state), every scenario that needs teaching pauses without teaching (test 9).
