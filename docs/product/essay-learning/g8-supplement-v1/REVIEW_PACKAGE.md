# Educator review package: proposed Grade 8 supplement v1

**96 proposed questions**, `g8-supplement@1`. proposed: provisional, unreviewed. Not loaded by the app. No answer to these questions can change an estimate or verify mastery until an educator review changes their status.

Provenance: Drafted by the development team with AI assistance (Claude) on 18 October 2026, for educator review. Written to the existing competency ids, difficulty ladders (content/english/items/progressions.json), question schemas and the item-bank rules. Difficulties are expert estimates, not calibrated. Prioritised by the coverage gaps in docs/product/essay-learning/ASSESSMENT_RETENTION.md (the 'two later checks' column). No existing or pilot question is replaced or reassigned.

## What we ask a reviewer to decide, per question

1. **Key**: is the keyed answer correct, and is every other option wrong for a Grade 8 learner of standard written English (Indian and British usage accepted)?
2. **Unambiguous**: could a competent writer defend another answer? If so, revise or reject.
3. **Competency**: does it test the named competency (and not mainly vocabulary or reading)?
4. **Difficulty**: does the estimated band (b) fit? Write your own estimate. Band 5 ≈ age-typical secondary text, mostly accurate (indicatively CEFR B1); these targets are provisional.
5. **Suitable**: language and context appropriate for 12–14-year-olds in India.
6. **Decision**: approve, revise (say how) or reject.

Use `review-form.csv` (one row per question) or comment here. Decisions are recorded in `reviews.json`. Nothing changes in the app until a separate change, reviewed in turn, marks approved questions as reviewed.

## Automated checks (run: `node tools/english/supplement/main.ts --check`)

Blocking problems: **0**. Points for review: **0**.

None.

The checks are mechanical: schema, bank rules, provisional status, duplicates, word-overlap near-duplicates (≥ 60%), answer leakage from lessons and existing questions, keyed-answer and tag consistency, and an age screen. They do not judge correctness or difficulty; that is the review.

## Coverage

| Competency | Questions | b range | Steps | Proposed: independent check / delayed check |
|---|---:|---|---|---|
| Subject–verb agreement | 7 | 5–6.5 | intervening, indefinite, either_neither | 5 / 2 |
| Present and past simple | 7 | 5–6.25 | consistency_less_common | 5 / 2 |
| Progressive and perfect aspect | 5 | 5–6.25 | perfect_vs_past, perfect_just, past_perfect | 3 / 2 |
| Articles | 7 | 5–6.5 | unique_the, zero_uncountable, generic_abstract | 5 / 2 |
| Grammatical accuracy in writing | 5 | 5–6.25 | complex | 3 / 2 |
| Prepositions of time and place | 6 | 5–6.5 | since_for, by_until_during | 4 / 2 |
| Complete sentences, not fragments | 7 | 5–6.25 | ing_which | 5 / 2 |
| Avoids run-on sentences and comma splices | 4 | 5.25–6.25 | repair, transitions | 2 / 2 |
| Coordination | 7 | 5–6.25 | yet_nor_paired | 5 / 2 |
| Subordination | 4 | 5.5–6.5 | purpose_precaution, variety | 2 / 2 |
| Commas | 3 | 5.25–6 | nonessential, before_conjunction | 1 / 2 |
| Precise word choice in writing | 7 | 5.25–6.5 | precise_purpose | 5 / 2 |
| Collocations | 7 | 5–6.25 | adj_noun_adverb | 5 / 2 |
| Connectives and transitions | 7 | 5–6.25 | exact_relationship | 5 / 2 |
| Logical sequencing | 7 | 5–6.25 | logical_links | 5 / 2 |
| Paragraphing | 6 | 5–6.5 | unity, linking | 4 / 2 |

## Subject–verb agreement (`EN.GRM.VERB.sva`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Grammatical accuracy; cbse: Subject–Verb Concord.

### sup.g8.sva.01 · b 5 · intervening · delayed retention check

**Write the correct form of 'be' (is or are): The list of winners ___ pinned on the notice board.**

- **Key:** is
- **Wrong answers show:** "are" → attraction_error
- **Rationale:** Agreement with the head noun 'list' across 'of winners'; the nearer plural noun pulls towards 'are'.
- **Difficulty justification:** Ladder step "intervening" (band 5): Agreement across a phrase between subject and verb (the box of pencils is). Estimated b 5 (+0.00 from the step). Agreement with the head noun 'list' across 'of winners'; the nearer plural noun pulls towards 'are'.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sva.02 · b 5.25 · intervening · delayed retention check

**Which sentence is correct?**

- A. The flowers in the garden behind our flats needs water.
- B. The flowers in the garden behind our flats need water.
- C. The flowers in the garden behind our flats is needing water.
- D. The flowers in the garden behind our flats has needed water.

- **Key:** B. The flowers in the garden behind our flats need water.
- **Wrong answers show:** A → attraction_error; C → attraction_error; D → attraction_error
- **Rationale:** A plural subject with a long phrase (two nouns) before the verb; distractors agree with the nearer singular nouns.
- **Difficulty justification:** Ladder step "intervening" (band 5): Agreement across a phrase between subject and verb (the box of pencils is). Estimated b 5.25 (+0.25 from the step). A plural subject with a long phrase (two nouns) before the verb; distractors agree with the nearer singular nouns.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sva.03 · b 5.5 · intervening · independent check

**One word in this sentence is wrong. Type the correct word: "The price of these new running shoes are too high for me."**

- **Key:** is
- **Wrong answers show:** "are" → attraction_error
- **Rationale:** Find and fix: the singular head 'price' is separated from the verb by a plural phrase.
- **Difficulty justification:** Ladder step "intervening" (band 5): Agreement across a phrase between subject and verb (the box of pencils is). Estimated b 5.5 (+0.50 from the step). Find and fix: the singular head 'price' is separated from the verb by a plural phrase.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sva.04 · b 6 · indefinite · independent check

**Choose the correct verb: Every student and teacher in the school ___ invited to the annual day.**

- A. is
- B. have been
- C. are
- D. were

- **Key:** A. is
- **Wrong answers show:** B → attraction_error; C → attraction_error; D → attraction_error
- **Rationale:** 'Every' before joined nouns takes a singular verb, against the pull of 'and'.
- **Difficulty justification:** Ladder step "indefinite" (band 6): Indefinite pronouns and each/every (Each of the students has). Estimated b 6 (+0.00 from the step). 'Every' before joined nouns takes a singular verb, against the pull of 'and'.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sva.05 · b 6 · indefinite · independent check

**Write has or have: Neither of the two buses ___ arrived yet.**

- **Key:** has
- **Wrong answers show:** "have" → attraction_error
- **Rationale:** 'Neither of' with a plural noun still takes a singular verb in formal written English.
- **Difficulty justification:** Ladder step "indefinite" (band 6): Indefinite pronouns and each/every (Each of the students has). Estimated b 6 (+0.00 from the step). 'Neither of' with a plural noun still takes a singular verb in formal written English.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sva.06 · b 6.25 · indefinite · independent check

**Two of these sentences have an agreement mistake. Choose both.**

- A. Each of the players has a new shirt.
- B. Somebody in the class have left a bag here.
- C. The team of volunteers is meeting today.
- D. Everyone in the two classes are going on the trip.
- E. The children in the front row are singing.

- **Key:** B. Somebody in the class have left a bag here.; D. Everyone in the two classes are going on the trip.
- **Rationale:** Finds agreement errors after indefinite pronouns among correct sentences; both must be found and nothing else chosen.
- **Difficulty justification:** Ladder step "indefinite" (band 6): Indefinite pronouns and each/every (Each of the students has). Estimated b 6.25 (+0.25 from the step). Finds agreement errors after indefinite pronouns among correct sentences; both must be found and nothing else chosen.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sva.07 · b 6.5 · either_neither · independent check

**Choose the correct verb: Either my sisters or my brother ___ going to collect me.**

- A. were
- B. have been
- C. are
- D. is

