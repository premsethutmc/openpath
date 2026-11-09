# Deep recovery: educator hand-off (recovery-handoff@0, research)

When a flagged deep recovery stops because the learner needs a person, OpenPath records one hand-off. This applies to a recovery started from the stuck view and to one started inside a module. A routine sitting-limit pause creates nothing.

The hand-off appears in a screen a real educator opens: **Content review → Marking → "Learners who need help"**. Nobody is emailed, messaged or pushed anything. The learner's note says only what the server has confirmed.

It is off by default, in two places:
- **The app:** only the `--test --deep-recovery` build with `?deep=1` reaches the hooks (`deep-recovery-flag.ts`, unchanged).
- **The server:** every hand-off and permission endpoint answers 404 unless `OPENPATH_DEEP_RECOVERY_HANDOFF=1` (or the Django setting of the same name) is set. When it is off:
  - the learner sees the original note unchanged;
  - the educator section is not shown;
  - the parent's permission section is not shown.

Synthetic data only.

## What was reused (inspected first)

| Existing mechanism | Used for |
|---|---|
| Educator role: `ContentReviewer(role="educator")`, granted by an administrator (educator-access@1) | Who counts as an educator. A removed role ends access on the next request |
| `MarkingShare`: a parent's explicit share of one pupil with one educator (written@1) | **Who may see that a learner needs help.** It is the only educator↔pupil relation in the code, and handover@1 already uses it the same way |
| Marking pseudonym `written._alias` ("Learner 3f2a") | How the educator sees the learner. No display name and no parent email |
| Content review → Marking (`frontend/src/review/Main.tsx`), and the `/review/#marking` link the parent's Written work section already gives | The visible surface |
| `DiagnosticAccessLog` (`developer.audit`) | Each resolution is logged (`recovery-handoff-resolve`) |

No email, push or in-app notification mechanism exists in the code. None was added, and no text claims one.

## When a help item is created (phase 7)

| Stop | Help item? |
|---|---|
| Stuck view, recovery ends **blocked** or **escalate** | Yes: `DeepRecovery.tsx` stop screen |
| Inside a module, the module is **paused by deep recovery**: `deep-module.ts` sets `why` to "deep-recovery-module@0: blocked" or "…: escalate" | Yes: `Learn.tsx` module pause screen → `DeepModuleHandoff` → `moduleStop()` finds the stopped episode |
| A **routine sitting-limit pause** (the episode's own `pause` end screen; in a module, the module stays on "recover" and resumes next sitting) | **No.** The learner sees: *"This is a routine break, not a problem: your place is saved and you carry on next time. Nothing has been sent to anyone."* |
| Solved, solved after help, or any screen before the stop | No |
| A shipped module pause not caused by deep recovery | No (out of this research path) |

A later genuine stop after a routine pause creates the item; this is tested in node, in a module.

## Structured stop reason (phase 7)

The app no longer matches English text. `stopCode(screen, records)` in `frontend/src/learning/deep-recovery-handoff.ts` uses only structured fields that `deepRecovery` already returns: `phase`, `blocked`, `diagnosis`, `active`, `module`, `effort` against `budget`, and `episode`. It also reads the saved lessons.

| Structured state | Code |
|---|---|
| `phase` "blocked", or `blocked` set | `missing-content` |
| The adapter's own escalate (engine `phase` still "teach") | From the module's phase: `unavailable` gives `missing-content`; `pause` or `reentry` gives `teaching-not-worked`; anything else gives `unsettled` |
| `diagnosis` "prerequisite" (a gap was found and escalated) | `teaching-not-worked` |
| `diagnosis` "unexplained", with `module` | `missing-content` |
| `diagnosis` "unexplained", the skill itself taught in this episode (a lesson with this `episode` id, or for older records a lesson on it after the episode began) | `teaching-not-worked` |
| `diagnosis` "unexplained", not taught | `missing-content` |
| No diagnosis, `effort` ≥ `budget` | `budget-exhausted` |
| No diagnosis, `active` set | `no-fresh-question` |
| Otherwise | `unsettled` |

The node test keeps the old text matching only as an independent oracle. Every real engine stop agrees with it.

**Minimal change worker A should make in `packages/learning/src/deep-recovery.ts`** (not made here):
1. Add `stop?: "missing-content" | "no-fresh-question" | "teaching-not-worked" | "budget-exhausted" | "unsettled"` to `DeepRecoveryState`.
2. Set it at each terminal `out(...)`:

| Line (approx.) | What it is | Value |
|---|---|---|
| 284 | `tired`, escalate branch | `"budget-exhausted"` |
| 290 | `noFresh` | `"no-fresh-question"` |
| 347, 368 | "no fresh question left to check" | `"no-fresh-question"` |
| 376 | own skill taught, did not fix it | `"teaching-not-worked"` |
| 378 | cannot teach own skill | `"missing-content"` |
| 381 | module has no explanation now | `"missing-content"` |
| 387 | blocked | `"missing-content"` |
| 395 | "have not clicked" | `"teaching-not-worked"` |
| 398 | could not settle | `"unsettled"` |

Then `stopCode` becomes `s.state.stop ?? <the derivation above>`, and the adapter's own escalate in `deep-recovery-app.ts` (B's file) sets its code from the module's phase.

