# Essay-to-mastery intelligence (essay-contract@1)

*Branch `feat/essay-learning-intelligence-v1`. Draft: synthetic data only, nothing deployed, nothing merged.*

Essay → competency observations → diagnostic verification → finite learning journey → 50-word rewrite →
updated persistent learner profile. This document is for whoever builds the screens (the Codex tutor UI).
The intelligence lives in `packages/english-core/src/essay/`. It adds **no second learner model, estimator
or evidence store**: everything is recorded in the existing learner ledger, and every claim about ability
comes from the existing engine.

## 1. The five states

| State | Means | Comes from | Can change an estimate? |
|---|---|---|---|
| `unknown` | Nothing recorded | — | — |
| `observed` | An essay showed it once (error or strength), or a suggested gap was weakened | Validated essay observations | **Never** |
| `suspected` | Essays point to a gap (same kind of error in 2+ sentences, or in 2+ essays). `gap.status` then says `suspected`, `confirmed`, `unresolved` or `weakened` after diagnosis | Essay observations + diagnostic outcome | **Never** |
| `demonstrated` | The engine's verification is `demonstrated` **at or above the profile's grade target band** | Existing ledger → composite → `leafView().verification` | Only through the engine's existing rules |
| `verified` | The engine's verification is `verified` (retained after a delay) at or above the target band | Same | Same |

The engine claim and the essay claim are shown side by side, never merged. A skill the engine shows as
demonstrated can carry a `suspected` gap from a new essay; the profile states both and the journey checks it
again instead of reteaching it.

**Target band.** The engine can report `demonstrated` at a low band. In the demo, three wrong agreement answers
gave "demonstrated at band 2". `engineClaim()` therefore counts demonstrated/verified only when the level the
evidence supports reaches the profile's draft Grade 8 target (band 5). The profile's `notes` explain any shortfall.

## 2. Workflow and API

All functions are pure and deterministic. They read the learner's ledger events and return the events to
append. The app keeps the ledger as it does today. Load the context once:

```ts
import { loadEssayContext } from "tools/english/essay-load.ts"; // Node; in the browser, build EssayContext from the same JSON
const ectx = loadEssayContext(); // framework 0.2.0, live bank, content/english/essay/g8-writing.json, app lessons
```

| Step | Call | Returns / append | Notes |
|---|---|---|---|
| 1. Submit | `submitEssay(ectx, events, meta, { essayId, learner, text, source })` | `event` (essay submission) | Refuses `dataUse: "real_learner"` (`REAL_LEARNER_ESSAYS_ENABLED = false`), fewer than 30 or more than 1,500 words, duplicate ids |
| 2. Analyse | `await analyseEssay(ectx, events, evaluator, essayId, meta)` | `event` (analysis) | Evaluator output is validated strictly (§3); a repeated essay (same fingerprint) is marked `repeatOf` and not counted again |
| 3. Hypotheses | `currentHypotheses(ectx, events)` | `Map<competency, GapHypothesis>` | Derived, never stored |
| 4. Diagnose | `planDiagnostics(ectx, events, (n) => meta)` | `events` (one request per new hypothesis) | Unseen questions from the existing bank; a gap in content is reported, never filled |
| 4b. Answers | the app records answers as it does now (`presented`, `evidence` with `provenance@1`, `hint`, `assisted_response`) | — | Only first answers without help decide; the engine's rules decide any estimate change |
| 4c. Outcome | `gapHypotheses(...)[i].diagnostic` or `diagnosticOutcome(ectx, events, request)` | `confirmed` / `weakened` / `unresolved` / `pending` | Two wrong without help confirm; all right weakens; mixed is unresolved |
| 5. Journey | `createJourney(ectx, events, meta, essayId)` | `event` (journey snapshot) | Up to 3 trees, prerequisites first, each node teach → guided practice → independent check |
| 5b. Progress | `journeyStatus(ectx, events, journeyId, now)` | `LearningJourney` with live step statuses | Recompute after every answer; nothing to store |
| 6. Rewrite | `await evaluateRewrite(ectx, events, evaluator \| null, meta, { rewriteId, essayId, text })` | `event` (rewrite + evaluation) | Over 50 or under 20 words is refused before anything is recorded |
| 7. Profile | `essayProfile(ectx, learner, events, now)`, `profileUpdates(ectx, learner, before, after, now)` | `EssayLearnerProfile`, `ProfileUpdate[]` | The next essay reads the same ledger, so it starts from everything known |

`meta` is `{ id, at, session }`, chosen by the app, so replay is exact.

### Showing a journey

* `pending` / `done` / `blocked` / `green` per step. **Only an independent check can be green**, and only when
  the engine supports the grade target. A finished lesson or practice set is `done`, never green.
