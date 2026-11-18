# OpenPath status (handoff for a new session)

Read this file first; status is branch-local, so verify refs. Keep it under ~60 lines; update it at each milestone.

Updated: 2026-11-11 (branch `feat/icse-grade5`: CISCE / ICSE Class 5; `main` holds the whole maths line)

## Writing evaluator coverage v2 (2026-11-18, isolated follow-up)
- Branch `feat/english-evaluator-coverage-2026-11-18` preserves green #225 unchanged. 30 candidate samples, all seven argument areas represented, stretch preferences and three current/previous-draft revision cases; historical 16-case v1 retained.
- Fixes short/full quotation matching and overgeneralized Chennai note; independent AI review refined article/countability, optional stylistic concerns and revision task wording.
- Local81backend/357core/86essay-live tests, both English typechecks and build pass; independent AI review reran15acceptance tests. No provider call, new spending permission, real learner data, merge or deployment. See `docs/product/english/writing-evaluator-coverage.md`; counts are coverage, not measured accuracy.

## Writing evaluator acceptance (2026-11-18, in progress)
- Branch `feat/english-writing-evaluator-2026-11-18`, layered on #221. No provider activated or real learner text accepted.
- 16 synthetic workspace cases; actual request builders/client validators, opt-in exact server view/shared quotas, bounded spend/request limits and interrupted-run checkpoints.
- Request/reference/server-policy provenance, valid-usage alarms and required-anchor agreement; schema acceptance is not correctness. Independent AI review corrected an unsupported baseline misconception label and found duplicate argument concerns, now refused server/client.
- See `docs/product/english/writing-evaluator-acceptance.md`. Live accuracy, learner benefit and release readiness remain unestablished; full exact-head CI pending.

## Independent writing transfer (2026-11-18, in progress)
- Branch `feat/english-writing-transfer-2026-11-18`, based on merged #216 main `4ce5f7a9`.
- Reserved unseen authored task after own revision; hidden coaching, explicit unproctored unaided declaration, saved writing and tentative shared-evaluator observations. Offline/error remains unassessed.
- 14 immutable topic families (10 Grade7 eligible); spent/abandoned tasks are not recycled, exposure local to learner ledger. No concept-score substitution, provider activation or real data.
- Local 162 English/store/learner tests, 357 core tests, 71 backend evaluation tests and English typecheck/build pass. See `docs/product/english/independent-writing-transfer.md`; exact-head browser/full CI pending. Atomic device-store writes prevent stale-window duplicate reservations; active transfers lock learning navigation.

## Argument concept learning (2026-11-18, merged)
- Branch `feat/english-reasoning-plan-2026-11-18`, based on verified main `d24845b4`.
- Finding-linked or self-selected concept probes → response-led teaching/practice → fresh/later checks, reusing existing engines in an isolated linked concept record.
- Task response, idea development, paragraphing and persuasion concepts; no concept result may inflate source writing ability or establish argument validity.
- Exact source provenance, family/exposure protection and privacy/provider safeguards retained. See `docs/product/english/argument-concept-plan.md`.
- PR #216 merged as `4ce5f7a9`; all 19 exact-head CI + Learning Year passed. Combined latest maths tree passed 148 tests/typecheck/build; remote tree matched.

## Integrated English workspace (2026-11-18, merged)
- Branch `feat/english-workspace-2026-11-18`, PR #212; initial head `419fca60` based on main `dc7572e8` (#209).
- Owner clarified comprehensive ongoing grammar/articulation practice, goal-dependent tasks, for/against arguments and own-text repair, not canned rewrites or isolated milestones.
- Reuses EssayStudio/learner ledger for hypotheses, verification, plans, teaching, independent checks and retention; separate argument observations never imply mastery.
- Grade7/general/CAT/GRE/GMAT self-selected candidate profiles; 17 specified competencies have teaching, 3 observation-only. 192 candidate role-separated tasks deepen 4 skills × 3 references (12/51 cells); other fresh-check shortages remain.
- Synthetic only, optional configured evaluator fails closed; no provider activation, real learner data, audio or maths changes. See `docs/product/english/learner-workspace.md`.
- PR #210 merged as `ba8d1106`; PR #212 merged as `d24845b4`. Exact English head passed 19 CI jobs + Learning Year; combined latest-maths tree passed 123 targeted tests/typecheck/build. Still synthetic, not live-learner-ready.

