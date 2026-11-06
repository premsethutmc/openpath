# Deep recovery: educator hand-off (recovery-handoff@0, research)

When a flagged deep recovery stops without teaching the learner through, OpenPath now records one hand-off. It appears in a screen a real educator opens: **Content review → Marking → "Learners who need help"**. Nobody is emailed, messaged or pushed anything. The learner's note says only what the server has confirmed.

It is off by default, in two places:
- **The app:** only the `--test --deep-recovery` build with `?deep=1` reaches the stop screen hook (`deep-recovery-flag.ts`, unchanged).
- **The server:** every hand-off endpoint answers 404 unless `OPENPATH_DEEP_RECOVERY_HANDOFF=1` (or the Django setting of the same name) is set. When it is off, the learner sees the original note unchanged and the educator section is not shown.

## What was reused (inspected first)

| Existing mechanism | Used for |
|---|---|
| Educator role: `ContentReviewer(role="educator")`, granted by an administrator (educator-access@1) | Who counts as an educator. A removed role ends access on the next request |
| `MarkingShare`: a parent's explicit share of one pupil with one educator (written@1) | **The authorisation.** It is the only educator↔pupil relation in the code. handover@1 (`handover.py`) already uses it, so an educator can act on a paused competency for a pupil shared with them |
| Marking pseudonym `written._alias` ("Learner 3f2a") | How the educator sees the learner. No display name and no parent email |
| Content review → Marking (`frontend/src/review/Main.tsx`), and the `/review/#marking` link the parent's Written work section already gives | The visible surface |
| `DiagnosticAccessLog` (`developer.audit`) | Each resolution is logged (`recovery-handoff-resolve`, pupil id, hand-off id) |

No email, push or in-app notification mechanism exists in the code. None was added, and no text claims one.

## What was added

