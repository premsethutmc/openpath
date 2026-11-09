# Runbook: complete one grade, both boards (CBSE, TN)

Distilled from the five Grade 7 commits on `feat/grade7-full-coverage` (read them as worked examples:
`git show --stat 25fd9c8 aa9fb82 9812f53 7548a12 e926097`; details in `docs/milestones/GRADE7_COVERAGE.md`).
Grade N below means the grade being built. Owner rules in `docs/STATUS.md` apply (no merge or deploy without approval).

## 0. Setup (integrator, once per grade)
- Branch `feat/gradeN-…` from the latest green grade branch.
- `content/learning/teaching-scope-gradeN.v1.json`: every competency a CBSE or TN Grade N outcome maps to
  (accepted mappings, evidence targets). Wire it into `WHOLE_LESSON` (`packages/learning/src/library.ts`) and
  `SCOPE`/`WHOLE_CHAPTER` (`packages/learning/src/teaching-contract.ts`).
- Regenerate (`node tools/regen.mjs`, Node only; see `docs/runbooks/DEV.md`) and measure: contract violations in scope,
  `GRADE=N BOARD=cbse|tn bun frontend/scripts/grade-gap.mts`, and `bun packages/learning/scripts/lesson-checks.ts`.
- Split the work by **strand** (number; geometry + measurement + coordinate; algebra + reasoning + statistics +
  probability + sequences), not by board: the boards share competencies, so a board split edits the same files twice.

## 1. Builder work (one agent per strand, own worktree)
For the strand's in-scope competencies, in this order:
1. **Teaching contract → 0 violations** (except documented exemptions): `text-not-instance` → write `textFor`
   alternatives using each question's own numbers, or family-level method text with no stray example numbers;
   `worked-unverified` → the worked example's last step is the checked answer from the family's own solver;
   `no-instance` → a generated question for the section, or an exemption with a stated reason in
   `content/learning/teaching-contract-exemptions.v1.json` (construction and hand-written modules only).
2. **Taught after early mistakes:** every competency must show teaching (chapter, strategy or guided) after two
   wrong answers that match no known misconception. Fix by adding a checked general explanation for the skill,
   never by weakening the evidence or verification rules.
3. **Stalls and failures** in the gap report: fix the cause (missing check form, missing family), as in `e926097`.
4. **Question review of the strand's families:** wording, realistic contexts, distractors that are plausible and
   wrong, word forms that match the typed question, age-appropriate level. **Level tags (level@1):** a Grade N
   learner is never given a family from a later grade; below-grade families carry their real grade.
5. **Safety, every change:** no typed, word or multiple-choice answer or key of any question changes, and no stored
   multiple-choice option letter moves (compare before/after); revert any fix that would.
6. Edit **source files only** (`packages/learning/src/fam/*.ts`, lesson and explanation sources, exemptions, level
   tags). Do not commit regenerated files (library, specs, parity, coverage, review registries, grader bundle):
   the integrator regenerates once.
7. Run `bun test packages/learning/src` and the strand's checks; commit on the strand branch with a short report:
   what changed, counts before/after, deferred findings with reasons.

## 2. Integration (integrator)
- Merge the strand branches into the grade branch, then `node tools/regen.mjs` once (Node, never Bun: it refuses Bun;
  every generated file in order, including the review registries and the grader bundle) and commit the result.
  CI's "Generated files are up to date" job runs `node tools/regen.mjs --check`.
- Lower the teaching-contract baseline (`bun packages/learning/scripts/teaching-contract.ts`); counts only fall.
- Add `frontend/src/year/gradeN-coverage.test.ts` (copy of the Grade 8 test, with `inPart` so CI can run it in parts), list
  it in `SPLIT` in `tools/test-shards.mjs`, and add grade N to `SCOPE` in `packages/learning/scripts/lesson-checks.ts`
  (then `--write-baseline`).

## 3. Independent check (a reviewer who did no building)
- First `bun packages/learning/scripts/lesson-checks.ts --grade N --all`: the review findings the checks can see.
- Fresh sample review: ≥15 modules across all strands, both boards, read with
  `cd frontend && node --import tsx scripts/learner-view.mts <competency> --board cbse|tn --grade N`; findings by severity.
  Fixes by an agent other than the reviewer. Nobody reviews their own work. A new kind of finding that text can show
  becomes a check in `packages/learning/src/lesson-checks.ts`.

## 4. Done when (acceptance)
- Gap report for Grade N, both boards: 0 failed; untaught only for educator-marked competencies.
- Teaching-contract violations in scope: 0 (or documented exemptions).
- No answer, key or option letter changed (safety comparison attached to the commit).
- CI green: CI, My Learning Year (incl. `gradeN-coverage.test.ts`), Mathematics learner journey.
- `docs/milestones/GRADEN.md` report and `docs/STATUS.md` updated. Content stays provisional (no educator review).
