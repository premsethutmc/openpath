# OpenPath English: the private web app (first version)

*12 October 2026. Built on the decisions of 12 October on PR #12. All lessons, questions and
difficulty levels are candidate content; nothing is sent off the device; no evaluator, provider or
account is involved.*

## Launching it

```
cd frontend
npm ci                      # once
npm run english:build       # -> frontend/dist-english/ (static files)
npm run english:preview     # -> http://localhost:4174
```

- **On this computer:** open http://localhost:4174. It installs for offline use on the first visit.
- **On a phone, for a private trial on the same Wi-Fi:** `HOST=0.0.0.0 npm run english:preview`,
  then open `http://<computer's address>:4174` on the phone. Everything works, but browsers allow
  offline install only on `https` or `localhost`, so over plain `http` the app needs the network to open.
- **Preview of the trial:** `npm run english:build:preview` offers exactly the pilot words (four suffix
  rules, typed answers only), labelled in Settings as not yet reviewed.
- **Trial version:** `npm run english:build:pilot` offers only practice words from approved rules or
  reviewed sets ([`CONTENT_VALIDATION.md`](CONTENT_VALIDATION.md)); it refuses to build while nothing is
  approved. The development build (`npm run english:build`) also offers unreviewed words. Neither offers
  flagged or excluded ones. Settings shows which version is running.
- **Hosting it properly** (for learners at home): see [`DEPLOYMENT_PROPOSAL.md`](DEPLOYMENT_PROPOSAL.md). It needs any static `https` host for the
  `dist-english/` folder. That is a deployment and cost decision, so none is set up.

## Trying it on Android (private; nothing is deployed)

You need a computer with Node 22.18 or later and this repository. Build once:

```
cd frontend && npm ci && npm run english:build:preview && npm run english:preview
```

**Recommended: a USB cable and Chrome's port forwarding.** The phone then opens the app as
`http://localhost:4174`, which Chrome treats as secure. So it installs to the home screen and keeps
working offline, and you can unplug and use it for days. Nothing is reachable from any other device.

1. **On the phone:** Settings → About phone → tap *Build number* seven times; then Settings → System →
   Developer options → turn on *USB debugging*.
