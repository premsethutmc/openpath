# TP2-REG-MONEY: Adding rupees and paise: 100 paise make ₹1

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.measurement.money-decimals` (Read money in rupees and paise, grade 3), family `acmoneyadd` (Adding and taking away rupees and paise).

**Skill.** Add two amounts in rupees and paise, regrouping 100 paise as ₹1.

## Prerequisites

- ₹1 = 100 paise
- ₹4.50 means 4 rupees and 50 paise
- Graph: none recorded

## Explanation

A bigger unit is made of a fixed number of smaller units. When the small units reach that number, make one big unit from them and keep the rest as small units.
100 paise make ₹1, so when the paise add up to 100 or more, 100 of them become ₹1.

Visual: `{"type":"table","head":["","₹","paise"],"rows":[["",25,"90"],["+",14,"75"]]}`. Reuses the family's own ₹/paise table figure.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:acmoneyadd:25,18,14,15,0`** — ₹25.90 + ₹14.75 = ? Write the answer in rupees, like 4.50.

1. Paise: 90 + 75 = 165 = 100 + 65: 100 paise make ₹1
1. Rupees: 25 + 14 + 1 = 40
1. ₹40.65

Answer **40.65**. (The family's own step text: Paise: 90 + 75 = 165, which is ₹1 and 65 paise; Rupees: 25 + 14 + 1 carried = ₹40.)

## Hints (graded, per worked example)

For `gen:acmoneyadd:25,18,14,15,0`:

1. Add the paise first.
2. 90 + 75 paise: is that 100 or more?
3. Swap 100 paise for ₹1 and add it to the rupees.

## Alternative explanation: Notes and coins

Count the coins: when you have 100 paise in coins, swap them for a ₹1 coin.
Then count the rupees.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **All in paise**: 2590 paise + 1475 paise = 4065 paise → 4065 paise = ₹40.65 (the dot two places from the right)

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:acmoneyadd:3,7,11,13,0`: ₹3.35 + ₹11.65 = ? Write the answer in rupees, like 4.50. | paise add to 100 or more — paise-over-100 writes three paise digits; no-carry drops the regrouped rupee | 15.00 | 14.100 → TARGET modelled error paise-over-100 (conceptual): suspected on one answer; 14.00 → TARGET modelled error no-carry (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `paise-over-100` (conceptual) — 115 paise written as .115

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "₹17.95 + ₹11.25 = ? Write the answer in rupees, like 4.50.", one wrong answer is 28.120.
> The paise came to 120, which is more than 100: 100 paise make ₹1, so 120 paise is ₹1 and 20 paise.
> Paise always have two places after the dot: 100 paise or more must become rupees.
> Not 28.120, but 29.20.

Check: 120 paise = ₹1 and 20 paise, not 120 after the dot.

Solved correctly:

1. Paise: 95 + 25 = 120 = 100 + 20: 100 paise make ₹1
1. Rupees: 17 + 11 + 1 = 29
1. ₹29.20

Example `gen:acmoneyadd:17,19,11,5,0`; guided `gen:acmoneyadd:19,13,11,11,0:mc`; fresh check `gen:acmoneyadd:29,15,15,6,0`.

### `no-carry` (procedural) — the rupee made from 100 paise not carried

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "₹14.75 + ₹18.60 = ? Write the answer in rupees, like 4.50.", one wrong answer is 32.35.
> The rupee made from 100 paise was not carried to the rupees.
> The ₹1 made from 100 paise must be added to the rupees.
> Not 32.35, but 33.35.

Check: all in paise, 1475 + 1860 = 3335 paise = ₹33.35.

Solved correctly:

1. Paise: 75 + 60 = 135 = 100 + 35: 100 paise make ₹1
1. Rupees: 14 + 18 + 1 = 33
1. ₹33.35

Example `gen:acmoneyadd:14,15,18,12,0`; guided `gen:acmoneyadd:26,17,15,9,0`; fresh check `gen:acmoneyadd:16,7,20,19,0:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:acmoneyadd:17,17,19,18,0:mc`, `gen:acmoneyadd:15,14,11,7,0`, `gen:acmoneyadd:6,7,10,18,0:mc`
- Rechecks after teaching: `gen:acmoneyadd:28,9,19,11,0:mc`, `gen:acmoneyadd:2,15,7,15,0:mc`
- Transfer (everyday form): `gen:acmoneyadd:26,17,12,15,0:w`, `gen:acmoneyadd:4,18,6,15,0:w`
- Delayed checks: `gen:acmoneyadd:1,16,6,15,0:mc`, `gen:acmoneyadd:25,17,11,15,0:mc`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Add two amounts in rupees and paise, regrouping 100 paise as ₹1.
- **Generator:** `acmoneyadd` — acmoneyadd with params[4] = 0 (addition); diagnostics, rechecks and delayed checks need paise that add to 100 or more.
- **Trigger** `acmoneyadd_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_paise_over_100`: verified-misconception 'paise-over-100' (two matching answers, misconception-evidence@1) — **UNREACHABLE today**: the diagnosis reader reads this wrong answer as "other": unreachable until fixed (05)
- **Trigger** `fix_no_carry`: verified-misconception 'no-carry' (two matching answers, misconception-evidence@1) — **UNREACHABLE today**: the diagnosis reader reads this wrong answer as "other": unreachable until fixed (05)
- **Trigger** `drop_dot`: existing explanation reused: money as paise (general)
- **Allowed methods:** the oracle's method (worked lines); All in paise
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:acmoneyadd:28,9,19,11,0:mc`, `gen:acmoneyadd:2,15,7,15,0:mc`
- **Retention target:** MATH.measurement.money-decimals / `acmoneyadd`, cases: paise add to 100 or more. Candidates: `gen:acmoneyadd:1,16,6,15,0:mc`, `gen:acmoneyadd:25,17,11,15,0:mc`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** `drop_dot` (money as paise (general))

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `acmoneyadd_concept` | **not checked**: outside the module's teaching scope (ineligible today) | 3/3 sections checked, no violations | yes | yes | — |
| `fix_paise_over_100` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | paise-over-100 |
| `fix_no_carry` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | no-carry |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b03.ts:1451 acmoneyadd: teach idea/method, alternative all_paise, figure table; bugs paise-over-100, no-carry, smaller-from-larger, rupee-not-reduced

## Uncertainties

- Money-decimals' existing spot_the_mistake addresses 'wrote-together' (seed acpaise); nothing existing covers regrouping.
- paise-over-100: the platform's diagnosis reader (reasoning.ts probeReading) reads the predicted wrong answer "28.120" on gen:acmoneyadd:17,19,11,5,0 as "other", so this misconception can NEVER be established and fix_paise_over_100 can never be triggered until the reader handles this answer type (Codex)
- no-carry: the platform's diagnosis reader (reasoning.ts probeReading) reads the predicted wrong answer "32.35" on gen:acmoneyadd:14,15,18,12,0 as "other", so this misconception can NEVER be established and fix_no_carry can never be triggered until the reader handles this answer type (Codex)

## Validation: 17/17 items pass; whole-pool oracle + alternatives agreement 240/240
