# Development workflow

**Status:** proposal for founder approval.

**Background:** this replaces the stacked-PR practice that produced #15–#29 alongside a conflicting #14
(see [INTEGRATION_AUDIT.md](INTEGRATION_AUDIT.md)).

## Rules

1. **`main` is the authoritative integration baseline.** What is on `main` is the product. Work that is not on
   `main` is not released, however green its own checks are.

2. **Feature branches start from current `main`.** Start each branch with:

   ```
   git fetch origin && git switch -c <area>/<topic> origin/main
   ```

   Branching from another unmerged branch is the exception (rule 5).

3. **Small, independently reviewable PRs.**
   - **Aim:** one concern per PR, reviewable in under an hour, with tests in the same PR.
   - **Keep apart:** do not mix content changes (items, words, lessons) with code changes. Documents may go with
     the code they describe.

4. **No long stacks.**
   - **At most two unmerged PRs in a chain.** Before starting a third, merge the first or fold the chain into
     one PR.
   - **A PR open more than a week:** rebase it on `main`, or close it in favour of a fresh branch.

5. **Track unavoidable dependencies explicitly.**
   - **In the dependent PR's description:** "Depends on #N", with the reason.
   - **On the dependent PR:** the `blocked` label.
   - **Base branch:** `main`, wherever possible, so the diff is honest once the dependency merges.
   - **When the dependency merges:** rebase the dependent PR on `main` at once.

6. **Critical safety fixes go to every affected active branch.**
   - **Covered:** a content-safety, data-protection or scoring-integrity fix, such as an unsuitable word or a
     consent wording error.
   - **Where it goes:** to `main` first, then cherry-picked into every open branch that ships the affected code
     or content.
   - **Record:** list the branches in the fix's PR.
   - **Why this rule exists:** the 10 excluded words were fixed on #14 only, while the stack kept offering them.

7. **Integrated regression tests before any release.** Nothing is released from a branch that CI has not run as a
   whole. A release candidate passes on its merge commit with `main`:
   - every unit and acceptance suite;
   - every browser suite, including the pilot boundary (`e2e/pilot.test.mjs`) against a pilot build;
   - the simulation, byte-identical unless a change to it is approved;
   - historical replay (the history fixture and Pupil A).

   Device checks on a real phone are recorded separately and are never claimed from emulation.

8. **Branch protection and required checks (needs founder approval and admin rights).** On `main`:
   - require a pull request with one approving review (the founder);
   - require all six status checks:
     - "Backend tests (Python 3.10)", "Backend tests (Python 3.12)" and "Backend tests (Python 3.13)";
     - "Frontend typecheck, tests and build";
     - "Browser end-to-end (production build, API, PostgreSQL)";
     - "English core (typecheck, acceptance tests, simulation, demo)";
   - require branches to be up to date before merging, so the checks run on the integrated code;
   - block force-pushes and deletion;
   - require linear history, or allow merge commits, whichever the founder prefers. Either works with these
     rules.

   **Commands, once approved** (repository admin only; not run by this PR):

   ```
   gh api -X PUT repos/premsethutmc/openpath/branches/main/protection --input protection.json
   ```

   `protection.json` holds the check names exactly as they appear on a PR's checks tab.

## CI must fail when tests fail

Until `129f840`, failing backend tests produced green checks: the backend and frontend jobs' own `defaults.run`
replaced the workflow's `shell: bash`, so `pipefail` was off and `tests | tee log` returned tee's status. Guards now:

- **Every job names `shell: bash`,** so steps run with `-eo pipefail`.
- **Every job starts with a self-check** that fails the job if `pipefail` is off.
- **The self-check also runs `.github/scripts/test-require-tests.sh`,** which proves `require-tests.sh` rejects:
  - Django `FAILED (…)` results;
  - Node `# fail N` and `ℹ fail N` results;
  - runs with no tests.
- **`require-tests.sh` itself fails** on any reported failure, whatever the pipe's exit status.
- **All six checks are required.** The browser job is skipped only when the backend or frontend check has already
  failed, and that check is required too, so a skip can never satisfy protection.

When changing the workflow: keep `shell: bash` in any new job-level `defaults.run`, and pipe test output only
through `tee` followed by `require-tests.sh`.

## Content and the pilot

- **No approval is ever automatic.** Educator decisions enter only through the review tools:
  - `tools/english/pilot/review.ts import` for questions and dictation words;
  - `tools/english/spelling/review.ts record` for generated words.

  Each tool records the reviewer, the date and a fingerprint of the exact content.
- **Changing the pilot allowlist** (`content/english/pilot/allowlist.json`) is a reviewed change in its own PR.
  CI fails if the allowlist and the content disagree.
- **A pilot build is made only from `main`,** with recorded approvals (`build-english.mjs --pilot`). It is never
  deployed without the founder's explicit approval.

## Branch names

- `english/<topic>`: the English engine and content.
- `product/<topic>`: app and UI.
- `backend/<topic>`: the API and database.
- `docs/<topic>`: documents only.
- `integration/<name>`: consolidation branches like this one. They are temporary and deleted after merge.
