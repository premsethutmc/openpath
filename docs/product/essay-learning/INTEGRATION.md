# Essay-to-mastery integration (intelligence + experience)

*Integration branch `feat/essay-integration-v1`. Draft for review: nothing merged into `main`, nothing deployed,
no real child's writing collected.*

## 1. What was integrated

| Source | Branch / commit | What it brings |
|---|---|---|
| Baseline | `main` @ `b578c78` | Both branches start here; PR #41 is not merged, so it is not part of the baseline |
| Intelligence (Claude, PR #43) | `feat/essay-learning-intelligence-v1` @ `e1c6405` | `essay-contract@1`, analysis, diagnostics, journey, rewrite, learner profile (core) |
| Experience (Codex) | `feat/essay-learning-experience-v1` @ `fd938ec` | Mobile essay UI with a fixture presenter, styles, browser tests, CI job |

**Merge conflict:** only `packages/english-core/src/essay/contract.ts`. Codex imported it byte-for-byte from
`447a56d`. `e1c6405` extends it, adding `CompetencyProfile.note` and the required fields
`CompetencyStatus.engine.currentLevel` and `.target`. It was resolved to the `e1c6405` version.

**One consequence fixed here:** those two new fields are required, so Codex's fixture
(`shared-fixture.ts`), which *builds* `CompetencyStatus` objects, no longer type-checked. It now sets both to
`null`. The change was additive for readers and breaking for producers; future contract changes should be
optional or carry a new version.

## 2. What is real and what is not

The integration adds a second, engine-connected mode next to Codex's fixture demo.

| Route | Mode | Status |
|---|---|---|
| `?experience=essay-live` | **Connected to the engine** (new) | Every status comes from the core and the learner's record |
| `?experience=essay-demo` | Codex's fixture storyboard (unchanged) | Prewritten frames; nothing assessed (as it says on screen) |

Both are refused in the reviewed pilot build.

In the live mode:

| Part | Real? | How |
|---|---|---|
| Essay submission | **Real** | `submitEssay` → an `essay` event in the learner's ledger |
| Competency observations | **Validated for real; produced by stand-ins** | The output for the two built-in synthetic samples is a *recorded* evaluator output (replayed by text fingerprint). Other text goes to a small deterministic *pattern* stand-in that misses most errors. Both pass the core's strict validation (verbatim quotes, profile competencies, versions). **No LLM is connected.** |
| Gap hypotheses | **Real** | `gapHypotheses` from validated observations and earlier essays |
| Diagnostic questions | **Real** | Unseen questions from the existing bank, shown with the app's own `ItemView`, recorded by `Learner.present/answer` as independent evidence with `provenance@1` |
| Profile change from evidence | **Real** | The existing updater decides each answer; the profile and `profileUpdates` read the engine's composite and verification |
| Learning journey | **Real** | `createJourney` / `journeyStatus`; lessons are the app's lessons (`finishLesson` → `intervention`); practice is recorded as assisted; checks are independent and asked in a new sitting after a lesson |
| Green | **Real, engine-only** | Only when the engine's verification is demonstrated or verified **at the Grade 8 target band** |
| 50-word rewrite | **Word limits real; judgement recorded** | 20–50 words checked by the core. The built-in sample rewrite has a recorded judgement (five dimensions, each validated). Any other rewrite is **kept and held, not judged** |
| Persistence and reload | **Real** | IndexedDB through the app's `Repo`; everything is rebuilt from events on reload |
| Learner identity | **Synthetic, on device** | A dedicated profile, "Essay test learner (synthetic)" (`essay-studio-synthetic-learner`), in the device store only. Never a child's profile and never the parent account (which would sync essays to the server) |

## 3. The critical acceptance test

Both run in this session and in CI:

* **Logic:** `frontend/src/english/logic/essay-live/studio.test.ts`, which runs the real `Learner` on a `MemoryRepo`,
  reloads with `Learner.open`, and uses the core's essay functions.
* **Browser:** `frontend/e2e/essay-live.test.mjs`, a production build in Chromium at 390 px, using IndexedDB and a page reload.

| # | Step | What the tests check |
|---|---|---|
| 1 | Submit a synthetic Grade 8 essay | Essay event in the learner's ledger and repository; `dataUse: synthetic_test`; profile `openpath.g8-writing@1` |
| 2 | Competency-linked observations | Accepted analysis; every observation names a Grade 8 competency and its span is the exact essay text; agreement *suspected* |
| 3 | Answer diagnostic questions | Real bank questions; two wrong answers without help **confirm** agreement; dependent prepositions reported as a content gap |
| 4 | Independent evidence changes the profile | `profileUpdates`: gap suspected → confirmed, `estimateChanged` true; every answer decided by the engine (accepted for candidate content) |
| 5 | Generate and complete steps | Lesson → practice (assisted: held) → check in a new sitting. Steps are `done`; **not green**: the engine shows "demonstrated at band 4", below the Grade 8 target of band 5. Dependent prepositions: three blocked steps |
| 6 | 50-word rewrite | Five dimensions accepted; `affectsEstimates: false`; the composite is byte-identical before and after |
| 7 | Reload | A new `Learner` from the same repository (logic) and a page reload (browser) give the same view, stage and profile |
| 8 | Second essay | A single agreement error is *suspected* because of essay 1 ("also seen in 1 earlier essay"). Questions already used are never reused. Answered right, it is *weakened* and not retaught. The unresolved dependent-prepositions gap from essay 1 stays on the path, blocked. A separate test shows the opposite case: wrong again, so agreement is taught again with new questions |

Also tested: a rewrite with no connected evaluator is held, never judged; other text is labelled as analysed by the
pattern stand-in; a pilot build refuses the studio before anything is recorded.

## 4. Test results (this session)

| Suite | Result |
|---|---|
| Core `packages/english-core` (`npm test`) | 225 / 225 pass; `tsc` clean |
| Frontend `npm test` (all unit tests, incl. Codex's 12 and 5 new) | 247 / 247 pass |
| Codex essay browser tests (`essay-learning.test.mjs`) | 7 / 7 pass |
| Live essay browser tests (`essay-live.test.mjs`) | 2 / 2 pass (acceptance path; pilot refusal) |
| Existing English browser tests (`english.test.mjs`) | 9 / 9 pass |
| English development and pilot builds | Both build |
| Frontend typecheck (`npm run typecheck`) | **Not run locally**: `@types/react` is not installable here (npm registry blocked); CI runs it |
| Backend tests (Django) | **Not run locally**: PyPI is blocked here; no backend file changed; CI runs them |

Local runs used the preinstalled Playwright 1.56 and Chromium 1194 (Codex used 1.64), linked into an ignored
`node_modules`.

## 5. Missing content

* **Lessons:** 3 of the 19 Grade 8 competencies have one (agreement, past/present simple, articles). Every
  other teaching step is blocked.
* **Unspecified competencies:** dependent prepositions, reference across sentences and concision have no
  descriptors or questions. They can be observed, but not diagnosed, practised or checked.
* **Prerequisites:** the framework has few edges (run-ons → commas, subordination → run-ons).
* **Diagnostic questions** are unreviewed candidate content (their status is shown).
* **Grade 8 target bands** (band 5) and curriculum mappings are drafts until an educator reviews them.

## 6. Evaluator limitations

* No LLM evaluator is connected. Recorded outputs exist only for the two built-in samples; the pattern
  stand-in finds a handful of fixed errors (for example "he go", "depend of", "a apple") and misses most.
* Rewrite judgements exist only for the built-in sample rewrite; any other rewrite is held unjudged.
* A live evaluator must implement `EssayEvaluator` and use the versioned prompts
  (`essay-observe.v1`, `essay-rewrite.v1`). It should be qualified before its output is shown to a learner.
* Essays never change estimates; only the diagnostic and check answers do.

## 7. Privacy blockers (before any real child's writing)

1. **Consent, retention and deletion policies** are not approved. `REAL_LEARNER_ESSAYS_ENABLED` stays false and
   the studio submits only `synthetic_test`.
2. **Typed text cannot be verified as invented.** The studio labels it and warns against pasting a child's work,
   but it cannot detect it. The live mode should stay off in any build children use (it is already refused in pilot).
3. **Server sync.** Account mode would upload events (including essay text) to the backend. The studio
   deliberately uses the device store only. Server storage of essays needs its own review.
4. **Deletion.** Deleting one essay from the ledger is not implemented. The whole synthetic profile can be
   removed with the app's existing profile deletion.
5. **Sending text to an LLM provider** needs a data-processing review. Text is scrubbed of contact details
   first, but not of names.

## 8. Open decisions

* **Rewrite length.** Codex's demo requires exactly 50 words; the engine accepts 20–50 ("at most 50"). The live mode
  follows the engine. Owner to decide.
* **One essay UI or two.** The live mode is a separate component (`EssayLive.tsx`) that reuses Codex's styles,
  status mapping (`presentationStatus`, `visibleStatus`) and the app's `ItemView`. Codex's `EssayPresenter`
  interface is storyboard-shaped (free-text answers, fixed categories) and does not fit real questions. Merging
  the two screens is follow-up work.
* **Merge order.** PR #43 first, then Codex's branch (with the `shared-fixture.ts` fix from here), then this
  integration, or this branch alone after review.
