# OpenPath status (handoff for a new session)

Read this file first; status is branch-local, so verify refs. Keep it under ~60 lines; update it at each milestone.

Updated: 2026-11-11 (branch `feat/icse-grade5`: CISCE / ICSE Class 5; `main` holds the whole maths line)

## Rules (product owner)
- No merge or deploy without the owner's explicit approval. PRs are drafts. AI review/fixes may proceed; do not label them human educator approval.
- One bounded milestone at a time: scope, finish, report commit/tests/defects/readiness, stop.
- Long jobs run in GitHub Actions; schedule a check-in instead of waiting. How-to: `docs/runbooks/DEV.md`.

## Branches
- `main` holds the whole maths line. Branch from `main`; short branches, merged back within a day or two.
- Still open: #121 (dot, method alignment; already inside `main`), #123 (dot, TN Grades 1–3 ingestion; do not touch).

## This milestone (2026-11-11, CISCE / ICSE Class 5, branch `feat/icse-grade5`, draft PR, not merged)
- icse@1 (`docs/milestones/ICSE_GRADE5.md`): a third board for Grade 5 only, `boardFor("icse", 5)`, from
  `content/learning/syllabus/icse-g05.json` through the same builder. Existing skills only; nothing written for it.
- Source is NOT official (third-party copy of the CISCE Class V pages; cisce.org unreachable): all themes `sourceVerified: false`.
- 77 outcomes: 56 full, 14 partly, 7 gaps (Roman numerals, 3-D symmetry, line graphs; number line and integers
  order/compare left out because their lessons fail the teaching checks). 57 skills: 57 taught, 57 verified without the fixture.
- Open: check against the school's textbook; repair the two lessons; outcome-assessment map for the 70 outcomes.

## Earlier (2026-11-10, machine validation and re-certification)
- `main` = everything (#125, then #126 machine-validation@1). The owner delegated technical decisions; deploys still need his
  explicit approval, and `openpath-demo` on Render auto-deploys on every push to `main`, so a merge to `main` is a deploy.
- machine-validation@1 (`docs/product/MACHINE_VALIDATION.md`): no educators, so a question counts as validated when it is
  independently certified, unchanged since and grading-certified. Re-certification (`recertify.py`) + blind review of the 222
  hand-written questions + eligible@1 (fresh validated questions after a delayed check that could not count):
  1,078 of 1,090 families, 215 hand-written. Verified without the fixture: TN 7 47/50, CBSE 7 43/46, TN 8 42/43, CBSE 8 48/48.
- Follow-up (recert@1): references for 9 new families + `ajbase`/`linev` (all questions verified); `wm-tri-d1` reworded;
  wording references (`wordrefs.py`, `aeineqz` first) fix `inequations-intro`; `tools/recertify.sh` + CI check keep the
  registry current. Registry: 1,080 of 1,090 families, 216 hand-written.
- Open: 9 answer-verified families wait for the grading audit; `aetfig` has no reference.
- prereq-after-own@1 (`docs/product/PREREQUISITE_AFTER_OWN.md`, switch, OFF; order by learner-vector@1 when on): before pausing for a person, check and teach
  the skill below, then explain this skill again. TN 5 synthetic: prerequisite found and taught 3 of 43 (off) vs 22 of 43 (on).
- learner-vector@1 (`docs/product/LEARNER_VECTOR.md`, SHADOW): per-skill estimates using difficulty and the prerequisite graph.
  TN 5 synthetic: the missing skill is the first one checked in 57% of cases (graph order: 24%). Read only by recovery's order.
- grade5-lessons@1: number-line lesson repaired (Grade 5 teaching scope; tip reworded); ICSE Grade 5 release 1.1.0 has 58
  skills, 6 gaps. Integers lesson NOT repaired and the rule NOT on by default: the deep-recovery research tests assert the old
  stop and use integers as their unteachable skill; rework them first. Seven lessons borrowed from Grades 6–7 were read:
  they show sections above Class 5 (percentage change, remainders, co-primeness); per-board section scoping is open.

## Earlier on 2026-11-10 (research pool boundary)
- #125: offline recovery pool readers isolated; the boundary is enforced in Node CI (`tools/question-selection-boundary.mjs`).

## Combined-candidate milestone (2026-11-10)
- Pythagoras (method-sections@1, `library.ts`): "Step by step", "Squares on the sides" and "Spot a triple" now also carry a
  converse section and a triple-rule section (worked examples: `ahconv`, `ahgen` 2m rule; the m² − n², 2mn, m² + n² rule is in the
  text, no worked example of its own). Method map: `ahconv` → pythagoras-converse, `ahgen` → triple-rule-2m / triple-rule-mn; both
  mapped explanations list them (unapproved). #121's gate unchanged (a hypotenuse after "Step by step" is still
  refused). Both boards pass the existing synthetic journeys; the independent AI review below found teaching gaps those tests miss.
- Ratio recovery tests: ratio is teachable now, so scale drawings → ratio is taught and returns (both tests updated). A real
  missing-content gap is tested on integer addition → integers (blocked, nothing solved); the single-slip tests are kept.
- deep-select@1 (`deep-recovery.ts`, research, off): questions must be selectable, keyboard-answerable, within grade, fresh and,
  after teaching of their skill, covered by the taught method; probes on untaught skills stay diagnostics. No suitable question:
  an honest stop that says why. Saved answers are read by the same rule (history kept): an untaught-method answer no longer
  counts toward "solved after help". Effect: the partial-fractions integral after a u-substitution lesson now stops instead of
  "solved after help" (phase-3 tests updated). Registered as a selector (`question-status.test.ts`).
- Tests: `deep-select.test.ts`, `pythagoras-methods.test.ts`; regenerated (Node; grader bundle with esbuild 0.28.2).

## Open defects
- All learning-package tests still need a complete Bun run; the selector/import-boundary check now also runs in Node CI.
- Pythagoras m² − n², 2mn, m² + n² rule lacks a worked example despite its map. See `PYTHAGORAS_AI_REVIEW_2026_11_10.md` in milestones.
- Pythagoras "Spot a triple" / "Spot the mistake" / "What it uses" have no method map (#121 legacy path, follow-ups not gated).
- Grade 8 review-2 majors still open: mixed example in opening sections (M1, M2), exponent as factor (M4), below-grade
  lessons, missing outcomes (straight-line graphs/scale, frequency polygons, map colouring), M3 wrong reason.
- 14 Grade 8 runs open below grade (fixed exploratory questions). `bun test packages/learning/src` not in CI (Bun needs
  owner approval). No branch protection on main. Content provisional: no educator review, no real learners.

## Previous milestones
- Foundations fix (`5e4c1fd`): choice@1 (atgen, abunit checks), Pythagoras shorter side, registries merged three-way.
- Dev efficiency (#122): `tools/regen.mjs`, test shards (CI 58 → 22 min), learner view, lesson-checks@1.
- Grade 8 pilot (#119): 76 competencies both boards; grade-order@1; review 2 in `docs/milestones/GRADE8_REVIEW_2.md`.
- Grade 7 (#117): 75 modules; CBSE 43/46, TN 48/50 verified (rest educator-marked). `docs/milestones/GRADE7_COVERAGE.md`.
- Method alignment (#121): `docs/milestones/METHOD_ALIGNMENT_BATCH2.md`.
