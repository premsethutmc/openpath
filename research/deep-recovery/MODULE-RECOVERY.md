# Deep recovery opened inside a module (phase 6, worker C)

Research only. The switch is the same as worker B's: `year/deep-recovery-flag.ts`, on only in a `build-year.mjs --test --deep-recovery`
bundle with `?deep=1`. In every other build it is the constant `false`. No engine file changed: `packages/learning/src/intervention.ts`
and `deep-recovery.ts` are byte-identical to the base (09163eb5, on #112 61edf730). Synthetic learners only. A synthetic success is not
evidence that anyone learned.

## 1. Trace (line numbers at 09163eb5, which equal 61edf730 for intervention.ts)

| Step | Where |
|---|---|
| The learner opens a skill: `Main.tsx:320` `<Module>` → `Learn.tsx:323` (now :328) `moduleState(c, records, ev, now, session, established, ctx.evidence)`. The whole-evidence argument is passed only outside a recovery (`withinRecovery ? undefined : ctx.evidence`) | `frontend/src/year/Learn.tsx:323` |
| `moduleState` wraps `moduleStep` and adds the schedule, handover@1 on pauses (`withHandover`, private) and the activity | `intervention.ts:391-406` |
| The module's phase comes from `moduleStep` in a fixed order: waiting → retention due → failed-retention unit check → pending investigation → relapse@1 → claim re-teaching → exploratory questions (`explore`) → **adaptive-loop repair** → sub-skill gap → unit recheck → shown → secure/insufficient → teaching | `intervention.ts:408-686` |
| **Adaptive-loop repair** (the only way into an in-module recovery): with whole evidence, not established, not shown, and a diagnosis with a gap, the first wrong exploratory answer that `reason()` can explain is the original. `recovery(wrong, …)` decides: investigate/support/teach/(return with < 2 tries) → phase `recover`, `original: wrong`; escalate → `pause`; solved_after_help/solved_on_retry → `verify` on a new question | `intervention.ts:515-531` (`recovery(` at :521, the `recover` return at :524-525) |
| The `evidence` argument is read **only** in that block (grep: :518, :521). `moduleState(…, undefined)` therefore differs from the full call only by skipping the adaptive loop | `intervention.ts:518,521` |
| The shipped recovery walks `questionSupports` to `RECOVERY_DEPTH = 2` and hands the first unshown support to its module. The support module runs without whole evidence, so it never opens a nested recovery. Returning means the **same original problem** again (`attempt`/`return`) | `intervention.ts:40, 882-907, 909-1005` |
| The view: phase `recover` → `Learn.tsx:354` (now :359) embeds `<Recovery original … embedded onFeedback={setFb}>`. `Recovery` (:399) calls `recovery()` on every render and shows the original (context `recovery:<q>`), the investigation question, or the support module (`<Module … withinRecovery>`) | `Learn.tsx:354, 399-470` |
| Evidence back to the module: there is no channel besides the records. Every answer is saved as an attempt and every lesson as a teach record. The module re-reads them: `recovery()` becomes `solved_*` only when **the original question itself** is answered right again (`tries` = attempts with `questionId === original`, :911-920). Then the module moves on (`verify`), or the skill becomes shown and the block is skipped (`!shown`) | `intervention.ts:911-920, 518, 526-530` |
| Deep recovery never asks the original again: it returns to a **fresh** problem on the original skill (`deep-recovery.ts` step 5). So the shipped recovery for that original stays open (investigate/support/return) for as long as the module's skill is not shown. The module keeps asking for its own two-level recovery (test 3 below: at every deep step the shipped module says `recover` and the shipped recovery would show a different screen) | `deep-recovery.ts:1-30`; test 3 |

Where a deep recovery has to hook in: wherever `moduleState` returns `recover` (and a pause that comes from the shipped recovery's
escalate). It also has to stay on the episode while one is open, even if the shipped decision changes underneath it. That can be done
**outside** the engine, because the module's decision is a pure function of the records and the `evidence` argument gates exactly the
recovery block.

## 2. What #115 changes in the same region (`git diff 61edf730 e1d5ed74`)

| File | #112 (61edf730) | #115 (e1d5ed74) | Change |
|---|---|---|---|
| `packages/learning/src/intervention.ts` | :36 import | :36 | adds `unitOfQuestion` |
| `packages/learning/src/intervention.ts` | **:520-525** (the adaptive-loop `recover` decision) | **:520-530** | scoped-teaching-priority@1: when the shipped recovery would send the learner to a prerequisite (`support`, or `teach` for another skill) and the module has a scoped skill unit that accepts the wrong question (`unitOfQuestion(m, wrong)`), the module does **not** return `recover`. It falls through to its own teaching |
| `packages/learning/src/intervention.ts` | :928-932 (`recovery`, retention branch) | :933-951 | recovery-scope@1: fallback unit when the teaching used an unscoped strategy |
| `packages/learning/src/records.ts` | :145 | :144 | `solution` from a lesson review only for guided attempts |
| `packages/learning/src/skill-connections.ts`, new `subskill-config-addition-regroup.ts` | | | an `addition-regroup` sub-skill config |

The #115 hunk at intervention.ts:520-530 is the exact line a patch inside `moduleStep` would have to edit. **This branch does not
touch it.** The adapter reads `moduleState`'s output, so it composes with either version.

`git merge-tree 565f4f4d e1d5ed74`: the only conflict is `packages/learning/src/records.ts:144-146`. It comes from the research base,
not from this work: worker B's `episode` on teach records (:146) sits next to #115's `solution` change (:145). It is mechanical: take
#115's attempts line and B's teach line. A scratch merge (outside the repo branches, not pushed) resolved it that way and ran this
work's tests on top of #115 (section 4).

## 3. What was built (commit on `research/dr6-module`)

- `frontend/src/learning/deep-module.ts` (new): `deepModuleState(on, …same args as moduleState)`.
  - off, no whole evidence (inside a recovery), or an established finding passed in: returns `moduleState(…)` itself.
  - an open (running or paused) deep episode whose original is **this module's own exploratory answer** (first try `diagnostic`, no
    deep context, question of this competency; `moduleOriginals`) → `recover` with that original, `why: deep-recovery-module@0`.
  - otherwise a shipped `recover` starts or reads the episode for its original.
  - an episode that ended solved / solved after help → `moduleState(…, undefined)`: the module carries on with everything but the
    adaptive loop. The shipped `verify` after `solved_after_help` is not repeated, because the episode already required fresh unaided
    right answers on the original skill. In the journeys the skill is shown at that point, so the shipped module skips the block too.
  - an episode that ended blocked / escalate → `pause` with the episode's reason, `why: deep-recovery-module@0: <phase>`.
  - a shipped `pause` caused by the shipped recovery's escalate, for an original with an ended episode, is handled like the
    `recover` case.
