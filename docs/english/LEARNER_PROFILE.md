# Learner Intelligence V1: one pupil, many capabilities

One learner → every capability with evidence → a unified profile → a development plan → a plan that changes
when new evidence arrives. Built on the existing ledger, engine, framework, rule evidence and planner. There is
no new learner model and no new store: the profile is rebuilt from the event log each time it is shown.

**Status:** working software on draft content. No question is teacher-reviewed. The scenarios are synthetic and
show software behaviour, not educational effectiveness.

## 1. Inventory: implemented versus only defined

| | Defined | Implemented (usable now) |
|---|---|---|
| Capabilities (framework en@0.2.0) | 121 leaves in 8 strands | 56 specified (descriptor, bands, misconceptions); 65 are "planned" names only |
| Assessment questions | – | All 56 specified capabilities have 12–19 hand-written right-or-wrong questions (candidate, not teacher-reviewed). 10 reading capabilities use passages |
| Lessons and teaching | – | 13 capabilities: 3 spelling (lessons plus generated practice words), 6 grammar, 4 vocabulary. The other 43 have questions only |
| Prerequisites | 6 edges, all marked "candidate; no reference states it": finding details → main idea → summarising; commas → run-ons → subordination → embedding; task response → paragraphing | Used as given. **There are no spelling prerequisites, so none are used** |
| Couplings | 32 (small capped influences between estimates) | Used by the engine, unchanged |
| Independent evidence | – | Every first, unhelped answer (provenance@1). Help, retries, hints, provisional and practice-only answers are recorded but held |
| Learner model | – | The engine's composite: per-capability estimate and uncertainty, direct evidence count, demonstrated and mastered levels, verification and retention schedule, misconception strengths, history |
| Rule-level evidence | – | Consonant doubling only (the provisional journey) |
| Progress display | – | Certainty (not assessed / early / measured), band range, verification, kinds of evidence |
| Writing, short answers, listening, speaking | Defined | Not available in the app (evaluation is disabled; no audio tasks) |

Usable without modification: the engine (`leafView`, verification, retention, `recommend`), the ledger's decisions,
provenance, the content gate, `capabilityProgress`, the spelling plan and the doubling journey's report.

## 2. What was built

| Piece | Where | What it does |
|---|---|---|
| Development plan | `packages/english-core/src/development.ts` | Pure, deterministic, subject-neutral `planDevelopment`: from one snapshot per capability plus the prerequisite edges, ranked recommendations, each with what, why, evidence ids, what would change it, and whether the app can deliver it. Also `explainPlanChange` |
| Profile | `frontend/src/english/logic/profile.ts` | Builds each snapshot from the records: the engine's estimate and verification, evidence by kind from the ledger's decisions, unused questions, deliverable teaching. Maps actions onto sessions the app can run and words them for a child |
| Check session | `select.ts` `checkNext`, session type `check` | A few independent questions on one capability, chosen by the engine's own selection (assessment mode; hybrid for a later check). No new scoring |
| Today | `ui/App.tsx` | At most three activities, labelled "Keep learning", "Check something you learned", "Try a new skill" or "Show what you know", plus a link for a grown-up |
| Parent overview | `ui/Profile.tsx` | Shown; not sure yet; found hard (with possible-prerequisite notes); where help was needed; remembered later; what has changed (no causal claim); recommendations with their evidence; what needs a person; why the plan changed; how much is not checked |
| Capability cards | `ui/Profile.tsx` | Per capability: name, subject and area, standing, estimate and uncertainty, evidence (on their own / with help / provisional / practice words), strengths, difficulties and patterns, retention, last answered, next step |

### Standings (from existing values; nothing new is scored)

| Standing | From |
|---|---|
| not checked | no independent answers. **Never a weakness**: it can only lead to a check |
| not sure yet / developing | the existing certainty rule (early / measured) |
| found hard | at least 3 independent answers, and P(rate < 0.5) ≥ 0.8. This reuses the rule-evidence draft's "weak" test (draft policy) |
| shown / shown and still right later | the engine's demonstrated / verified |
| due for a check / not kept | the engine's overdue / failed retention |

Help never makes a capability shown or hard. Provisional journey answers are shown separately and never count.
Spelling-check misses are on practice-only words: they can choose practice, but never set a standing.

### Plan order (draft policy `development-policy@0-draft`)

1. **Too little evidence anywhere** (fewer than 6 independent answers): the starting point only.
2. **Not kept** at a later check: a refresher (a lesson if there is one, otherwise new questions).
3. **Due for a check**: a later check.
4. **Paused by an activity** (the doubling journey asking for an adult): an adult.
5. **Found hard:**
   - a prerequisite not yet measured is checked first;
   - if a prerequisite is also hard, it is worked on first, or goes to an adult when there are no lessons;
   - otherwise the capability is taught when there is a lesson, or goes to an adult when there is none.
