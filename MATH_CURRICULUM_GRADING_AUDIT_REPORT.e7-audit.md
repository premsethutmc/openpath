# Curriculum-Wide Grading Reliability Audit

Branch `feat/math-generalization-core-e7`, baseline `46ce4b9`. Nothing merged or deployed. No new solver, parser or engine was written.
Data: `tools/mathematics/grading-audit/data/grading-audit-families.json` (all 1,080 families, every field in section 13 of the brief), `regression-corpus.json`, `server-parity-corpus.json`. Runner, oracle and tools: `tools/mathematics/grading-audit/`.

## 1. Result in one paragraph

Across 1,080 families (341,483 released questions), 31,400 generated questions and 468,969 submissions, the application's assessment entry point made **0 false acceptances, 0 false rejections and 0 incorrect unresolved decisions** against an independent oracle, and the server-side routes agreed with the client on all 468,969 submissions after two shared fixes. This is a sample result, not proof (section 9). The measurement also exposed two real defects, both fixed, and several policy and evidence limits that matter more than the zero-error headline: 87.6 % of released questions (301,853, 987 families) are graded by comparison with the generator's stored answer, which this audit could not verify independently.

## 2. How grading actually works (traced, section 1 of the brief)

| Stage | Route |
|---|---|
| Generation | `Problem{params, prompt, answer, type, options?, figure?}`; the released pool is the typed form of each question, `:mc` (choice) and `:w` (word) are presentations of the same parameters; the stored answer is also in `content/learning/generated.v1.json` (855,926 entries incl. presentations) |
| Contract | optional generator-owned `contract` (94 families, previous task); otherwise none |
| Client | `decide()` in `grade.ts`: kernel verdict when the contract is `verified`, else stored-answer comparison labelled `legacy`; unreadable = undecided, never wrong |
| Server | `learning._authoritative`: trusted Node grader (`grader.mjs`) for verified questions, otherwise Python stored-answer comparison (`_answer_ok` + `right`), labelled `legacy`; client flags ignored |
| Mastery | `records.ts`: an "unresolved" claim counts only if the deterministic decision itself is undecided; at most `UNRESOLVED_CAP = 2` per problem sit outside the attempts |
| Written | 376 written tasks, educator-marked, never automatic |

Kernel vs legacy by family: 81 families fully kernel-verified in the sample, 12 mixed, **987 legacy**. By submissions: 41,961 kernel, 427,008 legacy. Authored (non-generated) question banks are outside the 1,080-family inventory and were not audited here.

## 3. Method and oracle independence

- `oracle.ts` imports nothing from the graders. The expected outcome of each submission comes from the stored answer (generator-derived) plus explicit type-level rules: reformatting rules (spacing, minus sign, `.0`, terminating decimal, set order, `+ C`, reverse term order of a sum, `a√m = √(a²m)`, `≤` as `<=`); wrong answers that change one value to a different one; hedges; malformed input; division by zero; optional working.
- Sampling is deterministic, no seeds: 20 questions per family at indices `floor(i × released / 20)`, plus the `:mc` and `:w` forms of the first 6. Every failure record carries the question id (parameters) and response.
- Every question gets: correct, justified equivalents, wrong, unreadable, domain (`1/0`), ambiguous (hedge), and working-ignored (correct answer with false working; wrong answer with locally valid working). Tests that do not apply are recorded per family (`notApplicable`), not counted.
- The runner is resumable (one JSON per family, progress log), bounded per family (60 s; none timed out), whole curriculum in about 8 minutes.
- Tests that turned out to be wrong in my own oracle (a repeated element of a set is the same set; "abc" is a readable product in algebra types; double "+ C"; a decimal broken by a root rewrite) were corrected before counting; none is reported as a grader defect.
- Independent cross-checks that need no grader: stored-answer parity between TS and the server table for all 341,483 questions (0 mismatches); the server's own route reads and credits the stored answer of all 855,926 entries (0 failures); MC key = typed answer for all 284,170 choice forms and word-form answer = typed answer for all 230,273 word forms (0 mismatches).

## 4. Findings

### Defects found and fixed (shared, not per family)

| ID | Cause | Effect | Scope | Fix |
|---|---|---|---|---|
| G1 | The contract's number guard compares the statement with the prompt; a word form (`:w`) rewords the prompt, so a derived number (the 20 of `1000 + 100 + 20 + 4`) is legitimately not printed and the question came out **held**. A held question leaves every answer, even a correct one, undecided. | correct answer never credited on word forms | 951 word-form questions, 3 families: adexp 360, aiintx 194, auaps 397 (my contracts; adexp was a baseline contract) | in `contractOfProblem`: a word form whose only problem is the number guard keeps the legacy comparison of its stored answer (identical to the typed form's, audited) instead of being held. The verifier is not loosened for any typed or choice question. |
| G2 | Server accepted at most 9 whole digits and 6 decimals; the client accepts any length | the server left valid decimals undecided where the client credited them, e.g. `0.36328125` for 93/256 | 9 submissions, 8 families (asbinom, ajneg, atcosr, atpdfp, avdraw, aobinapp…) in the sample; any dyadic fraction beyond 2⁶ is affected | server `NUMBER`/`RATIONAL`/`MIXED` widened to 30 digits, bounded, same canonical compare |

