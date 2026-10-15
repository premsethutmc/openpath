# Adult-only Android test (before any child uses OpenPath)

**Who:** two adults, one using the phone and one ticking the sheet. **No children.** Use made-up names only, such as
"TEST1".

**Time:** about 2 hours per phone.

**Which phones:** every phone the pilot will use, with the browser and keyboard the children will use. Repeat the
test after any update to the app, the browser or the keyboard.

**How to record:** write a result for every step in the sheet at the end: **P** (as expected), **F** (not as
expected) or **–** (could not do it). Write what you saw for every F. A step marked ★ that fails means the phone is
**not ready**.

**This test does not prove the app is ready for children by itself.** Nobody may claim a step passed unless it was
done on the actual phone.

## Three parts, three versions of the app

Do not mix them up: each part tests a different version, for a different reason.

| Part | Version of the app | Purpose | When |
|---|---|---|---|
| **A. Adult testing of the development build** | Development (app address, port 4175). Every activity; it includes questions that are **not approved** | Does the phone work: speech, adult reader, keyboard, sessions, resuming, saving, export and deletion | Now |
| **B. Safety testing of the empty pilot build** | Pilot test build made with **no approvals at all** (`--no-approvals`; pilot address, port 4177) | The pilot version shows **nothing** unapproved, even through typed addresses | Now |
| **C. Full adult testing of the approved pilot build** | The real pilot build, made only from **approved** questions (pilot address, rebuilt). Today these are the 291 questions the product owner approved; no educator has reviewed them yet | What children would actually use: only approved questions, only the two checks, on this phone | Now possible (the owner approval is recorded) |

A phone may be used with children only when **every ★ step in A, B and C** has passed on it. No child uses the
development build, and nobody uses either pilot build before Part C has passed.

## Before you start (the person who set up OpenPath does this part)

The app is not put on the internet. It runs in your private GitHub Codespace
([PREVIEW_ON_ANDROID.md](PREVIEW_ON_ANDROID.md)), started from the `main` branch. You need these addresses:

| Address | What it is | How to get it |
|---|---|---|
| **App address** (port 4175) | The full app in its internal "development" version. It has every activity, including questions that are **not** approved. Adults only. | Printed when the codespace starts: `https://<name>-4175.app.github.dev` |
| **Pilot address** (port 4177), for Part B | The pilot test build made with no approvals, so it must show **no questions at all** | In the codespace terminal, run `cd frontend && node scripts/build-english.mjs --pilot --no-approvals --allow-empty --out=dist-english-pilot && PORT=4177 DIST=dist-english-pilot HOST=0.0.0.0 node scripts/preview-english.mjs`. The PORTS tab then shows 4177, which must be **Private**. |