## Parent permission for recovery answers (phase 7)

The written-work share alone does **not** show recovery answers.

- **The permission:** a separate, explicit, revocable permission `RecoveryAnswersShare(pupil, educator, granted_at, revoked_at)`, added in migration `0010_recovery_answers_share`. **This is a second migration.** It only adds a table.
- **Endpoint:** `GET/POST/DELETE /api/pupils/<id>/recovery-answers-share/ {email}`.
  - Only the parent who owns the pupil can use it; anyone else gets 404, and signed-out requests are refused.
  - It can be granted only to an educator who already has an active written-work share for that pupil. Otherwise the same 400 is returned whatever the reason, so the endpoint does not reveal whether an account exists.
  - Granting twice keeps one active row. A revocation takes effect on the next request.
- **Parent UI:** a "Recovery answers (research prototype)" section on the year page, below Written work (`frontend/src/year/RecoveryAnswersPermission.tsx`, a one-line hook in `year/Main.tsx`). It appears only in the research build and only when the server switch is on. The wording:
  > When OpenPath cannot teach your child through a problem, it puts the problem on the help list of the educators who mark their written work. That list shows the skill, why OpenPath stopped, and the step it stopped at.
  > With this permission, a chosen educator also sees your child's answers from that recovery: each question, what was answered and whether it was right, what OpenPath told your child, and the skills it checked. This is separate from sharing written work. Nothing is shared until you allow it, and you can stop it at any time. OpenPath does not email or message anyone either way.

  For each written-work educator it offers "Allow … to see recovery answers" or "Stop showing recovery answers to …".
- **What the educator sees without the permission:**
  - the pseudonym, the skill, the reason, the step, and the status and dates;
  - the note: *"The parent has not allowed this learner's recovery answers to be shown, so only the skill, the reason and the step are here."*
  - The server omits `original`, `detail` (what the learner was told), `path` and `evidence` entirely.
- **With the permission**, the educator also sees the problem, what the learner was told, the skills checked, and the table of answers.

## Model, API and app

- **`RecoveryHandoff`** (migration 0009) holds:
  - pupil, original skill and original question, and the episode id;
  - the step, the reason, the learner text and the path;
  - when it was created and reported, and the number of reports;
  - resolution: `resolved_at`, `resolved_by` and the note.
  - There is **one open item per pupil and original skill**. A report for an episode that has already been resolved returns the resolved item and does not reopen it.
