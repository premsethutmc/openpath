# TP2-REG-TIME: Adding durations: 60 minutes make an hour

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.measurement.time-unit-conversion` (Convert between hours, minutes and seconds, grades 3–5), family `addur` (Adding durations and changing seconds into minutes and seconds).

**Skill.** Add two durations in hours and minutes, regrouping 60 minutes as 1 hour.

## Prerequisites

- 1 hour = 60 minutes
- adding two-digit numbers
- Graph: MATH.measurement.clock (plausible), MATH.number.multiplication-tables (plausible), MATH.measurement.elapsed-time (support)

## Explanation

A bigger unit is made of a fixed number of smaller units. When the small units reach that number, make one big unit from them and keep the rest as small units.
60 minutes make 1 hour, so when the minutes of a duration add up to 60 or more, 60 of them become 1 hour.

Visual: `{"type":"numberline","from":0,"to":120,"marks":[45,100,60],"note":"45 + 55 minutes passes 60: one hour"}`. Reuses the numberline visual (0–120 minutes, a mark at 60). A clock-face 'past the hour' visual exists (clock) but shows times, not durations.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:addur:0,57`** — A bus ride takes 4 h 45 min and a train ride after it takes 1 h 55 min. How long is the whole journey? Write the answer as (hours, minutes).

1. Minutes: 45 + 55 = 100 = 60 + 40: 60 minutes make 1 hour
1. Hours: 4 + 1 + 1 = 6
1. (6, 40)

Answer **(6, 40)**. (The family's own step text: 45 + 55 = 100, which is 1 and 40 more; 4 + 1 + 1 carried = 6.)

## Hints (graded, per worked example)

For `gen:addur:0,57`:

1. Add the minutes first.
2. 45 + 55 minutes: is that 60 or more?
3. Take 60 minutes out as 1 hour and add it to the hours.

## Alternative explanation: Like carrying, but at an hour

It works like carrying in addition, but you carry when the minutes make a whole hour, not when they make ten.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Change everything to minutes, then back**: 4 h 45 min = 285 min; 1 h 55 min = 115 min; together 400 min → 400 = 6 × 60 + 40: (6, 40)

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract (answer-level evidence only).

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:addur:0,27`: A bus ride takes 4 h 50 min and a train ride after it takes 1 h 55 min. How long is the whole journey? Write the answer as (hours, minutes). | minutes add to 100 or more — no-carry keeps 100+ minutes; regrouping at 100 instead of 60 (hour-as-100, unmodelled here) would give (h + 1, minutes − 100), a different answer, so the two beliefs are separated | (6, 45) | (5, 105) → TARGET modelled error no-carry (conceptual): suspected on one answer; (6, 105) → other modelled error carry-kept (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `no-carry` (conceptual) — the minutes are not regrouped into hours

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "A bus ride takes 4 h 40 min and a train ride after it takes 4 h 35 min. How long is the whole journey? Write the answer as (hours, minutes).", one wrong answer is (8, 75).
> The minutes came to 75, but 60 of them make one hour.
> 60 minutes always make 1 hour, so the minutes part of a duration stays below 60.
> Not (8, 75), but (9, 15).

Check in minutes: 280 + 275 = 555 minutes = 9 × 60 + 15, so 9 h 15 min. An answer with 75 minutes still holds a whole hour inside the minutes.

Solved correctly:

1. Minutes: 40 + 35 = 75 = 60 + 15: 60 minutes make 1 hour
1. Hours: 4 + 4 + 1 = 9
1. (9, 15)

Example `gen:addur:0,84`; guided `gen:addur:0,35:mc`; fresh check `gen:addur:0,92`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:addur:0,36:mc`, `gen:addur:0,97`, `gen:addur:0,37:mc`
- Rechecks after teaching: `gen:addur:0,44:mc`, `gen:addur:0,87`
- Transfer (everyday form): `gen:addur:0,95:w`, `gen:addur:0,23:w`
- Delayed checks: `gen:addur:0,91:mc`, `gen:addur:0,26`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Add two durations in hours and minutes, regrouping 60 minutes as 1 hour.
- **Generator:** `addur` — addur with params[0] = 0 (adding two durations in h and min); diagnostics, rechecks and delayed checks need minutes that add to 60 or more (the no-carry error is possible).
- **Trigger** `addur_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_no_carry`: verified-misconception 'no-carry' (two matching answers, misconception-evidence@1) — **UNREACHABLE today**: the diagnosis reader reads this wrong answer as "unreadable": unreachable until fixed (05)
- **Trigger** `spot_the_mistake`: existing explanation reused: hour-as-100 (an hour taken as 100 minutes)
- **Trigger** `clock_round`: existing explanation reused: the 60-minute hour (general)
- **Allowed methods:** the oracle's method (worked lines); Change everything to minutes, then back
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:addur:0,44:mc`, `gen:addur:0,87`
- **Retention target:** MATH.measurement.time-unit-conversion / `addur`, cases: minutes add to 100 or more. Candidates: `gen:addur:0,91:mc`, `gen:addur:0,26`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** `spot_the_mistake` (hour-as-100 (an hour taken as 100 minutes)); `clock_round` (the 60-minute hour (general))

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `addur_concept` | **not checked**: outside the module's teaching scope (ineligible today) | 3/3 sections checked, no violations | yes | yes | — |
| `fix_no_carry` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | no-carry |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b04.ts:2140 addur: teach idea/method, alternative like_carrying; bugs no-carry, carry-kept, small-unit-left-out

## Uncertainties

- The existing spot_the_mistake of MATH.measurement.time-unit-conversion addresses hour-as-100 (seed adhmin); this package adds no-carry only.
- no-carry: the platform's diagnosis reader (reasoning.ts probeReading) reads the predicted wrong answer "(8, 75)" on gen:addur:0,84 as "unreadable", so this misconception can NEVER be established and fix_no_carry can never be triggered until the reader handles this answer type (Codex)
- rechecks: no usable check item for case "minutes add to 100 or more" (another case's item stands in)
- delayed checks: no usable retention item for case "minutes add to 100 or more" (another case's item stands in)

## Validation: 14/14 items pass; whole-pool oracle + alternatives agreement 99/99
