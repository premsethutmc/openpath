# TP-NUM-03: Comparing decimals: place value, not length

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.number.decimal-tenths` (Represent tenths and hundredths, grade 4), family `aedecc` (Comparing a tenths decimal with a hundredths decimal).

**Skill.** Compare a tenths decimal with a hundredths decimal by place value.

## Prerequisites

- tenths and hundredths place value
- 0.7 = 0.70 (seven tenths = seventy hundredths)
- Graph: MATH.number.fraction-add-like (mandatory)

## Explanation

Decimals are compared place by place from the left: wholes, then tenths, then hundredths.
Writing both with the same number of places (put a zero at the end of the shorter one) makes them easy to compare as hundredths.

Visual: `{"type":"grid","rows":10,"cols":10,"shaded":1,"note":"hundred grid: one shaded square = 0.01; a full column = 0.1"}`. Reuses the hundred grid ({type:'grid', rows:10, cols:10, shaded:k}) of the decimal-tenths module's hundred_grid strategy; shade each number on its own grid.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:aedecc:0,5,0,1`** — Which number is greater: 0.01 or 0.5? Write the greater number.

1. Write both with two decimal places: 0.01 and 0.50
1. 0.01 is 1 hundredth; 0.50 is 50 hundredths. So 0.5 is greater

