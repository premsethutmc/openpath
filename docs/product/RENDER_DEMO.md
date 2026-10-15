# Private owner-only demo on Render

**Purpose:** a password-protected address where the product owner can try the real OpenPath English app on his
Android phone, without Codespaces.

**Not for:** a pilot, pupils, real children's data, or the public.

**Not done yet:** nothing is deployed. Deploying needs the founder's approval.

## Architecture

**What runs:** one Render web service (free plan, Singapore). It runs `frontend/scripts/demo-server.mjs`, a small
Node server that uses only Node's standard library, so it adds no dependencies. The server serves the built English
app from `frontend/dist-english/` only after a server-side password check.

**What it leaves out:**
- no database;
- no Django;
- no Redis or Docker;
- no link to any other service or app (including parking-rent).

**Why this is enough:** the English app runs entirely on the device. Learners and answers are stored in the
browser, as in the existing device-only mode. A server would add database, accounts and cost without anything this
demo needs. **PostgreSQL is not needed.**

**What the demo leaves out:** parent accounts and the developer diagnostics page. Both need the Django server. The
diagnostics page says so ("This copy of OpenPath has no account server"). To get a developer report on a demo
learner:
1. Use **Me → Export a backup** to save the backup file.
2. On a computer, run `node --import tsx frontend/scripts/backup-report.mts <backup.json>`.

**Cost:**