6. **Mostly with help:** a check without help.
7. **Spelling practice signal:** practice.
8. **Not sure yet:** more questions, fewest answers first.
9. **Developing:** continue (a lesson) or more questions.
10. **Prerequisites shown:** the next capability.
11. **Not checked:** a first look, preferring areas with nothing measured.

Today takes the top three deliverable actions: one per capability, spread over areas, with refreshers, later checks
and prerequisites never displaced. Anything the app cannot deliver goes to "Needs a person" and is never offered to
the child.

## 3. The demonstration

`npm run english:demo-profiles`:
1. Builds each history with the app's own `Learner` calls.
2. Exports it as an ordinary backup.
3. Imports it into the running production build at phone size.
4. Captures Today and Progress.

The screens are rebuilt from those records. 27 screenshots are written to `frontend/out/profile-demo/`; 13 of 13
checks pass.

| Learner | History | Plan |
|---|---|---|
| A | Spelling shown on all three spelling capabilities; reading: 1 of 2 | Reading main idea in Today; spelling not repeated |
| B before | Main idea: 0 of 4; finding details never checked | Check finding details first ("it builds on…") |
| B after | Finding details: 4 of 4, shown | Main idea goes to an adult (no reading lessons); "why the plan changed" lists the standing change and the dropped and new actions |
| C before | Subject–verb agreement: 0 of 5 | Lesson and practice on it |
| C after | Lesson, then right in practice | No more remediation; "found hard → shown", with "does not show what caused it" |
| D due | Shown, then 10 days pass | Check something you learned (it comes first) |
| D after | Wrong at that check | Refresh it first |
| E | Doubling right only after hints (12 with help) | Not shown, not offered as secure; help listed apart; adult asked (the journey had paused) |
| F | 3 answers, then stopped | The starting point again; nothing called hard |

## 4. Tests

- Core D1 (12 tests):
  - initial assessment;
  - missing versus hard;
  - comprehension over spelling;
  - unmeasured or hard prerequisites;
  - no lesson goes to an adult;
  - help is not mastery;
  - retention order;
  - content exhaustion;
  - the next capability;
  - every field present, and determinism;
  - the change explanation;
  - the "found hard" threshold.
- App `profile.test.ts` (11 tests):
  - learners A, B, B2, C, D, E and F through real sessions;
  - missing evidence versus weakness;
  - content exhaustion;
  - provisional content;
  - reading the profile writes nothing;
  - replay from the stored events gives the identical profile and plan.
- Browser (phone size): a new test covers:
  - only the starting point at first;
  - at most three labelled activities, with no numbers about the child;
  - a check stays on its skill;
  - the overview has every part and survives a reload;
  - layout and tap sizes.
- The six existing browser tests pass unchanged; the existing spelling flow now comes from the new plan.

## 5. Remaining gaps before a multi-capability pilot

1. **No content is reviewed.** All 56 capabilities run on candidate questions. "Shown" means shown on draft
   questions. Educator review of at least the capabilities in the pilot is needed.
2. **Teaching exists for only 13 capabilities.** Reading, sentences and writing difficulties go to "Ask a teacher or
   parent". That is honest, but the plan cannot remediate most areas yet.
3. **Prerequisites are thin and unreviewed.** There are 6 candidate edges and none in spelling, grammar or vocabulary.
   Prerequisite reasoning only works where edges exist.
4. **Draft thresholds.** These are untested with children:
   - "found hard" (≥ 3 answers, P(rate < 0.5) ≥ 0.8);
   - the starting-point minimum (6);
   - "mostly with help" (≥ 4 assisted, ≤ 1 independent right);
   - three activities a day.
5. **Questions run out.** At 4 per check, a capability's 12–19 questions last 3–4 checks. Exhaustion is reported to an
   adult, but more questions are needed for longer use.
6. ~~"Shown" can follow a single lesson session.~~ **Fixed in PR #23**: practice straight after a lesson is
   "improving, awaiting confirmation"; only fresh independent answers outside a lesson can establish "shown". See
   `EVIDENCE_AFTER_TEACHING.md`.
7. **A stopped starting point counts as "done"** in the existing app. The new plan now detects too little evidence and
   offers it again; the older spelling gating still follows the old rule.
8. ~~The Today page still lists older sections.~~ **Fixed in PR #23**: Today shows only the plan; the doubling
   journey, spelling patterns and "questions from anywhere" are behind one "More practice" entry.
9. **No accounts, no multi-device sync, no teacher view:** by design for now. The pilot would run on one device per
   child.
10. **Only English.** The plan is subject-neutral, but no other subject has a framework or content.
