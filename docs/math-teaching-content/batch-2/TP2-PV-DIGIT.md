# TP2-PV-DIGIT: The value of a digit, and how many tens

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.number.place-value-tens` (Compose tens and ones, grade 1), family `aadigit` (The value of a digit in a two-digit number).

**Skill.** Give the value of a digit in a two-digit number, and the number of tens.

## Prerequisites

- counting in tens
- a two-digit number is tens and ones
- Graph: MATH.number.compare-numbers (mandatory)

## Explanation

A digit is worth different amounts in different places. In a two-digit number the first digit counts tens and the second counts ones.
'The value of a digit' is how much it is worth (a tens digit is worth that many tens); 'how many tens' is just the count. The same digit answers the two questions differently.

Visual: `{"type":"blocks","hundreds":0,"tens":1,"ones":8}`. Reuses the family's own base-ten blocks figure.

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:aadigit:18,0`** — In 18, what is the value of the digit 1?

1. 18 = 1 ten and 8 ones
1. the 1 is in the tens place: 1 ten = 10

Answer **10**. (The family's own step text: In 18, the first digit is in the tens place.; So the answer is 10..)

**`gen:aadigit:56,1`** — How many tens are there in 56?

1. 56 = 5 tens and 6 ones
1. 5 tens

Answer **5**. (The family's own step text: In 56, the first digit is in the tens place.; So the answer is 5..)

## Hints (graded, per worked example)

For `gen:aadigit:18,0`:

1. Which place is the digit in?
2. Tens place: it counts tens; ones place: it counts ones.
3. Its value is how much it is worth: tens digit × 10, ones digit as it is.

For `gen:aadigit:56,1`:

1. Write the number in a Tens | Ones chart.
2. The first digit is how many tens.
3. The question asks for the COUNT of tens, not their value.

## Alternative explanation: Bundles of ten sticks

Bundle sticks in tens. The first digit tells how many bundles; each bundle is worth 10.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Expanded form**: 18 = 10 + 8 → 10

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: none: no working contract.

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:aadigit:42,0`: In 42, what is the value of the digit 4? | value of the tens digit — face-value gives the digit | 40 | 4 → TARGET modelled error face-value (conceptual): suspected on one answer; 2 → other modelled error wrong-digit (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:aadigit:34,1`: How many tens are there in 34? | how many tens — value-not-count gives the value; a learner who always answers 'the digit' is right here and wrong above | 3 | 30 → TARGET modelled error value-not-count (conceptual): suspected on one answer; 4 → other modelled error wrong-digit (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:aadigit:91,2`: In 91, what is the value of the digit 1? | value of the ones digit — times-ten over-applies the tens rule | 1 | 10 → other modelled error times-ten (conceptual): suspected on one answer; 90 → other modelled error wrong-digit (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:aadigit:95,0`: In 95, what is the value of the digit 9? | value of the tens digit, another number — a second value item, so face-value rests on two answers | 90 | 9 → TARGET modelled error face-value (conceptual): suspected on one answer; 5 → other modelled error wrong-digit (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

### What each response pattern supports

| Answers on the diagnostic items (in order) | Supports | Leaves uncertain | Establishes? |
|---|---|---|---|
| 4 (bug:face-value); 3 (correct); 1 (correct); 9 (bug:face-value) | face-value on both value items while 'how many tens' and the ones digit are right | the word 'value' may be what is unknown rather than place value; fix_face_value teaches both (the chart and the word), so either cause is served | yes |
| 4 (bug:face-value); 3 (correct); 1 (correct); 90 (correct) | one face-value answer: suspected only | a slip, the word 'value', or place value | **no** |
| 40 (correct); 30 (bug:value-not-count); 1 (correct); 90 (correct) | value-not-count once | a question-reading difference; suspected only | **no** |
| 4 (bug:face-value); 30 (bug:value-not-count); 1 (correct); 9 (bug:face-value) | the two questions are answered the other way round | the place idea may be fine (both numbers are known): a vocabulary swap; teach the two questions side by side, do NOT establish face-value | **no** |
| 40 (correct); 3 (correct); 10 (bug:times-ten); 90 (correct) | times-ten: the tens rule applied to the ones digit, once | suspected only | **no** |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `face-value` (conceptual) — the digit given instead of its value

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "In 49, what is the value of the digit 4?", one wrong answer is 4.
> The digit itself was given. The 4 is in the tens place, so it stands for 4 tens, which is 40.
> A digit in the tens place is worth that many TENS, not ones.
> Not 4, but 40.

Check: 49 is 4 tens and 9 ones = 40 + 9.

Solved correctly:

1. 49 = 4 tens and 9 ones
1. the 4 is in the tens place: 4 tens = 40

Example `gen:aadigit:49,0`; guided `gen:aadigit:69,0:mc`; fresh check `gen:aadigit:83,0:mc`.

### `value-not-count` (conceptual) — the value given when the count of tens is asked

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "How many tens are there in 75?", one wrong answer is 70.
> The value of the tens was given (70). The question asks how many tens: 7.
> 'How many tens' asks for a count of bundles, not their value.
> Not 70, but 7.

Check: 75 has 7 bundles of ten; together they are worth 70.

Solved correctly:

1. 75 = 7 tens and 5 ones
1. 7 tens

Example `gen:aadigit:75,1`; guided `gen:aadigit:82,1`; fresh check `gen:aadigit:68,1:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:aadigit:13,1:mc`, `gen:aadigit:26,1:mc`, `gen:aadigit:43,1`
- Rechecks after teaching: `gen:aadigit:39,0:mc`, `gen:aadigit:28,1:mc`
- Transfer (everyday form): `gen:aadigit:31,0:w`, `gen:aadigit:37,0:w`
- Delayed checks: `gen:aadigit:74,0`, `gen:aadigit:92,1:mc`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Give the value of a digit in a two-digit number, and the number of tens.
- **Generator:** `aadigit` — aadigit, all three forms (params[1] = 0 value of the tens digit, 1 how many tens, 2 value of the ones digit); numbers with two equal digits excluded (the question would be ambiguous).
- **Trigger** `aadigit_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_face_value`: verified-misconception 'face-value' (two matching answers, misconception-evidence@1) AND a response pattern below with establishes = true; patterns with competing explanations must not establish it
- **Trigger** `fix_value_not_count`: verified-misconception 'value-not-count' (two matching answers, misconception-evidence@1) AND a response pattern below with establishes = true; patterns with competing explanations must not establish it
- **Trigger** `bundles`: existing explanation reused: tens as bundles (general)
- **Trigger** `spot_the_mistake`: existing explanation reused: count-blocks
- **Allowed methods:** the oracle's method (worked lines); Expanded form
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:aadigit:39,0:mc`, `gen:aadigit:28,1:mc`
- **Retention target:** MATH.number.place-value-tens / `aadigit`, cases: value of the tens digit; how many tens. Candidates: `gen:aadigit:74,0`, `gen:aadigit:92,1:mc`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** none: no method evidence can be recorded; a correct answer never implies the method
- **Ungradable / text-only:** none
- **Reused existing explanations:** `bundles` (tens as bundles (general)); `spot_the_mistake` (count-blocks)

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `aadigit_concept` | **not checked**: outside the module's teaching scope (ineligible today) | 4/4 sections checked, no violations | yes | yes | — |
| `fix_face_value` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | face-value |
| `fix_value_not_count` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | value-not-count |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b01.ts:1691 aadigit: teach idea/method, alternative chart, figure blocks; bugs face-value, value-not-count, times-ten, wrong-digit

## Uncertainties

- place-value-tens' existing spot_the_mistake addresses count-blocks (seed aatens); nothing covers face-value.

## Validation: 21/21 items pass; whole-pool oracle + alternatives agreement 234/234
