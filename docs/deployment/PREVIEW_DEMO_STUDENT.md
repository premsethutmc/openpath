# One-tap synthetic student preview

Branch: `feat/preview-demo-student-v1`, based on `fix/render-preview-writing-v3` at `95b73d7ade3d4c7ac2b8de20e92f278ded060fb6`.

This branch is prepared for review only. Nothing was merged or deployed, and the Render service was not changed. The current public preview URL will show its old revision until deployment is explicitly approved.

## What the owner will see after an approved deployment

Open https://openpath-pr55-preview.onrender.com/ on Android and tap **Try OpenPath as a Demo Student**. There is no email, password, account registration, learner creation or curriculum setup step. My Learning Year opens its Mathematics long-division lesson, starting with the concept explanation and worked example for `379 ÷ 3`.

Use the existing writing area or type numbers. The existing local ONNX model interprets separated handwritten digits; unclear writing asks for confirmation of only that symbol. The actual Django backend checks intermediate steps, asks diagnostic questions after an invalid step, provides teaching, allows correction and saves the work. Return to Mathematics to open equivalent fractions or equal-group multiplication through the same interface. These are provisional practice lessons: completion does not grant verified mastery.

The compact **Demo options · synthetic learner** menu explains the temporary session and provides **Reset demo and restart** and **Leave demo**. Reset deletes only the current synthetic demo identity and its work, then starts a fresh lesson. Leave closes the preview gate; returning through the demo entry resumes the last draft while its two-hour lifetime remains. Reloading or closing/reopening the browser with its cookies preserved also resumes saved work. Another browser/incognito session receives another learner. Clearing cookies loses access to the temporary learner.

Account testing remains under the collapsed **Account access** form: its preview password and the normal OpenPath email/password authentication still apply. Demo entry never changes that account's Django session cookie.

## Isolation and security boundary

- `config.preview` alone installs demo routes and middleware. Production URL configuration has no demo bootstrap/start/status/reset endpoints. No production estimator, curriculum, evidence eligibility or mastery policy changed.
- Each visitor gets a new canonical Django User and Pupil, not a shared account. Reserved username prefix: `openpath-preview-demo-`. Password unusable, email blank, non-staff/non-superuser, no content-review roles, sharing disabled, consent policy `synthetic-preview-only`.
- The only initial learning record is a server-validated Grade 4 enrolment in the existing synthetic sample curriculum. Opening the existing lesson adds its normal provisional `assigned` receipt. No pre-existing achievement, proficiency or assessment result is fabricated.
- The Node gateway signs a restricted `student` role separately from its owner role. Visitors cannot select or spoof the internal demo header; every API proxy request overwrites it. Changing a signed role fails signature verification.
- Django uses a separate `openpath_demo_student` HttpOnly, SameSite=Strict session cookie. Render mode also sets Secure. Normal `sessionid` is never replaced or deleted by demo entry/reset. An unknown account session accidentally placed in the demo namespace is detached, never flushed/deleted.
- Student gateway access is limited to `/year/`, its assets, local recognition assets and APIs. Django then allows only account identity/pupil listing, the current pupil's mathematics stream and writing APIs. Educator/developer tools, other pupils, English streams, pupil creation/export/sharing, password/account changes, curriculum replacement and goals are denied. Canonical ownership, CSRF, reference validation and evidence rules still apply.
- Entry/reset require same-origin POST plus Django CSRF. No authentication exemption or globally disabled CSRF was introduced. Demo-specific URLs on the gateway require an explicit matching Origin.
- Lifetime is bounded to two hours from creation, including resume. Later starts remove expired reserved synthetic identities in batches of at most 100; there is a 100-recent-demo-identity cap. This is lightweight preview hygiene, not a multi-tenant public service or distributed abuse-prevention service. One synchronous Gunicorn worker is retained.
- The existing preview settings ignore ordinary `DATABASE_URL`, force external evaluators off, use dummy mail and require a dedicated synthetic database or isolated SQLite. No production secrets or real learner data are needed. Gunicorn must remain loopback-only behind this gateway.
- Same-container restart preserves cookies/work with unchanged preview secrets. Render container replacement can erase SQLite; that limitation remains. Expired demo work is disposable by design. Owner/account test records are not subject to demo cleanup.