- **Key:** D. is
- **Wrong answers show:** A → attraction_error; C → attraction_error
- **Rationale:** With either … or, the verb agrees with the nearer subject ('my brother'), not the first.
- **Difficulty justification:** Ladder step "either_neither" (band 7): either … or / neither … nor: agree with the nearer subject. Estimated b 6.5 (-0.50 from the step). With either … or, the verb agrees with the nearer subject ('my brother'), not the first.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Present and past simple (`EN.GRM.VERB.present_past_simple`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Grammatical accuracy; cbse: Tenses.

### sup.g8.pps.01 · b 5 · consistency_less_common · delayed retention check

**Write the past simple of the verb in brackets: Last Monday the coach (choose) ___ Meera as captain.**

- **Key:** chose
- **Wrong answers show:** "choosed" → regularised_past; "chosen" → regularised_past; "choose" → tense_shift
- **Rationale:** A less common irregular past (choose → chose), with a past time phrase.
- **Difficulty justification:** Ladder step "consistency_less_common" (band 5.75): Keeps tense consistent across a text; less common irregular forms (caught, chose, led). Estimated b 5 (-0.75 from the step). A less common irregular past (choose → chose), with a past time phrase.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.pps.02 · b 5.25 · consistency_less_common · delayed retention check

**Write the past simple of the verb in brackets: The guide (lead) ___ us through the old fort before lunch.**

- **Key:** led
- **Wrong answers show:** "leaded" → regularised_past; "lead" → tense_shift
- **Rationale:** Irregular past 'led', easily over-regularised as 'leaded'.
- **Difficulty justification:** Ladder step "consistency_less_common" (band 5.75): Keeps tense consistent across a text; less common irregular forms (caught, chose, led). Estimated b 5.25 (-0.50 from the step). Irregular past 'led', easily over-regularised as 'leaded'.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.pps.03 · b 5.5 · consistency_less_common · independent check

**Which sentence keeps the tense consistent?**

- A. We reached the station at six, but the train leaves without us.
- B. We reached the station at six, but the train had left without us.
- C. We reach the station at six, but the train left without us.
- D. We reached the station at six, but the train leave without us.

- **Key:** B. We reached the station at six, but the train had left without us.
- **Wrong answers show:** A → tense_shift; C → tense_shift; D → tense_shift
- **Rationale:** Keeps a past narrative in the past; distractors shift to the present in one clause.
- **Difficulty justification:** Ladder step "consistency_less_common" (band 5.75): Keeps tense consistent across a text; less common irregular forms (caught, chose, led). Estimated b 5.5 (-0.25 from the step). Keeps a past narrative in the past; distractors shift to the present in one clause.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.pps.04 · b 5.75 · consistency_less_common · independent check

**One verb in this short story is in the wrong tense. Type the correct word: "Ravi opened the box and finds an old letter from his grandfather."**

- **Key:** found
- **Wrong answers show:** "finds" → tense_shift; "finded" → regularised_past
- **Rationale:** Finds a tense shift inside a past narrative and restores an irregular past form.
- **Difficulty justification:** Ladder step "consistency_less_common" (band 5.75): Keeps tense consistent across a text; less common irregular forms (caught, chose, led). Estimated b 5.75 (+0.00 from the step). Finds a tense shift inside a past narrative and restores an irregular past form.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.pps.05 · b 5.75 · consistency_less_common · independent check

**Write the past simple of the verb in brackets: My uncle (bring) ___ sweets from Kolkata when he visited.**

- **Key:** brought
- **Wrong answers show:** "bringed" → regularised_past; "brang" → regularised_past
- **Rationale:** Irregular past 'brought', often confused with 'bringed' or 'brang'.
- **Difficulty justification:** Ladder step "consistency_less_common" (band 5.75): Keeps tense consistent across a text; less common irregular forms (caught, chose, led). Estimated b 5.75 (+0.00 from the step). Irregular past 'brought', often confused with 'bringed' or 'brang'.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.pps.06 · b 6 · consistency_less_common · independent check

**This diary entry should be in the past. Choose the two sentences with a tense mistake.**

- A. On Saturday we went to the science fair.
- B. My friend shows his solar oven to the judges.
- C. They asked him many questions.
- D. He answers all of them calmly.
- E. In the end he won second prize.

- **Key:** B. My friend shows his solar oven to the judges.; D. He answers all of them calmly.
- **Rationale:** Finds two present-tense slips in a past narrative; both must be found.
- **Difficulty justification:** Ladder step "consistency_less_common" (band 5.75): Keeps tense consistent across a text; less common irregular forms (caught, chose, led). Estimated b 6 (+0.25 from the step). Finds two present-tense slips in a past narrative; both must be found.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.pps.07 · b 6.25 · consistency_less_common · independent check

**Which sentence is correct?**

- A. Did she buy the tickets yesterday?
- B. Does she bought the tickets yesterday?
- C. Did she bought the tickets yesterday?
- D. Did she buys the tickets yesterday?

- **Key:** A. Did she buy the tickets yesterday?
- **Wrong answers show:** B → tense_shift; C → past_after_did; D → past_after_did
- **Rationale:** Base form after 'did' with a less common irregular verb (buy/bought) where the past form is tempting.
- **Difficulty justification:** Ladder step "consistency_less_common" (band 5.75): Keeps tense consistent across a text; less common irregular forms (caught, chose, led). Estimated b 6.25 (+0.50 from the step). Base form after 'did' with a less common irregular verb (buy/bought) where the past form is tempting.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Progressive and perfect aspect (`EN.GRM.VERB.aspect`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Grammatical accuracy; cbse: Tenses.

### sup.g8.asp.01 · b 5 · perfect_vs_past · delayed retention check

**Choose the correct verb: We ___ in this town since 2019.**

- A. lived
- B. have lived
- C. are living
- D. live

- **Key:** B. have lived
- **Wrong answers show:** A → perfect_with_finished_time
- **Rationale:** Present perfect with 'since' for a period that continues to now.
- **Difficulty justification:** Ladder step "perfect_vs_past" (band 5): Present perfect for an unfinished period; past simple for a finished time. Estimated b 5 (+0.00 from the step). Present perfect with 'since' for a period that continues to now.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.asp.02 · b 5.25 · perfect_vs_past · delayed retention check

**One verb in this sentence is wrong. Type the correct form (one word): "We have visited the planetarium two days ago."**

- **Key:** visited
- **Wrong answers show:** "have visited" → perfect_with_finished_time
- **Rationale:** A finished time ('two days ago') needs the past simple, not the present perfect.
- **Difficulty justification:** Ladder step "perfect_vs_past" (band 5): Present perfect for an unfinished period; past simple for a finished time. Estimated b 5.25 (+0.25 from the step). A finished time ('two days ago') needs the past simple, not the present perfect.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.asp.03 · b 5.5 · perfect_just · independent check

**Choose the best answer: "Is Arjun here?" "No, he ___ left."**

- A. has just
- B. just has been
- C. is just
- D. was just being

- **Key:** A. has just
- **Rationale:** Present perfect with 'just' for a very recent action.
- **Difficulty justification:** Ladder step "perfect_just" (band 5.5): Present perfect with just, already and yet. Estimated b 5.5 (+0.00 from the step). Present perfect with 'just' for a very recent action.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.asp.04 · b 6 · past_perfect · independent check

**Which sentence is correct?**

- A. By the time the doctor came, the fever goes down.
- B. By the time the doctor came, the fever went down.
- C. By the time the doctor came, the fever has gone down.
- D. By the time the doctor came, the fever had gone down.

- **Key:** D. By the time the doctor came, the fever had gone down.
- **Wrong answers show:** B → perfect_with_finished_time
- **Rationale:** Past perfect for the earlier of two past events, signalled by 'by the time'.
- **Difficulty justification:** Ladder step "past_perfect" (band 6.25): Past perfect for an earlier past event (By the time we arrived, …). Estimated b 6 (-0.25 from the step). Past perfect for the earlier of two past events, signalled by 'by the time'.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.asp.05 · b 6.25 · past_perfect · independent check

**Write the correct form of the verb in brackets (two words): When we got to the cinema, the film (already start) ___.**

- **Key:** had already started / had started already
- **Wrong answers show:** "already started" → perfect_with_finished_time; "has already started" → perfect_with_finished_time
- **Rationale:** Past perfect with 'already' for an action completed before another past action.
- **Difficulty justification:** Ladder step "past_perfect" (band 6.25): Past perfect for an earlier past event (By the time we arrived, …). Estimated b 6.25 (+0.00 from the step). Past perfect with 'already' for an action completed before another past action.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Articles (`EN.GRM.NOUN.articles`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Grammatical accuracy; cbse: Determiners.

### sup.g8.art.01 · b 5 · unique_the · delayed retention check

**Write a, an or the: We watched ___ moon rise over the lake.**

- **Key:** the
- **Wrong answers show:** "a" → article_omission
- **Rationale:** 'the' for something unique (the moon).
- **Difficulty justification:** Ladder step "unique_the" (band 5.25): the for something unique or known to everyone (the sun). Estimated b 5 (-0.25 from the step). 'the' for something unique (the moon).
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.art.02 · b 5.25 · unique_the · delayed retention check

**Which sentence is correct?**

- A. The Ganga is a longest river in India.
- B. The Ganga is the longest river in India.
- C. Ganga is longest river in the India.
- D. The Ganga is longest river in India.

- **Key:** B. The Ganga is the longest river in India.
- **Wrong answers show:** A → article_omission; C → article_omission; D → article_omission
- **Rationale:** 'the' with a superlative; distractors omit it or misuse it with a country name.
- **Difficulty justification:** Ladder step "unique_the" (band 5.25): the for something unique or known to everyone (the sun). Estimated b 5.25 (+0.00 from the step). 'the' with a superlative; distractors omit it or misuse it with a country name.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.art.03 · b 5.5 · zero_uncountable · independent check

**Choose the correct sentence.**

- A. She gave us useful information about the exam.
- B. She gave us a useful informations about the exam.
- C. She gave us an useful informations about the exam.
- D. She gave us an useful information about the exam.

- **Key:** A. She gave us useful information about the exam.
- **Wrong answers show:** B → article_with_uncountable; C → article_with_uncountable; D → article_with_uncountable
- **Rationale:** No a/an and no plural with the uncountable noun 'information'.
- **Difficulty justification:** Ladder step "zero_uncountable" (band 5.75): No a/an with uncountable nouns (advice, information, furniture). Estimated b 5.5 (-0.25 from the step). No a/an and no plural with the uncountable noun 'information'.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.art.04 · b 5.75 · zero_uncountable · independent check

**One word in this sentence must be removed. Type the word to remove: "Our class needs an equipment for the science fair."**

- **Key:** an
- **Rationale:** 'equipment' is uncountable, so the article must go.
- **Difficulty justification:** Ladder step "zero_uncountable" (band 5.75): No a/an with uncountable nouns (advice, information, furniture). Estimated b 5.75 (+0.00 from the step). 'equipment' is uncountable, so the article must go.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.art.05 · b 6 · zero_uncountable · independent check

**Two of these sentences use an article wrongly. Choose both.**

- A. The equipment in the lab is new.
- B. Can I have a piece of advice?
- C. He asked for an advice about his project.
- D. We need some luggage trolleys.
- E. They carried a heavy luggage to the bus.

- **Key:** C. He asked for an advice about his project.; E. They carried a heavy luggage to the bus.
- **Rationale:** Finds a/an used with uncountable nouns (advice, luggage) beside correct countable uses; both must be found.
- **Difficulty justification:** Ladder step "zero_uncountable" (band 5.75): No a/an with uncountable nouns (advice, information, furniture). Estimated b 6 (+0.25 from the step). Finds a/an used with uncountable nouns (advice, luggage) beside correct countable uses; both must be found.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.art.06 · b 6.25 · generic_abstract · independent check

**Which sentence makes a general statement correctly?**

- A. The patience is important for the teacher in general.
- B. The patience is important for a teacher.
- C. A patience is important for teacher.
- D. Patience is important for a teacher.

- **Key:** D. Patience is important for a teacher.
- **Wrong answers show:** B → article_with_uncountable; C → article_with_uncountable
- **Rationale:** No article with an abstract noun used in a general sense (Patience is …).
- **Difficulty justification:** Ladder step "generic_abstract" (band 6.75): General statements and abstract nouns (Tigers are …; Honesty is …). Estimated b 6.25 (-0.50 from the step). No article with an abstract noun used in a general sense (Patience is …).
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.art.07 · b 6.5 · generic_abstract · independent check

**Which sentence is a correct general statement about elephants as a kind of animal?**

- A. The elephants need large forests to survive.
- B. An elephants need large forests to survive.
- C. Elephants need large forests to survive.
- D. Elephant need large forests to survive.

- **Key:** C. Elephants need large forests to survive.
- **Wrong answers show:** A → article_omission; B → article_omission; D → article_omission
- **Rationale:** Zero article with a plural noun for a general statement; 'The elephants' would mean particular ones.
- **Difficulty justification:** Ladder step "generic_abstract" (band 6.75): General statements and abstract nouns (Tigers are …; Honesty is …). Estimated b 6.5 (-0.25 from the step). Zero article with a plural noun for a general statement; 'The elephants' would mean particular ones.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Grammatical accuracy in writing (`EN.WRT.ACC.grammar`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Grammatical accuracy.

### sup.g8.gra.01 · b 5 · complex · delayed retention check

**Which sentence in this short paragraph has a grammar mistake?**

- A. Most of them are growing well.
- B. One of the saplings have dried up, sadly.
- C. We water them every Friday.
- D. Our class planted twenty trees in June.

- **Key:** B. One of the saplings have dried up, sadly.
- **Rationale:** Agreement after 'One of' in a short text; the other sentences are correct.
- **Difficulty justification:** Ladder step "complex" (band 5.5): Errors in more complex structures (agreement after pronouns, conditionals). Estimated b 5 (-0.50 from the step). Agreement after 'One of' in a short text; the other sentences are correct.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.gra.02 · b 5.25 · complex · delayed retention check

**One word in this sentence is wrong. Type the correct word: "If it will rain tomorrow, the match will be cancelled."**

- **Key:** rains
- **Wrong answers show:** "will" → tense_shift
- **Rationale:** First conditional: present tense in the if-clause, not 'will'.
- **Difficulty justification:** Ladder step "complex" (band 5.5): Errors in more complex structures (agreement after pronouns, conditionals). Estimated b 5.25 (-0.25 from the step). First conditional: present tense in the if-clause, not 'will'.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.gra.03 · b 5.5 · complex · independent check

**Which sentence has a grammar mistake?**

- A. Neither the teacher nor the students was ready.
- B. Mathematics is my favourite subject.
- C. She is one of the students who always help others.
- D. The news about the floods was worrying.

- **Key:** A. Neither the teacher nor the students was ready.
- **Rationale:** neither … nor with a nearer plural subject; correct sentences include traps that look wrong (news was, Mathematics is).
- **Difficulty justification:** Ladder step "complex" (band 5.5): Errors in more complex structures (agreement after pronouns, conditionals). Estimated b 5.5 (+0.00 from the step). neither … nor with a nearer plural subject; correct sentences include traps that look wrong (news was, Mathematics is).
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.gra.04 · b 5.75 · complex · independent check

**Two sentences in this notice have grammar mistakes. Choose both.**

- A. The library will be closed on Friday.
- B. Students who has borrowed books must return them by Thursday.
- C. Late returns will be charged a small fine.
- D. If you will lose your card, please tell the librarian at once.
- E. Thank you for your help.

- **Key:** B. Students who has borrowed books must return them by Thursday.; D. If you will lose your card, please tell the librarian at once.
- **Rationale:** Finds agreement and conditional-tense errors in a realistic notice; both must be found.
- **Difficulty justification:** Ladder step "complex" (band 5.5): Errors in more complex structures (agreement after pronouns, conditionals). Estimated b 5.75 (+0.25 from the step). Finds agreement and conditional-tense errors in a realistic notice; both must be found.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.gra.05 · b 6.25 · complex · independent check

**Which sentence is written correctly?**

- A. Walking to school, sudden rain caught.
- B. Walking to school, it was raining on me suddenly.
- C. Walking to school, the rain started suddenly.
- D. Walking to school, I was caught in sudden rain.

- **Key:** D. Walking to school, I was caught in sudden rain.
- **Rationale:** Avoids a dangling participle: the walker must be the subject of the main clause.
- **Difficulty justification:** Ladder step "complex" (band 5.5): Errors in more complex structures (agreement after pronouns, conditionals). Estimated b 6.25 (+0.75 from the step). Avoids a dangling participle: the walker must be the subject of the main clause.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Prepositions of time and place (`EN.GRM.PREP.time_place`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Grammatical accuracy.

### sup.g8.pre.01 · b 5 · since_for · delayed retention check

**Write since or for: My grandmother has lived in Pune ___ forty years.**

- **Key:** for
- **Wrong answers show:** "since" → since_for_confusion
- **Rationale:** 'for' with a length of time.
- **Difficulty justification:** Ladder step "since_for" (band 5.25): since (a point in time) against for (a length of time). Estimated b 5 (-0.25 from the step). 'for' with a length of time.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.pre.02 · b 5.25 · since_for · delayed retention check

**Write since or for: The shop on our corner has been closed ___ last Diwali.**

- **Key:** since
- **Wrong answers show:** "for" → since_for_confusion
- **Rationale:** 'since' with a point in time, here a festival rather than a year.
- **Difficulty justification:** Ladder step "since_for" (band 5.25): since (a point in time) against for (a length of time). Estimated b 5.25 (+0.00 from the step). 'since' with a point in time, here a festival rather than a year.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.pre.03 · b 5.5 · since_for · independent check

**Which sentence is correct?**

- A. I have known Anil since three years.
- B. I have known Anil for three years.
- C. I know Anil since three years.
- D. I am knowing Anil for three years.

- **Key:** B. I have known Anil for three years.
- **Wrong answers show:** A → since_for_confusion; C → since_for_confusion
- **Rationale:** 'for' with a length of time in the present perfect; distractors misuse 'since' and the tense.
- **Difficulty justification:** Ladder step "since_for" (band 5.25): since (a point in time) against for (a length of time). Estimated b 5.5 (+0.25 from the step). 'for' with a length of time in the present perfect; distractors misuse 'since' and the tense.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.pre.04 · b 6 · by_until_during · independent check

**Choose the correct word: Please hand in your project ___ Friday at the latest.**

- A. by
- B. during
- C. since
- D. until

- **Key:** A. by
- **Wrong answers show:** C → since_for_confusion; D → in_on_at_confusion
- **Rationale:** 'by' for a deadline, against 'until' for a continuing state.
- **Difficulty justification:** Ladder step "by_until_during" (band 6.25): by against until, and during against while. Estimated b 6 (-0.25 from the step). 'by' for a deadline, against 'until' for a continuing state.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.pre.05 · b 6.25 · by_until_during · independent check

**Write during or while: My phone rang ___ the science test.**

- **Key:** during
- **Wrong answers show:** "while" → in_on_at_confusion
- **Rationale:** 'during' before a noun phrase; 'while' needs a clause.
- **Difficulty justification:** Ladder step "by_until_during" (band 6.25): by against until, and during against while. Estimated b 6.25 (+0.00 from the step). 'during' before a noun phrase; 'while' needs a clause.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.pre.06 · b 6.5 · by_until_during · independent check

**Which sentence is correct?**

- A. We waited during the bus came.
- B. We waited while the bus came by six.
- C. We waited by the bus came.
- D. We waited until the bus came.

- **Key:** D. We waited until the bus came.
- **Wrong answers show:** A → in_on_at_confusion; C → in_on_at_confusion
- **Rationale:** 'until' for an action continuing up to a moment; 'by' and 'during' do not fit before a clause here.
- **Difficulty justification:** Ladder step "by_until_during" (band 6.25): by against until, and during against while. Estimated b 6.5 (+0.25 from the step). 'until' for an action continuing up to a moment; 'by' and 'during' do not fit before a clause here.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Complete sentences, not fragments (`EN.SEN.CMP.fragments`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Grammatical accuracy.

### sup.g8.fra.01 · b 5 · ing_which · delayed retention check

**Which is a complete sentence?**

- A. Hoping to finish the model before the exhibition.
- B. We worked late, hoping to finish the model before the exhibition.
- C. Hoping to finish the model. Before the exhibition.
- D. Which we hoped to finish before the exhibition.

- **Key:** B. We worked late, hoping to finish the model before the exhibition.
- **Wrong answers show:** A → missing_verb; C → missing_verb; D → subordinate_fragment
- **Rationale:** An -ing phrase attached to a main clause, against -ing and which fragments.
- **Difficulty justification:** Ladder step "ing_which" (band 5.5): Avoids -ing and which fragments in longer writing. Estimated b 5 (-0.50 from the step). An -ing phrase attached to a main clause, against -ing and which fragments.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.fra.02 · b 5.25 · ing_which · delayed retention check

**Which is written as complete sentences?**

- A. The old bridge was closed, which made everyone late.
- B. The old bridge closed. Making everyone late.
- C. The old bridge, which made everyone late.
- D. The old bridge was closed. Which made everyone late.

- **Key:** A. The old bridge was closed, which made everyone late.
- **Wrong answers show:** B → missing_verb; C → missing_verb; D → subordinate_fragment
- **Rationale:** A which-clause attached with a comma, against which and -ing fragments.
- **Difficulty justification:** Ladder step "ing_which" (band 5.5): Avoids -ing and which fragments in longer writing. Estimated b 5.25 (-0.25 from the step). A which-clause attached with a comma, against which and -ing fragments.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.fra.03 · b 5.5 · ing_which · independent check

**Which of these is a fragment, not a sentence?**

- A. Our neighbour waters her plants daily.
- B. Every evening, the street lights come on at six.
- C. The children ran across the field.
- D. Running across the field with their kites.

- **Key:** D. Running across the field with their kites.
- **Rationale:** Spots an -ing phrase standing alone among complete sentences.
- **Difficulty justification:** Ladder step "ing_which" (band 5.5): Avoids -ing and which fragments in longer writing. Estimated b 5.5 (+0.00 from the step). Spots an -ing phrase standing alone among complete sentences.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.fra.05 · b 5.75 · ing_which · independent check

**Two of these are fragments. Choose both.**

- A. Although the shop was open.
- B. The shop was open until nine.
- C. Which nobody had seen before.
- D. Nobody had seen it before.
- E. When the rain stopped, we went out.

- **Key:** A. Although the shop was open.; C. Which nobody had seen before.
- **Rationale:** Finds a subordinate and a which fragment beside complete sentences, one of which begins with a subordinate clause.
- **Difficulty justification:** Ladder step "ing_which" (band 5.5): Avoids -ing and which fragments in longer writing. Estimated b 5.75 (+0.25 from the step). Finds a subordinate and a which fragment beside complete sentences, one of which begins with a subordinate clause.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.fra.06 · b 6 · ing_which · independent check

**How should this be corrected? "The project was finished on time. Because everyone helped."**

- A. Because everyone helped. The project was finished on time.
- B. The project was finished on time. Because everyone, helped.
- C. The project was finished on time because everyone helped.
- D. The project was finished. On time because everyone helped.

- **Key:** C. The project was finished on time because everyone helped.
- **Wrong answers show:** A → subordinate_fragment; B → subordinate_fragment; D → subordinate_fragment
- **Rationale:** Repairs a because-fragment by joining it to the main clause; distractors move or keep the fragment.
- **Difficulty justification:** Ladder step "ing_which" (band 5.5): Avoids -ing and which fragments in longer writing. Estimated b 6 (+0.50 from the step). Repairs a because-fragment by joining it to the main clause; distractors move or keep the fragment.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.fra.07 · b 6.25 · ing_which · independent check

**In this short paragraph, which part is a fragment? (A) The museum opened a new gallery last month. (B) It shows tools used by farmers long ago. (C) Including a plough made entirely of wood. (D) Many schools have already visited it.**

- A. A
- B. B
- C. C
- D. D

- **Key:** C. C
- **Rationale:** Finds an -ing ('Including …') fragment inside a paragraph of longer sentences.
- **Difficulty justification:** Ladder step "ing_which" (band 5.5): Avoids -ing and which fragments in longer writing. Estimated b 6.25 (+0.75 from the step). Finds an -ing ('Including …') fragment inside a paragraph of longer sentences.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.fra.04 · b 5.5 · ing_which · independent check

**Which correction turns this fragment into a sentence? "Leaving early to avoid the traffic."**

- A. Leaving early, to avoid the traffic.
- B. We left early to avoid the traffic.
- C. Leaving early. To avoid the traffic.
- D. Which left early to avoid the traffic.

- **Key:** B. We left early to avoid the traffic.
- **Wrong answers show:** A → missing_verb; C → missing_verb; D → subordinate_fragment
- **Rationale:** Repairs an -ing fragment by giving it a subject and a finite verb.
- **Difficulty justification:** Ladder step "ing_which" (band 5.5): Avoids -ing and which fragments in longer writing. Estimated b 5.5 (+0.00 from the step). Repairs an -ing fragment by giving it a subject and a finite verb.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Avoids run-on sentences and comma splices (`EN.SEN.CMP.run_ons`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Grammatical accuracy; Coherence and cohesion.

### sup.g8.run.01 · b 5.25 · repair · delayed retention check

**How should this be corrected? "The library was quiet, we could study well."**

- A. The library was quiet we could study well.
- B. The library was quiet, so we could study well.
- C. The library, was quiet we could study well.
- D. The library was quiet, we could, study well.

- **Key:** B. The library was quiet, so we could study well.
- **Wrong answers show:** A → fused_sentence; C → fused_sentence
- **Rationale:** Repairs a comma splice with 'so'.
- **Difficulty justification:** Ladder step "repair" (band 5.25): Repairs run-ons with a conjunction or subordination. Estimated b 5.25 (+0.00 from the step). Repairs a comma splice with 'so'.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.run.02 · b 5.5 · repair · delayed retention check

**Which is written correctly?**

- A. When it started to rain, we went inside.
- B. When it started to rain. We went inside.
- C. It started to rain, we went inside.
- D. It started to rain we went inside.

- **Key:** A. When it started to rain, we went inside.
- **Wrong answers show:** B → over_fragmenting; C → comma_splice; D → fused_sentence
- **Rationale:** Subordination as the repair, against a splice, a fused sentence and a fragment.
- **Difficulty justification:** Ladder step "repair" (band 5.25): Repairs run-ons with a conjunction or subordination. Estimated b 5.5 (+0.25 from the step). Subordination as the repair, against a splice, a fused sentence and a fragment.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.run.03 · b 6 · transitions · independent check

**Which sentence is punctuated correctly?**

- A. The tickets were sold out however we watched it online.
- B. The tickets were sold out, however we watched it online.
- C. The tickets were sold out, however, we watched it online.
- D. The tickets were sold out; however, we watched it online.

- **Key:** D. The tickets were sold out; however, we watched it online.
- **Wrong answers show:** A → fused_sentence; B → comma_splice; C → comma_splice
- **Rationale:** A semicolon before 'however' joining two clauses; a comma alone makes a splice.
- **Difficulty justification:** Ladder step "transitions" (band 6.25): Punctuates transitions (however, therefore) between clauses. Estimated b 6 (-0.25 from the step). A semicolon before 'however' joining two clauses; a comma alone makes a splice.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.run.04 · b 6.25 · transitions · independent check

**Which is written correctly?**

- A. Our team practised every day, therefore we won the final.
- B. Our team practised every day therefore we won the final.
- C. Our team practised every day. Therefore, we won the final.
- D. Our team practised every day, therefore, we won the final.

- **Key:** C. Our team practised every day. Therefore, we won the final.
- **Wrong answers show:** A → comma_splice; B → fused_sentence; D → comma_splice
- **Rationale:** A full stop (or semicolon) before 'Therefore'; distractors join two clauses with commas or nothing.
- **Difficulty justification:** Ladder step "transitions" (band 6.25): Punctuates transitions (however, therefore) between clauses. Estimated b 6.25 (+0.00 from the step). A full stop (or semicolon) before 'Therefore'; distractors join two clauses with commas or nothing.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Coordination (`EN.SEN.CMB.coordination`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Coherence and cohesion.

### sup.g8.coo.01 · b 5 · yet_nor_paired · delayed retention check

**Choose the best joining word: The test was difficult, ___ most of us finished it on time.**

- A. so
- B. yet
- C. or
- D. for

- **Key:** B. yet
- **Wrong answers show:** A → wrong_coordinator; C → wrong_coordinator
- **Rationale:** 'yet' for an unexpected contrast.
- **Difficulty justification:** Ladder step "yet_nor_paired" (band 5.5): yet, nor and paired forms (either … or, neither … nor), and avoids long chains of and. Estimated b 5 (-0.50 from the step). 'yet' for an unexpected contrast.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.coo.02 · b 5.25 · yet_nor_paired · delayed retention check

**Write the missing word: My brother does not like spinach, ___ does he like peas.**

- **Key:** nor
- **Wrong answers show:** "or" → wrong_coordinator; "and" → wrong_coordinator
- **Rationale:** 'nor' adds a second negative and takes inverted word order (nor does he).
- **Difficulty justification:** Ladder step "yet_nor_paired" (band 5.5): yet, nor and paired forms (either … or, neither … nor), and avoids long chains of and. Estimated b 5.25 (-0.25 from the step). 'nor' adds a second negative and takes inverted word order (nor does he).
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.coo.03 · b 5.5 · yet_nor_paired · independent check

**Which sentence best combines the ideas without a long chain of 'and'?**

- A. We packed our bags, caught the bus and, after reaching the camp, set up our tents.
- B. We packed our bags and caught the bus and reached the camp and set up our tents.
- C. We packed our bags, and we caught, the bus and set up our tents.
- D. We packed our bags and we caught the bus and we reached the camp and we set up our tents.

- **Key:** A. We packed our bags, caught the bus and, after reaching the camp, set up our tents.
- **Wrong answers show:** B → and_chaining; D → and_chaining
- **Rationale:** Avoids chaining with 'and' by listing actions and using a time phrase.
- **Difficulty justification:** Ladder step "yet_nor_paired" (band 5.5): yet, nor and paired forms (either … or, neither … nor), and avoids long chains of and. Estimated b 5.5 (+0.00 from the step). Avoids chaining with 'and' by listing actions and using a time phrase.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.coo.04 · b 5.5 · yet_nor_paired · independent check

**Which sentence uses the paired words correctly?**

- A. You can take either the train nor the bus.
- B. You can take the train either or the bus.
- C. You can either take the train or the bus.
- D. You can take either the train or the bus.

- **Key:** D. You can take either the train or the bus.
- **Wrong answers show:** A → wrong_coordinator; B → wrong_coordinator
- **Rationale:** either … or placed before parallel parts; distractors misplace 'either' or mix in 'nor'. Reviewer: 'either take the train or the bus' is common informally; the key follows the parallel-structure rule taught for formal writing.
- **Difficulty justification:** Ladder step "yet_nor_paired" (band 5.5): yet, nor and paired forms (either … or, neither … nor), and avoids long chains of and. Estimated b 5.5 (+0.00 from the step). either … or placed before parallel parts; distractors misplace 'either' or mix in 'nor'. Reviewer: 'either take the train or the bus' is common informally; the key follows the parallel-structure rule taught for formal writing.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.coo.05 · b 5.75 · yet_nor_paired · independent check

**Write the missing word: Both the captain ___ the coach praised the young bowler.**

- **Key:** and
- **Wrong answers show:** "or" → wrong_coordinator; "nor" → wrong_coordinator
- **Rationale:** both … and as a paired form.
- **Difficulty justification:** Ladder step "yet_nor_paired" (band 5.5): yet, nor and paired forms (either … or, neither … nor), and avoids long chains of and. Estimated b 5.75 (+0.25 from the step). both … and as a paired form.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.coo.06 · b 6 · yet_nor_paired · independent check

**Which sentence is correct?**

- A. Neither the fan nor the lights was working.
- B. Neither the fan or the lights were working.
- C. Neither the fan nor the lights were working.
- D. Neither the fan and the lights were working.

- **Key:** C. Neither the fan nor the lights were working.
- **Wrong answers show:** B → wrong_coordinator; D → wrong_coordinator
- **Rationale:** neither … nor with the right pair and agreement with the nearer subject.
- **Difficulty justification:** Ladder step "yet_nor_paired" (band 5.5): yet, nor and paired forms (either … or, neither … nor), and avoids long chains of and. Estimated b 6 (+0.50 from the step). neither … nor with the right pair and agreement with the nearer subject.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.coo.07 · b 6.25 · yet_nor_paired · independent check

**Two of these sentences use a joining word that does not fit the meaning. Choose both.**

- A. It was cold, yet he wore only a T-shirt.
- B. She was tired, so she went to bed early.
- C. He studied hard, so he failed the test.
- D. We can walk, or we can take an auto.
- E. The shop had a sale, yet we bought far more than we planned.

- **Key:** C. He studied hard, so he failed the test.; E. The shop had a sale, yet we bought far more than we planned.
- **Rationale:** Judges whether the coordinator fits the logic (so, yet, or); two misfits must be found.
- **Difficulty justification:** Ladder step "yet_nor_paired" (band 5.5): yet, nor and paired forms (either … or, neither … nor), and avoids long chains of and. Estimated b 6.25 (+0.75 from the step). Judges whether the coordinator fits the logic (so, yet, or); two misfits must be found.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Subordination (`EN.SEN.CMB.subordination`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Coherence and cohesion.

### sup.g8.sub.01 · b 5.5 · purpose_precaution · delayed retention check

**Choose the best joining words: Take an umbrella ___ it rains on the way home.**

- A. so that
- B. in case
- C. unless
- D. whereas

- **Key:** B. in case
- **Wrong answers show:** A → wrong_relationship; C → wrong_relationship; D → wrong_relationship
- **Rationale:** 'in case' for a precaution, against purpose ('so that'), condition and contrast.
- **Difficulty justification:** Ladder step "purpose_precaution" (band 5.75): Purpose and precaution (so that, in case). Estimated b 5.5 (-0.25 from the step). 'in case' for a precaution, against purpose ('so that'), condition and contrast.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sub.02 · b 5.75 · purpose_precaution · delayed retention check

**Which sentence best combines the ideas? "Neha set two alarms. She did not want to miss the early train."**

- A. Neha set two alarms so that she would not miss the early train.
- B. Neha set two alarms although she did not want to miss the early train.
- C. So that Neha set two alarms, she did not miss the early train.
- D. Neha set two alarms in case she wanted to miss the early train.

- **Key:** A. Neha set two alarms so that she would not miss the early train.
- **Wrong answers show:** B → wrong_relationship; C → dangling_subordinate; D → wrong_relationship
- **Rationale:** Combines with 'so that' for purpose; distractors give the wrong relationship or a broken structure.
- **Difficulty justification:** Ladder step "purpose_precaution" (band 5.75): Purpose and precaution (so that, in case). Estimated b 5.75 (+0.00 from the step). Combines with 'so that' for purpose; distractors give the wrong relationship or a broken structure.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sub.03 · b 6.25 · variety · independent check

**Choose the best joining word: Rahul enjoys loud music, ___ his sister prefers silence while she reads.**

- A. in case
- B. since
- C. so that
- D. whereas

- **Key:** D. whereas
- **Wrong answers show:** A → wrong_relationship; B → wrong_relationship; C → wrong_relationship
- **Rationale:** 'whereas' for a direct contrast between two people.
- **Difficulty justification:** Ladder step "variety" (band 6.5): Less common subordinators and positions (since meaning because, whereas). Estimated b 6.25 (-0.25 from the step). 'whereas' for a direct contrast between two people.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sub.04 · b 6.5 · variety · independent check

**In which sentence does 'since' mean 'because'?**

- A. I have studied French since I was ten.
- B. Since the summer holidays, the park has been closed.
- C. Since you are already here, you can help us set up.
- D. He has not called since Monday.

- **Key:** C. Since you are already here, you can help us set up.
- **Wrong answers show:** A → wrong_relationship; B → wrong_relationship; D → wrong_relationship
- **Rationale:** A less common use of 'since' as a reason subordinator, against its time meaning.
- **Difficulty justification:** Ladder step "variety" (band 6.5): Less common subordinators and positions (since meaning because, whereas). Estimated b 6.5 (+0.00 from the step). A less common use of 'since' as a reason subordinator, against its time meaning.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Commas (`EN.GRM.PUN.commas`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Orthographic control.

### sup.g8.com.01 · b 5.25 · nonessential · delayed retention check

**Which sentence is punctuated correctly?**

- A. Dr Rao our family doctor, lives next door.
- B. Dr Rao, our family doctor, lives next door.
- C. Dr Rao our, family doctor lives next door.
- D. Dr Rao, our family doctor lives next door.

- **Key:** B. Dr Rao, our family doctor, lives next door.
- **Rationale:** A pair of commas around a non-essential phrase (an appositive).
- **Difficulty justification:** Ladder step "nonessential" (band 5.25): A pair of commas around non-essential information. Estimated b 5.25 (+0.00 from the step). A pair of commas around a non-essential phrase (an appositive).
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.com.02 · b 5.75 · before_conjunction · delayed retention check

**Which sentence needs a comma before the joining word, and has it?**

- A. I wanted to go to the fair, but my parents were busy.
- B. She bought apples, and oranges.
- C. He was tired but, happy.
- D. We visited the fort, and the museum.

- **Key:** A. I wanted to go to the fair, but my parents were busy.
- **Rationale:** A comma before 'but' joining two full clauses; the distractors put a comma before words or phrases.
- **Difficulty justification:** Ladder step "before_conjunction" (band 5.75): A comma before a conjunction joining two clauses; not a comma alone (splice). Estimated b 5.75 (+0.00 from the step). A comma before 'but' joining two full clauses; the distractors put a comma before words or phrases.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.com.03 · b 6 · nonessential · independent check

**Choose the two places where a comma is needed: "The Taj Mahal which was built in the seventeenth century attracts millions of visitors every year."**

- A. after 'Mahal'
- B. after 'built'
- C. after 'century'
- D. after 'attracts'
- E. after 'visitors'

- **Key:** A. after 'Mahal'; C. after 'century'
- **Rationale:** A pair of commas around a non-defining clause about something unique; both are needed.
- **Difficulty justification:** Ladder step "nonessential" (band 5.25): A pair of commas around non-essential information. Estimated b 6 (+0.75 from the step). A pair of commas around a non-defining clause about something unique; both are needed.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Precise word choice in writing (`EN.VOC.USE.word_choice`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Vocabulary range; Propositional precision.

### sup.g8.wch.01 · b 5.25 · precise_purpose · delayed retention check

**Which sentence is the most precise for a school notice?**

- A. The meeting is sometime next week.
- B. The meeting is on Tuesday at 3 p.m. in Room 12.
- C. The meeting is soon, in a room.
- D. There will be a meeting, probably.

- **Key:** B. The meeting is on Tuesday at 3 p.m. in Room 12.
- **Wrong answers show:** A → vague_word; C → vague_word; D → vague_word
- **Rationale:** Precise time and place suit a notice; distractors are vague.
- **Difficulty justification:** Ladder step "precise_purpose" (band 5.75): Chooses wording that is precise and suits the purpose (report, story, notice). Estimated b 5.25 (-0.50 from the step). Precise time and place suit a notice; distractors are vague.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.wch.02 · b 5.5 · precise_purpose · delayed retention check

**Choose the most precise verb for a news report: The river ___ its banks after three days of rain.**

- A. overflowed
- B. got
- C. went over
- D. did

- **Key:** A. overflowed
- **Wrong answers show:** B → vague_word; C → vague_word; D → vague_word
- **Rationale:** A precise verb (overflowed) against vague, general verbs.
- **Difficulty justification:** Ladder step "precise_purpose" (band 5.75): Chooses wording that is precise and suits the purpose (report, story, notice). Estimated b 5.5 (-0.25 from the step). A precise verb (overflowed) against vague, general verbs.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.wch.03 · b 5.75 · precise_purpose · independent check

**Which word best replaces 'nice' in a book review? "The ending was nice."**

- A. good stuff
- B. okay
- C. thing
- D. moving

- **Key:** D. moving
- **Wrong answers show:** A → vague_word; B → vague_word; C → vague_word
- **Rationale:** A precise adjective that says how the ending affected the reader.
- **Difficulty justification:** Ladder step "precise_purpose" (band 5.75): Chooses wording that is precise and suits the purpose (report, story, notice). Estimated b 5.75 (+0.00 from the step). A precise adjective that says how the ending affected the reader.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.wch.07 · b 6.5 · precise_purpose · independent check

**Write a more precise word for 'said' that shows the speaker was very quiet. It starts with w: "Don't wake the baby," she w_______.**

- **Key:** whispered
- **Wrong answers show:** "said" → vague_word
- **Rationale:** Recalls a precise speech verb that conveys manner.
- **Difficulty justification:** Ladder step "precise_purpose" (band 5.75): Chooses wording that is precise and suits the purpose (report, story, notice). Estimated b 6.5 (+0.75 from the step). Recalls a precise speech verb that conveys manner.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.wch.04 · b 5.75 · precise_purpose · independent check

**In which sentence is the word in capitals used correctly?**

- A. The FRIENDLY mountain was covered in snow all year.
- B. The rain was FRIENDLY on our picnic and ruined it.
- C. The two teams had a FRIENDLY rivalry and shook hands after the match.
- D. The soup was so FRIENDLY that I asked for more.

- **Key:** C. The two teams had a FRIENDLY rivalry and shook hands after the match.
- **Wrong answers show:** A → misused_advanced_word; B → misused_advanced_word; D → misused_advanced_word
- **Rationale:** Judges whether a word fits its context; the distractors misuse it.
- **Difficulty justification:** Ladder step "precise_purpose" (band 5.75): Chooses wording that is precise and suits the purpose (report, story, notice). Estimated b 5.75 (+0.00 from the step). Judges whether a word fits its context; the distractors misuse it.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.wch.06 · b 6.25 · precise_purpose · independent check

**Choose the two sentences where the word in capitals is used precisely and correctly.**

- A. The scientist made a CAREFUL measurement of the temperature.
- B. The road was so ANCIENT that it was built last year.
- C. The volunteers were GENEROUS with their time.
- D. She ate a HUMBLE amount of rice, so she was very full.
- E. The explanation was so VIVID that nobody could picture it.

- **Key:** A. The scientist made a CAREFUL measurement of the temperature.; C. The volunteers were GENEROUS with their time.
- **Rationale:** Precise use against words that contradict their context; both correct uses must be found.
- **Difficulty justification:** Ladder step "precise_purpose" (band 5.75): Chooses wording that is precise and suits the purpose (report, story, notice). Estimated b 6.25 (+0.50 from the step). Precise use against words that contradict their context; both correct uses must be found.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.wch.05 · b 6 · precise_purpose · independent check

**Which sentence suits a formal letter to the principal?**

- A. We really want a new water cooler, it's super hot.
- B. I am writing to request a new water cooler for our classroom.
- C. Give us a water cooler, please, we're melting here.
- D. Hey, can we get a cooler or something?

- **Key:** B. I am writing to request a new water cooler for our classroom.
- **Wrong answers show:** A → vague_word; C → vague_word; D → vague_word
- **Rationale:** Formal wording that suits the purpose and reader; distractors are informal or exaggerated.
- **Difficulty justification:** Ladder step "precise_purpose" (band 5.75): Chooses wording that is precise and suits the purpose (report, story, notice). Estimated b 6 (+0.25 from the step). Formal wording that suits the purpose and reader; distractors are informal or exaggerated.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Collocations (`EN.VOC.REL.collocations`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Vocabulary control.

### sup.g8.col.01 · b 5 · adj_noun_adverb · delayed retention check

**Choose the word that sounds natural: 'We had to drive slowly because of the ___ traffic.'**

- A. big
- B. heavy
- C. strong
- D. thick

- **Key:** B. heavy
- **Wrong answers show:** A → word_by_word; C → word_by_word; D → word_by_word
- **Rationale:** Adjective–noun collocation (heavy traffic).
- **Difficulty justification:** Ladder step "adj_noun_adverb" (band 5.5): Adjective–noun and adverb collocations (heavy rain, strong argument, deeply sorry). Estimated b 5 (-0.50 from the step). Adjective–noun collocation (heavy traffic).
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.col.02 · b 5.25 · adj_noun_adverb · delayed retention check

**Choose the word that sounds natural: 'Grandpa likes his tea very ___.'**

- A. strong
- B. hard
- C. powerful
- D. heavy

- **Key:** A. strong
- **Wrong answers show:** B → word_by_word; C → word_by_word; D → word_by_word
- **Rationale:** strong tea, against near-synonyms that do not collocate.
- **Difficulty justification:** Ladder step "adj_noun_adverb" (band 5.5): Adjective–noun and adverb collocations (heavy rain, strong argument, deeply sorry). Estimated b 5.25 (-0.25 from the step). strong tea, against near-synonyms that do not collocate.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.col.03 · b 5.5 · adj_noun_adverb · independent check

**Write make or do: Please don't ___ a noise while the baby is sleeping.**

- **Key:** make
- **Wrong answers show:** "do" → make_do_confusion
- **Rationale:** make a noise, a fixed verb–noun collocation.
- **Difficulty justification:** Ladder step "adj_noun_adverb" (band 5.5): Adjective–noun and adverb collocations (heavy rain, strong argument, deeply sorry). Estimated b 5.5 (+0.00 from the step). make a noise, a fixed verb–noun collocation.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.col.04 · b 5.5 · adj_noun_adverb · independent check

**Choose the adverb that sounds natural: 'I am ___ sorry for being late.'**

- A. highly
- B. strongly
- C. heavily
- D. deeply

- **Key:** D. deeply
- **Wrong answers show:** A → word_by_word; B → word_by_word; C → word_by_word
- **Rationale:** Adverb collocation (deeply sorry).
- **Difficulty justification:** Ladder step "adj_noun_adverb" (band 5.5): Adjective–noun and adverb collocations (heavy rain, strong argument, deeply sorry). Estimated b 5.5 (+0.00 from the step). Adverb collocation (deeply sorry).
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.col.05 · b 5.75 · adj_noun_adverb · independent check

**Which sentence sounds natural?**

- A. She took a strong argument for longer lunch breaks.
- B. She gave a strong argument for longer lunch breaks.
- C. She made a strong argument for longer lunch breaks.
- D. She did a strong argument for longer lunch breaks.

- **Key:** C. She made a strong argument for longer lunch breaks.
- **Wrong answers show:** A → word_by_word; B → word_by_word; D → make_do_confusion
- **Rationale:** make an argument (also 'a strong argument'); distractors use verbs that do not collocate.
- **Difficulty justification:** Ladder step "adj_noun_adverb" (band 5.5): Adjective–noun and adverb collocations (heavy rain, strong argument, deeply sorry). Estimated b 5.75 (+0.25 from the step). make an argument (also 'a strong argument'); distractors use verbs that do not collocate.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.col.06 · b 6 · adj_noun_adverb · independent check

**Two of these sentences use a word combination that does not sound natural. Choose both.**

- A. It is highly unlikely to snow in Chennai.
- B. We did a mistake in the last question.
- C. There was heavy rain all night.
- D. He has a big knowledge of cricket.
- E. She takes great care of her plants.

- **Key:** B. We did a mistake in the last question.; D. He has a big knowledge of cricket.
- **Rationale:** Spots unnatural combinations among natural collocations; both must be found.
- **Difficulty justification:** Ladder step "adj_noun_adverb" (band 5.5): Adjective–noun and adverb collocations (heavy rain, strong argument, deeply sorry). Estimated b 6 (+0.50 from the step). Spots unnatural combinations among natural collocations; both must be found.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.col.07 · b 6.25 · adj_noun_adverb · independent check

**Put the words in order to make a natural sentence.**

- A. deeply
- B. the
- C. grateful
- D. for
- E. help
- F. we
- G. are

- **Key:** we → are → deeply → grateful → for → the → help
- **Rationale:** Builds a sentence around the collocation 'deeply grateful for'.
- **Difficulty justification:** Ladder step "adj_noun_adverb" (band 5.5): Adjective–noun and adverb collocations (heavy rain, strong argument, deeply sorry). Estimated b 6.25 (+0.75 from the step). Builds a sentence around the collocation 'deeply grateful for'.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Connectives and transitions (`EN.SEN.COH.connectives`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Coherence and cohesion.

### sup.g8.cnx.01 · b 5 · exact_relationship · delayed retention check

**Choose the connective that shows the exact link: 'Many birds visit the lake in winter. ___, flamingos arrive from as far as Gujarat.'**

- A. As a result
- B. For instance
- C. However
- D. Despite this

- **Key:** B. For instance
- **Wrong answers show:** A → wrong_connective; C → wrong_connective; D → wrong_connective
- **Rationale:** An example connective, against result, contrast and concession.
- **Difficulty justification:** Ladder step "exact_relationship" (band 5.5): Chooses the connective that shows the exact relationship (as a result, for instance, despite this). Estimated b 5 (-0.50 from the step). An example connective, against result, contrast and concession.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.cnx.02 · b 5.25 · exact_relationship · delayed retention check

**Choose the connective that shows the exact link: 'The match was delayed by rain. ___, the crowd stayed until the end.'**

- A. Despite this
- B. Similarly
- C. For example
- D. Therefore

- **Key:** A. Despite this
- **Wrong answers show:** B → wrong_connective; C → wrong_connective; D → wrong_connective
- **Rationale:** A concession connective: the crowd stayed although something discouraged it.
- **Difficulty justification:** Ladder step "exact_relationship" (band 5.5): Chooses the connective that shows the exact relationship (as a result, for instance, despite this). Estimated b 5.25 (-0.25 from the step). A concession connective: the crowd stayed although something discouraged it.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.cnx.03 · b 5.5 · exact_relationship · independent check

**Choose the connective that shows the exact link: 'Our school uses solar panels. ___, its electricity bill has fallen by half.'**

- A. In contrast
- B. For instance
- C. Meanwhile
- D. As a result

- **Key:** D. As a result
- **Wrong answers show:** A → wrong_connective; B → wrong_connective; C → wrong_connective
- **Rationale:** A result connective.
- **Difficulty justification:** Ladder step "exact_relationship" (band 5.5): Chooses the connective that shows the exact relationship (as a result, for instance, despite this). Estimated b 5.5 (+0.00 from the step). A result connective.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.cnx.04 · b 5.75 · exact_relationship · independent check

**Which connective does NOT fit? 'Plastic straws harm turtles. ___, many cafés now use paper straws.'**

- A. Consequently
- B. As a result
- C. Nevertheless
- D. Therefore

- **Key:** C. Nevertheless
- **Rationale:** Tells three result connectives from a concession that contradicts the logic.
- **Difficulty justification:** Ladder step "exact_relationship" (band 5.5): Chooses the connective that shows the exact relationship (as a result, for instance, despite this). Estimated b 5.75 (+0.25 from the step). Tells three result connectives from a concession that contradicts the logic.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.cnx.05 · b 5.75 · exact_relationship · independent check

**Write the connective that adds a similar point. It starts with S: 'Cycling keeps you fit. S________, it causes no pollution.'**

- **Key:** similarly
- **Wrong answers show:** "however" → wrong_connective
- **Rationale:** Recalls an addition/similarity connective from its first letter and the link.
- **Difficulty justification:** Ladder step "exact_relationship" (band 5.5): Chooses the connective that shows the exact relationship (as a result, for instance, despite this). Estimated b 5.75 (+0.25 from the step). Recalls an addition/similarity connective from its first letter and the link.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.cnx.06 · b 6 · exact_relationship · independent check

**Which sentence uses 'however' correctly?**

- A. I was hungry, however I ate a big lunch.
- B. I wanted to come. However, I had a fever.
- C. However I was tired so I slept.
- D. I like mangoes, however, so I bought some.

- **Key:** B. I wanted to come. However, I had a fever.
- **Wrong answers show:** A → wrong_connective; C → wrong_connective; D → wrong_connective
- **Rationale:** 'However' for contrast, correctly placed and punctuated.
- **Difficulty justification:** Ladder step "exact_relationship" (band 5.5): Chooses the connective that shows the exact relationship (as a result, for instance, despite this). Estimated b 6 (+0.50 from the step). 'However' for contrast, correctly placed and punctuated.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.cnx.07 · b 6.25 · exact_relationship · independent check

**Choose the two connectives that could start the second sentence: 'The new road is wider than the old one. ___, journeys to the city are now much shorter.'**

- A. As a result
- B. For example
- C. Consequently
- D. In contrast
- E. Meanwhile

- **Key:** A. As a result; C. Consequently
- **Rationale:** Two result connectives must be found; the others show different relationships.
- **Difficulty justification:** Ladder step "exact_relationship" (band 5.5): Chooses the connective that shows the exact relationship (as a result, for instance, despite this). Estimated b 6.25 (+0.75 from the step). Two result connectives must be found; the others show different relationships.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Logical sequencing (`EN.WRT.ORG.sequencing`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Coherence and cohesion.

### sup.g8.sqn.01 · b 5 · logical_links · delayed retention check

**Put these sentences in the most logical order for instructions on planting a seed.**

- A. Then cover the seed with a little soil.
- B. First, fill a small pot with soil.
- C. Finally, water it gently and keep it in the sun.
- D. Next, press a seed into the soil.

- **Key:** First, fill a small pot with soil. → Next, press a seed into the soil. → Then cover the seed with a little soil. → Finally, water it gently and keep it in the sun.
- **Rationale:** Orders steps using the sequence words and the logic of the task.
- **Difficulty justification:** Ladder step "logical_links" (band 5.5): Orders points logically, with clear links between them. Estimated b 5 (-0.50 from the step). Orders steps using the sequence words and the logic of the task.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sqn.02 · b 5.25 · logical_links · delayed retention check

**Put these sentences in the most logical order for a paragraph about a school garden.**

- A. Since then, students have grown tomatoes and spinach.
- B. Last year, our school turned an empty plot into a garden.
- C. This year, we even sold vegetables at the school fair.
- D. At first, the soil was hard and full of stones.

- **Key:** Last year, our school turned an empty plot into a garden. → At first, the soil was hard and full of stones. → Since then, students have grown tomatoes and spinach. → This year, we even sold vegetables at the school fair.
- **Rationale:** Orders a short account by time and cause, following the time phrases.
- **Difficulty justification:** Ladder step "logical_links" (band 5.5): Orders points logically, with clear links between them. Estimated b 5.25 (-0.25 from the step). Orders a short account by time and cause, following the time phrases.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sqn.03 · b 5.5 · logical_links · independent check

**A paragraph argues that students should drink more water. Which sentence does NOT belong?**

- A. Many students feel tired because they drink too little.
- B. My cousin has a blue water bottle.
- C. Schools could add more drinking taps.
- D. Water helps the brain to concentrate.

- **Key:** B. My cousin has a blue water bottle.
- **Rationale:** Spots a sentence that breaks the logical line of an argument.
- **Difficulty justification:** Ladder step "logical_links" (band 5.5): Orders points logically, with clear links between them. Estimated b 5.5 (+0.00 from the step). Spots a sentence that breaks the logical line of an argument.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sqn.04 · b 5.75 · logical_links · independent check

**Which sentence best fills the gap? 'Our town has too many cars. ___ Because of this, the air is often unhealthy to breathe.'**

- A. They release a lot of fumes into the air.
- B. Some cars are red.
- C. My father wants a new car.
- D. Cars are made in many countries.

- **Key:** A. They release a lot of fumes into the air.
- **Wrong answers show:** B → jumps_between_ideas; C → jumps_between_ideas; D → jumps_between_ideas
- **Rationale:** Chooses the sentence that links the cause to the stated result.
- **Difficulty justification:** Ladder step "logical_links" (band 5.5): Orders points logically, with clear links between them. Estimated b 5.75 (+0.25 from the step). Chooses the sentence that links the cause to the stated result.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sqn.05 · b 6 · logical_links · independent check

**Put these sentences in the most logical order for a paragraph arguing for a longer lunch break.**

- A. For this reason, the break should be extended to forty minutes.
- B. Our lunch break lasts only twenty minutes.
- C. In that time, many students cannot finish eating.
- D. Some also have no time to play or rest.

- **Key:** Our lunch break lasts only twenty minutes. → In that time, many students cannot finish eating. → Some also have no time to play or rest. → For this reason, the break should be extended to forty minutes.
- **Rationale:** Orders an argument: situation, problem, further problem, conclusion.
- **Difficulty justification:** Ladder step "logical_links" (band 5.5): Orders points logically, with clear links between them. Estimated b 6 (+0.50 from the step). Orders an argument: situation, problem, further problem, conclusion.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sqn.06 · b 6.25 · logical_links · independent check

**Which is the best final sentence for this paragraph? 'Reading every day improves vocabulary. It also helps us understand other people's lives. Most importantly, it can be relaxing after a busy day.'**

- A. My favourite book is about a detective.
- B. However, reading is difficult.
- C. Some books are very long.
- D. For all these reasons, reading daily is worth the time.

- **Key:** D. For all these reasons, reading daily is worth the time.
- **Wrong answers show:** A → jumps_between_ideas; B → jumps_between_ideas; C → jumps_between_ideas
- **Rationale:** A concluding sentence that ties the listed points together.
- **Difficulty justification:** Ladder step "logical_links" (band 5.5): Orders points logically, with clear links between them. Estimated b 6.25 (+0.75 from the step). A concluding sentence that ties the listed points together.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.sqn.07 · b 6.25 · logical_links · independent check

**Put these sentences in the most logical order for a paragraph comparing trains and buses.**

- A. Buses, however, can reach small villages.
- B. Trains are faster over long distances.
- C. Each, therefore, suits a different kind of journey.
- D. They are also more comfortable for sleeping.

- **Key:** Trains are faster over long distances. → They are also more comfortable for sleeping. → Buses, however, can reach small villages. → Each, therefore, suits a different kind of journey.
- **Rationale:** Orders a comparison: one side, its second point, the other side, a balanced conclusion.
- **Difficulty justification:** Ladder step "logical_links" (band 5.5): Orders points logically, with clear links between them. Estimated b 6.25 (+0.75 from the step). Orders a comparison: one side, its second point, the other side, a balanced conclusion.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

## Paragraphing (`EN.WRT.ORG.paragraphing`)

Curriculum references (indicative, unvalidated): ncert_lo; cefr: Coherence and cohesion.

### sup.g8.par.01 · b 5 · unity · delayed retention check

**This text should have three paragraphs. Choose the two places where a new paragraph should begin. (1) Bamboo is a fast-growing grass. (2) Some kinds grow almost a metre in a day. (3) People use bamboo in many ways. (4) It is used to build houses and make furniture. (5) However, bamboo forests need protection. (6) Too much cutting can harm the animals that live there.**

- A. before sentence 2
- B. before sentence 3
- C. before sentence 4
- D. before sentence 5
- E. before sentence 6

- **Key:** B. before sentence 3; D. before sentence 5
- **Rationale:** Breaks follow changes of focus: what bamboo is, its uses, the need to protect it.
- **Difficulty justification:** Ladder step "unity" (band 5.5): Each paragraph has one focus; breaks follow changes of focus. Estimated b 5 (-0.50 from the step). Breaks follow changes of focus: what bamboo is, its uses, the need to protect it.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.par.02 · b 5.25 · unity · delayed retention check

**A paragraph about the school sports day contains these sentences. Which one should start a new paragraph?**

- A. The relay was the most exciting event.
- B. Next month, our school will hold a book fair.
- C. Parents cheered from the stands.
- D. The races began at nine.

- **Key:** B. Next month, our school will hold a book fair.
- **Rationale:** Spots the sentence whose focus is a different topic.
- **Difficulty justification:** Ladder step "unity" (band 5.5): Each paragraph has one focus; breaks follow changes of focus. Estimated b 5.25 (-0.25 from the step). Spots the sentence whose focus is a different topic.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.par.03 · b 5.5 · unity · independent check

**Which is the best topic sentence for a paragraph about the benefits of trees in cities?**

- A. Trees in cities bring several important benefits.
- B. I climbed a tree yesterday.
- C. Some cities are very large.
- D. Trees are tall.

- **Key:** A. Trees in cities bring several important benefits.
- **Wrong answers show:** B → no_paragraphs; C → no_paragraphs; D → no_paragraphs
- **Rationale:** A topic sentence that announces the paragraph's single focus.
- **Difficulty justification:** Ladder step "unity" (band 5.5): Each paragraph has one focus; breaks follow changes of focus. Estimated b 5.5 (+0.00 from the step). A topic sentence that announces the paragraph's single focus.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.par.04 · b 5.75 · unity · independent check

**A student writes every sentence of her essay as a separate paragraph. What is the best advice?**

- A. Write one long paragraph for the whole essay.
- B. Start every paragraph with 'Firstly'.
- C. Use longer words.
- D. Group sentences on the same point into one paragraph.

- **Key:** D. Group sentences on the same point into one paragraph.
- **Wrong answers show:** A → no_paragraphs; B → one_sentence_paragraphs; C → one_sentence_paragraphs
- **Rationale:** Recognises one-sentence paragraphs and the remedy: one focus per paragraph.
- **Difficulty justification:** Ladder step "unity" (band 5.5): Each paragraph has one focus; breaks follow changes of focus. Estimated b 5.75 (+0.25 from the step). Recognises one-sentence paragraphs and the remedy: one focus per paragraph.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.par.05 · b 6.25 · linking · independent check

**Paragraph 1 of an essay describes the problem of litter in the park. Which sentence best begins paragraph 2, about solutions?**

- A. In conclusion, the park is nice.
- B. The park has a small pond.
- C. There are, however, simple ways to keep the park clean.
- D. Litter is everywhere in the park.

- **Key:** C. There are, however, simple ways to keep the park clean.
- **Rationale:** A linking sentence that moves from the problem to solutions.
- **Difficulty justification:** Ladder step "linking" (band 6.5): Linking sentences between paragraphs. Estimated b 6.25 (-0.25 from the step). A linking sentence that moves from the problem to solutions.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___

### sup.g8.par.06 · b 6.5 · linking · independent check

**Which sentence best links a paragraph about the history of the school library to one about its future plans?**

- A. The library has thousands of books.
- B. Having grown so much in fifty years, the library now plans its next step.
- C. Books are important.
- D. The first librarian was strict.

- **Key:** B. Having grown so much in fifty years, the library now plans its next step.
- **Rationale:** A transition that summarises the previous paragraph and points to the next.
- **Difficulty justification:** Ladder step "linking" (band 6.5): Linking sentences between paragraphs. Estimated b 6.5 (+0.00 from the step). A transition that summarises the previous paragraph and points to the next.
- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___