- **API:**
  - `POST`/`GET /api/pupils/<id>/recovery-handoffs/` (parent's account). Creating needs a saved answer on the original question or with this recovery's `deep:` context. The response includes `educatorCanSee`.
  - `GET /api/recovery-handoffs/` (educator with role and share). Each item includes `answersShared`.
  - `POST /api/recovery-handoffs/<id>/resolve/` (once only, audited, changes no learner record).
- **App:** `deep-recovery-handoff.ts` holds the pure parts: `stopCode`, `handoffReport`, `moduleStop` and the texts. The components and hooks are:
  - `DeepRecoveryHandoff.tsx`: `DeepRecoveryHandoff` and `DeepModuleHandoff`;
  - `review/Handoffs.tsx`;
  - `RecoveryAnswersPermission.tsx`;
  - hooks in other workers' files, one line each: `DeepRecovery.tsx` (stop screen, B), `Learn.tsx` (module pause screen, C), `year/Main.tsx` (after Written work), `review/Main.tsx` (end of Marking).

## What people see

The **learner** sees, by what the server says:

| Server says | Note |
|---|---|
| Routine pause (nothing is sent to the server) | *This is a routine break, not a problem: your place is saved and you carry on next time. Nothing has been sent to anyone.* |
| No answer, unreachable, or switched off | *Nothing here is counted as solved. Your answers so far are saved in your record, where a teacher or parent can go through them with you. OpenPath has not sent this to anyone.* |
| Open, no educator can see it | …*OpenPath has kept a note of this for an educator, but no educator can see it yet: your family has not shared your work with one. OpenPath has not sent this to anyone.* |
| Open, a shared educator can see it | *Nothing here is counted as solved. OpenPath has put this on the help list of the educator your family shared your work with: they will see which skill and why when they next sign in to OpenPath. Nobody has been emailed or messaged.* |
| Resolved | *An educator marked this as dealt with on YYYY-MM-DD. Their note: "…" Nothing here is counted as solved.* |

The **educator** sees "Learners who need help (N open)", one card per item as described above, a note box and **Mark as dealt with**. The list's intro says that nobody is emailed or messaged and that answers appear only with the parent's separate permission.

## Access rules (tested)

- **Hand-offs as the learner:** only the parent's account can create or read them. Any other account gets 404.
- **The list and resolving:** only an account with an **active educator role** and an **active written-work share** for that pupil.
  - Other educators get an empty list, or 403 on resolve.
  - Parents get 403, and so does the learner's own account, which cannot resolve its own item.
  - Signed-out requests get 401 or 403.
  - A revoked share or a removed role ends access at once.
- **Answers:** shown only with an active `RecoveryAnswersShare` for that pupil and that educator. Each educator needs their own permission. Revoking it hides the answers on the next request. Stopping the written-work share hides the whole item.
- **Who sees whom:** the educator sees the pseudonym only. The learner sees "an educator" and the note, never the educator's email.
- **Effect on the learner's records:** a hand-off is not a mark, not evidence and not mastery. Resolving it writes no learner record, `WrittenMark` or `HandoverAcknowledgement`.

## Tests

- **`backend/family/test_handoff.py`** (17 tests):
  - the earlier 12: creation for each reason, deduplication, access, resolution, the switch, old records;
  - the educator sees skill, reason and step only until the permission is given, and answers after it;
  - 5 permission tests:
    - sharing written work does not share answers;
    - a grant needs the written-work share, is per educator and is idempotent;
    - only the parent can manage it;
    - revoking hides the answers again, and stopping the written-work share hides the whole item;
    - the switch off gives 404.
  - Off by default.
- **`frontend/src/journey/deep-recovery-handoff.test.ts`** (12 tests) runs real engine runs over synthetic learners:
  - From the stuck view: missing content, no fresh question, effort limit and teaching not working each give a structured code that agrees with the text oracle.
  - Every structured branch not reached by a run is covered on its own.
  - Routine sitting pauses are never reported, and the genuine stop after them is.
  - **In a module:**
    - teaching not working gives `teaching-not-worked`;
    - an unteachable missing piece gives `missing-content`;
    - a routine sitting-limit pause inside the module creates nothing, the module stays on "recover", and the text says nothing was sent;
    - a later genuine stop of the same episode in the next sitting is handed over;
    - a module that finishes normally is never handed over.
  - A learner who is taught through is never reported.
  - No learner text says anyone was notified.
- **`frontend/e2e/deep-recovery-handoff.test.mts`** runs Chromium against real Django with the switch on:
  - a blocked stop before and after the written-work share (one item);
  - a no-fresh-question stop;
  - access: the learner's account gets 403 and another educator's list is empty;
  - the shared educator sees skill, reason and step only;
  - **the parent grants the recovery-answers permission on the year page** and the educator sees the answers, for that learner only; **the parent revokes it** and they are hidden again;
  - resolution with a note, which shows on the learner's stop screen.
  - Synthetic accounts only. The proxy sends `connection: close` because the runserver uses `--nothreading`.

## Open, not proven

1. **Consent wording beyond research.** The `RecoveryAnswersShare` prototype is the explicit permission the owner asked for, but it has not been reviewed by anyone as consent wording.
   - The help item itself (skill, reason, step) is still authorised by the **written-work** share, as handover@1 is. Its text does not yet tell the parent this. For use beyond research, the Written work text should say: "an educator you share with also sees when OpenPath could not teach a step (the skill, the reason and the step)".
   - The routine-pause and stop wording would also need review.
2. **No school, class or assignment relation exists.** A learner whose parent has shared with nobody gets an item that no one can see, and the learner is told exactly that.
3. **No delivery.** The educator finds out only by opening Marking.
4. **The parent's own view.** The parent sees no hand-off list, only the learner's stop screen and the permission section.
5. **Resolution does not reopen the recovery or the module.**
6. **The structured code is derived in the adapter**, pending the `stop` field described above. Two branches depend on the saved lessons.
7. **The module routine-pause test uses a synthetic slipping learner**, which reaches the sitting limit of 40 in the module. The following genuine stop uses a learner who, from the next sitting on, gets nothing below the problem right. These are synthetic behaviours, not real learning outcomes.
8. **The browser test does not drive a module journey.** Module behaviour is covered in node only. CI does not run the browser test, because `learning-year.yml` is worker B's file and CI would need Django started with the switch on.