| Option | Cost | Spin-down | When to choose it |
|---|---|---|---|
| Free web service | $0 | Spins down after 15 minutes without visits. The next visit waits about a minute while it starts. The free allowance is 750 instance hours per month across the workspace. | Recommended to start |
| Starter instance | about $7 a month (Render's published price, August 2026; confirm on render.com/pricing) | Never spins down | If the one-minute wake-up gets in the way |

Neither option needs a paid workspace.

## Build mode: development

The demo serves the **development** build (`npm run english:build`): every activity and the developer tools, with
draft content labelled as draft.

**Why not the other two builds:**

| Build | Why not for this demo |
|---|---|
| Preview | Limits practice words to the pilot set. It shows less of the product, with nothing gained. |
| Pilot | The restricted supervised-pilot build. It shows only educator-approved questions, and none are approved yet. It refuses to build, or with `--allow-empty` shows nothing. It is the wrong tool for a product demonstration and must not be used for one. |

The demo changes no build mode or safety check, and it makes no approvals.

**Draft content is labelled in the app:**
- **Welcome screen:** "Lessons and questions are draft content awaiting review by teachers, and every level is an
  estimate."
- **Me:** "Development version: practice words include ones not yet reviewed".
- **Journey:** "Every lesson and question here is draft content awaiting teacher review."
- **Developer page:** "all educational content is provisional".
- **Progress:** levels show as estimates or "provisional" until the evidence gate is met.

## Security controls

**Server-side login before anything is served:**
- Without a valid session, the app's HTML, JavaScript, CSS, icons, licences, source maps and `/api/` all return
  401, or redirect to `/login`.
- Only `/login`, `/healthz`, `/robots.txt` and a no-op `/sw.js` answer without a session.

**The password itself:**
- **Never stored.** Render holds only a salted scrypt hash (`DEMO_PASSWORD_HASH`), made with
  `frontend/scripts/demo-hash-password.mjs`.
- **Never in the code, the repository, the JavaScript, URLs or logs.**
- **Checked in constant time.**

**Sessions:**
- **The cookie:** an HMAC-signed cookie named `__Host-openpath_demo`, with `Secure; HttpOnly; SameSite=Strict;
  Path=/`. It holds only a random id and an expiry.
- **Lifetime:** 7 days (`DEMO_SESSION_HOURS`).
- **Restarts and spin-downs keep sessions,** because the signing key comes from `DEMO_SESSION_SECRET`. This is a
  deliberate choice: on the free plan the service spins down often, and logging in again after every wake-up would
  make the demo unusable.
- **Changing the password, or `DEMO_SESSION_SECRET`, ends every session.**

**Logout (`/logout`):**
- It revokes the session at once and tells the browser to drop its cached copy of the app (`Clear-Site-Data`).
- "Log out and erase the demo learners on this phone" also clears this browser's storage for the site.
- The list of revoked sessions is kept in memory. After a restart, a cookie someone copied before logout would work
  again until it expires. To end every session for certain, change the secret (below).

**Limits on logging in:**
- 5 failed attempts per client in 15 minutes, and 30 in total, before logging in is refused, even with the right
  password, until the window passes.
- The client is identified by the last `X-Forwarded-For` entry, the one Render's proxy adds, which a client cannot
  forge.

**HTTPS:**
- Plain HTTP requests are redirected to HTTPS.
- HSTS is set.
- The cookie is `Secure`.

**Headers:**
- a Content Security Policy that forbids framing;
- `X-Frame-Options: DENY`;
- `X-Robots-Tag: noindex, nofollow` (and `robots.txt` disallows everything);
- `Permissions-Policy` with the camera, microphone, location, payment and USB off;
- `nosniff`;
- `Referrer-Policy: same-origin`;
- `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy`.

**Other protections:**
- **No public registration and no accounts:** one shared password.
- **Logs** record only the method, path, status and time: never cookies, form bodies, passwords or query strings.
- **Logout and login posts from other sites are refused** (an Origin and `Sec-Fetch-Site` check).
- **Build files are never served:** `_headers` and `BUILD`, and the build's caching service worker.

## Data in the demo

**Synthetic learners only.** Do not import real pupils' records, Pupil A's data, family information or children's
answers.

| Question | Answer |
|---|---|
| Where are learners and answers kept? | In this browser on this phone (IndexedDB), as in the app's device-only mode. Nothing is sent to the server. |
| Do they survive a page refresh? | Yes. |
| Do they survive closing Chrome or restarting the phone? | Yes. |
| What if Chrome's site data or storage is cleared? | They are erased, with no copy anywhere, unless you saved a backup first (Me → Export a backup). |
| Do they appear on another phone or browser? | **No.** Nothing synchronises between devices. Use Export a backup on one phone and the import on another. |
| Does the demo work offline? | **No, by design.** The app is served only after logging in, and its offline cache is switched off, so nothing of it stays readable after logging out. While the page is open it keeps working through short connection drops. |
| How do I reset the demo? | `/logout` → "Log out and erase the demo learners on this phone". Or, in the app, Me → Delete this learner. |
| Do service restarts lose data? | No. The server holds no learner data. |

## Render configuration

**Repository:** `premsethutmc/openpath`.

**Branch:** `main`, once the demo PR is merged. The demo server exists only from that merge on, so do not deploy an
older commit.

**Settings** (the same as `render.yaml`):

| Setting | Value |
|---|---|
| Service type | Web service |
| Runtime | Node |
| Region | Singapore |
| Plan | Free |
| Root directory | Leave empty (the repository root) |
| Build command | `cd frontend && npm ci && OPENPATH_COMMIT="$RENDER_GIT_COMMIT" npm run english:build` |
| Start command | `node frontend/scripts/demo-server.mjs` |
| Health check path | `/healthz` |
| Auto-deploy | **Off** (`autoDeployTrigger: "off"`): deploy by hand with "Manual Deploy" |

**Port:** the server listens on `0.0.0.0` and the `PORT` Render sets (10000 by default).

**HTTPS:** Render terminates HTTPS. The server reads `X-Forwarded-Proto` to redirect plain HTTP.

**Environment variables (names only; no values are in the repository):**

| Name | Value |
|---|---|
| `NODE_VERSION` | `22.22.0`. The build runs TypeScript files directly, which needs Node 22.18 or later. |
| `DEMO_PASSWORD_HASH` | The output of the hash script (below). **Never the password itself.** |
| `DEMO_SESSION_SECRET` | At least 32 random characters. `render.yaml` has Render generate it. By hand: `openssl rand -base64 48`. |
| `DEMO_SESSION_HOURS` | `168` (optional; how long a login lasts) |

Do **not** set `DEMO_ALLOW_HTTP`. It is for local tests only, and turns off the Secure cookie and the HTTPS
redirect.

**If something is missing,** the server refuses to start: no password hash, no secret of at least 32 characters, or
no build. It never starts open.

### Making the password hash (on your own computer)

1. Pick a passphrase of at least 12 characters, for example four or five unrelated words, and keep it in your
   password manager.
2. In a checkout of the repository: `cd frontend && npm ci` (once), then `node scripts/demo-hash-password.mjs`.
3. Type the passphrase twice. It is not shown, and is not saved anywhere.
4. Copy the single line it prints. It starts with `scrypt$`. That is the value for `DEMO_PASSWORD_HASH`.

### First deployment (after approval)

1. **Create the service.** Either:
   - Render dashboard → **New → Blueprint** → choose `premsethutmc/openpath`. Render reads `render.yaml` and asks for
     `DEMO_PASSWORD_HASH`. Paste the hash.
   - Or **New → Web Service** with the settings above.
2. **Check the settings:** the plan is **Free**, the region is **Singapore**, and auto-deploy is **off**.
3. **Deploy and wait for the health check.**
4. **On the phone,** open `https://<service-name>.onrender.com/` in Chrome. The login page appears.
5. **Log in.** Enter the passphrase. The OpenPath welcome screen appears.
6. **Start as you would on the device.** Press **Let's begin**, give a made-up name, agree, and **Build my path**.
7. **Optional:** Chrome **⋮ → Add to Home screen**.
8. **To leave,** go to `/logout`.

### Changing the demo password

1. Make a new hash (above).
2. Render → the service → **Environment** → replace `DEMO_PASSWORD_HASH` → **Save changes**. Render restarts the
   service.
3. Every existing session ends, because sessions are tied to the hash. Log in again with the new passphrase.

**To log everyone out without changing the password:** replace `DEMO_SESSION_SECRET` with a new random value.

## Tests

**Automated, run in CI:**
- **`frontend/scripts/demo-server.test.mjs` (DS-1 to DS-9):**
  - nothing is served before logging in;
  - a wrong password is refused, and the right one works;
  - logout revokes the session;
  - sessions expire, survive restarts and end on rotation;
  - login limits;
  - headers and the HTTPS redirect;
  - logs hold no secrets;
  - the server refuses to start without configuration;
  - no secret is in the built app.
- **`frontend/e2e/demo.test.mjs`:** the real development build behind the login, in Chromium emulating a 412×915
  Android phone. It covers:
  - the login wall;
  - placement with feedback, and a reload mid-session;
  - moving on to the dictation spelling check;
  - Today, Progress, Journey and Me;
  - deep links;
  - logout and erase;
  - no sideways scrolling;
  - no requests to other sites.

**Still to do on a real Android phone** (not done; emulation is not a phone):
- open the Render address and log in;
- add it to the Home screen;
- the spoken words on the real voice;
- the keyboard (no suggestions);
- leave it for 20 minutes, so the service spins down, and come back;
- logout, and log out and erase.

Parts A2–A7 of [ANDROID_MANUAL_TEST.md](ANDROID_MANUAL_TEST.md) apply as they are, with the Render address in place
of the Codespaces one.
