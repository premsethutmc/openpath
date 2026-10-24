# OpenPath: instructions for Claude

OpenPath is an adaptive learning platform that measures what a learner can demonstrably do, not grades or syllabus
coverage. One shared learning-intelligence core powers several independent products. Read `docs/STATUS.md` first:
it says what is in flight and what comes next. Do not re-derive it from the repository or from old chats.

## Working with the product owner
- He describes the learning experience and judges the result. He does not write, copy, paste or debug routine code.
  Do the engineering; report outcomes, not process.
- Make reasonable, reversible engineering decisions yourself. Ask only when a decision materially affects product
  direction, security, cost or user experience.
- Before building a milestone, state its scope and acceptance tests and wait for approval. After it, report the
  results and wait for approval before starting the next. Never start the next milestone automatically.
- Never, without his explicit approval: merge a PR, deploy, delete existing code, alter production infrastructure,
  or incur paid costs. Open PRs as drafts. Do not touch other people's branches (Codex works in parallel on the
  child-facing tutor UI and on mathematics branches).
- Report plainly what is unverified. Browser automation is not a real device check; simulated learners test system
  behaviour only, never educational effectiveness.

## Product rules that must not be broken
- Learners are pseudonymous. No names or birth dates in the learning record.
- Mastery is never claimed from one interaction or from watching. Evidence must be varied and hold over time.
- Mathematical correctness is established by independent verification, not by an educator's approval. Content
  without validation stays provisional; never mark it approved.
- The LLM provider must stay interchangeable. No training or fine-tuning of a foundation model.
- Keep it simple: no premature microservices, marketplaces or AI infrastructure.

## Stack and commands
React + TypeScript (frontend), Django REST Framework (backend), PostgreSQL (SQLite without `DATABASE_URL`).
Check the branch you are on before trusting a command; these are the ones in use:
- `cd backend && python manage.py test`
- `cd frontend && npm ci && npm test && npm run typecheck`
- Package tests: `node --import tsx --test packages/learning/src/*.test.ts packages/mathematics/src/*.test.ts`
- Send long output to a file and print only the summary line (for example `# pass 371  # fail 0`).

## Keeping token use low
- One milestone per conversation. Start with `docs/STATUS.md`; end by updating it.
- Use Opus for scoping, architecture and hard bugs. Use Sonnet to implement and fix to green tests.
- Write the acceptance tests first, then code until they pass. Report numbers, not code listings.
- Reference file paths instead of pasting content. Use a sub-agent for searches that read many files.
- Prefer a maintained open-source component over writing one (see `tools/mathematics/engine-trial/README.md` on
  PR #69 for how a component is evaluated: independent checker, injected-error self-test, results committed).

## Environment notes (sandbox sessions)
- Package registries (npm, PyPI) can be blocked. If `npm ci` fails with a network error, say so rather than
  retrying, and build from source on GitHub if a trial must go on. Record that in the results.
- Read-only access to this repository is free; to push, attach it with push access first.
- `gh pr create` uses GraphQL, which is blocked. Use `gh api repos/premsethutmc/openpath/pulls -X POST ...`.
- Commit trailers and PR footers: follow the attribution instruction given by the session.
