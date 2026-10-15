# Evidence rules for mastery and misconceptions (as built)

**Status:** approved on 15 October and implemented on PR #28. The proposal and its reasoning are in
`MASTERY_RULE_PROPOSAL.md`.

**Caveat:** every threshold below is a provisional draft and can be changed in one place,
`frontend/src/english/logic/mastery-policy.ts`. None is scientifically calibrated. The difficulties they compare
against are author estimates (`difficulty_source: author_estimate`).

**Reproduce:** `node --import tsx scripts/mastery-scenarios.mts`, run from `frontend/`. Tests are in
`mastery-gate.test.ts`.

## What is kept apart

| | What it is | Where it comes from | Changed here? |
|---|---|---|---|
| **Estimated ability** | mean ± sd from every answer, old and new | the Learner Vector (engine) | No: no maths changed, no answer altered |
| **Demonstrated performance** ("shown") | the engine demonstrates level L **and** the C′ gate passes | engine + `mastery.ts` | Yes: the gate is new |
| **Verified mastery** | shown, with the evidence behind it on educator-approved questions | `profile.ts` | Tightened (below) |

A skill can have an estimate, and even an engine level, without being called shown. In that case:
- The profile says so in words, for example: "The estimate supports about level 3, but it is not called shown yet: 0
  recent right answers at level 3 or harder…"
- The Journey tells the child: "more answers on your own at that level are needed".

## 1. C′: the evidence gate (`logic/mastery.ts`)

**Which answers it reads (qualifying answers):** first, unaided answers on fresh questions, on the skill itself, with
provenance. It never reads:
- assisted answers;
- practice-only (generated) words;
- provisional questions;
- repeated questions;
- answers straight after teaching.

**The rule.** The engine's demonstrated level L may be called shown only when:

1. **Recent answers only.** The window is the latest **6** qualifying answers after the most recent lesson or teaching
   on the skill. Older answers stay in the record and in the estimate. They no longer decide the current claim.
2. **At level.** At least **2** right answers in the window are at difficulty **≥ L − 0.25**, on different questions.
   For spelling, they must also be different words. A word already met in any earlier answer on another question
   (including with help, in practice or after a lesson) does not count as a new word.
