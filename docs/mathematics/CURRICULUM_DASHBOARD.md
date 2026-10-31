# Mathematics curriculum dashboard (`/curriculum/`, dashboard@1)

A mobile-first Grade 1–12 Mathematics screen for educators and learners. It is built from data that already exists: the
board releases, the coverage compiler's output, the module and family registries, the content-review registry and the
learner evidence ledger. Nothing is configured by hand, and the dashboard never writes a learning record.

```
Grade (1–12) · Board (CBSE/NCERT | Tamil Nadu) · Learner (optional)
  └─ chapter tiles (the release's own chapters, in book order)
       └─ sections, at whatever depth the release has
            └─ competency tiles (one graph id = one evidence record wherever it appears)
                 └─ competency detail: description, builds on, smaller steps, teaching module, assessment
                    (families with review state, written tasks, a question preview), the learner's evidence and
                    next step; ids, mappings and evidence history behind "Details"
```

## Two measurements, never combined

| | Verified competencies (learner) | Assessment coverage (curriculum) |
|---|---|---|
| Counted over | unique competency ids in scope | unique curriculum outcome ids in scope |
| Source | the shared engine (`evidence.ts`, `learnerState`) | the coverage compiler (`coverage-matrix.v1.json`) |
| Numerator | competencies the engine has **verified** | outcomes whose every part is assessed (`awaiting` review, or `validated`) |
| Shown beside it | awaiting verification · learning · to review | partial · not covered · **educator-approved %** |
| With no learner / no evidence | "Choose a learner…" / "Not assessed" | unchanged |

Percentages are whole-number floors of `count ÷ unique ids` (never an average of tile percentages), so 99.6 % never
shows as 100 %.

### Mastery display states (`masteryOf`)

| Engine status (`evidence.ts`) | Display | Colour |
|---|---|---|
| `not_started` | Not assessed | grey |
| `exposure`, `guided` (opened a module, read a lesson, helped answers) | Learning | orange |
| `independent`, `transfer` (shown on its own, delayed check not yet passed) | Shown, awaiting verification | orange |
| `verified` (engine verification **and** a delayed check ≥ 7 full days after independent success) | Verified | green |
| `verified`, but this curriculum asks for a method from this competency and no written answer is marked right (method@1) | Shown, awaiting verification ("hand in a written answer") | orange |
| `review` (missed delayed check, or engine retention failed/overdue) | Review needed | orange, ↻ |

Green means verified and nothing else. A chapter is green only when every competency in it is verified. Every tile
carries a text status and an icon as well as colour.

**method@1.** A competency is method-required in a release when one of its outcomes there is served by a written task
(proof, construction, explanation, sketch) that belongs to that competency. Right final answers and a passed delayed
check then stay orange until an educator marks a written answer right (the existing written@2 marking flow).

## What was reused

