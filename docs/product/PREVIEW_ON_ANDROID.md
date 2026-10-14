# Try OpenPath on your Android phone (private preview of PR #26)

This runs the real application in a GitHub Codespace that belongs to you:
- the React English app;
- the Django API;
- PostgreSQL 16.

You open it on your phone through a private HTTPS address. Only you, signed in to GitHub, can open it. Use made-up
test names and email addresses only; this is not for real children.

## 1. Start the codespace (once, about 5 minutes)

On a computer, or in your phone's browser with "Desktop site" turned on:

1. Open **https://codespaces.new/premsethutmc/openpath?ref=product/ux-integration-v1**
   - Or: the repository page → **Code** → **Codespaces** → choose branch `product/ux-integration-v1` → **Create
     codespace**.
2. Keep the default machine (2 cores) and press **Create codespace**.
3. Wait while it builds. It does three things:
   - installs Python and Node packages;
   - builds the app;
   - starts PostgreSQL, applies the migrations, and starts the API and the app.
4. When it is ready, the creation log ends with:
   ```
   OpenPath is running. Open on your phone (sign in to GitHub when asked):
     https://<your-codespace-name>-4175.app.github.dev
   ```
   The same address is in the **PORTS** tab, on the row labelled **OpenPath (app + API)**, port 4175. Its visibility
   must say **Private**. Leave it private.

**Copy that address: it is your preview URL.** It is unique to your codespace; nobody else's address works for you.

If the address does not answer, open a terminal in the codespace and run `bash .devcontainer/start-preview.sh`. It is
safe to run again, and it prints the address. The logs are in `/tmp/openpath/api.log` and `/tmp/openpath/web.log`.

## 2. Open it on Android

1. Send yourself the address, open it in **Chrome** on the phone, and sign in to GitHub when asked. Being signed in to
   GitHub is what keeps the preview private.
2. OpenPath's welcome screen appears. Optionally, use Chrome's **⋮ → Add to Home screen** for a full-screen app.

## 3. Use it

1. **Let's begin**, then create a parent account. Use a test email such as `you+test1@example.org`. It is not checked
   and no email is sent. Use a password of at least 10 characters.
2. **Add a learner**, for example Arun:
   - choose "who is learning" and a goal;
   - tick the consent box;
   - press **Build my path**.
3. **I'm ready** starts the first assessment: 12 to 24 questions, with feedback after each.
4. **Home** shows Today's plan from the planner. **Journey**, **Progress** and **Me** are in the bottom bar.
5. Lessons appear when the evidence says a skill needs teaching, usually after some wrong answers on it.
6. **Me → Switch learner** to add Meera or go back to Arun. **Me → Sign out**, then sign in again: everything is still
   there, on any device where you sign in.

## 4. Things to know

**Stopping and costs:**
- The codespace stops by itself after 30 minutes without use. Restart it from github.com/codespaces, and the app
  starts again automatically. Accounts and answers are kept in its database.
- Deleting the codespace deletes all test data.
- Codespaces runs on your GitHub account. Personal accounts include some free usage each month; check
  github.com/settings/billing.
- Stop the codespace when you finish, to save that allowance.

**Settings:**
- These are development settings: a random secret made inside the codespace, HTTPS-only cookies, and only the
  codespace's own address trusted.
- "Forgot your password" works, but the reset email is not sent. It is written to `/tmp/openpath/api.log` in the
  codespace.

**What it is:**
- All questions and lessons are draft content awaiting educator review. Nothing is approved for children.

**If the phone shows an error:**
- **A GitHub page instead of OpenPath:** the codespace has stopped. Restart it at github.com/codespaces.
- **A 401 page from GitHub:** sign in to GitHub in that browser.
- **"OpenPath can't be reached" inside the app:** the API stopped. Run `bash .devcontainer/start-preview.sh` in the
  codespace.
