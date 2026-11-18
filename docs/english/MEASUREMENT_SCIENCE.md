# Measuring English: what the research reliably supports

*18 November 2026. A reference for design decisions, not a build. Each finding names its source; the "for
OpenPath" lines are our reading of it. Nothing here has been implemented.*

## Findings

**1. Simple learner models hold up; deep ones need far more data than we have.**
In a comparison across nine real datasets, logistic regression with good features led on moderate-sized data, and
deep knowledge tracing led only on large data (Gervet, Koedinger, Schneider & Mitchell, 2020, *JEDM* 12(3),
<https://jedm.educationaldatamining.org/index.php/JEDM/article/view/451>). A later study on the largest public
dataset again found hand-built logistic models ahead (Mandalapu, Gong & Chen, 2021, <https://arxiv.org/abs/2101.08349>).
*For OpenPath:* keep the explainable estimate-and-uncertainty model. Do not move to a neural learner model.

**2. Question difficulty can be learned from answers as they arrive.**
Treating each answer as a match between learner and question (the Elo method) estimates learner skill and question
difficulty together, online and cheaply (Pelánek, 2016, *Computers & Education*,
<https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf>). It has known limits: a 2025 simulation study found
Elo ratings are generally biased, with variance that depends on context (<https://pmc.ncbi.nlm.nih.gov/articles/PMC12784335>).
*For OpenPath:* replace the hand-estimated difficulty of every English question with one updated from real
answers, starting from the estimate. Treat the result as good for choosing the next question, not as an exam score.

**3. Fine sub-scores are rarely reliable enough to report.**
Sub-scores add value over a total only when they are both reliable and distinct from it, and across operational
tests only a handful met that bar (Sinharay & Haberman, 2008, ETS RM-08-18; Sinharay, 2010, ETS RR-10-16,
<https://www.ets.org/research/policy_research_reports/publications/report/2010/issf.html>).
*For OpenPath:* 56 skill numbers from a few answers each cannot be trusted as scores. Report a few broad measures;
keep the fine skills for choosing what to teach.

**4. Reading comprehension does not split cleanly into question-type skills.**
With 996 fourth-graders and a large item pool, factors for specific text and question types were not reliable and
barely related to vocabulary or word-reading speed (*The Dimensions of Reading Comprehension in Dutch Children*,
<https://pure.uva.nl/ws/files/25582799/The_Dimensions_of_Reading_Comprehension_in_Dutch_Children.pdf>). Studies of
what drives comprehension find vocabulary and background knowledge contributing most
(<https://core.ac.uk/download/56099136.pdf>).
*For OpenPath:* "main idea" and "inference" are useful as things to teach, not as separate measurements. Measure
reading as one level: the hardest text a child understands.

**5. Vocabulary is the strongest single lever on reading.**
Across 661 learners in 8 countries, comprehension rose roughly in a straight line with the share of a text's words
the reader knew, with no threshold; about 98% known words is the usual target for comfortable reading (Schmitt,
Jiang & Grabe, 2011, *Modern Language Journal* 95(1), <https://www.lextutor.ca/cover/papers/schmitt_etal_2011.pdf>).
*For OpenPath:* measure vocabulary size directly, and match texts to it. A child who knows too few of a text's
words is being tested on vocabulary, whatever the question says.

**6. Forgetting should be modelled per learner and per item.**
Models that include when each past practice happened predict better than ones that ignore time (DAS3H: Choffin
et al., 2019, <https://arxiv.org/abs/1905.06873>). Duolingo's half-life regression is the best-known deployed
example for language, and trainable schedulers such as FSRS are now benchmarked on public review logs
(<https://arxiv.org/abs/2610.10548>).
*For OpenPath:* the spelling and vocabulary review boxes use fixed intervals. A fitted forgetting model is the
better-supported choice once there is enough review history.

## What this changes

| Today | Supported direction |
|---|---|
| 56 skill estimates shown as the learner's picture | Four headline measures: reading level, vocabulary size, accuracy in own writing, spelling. Fine skills stay internal, for teaching choices |
| Question difficulty fixed by estimate | Difficulty updated from real answers |
| Reading measured per question type | One reading level, from the hardest text understood; question types are lessons |
| No vocabulary-size measure | A short adaptive vocabulary check; texts matched to it |
| Fixed review intervals | Fitted forgetting model when data allows |
| Unchanged: estimate with uncertainty, help kept apart from unaided answers, related-skill links instead of a tree | Supported as it stands |

## Limits of this note

- Six searches, abstracts and summaries read, not the full papers. Findings 1–5 rest on peer-reviewed or ETS
  work; the FSRS material is partly a preprint and community benchmarks.
- Most of the reading and vocabulary evidence is from first-language children or adult second-language learners.
  English-medium Indian school children are neither exactly; real answers from our own learners should decide.
- Not covered: writing and speaking assessment, listening, and the evidence on teaching methods.
