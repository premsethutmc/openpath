# A 1–2 learner pilot: what is needed, and how we will observe it

*13 October 2026 · plan for your approval. Nobody has been contacted.*

## What the pilot can and cannot tell us

- **It can show:**
  - whether a learner aged 10–15 can use the app on their own phone without help after the first
    session;
  - where they get stuck;
  - whether the plan feels about right;
  - whether misspelt words come back and get remembered;
  - whether the content has problems we missed.
- **It cannot show** that the method works, how fast learners improve in general, or whether the
  difficulty levels are right. Two learners are too few. Every finding is an observation about a person,
  and is recorded as such.

## First: try it yourself

Use the preview build on your own Android phone for a few days, as a learner (see "Trying it on Android"
in [`WEB_APP.md`](WEB_APP.md)), before involving any family. What you notice there decides what changes
before the pilot.

## Needed before the first session

| # | What | Who | Effort |
|---|---|---|---|
| 1 | **Review the pilot sheet** (`pilot-1.csv`: 56 words, one row each) and record it ([`CONTENT_VALIDATION.md`](CONTENT_VALIDATION.md)) | You, or a person you choose | About 20–30 minutes |
| 2 | **Build the pilot version** (`npm run english:build:pilot`). It refuses if nothing is approved | Me | Minutes |
| 3 | **Choose the hosting** ([`DEPLOYMENT_PROPOSAL.md`](DEPLOYMENT_PROPOSAL.md)), and set it up if approved; or run it from a laptop at home | You decide; set-up together | 30–45 minutes |
| 4 | **Try it on each learner's actual phone** with the family: <ul><li>opens over HTTPS;</li><li>installs to the home screen;</li><li>works offline;</li><li>dictation voice works or not (Settings → Hearing words);</li><li>typing fits above the keyboard</li></ul> | You, with the family | 15 minutes each |
| 5 | **Guardian information sheet and written consent** (below) | You | – |
| 6 | **Agree where summaries go and when they are deleted** | You | – |

## Shape of the pilot

- **Learners:** one or two, aged 10–15, from families who know us. A guardian sets up the profile.
- **Length:** three weeks, long enough for words to come back after 1, 3, 7 and 14 days, and for at
  least one pattern to reach a check with new words.
- **Use:** 10–15 minutes a day, 4–5 days a week, at the learner's own pace. Missing days is fine and is
  itself worth seeing.
- **Contact points:**
  - **Day 1:** an **observed first session** (in person or on a video call) of about 30 minutes:
    profile, placement, spelling check, first lesson and practice. The learner thinks aloud. We only
    watch, and do not help unless they are stuck for more than a minute.
  - **End of weeks 1, 2 and 3:** the guardian saves a **trial summary** (Settings → Save a trial
    summary) and a **backup**, and sends us the summary.
  - **End of week 3:** a 15-minute **conversation** with the learner and guardian.

## How we will observe learning

From the trial summaries, combined with `node tools/english/pilot/report.ts summary*.json`:

| Question | Where it shows | What would worry us |
|---|---|---|
| Do misspelt words get remembered? | **Word statuses over time:** learning → written correctly → remembered a day or more later → over a week | Words staying in *learning* through several reviews |
| Does it stick for words they got right? | **Delayed recall:** right/wrong on words checked again days later, including words never misspelt | Delayed recall below about two thirds right |
| Has a rule been learned, or only the words? | **Pattern checks with new words** (transfer), never seen before | Practice right but new-word checks failing repeatedly |
| Is the plan aimed well? | Session ratings (too easy / too hard); right-first-time per session | Mostly *too hard*, or mostly below about 50% right first time |
| How sure is the overall spelling level? | Spelling level: *early estimate* range narrowing towards *measured* | – (it moves slowly by design: only hand-written questions count) |

**Kept apart** throughout, and in the report:

- word mastery (words.ts);
- pattern mastery (practice and checks with new words);
- the engine's spelling proficiency.

Generated exercises change no estimate. The two learners will not be compared with each other.

**Optional:** a short paper check, separate from the app. Before and after, the guardian reads out
20 words with the pilot's patterns, chosen from words the app has not used yet, and the learner writes
them. I can prepare the two word lists from the word bank so they do not overlap with practice. This
gives one independent before-and-after view that does not depend on the app's own scoring.

## How we will find usability problems

| Source | What it catches |
|---|---|
| **Observed first session** (checklist below) | Confusion we would never see in data: reading the instructions, finding buttons, the keyboard covering the answer box, the dictation voice |
| **Session ratings** (one tap at the end; optional) | How each session felt |
| **Notes** (end of a session, or Settings) | Anything that got in the way, in the family's words |
| **"Something wrong with this question?"** | Content errors, with the item and version |
| **Session data:** stopped early, pauses over 3 minutes, second tries, time between answers | Where attention drops or questions are too slow |
| **Week-3 conversation** | Would they carry on? What was annoying? What was useful? |

**Observation checklist for the first session.** Note the time and the screen for each:

1. Creating the profile: is the consent step understood?
2. Placement: does the learner understand "this finds your starting point" and that wrong answers are
   expected?
3. Each question type: typed answers (autocorrect, capitals, the keyboard covering the box), choices,
   dictation (can they hear it; do they find the replay button?).
4. Feedback: do they read the explanation, or tap Next straight away? Do they use "Try again"?
5. The lesson: read, skimmed or skipped? Does the quick check make sense?
6. Today's plan and Progress: can they say what to do next, and what "early estimate" means?
7. Any moment of frustration, boredom or pride, in their words.

## Stopping and safeguarding

- **Stop or pause** a learner's pilot if:
  - they are upset by it;
  - a guardian asks;
  - an unsuitable word or sentence appears. We fix it with an exception and a new pilot build before
    continuing.
- **No contact with the learner** outside the guardian's presence or knowledge.
- **No incentives tied to scores.**

## Guardian information sheet (draft)

> **OpenPath English: a three-week trial**
>
> OpenPath English is an early, private version of a spelling, grammar and vocabulary app for ages
> 10–15. We would like [learner] to try it for about 10–15 minutes a day for three weeks.
>
> - **What stays on your phone.** Everything [learner] types and all their progress stay in the browser
>   on your phone. Nothing is sent to us or anyone else automatically. There are no accounts, adverts or
>   tracking.
> - **What you send us, if you agree.** At the end of each week you save a "trial summary" from
>   Settings and send it to us. It has no name. It contains [learner]'s answers, timings, how the
>   sessions felt and any notes you write. Please don't put names in notes. We keep summaries privately
>   and delete them by [date].
> - **The first session.** We would like to watch the first session (about 30 minutes), to see where
>   the app is confusing.
> - **It is an early version.** The questions and lessons have not yet been reviewed by teachers, and
>   levels are estimates. Please tell us about anything wrong or unsuitable.
> - **You can stop at any time,** without giving a reason, and ask us to delete anything you have sent.
>
> I agree to [learner] taking part, and to sending weekly trial summaries: ______ (guardian) ______ (date)

## What I will report after the pilot

For each learner, kept separate:

- what they used;
- what changed in words, patterns and the spelling level;
- what got in the way.

Then a short list of fixes, ordered by how often they came up and how much they blocked learning, and
what a larger trial would need. No claims of effectiveness.