3. **No contradiction.** No wrong answer in the window is at difficulty **≤ L − 1**.
4. **Retention is unchanged.** "Confirmed" still needs the engine's passed later check. In addition, that check must
   come at least 7 days after the **first claim the gate supported**. Without this, a claim could go from not shown to
   confirmed in one session. A later check is reported as due, or not kept, only for a level the gate supported
   when it was claimed (within the engine's retention tolerance of 0.5).

**When the gate fails, learning continues.** The plan adds an `evidence_check` with the reason written out, and the
plan trace records the gap.
- **Not enough right answers at level:** new questions from L − 0.25 to L + 1.
- **No answers since a lesson:** a fresh check in the same range.
- **One easy-question error:** a probe from that error's difficulty − 0.5 to L + 0.5.
- **Two or more easy-question errors:** practice first.

Only questions not asked before, and spelling words not met before in any answer, are used. Easy questions are never repeated to make up the
count. When no unused question is in range, the plan asks an adult and reports a content gap instead of inventing an
activity.

## 2. Dictation alone (direct spelling only)

**The change.** The engine's two-format requirement (`demonstrated_min_contexts: 2`) is unchanged in the framework
file. The app adds an optional policy field, `single_format_demonstration`, for `EN.FND.SPL.inflections` and
`EN.FND.SPL.morphological`, and only for the `typed:dictation` format. When a demonstration rests on dictation alone,
the gate requires diversity instead: right answers at level on at least **2 different words** and **2 different
spelling patterns**.

**What it does not touch:**
- Every other skill still needs two formats. A core test checks this.
- The frozen simulation does not set the field. Its output is byte-identical.

**Candidate content.** All 79 dictation words are still candidates. Spelling mastery from dictation is therefore
**provisional** even when C′ is met. "Verified" needs at least 3 independent answers, **and** 2 of the right answers at
level, on educator-approved questions.

## 3. Misconceptions (`logic/misconceptions.ts`)

**Evidence for a misconception (kept whatever happens later):**
- **suspected:** one tagged independent error;
- **supported:** errors on two or more different questions.

**Status after the last matching error:**

| Status | When |
|---|---|
| suspected / supported | nothing since points the other way |
| improving | right since, but resolution is not met (only one answer, or all on the error's day) |
| resolved below level X | right on 2 or more questions that test it, one on a later day, but fewer than 2 at difficulty ≥ X − 0.5, where X is the hardest error's difficulty |
| resolved | at least 2 later right answers on different questions (and words) that test it, at difficulty ≥ the hardest error − 0.5, at least one on a later calendar day (UTC), and no matching error since |

**Traceability.** Every finding lists the ledger decision id, question, time and difficulty of each answer behind it.
Parents never read a single error as "a pattern". Teaching priority comes only from evidence on separate questions
(support "supported") that is not yet resolved. One right answer since ("improving") keeps that priority.

## 4. Before and after (same histories, same engine)

"Before" is commit 752abbe, run in a separate worktree. "After" is this change.

| Scenario | Answers | Engine level | Before | After | Why (after) |
|---|---|---|---|---|---|
| S1: wrong before teaching, right after | 5 of 10 | 3 | shown | **shown** (provisional) | 5 right at ≥ 2.75 since the lesson |
| S2: 2 right early, then 4 wrong on easier words | 3 of 8 | 2 | shown | **developing** | only 1 recent right at ≥ 1.75 |
| S3: consistently right | 6 of 6 | 5 | shown | **shown** (provisional) | 2 right at ≥ 4.75 |
| S4: right on easy words only, wrong at harder | 4 of 6 | 3 | shown | **developing** | 0 right at ≥ 2.75 |
| S5: alternating at one level | 3 of 6 | 2.5 | shown | **shown** (provisional) | 3 right at ≥ 2.25; no wrong at ≤ 1.5 |
| S6: old error, then steady success | 6 of 8 | 3.5 | shown | **shown** (provisional) | 4 recent right at ≥ 3.25 |
| D1: dictation only, right at level on 2 patterns | 6 of 6 | 6 | developing (no engine level: one format) | **shown** (provisional) | 4 words, 2 patterns at ≥ 5.75 |
| D2: dictation only, at-level words all one pattern | 6 of 6 | 4.5 | developing | developing | 1 pattern at level; the next check asks another |
| D3: dictation only, one easy pattern | 6 of 6 | 4 | developing | developing | nothing at ≥ 3.75 |

| Scenario | Before | After |
|---|---|---|
| R1: error at 5.75, then right on 2 easy words (3.0) the next day | resolved | **resolved below level 5.75** |
| R2: error at 5.75, then right at 6.0 twice the next day | resolved | resolved |
| R3: error at 5.75, then right twice at 6.0 in the same session | resolved | **improving** (not on a later day) |
| R4: error at 3.0, then right at 3.0–3.25 the next day | resolved | resolved |

Both tables are in synthetic histories and rerun in `mastery-gate.test.ts`.

## 5. Pupil A

Pupil A's recorded journey was replayed through the new code:
- 24 placement answers, plus the 10 answered words of the older spelling check (practice-only);
- the replay is from a local copy of the export, which is not in the repository.

**Result:** the standings, mastery labels, Today and the plan are **identical** before and after. Pupil A has no
"shown" skill, so no gate applies. All 13 skills with answers are "not enough evidence yet". The older check's words
are practice-only, so they do not count as evidence of a misconception.

## 6. Limitations and open questions

- **Teaching resets the window.** "After the most recent lesson on that skill" is at skill level. A lesson on one
  spelling pattern therefore starts a new window for the whole skill: the claim waits for a fresh check, the estimate
  does not change, and the history is labelled "shown earlier". Per-pattern windows would need a further decision.
- **The level can move.** The gate tests the level the engine demonstrates now. A pupil who keeps answering right can
  see L rise, and then needs answers at the new level. An alternative would be to report the highest level the gate
  supports, which may be lower than the engine's. That is not implemented; it is open for a decision.
- **Contradictions linger.** A contradiction stays until 6 newer qualifying answers replace it.
- **Calendar days are UTC.** The record does not hold the pupil's time zone.
- **The thresholds are drafts.** These are 6, 0.25, 2, 1, 0.5, the diversity of 2 words and 2 patterns, and
  L + 1 for the check range. They need educator review and real answers.
- **No real device testing.** Nothing here was tested on a real Android phone or in the Codespace. The browser tests
  use Chromium at phone size, locally and in CI.
