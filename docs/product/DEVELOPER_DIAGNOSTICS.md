# Developer diagnostics (`/developer`)

`/developer` lets the founder see how OpenPath is running and what the engine knows about a test pupil, and why. It
works on a phone, through the Codespaces preview, without running any commands. All educational content is still
provisional: these diagnostics are for checking the software, not for approving content.

## 1. Opening it on your phone

1. Start the preview as described in [PREVIEW_ON_ANDROID.md](PREVIEW_ON_ANDROID.md), on branch
   `product/developer-diagnostics`.
2. When the codespace starts, its log (the creation log, or the terminal running `start-preview.sh`) prints two
   things: the preview address, and a **one-time developer code**:
   ```
   Developer diagnostics: sign in at https://<codespace>-4175.app.github.dev/developer and enter this one-time code
   (it works once, within 24 hours, for the account that enters it):
     K7QX-M2PA-9RTD
   ```
3. On the phone, open `…/developer` (the preview address followed by `/developer`), and sign in with your parent
   account. Create the account in the app first if you have none. Once you are a developer, **Me → Open developer
   diagnostics** links there too.
4. Enter the code once. That account is now a developer until the grant is revoked. A new code is printed every
   time the codespace starts, and it replaces any earlier unused code. Unused codes expire after 24 hours.

If you need a code without restarting, run `cd backend && python3 manage.py developer issue-claim` in the codespace.
`developer list`, `developer grant <email>` and `developer revoke <email>` also exist. None of this is needed for
routine use.

**If it does not load:**
- Every request has a 15-second limit (2 minutes for importing a whole record).
- `/developer` always ends in a definite state: sign in, enter the code, the dashboard, or an error. An error says
  which step failed (for example `developer status: HTTP 404 (/developer/status/)`) and has a **Retry** button.
- A 404 there means the API is older than the page. `start-preview.sh` now finds and replaces such servers.
- If the page and the API were built from different commits, a warning shows both.

## 2. What it shows

**Health:**
- server commit and app build;
- database;
- counts of accounts, pupils, sessions, assessments and answers;
- app timings (p50, p95 and max over 7 days): answering, saving, Learner Vector rebuild, question selection, opening
  a learner;
- API timings per route;
- client and server errors, and failed saves.

**Pupils:** pupils in your own account, plus pupils whose parent turned on **Me → Share … for diagnostics**. That
setting is off by default, the parent can turn it off at any time, and your email is never shown to them.

**Pupil detail.** The pupil's record is replayed in your browser by the existing engine (`fold`/`Ledger.rebuild`,
`leafView`, `learnerProfile`, and the app's own `Learner` on a throwaway copy). It shows:
- the Learner Vector: estimate, standard deviation, 80% range, certainty, standing, engine stage, and evidence by kind;
- consistency checks:
  - rescoring;
  - pool use;
  - passages counted twice;
  - "shown" claims;
  - provenance;
  - clock and order;
  - targeting;
  - the "improving" label;
  - open sessions;
  - missing traces;
- Today's recommendations, with the planner's "why" and "would change if";
- the next question each activity would ask, with what the engine weighed and its difficulty against the pupil's
  ability;
- misconceptions and skill gaps;
- independent evidence against assisted practice;
- demonstration and retention;
- missing evidence and content shortages, including the engine's own bank-gap reports;
- every answer, with its difficulty minus the estimate just before it, and how the estimate moved;
- the decision trace, and the complete event history.

**Question bank:** questions per skill, by difficulty band and pool; generated practice words; lessons.

**Audit log:** your own developer reads.

## 3. Decision traces

From this version, the app records a `trace` event in the pupil's own record each time a decision is made.

**When a question is first shown:**
- **Engine choices** (placement, checks, practice, more practice) record:
  - the estimates of the skills in play;
  - how many questions were eligible, and how many each rule kept out (reserved pool, passage rule, word already
    seen);
  - the engine's mode, path, schedule and target;
  - the chosen candidate's score, probability and reasons;
  - up to six alternatives, each with why it was not chosen (a lower score, or the engine's tie-break);
  - bank gaps;
  - the engine's explanation.
- **Spelling sessions** record the fixed list's position and why the list was made.
- **The doubling journey** records the rule planner's action, diagnosis and reason.

**When a session is started:** what Today offered, which one was started, and the standings at that moment. The
dashboard compares consecutive plans as facts: the first suggestion stayed or changed, and which standings changed.

**After an answer:** the effect on the Learner Vector is the ledger's own decision. That is the verdict, the estimate
before and after, and the shifts to related skills.

Traces are never evidence. `fold` ignores them, and a test checks that the Learner Vector, decisions, standings and
plan are identical with and without them. Durations are not stored in traces, so the same answers still give the
same record; timings go to telemetry instead.

Anything recorded before tracing existed is labelled **"decision details not recorded (this happened before
decision tracing existed)"**. No explanation is reconstructed for it.

## 4. Reports for ChatGPT or Claude

On a pupil, press **Generate Diagnostic Report**, then **Copy Report** (the readable report followed by the full
JSON), **Download (.txt)** or **Download JSON**. Paste it into the assistant.

**Redaction:**
- Redaction is on by default. The pupil's name, wherever it appears (answers included), becomes "Pupil A", and the
  record id becomes `pupil-A`.
