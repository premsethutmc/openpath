# 2. Cohort definitions (pre-registered)

## Cohort A: known misconceptions (primary, 300 journeys)

The S1 profiles S001–S006 at `1.0.0`, unchanged, with the S1 instruction-response model:
- an explanation is understood from its visible title, or failing that its text;
- a misconception-specific explanation can reduce exactly that misconception.

The S1 tests still pass, and the committed S1 traces still reproduce exactly. The S2 extensions add no random draw for profiles that do not use them.

## Cohort B: unrecognised misconceptions (blinded, 120 journeys)

`profiles/S00xB.json` are the same six learners with two changes.

**1. Their errors are ones OpenPath's teaching taxonomy does not represent.** Each catalogued misconception is replaced, at the same strength, by an error at the same step:

| Catalogued (A) | Unrecognised (B) | Error |
|---|---|---|
| first-term-only, bracket-sign | **bracket-add** | 5(x − 4) → 5x + 1 (adds k + s) |
| only-one-side, x-sign-kept, number-sign-kept | **coefficient-dropped** | 7x + 15 = 3x + 35 → x + 15 = 35 |
| added-not-subtracted, divided-first, inverse-operation | **reversed-subtraction** | 2x + 5 = 17 → 2x = 5 − 17 |
| forgot-divide | **negate-on-divide** | 3x = 12 → x = −4 |
| divide-wrong-way, model-swap, model-sign | unchanged | (already outside OpenPath's teaching) |

**2. A neutral learning response (`learningModel: content-features`).**
- The title and words of an explanation are never recognised.
- What an explanation is about is read only from the kind of equations its visible worked lines go through.
- Any explanation of a kind can reduce that kind's misconceptions, all equally. No explanation is targeted.
- Instruction outcomes are still drawn from the same full / partial / none probabilities.

## Cohort C: negative controls (80 journeys)

Derived from S003's style. Their parameters are fixed in `profiles/C0x.json`.

| Id | Control | What any mastery claim means |
|---|---|---|
| C01 | **No learning despite instruction.** Instruction outcome is always none; practice changes nothing; catalogued misconceptions | any claim beyond its starting competence is false |
| C02 | **Guessing without understanding.** Every answer is a guess; no skill; no learning | any demonstration is accidental |
| C03 | **Temporary learning followed by forgetting.** Instruction always succeeds, but all of it is fragile (half-life 1 day) and never consolidates | delayed checks should fail; recovery should not be lasting |
| C04 | **Misleading early success.** Starts with high but entirely fragile knowledge (rehearsed answers) on every kind; half-life 1.5 days; no consolidation | early independent success is not competence |

## Synthetic assumptions

All parameters are synthetic and configurable. None is an empirical student statistic, and none was tuned against OpenPath's results. The cohort B mapping and the cohort C controls were defined before any final run.
