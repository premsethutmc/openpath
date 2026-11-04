# E7 review corrections and integration report

This is a review branch. Nothing is merged into `feat/unified-grading` or deployed.

| Branch | Head | Content |
|---|---|---|
| `fix/math-e7-safety-invariants` | `37238e5` | Corrections on top of the accepted milestone `dc1a674` |
| `integration/e7-into-unified-grading` | this commit | `feat/unified-grading@bb20657`, then E7 core `837c79c` merged, then the safety branch merged, then the shadow mapping |

## Corrections

### 1. Log conventions are local to each assessment

**Change**
- Removed the shared convention state: `withNotationConventions*`, `currentNotationConventions` and the parser's `activeConventions`.
- A convention now rewrites only that assessment's own copy of its texts. Bare `log` becomes an explicit spelling of the same length: `ln ` for natural, or `lg ` for base 10 (ISO 80000-2).
- Every column and line number is therefore unchanged, and the student's own spelling is restored in the reported source text.
- With no convention, the engine assesses under both readings and keeps the verdict only if the two agree.

**Tests**
- 36 concurrent assessments, interleaved (natural / base 10 / none) and mixed with answer-only policy assessments, each equal their sequential results.
- The parser keeps no convention between calls.

### 2. Inline `A ⇔ B` keeps the student's spans

**Change**
- The engine no longer splits an inline equivalence into extra rows.
- The parser reads each part as its own statement on the same source line, with columns into the original line.
- Gate evidence is bound to the source line number. This also corrects a latent mismatch when the working contains blank lines.
- The claim ledger accepts a record that spans one whole part of the line.

**Tests**
- Both parts report line 1 with exact columns.
- An invalid `⇔` step is located at its own line and column.
- Answer-first transitions carry the parts' own text.

### 3. Mapping into the unified grading decision (`grading-decision@1`)

**Change:** new `packages/learning/src/grading/process-shadow.ts`, which exists on the integration branch only because the decision contract lives there. It is shadow only: it reads the decision and never changes it.

| Process policy result | Implied verdict | Implied `method` |
|---|---|---|
| Invalid, or wrong answer | incorrect | examined, not verified |
| Incomplete (missing solutions) | incorrect (the contract has no partial verdict; partial credit stays in the shadow record) | examined, not verified |
| Correct and complete, process deduction | correct (only process credit drops) | examined, not verified |
| Correct and complete, no deduction | correct | examined, verified (`method-required` / `proof-required`) |
| Engine undecided | unresolved (never costs credit) | not examined |
| `answer-only` mode | — | not examined |

**Tests**
- Mapping table checked over every mode and credit combination.
- The decision is deep-frozen during shadow comparison, so it cannot be modified.
- Real kernel questions show no conflicts.
- In method-required mode, working changes only the method fields.

**Shadow comparison** (`integration/shadow-compare.json`): 179 verified algebra kernel questions, 611 submissions.

| Mode | Authoritative → implied | Count |
|---|---|---|
| answer-only | correct → correct | 179 |
| answer-only | incorrect → incorrect | 167 |
| answer-only | unresolved → unresolved | 205 |
| method-required | correct → correct | 30 |
| proof-required | correct → correct | 30 |

**0 conflicts**, at about 1.0 ms per submission.

## Integration (semantic conflict resolution, nothing overwritten)

**Merging E7 core `837c79c` into unified `bb20657`:**
- **`backend/family/learning.py`**
  - Unified's version is kept: its number grammar moved to `legacy_grading.py`.
  - E7 core's G2 fix (the server reads up to 30 digits, like the client) is applied in `legacy_grading.py`, where those constants now live. `test_server_parity` passes.
  - This is the one change to legacy grading behaviour: answers of 10–30 digits that the client already accepted.
- **`MATH_CURRICULUM_GRADING_AUDIT_REPORT.md`**: unified's Phase A report stays at the path its code references. E7 core's report is kept as `MATH_CURRICULUM_GRADING_RELIABILITY_AUDIT_E7_CORE.md`.
- **`assessment.ts`**
  - Unified's quarantine (D09) supersedes E7 core's G1 legacy fallback for word forms, so the G1 hunk is not applied.
  - E7 core's audit tests now expect quarantined questions to be `unresolved`, which never costs credit.
  - The quarantine registry is unchanged.
