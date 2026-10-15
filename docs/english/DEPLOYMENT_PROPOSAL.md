# Deployment proposal: private HTTPS access for a small trial

*13 October 2026 · **proposal only**. Nothing is deployed, no account has been created, and nothing
costs money. Prices and plan limits were checked on 13 October 2026 and can change.*

## What needs hosting

- **Static files only:** `frontend/dist-english/`, about 2.8 MB (app script 2.7 MB, about 350 kB
  compressed), plus licence notices, a service worker and a `_headers` file.
- **No server, database, account system or API.** Learners' progress stays in their own browser
  (IndexedDB).
- **HTTPS is needed:** phones install the app for offline use only over `https` (or `localhost`).
- **"Private" here means two things:**
  1. only invited families can open it;
  2. nothing about the learner reaches the host.

  The second holds for every option below. The first depends on the option.

## Options compared (all free tiers)

| | **Cloudflare Pages + Cloudflare Access** (recommended) | **GitHub Pages** | **Netlify (free)** | **Vercel (Hobby)** |
|---|---|---|---|---|
| HTTPS | Yes (`*.pages.dev`) | Yes (`*.github.io`) | Yes (`*.netlify.app`) | Yes (`*.vercel.app`) |
| Restrict to invited people, free | **Yes.** Access with a one-time PIN by email for listed addresses; free Zero Trust plan for up to 50 users | **No.** Free sites are public; private visibility needs GitHub Enterprise Cloud | **No.** Password protection needs Pro or above | **Partly.** Vercel Authentication works on production, but visitors need Vercel accounts, and Hobby allows one external user per account |
| What families do | Enter their email, type the 6-digit code once per device (the session lasts a set time) | Open a link | Open a link | Create a Vercel account and request access |
| Limits that matter here | 500 builds a month; 20,000 files; 25 MiB per file | 1 GB site; soft 100 GB a month bandwidth; not for commercial use | | Non-commercial personal use only |
| Reads our `_headers` file | Yes | No (the page's own security settings still apply) | Yes | No (needs its own configuration) |
| Set-up effort | About 30–45 minutes, once: account, upload, Access policy (four documented steps to cover the production `pages.dev` address as well as previews) | About 10 minutes: a workflow that publishes the build | About 10 minutes | About 15 minutes |
| Cost | ₹0. **Confirm at sign-up whether a payment card is asked for**; reports differ | ₹0 | ₹0 | ₹0 |

**Recommendation: Cloudflare Pages with Cloudflare Access**, on the free `pages.dev` address, with no
custom domain. It is the only free option where the site is closed to anyone not invited, and families
need nothing but an email address.

**Fallback: GitHub Pages as an unlisted public site.** It is acceptable only because no learner data is
ever on the site, but anyone with the link can open the app. The repository is already public, so the
app's code and content are public either way.

## Privacy: what each party can see

| Party | Sees | Does not see |
|---|---|---|
| **Host** (any option) | Ordinary request logs: IP address, time, files requested, browser type. These come from requests for the app's own files, made on first opening and, when online, to refresh them | Names, answers, progress, notes: these never leave the device. The app sends nothing else to any site (a browser test checks for requests to other sites) |
| **Cloudflare Access** (if used) | Each invited person's email address and their sign-in times | Anything inside the app |
| **OpenPath team** | Only what a guardian chooses to send: the trial summary file (no name; answers, timings, notes) or, if asked, a backup (includes the display name) | Everything else |
| **Whatever channel a guardian uses to send a summary** (email, WhatsApp) | The file | – |

**Points to settle before inviting anyone:**

- **Learner data stays on the phone, and so does the risk.**
  - Clearing the browser's data, using a private window, or iOS removing data from a site not opened
    for weeks can delete progress.
  - Families should export a backup weekly (Settings → Export a backup).
  - Installing to the home screen makes removal less likely.
- **Shared phones:** anyone using the same browser on the same phone can open the learner's profile.
- **Trial summaries are personal data about a child,** even without a name: they hold answers and notes.
  - Keep them in one private place.
  - Delete them at a set date after the pilot.
  - Ask guardians not to write names in notes.
- **Consent.** India's Digital Personal Data Protection Act 2023 expects verifiable consent from a parent
  before a child's personal data is processed. The app's design avoids processing anything off the
  device, but the summaries a guardian sends are processed by OpenPath. The guardian information sheet
  ([`PILOT_PLAN.md`](PILOT_PLAN.md)) asks for that consent in writing. *This is not legal advice; check
  the current rules before a wider trial.*
- **Hosts are US companies,** so request logs are held outside India.

## Steps, once approved (Cloudflare)

1. **Approve the pilot content** ([`CONTENT_VALIDATION.md`](CONTENT_VALIDATION.md)), then
   `npm run english:build:pilot`.
2. **You create the Cloudflare account** (it is yours, not OpenPath's code). Create a Pages project by
   direct upload of `frontend/dist-english/`. Do not connect the repository, so that no deploy keys or
   secrets are needed.
3. **Close the site to everyone not invited.**
   - Zero Trust → Integrations → Identity providers: add **One-time PIN**.
   - In the Pages project: Settings → Enable access policy. Then edit the Access application so that it
     covers the production `pages.dev` address as well as previews (Cloudflare's documented steps).
   - Policy: **allow** only the listed emails (yours and the pilot families').
4. **Check** in a private window that:
   - the site asks for an email code;
   - an email not on the list is refused;
   - the app installs and works offline.
5. **Send families the link** and the information sheet.

Updates are a new upload of a new pilot build. The app updates itself the next time it is opened online.

## Decisions for you

1. Which host, when families need access: Cloudflare with Access (recommended), GitHub Pages unlisted,
   or no hosting. For your own first test no hosting is needed: a USB cable and Chrome's port forwarding
   give the full installed, offline experience on your Android phone ([`WEB_APP.md`](WEB_APP.md),
   "Trying it on Android").
2. Who creates and owns the hosting account.
3. How long trial summaries are kept, and where.

Sources:
[GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) ·
[GitHub Pages site visibility (Enterprise Cloud)](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site) ·
[Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/) ·
[Cloudflare Pages: Access on preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/) ·
[Cloudflare Pages known issues: securing `*.pages.dev`](https://developers.cloudflare.com/pages/platform/known-issues/) ·
[Cloudflare Access one-time PIN](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/) ·
[Cloudflare Access plans](https://www.cloudflare.com/en-gb/sase/products/access/) ·
[Netlify basic authentication (Pro and Enterprise)](https://docs.netlify.com/manage/security/secure-access-to-sites/basic-authentication-with-custom-http-headers/) ·
[Netlify password protection](https://www.netlify.com/blog/restricting-access-to-netlify-sites-with-passwords) ·
[Vercel Hobby plan](https://vercel.com/docs/plans/hobby) ·
[Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
