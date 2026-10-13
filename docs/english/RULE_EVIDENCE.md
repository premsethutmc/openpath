# Rule-level evidence (first increment of the learner-vector proposal)

A read-only projection of the event ledger that reports, for each rule of a capability, what the learner
has shown on their own, how sure we are, whether it has lasted, and which errors belong to that rule. It
starts with one capability: spelling inflected forms (`EN.FND.SPL.inflections`).

It changes nothing that exists: the capability estimates (`composite@1`), scoring, thresholds, the ledger,
selection, the app and stored learner records are untouched. The capability's "mastered" label is still
computed exactly as before; the projection only says whether the rule evidence supports it.

**Status: draft for review.** The policy values below are proposals, not approved thresholds. All results
come from synthetic learners and unreviewed draft questions; they show that the code applies its policy
as written, not that the policy is educationally right.

## Where it lives

| File | Layer | What it does |
|---|---|---|
| `packages/english-core/src/rule-evidence.ts` | Engine (no English in it) | Observations, rule state, misconception records, claim guard, policy |
| `packages/english-core/src/subject-english-inflections.ts` | English subject module | The 8 rules and the band each is required from, which rule an item tests, contrast items, the word an item asks for, error classification |
| `packages/english-core/test/r1-rule-evidence.test.ts`, `rule-profiles.ts`, `fixtures/inflection-drafts.json` | Tests | Six synthetic learners and the 24 draft questions (test fixture only) |

Use: `projectRuleEvidence(ledger, content, englishInflections, engineView)`.

## What counts as evidence

- **Independent:** the updater accepted the answer (a first answer to a hand-written item, not a repeat).
- **Practice:** the updater held it (a generated item not yet checked by a person). Shown, never proficiency.
- **Repeat:** an item seen before. Counted separately, never proficiency.
- **New word:** no earlier evidence on the same answer word.
- **Contrast:** an item where the rule must not be applied (marked by a family id ending in `.contrast`).
- **Slip:** a wrong answer that is the right answer with two neighbouring letters swapped. Shown, never
  counted against the rule, never a misconception.
- **Delayed check:** a session whose previous evidence on the rule is at least 7 days earlier.

Assisted answers (hints, second tries) are not in the ledger on `main` (they are app events), so they are
not yet a separate track; see limitations.

## Rule status

The rate of correct application uses a Beta(1, 1) starting point updated by the most recent 8 independent
answers on new words (slips excluded). "80% sure" means posterior probability 0.8.

| Status | Rule (draft policy `rule-evidence-policy@0-draft`) |
|---|---|
| Insufficient evidence | Fewer than 3 independent new-word answers. Never reported as weakness |
| Inconsistent | In the last 6 independent answers: 30–70% right and at least 2 different kinds of error |
| Weak | At least 3 answers and 80% sure the rate is below 0.5; or an active misconception |
| Emerging | At least 3 answers, neither weak nor demonstrated |
| Demonstrated | At least 4 answers in the window; 80% sure the rate is above 0.6 (20th percentile ≥ 0.6); at least one correct contrast and the latest contrast correct |
| Verified | Demonstrated, and the latest delayed check after demonstration passed: at least 2 new-word answers, no rule error |
| Needs reconfirmation | The latest delayed check after demonstration had a rule error. History is kept; current retention is "failed" |

Smallest evidence this gives (checked by test R1-0):

| New-word answers in window | Demonstrated needs at least | Weak if at most |
|---|---|---|
| 3 | (not possible) | 0 right |
| 4 | 4 right | 1 right |
| 5 | 5 right | 1 right |
| 6 | 5 right | 1 right |
| 7 | 6 right | 2 right |
| 8 | 7 right | 2 right |

This replaces the earlier "70% (4 of 4)" wording, which mixed a rate threshold with the evidence needed to
be sure of it. Demonstrated is not mastery: verified mastery needs a later session, at least 7 days on, with
no rule error.

## Misconceptions

One record per rule and tag, changed only by that rule's evidence. Correct answers on other rules never
change it (test R1-2). Every change keeps its evidence id and reason.

