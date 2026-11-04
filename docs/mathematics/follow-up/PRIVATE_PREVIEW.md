# Owner-only Codespaces preview (no public deployment)

Use a **new, dedicated Codespace** for this branch, not the JEE/essay development Codespace. It runs the existing app, account API and PostgreSQL with synthetic data; it does not deploy production. Codespaces runtime/billing is controlled by the owner's GitHub account.

1. Open [Create the follow-up Codespace](https://codespaces.new/premsethutmc/openpath?ref=fix%2Fmathematics-prerequisites-reproducibility-v1). Keep the repository's default devcontainer and wait for setup. Its existing configuration installs dependencies and starts the account API and private web preview on port **4175**, using Node 22 and PostgreSQL 16.
2. From the **repository root** in that Codespace terminal, run this complete command:

   ```sh
   bash .devcontainer/start-preview.sh &&
   node frontend/scripts/build-mathematics-foundation.mjs &&
   python3 -c 'import os; print("https://" + os.environ["CODESPACE_NAME"] + "-4175." + os.environ["GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"] + "/foundation.html")'
   ```

   The first command starts/reuses the existing services and applies existing migrations without resetting records. The second builds `/foundation.html` alongside English and the existing mathematics page. The last prints **your exact Android URL**, using GitHub's actual Codespace bindings; it fails rather than inventing a URL outside Codespaces. Rebuilding does not require restarting the static preview server.
3. In **Ports**, check that **4175 → Port Visibility → Private**. If it is not Private, change it to Private before opening the preview. Do not forward the API (8000) or PostgreSQL (5432). Copy the printed URL into Android Chrome and sign in to GitHub as the Codespace owner when prompted. Keep the Codespace running during testing.

There are two independent authentication layers: GitHub protects the private forwarded port; OpenPath's existing account session protects pupil records. At the same preview origin's `/` page, create a **synthetic test account and pupil**, or use an existing synthetic account from this Codespace. Return to `/foundation.html`; the same session/identity is used. School and exam activity histories stay separate. No production credentials or real-child data are needed.

For subsequent visits, use the same URL while that Codespace exists; restarting the same Codespace preserves its database volume. Run the command again after pulling new changes. Stop the Codespace when finished to stop its compute use; do not delete its volume to "fix" progress.

Troubleshooting:

- GitHub 404/sign-in page: use the owning GitHub account, confirm the Codespace is running and port 4175 is forwarded privately.
- OpenPath signed out: sign in to the synthetic OpenPath account; GitHub sign-in alone is not an OpenPath account.
- `/foundation.html` missing: rerun the complete command, which builds the additive page the default English-only startup does not build.
- API startup: inspect `/tmp/openpath/api.log` and `/tmp/openpath/web.log`; do not reset PostgreSQL. The existing `.devcontainer/start-preview.sh` is intended for this dedicated Codespace and can restart its app services after branch changes.

This cloud task itself has no private ingress and cannot query/create Codespaces (`https://api.github.com/user/codespaces` returns `Forbidden`). Therefore no live Android URL is claimed here. The creation link above opens GitHub's owner-authenticated Codespaces setup, not a public app deployment. No public tunnel or Pages deployment is required.