* Teaching is "done" when the app records an `intervention` event for the competency (as lessons do today).
* Guided practice answers are recorded with hints or as practice: they are assisted and never evidence.
* `blocked` steps name the missing content (`contentGaps`). Show them honestly; do not hide the step.
* `finalRewrite.available` becomes true when no step is pending.

## 3. Evaluators

`EssayEvaluator` has `observe(ObservationRequest)` and `rewrite(RewriteRequest)` and returns raw JSON. OpenPath
validates everything:

* Every observation names a competency in the Grade 8 profile, quotes the essay **word for word** (code finds
  the span and sentence; a paraphrase is rejected) and is stamped with the evaluator's id, version and protocol.
* Unknown fields are rejected, unknown misconception tags dropped, duplicates removed, at most 40 observations kept.
* An essay containing text addressed to the evaluator is held for a person.
* Rewrite dimensions are judged separately: a bad quote rejects that dimension only. Meaning preservation
  must agree with the key ideas the evaluator itself lists.

Provided, no network: `fixtureEssayEvaluator` (replays recorded outputs; used by all tests) and
`patternEssayEvaluator` (a handful of fixed patterns for demos; misses most errors; not an assessment). A live
LLM is any object implementing the interface, with the versioned prompts `content/english/prompts/essay-observe.v1.md`
and `essay-rewrite.v1.md`. No live model has been called.

## 4. Ledger integration

Essay records are `{ kind: "essay", id, at, session, record }` events in the existing ledger (`types.ts`
`EssayEvent`). The updater records them and changes no estimate (tests K0-1, K1-16).

**For the app (not done on this branch):** `frontend/src/english/logic/events.ts` validates event kinds. Add
`"essay"` to `KINDS` and `LEDGER_KINDS` when the UI starts recording essays, so they are stored and passed to the
engine. No frontend file is changed here.

## 5. Grade 8 competency profile

`content/english/essay/g8-writing.json` (`openpath.g8-writing@1`, status candidate): 19 framework leaves in six
areas (grammar, prepositions, sentence structure, vocabulary, coherence, concision), grouped by the 6+1 Trait
Writing model. Curriculum references (NCERT Learning Outcomes Class VIII at document level, CEFR scales, CBSE
topics where the framework names them) are indicative and marked `validated: false`. Expected bands (5) are
draft values.

Three competencies are in the framework but not specified (no descriptors, questions or lessons):
`EN.GRM.PREP.dependent`, `EN.SEN.COH.reference_across`, `EN.SEN.PRE.concision`. They can be observed in an essay;
diagnosis and teaching report them as content gaps.

## 6. Privacy

* Synthetic essays only. `submitEssay` refuses `real_learner` until consent, retention and deletion policies are approved.
* Essay text is kept in the learner's local ledger, as written answers already are. Text sent to an evaluator
  is scrubbed of contact details first.
* The original and the rewrite are kept by ledger id (`artifacts`) for side-by-side comparison. Deleting an
  essay needs the deletion policy; nothing here deletes.

## 7. Draft policy (`essay-policy@0-draft`)

Suspect after errors in 2 sentences (or 2 essays) · 3 diagnostic questions, 2 independent answers needed ·
2 wrong confirm, all right weakens · up to 3 trees, prerequisites 2 levels deep · 3 guided and 2 check
questions · rewrite 20–50 words. None of these is a claim about what works for children.

## 8. Tests

`packages/english-core/test/k0-essay-contract.test.ts` and `k1-essay.test.ts` (20 tests, synthetic Grade 8
essays): repeated grammar errors, isolated slips, strong writing, contradictory and mixed diagnostics,
paraphrased quotes, missing content, assisted answers, repeated submissions, cross-session persistence,
deterministic replay, and unchanged estimates and verification with and without essay records.
`node tools/english/essay-demo.ts` runs the whole workflow with no LLM.

## 9. Known limitations

1. **Essays never change estimates.** An essay suggests; questions decide. Routing essays through the qualified
   writing-evaluation path (proposal checks 1–13) needs trusted Grade 8 anchors, which do not exist.
2. **Content is thin for writing.** Lessons exist for 3 of the 19 competencies (agreement, past and present
   simple, articles). Framework prerequisites are few (run-ons → commas, subordination → run-ons).
3. **Diagnostic questions are unreviewed candidate content.** Under the existing rules their answers update
   estimates; their status is shown with every request.
4. **The pattern evaluator is a demo stand-in.** Real analysis needs an LLM evaluator, qualified before use.
5. **Grade targets and curriculum mappings are drafts** until an educator reviews them.
6. **Frontend storage of essay events is not wired** (§4).