| State | When |
|---|---|
| Suspected | First error with the tag; or enough errors, but the same pattern is right in practice (transfer gap) or the rule's answers are inconsistent |
| Active | Errors with the tag on at least 2 different items, at least 1 on a new word, and at least two thirds of the rule's recent errors |
| Improving | Active, then a correct new-word answer |
| Provisionally resolved | Since the last error: 3 correct new-word answers, in 2 sessions, and a correct contrast |
| Historically observed | Provisionally resolved, then a delayed check passed at least 7 days after the last error |
| Not confirmed | Suspected, then the resolution criteria met with no repeat |

A repeat of the error after provisional resolution makes it active again and counts a recurrence.

## The claim guard

`capabilityClaim` reports the engine's own label unchanged, then:

- the highest band up to which every required rule is verified;
- the band at which mastery is supported: the engine's mastered band, capped below the first band whose
  required rules are not all verified;
- whether the engine's "mastered at band M" label is supported, and which rules are not verified and why.

## Results (synthetic, deterministic)

| Learner | Independent right | Engine (unchanged) | Doubling | Silent e | y to i | Engine label supported? |
|---|---|---|---|---|---|---|
| Knows the rules | 27/27 | mastered 5.0 | verified | verified | verified | No: plain and -es not checked |
| Memoriser | 6/27 | mastered 2.0 | weak, transfer gap | weak, transfer gap | weak, transfer gap | No |
| Guesser | 14/27 | mastered 3.0 | inconsistent | inconsistent | inconsistent | No |
| Careless | 24/27 | mastered 4.5 | verified | demonstrated (3 slips; delayed check too small) | verified | No |
| Never doubles | 20/27 | mastered 4.0 | weak, no_doubling active | verified | verified | No |
| Forgets after day 9 | 25/27 | mastered 5.0 | needs reconfirmation, retention failed | verified | verified | No |

No learner's engine label is supported, because the plain-ending and -es rules (required from band 2)
have only one hand-written question each and so never leave "insufficient evidence". That is the honest
result for this question bank, not a fault in the learners.

## Limitations and remaining gaps

- **Draft policy.** Every value is a proposal for review. The synthetic tests check consistency only.
- **Question supply.** Plain endings and -es have one reviewed question each; the 24 draft questions are
  unreviewed and used here only as a test fixture. With 2 delayed questions per rule, one slip can leave a
  delayed check too small to verify (the careless learner's silent e).
- **Assisted attempts** are app events on `main`, not ledger events, so they are not yet a separate track.
- **Contrast items** rely on the `.contrast` family convention; no item in the current bank is marked.
- **New words** are judged by the answer word; the same root in another form (hopped after hopping) counts
  as new.
- **Slips** are only adjacent letter swaps; other careless errors count as unclassified rule errors.
- **Last teaching time** is approximated by the rule's previous evidence, because lessons are app events.
- **Not wired in:** no screen, planner or selection reads the projection yet. The engine's own
  misconception fading in `composite@1` is unchanged, by design.
- The frozen ten-learner simulation is unchanged (output identical to `main`, including its two recorded
  misses, M1 and M6).

## Generated questions: a proposed item-level validation process (not implemented)

Generated questions stay practice-only. Sampling a generator is not enough to promote its outputs. A
proposal for each generated item to earn evidence status individually:

1. **Automatic checks per item**: answer key against the dictionary sources, blocklist, one acceptable
   answer (or all listed), prompt names the root or meaning, no near-homophone ambiguity.
2. **Human review per item and version**: an educator records ok / critical / minor with a reason; a
   critical verdict retires the item; a new version needs a new review.
3. **Second review for a sample**: a second reviewer checks a random share of approved items; disagreement
   above an agreed rate stops approvals for that rule until resolved.
4. **Response monitoring**: after enough independent answers, the item's success rate and its agreement
   with learners' other answers are compared with its estimated difficulty; misfitting items are suspended
   for review.
5. **Audit trail**: every status change is recorded with reviewer, date, version and reason; only items with
   a current human approval and no open flag may be used as independent evidence.
