# 5. Cross-family leakage analysis

## In the authoritative state (exposed, not changed)

`evidence.ts` `about()` pools every linear family. Any two right answers alone show the **whole** competency as `independent`, with a delayed check scheduled. This happens whichever kind they were, and also for an unmapped family (`meet`, journey 17).

The projection reports a `discrepancy` whenever the authoritative status is `independent`, `transfer` or `verified` while any core solving sub-skill (two-step, both sides, brackets) is not `independently-demonstrated`.

| Journey | Authoritative | Sub-skills shown | Exposed as unsupported |
|---|---|---|---|
| 2 two-step only | independent | two-step | both-sides, brackets (not attempted) |
| 3 both-sides only | independent | both-sides | two-step, brackets |
| 4 brackets only | independent | brackets | two-step, both-sides |
| 6 eight two-step answers | independent | two-step | both-sides, brackets |
| 7 right answers, false working | independent | none | two-step (insufficient evidence; method contradicted) |
| 13 delayed check passed (lin + auleq) | independent, retention **passed** | two-step, modelling | both-sides **retention-due** (never sampled), brackets |
| 17 `meet` only | independent | none | all three |
| store learner 4b (Django round trip) | transfer | — | two-step **recovery-required**: the authoritative recovery was met by right answers of other kinds |

## In the projection (tested: no leakage)

- **One family per sub-skill.** Each answer is credited to exactly one sub-skill by its generator id. `exposureKey` stays inside one family, so variants never collide across families.
- **Tests on generated variants, 5 seeds:**
  - one-step success never shows two-step;
  - two-step success never shows both sides or brackets;
  - success in **any one** family shows only that family's sub-skill.
- **Prerequisite support is a list only.** It never changes a status, and only the explicit one-step edge exists.
- **The delayed check is per sub-skill.** A wrong modelling retention answer does not fail two-step, and a failed two-step check leaves both sides untouched (tests and journey 14).
- **mc and word formats** are credited only when the family supports that format and the generator accepts the parameters (review defect 1, fixed).

## Residual (documented, not a leak)

- A sub-skill is the family's kind, not a pure skill. Bracket questions also have x on both sides, and word problems also involve solving.
- mc answers can be guessed. Two right out of 4 options happens about 1 time in 16, the same exposure as the authority.
