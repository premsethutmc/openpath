# 4. Geometry evidence contract (as implemented, shadow)

Sub-skills are **configuration** of the domain-neutral projection `packages/learning/src/subskill-projection.ts`. Geometry adds `packages/learning/src/subskill-config-geometry.ts`; the shared engine contains no geometry identifiers (static scan in `geometry-journeys.test.ts`). The projection is SHADOW: it never changes competency state, scheduling, teaching or certification. No mastery policy is activated.

## Configurations (`geometry-subskill-projection@1`, provisional, not educator-reviewed)

| Competency | Sub-skill | Family | Core |
|---|---|---|---|
| `MATH.geometry.angle-pairs` | `angle-pairs.complementary-supplementary@1` (straight line / supplementary / complementary) | `afpair` | yes |
| | `angle-pairs.intersecting-lines@1` (vertically opposite, adjacent, around the point) | `afcross` (modes 0/1/2) | yes |
| `MATH.geometry.triangle-properties` | `triangle-properties.angle-sum@1` | `ahtri` | yes |
| | `triangle-properties.exterior-angle@1` | `ahext` | yes |
| | `triangle-properties.isosceles-angles@1` | `ahiso` | yes |
| | `triangle-properties.side-inequality@1` (side property, mapped so every family has a sub-skill) | `ahineq` | yes |

No prerequisite-support relation is configured (the graph has no edge between these two competencies; none is invented).

## Rules the projection enforces (unchanged from E1, now config-driven)

1. **Identity from the trusted generator only.** A sub-skill comes from the generator family of a question id the generator recognises (family, parameters and answer format checked). Written tasks, hand-authored ids, unknown families → `unknown`, never credited.
2. **Verdict from the server only.** Correctness comes from the server-recorded `grading-decision@1` inlined in the record; client-sent decisions are ignored.
3. **Assisted ≠ independent.** Hinted/taught answers count as "helped"; only unassisted answers reach `proficient`.
4. **Answer ≠ method.** `method` is `verified` only from a server-recorded `working-assessment@1` verified verdict. Geometry has none (all `unsupported`), so method is `not-established` everywhere.
5. **Per-sub-skill retention.** A delayed check credits the sub-skill of the question asked, not its siblings.
6. **Discrepancy, not correction.** When the authoritative competency reads "transfer"/"verified" while a core sub-skill is not proficient, a discrepancy is reported (`broadClaim`); nothing is changed.

## Gaps in the contract found by G5

- The projection does **not check which authority produced a working verdict** (the geometry verdicts come from the algebra derivation authority). Harmless today (always `unsupported`), but a domain-suitability check is needed before any geometry working verdict is recorded.
- If the geometry reasoner were connected as-is, its `invalid` verdict on valid alternative proofs (R06, R07) would be read as a false step and the projection would stop crediting a right answer (`subskill-projection.ts` contradiction handling). The reasoner must return `unsupported`, not `invalid`, for citations outside its rule set before connection.
- A bare final claim is `verified` by the reasoner (R02, entailment). It must never be method evidence.
- `unmapped` is declared but not enforced (geometry's `{}` asserts nothing).
