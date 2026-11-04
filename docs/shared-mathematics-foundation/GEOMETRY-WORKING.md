# Trusted geometry working continuation

Continues `98f2efb`, implemented at `f6e2720`. The existing geometry authority now participates in real, opted-in learner submissions. This is a bounded angle-method integration, not general geometry proof support or curriculum completion. No push, deployment, global flag, new service or production-data migration was performed.

## Runtime and reuse

| Existing owner | Missing behavior | Extension and evidence |
| --- | --- | --- |
| Python `SyntheticReasoner`, `verify_submitted_proof` | Chosen-route comparison rejected alternatives; closure supplied unstated reasoning | Check a cited rule directly against givens and earlier accepted steps; exterior-angle forward/inverse and equality-measure propagation; adversarial oracle tests |
| Existing generator definitions | Grader lacked typed geometric givens | `geometry-task.ts` binds existing family parameters, never reads a diagram or a client-supplied problem |
| Node trusted grader and bounded Python worker pool | Synchronous server path never reached geometry authority | Node awaits the existing worker before returning one immutable decision; Django still owns the request and persistence |
| D1 `working-assessment@1` and shared evidence projection | Equation-only authority identity | Domain/task/attempt/response/version binding; current geometry methods can count only beside correct independent answer evidence |
| Existing year input, D1 feedback, `Figure` and `Lesson` | Learner could save only unsupported geometry working | Typed working, per-line checked/refuted/unchecked labels, existing diagram and existing optional lesson review; actual phone/API journey |
| Existing prerequisite planner | Needed explicit evidence of skipping previously demonstrated topics | Saved-prerequisite regression reaches the above-grade target without revisiting demonstrated earlier modules |

There is no second grader, planner, renderer or statistical model. The new TypeScript adapter translates a deliberately small grammar and normalizes the existing authority's result. Exact arithmetic uses the existing expression parser/evaluator. Arbitrary ungrounded arithmetic is refused neutrally instead of being treated as geometric reasoning.

## Supported boundary

The opted-in pathway (`mathematics-pathway@1`) records `workingPolicy: geometry-working@1` on new decisions. Its method authority is `geometry-reasoner@foundation-1`. A goal choice is not mastery. Default learners and old decisions are unchanged. Automatic infrastructure recovery retains the original decision's working policy even after opt-out.

Supported generated tasks are triangle interior sums (`ahtri`), exterior angles in both directions (`ahext`), vertically opposite/adjacent crossing angles (`afcross` modes 0/1), and complementary/supplementary pairs (`afpair`). Multiple-choice and written-task variants are not silently converted to method tasks. Isosceles, side inequalities, crossing mode 2 and other geometric domains retain honest unsupported working.

Examples of accepted notation are `x = 118 (triangle sum)` and `C = 75 (triangle sum)` followed by `D = 105 (straight line)`. The UI explains angle names from the actual task and permits `x` for the requested angle. Numerical calculation chains are checked exactly. Unsupported prose, alternate symbols, unexplained intermediates or ungrounded quantities are retained with a request to clarify. A valid method is never marked false merely because its citation or notation is unsupported.

A bare conclusion receives no method evidence, even if the answer is correct. Cited, direct one-step reasoning can be a complete method. Correct method with incorrect submitted answer contributes no independent-right method evidence; correct answer with a refuted method contributes no new readiness. Assistance from optional lesson review remains assistance.

## Safety and replay

- Only server code selects the Python root/interpreter. Client requests cannot supply facts, checker identity, working policy or a decision.
- The grader manifest pins the bundle, 210 TypeScript/content inputs and all 11 Python authority sources. Source drift leaves working unsupported; answer grading remains separate.
- Worker protocol/request identity and authority version must match. The default method deadline is 1.2 seconds. Timeout/crash/unsupported input preserves the original working without a method penalty.
- Normal completion shuts down workers. The outer Django timeout terminates the private process group on POSIX, including Python, and waits for cleanup. Windows falls back to killing Node only; complete group cleanup is presently a POSIX guarantee.
- Decision/attempt identity, original response and working, question competency and expected checker/version bind method evidence. Replay digests are reproducibility checks, **not signatures**. `replayGeometryWorking` re-executes the bound request; changed working fails replay. Historical authority versions are not silently reinterpreted.
- Legacy conclusion-entailment APIs remain available for research comparisons. They are not the trusted method boundary. Frozen benchmark files are unchanged.