## Earlier English milestones
- #202 synthetic reading/writing diagnostic, #207 fresh forms and explicit unobserved coverage, #209 writing guided lessons, #210 reading guided lessons are merged.
- Candidate content and deterministic checks are not human-reviewed validation or exam prediction. Teacher completion never establishes independent mastery.
- Details: `docs/product/english/exam-writing-synthetic.md`.

## Rules (product owner)
- No merge or deploy without the owner's explicit approval. PRs are drafts. AI review/fixes may proceed; do not label them human educator approval.
- Latest English direction: build the coherent ongoing learner journey rather than successive isolated milestones; report exact tested coverage and remaining gaps.
- Long jobs run in GitHub Actions; schedule a check-in instead of waiting. How-to: `docs/runbooks/DEV.md`.

## Branches
- `main` holds the whole maths line. Branch from `main`; short branches, merged back within a day or two.
- Still open: #121 (dot, method alignment; already inside `main`), #123 (dot, TN Grades 1–3 ingestion; do not touch).

## Scene engine (2026-11-16, branch `feat/scene-engine`, draft PR #161, not merged)
- scene@2 / scenes@2 (`docs/product/SCENE_ENGINE.md`): interactive teaching pictures as data. One deterministic engine
  (`packages/learning/src/scene.ts`), one player (`frontend/src/year/Scene.tsx`), one builder per question family
  (`scenes.ts`; families untouched). Kinds: strips, slope, accumulate, line, triangle; curves are polynomials or sums of
  power, sine, cosine, exponential and logarithm terms. No model or network call for a learner.
- Shown in a lesson section about a generated question and after a wrong answer where the solution is shown. Eight families
  (`cint`, `pint`, `audfp`, `dpow`, `audsum`, `audel`, `asline`, `ahtri`): 3,046 released questions, each held against the
  family's verified answer. Not evidence of a skill.
- Open: a drag answer that counts (a new answer type; grading unchanged here); a physical Android check.

## Lesson recipe (2026-11-16, branch `feat/lesson-recipe`, on top of `feat/scene-engine`, draft PR, not merged)
- recipe@1 (`docs/product/LESSON_RECIPE.md`): a skill's opening lesson as question → guess → missions (scenes) → name →
  when to use it, from data (`packages/learning/src/recipe.ts`, player `frontend/src/year/Recipe.tsx`). The worked examples,
  practice and checks follow as before; nothing in a recipe is evidence; teaching is recorded as before.
- Six recipes: integrals as first met, differentiation, matrices, determinants, straight lines, triangle angles. scene@3
  adds a `transform` kind (two arrows are a matrix that moves a shape). A recipe left part-way resumes at its step.
- Open: recipes for the other skills; definite integrals has no eligible opening lesson to carry one; a drag answer that
  counts as evidence.

## Stuck at a step (2026-11-17, branch `feat/step-help`, draft PR, not merged)
- step-help@1: "I'm stuck" in practice with help, and the working after a wrong answer, give one rung at a time from the
  question's own steps: what to do next, the skill the step needs (a card), a smaller question, then the step.
- 336 of 337 skills have a card by rule (325 with an example); quality not yet reviewed.
- Open: the review screen for cards; counting stumbles against the leaned-on skill; notation cards.

## Change the numbers (2026-11-17, branch `feat/explore`, draft PR, not merged)
- explore@1: under a worked example in a lesson, one of its own numbers can be changed and the family remakes the question,
  picture and working; only to questions outside the released pool. 119 of 315 pictured families.
- next-step@1: the next line of working appears by itself; the "+ Step" button is gone. The pie chart is centred.
- Open: the 196 pictured families whose neighbours are all released (needs an exposure record); a step check for algebra,
  trigonometry, calculus and matrices; loading by class to cut the download.

## Scenes from pictures (2026-11-17, branch `feat/figure-scenes`, draft PR, not merged)
- scenes@4: a question with no builder gets a scene from its own picture, by kind of picture (rectangle, shaded grid, equal
  rows, triangle), only when the scene arrives at the verified answer. 10 more families, 568 released questions.
- scene@8 adds `bars` (a reading line on a bar chart), after the owner's screenshot of the bar-chart lesson: 3 more
  families, 757 questions.
- Open: converters for tables, number lines, the coordinate plane, solids, blocks, pictographs and clocks.

## Arrange and play first (2026-11-16, branch `feat/arrange`, draft PR, not merged)
- scene@7 adds `order` (number cards dragged into order). scenes@3: builders for comparing two numbers, ordering integers
  and rounding, each checked against every released question of its family.
- play-first@1: a worked example with a scene shows the scene first; the working opens when it is done.
- Open: builders for the other Class 5 picture types (tables, bars, clocks, charts, solids).

