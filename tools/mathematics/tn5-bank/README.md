# Tamil Nadu Grade 5 verified bank: T0 results

Release `tn-samacheer-mathematics-grade-5`. Rebuild: `node --import tsx tools/mathematics/tn5-bank/build-bank.mts out`
(writes `bank.jsonl`, about 68 MB, not committed; `results/manifest.json` carries its SHA-256).

| Check | Result |
|---|---|
| Families / released problems | 192 / 60,774 (the earlier 194 / 61,025 included `aatens` and `mul`, which serve competencies outside this release; excluded) |
| Requirements mapped to at least one family | 61 of 61 (0 unmapped), `results/coverage.json` |
| Determinism | two builds, identical SHA-256 `7c1ae862e18db9ea…` |
| Labels (exactly one per item) | T0: kernel-verified 19,144 (31.5%), partial 19,208, answer-verified 22,422, unverified 0. After the T1 pilot: 21,157 (34.8%) / 20,115 / 19,502 / 0 |
| Unchecked (family, step) pairs still to close for 100% | 209 at T0; 197 after the T1 pilot (54,299 step instances left, from 60,352) |
| Depth shortfalls (< 30 items in a band) | 4, listed in `results/manifest.json` |

Soundness guard (same branch): a justification counts as a check only if the step's stated value matches an independent
computation. Corrupting stated values is always caught (9,370 of 9,370 op-based steps; every justification kind has a
pass and a fail test in `packages/learning/src/kernel-soundness.test.ts`). Package tests: 404 pass, 0 fail.

