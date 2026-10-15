# Educator decision pack: five-capability pilot

**For:** the educator who reviews OpenPath's pilot content and rules before any child uses it.

**Status:** nothing in this pack is approved. The questions, passages and reading lessons were drafted with AI
assistance by the developer. The rules are the developer's drafts. **No AI review or synthetic test substitutes for
your decision.** Every approval must be yours, recorded with your name and a date.

**What to return:**
1. The review CSV (`docs/english/review/pilot/pilot-review.csv`), with a decision on each row: approve, reject,
   revise or discuss. Reading the HTML page alongside it is easier.
2. Your answers to decisions D1–D12 (section 8), on this document or by email.

The current state of every row is in `PILOT_CONTENT_REPORT.md`, which is regenerated from the content and your
recorded decisions.

## 1. The five capabilities and how each is assessed

| Capability | What the child does | Question formats | First check (diagnosis) | Practice (teaching only) | Fresh check after teaching | Later check |
|---|---|---|---|---|---|---|
| Spelling: inflected forms (`EN.FND.SPL.inflections`) | Writes a word with -s/-es, -ed, -ing, -er, -est | Typed into a sentence; choose the spelling | 19 (10 at difficulty ≤ 4) | 5 (one per taught step), plus generated practice words | 7 | 7 |
| Subject–verb agreement (`EN.GRM.VERB.sva`) | Writes or chooses the verb form that agrees | Typed into a sentence; choose the correct sentence | 18 (9) | 8 | 6 | 6 |
| Articles (`EN.GRM.NOUN.articles`) | Writes or chooses a, an, the, some, or no article | Typed into a sentence; choose the correct sentence | 18 (8) | 8 | 6 | 6 |
| Finding details (`EN.RDG.LIT.locate_detail`) | Reads a short text and answers a question on a stated detail | Multiple choice; a typed short answer | 14 on 7 passages (4 passages at ≤ 4) | 9, each on its own passage | 4 | 4 |
| Main idea (`EN.RDG.SUM.main_idea`) | Reads a short text and chooses what it is mostly about, the best title, or a paragraph's main point | Multiple choice | 15 on 9 passages (4 passages at ≤ 4) | 9, each on its own passage | 4 | 4 |

**Each question is reserved for one use.**
- A fresh check after teaching never uses a question the child practised or was taught with.
- A later check never uses one seen before.
- Teaching never uses first-check questions. This was fixed in PR #25: before, grammar practice could use them up.

**Reading.** A reading answer counts only once per passage (passage@1, READING_EVIDENCE_DEPENDENCE.md). The
"passages" counts above are what a check can count.

**Supply.** There is enough for one first check, one teaching cycle, one fresh check and one later check per
capability at difficulty ≤ 4. It is not enough for repeated cycles. Nothing is reserved for fresh or later checks
above difficulty 4.5, so a stronger learner cannot be confirmed at their level.

## 2. Teaching material

| Capability | Lessons | Notes |
|---|---|---|
| Spelling: inflected forms | 8 (one per spelling step): plain endings; -es; doubling in short words; dropping silent e; y to i; doubling in longer words; when not to double; tricky endings | Existing lessons. Examples revised in PR #24 so that no lesson shows an assessment answer |
| Subject–verb agreement | 7: he/she/it + s; plural subjects; two subjects with and; words between subject and verb; each/every; either…or; inverted order | Existing. Examples revised in PR #24 |
| Articles | 7: a or an; a first, then the; a/an by sound; the for one of a kind; uncountable nouns; general statements; names | Existing. Examples revised in PR #24 |
| Finding details | 3, new: finding a fact; details in a longer text; words that look right but do not answer | Read in order, one per teaching session, each followed by 3 practice questions on 3 new passages |
| Main idea | 3, new: what a text is mostly about; the best title; the main idea of a paragraph | As above |

**Each lesson has:**
- a rule;
- one or two worked examples on its own text;
- a tip;
- a quick check that does not count.

**After a lesson:**
1. **Practice.** Answers straight after a lesson can raise the estimate, but never make a skill "shown".
2. **A fresh check in a later session.** This can show the skill.
3. **A later check, about a week after it is shown.**

**Please check each lesson for:**
- accuracy;
- age-suitability;
- whether its examples could mislead (for example "always double");
- whether its quick check is fair.

## 3. Candidate prerequisite

| Assumption | Where it is used |
|---|---|
| Finding details is a prerequisite of main idea | Main idea may be found hard while finding details has not been measured. The plan then checks finding details first. If finding details is found hard too, the plan teaches it first. **No reference states this edge; it is OpenPath's own assumption** (decision D4) |

## 4. Evidence and mastery policy (current drafts)