## Acceptance evidence

- Python suite: 56 tests pass, including direct-rule, alternative-proof, exterior inverse, inconsistent-premise and first-invalid-step checks.
- Existing G5 oracle: 14 variants (12 case families), 13 agreements and one deliberate abstention on the bare conclusion. No false acceptance, false rejection or accepted unjustified method. See [results](geometry-adversarial.json).
- New trusted cross-boundary tests: 5 pass. Includes correct/incorrect answer-versus-method combinations, unknown notation, transplant rejection, deterministic replay, pre-execution and active timeouts, and unchanged algebra boundary behavior.
- Relevant frontend aggregate: 36 pass (initial foundation, pathway and D1 grading/teaching plus the initial three geometry checks). The final expanded geometry file passes all 5 separately.
- Django aggregate: 32 pass (geometry, pathway, decisions, release invariants and trusted grader). Final parser changes receive a further 4/4 geometry API check. Tampered client fields and source drift are covered.
- Relevant learning aggregate initially: 48 pass, 5 transport-fixture failures. Those five supplied a bare conclusion while expecting a verified method. The fixture now explicitly cites triangle sum; all concurrency, cancellation and correctness assertions are retained. The complete pool file then passes 7/7, so all 53 checks are resolved.
- Actual year UI at 390×844: typed triangle reasoning → checked-method feedback → existing concept lesson and triangle visual → fresh login → identical stored decision and reordered-event replay. The focused mode does not repeat the completed eight-topic journey or claim all domains are validated by it.
- Main typecheck and year build pass. Mathematics typecheck retains 188 inherited diagnostics and zero new diagnostics; [machine-readable final evidence](geometry-validation.json) records the comparison.

Initial failures were repaired rather than hidden: angle-pair fact names mismatched the Python relation names; the natural-line parser swallowed parenthesized reasons; the phone test treated the API decision array as a keyed map. No weakened assertion, quarantine expansion or invented approval was used. The final independent review found no remaining serious defect in authority binding, opt-in isolation or POSIX cancellation.

Historical harness changes are explicit: the structured 90-proof corpus still matches all frozen final labels; its old `first_invalid` meant first *unverified* line, so the test now compares that separately and asserts the true first-refuted index. The 30-problem audit contains unreasoned conclusions and now explicitly calls the legacy entailment API. Repeated given facts with accepted same-fact citations remain legal but confer no method credit. None of these changes certifies a bare conclusion as reasoning.

Screenshots: [verified working](geometry-screenshots/geometry-verified.png), [existing concept lesson](geometry-screenshots/geometry-lesson.png).

## Remaining limits

Geometry-specific misconception teaching, multi-step question generators, broader typed domains, richer natural notation and sub-skill method requirements remain incomplete. Existing configurations remain answer-evidence requirements; observing a verified method does not automatically make it a universal mastery requirement. The authority can abstain on valid expressions beyond the supported parser. No full curriculum or learning-outcome guarantee is claimed.

Progression uses existing prerequisite evidence, not compulsory grade-by-grade reteaching. Demonstrated earlier nodes are skipped; a lone higher-topic success does not establish every unobserved ancestor. Broader placement and missing-prerequisite probes remain limited to supported content.

## Reproduce

```sh
PYTHONPATH=research/geometry-reasoner python -m unittest discover -s research/geometry-reasoner/tests
node --import tsx --test frontend/src/journey/geometry-trusted.test.ts packages/learning/src/geometry-reasoning-g5.test.ts
bun test packages/learning/src/grading/working.test.ts packages/learning/src/subskill-evidence.test.ts packages/learning/src/geometry-worker-pool.test.ts --timeout 60000
python backend/manage.py test family.test_geometry_working family.test_foundation_pathway family.test_decisions family.test_release_invariants family.test_kernel_grader
# Isolated local Django API on 8197, CSRF origin 4197, as documented in CONNECTED.md:
PATHWAY_GEOMETRY_ONLY=1 node --import tsx frontend/e2e/foundation-pathway.test.mts
```
