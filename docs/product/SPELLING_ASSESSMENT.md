# Spelling check by dictation (V1)

**Branch:** `product/adaptive-spelling-assessment`, stacked on PR #27.

**Status:**
- The software is implemented and tested.
- All content is **candidate**: prepared by Claude, not reviewed by an educator.
- Two policy changes are **awaiting approval** (section 6).
- Live Codespace testing has **not** been done. Everything below was run locally, with the real Django API on
  PostgreSQL and a phone-sized Chromium.

## 1. What a pupil now does

1. Today offers **Spelling check: hear and spell**, after placement and before anything else in spelling.
2. **Sound check first:**
   - **The device has an English voice:** "Test the sound" says a test word, then the pupil can start.
   - **Hearing words is switched off:** the screen offers to switch it on.
   - **No English voice:** the screen says so plainly. It offers two honest options:
     - an adult reads the words aloud. The app shows the word to the adult only on request and hides it again, and
       records `delivery: "adult_reader"`.
     - spelling practice, labelled "does not count as the check".

   Nothing silently swaps in another kind of question.
3. **Each word:**
   - The app says the word, a sentence with it, and the word again. The sentence settles words that sound like
     others, such as families and family's. **Repeat the word** says the word alone. **Hear it in a sentence** says
     all three again.
   - The word and the sentence are never displayed before the answer is checked.
   - The pupil types the spelling and presses Check.
   - Feedback shows the right spelling. There is no "try again" on a dictation word, because the answer has been
     shown.
4. **The next word is chosen after every answer** from the updated Learner Vector (section 3).
5. **If the voice is lost part-way** (the check is reopened on a device without one, or hearing words is switched
   off), the next word is not asked. The pupil can go on with an adult reading, which starts a new recorded session,
   or stop. No unheard word can be recorded as an answer.
6. **The check stops** in one of three ways, and the reason and final estimates are recorded:
   - both spelling estimates are within ±0.6 after at least 8 words;
   - 14 words have been asked;
   - there is no suitable unused word ("more reviewed words are needed").

## 2. The word bank (`content/english/spelling/dictation-bank.json`)

**Contents:**
- **79 common words for ages 10–15**, on 14 spelling patterns of two capabilities:
  - adding endings (`EN.FND.SPL.inflections`): plain, -es plural, doubling short words, dropping e, y to i,
    doubling by stress, no doubling when unstressed, exceptions;
  - prefixes and suffixes (`EN.FND.SPL.morphological`): plain affixes, double letters at a join, -ful/-ly/-ment,
    -able/-ible, -tion/-sion/-ssion, rare roots.
- **Homophones are not dictated.** A sound-alike word cannot be assessed by ear alone.

**Each word has:**
- its spelling (one accepted answer);
- capability and pattern;
- a **provisional** difficulty band (`difficulty_source: author_estimate`: the pattern's band adjusted for length and
  familiarity, **not calibrated**);
- the text to say;
- a spoken context sentence;
- rule-error spellings tagged with the framework's misconceptions (e.g. stoped → no doubling);
- scoring criteria: exact spelling; capitals, spaces and a final full stop ignored; no variants, since words with
  accepted variant spellings were left out;
- review status `candidate-unvalidated`;
- provenance: prepared by Claude on 14 October 2026, `reviewed_by: null`.

**Checks:**
- None of the words is the answer to a question in the main hand-written bank.
- Words the pupil has already met are never asked. That covers words:
  - answered in a check, in practice or in another question;
  - written in a question they were shown: its prompt, options, passage, explanation, the lesson rule for its
    pattern, or the notes on its listed wrong answers;
  - written in a lesson they read.
- The feedback on a dictation word gives only the right spelling and the name of its pattern, never example words
  that could still be asked. A test checks every word and every listed wrong spelling.
- Item ids are numbered (`spl.dict.010`), so the page source does not spell the word.
- Listed wrong spellings are never real words: "planed" and "siting" were removed, so a misheard word is not tagged
  as a rule error.
- Pronunciation uses the device's own text-to-speech voice. How natural it sounds depends on the device, and has not
  been reviewed.

## 3. How the next word is chosen (`select.ts` `spellingAssessNext`)

After each answer, in this order:

1. **Follow-up.** The last answer was wrong in a way the item lists as a rule error (a suspected misconception). The
   next word is a different, unused word within ±1.5 bands. It is preferably one where the same error can happen,
   otherwise one on the same pattern; the recorded reason says which, and that the second kind cannot confirm or
   rule out the misconception. There is one follow-up per misconception per check.
2. **Targeting and coverage.** Otherwise, unused words within **±1 band** of the current estimate. Patterns not yet
   tested in this session come first. ±1 is a starting hypothesis to be checked against real answers.
3. **Widening.** If nothing is within ±1, it widens to ±2 and records that. If nothing is within ±2, it stops and
   reports insufficient content.
4. **Choice.** Among the words left, **the existing engine chooses** (`recommend`, assessment mode: the most
   information at the current estimate).

Each answer is scored by the existing code and updates the estimate through the existing formula. The formula is
**unchanged**.

Every word has a recorded trace:
- the rule and reason, the estimates at that moment, and the patterns already tested;
- what the engine knew, and the candidates it rejected and why.

The traces are shown in the developer dashboard and in reports.

## 4. Demonstration

Run it with `npm run english:demo-dictation` from `frontend/`. It uses the app's own code, with a synthetic pupil who
answers right on placement questions up to band 3.5. In dictation, the pupil misspells the first word that has a rule
error, then answers right up to band 4.5.

Start: inflections 3.96 ± 0.86, morphological 3.79 ± 0.84 (after placement)

| # | Word (pattern, band b) | Why this word (recorded rule and reason) | Typed | Result and evidence | Estimate before → after | Misconception status after |
|---|---|---|---|---|---|---|
| 1 | arriving (inflections/drop_e, b 3.75) | untested pattern: within ±1 band of the estimate; patterns not yet tested in this session first (coverage) | arriveing | wrong (rule error: kept silent e); independent, counted | 3.96 ± 0.86 → 3.54 ± 0.75 | kept silent e: suspected |
| 2 | writing (inflections/drop_e, b 3.5) | follow up: follow-up: "arriving" was misspelt in a way that suggests kept silent e; a different word where the same error can happen checks whether it recurs (one error is only a suspicion) | writing | right; independent, counted | 3.54 ± 0.75 → 3.83 ± 0.67 | kept silent e: improving |
| 3 | usually (morphological/double_at_join, b 3.75) | untested pattern: within ±1 band of the estimate; patterns not yet tested in this session first (coverage) | usually | right; independent, counted | 3.76 ± 0.83 → 4.10 ± 0.73 | – |
| 4 | powerful (morphological/ful_ly_ment, b 4.25) | untested pattern: within ±1 band of the estimate; patterns not yet tested in this session first (coverage) | powerful | right; independent, counted | 4.10 ± 0.73 → 4.41 ± 0.66 | – |
| 5 | studied (inflections/y_to_i, b 4.25) | untested pattern: within ±1 band of the estimate; patterns not yet tested in this session first (coverage) | studied | right; independent, counted | 4.03 ± 0.66 → 4.30 ± 0.61 | kept silent e: improving |
| 6 | excitement (morphological/ful_ly_ment, b 4.5) | near estimate: within ±1 band of the estimate; every pattern there has been tested once, so another word near the estimate | excitement | right; independent, counted | 4.49 ± 0.65 → 4.73 ± 0.60 | – |
| 7 | possible (morphological/able_ible, b 5.5) | untested pattern: within ±1 band of the estimate; patterns not yet tested in this session first (coverage) | possibe | wrong; independent, counted | 4.73 ± 0.60 → 4.61 ± 0.57 | – |
| 8 | worried (inflections/y_to_i, b 4.25) | near estimate: within ±1 band of the estimate; every pattern there has been tested once, so another word near the estimate | worried | right; independent, counted | 4.34 ± 0.60 → 4.53 ± 0.56 | kept silent e: improving |

