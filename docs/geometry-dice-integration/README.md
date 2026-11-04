# Geometry and two-dice integration (PR #107 + PR #108)

| | |
|---|---|
| Branch | `integration/geometry-dice-candidate` |
| Base | PR #106 head `integration/fractions-learner-handoff` at `eb297e95110dcec5e101379664253dc1e99f67b7`. Its CI was all green when this branch was started. |
| Merged | `feat/geometry-two-skills` at `a626b914` (PR #107) and `feat/two-dice-probability` at `3fea9327` (PR #108). Both merged cleanly. |
| Other active work | Only #106 itself (`walkthrough/*` branches are phone walkthroughs). Nothing else touched `library.ts`, `intervention.ts`, `hypotheses.ts` or `reasoning.ts`. |
| Content status | Every explanation is **pending educator review**. It is shown only in demonstration mode, labelled as not approved, and is refused in supervised evaluation. |

## What students can use (Year app, ordinary skill view, demonstration mode)

| Topic | Lessons (pending review) | Real app path, browser and Django (`e2e/integrated-skills.test.mts`) |
|---|---|---|
| Two dice: exact totals (`MATH.probability.sample-space` · `sample-space.dice-exact-total@1`) | `akdice_fix_totals` (7 has six pairs, 2 has one), `akdice_fix_order` ((1, 6) ≠ (6, 1)), `akdice_pairs` (general method) | One wrong → investigation on the same skill → the fix → guided → fresh recheck → reload. Later, a delayed check of the same skill, answered wrong → `akdice_pairs` → fresh recheck → reload. |
| Exterior angle (`MATH.geometry.triangle-properties` · `triangle-properties.exterior-angle@1`) | `exterior_angle`, `exterior_via_third` | The same path. The failed delayed check → `exterior_via_third` (a way in not used before). |
| Vertically opposite (`MATH.geometry.angle-pairs` · `angle-pairs.opposite@2`) | `vertically_opposite`, `crossed_pencils` | The same path. The failed delayed check → `crossed_pencils`. |

Each case's saved events and decisions are identical after reload; the browser results are in `browser-results.json`.

**Not usable in the learning-goal pathway.** When a pupil makes one of these skills their *learning-goal pathway* target, the explanation and its fresh recheck work. After that, the pathway readiness gate ("open for preparation: first probe its prerequisites") holds the topic, so the delayed check is not reached inside the pathway. That gate is existing pathway policy and is not changed here; the pathway's own scoped recovery (`foundation-runtime`) is left as it was.

## Shared-engine changes (one resolution of #107 and #108)

1. **Builder** (`library.ts`): #107's change is kept. It is a superset of #108's proposed patch.
   - A template extension may scope a strategy to any family the module already draws from, of the same competency.
   - Guided and check items come from that family's partitions.
   - Every existing module is byte-for-byte unchanged. The library regeneration changed only `MATH.probability.sample-space` and #107's two geometry modules.
2. **Skill mapping** (`skill-connections.ts` `SAMPLE_SPACE_CONFIG`): the three `akdice` events are separate skills (exact total, k or more, second bigger), so a 'k or more' answer is never evidence for exact totals.
3. **Problem identity** (`problem-identity@1`, a new file):
   - A dice question with the mirror total m + n + 2 − k, or in another format, is the same problem.
   - Rechecks, resolution probes and delayed checks never repeat or relabel a met problem.
   - Met problems include answered questions and every example shown in delivered teaching.
4. **Recheck** (`recheck@2`, `blockCheck`):
   - A skill-scoped explanation is rechecked only inside its scope.
   - It prefers a question where the suspected error would still show. That is the fix's target, or for general teaching, an error the latest wrong answer matched. This is a suspicion; nothing is claimed.
   - If none is left, the module pauses ("carry on with other skills"). Another skill's question is never substituted.
5. **Investigation** (`investigation-scope@1`, `reasoning.ts` / `hypotheses.ts`): follow-up questions are taken from the original question's own skill first. A finding is then about the skill that its teaching and recheck are scoped to. This only orders questions; it never changes what answers establish.
6. **Transfer hold** (`transfer-hold@1`): no transfer question while an open misunderstanding is due teaching or a probe, or while a mapped skill's latest answer alone is wrong and not yet rechecked right.
7. **Delayed check** (`retention-scope@1`):
   - A skill taught with a scoped explanation gets a fresh delayed question of that skill first.
   - If none exists, the gap is reported in `why`, and the module's own delayed questions continue.
8. **Recovery** (`relapse@1`):
   - A wrong delayed answer on a skill, with nothing right on it since, gets that skill's **general** explanation once. A new one is preferred. A single wrong answer is never presented as a misconception.
   - Then a fresh recheck of the skill.
   - If the skill is still wrong, or no question is left, the module pauses and the learner carries on elsewhere.
   - A learning-goal pathway keeps its own recovery.

## Regenerated shared files (once)

| File | Change |
|---|---|
| `blueprints.v1.json` | #107's two geometry extensions, plus the dice extension (`content/learning/src/two-dice-candidate.mts`) |
| `library.v1.json` | `packages/learning/scripts/library.ts` |
| `explanation-review.v1.json` | `scripts/explanation-review.ts sync`: 3 new `pending_review` records for dice; #107's geometry records kept |
| `review.v1.json` | `scripts/review.ts sync`: the module goes back to draft |
| `backend/family/grader/grader.{mjs,manifest.json}` | `tools/mathematics/server-grader/build.mjs` |

## Tests

These are listed in `validation.md`.

## Remaining blockers

1. **Educator review.** No explanation here is approved; supervised evaluation refuses them all.
2. **Learning-goal pathway.** The delayed check is not reached inside a pathway target, because of the readiness gate (see above).
3. **The competency's authoritative status** still pools all skills (the M1 sub-skill gate is shadow only). The transfer hold stops transfer *questions* while a skill is weak, and the geometry "never learns" journeys no longer reach transfer. A different competency could still be claimed from other skills' answers.
4. **`added-sides`** (dice) has no dice-specific fix. It gets the general `akdice_pairs` method only. The other modelled akdice events ("k or more", "second bigger") have no scoped teaching.
5. **`andice`** (`MATH.probability.classical`, two dice, "sums equally likely") still reaches `unavailable` after the error is established. It is the same kind of gap, not addressed here.
