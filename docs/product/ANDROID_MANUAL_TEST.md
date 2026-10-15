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

## Before you start (the person who set up OpenPath does this part)

The app is not put on the internet. It runs in your private GitHub Codespace
([PREVIEW_ON_ANDROID.md](PREVIEW_ON_ANDROID.md)), started from the `main` branch. You need two addresses:

| Address | What it is | How to get it |
|---|---|---|
| **App address** (port 4175) | The full app in its internal "development" version. It has every activity, and its questions are **not** approved. Adults only. | Printed when the codespace starts: `https://<name>-4175.app.github.dev` |
| **Pilot address** (port 4177) | The pilot version, with nothing approved yet, so it must show **no questions at all** | In the codespace terminal, run `cd frontend && node scripts/build-english.mjs --pilot --allow-empty --out=dist-english-pilot && PORT=4177 DIST=dist-english-pilot HOST=0.0.0.0 node scripts/preview-english.mjs`. The PORTS tab then shows 4177, which must be **Private**. |

**After an educator has approved questions,** build the real pilot version and repeat Parts A2–A5 on it:
1. Run `node scripts/build-english.mjs --pilot --out=dist-english-pilot` **without** `--allow-empty`. It refuses to
   build if nothing is approved.
2. Restart the server on 4177.

Its placement and spelling check then show only approved questions.

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

## Part A: the app on the phone (app address)

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
| A2.1 ★ | Press **I'm ready** (or **Start** on Home). Answer 6 questions, at least 2 of them typed | Each question fits the screen. After **Check**, a right or wrong message appears. **Next** moves on |
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

## Part B: the pilot version (pilot address)

Nothing is approved yet, so the pilot version must not show **any** question, lesson or practice.

| # | Do | Expect |
|---|---|---|
| B1 ★ | Open the **pilot address**. Press **Let's begin** (this version has no accounts), name **TEST2**, agree, **Build my path** | It goes straight to Home, with no starting check offered |
| B2 ★ | Look at Home | "Nothing to do in the app right now". No Start button, no "More practice" |
| B3 ★ | Open **Journey** | No buttons to start a lesson, practice or check. It says only the starting check and spelling check are open in the pilot |
| B4 ★ | Open **Me** and scroll down | "Pilot version: only educator-approved questions are shown". There is no box for typing notes |
| B5 ★ | Type the pilot address followed by `/developer` | "Not available here". No pupil information |
| B6 | Reload, and close and reopen Chrome | Still nothing to do; no question appears |
| B7 | **Me → Delete this learner from this device** | TEST2 is gone |

**Once questions are approved** (the real pilot build, see "Before you start"), repeat Part A, steps A2–A5, on the
pilot address. Also check:
- only the starting check and the spelling check are offered;
- after a session there is no "How was that?" rating and no "Something wrong with this question?" box;
- More practice, lessons and the doubling journey never appear.

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
| B1 ★ | | |
| B2 ★ | | |
| B3 ★ | | |
| B4 ★ | | |
| B5 ★ | | |
| B6–B7 | | |

**Decision for this phone** (tick one):
- ☐ **Ready:** every ★ step passed.
- ☐ **Adult reader only:** every ★ passed except A3, so an adult must read the words aloud.
- ☐ **Not ready:** any other ★ failed. Do not use this phone.