**For Part C** (the recorded approvals: today the product owner's approval of 291 questions, plus any educator decisions imported later, see [pilot/EDUCATOR_REVIEW_GUIDE.md](pilot/EDUCATOR_REVIEW_GUIDE.md)):
1. Run `node tools/english/pilot/review.ts approved`, print the list, and give it to the testers. It is the list of
   exact question versions that are approved, and by whom.
2. Stop the server on 4177.
3. Run `node scripts/build-english.mjs --pilot --out=dist-english-pilot` **without** `--no-approvals` or `--allow-empty`.
   It refuses to build if nothing is approved.
4. Start the server on 4177 again, with the same command as for Part B.

The same pilot address then serves the approved pilot build.

## 0. Prepare the phone

**Note down:**
- the phone model;
- the Android version (Settings → About phone);
- the Chrome version (Chrome → ⋮ → Settings → About Chrome);
- the keyboard app.

**Keyboard (Gboard):** go to Settings → System → Languages & input → On-screen keyboard → Gboard → Text correction.
Turn **off**:
- Show suggestion strip;
- Auto-correction;
- Auto-capitalisation;
- Spell check.

Then go to Gboard → Voice typing and turn it **off**. Note any setting you cannot change.

**Sound:**
- media volume at about 70%;
- the phone not on silent or "Do not disturb";
- no Bluetooth headphones connected.

**Voice:** go to Settings → Accessibility → Text-to-speech output, choose **Speech Services by Google**, install an
English voice (English (India) or English (UK)) and play the sample.

**Wi-Fi:** use the Wi-Fi of the place where the pilot will happen.

## Part A: adult testing of the development build (app address)

This version contains unapproved questions and every activity. **Adults only.** It tests the phone, not the content.

### A1. Opening

| # | Do | Expect |
|---|---|---|
| A1.1 | Open the **app address** in Chrome and sign in to GitHub if asked. Press the link **Use on this device only, without an account**, under "Let's begin". Do not create a parent account | The app asks for a name |
| A1.2 | Type the name **TEST1**, continue, tick the agreement box, press **Build my path** | The agreement says answers stay "in this browser on this device only" |
| A1.3 | Turn the phone sideways and back | Nothing is cut off; nothing needs sideways scrolling when upright |
| A1.4 | Open **Me** (bottom bar) and scroll down | It says "Development version". This build is for adults only |

### A2. Starting check and moving through a session

| # | Do | Expect |
|---|---|---|
| A2.1 ★ | On Home, press **Start** next to the starting check. Answer 6 questions, at least 2 of them typed | Each question fits the screen. After **Check**, a right or wrong message appears. **Next** moves on |
| A2.2 ★ | On a typed question, watch the keyboard | The keyboard does not cover the answer box or **Check** |
| A2.3 | Press the keyboard's Enter (or ✓) key instead of Check | It checks the answer |
| A2.4 | Finish the check | "Back to today" appears. Home then offers the spelling check |

### A3. Spoken words (the biggest risk) ★

| # | Do | Expect |
|---|---|---|
| A3.1 ★ | Start the **spelling check**. Press **Test the sound** | You clearly hear "Ready? Here is a test word: garden." |
| A3.2 ★ | Press **Start the spelling check** | The first word is spoken by itself: the word, a sentence, the word again. Note if it is silent, cut short or doubled |
| A3.3 ★ | Press **Repeat the word**, then **Hear it in a sentence** | The word alone, then the sentence; nothing cut off |
| A3.4 ★ | Type an answer, press **Check**, then **Next**. Repeat for at least 8 words | Each new word is spoken without another tap. Write down any word you did not hear |
| A3.5 ★ | Before answering, look at the screen | The word itself is **never shown** before Check |
| A3.6 | Press Repeat several times quickly | Speech restarts cleanly; it does not pile up or go silent |
| A3.7 | Listen to the voice | A child could understand it. Note the accent and speed |

### A4. Keyboard suggestions and autocorrect ★

| # | Do | Expect |
|---|---|---|
| A4.1 ★ | On a spelling question, slowly type the misspelling **stoped** | Nothing offers "stopped", and nothing changes what you typed |
| A4.2 ★ | Look for a microphone key | None, or it does nothing |
| A4.3 | Type a word with a capital first letter, and a word with a space at the end | Note how the app marks them. Do not change any settings for this |
| A4.4 | Turn suggestions **on**, repeat A4.1, then turn them **off** again | Note whether the keyboard would show the right spelling if a setting were missed |

### A5. When the phone cannot speak: an adult reads the words ★

| # | Do | Expect |
|---|---|---|
| A5.1 ★ | Turn the phone's text-to-speech off (or remove the English voice), reopen the app and start the spelling check | "This device can't say the words aloud." No way to start a silent check |
| A5.2 ★ | Press **An adult will read the words aloud** | The word is hidden until "Show the word to read aloud". While it is shown, the answer box is hidden |
| A5.3 ★ | Read the word aloud, press **Hide it: the learner types now**, type it, Check | Feedback as usual; the keyboard does not cover Check |
| A5.4 | Turn the voice back on. During a spoken check, turn it off again | The app offers "Go on with an adult reading the words" or "Stop for now". No word that could not be heard is marked |

### A6. Interruptions and resuming

| # | Do | Expect |
|---|---|---|
| A6.1 | In the middle of a question, lock the phone for 2 minutes, then unlock | The same question, or "Carry on". No answer lost |
| A6.2 | Switch to another app and back | As A6.1 |
| A6.3 | Pull down to reload the page in the middle of a session | It carries on at the same question |
| A6.4 | Close Chrome completely (swipe it away), wait a minute, reopen the app address | TEST1 is still there with every answer. "Carry on" if a session was unfinished |
| A6.5 | Turn on aeroplane mode, keep answering, then turn it off | The app keeps working; nothing is lost |

### A7. Keeping, sharing and deleting the record

| # | Do | Expect |
|---|---|---|
| A7.1 ★ | **Me → Export a backup** | A `.json` file is saved in Downloads |
| A7.2 | **Me → Save a trial summary** | A second file is saved. It does not contain the name TEST1 |
| A7.3 | Give both files to the pilot lead. On a computer, they run `node --import tsx frontend/scripts/backup-report.mts <backup.json> report.md` | A readable report of every answer, without the name |
| A7.4 ★ | On a **second phone** (or after A7.5 on the same phone), open the app address, press **Use on this device only, without an account**, and use **Choose a backup file (.json)** | TEST1 comes back with exactly the same progress |
| A7.5 ★ | **Me → Delete this learner from this device**, and confirm | TEST1 is gone. Reopening the app does not bring it back |
| A7.6 | Note for the pilot | Clearing Chrome's data for the site also deletes everything not exported |

### A8. Spelling Bee (no starting check needed)

| # | Do | Expect |
|---|---|---|
| A8.0 ★ | **First word after a cold start.** Close Chrome completely (swipe it away), reopen the app, and tap **Start Spelling Bee** straight away | The first word is heard within about 2 seconds. If it is not, a "No sound? Turn the volume up, then tap “Play the word”" box appears, and tapping **Play the word** says it. Note which happened: either passes, but silence with no box is a failure |
| A8.1 ★ | Make a new learner. On Home, tap **Start Spelling Bee** | The first word is spoken at once (the word, a sentence, the word again). The word is not written anywhere on the screen |
| A8.2 ★ | Tap **Repeat the word**; wait a minute, then tap it again | The word is heard each time |
| A8.3 ★ | Type the word with no suggestions appearing, and tap **Submit** | "Right!" and the spelling; **Next word** says the next one |
| A8.4 | Misspell a word on purpose | "Not quite.", the right spelling, what was typed, and "review list" |
| A8.5 | Lock the phone mid-session; unlock; or close Chrome and reopen | Home offers **Carry on Spelling Bee** at the same word |
| A8.6 | Finish 10 words | A summary; Home and Progress show words practised; the next session starts with the misspelt word |

## Part B: safety testing of the empty pilot build (pilot address)

This build is made with no approvals (`--no-approvals`), so it must not show **any** question, lesson or practice. If anything appears,
stop and report it: that is a safety failure, not a phone problem.

| # | Do | Expect |
|---|---|---|
| B1 ★ | Open the **pilot address**. Press **Let's begin** (this version has no accounts), name **TEST2**, agree, **Build my path** | It goes straight to Home, with no starting check offered |
| B2 ★ | Look at Home | "Nothing to do in the app right now". No Start button, no "More practice" |
| B3 ★ | Open **Journey** | No buttons to start a lesson, practice or check. It says only the starting check and spelling check are open in the pilot |
| B4 ★ | Open **Me** and scroll down | "Pilot version: only approved questions are shown". There is no box for typing notes |
| B5 ★ | Type the pilot address followed by `/developer` | "Not available here". No pupil information |
| B6 | Reload, and close and reopen Chrome | Still nothing to do; no question appears |
| B7 | **Me → Delete this learner from this device** | TEST2 is gone |

## Part C: full adult testing of the approved pilot build (pilot address, rebuilt)

**Only after questions have been approved** (the product owner's approval of 291 is recorded) and the pilot build has been rebuilt (see "Before you start").
Have the printed list of approved questions ready. This is the version children would use, so test it as fully as
Part A.

| # | Do | Expect |
|---|---|---|
| C1 ★ | Open the pilot address. **Let's begin**, name **TEST3**, agree, **Build my path** | Home offers the starting check (**Start**). In **Me**: "Pilot version: only approved questions are shown" |
| C2 ★ | Do the whole starting check, with at least 2 typed answers. Watch the keyboard on each typed question | As A2.1–A2.3: each question fits, Check and Next work, and the keyboard does not cover the answer box or Check |
| C3 ★ | After the check, look at the end screen | No "How was that?" rating, and no "Something wrong with this question?" link at any point |
| C4 ★ | Start the spelling check and do it to the end, with the phone's voice | As A3.1–A3.5 and A4.1–A4.2: every word heard, never shown before Check, and no keyboard suggestions |
| C5 ★ | Turn text-to-speech off and start the spelling check again | As A5.1–A5.3: the adult-reader mode works |
| C6 ★ | Back on Home, Journey and Me | Only the starting check and the spelling check were ever offered. No More practice, lessons, practice words or doubling journey. No box for typing notes |
| C7 | Lock the phone mid-question; switch apps; reload; close Chrome and reopen | As A6.1–A6.4: it carries on, and nothing is lost |
| C8 ★ | **Me → Export a backup**, and give the file to the pilot lead | A `.json` file in Downloads |
| C9 ★ | The pilot lead runs `node --import tsx frontend/scripts/backup-report.mts <backup.json> report.md` and compares every question id in the report with the printed approved list | **Every** question id in the report is on the approved list, which shows each as `id@version`. The app holds one current version of each question, and a pilot build accepts only the approved version. Any id not on the list is a safety failure: stop and report it |
| C10 | **Me → Delete this learner from this device** | TEST3 is gone |

## Results sheet (one per phone)

**Phone:** ______  **Android:** ______  **Chrome:** ______  **Keyboard:** ______

**Testers:** ______ and ______  **Date:** ______

| Step | P / F / – | What we saw (required for F) |
|---|---|---|
| A1.1–A1.4 | | |
| A2.1 ★ | | |
| A2.2 ★ | | |
| A2.3–A2.4 | | |
| A3.1 ★ | | |
| A3.2 ★ | | |
| A3.3 ★ | | |
| A3.4 ★ (words not heard: ___) | | |
| A3.5 ★ | | |
| A3.6–A3.7 | | |
| A4.1 ★ | | |
| A4.2 ★ | | |
| A4.3–A4.4 | | |
| A5.1 ★ | | |
| A5.2 ★ | | |
| A5.3 ★ | | |
| A5.4 | | |
| A6.1–A6.5 | | |
| A7.1 ★ | | |
| A7.2–A7.3 | | |
| A7.4 ★ | | |
| A7.5 ★ | | |
| A8.1 ★ | | |
| A8.2 ★ | | |
| A8.3 ★ | | |
| A8.4–A8.6 | | |
| B1 ★ | | |
| B2 ★ | | |
| B3 ★ | | |
| B4 ★ | | |
| B5 ★ | | |
| B6–B7 | | |
| C1 ★ (after approval) | | |
| C2 ★ | | |
| C3 ★ | | |
| C4 ★ (words not heard: ___) | | |
| C5 ★ | | |
| C6 ★ | | |
| C7 | | |
| C8 ★ | | |
| C9 ★ (questions checked: ___) | | |
| C10 | | |

**Decision for this phone** (tick one):
- ☐ **Not yet:** Parts A and B passed; Part C not yet done.
- ☐ **Ready for supervised use with children:** every ★ in A, B **and** C passed.
- ☐ **Adult reader only:** every ★ passed except speech (A3 or C4), so an adult must read the words aloud.
- ☐ **Not ready:** any other ★ failed. Do not use this phone.

**Any failure in B or C9 is a content-safety failure,** not a phone problem: stop all testing and report it.