Both are in the permanent regression corpus (`regression-corpus.json`: 66 replays; `server-parity-corpus.json`: 9), replayed by `grading-audit.test.ts` and `family.test_server_parity`. The G1 corpus was shown to fail when the fix is disabled.

### Before and after

| | Before fixes | After |
|---|---|---|
| Unresolved/never-credited correct answers (sample) | 40 in 2 families (G1) | 0 |
| Client/server disagreements, 468,969 submissions | 9 (G2) | 0 |
| Held questions in contract families, all presentations | 951 word forms | 0 of 103,037 |
| False acceptances / rejections | 0 / 0 | 0 / 0 |

### Policy and evidence limits (not defects, but they decide real outcomes)

1. **Equal-valued but unsimplified answers are left unresolved.** `356/2` for the integer 178 or `2×` a fraction is mathematically equal; the system neither credits nor rejects it (30,317 submissions in 387 families, 119,686 released questions: 376 integer and 11 fraction families). Because only 2 undecided submissions per problem are exempt from counting, a third such submission becomes an ordinary attempt. Whether "simplest form" should be demanded is a curriculum decision; it is reported separately and never counted as an error.
2. **Stored answers of legacy families are unverified.** 987 families (301,853 questions) pass because the response equals the generator's own answer. Correctness of those answers rests on generator tests, not on this audit. Only 38,028 questions have a kernel-verified stored answer.
3. **Equivalence evidence is thin where no reformatting rule is justified:** 281 families (80,522 questions) were tested with surface forms only (spacing, sign glyph) — all 169 choice families, 55 `exact`, 19 `expression`, 15 `interval`, 7 `mixed`, 4 `roots`, 3 `ratio`, 7 `fraction`, 2 `tuple`. For them a false-rejection risk on equal but differently written answers is **not** measured.
4. **Duplicate-valued choice options:** 931 choice questions in 5 families (agimp, agpfrac, ajrstd, avlow, avfas) offer an option equal in value to the key (`2/4` beside `1/2`); each prompt demands lowest terms, so they are intentional distractors, not ambiguity.
5. Typed kernels give no step diagnosis, so "method feedback where supported" was exercised only for the algebra statement route covered by existing tests; working never changed credit anywhere (31,400 correct-with-wrong-working credited; 28,912 wrong-with-valid-working denied).
6. A wrong but readable answer was left unresolved only for 46 non-numeric constructions (set-wrong forms in algebra types); informational, safe.

## 5. Classification (per family; counts of families / released questions)

| Classification | Families | Released |
|---|---|---|
| Reliable in tested scope | 1,080 | 341,483 |
| False acceptance / False rejection / Unresolved defect / Server disagreement | 0 | 0 |
| Contract defect | 0 after G1 (3 families before) | – |
| Insufficient evidence | 0 under the rule "≥10 questions tested and a wrong-answer test constructed" | – |
| Not applicable | 0 families (written tasks are outside the generated inventory) | – |

**"Reliable in tested scope" must be read with section 4's limits:** it means no error was found by these tests, not that the stored answers are right, and for the 281 families above the equivalence side is weakly tested. The per-family `equivalenceEvidence` and `gradingRoute` fields let a reader separate the strongly evidenced families (799 families with substantive equivalents, 93 with a kernel) from the rest.

By answer type (families / released): integer 411 / 133,107; choice 169 / 46,878; fraction 151 / 48,168; exact 128 / 40,371; tuple 110 / 39,382; set 27 / 7,603; expression 31 / 7,494; interval 16 / 6,267; matrix 12 / 3,868; antiderivative 10 / 3,720; mixed 7 / 2,079; roots 5 / 1,396; ratio 3 / 1,150.

## 6. Metrics

| Metric | Value |
|---|---|
| Families audited / released accounted for | 1,080 / 341,483 |
| Questions generated for testing | 31,400 (21,590 typed, 5,256 choice, 4,554 word) |
| Submissions tested | 468,969 |
| False acceptances / false rejections / incorrect unresolved | 0 / 0 / 0 |
| Equivalent-answer acceptance (justified equivalents) | 65,423 / 65,423 = 100 % |
| Policy equivalents (unsimplified) | 20,754 credited, 9,563 unresolved, 0 rejected |
| Unreadable and malformed (143,748) | all unresolved |
| Domain-invalid `1/0` (19,921) | all unresolved |
| Ambiguous hedges (46,815) | none credited (613 rejected, 46,202 unresolved) |
| Server/client disagreements | 0 of 468,969 (after G2); 9 before |
| Server false acceptances | 0 |
| Kernel vs legacy submissions | 41,961 kernel, 427,008 legacy; every verdict class identical in both |
| Assessment latency (in process, 468,969 calls) | median 0.027 ms, p95 0.58 ms, p99 1.9 ms, max 77.7 ms (`aoarr`; slowest families `arxyconic` 54 ms, `arcirceq` 46 ms) |