- Email-like text is removed.
- Flag notes are never included; only their count is.
- A child's written answers (Read and answer, `written_answer` events) are never included in a report, redacted or not
  (`reading.test.ts`). In another family's shared record, the developer view of the raw events blanks the answer text and
  every quote or suggestion taken from it. It keeps only the judgement's shape: levels, key-point ids, and counts of
  writing flags (`backend/family/developer.py`, `test_developer.py`). A developer's own pupils are shown in full, as for
  My Words and My Books.
- No password, token, session or CSRF value ever reaches the page.

Reports contain answers and timestamps, because a diagnosis needs them. Reports are read-only: they are computed in
the browser from a copy, and a test checks that the record and the stored copy are unchanged.

## 5. Security model

**Who is a developer:**
- Only an account with an active `DeveloperAccess` grant.
- A grant comes only from a one-time claim code, or from the management command.
- Codes:
  - are 60-bit random values, stored only as a SHA-256 hash;
  - are single-use (row-locked) and expire after 24 hours;
  - stop working when a newer code is issued or any developer is revoked, so a code left in an old log cannot
    restore revoked access;
  - are claimed by a signed-in account, with CSRF protection and a throttle of 10 attempts an hour.
- Every refusal is audited.
- Knowing the URL, or registering with an email such as `admin@…`, grants nothing. Tests cover this.

**What a developer can read:**
- aggregate application health;
- the records of their own pupils, and of pupils explicitly shared by their parent.

Other families' pupils return 404. Being a developer does not widen the ordinary parent API either.

**Read-only:** the developer endpoints are GET-only (405 otherwise). Every read is written to the audit log: who,
when, what, and which pupil.

**Telemetry:**
- It is accepted only from signed-in parents.
- Metric names come from a fixed list, durations must be numbers, and details are short.
- Emails are scrubbed on the client and again on the server.
- The app version must look like a commit id (anything else is stored as "other").
- Each account is limited to 240 requests an hour and 5,000 measurements a day. Rows keep the sending account, so a
  flood can be found and removed.
- Request bodies, answers and names are never recorded.
- Server metrics record route names, never paths (paths contain pupil ids). Server errors record only the exception
  class and its first line, with quoted values and emails removed.
- Rows older than 14 days are pruned.

**Untrusted records:** a shared pupil's record comes from another family. Events the app would refuse on import, and
malformed traces, are left out of the diagnosis and reported as a "malformed events" issue. Nothing is rendered as
HTML.

**Traces never block a learner:** a trace that cannot be saved is measured as `save_failed` and the session carries
on. Traces are capped in size (about 2 KB each).

**Never:**
- PostgreSQL is not exposed.
- There is no unauthenticated diagnostics endpoint.
- No API key is in the frontend.

## 6. Future: direct, read-only access for an AI review tool (design, not built)

Until this exists, **Copy Report** is the complete alternative and needs no terminal.

1. **Explicit grant.**
   - On a pupil page, the developer presses "Allow AI review". This creates a review token scoped to one pupil (or
     to health only), read-only, with a short expiry (default 1 hour, maximum 24).
   - It is shown once, and only its hash is stored, as with claim codes.
   - It can be revoked from the dashboard at any time.
2. **Narrow API.**
   - `GET /api/review/<token>/report` returns the same redacted JSON report, built server-side by running the same
     engine code under Node, or uploaded by the dashboard when the token is created.
   - Nothing else is reachable with the token: no writes, no other pupils, no account data.
3. **Audit.** Every use is logged with the token id, time and client, and the dashboard lists the token's uses.
4. **Limits.**
   - Rate limits apply per token.
   - Responses are `no-store` and `noindex`.
   - Tokens are never put in URLs that get logged by proxies; the header form `Authorization: Review <token>` is
     preferred.
   - The token is never embedded in frontend code.
5. **Not done:**
   - no database access;
   - no long-lived keys;
   - no unauthenticated endpoints;
   - no tokens that outlive their expiry.

## 7. Tests

| Test file | Number of tests | What it covers |
|---|---|---|
| `backend/family/test_developer.py` | 17 | Authorisation (signed out, ordinary parent, likely emails); single use, hashing and expiry of codes; CSRF; revoke; cross-family scope and sharing; read-only (405, data unchanged); audit; no contact details in health; the telemetry whitelist and scrubbing; route names, never paths; server error capture; newer codes and revokes end older codes; telemetry version check and per-account cap; quoted values removed from errors |
| `frontend/src/english/logic/diagnostics.test.ts` | 13 | Each trace is recorded with its question and matches the engine's state at that moment; queue positions; plan traces; journey planner traces; traces change nothing; the diagnosis equals `leafView` and ledger decisions; "not recorded" labelling; reports are read-only; redaction, including names in any alphabet and names such as "True"; failed saves are measured; malformed events are left out and reported; a trace that cannot be saved never stops a session |
| `frontend/e2e/developer.test.mjs` | 2 | On a phone, with the real API: an ordinary parent at `/developer` is refused; the founder claims a code, sees health, opens Arun, sees every question traced, copies a redacted report, and downloads it; the record is unchanged; another family's pupil is visible only while shared; question bank; audit |
