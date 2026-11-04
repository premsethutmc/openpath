# 02 — Updated regression tests

| Test | File | What it pins |
|---|---|---|
| A1 slip after competence shown | `frontend/src/journey/policies.test.ts` | one unexplained wrong answer after 3 right: no investigation, no teaching, no recovery; the wrong answer is kept in evidence; no hypothesis established |
| A2 slip on first answer | same | starting check continues as **assessment** (`explore`, no `investigate:` context), bounded by the module's diagnostics, no teaching |
| A3 modelled error from a strong learner | same | an answer matching a modelled misconception **is** investigated (`investigate:` context) — assessment completion and misconception investigation are distinguished |
| B failed retention | same | status `review`, `verified=false`, `recoveryRequired=true`, `independentAt` and history kept, module not done and asks a question; after recovery: requirement lifted, still not verified, cycles `failed → pending` (one cycle, no duplicate) |
| C no prerequisite gap | same (scenario 3h) | own-skill explanation passes the teaching gate, an independent question follows the explanation, retry after the recheck, tries ≤ 1 + RETRY_LIMIT, exactly one own-skill teaching cycle, ends in a pause (escalation) |
| B across restarts | `frontend/scripts/m2-persistence.mts` | after reload from Django: failed check → review, not verified, recovery required, earlier achievement kept; after recovery → requirement lifted, still not verified |
| Scenario 3h expectation | `frontend/src/journey/scenarios.ts` | changed from "no teaching" to `teaching: some, mastery: forbidden, ended: pause/done` (decision C) |
| Teaching-decision evaluation | `frontend/scripts/m2-teaching-decisions.mts` | re-derives, before every explanation, the evidence the engine had; classifies justified / plausible-unverified |
