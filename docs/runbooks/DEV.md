# Development: regenerate, test, review

Short reference for the daily loop. Commands run from the repository root unless they say `cd frontend`.
`npm ci` in `frontend/` provides `tsx` and `esbuild`; the `npm run …` shortcuts are in `frontend/package.json`.

## Regenerate generated files (regen@1)
- `node tools/regen.mjs`: regenerates every generated learning file in the one order that works (specs → library →
  parity → coverage → expansion → board releases → compiled coverage → review registry sync → explanation-review sync →
  server grader bundle). Commit what it writes, with the change that caused it.
- `node tools/regen.mjs --check`: the same, then fails if any generated file differs from git. CI runs it
  ("Generated files are up to date"); CI never commits. `--list` prints the steps and files.
- **Node only.** Bun computes a few float results differently in the last digit, which changes three families'
  fingerprints (`anncr`, `atgen`, `avfexp`); the script refuses Bun. Fingerprints are not rounded on purpose: the `atgen`
  difference is a validator that accepts different answers on the two engines, and rounding would hide that kind of change.
- Not regenerated: `content/learning/teaching-contract-baseline.v1.json` and `content/learning/lesson-checks-baseline.v1.json`
  are ratchets, lowered by hand after a fix (counts may only fall).

## Test
- **Fast, local:** `node tools/test-changed.mjs` runs the tests a change touches directly: the test files you changed, each
  changed source's own test, and every test that imports a changed file. `packages/learning` tests run with Bun, frontend
  tests with Node. `--base origin/<branch>` includes committed changes; `--slow` adds the long suites; `--dry` lists only.
  It is a quick signal; indirect dependants and browser journeys are CI's job.
- **Full, CI:** the frontend suite runs as six parallel jobs (`node tools/test-shards.mjs --run K 6`). Long tests that walk a
  collection run it in parts (`TEST_PART=K/6`, `frontend/src/test-part.ts`); without `TEST_PART` they run whole.
  "Frontend tests (all shards)" fails if any shard fails or if `--verify 6` finds a test file no shard runs.
- One shard locally: `cd frontend && node ../tools/test-shards.mjs --run 3 6`.
- `bun test packages/learning/src` (about 10 minutes) is **not** run in CI yet (CI has no Bun); run it before pushing
  engine changes.

## Review what a learner sees
- `cd frontend && node --import tsx scripts/learner-view.mts <competency> --board cbse|tn --grade N [--out file]`:
  the lesson page (sections, their question and grade, the picture drawn, worked steps, working, tips), the practice queue,
  the engine's sequence for a learner who is always right and one who is wrong twice first, with answer keys, and this
  lesson's automatic findings. About 10 seconds a module.
- `bun packages/learning/scripts/lesson-checks.ts [--grade N] [--board tn] [--check <id>] [--all]`: the review findings
  that can be checked automatically (lesson-checks@1, `packages/learning/src/lesson-checks.ts`), on each lesson as a learner
  of the grade sees it: a section showing one question but quoting another's working or tip; an exponent explained as a
  factor; later-grade sections (must be 0); lessons with nothing on grade; bare calculations with no explanation;
  misconception sections with no reason; a picture named but not drawn; option letters with no options; n! before
  Grade 11; "there are 1". `frontend/src/learning/lesson-checks.test.ts` fails when a count rises above the baseline;
  after a fix, `--write-baseline`.
- What the checks cannot see (still read by a reviewer): whether a stated reason is true, syllabus outcomes with no family,
  realistic contexts, repeated explanations in the engine.