- **Model and migration:** `backend/family/handoff_models.py`, with the `RecoveryHandoff` model, and migration `0009_recovery_handoff`. The migration only adds a table, so existing tables and records are unchanged. A row holds:
  - pupil, original skill and original question, and the episode id (`deep:<original>#<time>`, the engine's own);
  - the step it stopped at, the reason, the text the learner was shown, and the diagnosis path;
  - when it was created and last reported, and the number of reports;
  - `resolved_at`, `resolved_by` and the note.
  - A partial unique constraint allows **one open item per pupil and original skill**.
- **API:** `backend/family/handoff.py`, routed in `urls.py`.
  - `POST /api/pupils/<id>/recovery-handoffs/` is called by the learner's app, which is the parent's account. It creates the item, or updates the open item.
    - It is refused unless the pupil has a saved answer on the original question or a saved answer with this recovery's `deep:` context.
    - Every field is validated, and the episode must belong to that original question.
    - A report for an episode that has already been resolved returns the resolved item and does not reopen it.
  - `GET /api/pupils/<id>/recovery-handoffs/` (parent): the pupil's items and `educatorCanSee`. That flag is true only if an active share with an account that still has the educator role exists.
  - `GET /api/recovery-handoffs/` (educator): items for pupils shared with this educator, open first. Each item carries:
    - the pseudonym and skill, and the step it stopped at;
    - the reason and the text the learner saw, and the diagnosis path;
    - the answers of that recovery: the original question and each answer saved with its `deep:` context, up to 40. Each answer shows the question, the response, the server's verdict and the step.
  - `POST /api/recovery-handoffs/<id>/resolve/ {note}` (educator with the share): resolves an item once; a second attempt gets 409. It is audited, and it changes no learner record.
- **App:**
  - `frontend/src/learning/deep-recovery-handoff.ts`, which is pure code:
    - it turns a stop screen into a report and works out the reason (rules below);
    - it chooses the learner's sentence.
  - `frontend/src/year/DeepRecoveryHandoff.tsx`: the note on the stop screen.
  - Worker B's `DeepRecovery.tsx` has a 2-line hook, which replaces the fixed handover paragraph at the stop screen only.
  - `frontend/src/review/Handoffs.tsx`: the list, included at the end of the Marking view. It shows nothing on a 403 or 404.

The reason comes from the engine's state. Phase `blocked` gives `missing-content`. For phase `escalate`, the engine's own reason text decides:

| Reason text contains | Reason recorded |
|---|---|
| "effort limit" | `budget-exhausted` |
| "no fresh question" | `no-fresh-question` |
| "have not clicked" or "did not fix it" | `teaching-not-worked` |
| "cannot teach" or "no explanation to offer" | `missing-content` |
| anything else | `unsettled` |

Matching on text is fragile. The node test pins every reason string the engine produces today.

## What people see

The **learner** sees this on the stop screen (blocked or escalate):

| Server says | Note |
|---|---|
| No answer, unreachable, or switched off | *Nothing here is counted as solved. Your answers so far are saved in your record, where a teacher or parent can go through them with you. OpenPath has not sent this to anyone.* (the original) |
| Open, no educator can see it | …*OpenPath has kept a note of this for an educator, but no educator can see it yet: your family has not shared your work with one. OpenPath has not sent this to anyone.* |
| Open, a shared educator can see it | *Nothing here is counted as solved. OpenPath has put this on the help list of the educator your family shared your work with: they will see which skill and why when they next sign in to OpenPath. Nobody has been emailed or messaged.* |
| Resolved | *An educator marked this as dealt with on YYYY-MM-DD. Their note: "…" Nothing here is counted as solved.* |

The **educator** opens Content review → Marking and sees **"Learners who need help (N open)"**. Each card shows:
- the pseudonym and the skill;
- the reason in plain words, and the step it stopped at;
- what the learner was told;
- the problem, the path that was checked, and when it was reported (and how often);
- a collapsed table of the learner's answers in that recovery;
- "Note for the learner (optional)" and **Mark as dealt with**.

## Access rules (tested)

- **Creating and reading as the learner:** only the parent's account that owns the pupil can do this. Any other account gets 404.
- **The list and resolving:** only an account with an **active educator role** and an **active share** for that pupil.
  - Other educators get an empty list, or 403 on resolve.
  - Parents get 403, and so does the learner's own account, which cannot resolve its own item.
  - Signed-out requests get 401 or 403.
  - A revoked share or a removed role ends access at once.
- **What the educator sees:** the pseudonym only. They never see the display name, the parent's email or anything beyond that recovery's answers.
- **What the learner sees of the educator:** "an educator" (the role) and the note. The educator's email is never shown.
- **Effect on the learner's records:** a hand-off is not a mark, not evidence and not mastery. Resolving it writes no learner record, `WrittenMark` or `HandoverAcknowledgement`.

## Tests

- **`backend/family/test_handoff.py`** (12 tests):
  - each of the 5 reasons;
  - a no-fresh-question stop that has only the original answer saved;
  - validation, and a stop being refused when no recovery started;
  - deduplication: re-reports, a new episode on the same skill, another skill;
  - a resolved episode is not reopened, while a later episode creates a new item;
  - access for the shared and unshared educator, another parent, the learner and a signed-out request, and after the share is revoked or the role removed;
  - `educatorCanSee`;
  - resolution: once only, audited, the note shown to the learner, the educator's email hidden;
  - learner records unchanged;
  - the switch: off means 404 and nothing written, and it is off by default;
  - existing marking, share, acknowledgement and record flows unchanged.
- **`frontend/src/journey/deep-recovery-handoff.test.ts`** (7 tests) runs real engine runs over synthetic learners:
  - missing content, no fresh question, effort limit and teaching not working are each reported with the right reason and a valid shape;
  - a learner who is taught through is never reported, and no screen before the stop is;
  - the reason mapping holds for every engine stop text;
  - the learner's sentences never claim that anything was sent.
- **`frontend/e2e/deep-recovery-handoff.test.mts`** runs Chromium against real Django with the switch on:
  - a blocked stop before any share, then after the share (one item);
  - a no-fresh-question stop;
  - the learner's account gets 403 on the list, and another educator's list is empty;
  - the shared educator's list shows both items with no name or email;
  - the educator resolves one with a note, and the learner's stop screen shows the note. The item is not reopened, and nothing is taught or marked.
  - Screenshots go to `SHOTS`.
- **Local results (2026-11-06):**
  - `test_handoff` 12/12 passed, and the full backend suite 348 passed (3 skipped) when run serially.
  - The node hand-off test passed 7/7, and B's `deep-recovery-app.test.ts` 10/10. Typecheck is clean.
  - The browser test passed all cases.
  - The browser test's proxy sends `connection: close`. A kept-alive idle socket blocked the `--nothreading` runserver.

## Open, not proven

1. **Consent wording.** The parent's share is labelled for **written work**: "Share written work with an educator". This hand-off, like handover@1 before it, treats that share as consent to show the educator that a recovery stopped and that recovery's answers. Before this goes beyond research:
   - The smallest fix is to change the parent's share text in `frontend/src/year/Main.tsx` (Written work) to say that the educator also sees when OpenPath could not teach a step.
   - The stricter fix is a per-share scope (`MarkingShare.includes_help`, default false) set by the parent. That would mean a second migration.
2. **No school, class or assignment relation exists.** The only relation is one parent sharing with one educator, by email. A learner whose parent has shared with nobody gets an item that no one can see, and the learner is told exactly that.
3. **No delivery.** The educator finds out only by opening Marking. There is no email or push. If one were wanted, it would need a real mail backend and an opt-in on the educator's account. None exists in the code.
4. **The parent's own view.** The parent does not see a hand-off list on the year page. The learner's stop screen is the only place it shows to them. The parent's account is also the account the learner's app uses.
5. **Resolution does not reopen the recovery.** It only records that the educator dealt with it. Coming back to the problem is still the engine's decision. handover@1's acknowledgement, which reopens a paused competency, is a separate mechanism and is not triggered here.
6. **The reason comes from the engine's English text** (above). A structured stop code in `deep-recovery.ts` (worker A's file) would be sturdier.
7. Synthetic accounts and learners only. Nothing is deployed. CI does not run the browser test yet, because `learning-year.yml` is worker B's file. To add it, CI must start Django with `OPENPATH_DEEP_RECOVERY_HANDOFF=1`.