- **Grader bundle and manifest**: rebuilt from the merged sources.

**Merging the safety branch:** only the generated bundle conflicted, and it was rebuilt. `assessment.ts` and `learning.py` are byte-identical to unified.

**Not touched:** teaching Stage 1, the student-first frontend, learner vectors, certification and quarantine. The diff against `feat/unified-grading` has no file under `frontend/`, `question-status*`, `grading/{decision,parse,mode,certify,contract,read,verify,view,program}.ts` or the certification tools.

## Test report (integration branch)

| Check | Result |
|---|---|
| `bun test packages/learning/src` | **1448 pass / 0 fail** (unified alone: 1391 / 0) |
| Type check, engine and grading modules (`frontend/tsconfig` options) | 102 errors before and after; **0 new** |
| Python, no Django needed: `test_server_parity`, `test_kernel_grader`, `evaluation.test_llm`, `evaluation.test_benchmark_run` | **24 tests, OK** |
| Python Django tests (21 modules) | **Not run.** Django is not installed and PyPI is unreachable here (`ModuleNotFoundError: django`). |
| Frontend type check / build | **Not run.** npm install failed in this environment. |
| Server grader, unified bundle vs integrated bundle, 16,000 requests | **0 field differences, 0 credit differences** |
| Generated-question contracts, unified vs integrated (341,483 questions) | **0 changed** (verification and credit of the stored answer) |
| Frozen benchmark (2,382 cases, labels untouched) | Correct 866 → **924**; mathematical false acceptances 2 → **0**; policy false acceptances 25; false rejections 85 → **23**; misgrades 68 → 62; safe abstentions 1329 → 1341; **0 regressions**. Same as the fix branch (0 changed cases). |
| Fresh holdout (71 cases, frozen `d113436`) | 56 agree, 15 abstain, 0 false accepts, 0 false rejects. Median 3.5 ms. This run is not blind: the single blind run was 55 agree / 1 misgrade, and N-021 was fixed afterwards. |
| Earlier holdout (78 cases, already inspected, not blind) | 55 agree, 21 abstain, 2 label-superseded "false accepts" (H-003/H-005 expected `sec`/`cbrt` to be refused). |

## Old vs new grading behaviour

| Area | Old | New |
|---|---|---|
| Authoritative decision (`grading-policy@1`) | — | **Unchanged**: 0 differences on 16,000 server requests and 341,483 contracts |
| Wrong citation, typed derivative steps | 60 of 60 graded **invalid** | 60 of 60 **verified** + `cited-rule-contradicted` finding |
| Wrong citation, other step kinds | Right label 30/30 verified; unknown label 30/30 verified; wrong result 30/30 invalid | Unchanged |
| Lost solutions | Narrowing was always incomplete | Explicit `⇔` claim that changes the set → invalid; plain incomplete answer → incomplete; false "no solution" → invalid / incorrect |
| Legacy server number grammar | 9 digits | 30 digits (E7-core G2), matching the client |

The citation counts come from `integration/citation-compare.ts`, comparing `837c79c` with this branch.

## The 25 remaining policy false acceptances, by rubric

Source: `integration/policy-fa.json`.

| Group | Count | answer-only | method, no flags | method, all flags | proof |
|---|---|---|---|---|---|
| Unstated restriction or unshown candidate check: finding recorded | 18 | full | full | **partial** | partial when the candidate check is the deduction |
| Wrong citation written in natural text ("by the power rule, …"): not parsed | 7 | full | full | full | partial only where no derivation is shown |

The first group is reported consistently with the rubric: mathematically valid, process credit depends on the flags. The second group is a known gap: no finding is produced, so no rubric can deduct for it. Fixing this would need a natural-text citation reader, which is outside this pass.

## Stop

Merging and deploying are not done; they await approval. After approval, the process policy should run only through `shadowProcessRecord`, with legacy and unified grading remaining authoritative until the shadow comparison has been reviewed.