- `frontend/src/year/Learn.tsx` (module block only): `DEEP_MODULE = deepRecoveryOn()`. When it is on, `Module` uses
  `deepModuleState` (:328) and phase `recover` renders `<DeepRecovery … onFeedback={setFb}>` instead of `<Recovery>` (:359). When it
  is off, both lines are the previous expressions.
- `frontend/src/year/DeepRecovery.tsx` (worker B's file, a marked 4-line hunk at :15-20): an optional `onFeedback`, as `Recovery` has.
  When it is embedded, the module keeps the feedback, because the episode can end on the answer just saved and the view then unmounts.
- Stuck-view episodes (first try `original`, worker B) are never taken over by a module (test 8).

## 4. Tests

`frontend/src/journey/deep-recovery-module.test.ts`: engine-level, SliceSession, driven like the flagged Module view.

| # | Case | 09163eb5+this | scratch merge with #115 |
|---|---|---|---|
| 1 | addition with regrouping: 3 module exploratory answers → recover → slip check → probes → place value failing (compare numbers known) → place-value lesson → re-check → 2 fresh carrying problems right → module continues (verify…) → done | pass | fail (expected: see below) |
| 2 | same module, two-level gap: lessons compare numbers then place value, deepest first | pass | fail (same reason) |
| 3 | without the adapter, the shipped module says `recover` at every deep step, and the shipped recovery would show a different screen | pass | fail (same reason) |
| 4 | reload after every action (SliceSession.fromEvents, new session id): the same deep steps, the same end | pass | pass (vacuous: no episode) |
| 5 | reload mid-episode, +1 min and +26 h (new sitting): same original, same step; then finishes and the module ends done | pass | fail (same reason) |
| 6 | explanations do not click (prerequisite always wrong) → episode stops → module `pause`, nothing solved | pass | fail (same reason) |
| 7 | switch off: `deepModuleState(false)` deep-equals `moduleState` at every step of the shipped module+recovery journey; no `deep:` records | pass | pass |
| 8 | stuck-view episode not taken over by the module | pass | pass |
| 9 | place value (tens) module → compare numbers failing → lesson → fresh place-value problems → module continues → done; also with a reload after every action | pass | **pass** |
| 10 | place value → compare numbers → count objects (no teachable content) → blocked → module pause | pass | **pass** |

Reach (probe over all 336 modules, three exploratory answers given as each question's first modelled bug, `SliceSession.next`):
284 modules open an in-module recovery on #112+research, and 280 on the #115 merge. The 4 that switch to `chapter` on #115 are
addition-regroup, triangle-properties, angle-pairs and scale-drawings (own-unit teaching). So the adapter's reach on #115 is 280
modules under decision 5.1(a).

On #115, cases 1-3, 5 and 6 fail because of #115's scoped-teaching-priority@1, not because of the adapter. A carrying error in
`addition-regroup` now gets the module's own carrying unit (trace on the merge: explore×3 → chapter → guided → check → pause). The
module no longer returns `recover`, so no episode starts. Cases 9-10 (a module without such a unit) give the same journey on both
bases.

Regression (local, this branch, switch off in all of them): 76/76 pass (policies, scenarios, foundation-pathway, missing-number-support,
slice, learning/generalisation); deep-recovery* 53/53 pass plus this file's 10/10. No CI run. `npm run -s typecheck`: clean.

## 5. Integration plan (with #115)

What must be decided first (owner):
1. **Precedence between #115's own-unit teaching and deep recovery.** #115 says a carrying error is taught by the module's own unit
   before routing to prerequisites. With the adapter as written, #115 wins: no `recover`, no episode. Options: (a) keep #115's order
   (deep recovery only where the module would recover anyway); (b) start deep recovery only after the own-unit teaching has been tried
   and the unit's recheck is wrong. This needs a new engine signal, i.e. a change in the hunk #115 owns; (c) deep recovery overrides
   own-unit teaching. That reverts #115 §16.5 for research builds, which is not recommended.
2. **Pauses from a stopped episode get no handover@1 schedule** (`withHandover` is private to intervention.ts). Either export it
   (one line, outside #115's hunks), or accept worker D's educator hand-off for these stops.
3. **Learning-goal pathways**: when `ctx.module` is set (`Main.tsx:236`, pathway active), the Module view uses the pathway's own
   decision and the adapter is not applied. Decide whether deep recovery should run there.

Order of changes once #115 lands (none of them touch #115's hunks):
1. Rebase the research branch onto #115. Resolve `records.ts:144-146` by keeping #115's attempts line and B's `episode` teach line.
2. Bring in this commit unchanged (`deep-module.ts`, `Learn.tsx` :25-27/:328/:359, `DeepRecovery.tsx` :15-20).
3. Tests: switch cases 1-3, 5 and 6 to the place-value (or any non-unit) module, or assert #115's own-unit path for `addition-regroup`
   under decision 1(a). Rerun the regression set plus #115's `recovery-scope`, `addition-regroup` and `ws3-audit` tests with the switch
   off.
4. Only if 1(b) is chosen: an engine change in `moduleStep`, after #115's `ownUnit` check, that exposes "own unit tried and still
   wrong" (e.g. a `recoverAfterUnit` phase reason), and the adapter starts the episode on it. That is a change to #115's region, so it
   goes after #115 is merged, as its own PR, with #115's owner.

## 6. Browser journey (handed to worker B, who owns `frontend/e2e/deep-recovery-*.test.mts`)

Exact steps, following `e2e/deep-recovery-app.test.mts`:
1. Build `node scripts/build-year.mjs --test --deep-recovery`. Register a synthetic pupil enrolled in a grade that includes
   `MATH.number.place-value-tens`.
2. Open `/year/?skill=MATH.number.place-value-tens&deep=1`. Expect the Module view (h1 "Compose tens and ones" or the module name)
   and an exploratory question.
3. Answer the exploratory questions with the first modelled bug (`misconception(q, {bugs[0].id})`), shaped as the server reads it,
   until `[data-deep-recovery="on"]` appears inside the module (`data-deep-phase="slip-check"`).
4. Learner `chainLearner(PV, [CMP])` (see the test): answer the deep screens. Expect probes on compare numbers, a lesson
   (`data-deep-screen="lesson"`, save sends `episode`), then `data-deep-phase="return"` with a place-value question ≠ the original.
5. Reload mid-question and mid-lesson. With `?skill=` kept, the module reopens on the same deep screen (same `data-deep-phase`, same
   question's problem).
6. After the last return answer, expect its Feedback inside the module (the onFeedback hunk). Then "Next" shows a module question
   **without** `[data-deep-recovery]` (the module continues), and eventually the module's done status.
7. Switch off (no `?deep=1`, or a normal build): the same answers show the shipped `Recovery` ("Finding what this problem needs"),
   with no `deep:` contexts in the saved attempts.

## 7. Not proven

- No browser run of the in-module path (section 6 is a hand-off).
- The `solved` → `moduleState(…, undefined)` mapping was checked only where the skill is shown after the episode (all journeys here).
  If an episode ends solved and the skill is still not shown, the module skips the shipped `verify` question. That is deliberate, but
  untested on a real case.
- The precedence question in 5.1 decides whether `addition-regroup`-type modules (with scoped units) ever reach deep recovery on #115.
- Synthetic learners (structured dependency answerers). Nothing here measures learning.

## 8. Phase 7: combined with #115 (research/dr7-with115, owner's decision 1)

Branch `research/dr7-with115` = research head 26804900 + merge of #115 (e1d5ed74). Merge commit 378fa190 resolves `records.ts:144-146`
by keeping #115's attempts line and the research `episode` teach line. Nothing was merged into #112 or #115.

Owner: "Teach the current skill first where #115 already has suitable teaching. If the learner still struggles, investigate the
underlying gap and use deep recovery. Don't force every mistake down a prerequisite chain."

### Rule: struggle@0 (`frontend/src/learning/deep-module.ts`, `struggle()`; switch on only)

1. **Suitable own teaching** is #115's own case: one of the module's exploratory answers (activity `diagnostic`, no context) is wrong,
   and a scoped unit of the module accepts it (`unitOfQuestion`). #115 then teaches the module (scoped-teaching-priority@1).
   Nothing changes until that teaching has run: chapter → guided → independent check, exactly as #115 does.
2. **Still struggles** uses existing evidence only. Both of these must hold:
   - The module has stopped on that teaching. Either the planner says `recommend_human` (the block's independent check was wrong,
     policy C), or the after-pass@1 pause applies.
   - The learner's independent answers on that unit since the teaching end in **two wrong in a row**. Independent means first try,
     no hint, no shown solution, not guided, not a deep-recovery answer.
3. **Slip guard**: with only one wrong answer (the block check), the module asks **one** fresh question of the unit, alone (the
   "struggle check", `unitCheck`).
   - Right: most likely a slip. No prerequisite question and no lesson. #115's own next step stands (a person, policy C, with
     handover@1), and its reason says it was a slip.
   - Wrong: deep recovery starts from that answer. after-pass@1 already asks its own one-more question, so its pause arrives with two
     wrong answers and goes straight on.
4. **Deep episode**: everything as in phase 6 (diagnose down, teach the deepest gap, climb, fresh problems in the module).
   - Solved: the module goes on with #115's decision without the adaptive loop. Where the shared record now shows the skill, the
     module continues to done (addition-regroup, triangle-properties). Where #115 still stands on its policy-C stop (angle-pairs: the
     sub-skill evidence is not complete yet), the stop and its way back are kept, and only its reason is made true ("What was missing
     (angle measure) has been worked on …").
   - Blocked or escalated: the module pauses with the episode's reason.
5. **Modules with no suitable own unit**: a module-level `recover` goes to deep recovery as in phase 6.
6. **Never**: a stuck problem's own investigation answers (`investigate:` / `recovery:` contexts) never start a deep episode in the
   module. They keep the shipped recovery and its bounds (policy C, scenario 3h).

Cost of the slip guard for a learner who really struggles: the block check, the struggle check, and deep recovery's own slip check.
That is three same-kind questions before the first prerequisite question. A deep episode started from the struggle check cannot skip
its own slip check without changing deep-recovery.ts (worker A's file).

### Tests (`frontend/src/journey/deep-recovery-module-115.test.ts`, 6/6)

| Case | Result |
|---|---|
| Own teaching is enough, all four modules #115 changed | Switch on decides exactly as #115 at every step (JSON-equal), no deep step, only its own lesson, no prerequisite question |
| Capable learner, one slip on the post-teaching check (addition-regroup, angle-pairs) | Exactly +1 question compared with switch off; no prerequisite question, no lesson below; same final phase as #115 (pause) with the slip reason |
| Own teaching fails → deep → fresh problems → module continues: addition-regroup (gap place value), triangle-properties (gap angle measure) | Own chapter and a wrong check come first, then deep probes find the gap and teach it, fresh module problems are right, the module ends done |
| angle-pairs (gap angle measure) | Deep solves it; #115's policy-C stop is kept with a true reason |
| scale-drawings (gap ratio) | Ratio has no teachable content here → blocked → module pause, nothing solved ("where content allows") |
| Policies A1 (oneSlip 3/4/5) and C (3h) with the switch on | Every module decision in those journeys equals #115's own (0 divergent of all checked) |

The phase-6 file `deep-recovery-module.test.ts` (10/10) is adjusted to #115 for addition-regroup in two assertions (marked "phase 7"):
own teaching first, and the original is the post-teaching check.

### Patch needed on #115 later

None, for this research path: the rule lives in the wrapper and reads `moduleState`'s output (`decision.action`, `why`). #115's hunks
(intervention.ts:520-530, :933-951) are untouched.

If this becomes product behaviour (owner's call, after #115 is merged), the minimal engine patch on #115's intervention.ts marks the two
stops so that the app need not re-derive them, and it exports the handover helper:

```diff
--- a/packages/learning/src/intervention.ts   (e1d5ed74)
+++ b/packages/learning/src/intervention.ts
@@ -345 +345 @@
-function withHandover(ms: ModuleState, m: Module, records: LearnerRecords, now: number): ModuleState {
+export function withHandover(ms: ModuleState, m: Module, records: LearnerRecords, now: number): ModuleState {
@@ -653 +653 @@
-  if (decision.action === "recommend_human") return { ...base, phase: "pause", diagnosis: d, decision, reason: "Different explanations have not clicked yet. …" };
+  if (decision.action === "recommend_human") return { ...base, phase: "pause", diagnosis: d, decision, why: "own-teaching-stop@1: recommend_human", reason: "Different explanations have not clicked yet. …" };
```

The after-pass@1 pause (:672) already carries `why: after-pass@1 …`. With these in place, `stoppedOnOwnTeaching()` in the wrapper
reads `why` only. Everything else (the struggle check, starting the episode, the true reasons) stays out of the engine.

### Not proven (phase 7)

- No browser run on the combined branch.
- After a solved episode, angle-pairs keeps #115's policy-C stop, because #115's evidence (sub-skill coverage) is not yet complete.
  Whether a solved deep episode should lift that stop is a policy question, not answered here.
- Synthetic learners only. The prerequisite links that deep recovery followed (e.g. triangle-properties → angle measure, from the
  question's own solution steps) are not approved by this work.

## 9. Phase 8: #115's angle-pairs stop after a repaired prerequisite (research/dr8-anglepairs, owner's decision)

Owner: "A repaired prerequisite alone should not automatically lift it. If the pause was solely because of that gap, let the learner
attempt a fresh angle-pairs question independently. If they succeed, allow the module to continue and record the recovery; if they
don't, retain the pause or offer appropriate support. If the pause has another reason, preserve it."

This supersedes phase 7's "stop kept with a true reason" for angle-pairs. The phase-7 test is updated to match.

This lives in the wrapper only (`deep-module.ts`, `repairedGapOnly` and repaired-gap@0 in `deepModuleState`). #115's hunks and the
engine are untouched. The switch is off by default.

### Rule: "solely attributable" (`repairedGapOnly`, from saved records only)

All of these must hold:
1. The stop is #115's own-teaching stop: planner `recommend_human` (policy C) or `after-pass@1`. Any other pause kind (no-dead-end,
   no unit check, relapse, bounded input, every explanation tried, written work waiting, handover re-entry) is a different reason and
   is kept unchanged.
2. The deep episode ended `solved` or `solved_after_help` with diagnosis `prerequisite` and a named cause. That means a lesson on a
   skill below, that skill re-checked right, and fresh unaided goal answers right after it. A slip, a blocked or escalated episode, or
   "own-or-unmapped" is not a repaired gap.
3. No misconception is established, or open and due for teaching, in the competency.
4. The episode began from this module's own struggle: its original is a wrong answer on the unit after the module's own teaching.

### Routes

- **Solely attributable** → ONE fresh question of the unit on the learner's own (`unitCheck`). Fresh means never presented by
  problem key, counting answers, unresolved and pending answers, and teaching-screen instances. It is not a teaching screen.
  - **Right (route 1)**: the module carries on with fresh questions of its own (`questionForRequirement`, never presented), with
    `why: deep-recovery-module@0: recovered (<cause>; <episode outcome>)`, until #115's own decision takes over (the skill shown) or
    the questions run out ("progress, not yet mastery; come back another day"). A wrong answer on the way brings #115's stop back.
    The recovery is recorded: the episode's attempts (`deep:` contexts), its lesson with the recovery id, and its
    solved-after-help outcome all stay in the records and are rebuilt from them. Nothing is counted as unaided.
  - **Wrong (route 2)**: #115's stop is **kept**, with its decision and its way back (handover@1); only the reason says what
    happened. There is no second descent: the gap below was repaired and re-checked, so what is left is this skill itself, and its own
    explanations were already tried (policy C: a person). "Appropriate support" is that hand-off. Worker D's educator hand-off can
    attach here.
- **No fresh question left** → the stop is kept, and the reason says so.
- **Not solely attributable** → #115's stop as it is (or the slip / blocked reasons from phase 7).

A later wrong answer on the unit never starts a second episode: once an episode began from the unit's struggle, its outcome decides.

### Tests (`frontend/src/journey/deep-recovery-module-anglepairs.test.ts`, 6/6, switch on unless stated)

| Case | Result |
|---|---|
| Route 1: angle measure taught by deep recovery → one fresh angle-pairs question, right | Exactly one after-repair question, never presented before; the module carries on with its own questions and is not stopped again; the episode reads back as `solved_after_help`, diagnosis `prerequisite`, cause angle measure, with its lesson carrying the recovery id |
| Route 2: same, the fresh question wrong | #115's stop kept (same planner decision and handover as #115), no further question, one episode only |
| Other reasons | A slip (no gap repaired) keeps the phase-7 slip stop; scale drawings (ratio not teachable) keeps the blocked stop; no after-repair question in either |
| Rule itself | true for the repaired-gap case; false for another stop kind, for no prerequisite repaired, and for an episode not from the unit's struggle |
| Reload at every step, both routes | The decision before and after each reload is identical (phase, question, why, deep screen), and the whole journey is identical |
| Switch off | `deepModuleState(false)` deep-equals #115's `moduleState` at every step; no `deep:` records; the module stops after its own teaching |

Regression on this branch (local, no CI): #115's own 13 test files 129 pass, 0 fail, 2 marked TODO in #115 itself; policies, scenarios, foundation-pathway,
missing-number-support, slice, generalisation 76/76; deep-recovery* (non-module) 78/78; deep-recovery-module* 22/22 after the
phase-7 angle-pairs test was updated. `npx tsc --noEmit` and `-p tsconfig.english.json` from frontend/: exit 0.

### Not proven (phase 8)

- No browser run.
- Only angle-pairs reaches this route among the four #115 modules: addition-regroup and triangle-properties continue by themselves
  after the episode, and scale-drawings is blocked.
- "Module continues" ends where #115's evidence takes over or the fresh questions run out. The amount of evidence a route-1 learner
  then needs is #115's (sub-skill coverage), not changed here.
