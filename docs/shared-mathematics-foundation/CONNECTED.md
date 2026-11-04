# Connected foundation continuation

Historical connected slice at `98f2efb`. [The subsequent geometry-working continuation](GEOMETRY-WORKING.md) connects a bounded, corrected proof authority; unsupported broader methods remain guarded.

This continues local commit `49e0e1d`; it does not replace the learning engine. The bounded connected slice is implemented and exercised in the actual year UI and Django event store. It is not completion of the mathematics curriculum or a claim that every existing explanation is adequate. Nothing is published, deployed or globally enabled.

## Learner behavior

Open `/year/?foundation=1`, choose a supported target topic, and select **Use this learning goal**. This saves an owned `foundation_pathway` event with policy `mathematics-pathway@1`. Subsequent visits reconstruct the choice from the server; the URL is not required after saving. The learner can append an opt-out and return to the existing year plan. The initial state without this record is unchanged. The target catalog is only computed when pathway controls are requested or a choice exists.

The existing planner follows the target's mandatory/plausible prerequisites in deterministic prerequisite order. Unobserved topics receive probes, genuine wrong answers remain available for diagnosis/teaching, and due/failed skills return for delayed checking/recovery. Supported topics above the initial grade can be selected on this route. Unrelated modules retain ordinary placement. A missing module, unsafe/cyclic route, exhausted opportunity or paused module stops with saved progress and an eligible non-mastery lesson-review option where available. A completed target prompts the learner to choose a further supported target; it does not invent a university pathway or infer calculus readiness from addition.

Coverage requirements are connected for the existing linear-equation, angle-pair, triangle and small-addition configurations. Other supported modules use the existing competency evidence and teaching flow; they do not gain invented fine-grained coverage. Current configured requirements are answer-evidence requirements. Geometry working is preserved but is not proof evidence.

The explicit opt-in also selects the existing trusted grading policy for **new** mathematics submissions by that learner. The global grading default is unchanged. Earlier decisions remain immutable, including earlier legacy decisions. Opt-out restores the default for later submissions. Automatic recovery of an infrastructure failure retains that attempt's original unified authority, even after opt-out; unknown/older policies are not automatically migrated. Incorrect answers are retained for remediation. Contradictory correct-answer/invalid-method records do not establish new readiness, and excluded evidence cannot reset the original exposure number.

The real year input accepts working, preserves Unicode and oversize input with an actionable error, and displays saved D1 working feedback. Unsupported methods are neutral. Geometry's unsafe Python authority remains disconnected; neither alternative-proof false rejections nor bare-conclusion entailment become authoritative learner judgments.

## Reuse map

| Existing owner | Missing connection | Minimal extension | Connected evidence |
| --- | --- | --- | --- |
| `session.learnerState`, `records.readRecords`, Django event ledger | Preview policy did not survive a real learner visit | One versioned opt-in record and derived selection adapter | Server save, reload, reordered replay and fresh login |
| `plan.nextActivity`, competency graph | Year-bound planning had no target-directed progression | Optional pathway branch; one shared bounded prerequisite route for planning and placement | Eight topics to an above-grade target; unsupported/cycle stops |
| `intervention.moduleState`, `questionForRequirement` | Coverage and higher placement were preview-only | Adapter invokes existing teaching flow and safety-owned selector; route-scoped placement | Unobserved/weak/due/recovery and quarantine regression checks |
| `evidenceFor`, generic sub-skill projection | Needed trusted readiness filtering | Filter contradictory positive evidence while retaining errors and exposure counts | Invalid-method and repeated-exposure regressions |
| Django `_decide`, immutable decisions, `regrade_unresolved` | Global shadow mode omitted authoritative working metadata | Persisted per-learner policy selects existing grader; recovery preserves original authority | Actual geometry working is saved `unsupported`; historical event unchanged |
| Year `Ask`/`Feedback`, D1 `workingFeedback`, existing `Lesson` | Safe feedback was only in slice UI | Use saved D1 feedback and existing review lesson component | Phone geometry feedback, network failure and repeated Check actions |
| Family teaching hints, `fromTemplate`, review registry | Addition explanations mismatched examples; column work lacked final composition | Generated operand-dependent alternatives, unit jumps and final place-value step; regenerate only two modules | Every supported small-addition pair and hundreds of generated column cases |

