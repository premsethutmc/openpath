# 05 — Misconception evidence policy (misconception-evidence@1)

`packages/learning/src/misconception-evidence.ts` derives, read-only, what the learner's records show about a skill. It writes nothing and
turns no reading into a stored fact.

| Fact | Derived from | What it licenses |
|---|---|---|
| observed-incorrect | any wrong answer in the skill | nothing by itself (policy A: one unexplained slip is kept, not acted on) |
| repeated-difficulty | ≥ 2 wrong answers alone, no established misconception | a **general** explanation of the skill |
| hint-dependence | right only with help (hints, solution, guided, retries), never alone | a general explanation; no mastery |
| verified-misconception | learner-hypothesis@1 **established** (two matching answers; not resolved, not contested), or a diagnostic@2 finding passed in by recovery | a **misconception-specific** explanation |
| uncertain-hypothesis | an unfinished or contested investigation, or a starting-check posterior (e.g. "conceptual", confidence 0.47) with nothing established | at most a general explanation; never a misconception-specific one; never stored as established |
| missing-prerequisite | starting-check diagnosis "prerequisite", or recovery's supporting-skill gap | teaching of the prerequisite skill (recovery) |
| failed-retention | retention-failure@1 (`recoveryRequired`) | recovery work (policy B) |
| general-need | none of the above | a general explanation, no diagnosis claimed |

## Rule enforced

A misconception-specific explanation (any section with the `misconception` role, e.g. "Spot the mistake") is eligible as an
**intervention** only when **the misconception it addresses** (`addresses`, read from its content) is among the learner's established
misconceptions (`basis.established`; a recovery finding carries its diagnosis id) — `verified-misconception` for that misconception (`contentEligibility` check `misconception-evidence`; `orderStrategies` passes
`basis.misconceptionEvidence`). Repeated wrong answers, hint dependence or an uncertain hypothesis never stand in for it. When no
specific misconception is verified, the engine chooses another eligible (general) explanation through the same ranking, retry limits and
eligibility gate; if none is eligible, it pauses (`NO_EXPLANATION`).

A **lesson page** (`teachingLesson`, usage `lesson`) is general instruction for every reader and implies no diagnosis, so the evidence
check does not apply there; review status, revision and blocking do.

The evidence basis is recorded with every teaching decision (session trace `explanation-review.contentEligibility`: `basis`, `facts`,
`misconceptionEvidence`) and returned on the module state (`ms.basis`) for reports. The learner-facing reason text is unchanged: it
names a misconception only when one is established (`established.says` / `own.claim.says`), as before.

## The nine unverified decisions (Milestone 2 closure), re-run

See [03-ELIGIBILITY-ENFORCEMENT.md](03-ELIGIBILITY-ENFORCEMENT.md) for the re-run table. The three misconception-specific ones (4a, 4c, 5b:
"spot the mistake" with no misconception established) now choose a general explanation; the six general ones are now classified as
general instruction with their evidence basis, not as diagnoses.
