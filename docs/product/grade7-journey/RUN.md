# Run the authenticated Grade 7 journey

Nothing is deployed by this branch. Use synthetic people only. Existing preview gateway and Django authentication are retained.

## Local application

From the repository root, with Node 22 or 24 and Python 3.12:

```sh
npm ci --prefix frontend
python -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt gunicorn==23.0.0
(cd frontend && node scripts/build-mathematics-journey.mjs && node scripts/build-tamil.mjs && cp -r dist-tamil dist-english/tamil)
export PATH="$PWD/backend/.venv/bin:$PATH"
export DJANGO_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export DEMO_SESSION_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export DEMO_PASSWORD='choose-a-local-preview-password'
export DEMO_ALLOW_HTTP=1
export PORT=4722 PREVIEW_API_PORT=8712 HOST=127.0.0.1
export PREVIEW_ORIGIN=http://127.0.0.1:4722
export OPENPATH_PREVIEW_DATA_DIR=/tmp/openpath-grade7-local
sh deploy/preview/start.sh
```

Open **http://127.0.0.1:4722/year/**, unlock the owner-only preview gate, sign in to a synthetic parent account and choose/create its synthetic learner. Choose **Grade 7 → No goal for now → OpenPath Sample Mathematics → Start Grade 7**. No real-board Grade 7 release is bundled. The learner's existing selected release is loaded automatically on subsequent visits; it is not silently replaced.

Choose 30 minutes. Expand **Percentages and proportion**, select the percentage skill and start the session. Explore a short diagnostic, receive existing targeted teaching if the answers warrant it, work and practise, open help during guided practice, and save/return. Reload and resume. Correct starting answers can bypass reteaching; wrong answers do not automatically establish a misconception.

The one-tap demo remains its existing Grade 4 writing experience. This branch does not silently change that entry or rewrite existing grades. The new guided shell is enabled for Grade 7 in `/year/`; other grades retain their existing screens.

Choose **Exam refresher → GRE** for provisional fraction/percentage foundations. Its fixed session and completion history are separate from school. Existing evidence is reused: a completed diagnostic is not repeated to manufacture fresh evidence. IIT-JEE exposes the existing Main/Advanced skill samples. TNPSC and UPSC show unavailable mappings/banks; no fabricated tests appear. No official marks, timing rules, score predictions or readiness percentage are enabled. Target scores/dates are not requested when they cannot inform a validated readiness plan.

A localhost link is not an externally accessible Android preview. For owner phone testing, forward this port privately through authenticated Codespaces; keep visibility **Private** and open the forwarded URL while signed in to the owning GitHub account. Set `PREVIEW_ORIGIN` to that HTTPS forwarded URL, leave `DEMO_ALLOW_HTTP` unset, and restart with `HOST=0.0.0.0`. Do not enable a public port or deploy to bypass authentication.

## Reproducible browser tests

Against the running synthetic application:

```sh
cd frontend
E2E_URL=http://127.0.0.1:4722 PREVIEW_PASSWORD=choose-a-local-preview-password CHROMIUM_PATH=/usr/bin/chromium node --import tsx --test --test-concurrency=1 e2e/grade7-journey.test.mjs
```

These tests use real authenticated Django accounts, real curriculum and generated questions, existing validators/diagnostics and the append-only pupil ledger. No learner API is mocked. They create only synthetic users. Physical Android keyboards and styluses require separate hardware testing.
