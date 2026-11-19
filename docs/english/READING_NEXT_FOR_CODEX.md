# Reading: what is left, and how to know it is done (brief for Codex, 19 Nov 2026)

Written by the Claude session that owns the other English streams, for the session working on Reading. It builds on
what is merged: answer + evidence diagnosis (#260) and Connect the clues (#262). Nothing here changes that code.

## Where Reading stands

- Six levels, six skills (detail, sequence, cause, feelings, main idea, fact and opinion): teach, hinted practice,
  fresh check. Placement in Find my level; one recommended unit at a time on the home screen.
- Evidence and Connect the clues exist for one bounded case each (Level 3 cause, one pair of check passages).
- ICSE syllabus lines still only partly covered by Reading: Class 6 R1 (reading between the lines), Class 7 R1 (a
  wide range of themes), Class 8 R1 (following a theme through a long text), Class 8 R2 (using evidence from the
  text to support a view on character and plot).

## Ideas, in the order I would do them

1. **Evidence at every level and skill, not one case.** "Tap the sentence that shows it" after any check question,
   using each question's existing `evidence` field. Score the answer and the evidence separately (as #260 does).
   Closes Class 8 R2 once a learner chooses evidence for a view on character or plot, not only a fact.
2. **An inference skill of its own.** A seventh skill, "reading between the lines": the answer is not stated, and
   two or more clues must be put together. Connect the clues becomes its practice, generalised from the one pair.
   Closes Class 6 R1.
3. **Long texts read in parts.** One text of 600 to 1,200 words in three or four parts, with questions after each
   part and two at the end on the whole: theme, how a character changes, what the title means. Closes Class 8 R1.
4. **Theme coverage.** Tag every passage with a theme (home, community, science, nature, media, history, sport).
   At least two passages per theme at levels 4 to 6. Closes Class 7 R1.
5. **Short written answers, checked by rule.** One question per check where the learner types a few words, marked
   by keywords from the text plus the writing check's spelling list (frontend/src/english/logic/writing). No AI.
   Answers the Class 2 RW6 line too ("writes answers to questions on a passage").
6. **Enough passages.** The reservation in #262 takes check passages out of the ordinary pool. With a learner reading
   daily, the simulated learners (below) show whether any level runs short.

## How to know it is done

Each item is done only when all of these hold:

- **Tests:** unit tests for the logic and a phone-sized browser test (390 px wide) for each new screen.
- **Simulated learners:** `cd frontend && node --import tsx scripts/sim-english.mts --runs 20 --strict` still passes,
  and Reading shows no stuck sittings and no needless repeats. If a new reading mode is added, add it to that script
  so the eight kinds of learner go through it (see docs/english/SIMULATED_LEARNERS.md).
- **Syllabus:** the lines it closes are set to "covered" in content/english/syllabus/icse-class-N.json, with the
  counts in grammar-use.test.ts (GU-9) and e2e/grammar-syllabus.test.mjs updated.
- **Content screen:** every new passage file is listed in SCREENED (logic/content-screen.test.ts) and passes it.
- **Answer balance:** right answers spread evenly over the choice positions, and no right choice stands out by its
  length (the reading tests already check both; keep them green).
- **Family site:** merged to main and deployed to openpath-family, confirmed live.

## Please do not

- Change the writing check, AI writing feedback, Grammar in use, Listen and write, Listen and answer or Words; they
  are in use by the other session. Reading the writing check's spelling list is fine.
- Describe reading levels by class or age. Levels are what a learner can do.
- Call an AI model per learner answer. Content can be prepared once; checking answers stays deterministic.