## Guess first (2026-11-16, branch `feat/guess-first`, draft PR, not merged)
- guess-first@1: in every skill's opening lesson, a worked example opens after a guess among the verified answer and the
  family's own predicted wrong answers (`guessOf`). No writing per skill: 190 of 244 mapped skills get it, 27 more have a
  recipe.
- Open: the 27 skills with neither; a guess is not yet offered in the lessons shown after a mistake.

## Class 5 lessons, second batch (2026-11-16, branch `feat/class5-recipes-2`, draft PR, not merged)
- scene@6 adds `commas`; two recipes use it (lakhs, crores and millions; big numbers), after the owner's note that the
  old lesson only tells.
- Nine more Class 5 recipes (30 in all); 22 of the 62 CISCE Class 5 skills open with a recipe. The counters picture can
  share out a total and show what is left over.
- Open: 42 Class 5 skills; pictures for mixed numbers (more than one whole), clocks, solids, angles and charts.

## Class 5 lessons (2026-11-16, branch `feat/class5-recipes`, draft PR, not merged)
- scene@5 adds three kinds: `fraction` (bar or hundred-square), `numberline` (point, hidden number, nearest ten, jump) and
  `array` (counters in equal rows).
- Twelve Class 5 recipes (`packages/learning/src/recipes-class5.ts`), 21 in all. Of the 62 skills in the CISCE Class 5
  curriculum, 13 now open with a recipe.
- Open: the other 49 Class 5 skills; three skills with no eligible opening lesson cannot carry a recipe (times tables,
  factors and multiples, area of a rectangle); pictures for circles, solids, charts and time.

## Lesson types (2026-11-16, branch `feat/recipe-types`, draft PR, not merged)
- shape@1: a recipe's `type` (`idea`, `method`, `fact`) decides its steps. scene@4 adds `rectangle` and `join`.
- Three recipes added (nine in all): continuity (fact), same perimeter / different area (Class 5, idea, one thing at a
  time), adding fractions (Class 5, method).
- lesson-part@1: each finished part is recorded (`lesson_part` metric), so where learners leave a lesson can be read.
- Open: recipes for the other skills; drag answers that count as evidence; a physical Android check.

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
- 2026-11-12 Grade 5 (ICSE): pictures for seven lessons (factor tree, per-row grid, line graph drawings); every Grade 5
  explanation passes the teaching checks (26 of 212 were refused before); three new skills close the last ICSE gaps (Roman
  numerals, mirror symmetry of 3-D shapes, line graphs; release 1.3.0, 62 skills, 77 outcomes, no gaps); grading audit run
  for the 13 newest families. Registry: 1,093 of 1,094 families.
- 2026-11-13 grade5-level@1: later-class question kinds left out of Class 5 lessons and practice. device-mode@1: My
  Learning Year can run with no account server, keeping records in the browser (docs/product/DEVICE_MODE.md); built into
  the demo only when OPENPATH_MATHS_ON_DEVICE=1 is set, which it is not yet.
- 2026-11-13 simple-setup@1 (board and grade drop-downs), subjects-home@1 (English and Maths tiles; a Maths link inside
  English), family-pilot@1 (docs/product/FAMILY_PILOT.md): a hosted server with its own PostgreSQL database for a real
  learner; files ready, not deployed.
- Open: 9 answer-verified families wait for the grading audit; `aetfig` has no reference.
- prereq-after-own@1 (`docs/product/PREREQUISITE_AFTER_OWN.md`, ON by default since 2026-11-12, order by learner-vector@1): before pausing for a person, check and teach
  the skill below, then explain this skill again. TN 5 synthetic: prerequisite found and taught 3 of 43 (off) vs 22 of 43 (on).
- learner-vector@2 (`docs/product/LEARNER_VECTOR.md`, SHADOW): per-skill estimates using difficulty and the prerequisite graph; @2 adds forgetting (memory stability, recall, review dates); recall feeds only quick-review@1, an optional "Quick review" card on the maths home.
  TN 5 synthetic: the missing skill is the first one checked in 57% of cases (graph order: 24%). Read only by recovery's order.
- grade5-lessons@1: number-line and integers lessons repaired; ICSE Grade 5 release 1.2.0 has 59 skills, 3 gaps (Roman
  numerals, 3-D symmetry, line graphs). The deep-recovery research tests run with the rule off and an unteachable-skill
  fixture. Seven lessons borrowed from Grades 6–7 show sections above Class 5; per-board section scoping is open.

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