2. **Connect** the phone by USB and allow the computer when asked.
3. **On the computer:** in Chrome, open `chrome://inspect/#devices` → *Port forwarding…* → add port
   `4174` to `localhost:4174` → tick *Enable port forwarding* → Done. The phone appears in the list.
   (With Android's platform tools, `adb reverse tcp:4174 tcp:4174` does the same.)
4. **On the phone:** in Chrome, open `http://localhost:4174`. Create a learner, then Chrome's menu →
   *Add to Home screen* (or *Install app*).
5. **Unplug.** The app opens from the home screen without the computer, because its files are cached on
   the phone. To update it later, rebuild, plug in again with forwarding on, and open it once.

**Through a GitHub Codespace (no cable, private HTTPS):** the repository has a `.devcontainer` that builds
the preview and starts it on port 4174 when a codespace starts.
1. On github.com, signed in: open the branch, then **Code → Codespaces → Create codespace on
   english/pilot-readiness**.
2. When it has started, open the **Ports** tab, and copy the address for port 4174 (`https://…-4174.app.github.dev`). Leave
   its visibility **Private**.
3. On the phone, open that address in Chrome while signed in to GitHub, then *Add to Home screen*.

A private port opens only for you. The codespace uses your monthly free allowance while it runs and stops
after a period of inactivity (30 minutes by default). The installed app keeps working offline from the
phone's cache, and progress stays on the phone. To pick up a newer build, start the codespace again and
open the address once.

**Quickest look, no cable:** with the phone and computer on the same Wi-Fi, run
`HOST=0.0.0.0 npm run english:preview` and open `http://<computer's address>:4174` on the phone.
- Everything works and progress is kept on the phone.
- It cannot be installed or used offline (plain `http`), and the computer must be running.
- Anyone on the same Wi-Fi could open it while the server runs.

**Things to notice as a learner:**
- whether your keyboard still suggests or corrects words in the answer box (the app turns this off;
  some keyboards may ignore that);
- whether a dictation voice is offered (Settings → Hearing words);
- how the daily plan reads;
- how the explanations land;
- what Progress → Words shows after a day or two.

Use the note box (Settings, or after a session) for anything that gets in the way. Notes stay on the
phone and appear in a trial summary.

## The journey

1. **Start or resume.** A display name (kept on the device only), who is setting up (a guardian, or a
   learner of 16 or over), and consent that progress stays in this browser. Earlier learners on the
   device are listed to carry on; the last one opens automatically.
2. **Placement** (12–24 questions, can be paused). The engine's assessment mode on the
   hand-written items, over the 13 guided capabilities.
3. **Spelling check.** One unseen dictionary word per spelling pattern near the learner's level.
4. **Today's plan**, each step with its reason: words due for review; the next spelling pattern
   (lesson, then practice) or, once practised well, a check with new words; one grammar or
   vocabulary capability chosen by the engine's learning mode. "More practice" reaches all 56
   capabilities through the engine, with no teaching.
5. **Practice and feedback.** Right or wrong, the correct answer, and an explanation tied to the
   mistake. A wrong answer can be tried again, as practice only. A "something wrong with this
   question?" note is kept with the record.
6. **Progress.** Per capability: *not assessed yet*, *early estimate* (a range) or *measured*; what is
   verified (shown, confirmed, check due, needs review); and the evidence by kind: independent,
   practice, later checks, and practice words recorded but not counted.
7. **Coming back.** Reopening resumes any unfinished session at the same question. Misspelt words
   return after 1, 3, 7 and 14 days.

## Three levels of spelling progress, kept apart (13 October)

| Level | What it is | Where it comes from | Changes the engine's estimates? |
|---|---|---|---|
| **Word mastery** | Per word: met, learning, written correctly, remembered a day or more later, remembered over a week | Every attempt at a generated item (`logic/words.ts`). Independent recall (typing the word unaided, first try), recognition (choosing), mistakes, assisted attempts (after a wrong first try) and delayed retention (an unaided recall at least 20 hours after last meeting the word) are counted separately | **No** |
| **Pattern mastery** | Per spelling pattern: needs work, practising, ready for a check, secure, check again | Practice, then checks with words never seen before (`patternStatus`) | **No** |
| **Spelling proficiency** | The engine's estimate for the three spelling capabilities, with its uncertainty | Hand-written items only, through the unchanged composite updater | Yes (it *is* the estimate) |

- **Words answered right first time get a later check too.** Up to 3 per review: after 3 days, then
  7 days once remembered. So retention is measured for those words as well, not only for misspelt ones
  (which return after 1, 3, 7 and 14 days, as before).
- **Mastered** means remembered on later days at least twice since the last mistake, with the checks
  at least a week apart. A mistake sends the word back to *learning*.

## Trial features (13 October)

- **One tap at the end of a session:** too easy, about right, too hard or confusing. It is optional.
- **Notes** at the end of a session and in Settings ("Tell us about a problem").
- **Trial summary** (Settings → Save a trial summary):
  - a file made on the device with no name (the learner is a short code);
  - sessions, timings, the three levels of spelling progress, ratings, notes and reported questions;
  - nothing is sent. `tools/english/pilot/report.ts` turns summaries into one report.
- **Response headers** for static hosts (`_headers`): no framing, no indexing; no camera, microphone or
  location. The preview server applies them, so the browser tests run under them.

## How it uses the engine

- **One scoring system.** Every answer is an evidence event in the engine's own ledger. The composite,
  updater, selection, retention and verification are the E1–E3a core, unchanged. The app's state is
  rebuilt from the event list by a fold, and the tests check that its estimates equal a ledger rebuilt
  from the evidence alone.
- **Generated spelling items are held** (decision 3). They are made by rule from SCOWL, CMUdict and
  Open English WordNet, and each records its sources. Until a person has checked an item, an answer to
  it is kept but changes no estimate (core `updater.ts`). The spelling module uses these answers for its
  own scheduling: word memory, pattern status and transfer checks. Capability estimates come only from
  hand-written items, which are mixed into practice and transfer checks. Generated items are never used
  for placement.
- **Evidence says why it was collected** (decision 8): `assessment` (placement, engine probes, transfer
  checks), `practice` (first unaided attempts), or `retention` (word reviews, engine retention checks).
  Hints and second tries are never evidence. This is recorded only; the mathematics is unchanged.
- **Display rule.** A capability is *measured* only with at least 4 direct observations, at least 2 of
  them independent, and sd ≤ 0.9. Otherwise it is an *early estimate*, shown as a range.

## What is usable now

| Part | State |
|---|---|
| Profiles, consent, resume, multiple learners per device | Done |
| Storage in IndexedDB, one transaction per answer; resume after reload or close | Done (tested in a browser) |
| Export and import of a whole profile (checksummed JSON), and deleting a learner | Done |
| Offline use once opened (service worker; app files only) | Done on `localhost` or `https` |
| Placement over the guided capabilities | Done |
| Spelling: check, plan, lessons, practice, feedback, word review (1/3/7/14 days), transfer checks on unseen words | Done |
| Grammar (6 capabilities) and vocabulary (4): lesson, then the engine's scheduler | Done |
| More practice on all 56 capabilities | Done (no teaching) |
| Progress with the display rule and evidence by kind | Done |
| On-device speech for dictation, local voices only; written clues otherwise | Done (no audio leaves the device) |
| Phone layout | Done (tested at 390 × 844) |

**Content:** 76 lessons (every ladder step of the 13 guided capabilities), feedback for their
33 misconceptions, 818 dictionary words and 2,348 generated items, plus the 780 hand-written items.

## What is incomplete or limited

- **Nothing is reviewed by educators.** Lessons, feedback, items and difficulty levels are candidate.
  Generated items stay held until someone checks them; no checking workflow exists yet beyond the
  `generated.checked` field.
- **The hand-written bank is thin per capability** (about 15–19 items each). A learner who practises
  one grammar capability a lot will run out of unseen items. After that, the engine falls back to its
  own rules: an easier step, a prerequisite, or an assessment.
- **Spelling estimates move slowly.** They change only through hand-written items: placement, about
  one per practice session, and transfer checks. Most spelling practice shapes the plan but not the level.
- **Regular spelling patterns** (silent letters, vowel teams) are not taught. Framework 0.2.0 does not
  specify that capability (EN.FND.SPL.regular_patterns is "planned").
- **Homophones:** only 45 generated words. Groups come from American pronunciations, with American-only
  mergers removed. The common confusions (there/their, its/it's) come from hand-written items.
- **Dictionary sentences and meanings** come from WordNet: written for adults, some stilted, and
  screened only by a blocklist.
- **Commonness** uses SCOWL's UK frequency tag, which is coarse; wordfreq is not used (decision 4).
- **Speech:** many desktop browsers and headless test browsers have no local English voice; then
  dictation is not offered. Indian English voices are rare.
- **No sync, accounts or server storage** (decision 6). The event format and export are designed so
  that consented sync can be added later.
- **Writing and short answers are not offered**: E3b and live evaluation stay disabled.
- **Bundle size:** about 2.7 MB of script (about 350 kB compressed), mostly content.
- **Generated items are approved for practice only.** No generated item counts towards a capability
  estimate until its assessment quality is validated (difficulty and discrimination from real answers),
  which needs separate approval. Nothing is approved yet: the pilot sheets are waiting for a reviewer.
- **The clue template is not recommended for the pilot** (adult or off-sense definitions). Without it,
  and without a device voice, homophones are practised only by choosing.
- **Not yet tried with learners.** Placement length, plan order and the display thresholds are
  initial settings, not tuned.

## Tests

- `frontend/src/english/logic/learner.test.ts`: 15 tests covering the journey without a browser:
  - placement limits and its use of hand-written items;
  - composite equality with a ledger-only rebuild;
  - persistence and resume, and export and import;
  - lessons, assisted attempts and word memory;
  - transfer checks, speech off, guided and explore sessions;
  - the display rule and determinism.
- `packages/english-core/test/w1-generated.test.ts`: 7 tests:
  - generated items are valid and reproducible;
  - unchecked items are held;
  - checked items update exactly like hand-written ones;
  - histories without `use` are unchanged.
- `frontend/e2e/english.test.mjs`: 5 tests in Chromium at phone size, against the production build:
  - the whole journey;
  - resume after a reload;
  - export, delete and import;
  - review the next day;
  - offline use;
  - no request to any other site;
  - no sideways scrolling and tap-sized buttons.
- `frontend/src/english/logic/pilot.test.ts` (13 October): 7 tests:
  - each rule of word mastery;
  - confirmation checks;
  - word mastery leaves every estimate unchanged;
  - pilot content mode;
  - ratings, notes and the trial summary (no name), and the report tool.
- `packages/english-core/test/w2-review.test.ts`: 9 tests:
  - automatic flags;
  - review status order;
  - lapsing approvals;
  - approval leaves the ledger identical;
  - sample rules;
  - recording a sheet;
  - CSV.
- The browser tests add a sixth: rating, notes, the trial summary download and the response headers.
- **CI:** these tests run, plus `generate.ts --check` and `review.ts --check`. A separate workflow rebuilds the word bank from
  the pinned sources when the pipeline changes.
