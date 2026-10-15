# Manual Android test (before any pupil session)

**Who:** two adults, one at the phone and one taking notes. No children.

**Time:** about 2 hours per device.

**When:** run it on every phone the pilot will use, with the exact browser and keyboard the children will use. Repeat
it after any update to the app, the browser or the keyboard.

**What it covers:** what automated Chromium tests cannot establish (PILOT_READINESS_AUDIT.md §2.2–2.3). Record every
result in the table at the end. A **fail** on any step marked ★ stops the pilot on that device.

## 0. Devices and set-up

**Devices:**
- at least two Android phones, ideally one recent and one older;
- Android 10 or later;
- Chrome up to date;
- if pupils will use Samsung Internet, test it too.

**Record for each device:**
- model;
- Android version;
- Chrome version (Chrome → ⋮ → Settings → About Chrome);
- keyboard app and its version.

**Keyboard settings.** For Gboard: Settings → System → Languages & input → On-screen keyboard → Gboard → Text
correction. Turn these **off**:
- Show suggestion strip;
- Auto-correction;
- Auto-capitalisation;
- Spell check.

Then go to Gboard → Voice typing and turn it **off**. Note any setting that cannot be changed.

**Sound:**
- media volume at about 70%;
- the phone not on silent or "Do not disturb";
- no Bluetooth audio connected.

**Text-to-speech:** Settings → Accessibility → Text-to-speech output → **Speech Services by Google**. Make sure an
English voice is downloaded (Install voice data → English (India) or English (UK)) and play the sample.

**Connection:** Wi-Fi as at the pilot site.

**Account:** open the pilot address in Chrome and sign in (for a Codespaces preview: GitHub as the pilot lead). Create
a test learner with the code **TEST1**. Delete it at the end (§8).

## 1. Opening and layout

| # | Do | Expect |
|---|---|---|
| 1.1 | Open the app; rotate to landscape and back | Nothing cut off; no sideways scrolling in portrait |
| 1.2 | ⋮ → Add to Home screen; open from the icon | Opens full-screen and signed in |
| 1.3 | Increase the font size (Settings → Display → Font size, one step); reopen | Text readable, buttons not overlapping |

## 2. Placement (first session)

| # | Do | Expect |
|---|---|---|
| 2.1 ★ | Start "Find your starting point"; answer 5 questions, at least one typed | Each question fits the screen; feedback appears after Check; Next moves on |
| 2.2 ★ | On a typed question, watch the keyboard | The keyboard does not cover the answer box or Check. If it covers Next after feedback, note whether scrolling reveals it |
| 2.3 | Lock the phone for 2 minutes mid-question, then unlock | The same question, or "Carry on"; no answer lost |
| 2.4 | Switch to another app and back | As 2.3 |

## 3. Dictation sound ★ (the main risk)

| # | Do | Expect |
|---|---|---|
| 3.1 ★ | Start the spelling check; press **Test the sound** | "Ready? Here is a test word: garden." is heard clearly |
| 3.2 ★ | Press **Start the spelling check** | The first word is spoken by itself: the word, a sentence, the word. Note if silent, cut short or doubled |
| 3.3 ★ | Press **Repeat the word**, then **Hear it in a sentence** | The word alone, then the sentence form; nothing cut off |
| 3.4 ★ | Answer, Check, then **Next** | The next word is spoken by itself without another tap. Repeat for at least 8 words; record any word not heard |
| 3.5 | Press Repeat several times quickly | Speech restarts cleanly; it does not queue up or go silent |
| 3.6 | Note the voice: accent and speed | Understandable to the pilot's children (note en-IN or en-GB) |
| 3.7 ★ | Check the screen before answering | The word is **never shown** before Check |

## 4. Keyboard and spelling validity ★

| # | Do | Expect |
|---|---|---|
| 4.1 ★ | With the settings from §0, type a misspelling such as "stoped" slowly | No suggestion strip or bubble offers "stopped"; nothing changes the text |
| 4.2 ★ | Type "Stopped" with a capital, and with a trailing space | Marked as in the app's normal rules. Note the result; do not change the app |
| 4.3 ★ | Look for a microphone or voice-typing key | Absent, or disabled by the settings |
| 4.4 | Press the keyboard's Enter/done key | Submits the answer (same as Check) |
| 4.5 | Repeat 4.1 with suggestions **on** (then switch them off again) | Records whether the keyboard would reveal spellings if a setting is missed |

## 5. Speech unavailable and the adult reader

| # | Do | Expect |
|---|---|---|
| 5.1 ★ | Settings → Text-to-speech: switch the engine off or remove English; reopen the app; start the spelling check | "This device can't say the words aloud."; no way to start a silent check |
| 5.2 ★ | **An adult will read the words aloud** | The word is hidden until "Show the word to read aloud"; while shown, the answer box is hidden |
| 5.3 ★ | Read it, **Hide it**, type, Check | Feedback as usual |
| 5.4 | Restore the voice. In Me, switch hearing words off, then start the check | Offers to switch it back on |
| 5.5 | During a voiced check, switch the voice off mid-check (or mute and use Me → hearing words off) | The check offers "Go on with an adult reading the words" or "Stop for now"; no unheard word is counted |

## 6. Progress and returning

| # | Do | Expect |
|---|---|---|
| 6.1 | Finish the check; open **Progress**, **Journey**, **Home** | Labels agree: "shown" only where Progress says so; "provisional" or "draft questions" wording present |
| 6.2 | Sign out, sign in on the second phone | Same learner, same results, same Today plan |
| 6.3 | Next day: open the app | Today offers the next activity; "Carry on" if a session was left unfinished |

## 7. Connection problems

| # | Do | Expect |
|---|---|---|
| 7.1 | Mid-question, switch on aeroplane mode, then press Check | A clear message; nothing silently lost; after reconnecting, carry on |
| 7.2 | Reload the page mid-session | Resumes at the same question |

## 8. Diagnostics and clean-up

| # | Do | Expect |
|---|---|---|
| 8.1 | On a laptop, open `/developer`, select TEST1 | Every answer from this test, with difficulty, kind, estimate change, the reason it was chosen, and the dictation delivery (voice or adult) |
| 8.2 | Me → Delete this learner and their record | Gone from both phones and the dashboard |

## Results (one table per device)

| Device / Android / Chrome / keyboard | Step | Pass / Fail | Notes (what was seen) |
|---|---|---|---|
| | | | |

**Decision for each device:**
- pilot-ready only if every ★ step passed;
- otherwise use the adult-reader mode (if only §3 failed) or do not use the device.
