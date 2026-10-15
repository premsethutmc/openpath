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

**The rule.** A level L at or below the engine's demonstrated level may be called shown only when (since the second
round, the highest such L is reported; see §6a):

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

**Result:** the standings, mastery labels, Today and the plan are **identical** before and after (both rounds). Pupil A has no
"shown" skill, so no gate applies. All 13 skills with answers are "not enough evidence yet". The older check's words
are practice-only, so they do not count as evidence of a misconception.

## 6. Refinements (15 October, second round)

### 6a. Estimated level vs the highest level shown now

The engine still proposes its level (**estimated**). The gate is now evaluated at each candidate level at or below it,
on the engine's own half-band grid (estimate, estimate − 0.5, … down to 1). The **highest level that passes every
requirement** is reported as shown now:
- the same 6-answer window;
- independence, at-level right answers on different questions and words;
- no contradiction;
- dictation diversity.

Nothing is rounded down without that evidence: every candidate must pass on its own answers. If none passes, nothing is
shown.

The profile, diagnostics and dashboard now keep four levels apart (`CapabilityProfile.levels`):

| Level | Meaning |
|---|---|
| estimated | the engine's proposal now |
| demonstrated | the highest level the gate supports now; "shown" and `shownLevel` |
| historical | the highest level the gate supported at any earlier time; always labelled as history ("Shown earlier, at about level 5 (date); not currently shown", or "Earlier shown at about level 5 …: history, not a current result") |
| confirmed | the highest level, up to the one shown now, that the gate supported at least 7 days before the passed later check; a level first supported in the check itself is shown, not yet confirmed |

When the level shown is below the estimate, the shown level stands and the plan adds an `evidence_check` for the
estimate:
- questions at estimate − 0.25 to estimate + 1, unused, never words already met (even when the estimate's gap is a slip,
  the check stays at the higher level and never probes below the level already shown);
- priority 50, so after more pressing work;
- if no such question is left: a note, not a request to an adult, because the lower level already stands.

**What changed in the scenarios:**

| Scenario | Estimated | Before this round | Now |
|---|---|---|---|
| S4: right on easy words, wrong at harder | 3 | not shown | **shown at 2.5** (2 right at ≥ 2.25; no wrong at ≤ 1.5); 3 not yet shown |
| D2: dictation, at-level words one pattern | 4.5 | not shown | **shown at 3.5** (2 patterns at ≥ 3.25); 4.5 not yet shown |
| New: estimate 4, shown 3 (`ESTIMATE_4_SHOWN_3`) | 4 | not shown | **shown at 3**; 4 not yet shown; an evidence check at 3.75–5 is planned |
| S1, S3, S5, S6, D1 | — | shown at the engine's level | unchanged |
| S2, D3 | — | not shown | unchanged (no level passes) |

**An easy slip caps the level only as far as the approved rule says.** One wrong answer at difficulty d contradicts
levels from d + 1 up. S3 (shown at 5) followed by one wrong answer at 1.5 is shown at 2 until the slip leaves the
window. The plan probes near the slip; it does not teach.

### 6b. Lesson scope: investigation and change

**How lessons and evidence are tracked:**

| What | Granularity |
|---|---|
| Lessons | per pattern: lesson ids are `capability#step`; the teaching intervention records `capability` and `rule` (the step), including the doubling journey (`double_short`) |
| Questions | every one carries a `step` (all 2,500+ spelling items, and every grammar, vocabulary and reading item) |
| Ledger decisions and the estimate | per **capability**: the engine has no per-pattern estimate, and patterns are content tags on questions |
| "After teaching" mark | per capability and session (unchanged) |
| Relations between patterns | none explicit. The ladder gives order and band only. The only content-level link is the misconception tags that questions list |

**Change (built in round two; switched OFF in the final review, see §8):**
- **Spelling only, when switched on:** a lesson supersedes earlier answers on its own pattern and on patterns whose questions share a
  misconception tag with it, according to the content.
  - The doubling lesson reaches every doubling-related pattern: double_short, stress_doubling, no_double_unstressed,
    drop_e and exceptions.
  - "y to i", "plain", "-es" and "plain affix" share none, so they are only themselves.
- **Unchanged elsewhere:** every other skill, any lesson whose step is not a known pattern, and any answer without a
  pattern keep the whole-skill rule. Grammar steps (for example third-person -s and plural subjects) are too
  interdependent to separate without an educator's say.
- **Switch:** `LESSON_SCOPE.spellingPatternTags` in `mastery-policy.ts`. It is **off**: every lesson supersedes the
  whole skill until an educator reviews the pattern relations.
- **What it does not change:** answers in the same session after a lesson still never count (that mark is
  per capability), and nothing is erased. Superseded answers are counted in the gate (`superseded`) and remain in the
  record and the estimate.

### 6c. Calendar days

- **Storage:** every timestamp is stored and replayed as UTC (`toISOString`). Django uses `TIME_ZONE = "UTC"`. No
  pupil, account or school stores a time zone.
- **Evaluation:** `logic/calendar.ts` computes a calendar day when a rule is evaluated, in the pupil's or school's IANA
  zone when the record has one, otherwise in UTC. An invalid zone also falls back to UTC.
- **Source of the zone:** an optional `timeZone` on a `preferences` event. Each finding uses the zone **in effect at
  its last error**: the latest such event at or before that moment. A zone recorded later never re-dates earlier
  answers. The precedence policy is in §8. Every misconception finding records which
  basis was used (`days`), and its reason says "UTC days (no time zone recorded)" or "days in Asia/Kolkata".
- **Not yet done:** recording the zone (from the device, or a school setting) is a separate decision. Until then
  every record uses UTC, exactly as before.
