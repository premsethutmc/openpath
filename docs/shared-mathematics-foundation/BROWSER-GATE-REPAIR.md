# Browser gate repair

At published head `57438b46678882fd3df8ec481a9918a0da486f7c`, five workflows passed. Year run 41324843603 passed the complete generated-content gate and all builds, then failed its first browser file (6 pass, 8 fail). Later browser files were skipped. The job log was successfully retrieved through the authorized connector; this diagnosis no longer depends on unavailable older logs.

## Runtime corrections

- A saved diagnostic answer can end a module's recovery phase. Recovery previously owned its feedback locally, so its unmount discarded the correctly graded answer feedback. Embedded recovery now forwards feedback to the owning module; standalone recovery retains local ownership. This changes neither stored attempts nor grading. The original browser helper's requirement for visible feedback is preserved.
- Diagnosis can legitimately become uncertain after one unmatched observation. The UI required two observations and also omitted its finding on terminal recovery. It now displays the actual engine finding after one observation and at terminal recovery; it does not manufacture a diagnosis or additional evidence.

Both UI patterns are already present in the pinned integration base `cd40422b1d5f2c7c464b0eb10a0c73c340a3f7ec` (source comparison). The failing journeys were reproduced on this branch; no additional full baseline browser run was performed.

A persistent-wrong counterfactual then exposed a second ownership problem: recovery selects teaching of its own skill using a non-recursive module context, but the embedded UI recomputed the module with prerequisite investigation enabled. This could render Module → Recovery → Module indefinitely. An explicit `withinRecovery` argument now follows the existing selector adapter and disables only that re-entry. Default historical selection is unchanged. The reduced regression preserves events and deterministic replay. Geometry misconception gates are tested with both values of the context flag; the pre-existing explicit-established-diagnosis branch is unchanged, so this is not a claim that every possible recovery branch has been validated.

## Browser fixture corrections and preserved assertions

- A/J: fresh diagnostic variants now receive the same scripted additive-scaling misconception as the original fraction questions. Previously the script answered every follow-up correctly, disconfirming its intended difficulty. Wrong responses apply only to diagnostic prompts. Actual teaching, guided/check practice, assistance, persistence and delayed verification remain required.
- Released-content journeys: the same diagnostic-only response correction applies to their generic learner script. The old two-error cutoff supplied correct answers to every fresh follow-up; the recorded Grade 4 run consequently needed no lesson. Repeated diagnostic difficulty and actual teaching are both still required. The intended competency is explicit; prerequisite knowledge is not scripted as weak. The difficulty persists through the original retry until an actual lesson is completed; a correct retry without teaching is a legitimate self-correction, not a teaching failure. Only readable incorrect responses are used in this teaching fixture. A separate real-browser `3/0` case verifies clarification, preserved input/question, immutable unresolved credit, and successful correction; undefined arithmetic is not relabelled as an ordinary wrong answer.
- C/D: advisory graph relations are not confirmed prerequisites. The test checks prior verification in the skill status and persisted successful delayed checks, separately from the absence of advisory relationships in the confirmed dependency display. A separate educator-marked task does not erase that answer-level evidence.
- I: heuristic method names are not trusted method certification. Both correct answers must receive credit, raw alternative working must persist, and unsupported working must remain neutral without fabricated method certification.
- Targeted retention: several prerequisites can become due together. The selected-topic journey now opens that topic instead of accepting the dashboard’s first due recommendation; it requires two distinct correct retained answers for that competency before checking its verified status. No other skill’s retention can satisfy this assertion.
- Coverage: wording describes mapped skills with content, not completed teaching. Missing-content assertions remain.
- Curriculum diagnostics: educator-dashboard assertions now explicitly use an authorized synthetic educator and the diagnostics route. The ordinary parent remains unprivileged; requesting diagnostics by URL must not enable educator controls. No application permissions change.

A focused rerun can reuse already-released items after one current-registry read. This is the same released-state condition previously checked separately for every item/decision; fresh items still take the complete review workflow, and no approval is fabricated.

## Completed local validation

- Mathematics integration typecheck: zero diagnostics.
- Focused recovery, pathway and geometry-remediation checks: 16/16. This includes the reduced persistent-error regression, default-selection compatibility, immutable replay, and geometry requirements in both context modes.
- Trusted-grader Django checks: 11/11.
- Final test-build browser checks after the re-entry correction: the released Grade 10/12/unfamiliar-book case passes (273.55s), and the four affected feedback/uncertainty/method/clarification cases pass (125.28s). Other Year cases were validated in the earlier full run and focused fixture reruns; there was no additional full local Year rerun after the last source change. Exact-head CI must run the complete file.
- Curriculum: all six cases have passing evidence from the corrected file plus focused reruns. The one local SQLite-lock failure occurred when management-command setup shared a database with another suite; the affected case passes with isolated database use. The unprivileged diagnostics-route regression also passes.
- Normal Year and curriculum builds pass. Normal-build browser files all pass: keyboard dashboard 4, Grade 7 entry 2, session planning 4, practice 4, completion 4 (18 total), at 360px/393px where applicable.
- Shared writing/input component browser checks: 4/4.
- `git diff --check` passes. Frozen corpora, generated question/specification/coverage artifacts, release approvals and production flags are unchanged by this repair.

The trusted grader bundle is rebuilt because its dependency graph includes the session selector. It is **not byte-identical** to `57438b4`: exact textual comparison proves its only changes are the three expected optional recovery-context edits (two function signatures/calls and the conditional evidence callback). No other compiled code changed. New SHA-256: `1e9848f145a556defe735c28e9208c181f1b16b51e3187615b5971c195edba4e`. The manifest changes only that bundle hash and the two changed source hashes. Existing saved decisions are not rewritten.

Independent review found no new blocker in the runtime change, fixture semantics, or completed-release reuse. This is engineering validation of the bounded foundation, not evidence that all mathematics content or learner outcomes are complete. Remote exact-head status is maintained on draft PR96.

## Verification cost

The generated-content stage already passed remotely and was not rerun locally for these UI/selector changes. Validation used focused reruns and separate databases/build directories. Review-setup overhead remains visible: the API release helper formerly fetched the full registry for every decision even when everything was already released; the new preflight reuses that completed state. Clean runs still perform the full review sequence. The larger overlapping CI workflows and their safety gates are unchanged.
