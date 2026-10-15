# Supervised pilot readiness audit (after PR #28)

**Status:** audit only. Nothing has been merged or deployed, and no code or threshold was changed.

**Update:** decisions and the next steps are in [PILOT_DECISIONS.md](PILOT_DECISIONS.md). It recommends a device-only
set-up, adds a backup report script, corrects the consent wording, and finds that the stack also offers *orgies*,
*overdose*, *flogging*, *mugging* and *insane* as practice words.

**Subject:** the English app as of `830264a` (PR #28, the tip of the stack).

**Scope:** a first supervised pilot with 5–10 pupils, focused on spelling by dictation.

**Companion documents:**
- [ANDROID_MANUAL_TEST.md](ANDROID_MANUAL_TEST.md): the device procedure;
- [PILOT_PROTOCOL_FIRST.md](PILOT_PROTOCOL_FIRST.md): the first protocol and its success criteria;
- `pilot/observation-sheet.csv`;
- `pilot/dictation-review.csv`;
- the earlier draft protocol, [../english/PILOT_PROTOCOL.md](../english/PILOT_PROTOCOL.md), whose consent, assent,
  safeguarding and withdrawal sections still apply.

**Status labels in this audit:**
- **PASS:** established by automated tests or by reading the code.
- **NEEDS MANUAL TEST:** cannot be established without a real Android phone and a person.
- **BLOCKED:** must be resolved before a child uses the app.

## 1. PR #28: is it safe to merge?

**PR #28 is technically mergeable into its base, but its base is not `main`.** It is the top of a stack of 14 open PRs.
None of them has been merged.

| PR | Branch → base | Mergeable | Behind base | Checks on head |
|---|---|---|---|---|
| #28 | product/adaptive-spelling-assessment → product/developer-diagnostics | yes, clean | 0 | 6/6 success |
| #27 | product/developer-diagnostics → product/ux-integration-v1 | yes, clean | 0 | 6/6 success |
| #26 | product/ux-integration-v1 → english/pilot-evidence-integrity | yes, clean | 0 | 6/6 success |
| #25 … #16 | each on the one below | yes, clean | 0 | 6/6 success each |
| #15 | english/rule-evidence → main | yes, clean | 0 | 6/6 success |
| #14 | english/pilot-readiness → main | yes, clean on its own | 0 | 6/6 success |

**What PR #28 depends on:**
- Every PR from #15 to #27. Measured from `main`, the stack is 30 commits and 148 files ahead, and 0 behind.
- Merging #28 alone puts it into `product/developer-diagnostics`, not `main`.
- Reaching `main` means merging bottom-up, #15 first and #28 last, or retargeting and squash-merging. Either needs
  your approval.

**PR #14 is a parallel branch, not part of the stack.**
- It conflicts with the stack's tip in 13 files, including `content.ts`, `learner.ts`, `events.ts`, `App.tsx`,
  `Session.tsx` and the devcontainer.
- It holds things the stack lacks:
  - the content-validation workflow for generated practice words;
  - the exclusion of three unsuitable generated words (*yessed*, *evillest*, *parable*), which are **still in the
    stack** (see B2);
  - a pilot build that offers only approved practice words.
- Its fate (rebase onto the stack, or close and port the exclusions) must be decided before merging either.

**No branch protection.** `main` is unprotected, so a merge would not be held back by failing checks. Every check
currently passes on every head.

**Verdict:** each PR is mergeable onto its base and green. Merging is *technically safe* in that sense. It still
needs your approval, a decision on #14, and the merge order above.

## 2. Readiness by area

### 2.1 The pupil journey

| Step | Status | Evidence |
|---|---|---|
| Parent account: register, sign in, sign out, sign in on another device | PASS | e2e `accounts`: whole workflow, persistence across devices |
| Add a pupil (code name, band, goal, consent tick), switch pupils | PASS | e2e `accounts`: two pupils, separate records |
| Placement (12–24 questions, feedback after each) | PASS | e2e `english`, `accounts` |
| Spelling check by dictation (8–14 words, adaptive, follow-ups) | PASS | e2e `spelling` (with and without a voice), unit tests |
| Feedback after each answer (right or wrong, the correct spelling, no retry on dictation) | PASS | e2e `spelling` |
| Progress, Journey and the parent overview, with labels consistent with the dashboard | PASS | e2e `spelling` (evidence gap), unit tests |
| Return for another session: Today's plan, resume after a reload, "Carry on" | PASS | e2e `english` reliable resume; unit replay tests |
| Lessons and practice after the check | **BLOCKED** for children (B2) | Spelling practice uses 2,348 generated items (815 words), none reviewed, three known to be unsuitable |
| Session length within 20 minutes | NEEDS MANUAL TEST | Placement plus the dictation check can exceed 20 minutes; the protocol splits them across two sessions |
| The whole journey on a real Android phone | NEEDS MANUAL TEST | Automated runs use desktop Chromium at phone size, with no soft keyboard and no real speech |

### 2.2 Android browser compatibility

**Established by automation (PASS):**
- layout at 390 px with no sideways scrolling;
- tap targets of at least 44 px;
- no console errors;
- Retry after a dropped or stalled request.

**Not establishable without a device (NEEDS MANUAL TEST):**
- the soft keyboard covering the answer box or the Check and Next buttons;
- Gboard suggestions and autocorrect on the answer box (see 2.3);
- real speech synthesis and its voices;
- "Add to Home screen";
- rotation;
- Chrome's data saver and battery saver;
- behaviour after the phone sleeps mid-session;
- Samsung Internet and other default browsers.

### 2.3 Dictation audio, adult reader, speech, keyboard, progression

| Function | Status | Notes |
|---|---|---|
| Word, then sentence, then word, spoken automatically when the question opens | PASS (stand-in voice) / NEEDS MANUAL TEST (real voice) | `speak()` cancels any speech, then speaks. On some Android Chrome versions a `speak` straight after `cancel` is dropped. The first word of each question must be heard on a real phone |
| Only *local* English voices are used (`localService`), preferring en-IN, en-GB, en-AU, en-US | NEEDS MANUAL TEST | Whether Android's Google voices report `localService: true` decides whether dictation is offered at all |
| No voice: the check says why; an adult can read; practice instead | PASS | e2e `spelling` "without a voice" |
| Voice lost mid-check: no word counted unheard; carry on with an adult reader | PASS | Unit tests. Keeps the evidence check's skill, range and remaining words |
| Adult-reader mode: word shown only to the adult on request, input hidden while shown | PASS (logic) / NEEDS MANUAL TEST (handling) | Whether a supervisor can keep the screen from the child in practice |
| Keyboard: `autocomplete`, `autocorrect`, `autocapitalize` off; `spellcheck=false`; Enter submits ("done") | PASS (attributes) / **NEEDS MANUAL TEST, high priority** | **Validity risk:** Gboard can still show a suggestion strip or autocorrect in some versions, which would show or fix the spelling being assessed. Mitigation in the protocol: suggestions and autocorrect off in the keyboard settings, and voice typing hidden |
| Answer box focused automatically on each question | PASS (code) / NEEDS MANUAL TEST | On Android this opens the keyboard every question. Check it does not hide "Repeat the word" |
| Progression after answering | PASS (by design) | No automatic advance. After Check, the feedback shows and the child taps **Next**; the next word is then spoken automatically. This keeps the correct spelling visible until the child moves on. Do not change it for the pilot |
| Speech after Next (no fresh tap on a speak button) | NEEDS MANUAL TEST | Relies on the page already having had a user gesture. Usually allowed on Chrome Android; must be confirmed |

### 2.4 Educator review of the question bank

| Item | Status | Size |
|---|---|---|
| Dictation words (spoken word plus sentence) | **BLOCKED** until reviewed for suitability | 79 words in `pilot/dictation-review.csv`. **Batch 1:** the 45 at difficulty ≤ 4.5 (about 45–60 minutes). **Batch 2:** the other 34. The check asks words up to 1–2 bands above a pupil's estimate, and placement estimates are often around 4, so both batches are needed before session 2 |
| Placement-eligible hand-written questions | **BLOCKED** until reviewed | 212 questions across 13 skills, all candidates. The 250-row pilot review CSV (`tools/english/pilot/review.ts export`) covers the five pilot skills only |
| Spelling lessons | BLOCKED if lessons are used | 20 lessons (82 in all) |
| Generated practice words | **BLOCKED** (B2) | 2,348 items, 815 words, none reviewed. Three known unsuitable words are present |
| Validity (difficulty, misconception tags) | Not required for a supervised usability pilot | Every result stays provisional. The review is for *suitability* (age, wording, unambiguous sentences), not calibration |

The review tool does not include the dictation bank, so batch 1 is a hand-off CSV. Approval does not turn a word into
a "validated" item for scoring. That is a separate, visible step, and everything stays provisional.

**Batch 1 (45 words):**

| Pattern (difficulty) | Words |
|---|---|
| plain (1.5) | pointed, talked, helping, looked |
| plain affix (1.75–2) | darkness, replay, unlock, unfair, payment |
| -es plural (2.5–2.75) | wishes, matches, brushes, foxes, churches |
| doubling, short words (3–3.25) | stopped, dropped, shopping, clapped, sitting, grabbed, planned |
| dropping the e (3.5–3.75) | writing, smiling, closing, saving, chasing, arriving |
| double letters where parts join (3.5–4) | totally, usually, meanness, unnoticed, dissatisfied, naturally |
| y to i (4.25–4.5) | hurried, happier, studied, worried, easiest, families |
| -ful, -ly, -ment (4.25–4.5) | powerful, wonderful, thankful, peaceful, excitement, enjoyment |

### 2.5 Logging and reproducibility

| What | Where | Status |
|---|---|---|
| Each answer: text typed, right or wrong, time, key | Developer dashboard → pupil → Answers (also the redacted report) | PASS |
| Question difficulty, and difficulty minus the estimate before | Same, per answer | PASS |
| Assistance status (independent, with help, after teaching, practice word, repeated) | Same (`evidence_kind`), plus "Evidence kinds" | PASS |
| Learner Vector update per answer (mean and sd, before and after) | Same (`estimate_change`); full vector in "Learner Vector" | PASS |
| Why each question was chosen | Decision trace per question: candidates, scores, rule, reasons; dictation rule, follow-up and range | PASS for sessions after tracing started; older ones say "not recorded" |
| Why the plan chose an activity | Plan trace: offered, started, standings, gaps and evidence-check range | PASS |
| Levels and gate (estimated, shown now, history, confirmed; what is missing) | "Demonstration and retention" | PASS |
| Misconception status with the answers behind it | "Misconception status" | PASS |
| Replay gives the same result | Unit replay tests; Pupil A replayed unchanged | PASS |
| Inspection in device-only mode | — | **Gap.** The dashboard reads server records only. A device backup can be exported, but nothing turns it into the report offline. Use account mode for the pilot (see B4) |
| Adult help that the app cannot see (re-reading a word, prompting) | Observation sheet only | Protocol: no prompting. Any help is recorded on the sheet |

### 2.6 Observation sheet

`pilot/observation-sheet.csv` has one row per child per session. It records:
- device and keyboard checks;
- assent;
- the independent teacher assessment and what it was based on;
- OpenPath's estimate and shown level for both dictation skills;
- agreement category;
- usability problems with severity;
- unexpected results with evidence;
- the child's reaction;
- any adult help.

The protocol gives the procedure.

### 2.7 Data protection and consent

| Requirement | Status |
|---|---|
| Written guardian consent and child assent, on an approved information sheet | **BLOCKED:** the drafts exist in `../english/PILOT_PROTOCOL.md` §3–4 but are not approved; data-protection review (decision D11) not done |
| In-app consent wording matches what happens | **BLOCKED for account mode.** The tick box says records are "not shared", but in the pilot the pilot lead and developer read them on the dashboard. Fix by running the pilot under the pilot lead's account, with paper consent that says so, or by changing the wording (needs approval) |
| Hosting and location of children's data | **BLOCKED.** No production host exists (PRODUCTION_BLOCKERS §B). The Codespaces preview keeps data in a GitHub codespace, outside India, private to one GitHub user. That needs the data-protection reviewer's agreement, or a device-only pilot |
| Minimisation: code names, no photos, no free text from children | PASS in the app (a name field, so use codes); protocol rule |
| Export and deletion: pupil export, pupil delete, account delete | PASS (e2e `accounts`) |
| Who read which record | PASS for developer reads (`DiagnosticAccessLog`). There is no general audit log |
| Retention schedule | BLOCKED: to be set in the protocol (proposed: delete within 2 weeks of the last session; exports within 3 months) |
| Verifiable parental consent (India DPDP Act 2023: under-18s are children), privacy notice, terms | BLOCKED: paper consent in a supervised setting is the proposed route; the reviewer decides |

## 3. Pilot blockers, in priority order

| # | Blocker | Why it blocks | Smallest way through |
|---|---|---|---|
| B1 | **No approved consent, information sheet, data-protection review or host agreement** | Children's data; legal and safeguarding | Approve `../english/PILOT_PROTOCOL.md` §3–4 and §7, adapted for account mode; D11 review; safeguarding lead signs |
| B2 | **Unreviewed generated practice words, including known-unsuitable ones** | A child could be shown *yessed* or *evillest* in practice | First pilot: placement, the dictation check and evidence checks only. The supervisor does not start spelling practice. Or port PR #14's exclusions before practice is used |
| B3 | **Unreviewed content children will see**: dictation words, placement questions | Suitability for age; ambiguous sentences | The educator reviews all 79 dictation words (batch 1 first) and the 212 placement questions, before sessions 2 and 1 respectively |
| B4 | **Where the data lives**: no production host; Codespaces needs a GitHub sign-in on each device and keeps data in a codespace | Data location, plus a session can fail if the codespace stops | Decide: (a) account mode on a private codespace, with the pilot lead's GitHub signed in on pilot devices and the reviewer's approval; or (b) device-only mode, with backups exported after each session and reviewed offline (needs a small backup-to-report script) |
| B5 | **Keyboard suggestions or autocorrect could reveal spellings** | Assessment validity | Manual test (A-4); protocol: suggestions, autocorrect and voice typing off on every pilot device. If they cannot be switched off, use a different keyboard |
| B6 | **Real-voice dictation untested on Android** | A word not heard is a wrong question | Manual test (A-3). Adult-reader mode is the fallback, and it is tested |
| B7 | **In-app consent text says records are "not shared"** | Misleading in a pilot where the lead reviews records | Pupils under the pilot lead's account, with paper consent stating the review; change the wording later with approval |

**Not blockers for a supervised usability pilot:**
- difficulty calibration;
- draft thresholds;
- educator approval for *scoring*: everything is provisional and labelled as such;
- no email verification or MFA, provided only the pilot lead's account is used;
- no offline queue in account mode: the protocol requires Wi-Fi, and a dropped connection stops the session safely.

## 4. Recommendation

**Not yet ready for children.** B1–B4 must be resolved first, and B5–B6 checked on the actual pilot devices.

**Ready for the next step:**
- the manual Android test with adults (half a day);
- the educator's dictation review (about 1.5 hours for 79 words) and placement review;
- the consent and data-protection review.

Once those pass, the first protocol can run with 5–10 pupils, under supervision, on placement and the dictation check
only.