| Need | Existing component |
|---|---|
| Chapters, sections, outcomes, accepted mappings, board scopes | `board-releases.ts` (boards@1 releases), `curriculum.ts` types, `assigned`, `allOutcomesOf` |
| Stable tile ids | the same ids My Learning Year's `tiles.ts` uses (`chapter:<release>:<id>`, `section:<release>:<id>`, `skill:<competency>`) |
| Competency names, descriptions, prerequisites, micro-skills, evidence target | `graph.ts` (`relationsOf` mandatory and plausible edges, `childrenOf`, `evidenceTarget`) |
| Modules, strategies, phases, completeness | `content.ts` (`moduleFor`, `moduleOrigin`), `validate.ts` |
| Families, pool sizes, fingerprints, sample questions | `family-specs.v1.json` (specs.ts output), `review.ts` (`familiesOf`, `contentHashOf`) |
| Written tasks and which outcomes they serve | `written.ts`, `outcome-assessment.v1.json` |
| Outcome coverage class, per-competency engineering checks | `coverage-matrix.v1.json` (compile-coverage.ts) |
| Review state (draft … released), locked to content hash | server registry `GET /api/content-review/`, mirrored `effectiveState` |
| Learner evidence, delayed check, verification | `session.ts` `learnerState` → `evidence.ts` (the engine My Learning Year runs) |
| Goals (IIT-JEE, GRE) | `goals.ts` `overlay` (only skills of the learner's own year) |
| Learners, sign-in, records, marks | `GET /api/pupils/`, `/api/pupils/<id>/events/`, `/api/pupils/<id>/written-marks/` |
| Question preview with typed/choice/written/drawn answers | `year/Learn.tsx` `AnswerInput`, `year/Figure.tsx`, `SketchPad` |
| Learning a skill | My Learning Year (`/year/?learner=…&skill=…` opens the skill's module) |
| Content review | the review app (`/review/`) |

New code: `packages/learning/src/dashboard.ts` (pure projection and roll-ups, no content imports),
`dashboard-build.ts` (the per-release index), `dashboard-learner.ts` (read-only adapter over `learnerState`),
`scripts/dashboard-data.ts`, `frontend/src/curriculum/*`, `frontend/scripts/build-curriculum.mjs`. No new Django
endpoint and no new model: everything goes through the existing APIs.

## Performance

* First screen: `app.js` (~210 kB minified, mostly React) + `data/index.json` + one release file (7–170 kB).
* The learner's evidence (the shared engine and module library) is a separate chunk, loaded only when a learner is
  chosen; question previews are another chunk, loaded on "Preview questions".
* Mastery is computed once per learner and release (memoised), never per tile render; unique-id scopes are memoised
  per node. Long levels show 24 tiles and the rest on request.
* Navigation is the URL hash (`#b=cbse&g=10&n=<node>&c=<competency>`): the browser's back button works, and the scroll
  position of each screen is restored.

## Display order (educators)

"Arrange tiles" moves tiles up or down. The order is kept on that device only (`localStorage`), per release and level.
It never changes the release, its mappings, prerequisites or anyone's evidence: unknown ids are ignored and nodes a
curriculum update adds appear after the ordered ones. "Back to book order" clears it. Remapping a competency is not
possible here; it goes through the reviewed curriculum pipeline.

## Preview (not deployed)

```
cd frontend
node scripts/build-mathematics-journey.mjs     # the base dist-english build
node scripts/build-year.mjs                     # /year/ and /review/ (shipped build; add --test only for tests)
node scripts/build-curriculum.mjs               # /curriculum/ (shipped build: provisional content never shows green)
# with a local Django on :8000 (python backend/manage.py runserver)
PORT=4174 API_TARGET=http://127.0.0.1:8000 node scripts/preview-english.mjs
# open http://127.0.0.1:4174/curriculum/  (learner view: /curriculum/?view=learner&learner=<pupil id>)
```

There is no preview service for `/year/` or `/curriculum/` yet: `render.yaml` describes only the English demo (no
account server). A preview would need the three build steps above, a Django service with its database, and the
`/api/` forward that `preview-english.mjs` does; setting one up is a deployment decision for the product owner.
Nothing has been deployed.

## What loads, per board and grade (counted from the releases at build time, not hard-coded)

"Competencies" are unique graph ids mapped in that release (each counted once however often it appears); "smaller
steps" are micro-skills under them; "sections" are the release's own subdivisions at any depth.

| Grade | CBSE chapters | sections | competencies | smaller steps | outcomes | TN chapters | sections | competencies | smaller steps | outcomes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 13 | 0 | 26 | 0 | 43 | 3 | 0 | 3 | 0 | 3 |
| 2 | 11 | 0 | 28 | 0 | 38 | 3 | 2 | 4 | 0 | 3 |
| 3 | 14 | 0 | 37 | 0 | 48 | 3 | 2 | 6 | 0 | 3 |
| 4 | 14 | 30 | 56 | 7 | 61 | 19 | 42 | 52 | 7 | 57 |
| 5 | 15 | 31 | 53 | 3 | 65 | 19 | 44 | 58 | 3 | 61 |
| 6 | 10 | 32 | 46 | 3 | 46 | 16 | 47 | 65 | 0 | 57 |
| 7 | 15 | 32 | 46 | 0 | 56 | 17 | 41 | 52 | 6 | 54 |
| 8 | 14 | 38 | 51 | 3 | 57 | 7 | 25 | 44 | 2 | 33 |
| 9 | 14 | 35 | 69 | 1 | 82 | 9 | 32 | 40 | 2 | 49 |
| 10 | 14 | 26 | 32 | 1 | 58 | 8 | 32 | 48 | 0 | 49 |
| 11 | 14 | 35 | 41 | 1 | 76 | 12 | 42 | 62 | 5 | 64 |
| 12 | 13 | 36 | 49 | 5 | 71 | 12 | 48 | 52 | 3 | 63 |
| **All** | **161** | | | | **701** | **128** | | | | **496** |

Totals read at build time: 1,080 families, 376 written tasks, 1,197 outcomes (`data/index.json` → `generated`). Tamil
Nadu Grades 1–3 have only three chapters each: the inventory could not be checked against the 2026-27 books, and the
dashboard says so on those screens.

## Tests

* `frontend/src/learning/dashboard.test.ts`: real counts; mapping integrity against every board release; coverage
  equal to the compiler's per release; partial outcomes stay partial at every level; review state equal to
  `effectiveState`; unique-id aggregation (I); display states and method@1; E–H through the shared engine; a Grade 5
  goal adds only own-year skills (B); display order changes nothing (J); boards and grades separate (N); Grade 12
  Integrals nested (D).
* `frontend/e2e/curriculum.test.mjs` (CI: learning-year workflow, real Django, 360 × 800): journeys A–N, with no
  horizontal overflow on any screen visited (L). Screenshots in `dashboard-screens/`.

## Gaps (product-owner decisions)

* **Classes and educator access to learners.** There are no classes, so an educator chooses among the learners of
  their own account. Reading another family's learner would widen access to children's records: it needs a
  decision, then an explicit share (as `MarkingShare` does for written work).
* **Assigning modules** is not built: no assignment model exists.
* **Display order** is kept per device, not shared across a school.
* **Approval.** Nothing is educator-approved, so on the shipped build no learner can be shown verified. Only the
  marked test build shows green.
