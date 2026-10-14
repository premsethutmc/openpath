# Five-capability pilot content V1 (PR #24)

**Status:** candidate content for educator review. Nothing is approved. New questions, passages and the reading
lessons were drafted with AI assistance by the developer: they are not validated and make no educational claim.

| Capability | Id |
|---|---|
| Spelling: inflected forms | `EN.FND.SPL.inflections` |
| Subject–verb agreement | `EN.GRM.VERB.sva` |
| Articles | `EN.GRM.NOUN.articles` |
| Reading: finding details | `EN.RDG.LIT.locate_detail` |
| Reading: main idea | `EN.RDG.SUM.main_idea` |

The coverage and readiness numbers are in `PILOT_CONTENT_REPORT.md`, which is generated from the content.

## 1. Audit findings

I inspected all 76 existing questions, the 14 passages they use, the 22 lessons and the prerequisite edge.

| Finding | Where | Action |
|---|---|---|
| **Lessons gave away assessment answers.** Almost every existing question's answer appeared in its own lesson. Exact copies included "The children are in the garden", "The sun rises in the east" and "___ honesty is the best policy". | All three taught capabilities. Spelling: swim, carry, cry, begin, forget, occur, visit, open, lie, panic, picnic, play, box, make, hope, run. Grammar: box of pencils, list of names, each of the students, neither the teacher nor the students, the number of students. Articles: apple, umbrella, hour, honest, university, the sun, advice, honesty, tigers, the Ganga, Mount Everest, a dog… the dog | **Lessons revised** with fresh examples (each rule unchanged). A test (PC-6) now fails if a question reserved for confirmation or a later check is revealed by its lesson |
| No independent material for after teaching | All five: every question was available for every use | **Reserved pools.** Diagnosis (existing questions), practice (reading, used only in teaching), confirmation (only the fresh check after teaching), retention (only a later check). 66 new candidate questions |
| Few questions at easier levels | 3–5 per capability below difficulty 3.5 | New questions are mostly difficulty 2–4 (the likely level for 7–11-year-olds) |
| Reading questions come two per passage | All 14 existing reading passages | See section 2 |
| All 14 "finding details" questions share one family | `rdg.*` | After the first answer, the rest count as "variants". Not changed (it affects the exposure policy); noted for review |
| No reading teaching | Both reading capabilities | A three-lesson sequence for each (section 3) |
| Possible ambiguity | `grm.art.02` "I saw a dog in the park. ___ dog was chasing a ball": "A" is grammatical if it is another dog | Flagged for the reviewer, not changed (the intended answer is clear in context; changing it would need a new version) |
| Incorrect answer keys, broken options, unknown passages, undefined misconception tags | – | None found. Every key, option, passage and tag passes the content tests (PC-2, PC-3) |
| Missing difficulty levels | Confirmation and retention questions above difficulty 4.5 | **Not filled.** The pilot targets younger learners. Older or stronger learners cannot be confirmed at their level (stated in the report) |

No existing question was changed, so no id or version changed and every recorded answer replays exactly. Only
lesson examples were changed. Lessons are teaching text, not evidence, and are referred to by id.

## 2. Reading: several questions on one passage

> **Updated in PR #25:** the engine now counts only the first answer on a passage for each skill (passage@1), for
> answers recorded from PR #25 on. Older records are unchanged. See READING_EVIDENCE_DEPENDENCE.md.

Two questions on one passage are not independent pieces of evidence. A child who misreads the passage gets both
wrong. The engine counts them as two independent answers. The scoring engine is **unchanged**; three conservative
measures limit the problem instead:

1. **Selection:** at most one question per passage in a session (checks, more practice, teaching). This applies to
   every capability with passages, not only the pilot.
2. **New content:** every new passage carries exactly one question (tested).
3. **Reporting:** the parent card says when a reading skill's answers come from fewer passages than answers.

**Proposed for review, not implemented:**
- weight answers on one passage as a group (a testlet), for example counting at most one answer per passage per
  session towards "found hard", "improving" and "shown";
- in the engine, a passage-level random effect.

