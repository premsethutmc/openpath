# 2. The sub-skill projection: `sub-skill-evidence@0` (non-authoritative)

## Code

| File | Role |
|---|---|
| `packages/learning/src/sub-skill-evidence.ts` | The projection: `subSkillProjection(learnerId, events, now)` |
| `packages/learning/src/sub-skill-evidence.test.ts` | Unit tests |
| `packages/learning/src/fixtures/d1-working-decisions.json` | Real D1 trusted-grader decisions, as stored events |
| `frontend/src/journey/sub-skill-journeys.ts`, `sub-skill-evidence.test.ts` | Journeys through the real flow |
| `frontend/scripts/e1-projection.mts` | Writes the journey traces |
| `frontend/scripts/e1-leakage-scan.mts` | Runs every M2 scenario through the projection |

## What it is

A pure, read-only function of a learner's stored events (decisions inside, as Django stores them) and a time. It returns:

- `schema: "sub-skill-evidence@0"` and `authoritative: false`;
- per sub-skill: the projection fields below;
- per competency: the production status (read from the unchanged evidence engine), the required sub-skills, which are shown, missing and retained, what the evidence supports, and leakage findings;
- `digest`: sha256 of the canonical projection.

## Sub-skills

Sub-skills are the question families the modules already use (`problemOf(questionId).family`). Nothing is inferred from text.

| Sub-skill | Competency | Families | Required for the competency |
|---|---|---|---|
| one-step | linear-intro | `ahone` | yes (linear-intro) |
| two-step | linear-equations | `lin` | yes |
| variables-both-sides | linear-equations | `lboth` | yes |
| brackets | linear-equations | `lbrk` | yes |
| forming-equations | linear-equations | `auleq`, `aulwp` | no (supporting) |

## Per-sub-skill fields (each kept apart)

| Field | Meaning | Rule |
|---|---|---|
| `answers` | independent right / wrong, assisted right / wrong | Production rules: `independentAttempt`, `rightAnswer`. Hints, guided activity, a shown solution or a repeat attempt make an attempt assisted. |
| `method` | verified / invalid / unsupported / partial / answer-only / no-working / unverified / not-recorded, plus `correctWithInvalidMethod` and `correctWithVerifiedMethod` | Read **only** from the server's stored decision `working` (D1 working-assessment@1). "verified" requires status `verified` **and** `method-verified`. Working the learner wrote with no trusted verdict is `unverified`, never verified. Pre-D1 records are `not-recorded`. Method never changes an answer count. |
| `status` | no-evidence / exposure / assisted-only / emerging / shown / lapsed | The production "independent" rule on this sub-skill's own attempts: INDEPENDENT_MIN = 2 distinct right first answers alone, and two wrong of the last three undo it. |
| `firstShownAt` | when the sub-skill was first shown | Kept once reached, whatever follows. This is the historical achievement. |
| `retention`, `retentionHistory` | never-checked / scheduled / due / passed / failed / not-applicable | The production cycle (retention@2) on this sub-skill's own delayed-check answers. A failure stays in the history. Recovery is 2 distinct right answers alone outside the check, then a new check 7 days later. |

## Competency-level findings

| Field | Meaning |
|---|---|
| `supports` | `none` / `partial` / `shown-all-required` / `retained-all-required` |
| `leakage: competency-status-without-sub-skill-evidence` | Production status is independent, transfer or verified while a required sub-skill is not shown |
| `leakage: delayed-check-passed-without-sub-skill-check` | Production's delayed check passed while a required sub-skill has no passed check of its own |
| `leakage: verified-without-sub-skill-retention` | Production verified while a required sub-skill has no passed check |

## Guarantees (tested)

- **Deterministic.**
  - Events are ordered by (`at`, `id`) before reading, so shuffled input gives the same digest.
  - A JSON round trip gives the same digest.
  - A session rebuilt from stored events (`SliceSession.fromEvents`) gives the same digest.
- **Non-authoritative.**
  - A test walks `packages/learning/src`, `frontend/src` and `backend/family` and fails if any non-test module other than the journey harness imports the projection.
  - Computing it leaves production evidence byte-identical.
- **Not activated.** Nothing displays it, records it or decides with it.
