# My Learning Year: the curriculum-driven content system

**Branch and PR:**
- branch: `feat/my-learning-year-content-system`
- stacked on: `feat/my-learning-year-platform` (PR #63) → #62 → #61 → #60

**Constraints held:**
- nothing merged and nothing deployed;
- no external AI service and no paid call;
- no real learner record touched; synthetic accounts only, in scratch or CI databases;
- no evidence policy weakened;
- nothing approved in the repository: approvals are server records made by people with the educator role.

> **Milestone, honestly stated.** The system produces, validates, reviews and releases complete learning content from reusable question families and teaching strategies. Content coverage across the 200-competency graph:
> - **31** complete, awaiting review;
> - **8** partial;
> - **21** need an unsupported question type;
> - **140** have no content.
>
> **None is educator-approved.** No grade's curriculum is complete. See `COVERAGE.md`.

## 1. Directive → what was built

### 1. Family-level approval

**spec@1** (`packages/learning/src/spec.ts`) — what an educator approves for each family:
- generation constraints: domain ranges, a release rule, the family's limits;
- the answer validator, an independent check per question;
- the misconception explanations, and the multiple-choice options built from them;
- the difficulty classification;
- the wording and teaching hints;
- representative examples.

**Version lock.** The fingerprint is a hash of the family's behaviour on every question in its pool: wording, answer, options, every mistake explanation (its wording, the skill it points to, its prediction, its probe), the worked steps as written, the difficulty class, and how the answer checker treats the right answer and nearby wrong values. A change to any of these changes the fingerprint, so the old approval no longer applies and the family must be approved again. This is tested by changing one family's wording. A pure refactor that changes no behaviour keeps the fingerprint. The fingerprint is a 32-bit FNV hash: it detects change, but it is not tamper-proof. Content reaches the server only through reviewed pull requests.

**Validation:**
- Deterministic: every pool question is built, passes its independent check, rebuilds identically from its id, has a readable prompt and its own answer format, has explanations that predict only wrong answers, and has distinct options.
- Property-based: 400 seeded random choices across and beyond the domain.
- Boundary: every edge, and one step outside.

**Automatic exclusion.** A question that fails validation is left out of the pool and listed, and is never offered. This is tested by forcing a failure. It also found a real defect: a quadratic mistake explanation that predicted the right answer when p = 0.

**Release rules** (`review.ts` `releaseOf`):
- Only questions inside a released, unchanged specification count as validated evidence.
- A module can be released only after every family it uses.

Status: implemented, tested.

### 2. Systematic coverage

**library@2:**
- Modules come from blueprints: teaching text a person wrote, plus a family.
- Or from **template@1**: a family's teaching hints alone, giving worked steps, spot the mistake, and what the skill builds on.
- Hand-written modules are given their family's pool where one exists. Four have none: fraction models, fraction comparison, factors and multiples, coordinates. Those four are partial.

**19 new families**, chosen from the skills the sample curricula need: rectangle perimeter; two-digit × one-digit multiplication; remainders; exact division; fraction × whole number; unlike fractions; percentages; the mean; square roots; volume; linear equations; proportion; factorising; nth term of an arithmetic progression; distance between points; highest common factor; 2 × 2 determinants; limits; conditional probability.

| Coverage figure | Count |
|---|---|
| Families | 36 |
| Problems in released pools | 20 643 (40 931 question ids, counting the multiple-choice form of each problem) |
| Modules | 37 (10 hand-written, 7 from blueprints, 20 from templates) |

**coverage@2 matrix:** complete and approved / complete, awaiting review / partial / unsupported question type / no content.
- A module counts as complete only with a pool deep enough for every phase (depth@1).
- A family with no module, a pool that is too small, or a module with no family is **partial**.
- Generated questions are never counted as modules.

Status: implemented, tested.

### 3. Educator review interface

The interface is at `/review/` (`frontend/src/review/Main.tsx`). There a reviewer can:
- see an overview of the coverage matrix (graph-wide and per textbook) and of unresolved items: awaiting review, changes requested or rejected, changed since an earlier decision, and pools too small;
- inspect a family's specification, run its validation in the browser and try its representative questions (a wrong answer shows the explanation it matches), with more questions on request;
- read a module's chapter and strategies, its listed questions, its pool depth and the families it uses;
- inspect curriculum mappings: every outcome, where it sits, its mapping and its verdict;
- approve, reject, request corrections or release, with notes.

On the server (`backend/family/content_review.py`):
- **Roles:** an educator approves, rejects or requests corrections; a release manager releases. Roles are granted only by `manage.py content_reviewer`.
- **History:** decisions are append-only and record who decided, on which content hash, when, and with what note.
- **Versions:** a decision on an old hash no longer applies, and a stale version cannot be decided (409). Returning to an earlier version restores that version's decisions, because the content is the same.
- **Four eyes:** whoever approved a version cannot also release it.
- **Suspension:** a released module stops being released if a family it uses changes or is withdrawn.
- **Privacy:** reviewer names are shown only to reviewers; anyone else sees the role.
- **Append-only:** decisions cannot be saved over, updated or deleted, singly or in bulk.
- **Shared registry:** the learner's app loads this registry, so only server-released content counts.

Status: implemented, tested (Django), browser.

### 4. Assessment depth

**depth@1:**
- Each family's pool is split into fixed parts — diagnosis, reassessment checks, practice and delayed check — so a delayed-check question is never met in practice.
- When a module's listed questions run out and the shared engine has not yet demonstrated the skill, the module draws fresh checks from the pool.
- The engine does not count answers given straight after teaching, in the same visit, as demonstration (its rule). So after a lesson the module asks the learner to come back on another day, rather than piling up questions that cannot count.

**Repeated exposure:** the other answer format of a problem already seen counts as help, not as fresh evidence (records.ts, the server's `independent_at`).

**Stated limits:**
**The 8 partial competencies:**
- `root` (square roots) has a pool too small in all four phases; `pow` (powers) is short only for diagnosis.
- `alp` (area between curves) is too small for a module at all. This is recorded in `library.v1.json` `notBuilt`.
- `above` is a family used only inside other problems.
- Four hand-written modules have no family: fraction models, fraction comparison, factors and multiples, coordinates.

Status: implemented, tested, browser.

### 5. Validation across grades

Browser journeys against Django, for Grade 4, Grade 10 and Grade 12 and an unfamiliar Grade 9 book. Each learner:
- makes two early mistakes and is taught;
- comes back the next day for fresh questions;
- comes back after seven full days for the delayed check;
- ends **verified (green) on content released by reviewers in the same run**, with no test fixture.

The Grade 12 learner first goes through prerequisite recovery to powers. No problem is asked twice.

Status: browser.

## 2. Tests (local; CI runs the same)

- Frontend unit tests: **398/398**, including `content-system.test.ts`. Each family's specification passes; approval goes stale after a generator change; failing items are excluded; depth after two mistakes reaches verified; a repeat is help; limits are reported.
- Django: **194/194**. The server's content hashes equal the app's for all 73 items. The workflow is tested: roles, notes, stale versions, a module released only after its families, append-only history. Every one of the 40 931 pool question ids is known to the server in its answer format.
- Browser: **14/14 journeys** against Django `runserver`: the earlier 12, plus educator review and three released-content learners.
- CI also checks that generated files are current: specifications, the question table, the library, parity and coverage.

**Independent check:** a separate agent that had not written the code checked this report against it. It recomputed all 14 647 problems of the 19 new families in closed form and found 0 wrong, and confirmed the coverage figures and the exposure rules.

What it found, and what was done:
- **The fingerprint did not cover explanation wording, worked-step text or the validator.** It now does.
- **Two `lim` explanations did not match their predictions.** Reworded.
- **`divr` predicted impossible remainders.** Now limited to possible ones.
- **Wording slips:** `fmulw` "3ths", the `cdist` "−6 − 3 gives 9" step, the template "For On the line…" sentence, hyphens for minus signs, `pct` worked through 1% (now 10% or 5%), `hcf` not stating its answer, and `ldiv` "0 ÷ 3". All fixed.
- **Six validators repeated their solver's formula:** `pct`, `prop`, `mean4`, `faddu`, `cdist`, `lin`. They are now independent: counting, sharing, levelling, piece-counting, a search for the square root, and substitution.
- **Server gaps:** four eyes, bulk append-only, suspension of a module when its family changes, and reviewer names visible to everyone. All four are fixed.
- **The 40 931 figure was mislabelled.** It is now stated as question ids.

Still noted, not changed:
- 835 multiple-choice options are each predicted by more than one explanation.
- 24 `hcf` items have no explanation.
- The server's independence count matches on the question's competency, not on micro-skills. Here that makes the server the stricter of the two.

## 3. Findings and blockers

| Item | Class | Note |
|---|---|---|
| No educator has approved anything | Needs people | Grant roles with `python backend/manage.py content_reviewer grant <email> --role educator`, or `--role release-manager`. |
| Teaching in template modules is generated from short family hints | Content quality | It is useful and correct, but plainer than a written blueprint. An educator decides whether it is enough. |
| 21 competencies need proofs, constructions, written reasoning or diagrams | Unsupported question type | These need human marking or new input types. |
| The 200-competency graph is not a full Grade 10, Grade 12 or exam syllabus | Content (stated) | Missing outcomes become provisional proposals. Exam-specific skills are not modelled. |
| Small families (`root`, `pow`, `alp`) | Content | Their domains can be widened, or the parts made smaller. |
| Earlier owner decisions (#62/#63) | Unchanged | Tile design, relation audit, exam patterns, OCR, AI extraction. |

## 4. Reproduce

```
node --import tsx packages/learning/scripts/specs.ts      # family specifications, validation, server table
node --import tsx packages/learning/scripts/library.ts    # modules from blueprints and templates
node --import tsx packages/learning/scripts/review.ts sync|status|submit all --by <name>
node --import tsx packages/learning/scripts/coverage.ts   # docs/learning-year/COVERAGE.md
node --import tsx packages/learning/scripts/samples.ts    # docs/learning-year/GENERATED_SAMPLES.md
python backend/manage.py content_reviewer grant <email> --role educator|release-manager
# then open /review/ (reviewers) and /year/ (learners)
```

**Screenshots** (`screens/`):

| Screenshot | State |
|---|---|
| `r1` | review overview and coverage |
| `r2` | a family: validation, and trying a question |
| `r3` | family approved, with history |
| `r4` | module approved after a correction |
| `r5` | release blocked until the families are released |
| `r6` | module released, with history |
| `v4-*`, `v10-*`, `v12-*`, `v9-*` | learners after the lesson, and verified |

**Representative content:** `GENERATED_SAMPLES.md`.