Both change how evidence counts and need a separate decision.

## 3. Teaching

| Capability | Lessons | Change in this PR |
|---|---|---|
| Spelling: inflected forms | 8 | Examples changed so that none is an assessment answer. Two check questions changed (walk → paint, occur → commit) |
| Subject–verb agreement | 7 | Examples and one check changed |
| Articles | 7 | Examples and three checks changed |
| Finding details | **3 new**: finding a fact, finding details in a longer text, words that look right | |
| Main idea | **3 new**: what it is mostly about, choosing the best title, the main idea of a paragraph | |

**The reading sequence:**
1. The lesson: a rule, a worked example on its own short text, a tip, and a quick check that does not count.
2. Practice: questions from the practice and diagnosis pools.
3. A fresh confirming check, from the confirmation pool only.
4. A later check, from the retention pool only.

The lessons appear in order: the next unread lesson is chosen each time. Lesson texts are never assessment passages
(tested).

## 4. Educator review workflow

```
node tools/english/pilot/review.ts export         # docs/english/review/pilot/pilot-review.csv and .html
node tools/english/pilot/review.ts import FILE    # records decisions in content/english/pilot/reviews.json
node tools/english/pilot/review.ts report         # regenerates PILOT_CONTENT_REPORT.md
```

**The export:**
- One row for each of 201 items: 142 questions, 29 passages, 28 lessons and 2 prerequisite edges.
- Each row shows the content as the child sees it, the answer key, the tagged wrong answers, difficulty, capability,
  step, its reserved use, and its origin (existing or new).
- Each row carries a fingerprint of its exact content.
- The CSV opens in Excel or Google Sheets. The HTML page is for reading, including the passages.

**What the reviewer fills in:**

| Column | What to enter |
|---|---|
| decision | approve, reject, revise, or discuss |
| issues | incorrect answer, ambiguous, wrong difficulty, wrong skill, not age-appropriate, duplicate, cultural or context, other |
| comment | free text |
| reviewer | name |
| date | YYYY-MM-DD |

**What the import does:**
- **Records** each decision with the reviewer, date, content version (`pilot-content@1`) and fingerprint.
- **Refuses** a decision without a reviewer or date, a reject or revise without a reason, and any row whose
  content changed after export (it must be reviewed again). If anything is refused, nothing is recorded.
- **Never** changes content or marks anything approved in the app. Turning an approved question into validated
  content is a separate, visible change. A later change to an item makes its earlier decision stale automatically.

## 5. Behaviour changes in the app (selection only; no scoring changes)

- **Placement and first checks** use diagnosis questions. Practice during teaching uses diagnosis and practice
  questions (**changed in PR #25:** practice questions only, so teaching cannot use up first-check questions). The check after teaching uses confirmation questions only. A later check uses retention questions only.
  Capabilities outside the pilot are unaffected.
- **The legacy spelling module** uses diagnosis questions only.
- **Spelling words:** a confirming or later check never asks a spelling word the child has already met in practice.
- **Reading skills with lessons** are now taught. Learner B's plan changes from "ask an adult" to "teach main idea".
- **Profile guard:** a skill is never reported as "shown" while its own answers meet the "found hard" test. This
  was found while testing. After 0 of 4 right on harder main-idea questions, the engine still supported level 2
  (its prior), and the profile called it shown.

## 6. Remaining blockers before supervised testing with children

> **Superseded:** the current list is in PILOT_READINESS.md (PR #25).

1. **Educator review of all 201 rows.** None are approved.
2. **Supply.**
   - There are enough reserved questions for one confirming check and one later check per capability at
     difficulty ≤ 4. That is not enough for repeated cycles, or for learners above difficulty 4.5.
   - Grammar has no practice pool: practice uses diagnosis questions, which leaves fewer for first checks.
3. **Reading independence** is limited by selection, not modelled (section 2).
4. **Draft thresholds and policies** are unreviewed: development, rule evidence, and the pool sizes in
   `READY_MIN`.
5. **Not covered here, from the earlier readiness report:**
   - safeguarding and consent;
   - a data-protection review;
   - a session protocol.
