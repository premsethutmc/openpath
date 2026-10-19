# My Learning Year: audit, gap matrix and contracts

Branch `feat/my-learning-year`, based on `integ/learning-year-base`. That base is the completing-the-square stack (#59 →
#57 → #56 → #55) merged with `feat/grade1-6-mathematics-foundation`. Nothing has been merged to main, and nothing is
deployed.

This document is the Stage 1 audit and the Stage 2 contracts. The acceptance results are in `ACCEPTANCE.md`.

## 1. What exists (audited 19 Oct 2026, from the code, not from PR titles)

| Component | Where | State |
| --- | --- | --- |
| Competency graph, 200 maths competencies | `content/mathematics/curriculum.v1.json`, `packages/mathematics/src/curriculum.ts` | Exists. AI-authored and provisional. Each competency has its own sub-strand, so the hierarchy is shallow. Many prerequisite chains are artificial (for example, equivalent fractions requires long division); `feat/grade1-6-mathematics-foundation` audits them and proposes a teaching overlay, which is not adopted. Only 12 competencies have question families. |
| Exam tracks (JEE Main, JEE Advanced, …) | `content/mathematics/exam-tracks.v1.json` | Metadata only: provisional syllabus overlap, no scoring or timing rules. |
| Evidence ledger, content gate, provenance, assisted@1 | `packages/english-core/src/updater.ts`, `content.ts`, `types.ts` | Exists and is shared by English and mathematics (`mathematicsLedger`). |
| One verification definition (verification@2, H-V1 to H-V4) | `english-core/src/verification.ts`, `mathematics/src/canonical.ts` (`sharedProfile`) | Exists. Only educator-validated, released items are eligible, with a check at least 7 days later. **No maths item is validated**, so nothing in maths can verify yet. |
| Parent/child aggregation | `english-core/src/composite.ts` (`aggregate`, `leafView`) | Exists for framework strands; there is no learner-facing tile UI over it. |
| Planner (teach → guided → reassess → change strategy → person) | `english-core/src/planner.ts` | Exists and is subject-neutral. Mathematics reuses it in `mathematics/src/remediation.ts`. |
| Maths learning modules | fractions v2 (`/mathematics.html`), JEE chapter and completing the square with adaptive help (`/maths/`), Grade 1/3/5 foundation journeys (`/foundation.html`) | Exist, each a fixed program with its own replay. |
| Learner identity, sessions, append-only records | `backend/family` (`Pupil`, `PupilEvent`, session cookies, CSRF) | Exist. **A pupil has no grade, academic year, curriculum or goal.** |
| Curriculum ingestion | none | Missing. There are no textbook locators; NCERT and TN sources were unreachable from here. |
| Hierarchical learner tiles, My Learning Year | none (English has hard-coded journey tiles) | Missing. **No approved My Learning Year design exists in the repository.** The approved visual language is the English restyle (`docs/product/UX_INTEGRATION_V1.md`, tokens in `english.css`). |
| Maths diagnostics / placement | none (English has `placementNext`) | Missing. |
| Micro-interventions with strategy choice | partial: the planner and the completing-the-square help | No strategy choice from prior knowledge. Recovery works only within one unit. |
| Goal pathways | none (exam tracks are metadata) | Missing. |
| Question decomposition | partial: transfer probes inside completing the square | No general facility. |
| Essay pathway (AI-assisted) | `backend/evaluation`, `english-core/src/essay` | Exists and is isolated. It is disabled by default and paid only if an operator enables it. Out of scope here. |

## 2. Gap matrix (directive section → what is built in this branch)

| Requirement | Before | This branch |
| --- | --- | --- |
| A. Curriculum ingestion and synthesis | missing | Deterministic parser for a structured textbook (subjects, chapters, pages, outcomes, worked examples, exercises). Mapping to the existing graph by name, description and grade evidence, with a confidence score and status `proposed`. Missing competencies become provisional `proposal.` records with source references. Releases are only made through an explicit review, are versioned and hashed, and can be assigned. No AI calls are used, and no mapping is ever treated as verified. |
| B. Hierarchical tile engine | missing | A learner-specific projection: subject → chapter → outcome → competency → micro-skills, recursive with no depth limit. Ids are stable and nothing is duplicated (the same competency in two curricula is one record). Each tile carries objectives, evidence references, progress, status, assessment availability, strategies, curriculum references and goal links. |
| C. My Learning Year dashboard | missing | `/year/`: academic year, grade, subjects, current tiles, verified, developing, next activity, year progress (milestones). Status colours come with labels and icons. Only the current curriculum and enrichment are shown. |
| D. Diagnostics | missing | 1 to 3 questions chosen by expected information gain over six hypotheses (conceptual, prerequisite, procedural, recall, transfer, secure), with "insufficient evidence" when ambiguous. Marking is deterministic, with equivalence checking (`checkAnswer`). Every attempt is stored with its assistance level. |
| E. Micro-interventions | partial | Strategy choice from demonstrated prior knowledge (for example, 7 × 8 by known facts, doubling, decomposition, repeated addition or arrays). Teach one step, then check, with blocks run by `planRule`. Recovery expands into prerequisites with cycle detection and a per-session depth limit, escalates to a person, and returns to the original problem. |
| F. Evidence, progress, mastery | exists | Reused unchanged. Statuses are derived as exposure, guided, independent, transfer, retention and verified. Parent status follows an explicit aggregation policy, and a 100% orange bar never becomes green. |
| G. Goal pathways | missing | Goal overlays on the shared graph. For a young learner: age-appropriate foundations and readiness-gated enrichment. For an exam-near learner: gap × weight-range priority within the available time, practical targets (60/75/90%), and negative marking. No fixed marks per topic. |
| H. Question decomposition | partial | Structured problems with fragments: required competencies, minimum grade and a readiness rule. The original question is never shown before readiness. Source, licence and validation metadata are kept. |
| I. Unified learning module | partial (fixed programs) | One framework: Explore → Strategy → Chapter → Practise → Verify. It links out to existing fixed programs where they exist (completing the square, foundation journeys). |
| Data architecture | relational + append-only JSON events | Kept. No graph or vector database is needed at this size: 200 competencies plus additions, traversed in memory, with a pure deterministic projection. |
| Tests and journeys A–F | none | Unit tests, Django tests and browser journeys against the real API (CI). |

## 3. Contracts

All learner state is **derived** from the learner's append-only records. The server checks the shape and ownership of
each record and never computes proficiency. Projection is pure: the same records, content and clock always give the
same tiles and plan.

**Curriculum model** (`content/learning/curricula/*.json`; a learner's own reviewed curricula are kept in their
records):

```
CurriculumRelease { id, version, status: "draft" | "reviewed", grade, academicYear?, board?, title, hash,
  source: { kind: "textbook" | "specification", title, edition?, publisher?, licence, synthetic: boolean },
  review: { by, at, note, educatorReviewed: false } | null,
  subjects: [{ id, name, chapters: [{ id, title, pages?, outcomes: [{ id, text, pages?,
      examples: [{ title, pages? }], exercises: [{ ref, pages? }],
      mapping: { competencies: [{ id, score, method, status: "proposed" | "accepted" | "rejected" }],
                 proposal?: ProvisionalCompetency } }] }] }] }
```

**Competency graph** = `curriculum.v1.json` (unchanged) + `content/learning/competency-additions.v1.json`:

* provisional micro-skills (`partOf` a parent competency);
* "supports" edges used for recovery navigation, kept separate from the v1 prerequisite edges.

Every addition has `status: "provisional"` and a source note.

**Question graph** (`content/learning/questions.v1.json`):

```
Question { id, competency, role: diagnostic | practice | check | retention | challenge, type: integer | fraction |
  choice | polynomial | set, prompt, answer, options?, hint?, solution,
  diagnosis: { right: {hypothesis: likelihood}, wrong: {…}, misconceptions?: [{ when, hypothesis, says }] },
  strategy?, difficulty, review: "provisional", source, licence }
Problem { id, title, competencies, source, licence, validation, full: { prompt, answer, minGrade, readiness },
  fragments: [{ id, prompt, answer, competencies, minGrade, maxGrade?, readiness }] }
Strategy { id, competency, name, needs: [questionId | competencyId], teach: Screen[], guided, check }
```

**Learner evidence**: kind `learning_record` records in the existing mathematics stream, which needs no migration.

```
{ kind: "learning_record", id, at, learnerId, sessionId, record: "enrol" | "goal" | "curriculum" | "attempt" |
  "teach" | "skip", … }
enrol    { grade, academicYear, curriculum: { id, version, hash } }
goal     { pathway, targetYear?, active }
curriculum { release }                (a learner's own reviewed release; immutable once saved)
attempt  { questionId, response, activity: diagnostic | guided | practice | check | retention | challenge | original,
           hints, solution, competency }
teach    { rule, strategy, competency }    skip { target }
```

The answers go to the shared ledger as native items:

* guided answers and answers after a hint are `assisted_response` / hinted evidence;
* checks, diagnostics and retention answers are `evidence` with `provenance@1`;
* teaching blocks are `intervention` events.

**Status policy** (per competency, derived):

| Status | Meaning |
| --- | --- |
| `not_started` | no records |
| `exposure` | taught or seen only |
| `guided` | right only with help |
| `independent` | right first time, without help, on a fresh question |
| `transfer` | also right on an application question |
| `review` | a failed delayed check, or a gap the planner is working on |
| `verified` | **only** `sharedProfile(...).status === "verified"` |

`retention_due` is a separate flag set 7 days after the first independent success.

**Tile colours**: green = verified; blue = independent or transfer (shown on your own, not yet verified); orange = active
learning (exposure, guided or review), with a progress bar; grey = not started.

**Parent aggregation policy (`aggregate@1`)**:

* a parent is green only if every child is green;
* a parent is blue if every child is blue or green;
* a parent is orange if any child has records;
* otherwise it is grey.

Progress = children independent or better ÷ all children. 100% orange is still orange.

**Learning plan** (pure), in priority order:

1. a delayed check that is due;
2. an open intervention;
3. the first unassessed skill of the current chapter;
4. practice on a developing skill;
5. goal enrichment, when ready.

**UI projection**: `Tile { id, kind, title, children, status, progress: {done, total, verified}, statusLabel, icon,
objectives, evidence: [attempt ids], assessable, strategies, curriculumRefs, goalRefs }`.

## 4. Decisions taken (reversible, documented)

1. **Records live in the mathematics stream.** Learning-year records use kind `learning_record` there, so there is no
   migration. A cross-subject stream would need a new subject value and a migration; it is deferred until a second
   subject has content.
2. **The v1 graph is unchanged.** Recovery uses explicit, provisional `supports` edges. The Grade 1–6 graph audit
   stays a proposal.
3. **Curriculum ingestion is deterministic.** It parses a structured textbook format; there are no LLM calls (cost
   rule). A release needs an explicit review by the account owner, recorded as "not educator-reviewed".
4. **No new design is presented as approved.** No approved My Learning Year design is in the repository, so the
   tiles use the existing mathematics app's visual language (`/maths/`, `chapter.css` tokens, cards and buttons) and the directive's status rules. **Product-owner decision needed:** supply
   or confirm the tile design.
5. **Green can't appear on shipped maths content yet.** It needs educator-validated questions, and there are none.
   Browser journeys that must show green use a test-only review fixture, which is built only into test bundles and
   labelled on screen. The verification policy itself is unchanged.
6. **Evidence context is the question format.** The shared engine needs answers in two different contexts to
   demonstrate a level (the existing `demonstrated_min_contexts` = 2). Learning questions use the format
   `typed:learning-<type>@1` (integer, fraction, choice, set), so every module has at least two formats. No policy
   value was changed.
7. **A delayed check is two questions.** The shared verification needs two distinct fresh answers in the later session
   (`VERIFY_AT_LEVEL_MIN` = 2), so every module has two retention questions; any wrong answer fails the check (review).
8. **Probes are not independence.** A probe (7 × 5 when the question is 7 × 8) is evidence for its micro-skill only.
9. **The server keeps time.** Learning records are saved with the server's time, and the server refuses a delayed
   check with no work on that skill at least 6.5 days earlier. Browser tests move a synthetic learner's records into
   the past with a test-only management command (`learning_time_travel`, refused unless
   `OPENPATH_ALLOW_TIME_TRAVEL=1`, and only for pupils named "Synthetic …").
10. **"Stuck on a problem" is learner-opened.** A problem from class or coaching is offered from two grades before its
    own grade (the integration problem from Grade 10). It is never placed in the year's tiles.
11. **The exam plan starts at Grade 11** (GRE: Grade 12). Younger learners with a goal get the overlay only.