Answer **0.5**. (The family's own step text: Compare the tenths: 5 and 0. The greater number is 0.5.)

**`gen:aedecc:3,1,4,2`** — Which number is greater: 3.1 or 3.42? Write the greater number.

1. Write both with two decimal places: 3.10 and 3.42
1. 3.10 is 310 hundredths; 3.42 is 342 hundredths. So 3.42 is greater

Answer **3.42**. (The family's own step text: Compare the tenths: 1 and 4. The greater number is 3.42.)

## Hints (graded, per worked example)

For `gen:aedecc:0,5,0,1`:

1. Compare the tenths digits first.
2. Write both with two places: 0.01 and 0.50.
3. Compare 1 hundredth with 50 hundredths.

For `gen:aedecc:3,1,4,2`:

1. Compare the tenths digits first.
2. Write both with two places: 3.10 and 3.42.
3. Compare 310 hundredths with 342 hundredths.

## Alternative explanation: Number line in tenths

Mark the tenths on a number line from one whole number to the next.
Find which tenth each number is in first; only if they are in the same tenth do the hundredths decide.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Money (paise)**: ₹0.01 is 1 paisa; ₹0.50 is 50 paise → 50 paise is more, so 0.5 is greater

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: comparison answers have no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:aedecc:2,8,1,3`: Which number is greater: 2.13 or 2.8? Write the greater number. | tenths decimal is greater — longer-is-larger picks the hundredths number | 2.8 | 2.13 → TARGET modelled error longer-is-larger (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:aedecc:1,4,8,7`: Which number is greater: 1.4 or 1.87? Write the greater number. | hundredths decimal is greater — the opposite belief (shorter is larger, from 'tenths are bigger than hundredths') errs here instead | 1.87 | 1.4 → TARGET modelled error shorter-is-larger (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `longer-is-larger` (conceptual) — digits after the point read as a whole number

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Which number is greater: 2.2 or 2.01? Write the greater number.", one wrong answer is 2.01.
> 2.01 was taken as greater because it has more digits after the point. Compare the tenths first.
> More digits after the point does not mean bigger: compare the tenths first.
> Not 2.01, but 2.2.

Check with hundredths: 2.2 = 2.20, which is 220 hundredths; 2.01 is 201 hundredths. 2.2 is greater although it has fewer digits.

Solved correctly:

1. Write both with two decimal places: 2.20 and 2.01
1. 2.20 is 220 hundredths; 2.01 is 201 hundredths. So 2.2 is greater

Example `gen:aedecc:2,2,0,1`; guided `gen:aedecc:3,6,1,5`; fresh check `gen:aedecc:1,7,6,4`.

### `shorter-is-larger` (conceptual) — over-generalised 'tenths beat hundredths'

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "Which number is greater: 1.77 or 1.2? Write the greater number.", one wrong answer is 1.2.
> 1.2 was taken as greater because hundredths are small pieces; but 1.77 has more tenths (7 against 2).
> A tenths number is not always bigger than a hundredths number: compare the tenths digits.
> Not 1.2, but 1.77.

Check with hundredths: 1.77 is 177 hundredths; 1.2 = 1.20, which is only 120 hundredths.

Solved correctly:

1. Write both with two decimal places: 1.77 and 1.20
1. 1.77 is 177 hundredths; 1.20 is 120 hundredths. So 1.77 is greater

Example `gen:aedecc:1,2,7,7`; guided `gen:aedecc:3,3,8,1`; fresh check `gen:aedecc:1,1,2,9`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:aedecc:0,6,8,7`, `gen:aedecc:1,3,4,8`, `gen:aedecc:2,1,7,9`
- Rechecks after teaching: `gen:aedecc:3,4,3,8`, `gen:aedecc:2,6,7,7`
- Transfer (everyday form): `gen:aedecc:0,7,4,9:w`, `gen:aedecc:0,9,7,9:w`
- Delayed checks: `gen:aedecc:0,8,7,4`, `gen:aedecc:2,7,8,8`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Compare a tenths decimal with a hundredths decimal by place value.
- **Generator:** `aedecc` — aedecc, all items (one tenths and one hundredths decimal with the same whole part).
- **Trigger** `aedecc_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_longer_is_larger`: verified-misconception 'longer-is-larger' (two matching answers, misconception-evidence@1) — **UNREACHABLE today**: the diagnosis reader reads this wrong answer as "other": unreachable until fixed (05)
- **Trigger** `fix_shorter_is_larger`: verified-misconception 'shorter-is-larger' (two matching answers, misconception-evidence@1) — **UNREACHABLE today**: the diagnosis reader reads this wrong answer as "other": unreachable until fixed (05)
- **Allowed methods:** the oracle's method (worked lines); Money (paise)
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:aedecc:3,4,3,8`, `gen:aedecc:2,6,7,7`
- **Retention target:** MATH.number.decimal-tenths / `aedecc`, cases: tenths decimal is greater; hundredths decimal is greater. Candidates: `gen:aedecc:0,8,7,4`, `gen:aedecc:2,7,8,8`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** none

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `aedecc_concept` | **not checked**: outside the module's teaching scope (ineligible today) | 4/4 sections checked, no violations | yes | yes | — |
| `fix_longer_is_larger` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | — |
| `fix_shorter_is_larger` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | shorter-is-larger |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b05.ts:1301 aedecc: teach idea/method, alternative money; bugs longer-is-larger, shorter-is-larger
- library.v1.json MATH.number.decimal-tenths (seeded from aedec; aedecc has only a chapter screen; spot_the_mistake addresses one aedec bug)

## Uncertainties

- aedecc has no figure; the hundred grid is a proposal reusing an existing visual.
- CONTENT DEFECT (existing family text, fam/b05.ts aedecc bugs, longer-is-larger 'says'): it claims the hundredths digits 'uv' are more than the tenths digit t; this is false whenever uv ≤ t (e.g. '03 is more than 5'). The package replaces that sentence for its own screens; the family text itself is not changed here.
- The competency is 'Represent tenths'; comparison sits inside it (the family is one of its five).
- longer-is-larger: the platform's diagnosis reader (reasoning.ts probeReading) reads the predicted wrong answer "2.01" on gen:aedecc:2,2,0,1 as "other", so this misconception can NEVER be established and fix_longer_is_larger can never be triggered until the reader handles this answer type (Codex)
- shorter-is-larger: the platform's diagnosis reader (reasoning.ts probeReading) reads the predicted wrong answer "1.2" on gen:aedecc:1,2,7,7 as "other", so this misconception can NEVER be established and fix_shorter_is_larger can never be triggered until the reader handles this answer type (Codex)
- fix_longer_is_larger: the platform reads the addressed misconception from the family's verbatim 'says' text; it reads nothing here (the package overrides a defective family sentence), so the registry cannot record 'addresses: longer-is-larger' until the family text is fixed (05)

## Validation: 19/19 items pass; whole-pool oracle + alternatives agreement 300/300