Zero errors in a sample is not proof of universal correctness: 31,400 of 341,483 questions (9.2 %) were generated, the test transformations are the ones a rule justifies, and unlisted answer forms are untested.

## 7. Server authority (section 9 of the brief)

Verified by tests and by the 468,969-submission comparison (real Node grader and the real Python `_answer_ok`/`right`; Django imports stubbed only so the module loads):
- Contract rebuilt from the question id by the grader's own generator; the request carries only id, response and working. Extra forged fields (`credit`, `expected`, `contract`, `verification`) are ignored (test).
- Malformed or missing ids (null, number, empty, path-like, injection-like, 5,000 characters, overflowing parameters, lowercase prefix, trailing newline) never produce a verdict; a batch over 500 is refused whole.
- Correct / incorrect / undecided are distinct; the grader's expected answer must equal the server's stored answer or the kernel verdict is discarded.
- Failure of Node (`/bin/false`, garbage stdout, timeout, missing, tampered or switched-off bundle) returns nothing and the stored-answer comparison decides; it cannot award credit the stored answer would not.
- Mathematical decisions match the application verifier on all 41,961 kernel submissions and 427,008 legacy submissions.
- **Per-request Node cost:** 470 ms median (427–553 ms over 8 runs; a 400-request batch costs 585 ms in total). Acceptable for a single answer submission by a learner; not acceptable under concurrent load or for bulk re-grading. A persistent worker is a later optimisation and was not built.
- **Django: not executable here** (Django not installed, package index unreachable; not retried). The HTTP view, serializers, database and mastery persistence were therefore **not exercised end to end**; `KernelAuthorityTests` is written and unrun. The server pathway is reported as unverified at the Django level, and client tests are not presented as end-to-end proof.

## 8. Regression results

| Suite | Result |
|---|---|
| `bun test packages/learning` | **1,296 pass, 0 fail** (80 files; includes the new audit sample and corpus tests) |
| E7 integrity gate | 678 cases, exact 236, **0 false acceptances**, 212 false rejections (unchanged; the known E7 false rejections have not disappeared), verified 86; 6 reference-not-verified rows and 1 battery mismatch (`alg-side`) unchanged |
| Python server-wrapper tests | `family.test_kernel_grader` 11 and `family.test_server_parity` 2 |
| Frontend suites (from `frontend/`) | dashboard 12, mapping 6, canonical 12, mathematics 26, study-time 8, grade7-board 1, engine 20, topic-session 3: all pass, 0 fail. `generalisation.test.ts` and `mathematics-completion.test.ts` (content-system scale) were not run to completion and are not claimed |
| Browser bundle | builds; 0 `node:*` imports |
| Django tests | not executed (blocker above) |
| Content-system suite | not rerun (known 30-minute-plus) |

## 9. What the evidence does not show

- Independence of the oracle ends at the stored answer: for legacy families an incorrect stored answer would be graded as correct by both client and server and by this audit.
- Student interface representability (can a learner type `√`, `∪`, matrices?) was not tested; only the readers were.
- Mastery and replay were checked through existing client-side tests (`grading-pathways.test.ts`: unreadable input is undecided and never moves mastery; forged claims do not change the grade; a decidable wrong answer flagged unresolved is an attempt); the server-side replay (`credited`) is covered only by the unrun Django tests.
- Authored question banks and educator marking were not audited.

## 10. Remaining unsupported mathematical capabilities (decision left for later)

Unchanged from the typed-kernel report: no final-answer route for calculus (80 families, 21,776 questions) or geometry/measure (136 families, 35,788), none for composite linear-algebra, setup-dependent probability, series and recurrence, inverse-trig composites. The audit found no grading failure in those families' legacy comparison, so no capability is justified by *failures*; the justification would be independent verification of their stored answers.

## 11. Prioritised recommendations from observed failures

1. Run the Django suites in an environment with Django before labelling anything server-authoritative end to end (blocks the claim, not found defects).
2. Decide the unsimplified-answer policy for integer and fraction answers (387 families, 119,686 questions): accept as equal, reject as not-simplest, or ask once; today it is "undecided", which becomes an attempt after two tries.
3. Add independent verification of stored answers for the largest legacy groups (integer word-or-model families, 133k released), since that is where an unnoticed generator error would be graded as correct.
4. Add justified equivalence rules for the 281 thinly evidenced families only where a mathematical rule exists (e.g. expression identity sampling is already in the reader; extend tests, not the reader).
5. Keep the 75 regression replays (66 client, 9 server) in CI; consider a persistent Node worker only if submit-time p95 under load matters.
