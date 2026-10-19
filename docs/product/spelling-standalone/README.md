# Standalone Spelling Bee: private review build

Branch: `feat/spelling-bee-standalone-learning`. Base: integrated PR #55,
`174f73136841b9f980fe35c632ed290c2ead1b5a`. Separate entry/build; existing OpenPath
navigation and the original Bee remain available in the ordinary build.

## What works

Parents create/select a learner, type/paste/upload `.txt` or `.csv` word lists,
review accepted spellings, name/save/edit/delete lists, and start practice.
The child learns up to five words: listen, say, inspect the letters, hide the
spelling, type from memory, and receive immediate feedback. Asking to see the
word again records help before revealing it. Children can continue a saved
session; instructional stage and drafts saved on leaving the input survive
reload. Text still being typed is not saved per keystroke.

New words are studied first. Later sessions ask for hidden-spelling recall.
The existing spelling review schedule is reused: newly studied, helped or missed
words return next session; successful unaided recalls use the existing 1, 3,
and 7 day intervals. This supports retrieval practice and spaced review; it does
not guarantee memorization or establish effectiveness with children. Short
parent-guided practice and a supplied sentence help connect spelling to meaning;
the system does not invent definitions or pronounce words through paid services.
Audio uses the existing browser/device voice; test on the actual Samsung phone.
A grown-up can read the word during Learn if device speech is unavailable.

Assisted answers cannot advance the review box or practice level. These events
are practice receipts, not native estimator evidence or verified mastery.
Built-in material remains provisional. Parent lists are not educator approval.

Parent account/privacy/backup controls reuse the existing Me screen. This includes
export, deletion and diagnostic-sharing controls; there is no new identity system.
Uploaded content deletion and diagnostic redaction also cover new learning receipts.

## Build and private preview

From repository root:

```sh
cd frontend
npm ci
node scripts/build-spelling-bee.mjs
```

Run the existing password-gated server from repository root with `DEMO_DIST=frontend/dist-english-bee`,
`DEMO_TITLE='OpenPath Spelling Bee'`, `DEMO_PASSWORD_HASH` and `DEMO_SESSION_SECRET`
set securely in the environment. Generate the password hash with
`node frontend/scripts/demo-hash-password.mjs`; never commit a password or secret.
`node frontend/scripts/demo-server.mjs` starts the server. Require HTTPS in hosting;
`DEMO_ALLOW_HTTP=1` is for loopback testing only.

For an authenticated **Codespaces owner preview**, open this branch in a Codespace,
run the build, generate a synthetic preview password/hash and session secret,
set the variables above plus `PORT=4176` and `DEMO_ALLOW_HTTP=1` for the internal
server, then start the server. In Ports, forward 4176 and keep visibility **Private**.
Use that port's exact “Open in Browser” URL on Android while signed into the owner’s
GitHub account, then enter the preview password. Do not make the port public.
This workspace is not a Codespace and cannot manufacture that authenticated URL.

`render.spelling-bee.yaml` prepares a **separate**, password-gated Node service.
Create the service from this branch using that Blueprint file; supply the scrypt
password hash through Render's secret settings. The session secret is generated
by Render. Keep manual deployment. The service URL is assigned by Render; none
has been deployed or verified in this workspace. Free services may sleep.
This configuration serves browser-only storage and deliberately has no account API.
It must not replace the current OpenPath service.

### Device storage versus account sync

- The password-gated static preview saves lists/progress only in that phone's
  browser. Clearing browser data loses them; export a backup first. Its shared
  preview password is an owner access gate, not a family account system.
- Cross-phone parent accounts use the existing Django family API, database,
  HttpOnly session cookies and CSRF controls. For local integration testing,
  start Django against an isolated synthetic database and run
  `DIST=dist-english-bee PORT=4660 API_TARGET=http://127.0.0.1:8660 node scripts/preview-english.mjs`
  from `frontend`. This developer server is local testing infrastructure, not a
  production reverse proxy. A hosted account version needs the existing secured
  family API behind the same HTTPS origin, with this Bee build as its frontend,
  and the three privacy/tombstone backend additions deployed together.

Do not present the static Render configuration as cross-device sync. Public
real-child launch, new external data services and changes to production are outside
this private review delivery.

## Contracts

`spell_session.learningMode = "learn-recall@1"` opts into the five-word flow.
`spell_learning` app events record study, recall, hint and draft actions against
the same learner/source/session/word. `spell_answer.assisted` is derived from
persisted study/hint receipts, never supplied by a UI checkbox. Old sessions and
answers remain readable without these optional fields; the original Bee stays
unchanged. The estimator ledger's accepted event kinds are unchanged. Backend
and frontend scrubbing preserve event IDs and anonymize deleted parent text.
Older frontend clients cannot import the new event kind; update the client before
importing a new learning-mode backup. Existing backups remain valid.

## Verification

See [TESTS.md](TESTS.md) for executed commands/results. Synthetic Chromium tests
cover 320px and 412px mobile layouts, file upload, hidden spelling, keyboard Enter,
assistance, draft resume, five-word completion, next-session recall and a private
password wall. An isolated real Django API test verifies that a second browser
signed into the same parent account resumes the same words and draft.

Screens: [learn](screens/learn.png), [assisted feedback](screens/assisted-feedback.png).
No physical Android test or educator review has been performed.

CI validates the build and private phone flow; it never deploys. Hosting is blocked
only on access to an owner-approved hosting account. No public URL is claimed.
