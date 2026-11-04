# 8. Mastery and retention findings

Required demonstrations (all from engine output; only learner responses are scripted):

| Claim | Result | Where |
|---|---|---|
| Straight line ≠ exterior angle | holds: angle-pairs evidence (G-06) creates no triangle-properties sub-skill evidence. **Caveat (review):** G-06 never attempts a triangle question, so this shows cross-competency isolation, not a contrast within one learner's attempts | `geometry-journeys.test.ts`, G-06 |
| Numeric answer ≠ proof competence | holds: every geometry answer leaves `method: not-established`; working is `unsupported` (G-07) | G-07 |
| Assisted ≠ mastery | holds: hint-only learner stays "helped", no mastery, pause (G-04) | G-04 |
| Invalid reasoning ≠ verified method | holds in the projection (no verified working verdict exists); in the reasoner, invalid steps are never accepted (06), but R10 is only `unsupported` | G-07, 06 |
| Unknown families create no evidence | holds | test "unknown families and client decisions are ignored" |
| Retention per sub-skill | holds in the shadow projection: G-05's failed delayed check lands on the sub-skill asked; recovery answers from other sub-skills do not clear it (angle-sum shows recovery-required while the competency recovered) | G-05 |

## Leakage found (not fixed: authoritative engine, out of scope)

- **Within a competency:** the authoritative competency reaches "transfer" while a core sub-skill is weak. G-03: exterior-angle misconception persists (`developing`), competency reads transfer; G-01/G-02/G-05/G-07/G-08 reach transfer with a single side-inequality answer. The shadow projection reports each as a discrepancy. Same architecture as linear equations.
- **Angle pairs (G-06):** the vertically-opposite/linear-pair misconception is diagnosed on the module's only open crossing-lines item; every follow-up item is complementary/supplementary, so it is never re-tested or taught, and the competency reaches transfer while `intersecting-lines` is `developing` (discrepancy reported).
- **Diagnostics sample one family:** the triangle-properties module's diagnostics are `ahtri` only, so an exterior-angle misconception is never diagnosed or taught (G-03 is the failed journey that needs remediation).
- **Retention coverage:** isosceles and side-inequality are never sampled by the module's delayed check, so their sub-skill retention can stay due indefinitely (inherited from the E1 design).
- **Verified unreachable:** the shared mastery engine reports `unavailable` for this draft content (H-V3), so no journey reaches "verified". Correct behaviour; not a geometry defect.