Not done yet: acceptance tests 5 (500 injected wrong answers), 6 (100% step verification), 7 (10,000-item SymPy
re-check), 8 (depth), 9 (journeys), 10 (full re-census against the PR #69 baseline), 11.

## T1 pilot: per-step typed claims (`packages/learning/src/step-claims.ts`)
A claim says, for one (family, step) pair, what the stated value must equal, computed exactly from the step's own
inputs. Pilot on three step types: HCF, LCM and rounding (13 pairs; 4 small claim functions).

- Result: 12 pairs closed (one, `aglcm/lcm`, has no such steps), 6,053 step instances, 2,013 more items fully
  checked. Zero mismatches: every stated value agreed with the independent computation. No family had a wrong step.
- Corruption: every claim is tested with corrupted values (+1, −1, ×2+3, non-numeric); all are rejected.
- The generic equivalence checker from the proposal does not fit: steps carry (op, inputs, value), not before/after.
  The same op also means different things in different families (`add` is a lattice digit in one, a clock time in
  another), so a claim is keyed by (family, step), not by op.
- What is left (197 pairs, 54,299 instances): about 103 pairs (30,478 instances) are computable from the step's inputs
  (add, subtract, regroup, convert, compare, order, estimate …), about 46 (14,517) read a picture or a definition
  (read, count, classify, place), and about 48 (9,304) are one-off step names.

## Phase 1 (arithmetic, units, place value, rounding, comparison): 41 pairs, four parallel agents
Claims live in `packages/learning/src/claims/` (four files + tests); the probe `claim-probe.mts` and the corruption
tool `claim-mutation.mts` reproduce the numbers below.

| | Before Phase 1 | After |
|---|---:|---:|
| Items fully machine-checked | 21,157 (34.8%) | 29,591 (48.7%) |
| Partly checked / answer-verified only | 20,115 / 19,502 | 17,278 / 13,905 |
| Unchecked (family, step) pairs | 197 | 156 |
| Unchecked steps | 54,299 | 41,271 |

- All 41 pairs: every released step confirmed (20,213 steps in all claims), 0 mismatches, 0 unreadable. No family defect found.
- Corruption: 78,722 corrupted values across every claim-checked step; 0 genuine corruptions confirmed (111 were a
  palindromic list reordered with a space, i.e. the same list).
- Bank rebuilt twice: identical SHA-256 `73a759dca087a158…`. Tests: 489 pass, 0 fail.

## Phase 2 (units, fractions, patterns, factors, number properties, arithmetic leftovers): 99 pairs, five parallel agents
| | Before Phase 2 | After |
|---|---:|---:|
| Items fully machine-checked | 29,591 (48.7%) | **48,525 (79.8%)** |
| Partly checked / answer-verified only | 17,278 / 13,905 | 6,491 / 5,758 |
| Unchecked (family, step) pairs | 156 | 60 (42 families) |
| Unchecked steps | 41,271 | 15,771 |

- Every claim confirms every readable released step: 48,313 steps, 0 mismatches. No family defect found in Phase 2.
- Corruption: 182,608 corrupted values; 0 genuine corruptions confirmed (the same 111 whitespace-only list rewrites).
- Left unchecked by design: the first step of each `acmissing` family states a family-internal code (equation form), not a result.
- Bank rebuilt twice: identical SHA-256 `455174e8aa2e1fb6…`. Tests: 702 pass, 0 fail.

### Checks that rest on a convention rather than pure mathematics (owner to review)
- `aechk/estimate`: "a reasonable estimate" is within 30% of a rounded estimate.
- `acstory/choose operation`, `acstory4/…`, `acstory9/…`: the operation is read from fixed template wording; the numeric code (add 0, take away 1, multiply 2, share 3) is the families' own convention.
- `aabig/compare sizes`: a fixed common-sense size order of everyday objects.
- `avfwq/evaluate`: compares a floating-point stated value with a tolerance of 1e-9.

## Phase 3 (picture- and table-based steps): 59 pairs, four parallel agents
| | Before Phase 3 | After |
|---|---:|---:|
| Items fully machine-checked | 48,525 (79.8%) | **60,374 (99.3%)** |
| Partly checked / answer-verified only | 6,491 / 5,758 | 400 / 0 |
| Unchecked (family, step) pairs | 60 | 3 |
| Unchecked steps | 15,771 | 400 |

- Every claim confirms every readable released step: 63,893 steps, 0 mismatches. No family defect found in Phase 3.
- Corruption: 239,967 corrupted values; 0 genuine corruptions confirmed (the same 111 whitespace-only list rewrites).
- Bank rebuilt twice: identical SHA-256 `fce8fa3abffc7fa3…`. Tests: 933 pass, 0 fail.
- Still unchecked: the first step of each `acmissing` family (`subtract`, `add`, `divide`, 400 steps). It states which
  operation solves the equation, as a family-internal code. Candidate for the reviewed allowlist or a convention claim.

### How strong is each check? (the 60,374 are not all equally strong; the owner reviews the weaker kinds)
Every claim is labelled in `packages/learning/src/claims/*` (`BASIS`) and counted in `results/manifest.json` (`weakerBasis`).
- **Prompt-independent**: the facts come from the question text or its parameters. The strongest kind.
- **Figure-consistent**: the only source of the facts is the data of the picture the family itself emitted (bar heights,
  tallies, clock hands, seating plans). It proves the step agrees with the displayed picture, not that the picture is
  correct. 9,311 steps in 6,846 items.
- **Convention**: the check rests on a rule, not pure mathematics (see the Phase 2 list). 1,993 steps in 1,993 items.

## Acceptance test 10: re-census of all 341,483 problems against the PR #69 baseline
Worse than before: **0**. Better: 41,230. Same: 300,253 (`results/recensus.json`). Now: kernel-verified 107,136, partial
58,589, answer-verified 175,758. The soundness fix had first demoted 295 problems outside Grade 5 (families `adfname`,
`apcartn`) whose stated values had never been checked; they now have real claims (`claims/n-other-grades.ts`) and are
verified again, so no problem anywhere is labelled worse than before.

## Step verification: 100% (acceptance test 6)
All 60,774 Grade 5 items are fully machine-checked: 0 unchecked steps, 0 unchecked (family, step) pairs. The last
400 steps (the first step of the three `acmissing` families) now have a claim: the operation that undoes the
equation, plus the family's own 0..3 form code.
- Bank rebuilt twice: identical SHA-256 `45df5279f265ffd2…`. Tests: 935 pass, 0 fail.
- Corruption: 242,640 corrupted values; 0 genuine corruptions confirmed (the same 111 whitespace-only list rewrites).
- Re-census of all 341,483 problems: worse 0, better 41,630 (`results/recensus.json`).
- Strength (per item, in the bank): 6,846 items include a figure-consistent step (9,311 steps) and 2,393 include a
  convention step (2,793 steps). The owner accepted these on 25 Oct 2026 and will fix them from real usage.

## Depth (acceptance test 8)
Four shortfalls closed by adding variants to `adfcol`, `affrac`, `agspd` and `aisolid` (569 new items); no existing item
changed (only the family fingerprint of those four families, because their specification changed). Every competency now
has at least 30 items in each of the three difficulty bands. Bank: 61,343 items, all kernel-verified, 0 unchecked steps,
rebuilt twice with identical SHA-256 `e24392f643ee4982…`. Re-census of 342,052 problems: worse 0, new items not
kernel-verified 0.

## Serving layer and ten learner journeys (acceptance tests 11 and 9)
`packages/learning/src/bank-serve.ts` (+ `bank-serve.test.ts`): `loadBank(releaseId)` (the release's families' pools, same
selection as `build-bank.mts`, families by id then pool order) and `requestItem(bank, request, log)`. A request is
`{competency?, difficulty?, excludeIds?, phase?, format?}` (`format`: choice or typed; also `topic`, `freeText`). The item
served is the first that fits, from the family the learner has met least (varied evidence). Nothing is generated or solved.
When it cannot serve, it returns `{ok:false, kind, reason}` in plain language and appends `{at, kind, request, reason}` to a
missed-item log (`memoryMissedLog(clock)`, an `append` interface; `jsonlFileSink` / `writeMissedLog` write JSONL). The clock
is injected. The log keeps no learner text (free text: its length only), a topic only if it looks like a short label, and ids
only as a count. Failure kinds, each tested for message and log entry: `unknown-competency`, `outside-release`,
`no-items-for-skill`, `band-exhausted` (names the levels that still have items, or suggests a teacher or parent),
`free-text`, `unsupported-topic`, `bad-request`.

`packages/learning/src/bank-journeys.ts` (+ `bank-journeys.test.ts`, `run-journeys.mts` -> `results/journeys.json`): ten seeded
journeys of pseudonymous learners (`learner-01` .. `learner-10`), items only through `requestItem`. The learner is modelled by
the existing engine (records -> `learnerState` -> `evidence.ts` statuses, `plan.ts` next activity, `intervention.ts`
strategy order, `reasoning.ts` diagnosis); the harness adds only the script and the clock. Simulated learners test system
behaviour only, never educational effectiveness. A mastery claim is the engine's status `verified`; because shipped content is
provisional, it is reachable only with the test-only review fixture (switched on for the run; journey 1 shows the same records
without it are not a claim). 100 journey checks pass, 0 fail; the run is byte-identical on a second run.

| # | Journey | What it proved |
|---|---|---|
| 1 | Steady correct | Shown on own after varied answers but not a claim; delayed check scheduled 7+ days later and asked by the plan when due; `verified` only after it passes. Control: a skill with one answer format passes the delayed check and is still not verified |
| 2 | Recurring wrong answer | Same written misunderstanding on 3 different problems; `reasoning.ts` establishes it only after it recurs and leads to teaching; teaching, a guided item, fresh checks: shown on own; no claim yet |
| 3 | Watches and reads only | Teaching blocks and viewed items, zero attempts: `exposure`, no delayed check, still `exposure` after 90 days |
| 4 | One lucky answer | `guided`, no independent success, no delayed check; further wrong answers keep it so |
| 5 | Fails the delayed check | `retention=failed`, status `review`, plan routes back to it |
| 6 | Guessing on multiple choice | No claim; over 24 seeded guessers none is a claim (7 reach "shown on own" by chance) |
| 7 | High ability, difficulty 3 | Every question difficulty 3, no teaching needed; verified after the delayed check |
| 8 | Struggling, difficulty 1 | Every question difficulty 1, teaching after repeated misses, bank never ran dry, no claim |
| 9 | Two skills interleaved | Evidence counted per skill; plan asks the due delayed check first; passing one does not verify the other |
| 10 | Exhausts a band | Band served in full once each, then a clear failure naming the other levels, logged; next level serves. A whole kind of question served in full, then a clear failure suggesting a teacher or parent |

### What did not behave as the product rules want (reported, not papered over)
- **Single-format skills cannot be verified from the bank.** The shared engine needs two answer formats; 28 of 57 Grade 5
  skills have one answer type in the bank (the multiple-choice and everyday-situation forms of those families are not in it).
  Their delayed check can pass while the status stays short of verified.
- **A failed delayed check is permanent.** `skillEvidence` fails the check for good on any wrong retention answer after the
  due time, so after relearning no later delayed check can pass (journey 5 stays `review`). The rule "returns for review"
  holds; a way back does not exist.
- **Chance can show a skill "on their own".** Two lucky distinct right answers (the last right) give `independent`
  (7 of 24 seeded guessers). Only verification (two formats and a passed delayed check) resisted it.
- The engine has no difficulty bands; the band to ask for is part of each script.

## Acceptance tests 5 and 7: answer independence and independent re-check
Run (bank size is read live, not fixed): `node --import tsx answer-consistency.mts`, `... answer-injection.mts`, then
`PYTHONPATH=/home/claude/vendor/sympy:/home/claude/vendor/mpmath python3 answer-recheck.py <out>/bank.jsonl` (SymPy 1.14.0
offline copy; `bank.jsonl` from `build-bank.mts`). All three are deterministic; results in `results/answer-*.json`.
Measured on 61,343 items (the bank after the variants added during this work).

**5a, answer vs step chain** (`answer-consistency.mts`). Per answer type "equal" means: same exact rational (integer,
fraction, exact, mixed), same ordered list (tuple) or set, same option text/index (choice), same text (symbolic answers).
Verdicts: the last step states the whole answer 49,896 (81.3%); an earlier step does 453; 50,349 decided in all.
Weak, not counted as decided: every part of a tuple/mixed answer is stated by some step but order-blind (3,165), only one
part is stated (1,434). Cannot be decided from the chain: 6,395 (10.4%), because the last steps are digit- or part-level
(column add/subtract, `acmoneyadd`, `agrupee`, `fadd`) or the answer is a verdict not a number. 159 of 192 families are fully decided; 17
families have no decided item (`abmove abseat addr aeadd3 aeconvu aedivm aeel24 aemix aemulm aet12 aet24 aetrans agfac
agimp agmix anpair fadd`), 16 are partly decided (listed in the json). Undecided is not a failure.

**5b, 500 injected wrong answers** (`answer-injection.mts`, seed 20261025; 2 items per family plus random fill). Wrong
answers: off by one, digit swap, +10, changed part, reversed list, fraction upside down, improper form, neighbouring option;
each checked to be different under the app's judge. Result: the app's own judge (`content.ts` `isCorrect`; for the answers@2
types also `sameAnswer`, 73 items) rejects 500 of 500; the true answers are accepted 500 of 500 (control). The chain check
rejects 418 of the 418 items it can decide (414 also fail the stricter "last step states it" test); it cannot decide 82
(undecided 49, weak 33), where only the app judge protects. 21 injected answers had to be picked to avoid equalling an intermediate step value.

**7, independent re-check** (`answer-recheck.py`). The question text alone is parsed (25 rule functions, many patterns each)
and recomputed with SymPy (arithmetic, equations, HCF/LCM, primes, linear systems) or exact `Fraction`/`Decimal`; no family
code, step or claim is used. Sample: 14,775 items = 10,000 random + 30 from every family (all if fewer). Re-derived 11,200
(7,618 of the 10,000 random), disagreements 0, unreadable 0. Self-test: 11,200 of 11,200 corrupted answers are flagged.
Not re-derivable from text: 3,575 items, recorded per family. 42 families have no re-derivable item: picture or table
carries the data (`abcup abcupord abdir abgrid abjug abseat acbill acelapsed acgrow acpict* adbar adbartf adperim admper adrec
adtally adtwo advenn aearms aedigsym aedsym aeirr aemirror aertang aesym aetab afbar afcube afmatch afnet afview agspdc`), or
the operation is a convention (`acstory acstory4 acstory9 aechk adestchk aabig aematch`). `aeangk` and `aisolid` have under 20.

Limits: 5a "decided" only shows the answer equals a stated step value, not that the step is right (the claims do that).
Test 7 covers 74% of the sampled items, not the whole bank, and its rules are my reading of the prompt wording; a wording
the rules do not know is "not re-derivable", never guessed. Picture, table and convention items rest on the family and the
claims alone.