## Run and test

Use the Docker build/start instructions and environment variables in [RENDER_PREVIEW.md](RENDER_PREVIEW.md). No new environment variables or paid resources are required. The owner password is now for optional account testing, not demo entry. Keep Auto Deploy off; the reference configuration names this review branch but was not applied to Render.

After the local container's `/healthz` returns 200:

```bash
cd frontend
E2E_URL=http://127.0.0.1:4700 CHROMIUM_PATH=/usr/bin/chromium \
  node --test e2e/demo-student.test.mjs
E2E_URL=http://127.0.0.1:4700 CHROMIUM_PATH=/usr/bin/chromium DEMO_STUDENT=1 \
  node --test e2e/writing-year.test.mjs
E2E_URL=http://127.0.0.1:4700 CHROMIUM_PATH=/usr/bin/chromium \
  PREVIEW_PASSWORD=synthetic-preview-test-pass node --import tsx --test --test-concurrency=1 \
  e2e/preview-container.test.mjs e2e/writing-year.test.mjs
```

`PREVIEW_PASSWORD` above is the synthetic local fixture password from the run instructions. Never substitute a production password. `CHROMIUM_PATH` is optional when Playwright's bundled Chromium is installed.

The first suite saves a synthetic browser state in `/tmp/openpath-demo-student-state.json`. The account suite saves its own independent restart fixture. Restart the **same** local container, wait again for health readiness, then:

```bash
E2E_URL=http://127.0.0.1:4700 CHROMIUM_PATH=/usr/bin/chromium \
  PREVIEW_PASSWORD=synthetic-preview-test-pass PREVIEW_PHASE=resume \
  node --import tsx --test --test-concurrency=1 \
  e2e/demo-student.test.mjs e2e/preview-container.test.mjs
```

CI builds the actual Render Dockerfile and runs both normal account and one-tap demo journeys, then both restart checks. It does not deploy. Start browser checks only after readiness; tests started during first-time migrations cannot reach the service.

## Validation and limitations

Final local results (2026-10-20):

| Check | Actual result |
| --- | --- |
| Exact Render Dockerfile build; packaged Django readiness | Passed; `/healthz` 200 |
| Django full suite, including 10 new demo-isolation/lifecycle tests | 227 passed |
| Existing frontend unit tests | 426 passed |
| Four frontend TypeScript configurations | Passed |
| Gateway/security unit tests | 13 passed |
| Actual browser one-tap/mobile/lifecycle/isolation suite | 3 passed |
| Actual browser demo-mode division, fractions, multiplication, ONNX and unavailable-recognizer fallback | 4 passed |
| Existing actual-browser account gate and mathematics regressions | 7 passed |
| Demo and normal-account saved work after container restart | 2 passed |
| Actual secure-mode container cookie/role/CSRF checks | Passed; TLS termination headers simulated |

Browser suites ran against the built container and real Django APIs, not mocked assessment or recognition. The image builds/runs with pinned Node 22; host test runner was Node 24. GitHub Actions configuration was updated but its remote execution is not claimed here. Initial failures from the return-path tile ID, test initialization and pre-readiness startup were resolved; final readiness-gated runs above passed.

 Screenshots are actual Chromium views of the packaged frontend against Django: [entry](../product/mathematical-writing/screens-demo/demo-entry-android.png), [lesson](../product/mathematical-writing/screens-demo/one-tap-lesson-android.png), [recognized writing](../product/mathematical-writing/screens-demo/recognized-ink-mobile.png).

Android-sized Chromium (360×800 and 412×915, touch/mobile settings) and 1280×900 desktop are automated simulations. No physical Android phone or stylus was available. Recognition remains separated-digit MNIST, not unrestricted mathematical handwriting. No real children or real accounts were used, and no educational-effectiveness claim is made. The live Render URL has not been changed or verified with this revision because deployment is not authorized.
