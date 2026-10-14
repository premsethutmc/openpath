# Remaining production blockers (after product/ux-integration-v1)

Nothing here is deployed. The app must not be offered to children publicly until every item below that applies has been
resolved and reviewed.

## A. Educational approval

Carried over from PR #25 (PILOT_READINESS.md), and still open:

1. Educator review of all 250 content rows. None are approved.
2. Educator decisions D1–D12, including the age range and every draft rule (`development-policy@0-draft`).
3. Agreement to the supervised pilot protocol, by the host organisation and its safeguarding lead.
4. Enough reserved questions for more than one cycle per skill, and for learners above difficulty 4.5.

## B. Infrastructure and credentials

These are needed before any real deployment. None are hard-coded, and none exist yet.

| Item | Setting | Notes |
|---|---|---|
| HTTPS host for the app and the API on one origin | Reverse proxy: `/` → `dist-english/`, `/api/` → Django | Cookies are `Secure` when `DJANGO_DEBUG=0`. A proxy that terminates HTTPS needs `OPENPATH_BEHIND_HTTPS_PROXY=1` (trusts its `X-Forwarded-Proto`, redirects to HTTPS, sends HSTS). Without it, every sign-in and change fails the CSRF origin check. Use `DJANGO_CSRF_TRUSTED_ORIGINS` if the app and API are on different origins |
| Trusted proxy count for rate limits | `OPENPATH_NUM_PROXIES` | The number of proxies in front of Django. 0 (the default) ignores `X-Forwarded-For`; behind a proxy, 0 would rate-limit everyone as one address |
| Managed PostgreSQL with encrypted, tested backups | `DATABASE_URL=postgres://…` | Retention and restore procedure to be written |
| Django secret | `DJANGO_SECRET_KEY` | From a secret store, never in the repository |
| Allowed hosts | `DJANGO_ALLOWED_HOSTS` | |
| SMTP for password-reset emails | `DJANGO_EMAIL_HOST`, `DJANGO_EMAIL_PORT`, `DJANGO_EMAIL_HOST_USER`, `DJANGO_EMAIL_HOST_PASSWORD`, `DJANGO_DEFAULT_FROM_EMAIL` | Without them, reset emails are only printed to the server log |
| Reset link address | `OPENPATH_PASSWORD_RESET_URL` (for example `https://app.example.org/#reset`) | Required at start-up when SMTP is configured with debug off |
| A production WSGI server | Gunicorn or uWSGI (not yet in `requirements.txt`) | `runserver` is for development only |
| A shared cache | For example Redis, configured as Django `CACHES` | Rate limits are per process with the default in-memory cache |
| Logging, monitoring, alerting | — | Logs must not contain answers or emails |

## C. Security and privacy

1. **No email verification on registration.** Anyone can register any address. Add a verified-email step before
   pupils can be added.
2. **Registration reveals whether an email has an account** ("This email cannot be used…"). The reset endpoint's
   answer is the same either way, but it sends the email during the request, so the response time differs. With email
   verification, answer registration the same way and email the existing owner instead; send emails off the request
   path.
3. **Event times come from the app's clock.** The server keeps its own receipt time, but the engine replays with the
   event's own time, which a modified client could backdate to fake a "later check". The older evidence API refuses
   client clocks in production; this ledger should compare against `received_at` before results are used for
   anything beyond the family's own view.
4. **No storage quota per account.** There are caps per request (20 MB), per event and per pupil (100,000 events),
   but none per account.
5. **Consent is a checkbox.** Verifiable parental consent (for example under India's DPDP Act 2023, or GDPR and the
   UK Children's Code) is not implemented. A data-protection review for each target country is needed, with a
   privacy notice and terms.
6. **No multi-factor authentication.** Failed sign-ins are limited per address and per email (10 in 15 minutes);
   there is no permanent lockout or alert.
7. **No independent security review or penetration test.**
8. **No server-side audit log** of who read or deleted which record.
9. **Retention policy not defined.** There is no schedule for inactive accounts, and no documented process for
   requests about deleted backups.

## D. Product and engineering

1. **Each answer needs a connection in account mode.** There is no offline queue. If the connection drops, the
   session stops with "everything answered before this point is saved".
2. **Two devices at once.** The second device to write is refused (409) and must reopen the learner. There is no merge.
3. **No screen yet to move a device record into an account.** The API supports importing into an empty pupil, but the
   app has no button for it. The app can import device backups in device mode only.
4. **The Learner Vector is computed in the browser** by replaying the events. There is no server-side engine, so no
   server-side reports. That is out of scope here.
5. **"Who is learning" and the goal are recorded only.** They do not yet adapt wording or content. The goal orders the
   Journey.
6. **No professional accessibility audit** (WCAG 2.2 AA) and no screen-reader testing. Automated checks cover layout
   width, tap-target size and console errors only.
7. **Local test discrepancy.** Seven evaluation-gateway tests (`backend/evaluation/tests.py`) fail in this sandbox,
   where dependencies came from source checkouts because PyPI was blocked. They are untouched by this PR and passed
   83/83 in CI on PR #25. CI is the reference.
