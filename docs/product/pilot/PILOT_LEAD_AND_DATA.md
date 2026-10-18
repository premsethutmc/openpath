# Pilot lead responsibilities and data-retention proposal

**DRAFT. Not approved.** The founder, the host organisation, its safeguarding lead and a data-protection reviewer
must agree to it.

## Pilot lead responsibilities

**Before the pilot:**
1. Hold the signed approvals:
   - the founder (setup and budget);
   - the host organisation and its safeguarding lead (protocol);
   - the data-protection reviewer (information sheet, consent form, this retention plan);
   - the educator (content review).
2. Collect a signed consent form for every child. Agree the code list with the host organisation, which keeps it.
3. Prepare each pilot phone:
   - owned by the pilot, with a screen lock, and not used for anything else during the pilot;
   - the manual Android test passed (ANDROID_MANUAL_TEST.md);
   - keyboard suggestions, autocorrect and voice typing off;
   - the pilot build loaded.
4. Train each supervising adult in PILOT_PROTOCOL_FIRST.md and the earlier protocol's stopping and distress rules.

**During the pilot:**
5. Make sure no child's name is typed into the app: codes only. Supervisors and teachers write no names on the
   observation sheet or the question log.
6. **After each session:**
   - export the child's record (Me → Export a backup) and save it to the encrypted pilot folder;
   - run the backup report (`scripts/backup-report.mts`);
   - fill in the OpenPath columns of the observation sheet.

   The learner stays on the locked pilot phone between sessions, because the next session continues from it.
   **After the child's last session:** delete the learner from the phone (Me → Delete this learner from this device).
7. **Within 24 hours:** review every "blocks" or "misleads" entry. Stop the pilot under the protocol's stop rules.
8. Pass any safeguarding concern straight to the host organisation's safeguarding lead. It never goes into the
   pilot records.

**After the pilot:**
9. Carry out deletions on schedule (below) and record them in the deletion log.
10. Handle withdrawal requests within [7 days]: delete, then confirm in writing.

## Data inventory and retention (proposal)

| Data | Where | Who can access | Kept until |
|---|---|---|---|
| App record | The locked pilot phone's browser (device-only mode) | The supervising adult and the pilot lead | Deleted from the phone after the child's last session, once exported |
| Exported record (JSON) and backup report | An encrypted folder (for example an AES-256 archive or an encrypted drive) held by the pilot lead | Pilot lead, developer, reviewing educator | [3 months] after the last session |
| Observation sheet and question log | The same encrypted folder | The same | [3 months]; then only a summary with no codes is kept |
| Teacher's independent level (consent item 4) | The observation sheet | The same | As the observation sheet |
| Code-to-name list | The host organisation only | The host organisation | The end of the pilot |
| Consent forms | The host organisation | The host organisation | Its own retention rule |
| Deletion log | The pilot lead | The pilot lead, the host organisation | [1 year] (it contains codes and dates only) |

**Never collected:**
- names in the app;
- photos, video or audio of children;
- location;
- device identifiers beyond a label such as "D1";
- free text written by children. The pilot build has no activity where a child writes in their own words: Read and
  answer (which stores a child's written answers) and the spelling journey are refused in a pilot build, and nothing is
  recorded if they are attempted (`frontend/src/english/logic/reading.test.ts`, pilot boundary tests). Enabling Read and
  answer for children outside the pilot needs this sheet, the parent information sheet and the in-app consent wording
  updated and approved first (see `docs/product/ENGLISH_LEARNING_JOURNEY_V1.md`, finding 4).

## Approvals that need human review (not represented here as given)

| Approval | By |
|---|---|
| Lawful basis and verifiable parental consent under India's DPDP Act 2023 (and any rules then in force), and the wording of the information sheet and consent form | Data-protection reviewer |
| Safeguarding arrangements, adults' suitability, room and supervision | Host organisation and its safeguarding lead |
| Running a pilot with pupils on its premises; any school or board policy on research with children | Host organisation (head or principal) |
| Content suitability for every word and question shown | Educator |
| Whether an ethics review is needed; insurance | Founder, with the host organisation |
| The environment, budget and retention periods | Founder |
