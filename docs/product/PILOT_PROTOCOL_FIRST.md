# First supervised pilot: protocol and success criteria (proposal)

**Status:** a proposal for approval. It is not approved.

**What it adds to the earlier draft:** it builds on [../english/PILOT_PROTOCOL.md](../english/PILOT_PROTOCOL.md).
These sections of that draft apply unchanged and are not repeated here:
- §3 guardian consent;
- §4 child assent;
- §6 supervision, frustration and distress;
- §7 data, withdrawal and deletion;
- §8 failure log.

The differences below come from the current app: parent accounts, dictation and diagnostics.

**Before the first child:** every blocker in [PILOT_READINESS_AUDIT.md](PILOT_READINESS_AUDIT.md) §3 must be closed,
and [ANDROID_MANUAL_TEST.md](ANDROID_MANUAL_TEST.md) must pass on each pilot device.

## 1. Question and limits

**What it asks:**
- Can 10–12-year-olds use the spelling check by dictation on an Android phone under supervision?
- Do the app's records let us see exactly what happened?
- Where do OpenPath's provisional spelling estimates and levels sit next to a teacher's own judgement?

**What it does not do:**
- It does not validate the estimates. The difficulties are author estimates and every threshold is a draft.
- It does not measure teaching.
- It does not place, grade or report on any child.
- No OpenPath result goes to the child, the guardian or the school. The supervisor may describe how the sessions
  went, in their own words.

## 2. Set-up

| Item | Proposal (*decide*) |
|---|---|
| Pupils | 5–10, aged 10–12. The guardian's written consent and the child's assent are required |
| Account | One pilot account held by the pilot lead. One learner per child under a code (P01…P10), never a name. Band "School learner", goal "spelling" |
| Hosting | As decided for blocker B4: a private codespace under the pilot lead, or device-only. Wi-Fi at the site |
| Devices | Phones that passed the manual test, with the keyboard settings in its §0. One phone per child at a time. Sound on; headphones if the room is shared |
| Supervisor | Trained on this protocol and the observation sheet. Present throughout. Never prompts, re-reads a word or hints, except in adult-reader mode |

## 3. Sessions (three per child)

**Session 1: starting point (at most 20 minutes).**
1. Assent.
2. Placement: "Find your starting point", 12–24 questions.
3. If it is not finished within 20 minutes, "Save and leave". It resumes next time.

**Session 2: spelling check (at most 20 minutes), on another day.**
1. Assent.
2. Spelling check by dictation (8–14 words). Use the device voice, or the adult reader if the device failed manual
   test §3 (it is recorded either way).
3. After the check, open Progress for the supervisor only. Do not show or explain it to the child.

**Session 3: evidence check and return (at most 15 minutes), 1–7 days after session 2.**
1. Assent.
2. On Home, start only one of these, if Today offers it:
   - a spelling **evidence check** by dictation ("Show what you know", titled "…: hear and spell");
   - the **spelling check** again (if it was stopped before finishing).

   Other checks draw on questions outside the reviewed batch.
3. **Do not start:**
   - spelling practice or lessons (generated practice words are unreviewed, blocker B2);
   - word review;
   - More practice;
   - the doubling journey.
4. If none of the allowed activities is offered, end the session and record "nothing to do".

**Applies to every session:**
- The stopping rules in the earlier protocol §5 apply, including stopping after 5 wrong in a row.
- A later check is due about 7 days after something is first shown. It is outside this first pilot unless a fourth
  session is approved.

## 4. Independent teacher assessment

**Who and when:** the child's teacher, before session 2, without seeing any OpenPath result.

**How:** one of the following (*decide* one for the whole pilot):
- **(a)** the school's own most recent spelling assessment, mapped by the educator to the nearest pattern band
  (roughly: -s/-ed/-ing 1.5, -es 2.5, doubling 3, drop e 3.5, y to i 4.25, doubling in longer words 5.75);
- **(b)** a 12-word teacher dictation:
  - 2 words per pattern band from 1.5 to 5.75, chosen and reviewed by the educator;
  - none of them in the OpenPath dictation bank;
  - scored by the highest band with both words right.

**Where it is recorded:** the observation sheet, as `teacher_spelling_level` and `teacher_basis`. It is a rough
reference, not a gold standard.

## 5. What is recorded

| Source | What | Who |
|---|---|---|
| App, server-side | Every answer, time, difficulty, help status, Learner Vector change, why each word was chosen, plan decisions, levels and the gate | Automatic |
| Developer dashboard | The redacted report per child, copied after each session into the pilot folder (encrypted) | Pilot lead |
| Observation sheet (`pilot/observation-sheet.csv`) | One row per child per session: device checks, assent, teacher level, OpenPath estimate and shown level, agreement, usability problems, unexpected results, reaction, any adult help | Supervisor |
| Failure log | As in the earlier protocol §8, with severity blocks / misleads / minor | Supervisor |

**After each session, within 24 hours, the pilot lead:**
1. opens the dashboard;
2. fills the OpenPath columns on the sheet: estimated level, shown level, standing and mastery label for inflections
   and morphological;
3. reviews every "misleads" entry against the decision traces.

## 6. Success criteria

These are the criteria for going on to a second pilot. They are about usability and process, not validity.

| # | Criterion | Target |
|---|---|---|
| S1 | Sessions completed without a "blocks" failure | ≥ 90% |
| S2 | Dictation words heard on the first automatic play (device voice), from the sheet and failure log | ≥ 95% of words; adult reader used on ≤ 1 device |
| S3 | Keyboard revealed or changed a spelling (suggestion, autocorrect, voice typing) | 0 occurrences |
| S4 | Distress incidents attributable to the app (content, difficulty, feedback wording) | 0; any one pauses the pilot for review |
| S5 | Unsuitable or confusing content incidents (word, sentence, feedback) | 0 unsuitable; confusing ones logged and fixed before the next pilot |
| S6 | Answers traceable in the dashboard: item, difficulty, help status, estimate change and reason chosen | 100% of answers in sessions 2–3 |
| S7 | Session length within limits | ≥ 80% of sessions |
| S8 | "Misleads" judgements reviewed by the educator, each classed as content, rule or correct | 100% |
| S9 | Teacher vs OpenPath agreement | **Reported only, with no target.** For each child: teacher level, OpenPath estimate and shown level, and the direction of any difference. Differences of more than one band are reviewed with the traces. No threshold is tuned from 5–10 children |

**Stop the pilot if:**
- any S3 or S4 event occurs;
- a data or consent problem is found;
- two or more sessions in a row hit a "blocks" failure.

## 7. After the pilot

1. Delete pilot records on the agreed dates (earlier protocol §7).
2. The educator reviews S5 and S8 and the content flagged.
3. Write a short report with:
   - S1–S8 results;
   - the S9 table;
   - usability problems ranked;
   - the content decisions;
   - what would change for a second pilot.
4. No change to thresholds or scoring without an empirical case and a reviewed, versioned change.
