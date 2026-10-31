# 2. Sub-skill evidence contract

**Contract** `linear-equations-subskill-projection@1`; **mapping** `linear-equations-subskills@1` (`packages/learning/src/subskill-evidence.ts`).

## Identity

- **Sub-skill ids** are `linear-equations.<kind>@1`. They are stable; a new mapping is a new version (`@2`), never an edit.
- **The competency id is unchanged**: `MATH.algebra.linear-equations`. Sub-skills are not competencies and are not graph nodes.
- **The sub-skill of an answer** comes only from the trusted generator id in `questionId`, via `classifyQuestion`. The id must also be one the generator itself produces: `problemOf` accepts the parameters, and the family supports the mc or word format if one is used. **Question text is never read.**
- **Unknown** is a classification with a reason, and it is never credited to any sub-skill:
  - `not-a-generated-question`;
  - `malformed-question-id`;
  - `unknown-family`;
  - `unmapped-family`;
  - `excluded-by-existing-reader` (stored attempts that `readRecords` does not admit).

## Per answer (`ProjectedAttempt`)

| Field | Source |
|---|---|
| `correct` | `rightAnswer`: the recorded server decision or educator mark. Never a client field. |
| `independent` / `assisted` | `independentAttempt`: first attempt per exposure, no hints, no solution shown, not guided, activity in the independent list |
| `method` | `workingEvidence(authorizeWorking(contract statement, recorded working))`, recomputed by the trusted derivation authority. One of `method-verified`, `method-false-step`, `no-method-evidence`, `no-working`, `not-applicable` (mc, or a family with no equation contract). `assessment.derivationVerified` is ignored. |
| `contradicted` | right answer **and** `method-false-step`: contradictory evidence |
| `variant` | `exposureKey` (one exposure for the typed and mc forms of one problem) |

## Per sub-skill (`SubSkillProjection`)

| Field | Content |
|---|---|
| `status` | not-attempted · insufficient-evidence · developing · independently-demonstrated · retention-due · recovery-required (doc 4) |
| `attempts` | total, independent, independentRight, assisted, assistedRight, distinctVariantsRight, contradicted |
| `method` | counts; `status` = `contradicted` (any false step), `verified` (≥ 1 independent right answer with verified working), else `not-established` |
| `rechecks` | independent `check` answers with their outcome |
| `retention` | retention@2 state, due date, `need`, `sampledByModuleCheck`, full history (failed checks kept) |
| `historical` | `everDemonstrated`, `firstDemonstratedAt`. Never erased. |
| `freshness` | last independent answer, days since, `fresh` (< RETENTION_DAYS) |
| `prerequisiteSupport` | listed only. Never changes status. |
| `evidence` | attempt ids (provenance) |

## Projection level

- `authoritative: false`, always.
- `outcome` is one of:
  - `projected`;
  - `resource-limit` (more than 20 000 attempts: nothing claimed);
  - `unreadable-events` (the existing reader throws: nothing claimed).
- `unknown`: count, by reason, and the records concerned.
- `rejected`: malformed attempt records.
- `discrepancies`: where the authoritative state claims more than the sub-skill evidence shows (doc 5).

## What the projection never does

It never:

- writes an event;
- changes `SkillEvidence` or `sharedProfile`;
- adds a competency or ledger;
- reads question text for identity;
- accepts client mastery or method claims;
- reinterprets historical records.