- **Tests:** midnight in Kolkata and New York, and both London daylight-saving changes in 2026.
- **History:** no stored timestamp is rewritten.

### 6d. Safeguards (tested)

- A shown level is never "confirmed" before the delayed check.
- The evidence check for a higher level asks only unused questions at that level, never the easy words that showed
  the lower one.
- A lesson supersedes earlier answers on the whole skill (the pattern scope is off, see §8).
- A supported misconception does not remove a level that other answers support; it is reported beside it.
- Pupil A is unchanged: same standings, labels, Today and plan.

## 7. Limitations and open questions

- **Teaching scope is whole-skill.** A lesson on one spelling pattern sets aside earlier answers on every pattern of
  that skill until a fresh check. The narrower scope is built but off (§8).
- **The level follows the estimate down.** The gate tests candidates at or below the engine's current proposal. §8
  shows this only happens after wrong answers at or near the level, where the cap is justified.
- **One slip can cap the level well below history** (see 6a) until it leaves the 6-answer window or newer answers
  replace it. This is the approved contradiction rule applied at every candidate level.
- **Contradictions linger.** A contradiction stays until 6 newer qualifying answers replace it.
- **Calendar days are UTC** until a time zone is recorded (see 6c).
- **The thresholds are drafts.** These are 6, 0.25, 2, 1, 0.5, the diversity of 2 words and 2 patterns, the L + 1
  check range, the 0.5 grid and priority 50. They need educator review and real answers.
- **No real device testing.** Nothing here was tested on a real Android phone or in the Codespace. The browser tests
  use Chromium at phone size, locally and in CI.

## 8. Final bounded review (15 October)

| # | Issue | Severity | Evidence | Decision |
|---|---|---|---|---|
| 1a | Can a falling estimate suppress a level that valid, recent, independent evidence still supports? | Low, no change | **Time passing:** the engine's demonstrated level is not inflated over time. **Errors far above the level:** three wrong at 6.25–6.5 leave the estimate at 4.5 and the shown level at 3.5. **Estimate falls:** only after wrong answers at or near the level. Three wrong at exactly 3.5 after showing 3.5 bring the estimate to 3, and 3 is shown. The gate alone would still allow 3.5: it has no "wrong at the level" test, only contradictions at ≤ L − 1 | Keep the estimate as the ceiling. It is the only part that weighs failures at the level. 3.5 is kept as history ("Earlier shown at about level 3.5 …") |
| 1b | Earlier evidence too old for a current claim | Medium, **fixed** | Shown at 3.5 against an estimate of 4.5. Thirty days later the engine's check is overdue. "Check due" needed a gate-supported level within 0.5 of the engine's retained 4.5, so the pupil read "developing", and the history line wrongly said the recent evidence no longer supports it | "Check due" is now reported whenever the gate supported any level before (the check is due either way). "Not kept" keeps the tolerance, because the engine judges the failed check at its own retained level. No level is reported as current while the check is overdue |
| 1c | Newer answers displace older evidence | None | Six newer right answers on easy words push the at-level answers out of the window. Shown now drops to the level the recent answers support (1.5), with 3.5 as history and a check planned at the estimate | Working as designed |
| 2 | Are shared misconception tags enough to reset evidence across spelling patterns? | Medium, **switched off** | The tags are error labels authored on candidate, unreviewed questions. They were not designed as relations between patterns. They link patterns through a handful of distractors: the doubling lesson reaches drop_e only because 5 drop-e questions and 8 double-short questions list an over-doubling error such as "writting" or "jumpping". "Jumpping" is a double-short distractor, though "jump" is not a double-short word. Absence of a tag does not show two patterns are independent. No educator has reviewed any of it | `LESSON_SCOPE.spellingPatternTags = false`. Every lesson supersedes the whole skill (the conservative rule). The code, the switch and its tests (run with the switch on) are kept for educator review |
| 3a | Time-zone precedence | Policy, part built | No zone is stored anywhere today. Timestamps are UTC (`toISOString`; Django `TIME_ZONE = "UTC"`) | **Recommended precedence:** (1) a school time zone set by the school's administrator, then (2) a pupil time zone set by the guardian in settings, then (3) UTC. **Never** the current device location, and never inferred after the fact. Each zone is recorded as a dated event and applies only from then on. **Built:** the zone in effect at each finding's last error is used, so a zone recorded later never re-dates earlier answers, and replay is deterministic. **Not built:** writing a zone, and a school setting. Both need a decision |
| 3b | Can a later calendar day stand in for the 7-day retention interval? | None (verified) | Calendar days are used only by misconception resolution. Retention is the engine's day count. "Confirmed" uses a 6.5-day minimum between the first supported claim and the passed check. A test shows a pupil right again the next calendar day (UTC, Kolkata, New York) stays "shown", never "confirmed" | No change |

**Unresolved educational assumptions (for educator review, not tuning):**
- **Difficulty estimates:** question difficulties are author estimates; none is calibrated.
- **Draft thresholds:** the window of 6; at level = L − 0.25; 2 right at level; contradiction at ≤ L − 1; resolution
  at the hardest error − 0.5 with a later day; dictation diversity of 2 words on 2 patterns; the 0.5 level grid.
- **Pattern relations:** whether a lesson on one spelling pattern bears on another (§6b).
- **Easy slips:** whether a single easy slip should cap the current level as far as the contradiction rule does.
- **Failures at the level:** whether wrong answers at the level should be an explicit gate condition, rather than
  acting only through the engine's estimate.

**Pupil A:** replay unchanged. Pupil A has no skill with an engine level, so none of these rules applies.