| Term | Rule now | Where |
|---|---|---|
| Independent answer | A first try, no hint, not after feedback, not straight after a lesson on the same skill in the same session, a question not seen before, and the first answer on its reading passage | Engine updater; profile |
| Help | Hints, second tries and guided practice are recorded as help. They never count as independent | Provenance |
| Improving | At least 3 answers straight after a lesson, mostly right (a draft test: 80% sure the success rate is above half) | `development-policy@0-draft` |
| Found hard | At least 3 independent answers, mostly wrong (80% sure the success rate is below half) | `development-policy@0-draft` |
| Shown | All of these: the engine is 80% sure the level is at least the stated level; at least 3 independent answers in at least 2 question formats; at least one demonstration in a session without a lesson on that skill; and not "found hard" | Framework policy; profile |
| Confirmed | Shown, then still right at a later check | Retention |
| Not kept | The latest later check failed. The plan refreshes it first | Retention |
| Mastered (engine term, not shown to children) | Shown in two sessions at least 7 days apart | Framework policy |
| First look | At least 6 independent answers before the plan treats the first look as done | `development-policy@0-draft` |
| Fresh or later check | 4 questions | App |
| Practice after a lesson | 6 questions for grammar; 3 for reading (each on its own passage); spelling practice is 8 words, with one hand-written practice question | App |
| Prior | Every capability starts at level 4 ± 1.5 on the 1–8 scale | Framework |

**What a parent sees.** The labels are:
- shown;
- improving, awaiting confirmation;
- not enough evidence yet;
- found hard so far;
- needed help;
- due for a later check;
- not kept;
- what changed;
- what comes next.

No percentages, ranks or comparisons with other children appear.

## 5. Question difficulty

- **The scale.** Difficulty is on the framework's 1–8 scale. Every pilot question's difficulty is the developer's
  estimate (`difficulty_source: expert_estimate`). There are no calibration data: no question has been tried with
  children.
- **Discrimination.** The new questions all use the same assumed discrimination (a = 1.3).
- **Where the content sits.** The pilot content is mostly at difficulty 2–4. The proposed pilot age (D1) is 10–12.
- **What to look for.** Please flag "wrong difficulty" where a question is clearly easier or harder than its number,
  especially among the first-check questions. The order of first-check questions depends on difficulty.

## 6. Retention intervals (draft)

| Item | Now |
|---|---|
| First later check | 7 days after the skill is first shown |
| After a passed check | The interval doubles, up to 60 days |
| After a failed check | The interval halves, down to 2 days, and the plan refreshes the skill first |
| Pass rule | The session's own answers fit the retained level at least as well as one level lower |
| A session with a lesson on that skill | Never counts as a later check |

## 7. Review checklist (for each row of the CSV)

**Questions:**
- [ ] The key is correct, and no other option or answer is also correct.
- [ ] The question tests the stated skill and step, not something else (for example vocabulary or general knowledge).
- [ ] The wording, names and context suit the age group and the children's background. There is nothing unsuitable.
- [ ] The difficulty number is about right relative to the other questions.
- [ ] The tagged wrong answers name a real misconception.
- [ ] Reserved questions (fresh check, later check) are not given away by any lesson. A test checks exact text; you
  check closeness.

**Passages:**
- [ ] The text is clear, accurate and age-appropriate.
- [ ] The answer to its question is in the text, and only one option is supported.
- [ ] The text does not depend on knowledge some children will not have.

**Lessons:**
- [ ] The rule is correct as stated, and the examples follow it.
- [ ] The tip does not overgeneralise.
- [ ] The quick check is fair.

**Prerequisite:**
- [ ] The assumed order makes sense for these children.

## 8. Decisions that need your approval

| # | Decision | Proposal | If you disagree |
|---|---|---|---|
| D1 | Age range for the pilot | 10–12 | Name the range. Younger children need the content reviewed for that age |
| D2 | Every row in the CSV | Approve, reject, revise or discuss each one. Only rows you approve may be shown to a child | Rejected rows are removed or replaced, and replacements come back to you |
| D3 | `grm.art.02` ("I saw a dog in the park. ___ dog was chasing a ball") | Keep: "The" is intended. "A" is grammatical if it is another dog | Reject it, or ask for a revision |
| D4 | Finding details as a prerequisite of main idea | Keep, as a planning assumption only | Remove the edge. The plan then teaches main idea directly |
| D5 | Reading: one counted answer per passage (passage@1) | Keep | Name another rule. Any weighting scheme would need a separate change |
| D6 | "Found hard" and "improving" tests (at least 3 answers; 80% sure of more or less than half right) | Keep for the pilot | Name the numbers |
| D7 | "Shown": 3 independent answers, 2 formats, 80% sure of the level, outside a lesson | Keep for the pilot | Name the numbers |
| D8 | Later checks: first after 7 days, doubling to 60, halving to 2 | Keep | Name the intervals |
| D9 | Session lengths: 4 questions for a check; practice of 6 (grammar), 3 (reading) or 8 words (spelling) | Keep | Name the lengths |
| D10 | Minimum supply before a capability is offered: 3 first-check, 4 fresh-check and 4 later-check answers at difficulty ≤ 4 | Keep | Name the minimums |
| D11 | The pilot protocol (PILOT_PROTOCOL.md): session length, stopping rules, data retention | As drafted | Edit the protocol. The data-protection review is separate and must be done by a qualified person |
| D12 | What counts as enough review to start | Every row the pilot will show a child is approved, D1–D11 are decided, and the protocol is agreed | Name the bar |

**Record each decision with your name and the date.** Approved content becomes "validated" in the app only by a
separate, visible change that cites your recorded decisions. Your approval is not applied automatically.
