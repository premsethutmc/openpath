# Grade 8 standards and target-band review (for educator review)

Every Grade 8 target in `content/english/essay/g8-writing.json` is **band 5, labelled provisional**, and stays
provisional until an educator reviews it. This document sets out what the repository can and cannot support. It invents
no justification.

## Band 5 in general

**What exists:**

- **The framework's band scale.** Band 5 is "age-typical secondary texts, mostly accurate", indicatively CEFR B1.
- **Band descriptors** for each competency at bands **2, 4, 6 and 8 only**.
- **Curriculum references:**
  - NCERT Learning Outcomes (2017), Class VIII: a document-level reference only;
  - CBSE English (184) Class X syllabus topic names, used only as an indication for Class VIII;
  - CEFR Companion Volume scales.

  Every reference is marked `validated: false`.
- **Question difficulties** are expert estimates on the same scale. None is calibrated from learner responses.

**What does not exist:**

- a band-5 descriptor for any competency;
- any outcome-level mapping to NCERT or CBSE expectations for Class VIII;
- calibration of difficulties;
- an educator's judgement that band 5 is the Grade 8 expectation.

Decision D-5 in CAPABILITY_FRAMEWORK.md (age expectations) is still open, and its recommendation is not to set them.

**Conclusion.** The repository cannot justify band 5 as *the* Grade 8 standard. It can only say band 5 sits between the
band-4 and band-6 descriptors below. Band 5 stays a provisional working target for routing and checks. It must not be
presented to learners or parents as a Grade 8 standard until an educator decides it.

## The three pilot competencies

For each competency, the evidence of competence that the system can collect is the same: independent answers, after any
teaching session, on unseen questions between band 5 and 6.5, in at least two formats and two sessions. The engine's
lower 80% bound must reach band 5, and a delayed check at least 7 days later must show the level was kept.

### Subject–verb agreement (`EN.GRM.VERB.sva`)

| | |
|---|---|
| Curriculum expectation | Indicative only. CBSE (Class X topic list): "Subject–Verb Concord". NCERT LO Class VIII: document-level reference, with no outcome claimed. CEFR "Grammatical accuracy" (B1 indicative). |
| Framework descriptors | Band 4: agrees with plural and singular noun subjects in simple sentences. Band 6: agrees across intervening phrases (*The box of pencils is …*). No band-5 descriptor. |
| Observable behaviour at the provisional target | Between the two: reliable agreement in simple sentences, and *beginning* to agree across an intervening phrase. Ladder step "intervening" sits at band 5.0; "indefinite" (each of …) at 6.0. |
| Required assessment difficulty | Checks between band 5 and 6.5: intervening phrases and indefinite pronouns. Questions at b 2–4.5 cannot show the target. |
| Known gaps | The pilot's confirmation and retention pools reach b 5.0 with one question each, and the band 5–6.5 questions sit in the diagnosis pool. The proposed supplement adds 7 (unreviewed). Difficulties are uncalibrated. Lessons are candidate content. Two pilot practice questions share words with a lesson (practice only, so acceptable). |

### Present and past simple (`EN.GRM.VERB.present_past_simple`)

| | |
|---|---|
| Curriculum expectation | Indicative only. CBSE (Class X): "Tenses". NCERT LO Class VIII: document-level reference. CEFR "Grammatical accuracy" (B1 indicative). |
| Framework descriptors | Band 4: common irregular past forms (*went, saw, bought*) and *did/didn't*. Band 6: keeps tense consistent across a text and uses less common irregular forms (*caught, brought, chose*). No band-5 descriptor. |
| Observable behaviour at the provisional target | Common irregulars and *did* + base form are reliable; tense is mostly consistent in a short narrative. The ladder step "consistency_less_common" is at band 5.75. |
| Required assessment difficulty | Checks between band 5 and 6.5: tense consistency across sentences and less common irregular forms. |
| Known gaps | Only 4 live questions in band 5–6.5, of which 3 (`grm.pps.01`, `.04`, `.09`) contain answers a lesson shows, so only 3 families are usable for checks. The proposed supplement adds 7. The essay pattern stand-in has no rule for tense, so essay observation depends entirely on an unvalidated evaluator. Uncalibrated. |

### Articles (`EN.GRM.NOUN.articles`)

| | |
|---|---|
| Curriculum expectation | Indicative only. CBSE (Class X): "Determiners". NCERT LO Class VIII: document-level reference. CEFR "Grammatical accuracy" (B1 indicative). |
| Framework descriptors | Band 4: distinguishes first mention from known reference (*a dog … the dog*). Band 6: handles uncountable and general or abstract nouns (*Ø information, the environment*). No band-5 descriptor. |
| Observable behaviour at the provisional target | First mention versus known reference is reliable; *the* is used for unique things (step "unique_the", band 5.25); no a/an with common uncountable nouns is emerging (step "zero_uncountable", band 5.75). |
| Required assessment difficulty | Checks between band 5 and 6.5: unique *the*, uncountable nouns, and general statements at the top of the range. |
| Known gaps | As for agreement: the pilot's confirmation and retention pools reach b 5.0 with one question each, and the band 5–6.5 questions are diagnosis-pool. One pilot question (`plt.art.10`) is flagged as sharing words with a lesson. The proposed supplement adds 7. Uncalibrated. |

## What an educator is asked to decide

These are recorded in the review workbook's Competencies sheet.

1. **Target.** For each competency, is band 5 (between the band-4 and band-6 descriptors) the right Grade 8
   expectation? If not, which described band is?
2. **Band-5 descriptors.** Write one where band 5 stays, or confirm that targets should sit on described bands only
   (this is decision D-5).
3. **Mappings.** Are the curriculum mappings right? Add outcome-level NCERT or CBSE references where they exist.
4. **Ladders.** Do the steps and their bands (`progressions.json`) order the difficulty correctly?

Until then, every target keeps `expectedBandStatus: "provisional"`, and reports keep saying so.