`foundation-runtime.ts` is a compatibility/configuration adapter. It does not grade, diagnose, invent teaching, fit statistics or select questions independently. The initial duplicate prerequisite traversal was consolidated. The ordinary year policy remains in the same planner for learners who have not opted in.

## Addition teaching repair

For small addition, the method starts at the **first** operand, matching the worked steps. The number line shows individual unit jumps. The alternate explanation uses the current operands: make ten when useful, retain an existing ten, or explicitly explain why a total below ten needs no full ten. The `1+2` case no longer receives a mismatched `8+5` explanation.

For three-digit addition/subtraction, the same column algorithm now composes the final hundreds, tens and ones. `193+678` ends with `800+70+1=871`; the generated class, not those numeric strings, is repaired. Its worked trace can now finish the existing independent verification check. Only the two affected generated modules were regenerated. Six changed explanation revisions were registered as **pending_review**, never educator-approved; old review history and blocklists are retained.

This supplies clearer transitions, alternate explanations, existing participation/help and a useful next action. It does not promise human learning or add animations of counter exchanges. Multi-digit addition remains distinct from the small-addition evidence configuration.

## Validation and exact limits

- Actual Django-backed 390×844 year journey: **8 modules, 20 answers, 22 events** to Grade 2 regrouping from Grade 1 placement. Includes injected save failure with retained input, repeated Check yielding one append, reload, fresh login and deterministic reordered replay.
- Same actual UI/API: explicit geometry problem with typed working, saved `grading-policy@1` / `working.status=unsupported`, neutral feedback and no method mastery.
- Focused new and initial-foundation tests: **17 pass**. Later route consolidation/cycle/exposure checks: complete pathway file **6 pass**.
- Relevant frontend aggregate: **65 pass**, covering pathway/teaching, original foundation, dashboard, adaptive loop, retention, handover and sub-skill evidence. No full slow content-pool run was repeated.
- Relevant learning aggregate: **95 pass**, covering projection/import boundaries, teaching contracts/presentation/stage two and working safety. No quarantine registry or allowlist was expanded.
- Django pathway/handover/learning/authority/quarantine aggregate: 34 cases, 32 passed, one existing environment-dependent skip, one new test-fixture error (the fixed-question helper was used with a generated question). The corrected pathway suite passed all three then-existing cases. Final pathway/decision/release-invariant aggregate, including authority-preserving recovery: **17 pass**.
- Mathematics typecheck: **188 inherited diagnostics, zero new**, matching the initial slice. Main typecheck and final year build pass. See [machine-readable evidence](connected-validation.json).
- Exact grader bundle and all 207 input hashes pass verification. No regrading command was run against production data; command tests use isolated test databases.

The phone journey was run before the final equivalent route-walk consolidation and cycle guard; the complete pathway tests cover those final changes. The final UI-only optimization avoids enumerating target modules for default learners. It receives build/type verification; the full phone journey is not repeated for that optimization.

Independent review found and prompted fixes to route scope, preservation of wrong answers and exposure numbers, actual saved-working feedback, generated lesson revision eligibility, malformed target validation and recovery authority. Final review found no remaining serious security defect. The remaining capability gaps are a sound live geometry method adapter (including worker cancellation), broader fine-grained skill configurations, targeted geometry teaching and authored advanced/application pathways.

Screenshots: [completed pathway](connected-screenshots/completed.png), [neutral geometry working](connected-screenshots/geometry-working.png).

## Reproduction

Use the existing tooling and ordinary dependencies. Core commands:

```sh
node --import tsx --test frontend/src/journey/foundation-pathway.test.ts frontend/src/journey/foundation-teaching.test.ts
node --import tsx packages/learning/scripts/foundation-lessons.ts
node --import tsx packages/learning/scripts/explanation-review.ts sync --competency MATH.number.addition,MATH.number.multi-digit-add-subtract
ESBUILD=/path/to/esbuild node tools/mathematics/server-grader/build.mjs
node frontend/scripts/build-year.mjs
python backend/manage.py test family.test_foundation_pathway family.test_decisions family.test_release_invariants
# Run a local Django API with an isolated synthetic database on port 8197 and
# CSRF_TRUSTED_ORIGINS=['http://127.0.0.1:4197']; the test serves/proxies the actual year build.
node --import tsx frontend/e2e/foundation-pathway.test.mts
```