Stopped: stopped: both spelling estimates are within ±0.6 (one sd) after 8 words
End: inflections 4.53 ± 0.56, morphological 4.67 ± 0.57
Spells inflected forms correctly: shown; 4 of 6 right on their own; Provisionally shown on their own, on fresh questions, at about level 3.5 of 8: on draft questions not yet approved by an educator, so not a verified result. Possibly kept silent e (one wrong answer): improving, right 1 time since, not yet resolved.
Morphological spelling (prefixes and suffixes): shown; 4 of 6 right on their own; Provisionally shown on their own, on fresh questions, at about level 4 of 8: on draft questions not yet approved by an educator, so not a verified result.
Today next: Grammar: Capitalisation | Spelling: Homophones | Words: General vocabulary breadth

**What the demonstration shows:**
- The rule error on "arriving" lowered the estimate.
- The **follow-up** ("writing", a word where the same silent-e error can happen) came next, with its recorded
  reason. The right answer raised the estimate.
- The misconception is **improving**, not resolved: one error, then one right answer (resolving it needs two right
  answers at the error's difficulty, one on a later day; see `MASTERY_RULES.md`).
- Later words track the rising estimate, and an error at band 5.5 brings it down a little.
- Uncertainty falls with each answer, and the check stops when it is small enough.

**What it does not show:**
- Population-level calibration, or that these difficulty bands are right.
- How real pupils mishear, mistype or guess.
- That ±1 band is the best window.

Those need educator review and real answers. Note also that the pupil ends "shown" on draft questions; see 6A.

## 5. Evidence rules

**Dictation answers** are independent first answers. They count for the Learner Vector, like the hand-written bank.
**Unchanged:**
- generated practice words stay practice-only;
- the doubling journey's provisional items change nothing;
- assisted answers and answers after teaching keep their distinctions.

**Misconceptions are now hypotheses with a status** (`misconceptions.ts`), computed from the recorded answers with
nothing stored:

| Status | Meaning |
|---|---|
| Suspected | One independent error that matches it |
| Supported | Matching errors on two or more different questions |
| Resolved | Two or more independent right answers, on different questions that test it, after the last error |

- Errors in practice, with help or after teaching are listed as "not counted".
- Parents read "Possibly X: one wrong answer so far, not yet a pattern" instead of "A pattern in wrong answers".
- The developer dashboard shows the status of each.

**Error kinds** (a heuristic, never used for scoring):

| Kind | Meaning |
|---|---|
| Rule error | The rule-predicted misspelling |
| Possible typo | Two neighbouring letters swapped, or one key next to the right one |
| Other word | A different word the app knows: possibly misheard, or a vocabulary mix-up |
| Spelling error | Anything else, e.g. the base word misspelt |

Only rule errors can support a misconception. Every wrong answer is still wrong for the estimate. Treating typos
differently would change scoring and needs approval.

**One reporting fix:** "Shown earlier; not currently confirmed" was listed as a strength after 0 of 6 right. The
engine can "demonstrate" level 1 from wrong answers alone once it has enough answers. The line is no longer listed
while most of the pupil's own answers are wrong (approved and kept). Since C′ it also needs the earlier claim to have
passed the evidence gate when it was made.

## 6. Policy decisions

**A. Approved and implemented (15 October): unreviewed questions cannot establish verified mastery.**
- Every "shown" or "confirmed" capability now carries `mastery`:
  - **provisional:** shown on draft questions;
  - **verified:** at least 3 independent answers on educator-approved questions.

  It also carries a `masteryNote` saying why.
- **Where it appears:**
  - parents read "Provisionally shown … not a verified result";
  - the overview marks each item provisional or verified;
  - the Journey path tells the child "the questions are still being checked by teachers";
  - Progress, the developer dashboard and reports show it.
- **What does not change:**
  - provisional evidence still updates the estimates, and the planner still sequences on it;
  - no history is relabelled. The status is recomputed from the record, so approving a question later makes earlier
    answers on it count as verified evidence.
- **Today:** no question is approved, so every mastery is provisional.

**B. Approved and implemented (15 October): one error is a suspicion to probe, not a reason to teach.**
- **One tagged error:** the misconception is suspected, and the spelling check's next word is a follow-up that probes
  it. The spelling plan gives it no teaching priority. Its reason says "a suspicion, so the next check looks again
  before any teaching".
- **One misspelt word in a check:** no teaching priority either. This was +2 before.
- **When teaching becomes possible:** corroborating errors on separate questions ("supported"), or 2 or more misspelt
  words on the pattern, may lead to targeted teaching.
- **Statuses and evidence:** suspected, supported and resolved are kept with their evidence (which questions, and
  when) in the dashboard, the reports and `misconceptions.ts`.

**Kept as approved:** "Shown earlier; not currently confirmed" is not listed as a strength while most answers are
wrong.

**C′, the stricter misconception resolution and dictation alone: approved and implemented (15 October).** The
lifetime 50% rule was rejected and is not implemented. The rules, their thresholds (drafts, configurable in
`frontend/src/english/logic/mastery-policy.ts`) and before-and-after results are in `MASTERY_RULES.md`. In short:
"shown" now also needs the C′ evidence gate; a misconception is resolved only by right answers at the difficulty of the
error with one on a later day (otherwise "improving" or "resolved below level X"); and dictation alone can demonstrate
direct spelling, with word and pattern diversity instead of a second question format. Every dictation word is still a
candidate, so spelling mastery stays provisional even when C′ is met.

## 7. History and the older check

- Records made before dictation replay unchanged (a test rebuilds the ledger identically).
- An unfinished old fixed-list check still resumes from its stored list. For example, Pupil A's: Home offers "Carry
  on".
- The plan no longer offers the old check. It offers the dictation check until one is **finished**, to everyone,
  including pupils who did the old check: their old answers never counted.
- Misspelt dictation words go into word review when the app has practice items for that word (30 of the 79). The
  others are covered by pattern practice.
- No database migration was needed. The new session fields (`delivery`, `speech`) are optional.

## 8. Tooling fixes

- **Redaction** keeps version keys such as `en@0.2.0`. An email now needs a domain ending in letters. This applies in
  the client, the server telemetry and the error capture.
- **Every spelling session records speech:** whether a local English voice was found, whether hearing words was on,
  and the voice's name and language. Nothing about the person is recorded.

## 9. Tests

**Software correctness** (they prove the app does what this document says; they are not evidence of educational
validity):

| Test file | Tests | What it covers |
|---|---|---|
| `spelling-assessment.test.ts` | 15 | Bank integrity and candidate status; scoring; feedback never shows another check word; words shown elsewhere are not asked; an unfinished check is offered again; speech lost mid-check; dictation evidence counts and generated words do not; adaptive selection within the recorded window; no repeats; divergence after one different answer; follow-up; misconception tiers; error kinds; insufficient content; speech unavailable and adult reader recorded; history replay and resuming an old check; simulated pupils (weak, middle, strong, inconsistent, guesser) |
| `investigation.test.ts` | | The fixed tooling defects D1 and D2. Pins the old fixed list's behaviour for history |
| `e2e/spelling.test.mjs` (phone, real API) | | **With a voice:** test sound; autoplay; Repeat; sentence; the word never on screen; a rule error and its same-pattern follow-up; the session's speech record; evidence and traces; Progress; the follow-up's reason in the developer dashboard. **Without a voice:** the explanation; no silent start; adult reader hide and show; no substitute question |
| Existing suites | | Updated where the first spelling step changed. All pass |

**Simulated pupils** (model checks only):
- The estimate moves towards weak, middle and strong pupils' levels.
- Careless or random answers never inflate it.
- Inconsistent pupils and guessers are estimated **too low**: careless slips read as lack of skill. See
  `SIMULATION_WEAKNESSES.md` for why, and the remedies that would need approval.

## 10. What needs an educator

- Review the 79 words, their patterns, difficulty bands, rule-error spellings and sentences. Approve or edit them.
  Only approved items should establish verified mastery (6A).
- Listen to the device voice on the target phones: are these words pronounced unambiguously?
- Check the ±1 band window and the stopping rule against real pupils' answers.
- Decide 6A and 6B.

## 11. Limitations

- Difficulty bands are estimates. The 1–8 scale is not tied to age or year group.
- The demonstration and the simulated pupils follow the engine's own response model.
- Error kinds are heuristics with a small word list.
- Adult reading cannot guarantee the word was not seen.
- Speech quality depends on the device. Android Chrome detection has been tested with a stand-in voice, not on a
  real phone.
- Only two spelling capabilities have dictation words. Homophones are not dictated.
