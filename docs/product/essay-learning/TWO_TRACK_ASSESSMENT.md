# Two-track assessment: what counts as evidence in the essay studio

This was reviewed on PR #50 (18 October 2026). The production estimator, the ledger, the evidence gate and the eligibility
rules are **unchanged**. This change only decides which track each kind of question is on, and what the screen says.

## The policy

| Track | Questions | Used for | Can change an estimate? | Can decide a gap? | Can show or verify a skill? |
|---|---|---|---|---|---|
| **Formal** | Eligible, unseen **bank** questions, chosen by the existing allocation | Diagnosis, the journey's guided practice (preferred), independent checks, later checks, the delayed retention check | Yes, under the existing rules | Yes: confirmed, weakened or unresolved | Yes, by the engine's existing rules |
| **Practice** | Model-written questions that pass the core's mechanical checks: structure, answer key, duplicates | Formative practice and feedback, and guided practice only when the bank has none left | **No.** They are provisional items, so the existing gate holds every answer. | **No.** A practice set never becomes a diagnostic request. | **No.** They are never eligible for checks or retention. |

"Reviewed" here means what the engine treats as evidence today: the **candidate** bank. **No bank question has been
reviewed by an educator yet.** The round-1 package exists for that review. The educator gate is the next safeguard and is
not claimed.

### What changed in PR #50

PR #50's first version had a problem: a generated set became a diagnostic request, so five model-written questions could
**confirm or rule out a gap**. They could never change an estimate, but they did decide the gap. That is now fixed:

- Choosing a competency first runs a **bank** check. The new "Check this skill (questions from the bank)" button uses
  `planDiagnosticFor`.
- Generated questions are **practice**. They come from `generatePractice` and are summarised by `formativeOutcome`.
- `gapHypotheses` ignores any older generated request.
- The recommendation (`recommendNext`) prefers the formal track. It states plainly when verification is unavailable.

## Four evidence states, four labels

The labels come from `frontend/src/english/logic/essay-live/evidence-labels.ts`; the test is LABELS.

| Evidence state | Where it comes from | Label |
|---|---|---|
| Gap suspicion | Essay observations: errors in at least 2 sentences, or an error seen in an earlier essay too | "Suspected from your essay" (provisional) |
| Confirmed gap | At least 2 wrong answers, without help, on bank diagnostic questions | "Gap confirmed" |
| (other gap outcomes) | Bank answers right, or mixed | "Gap not confirmed" (not mastery), "Checked: not settled" |
| Estimated proficiency | The engine's estimate from counted answers | "Estimated level: band X ± sd from N counted answers (an estimate, not mastery …)", or "none yet" |
| Shown at the target | The engine's lower 80% bound reaches band 5, from at least 3 qualifying answers in at least 2 formats | "Shown at the grade target (not yet verified)" |
| Verified mastery | Shown, **then** the delayed check passed at least 7 days after the target was first shown | "Verified mastery" |
| Formative practice | Model-written questions | A separate line: "Practice on model-written questions: k of 5 right. Formative only …" |

The old shared labels ("Needs verification", "Learning") made no difference between a strength seen in an essay and a
suspected gap. They also called a confirmed gap "Learning". The live studio no longer uses them; the fixture-only
essay-demo is unchanged.

**One finding to decide.** The engine's own verification status can already read `verified` at the moment band 5 is
first shown. This happens when a later check comes 7 or more days after a *lower* level was first shown (K9-2 records
it). The essay outcome still has its delayed check at the target pending. The studio therefore labels this "Shown at the
grade target: delayed check pending", and says "Verified mastery" only after that delayed check passes. The engine is
unchanged. Whether the engine should behave this way is a decision for the owner (it was not changed here).

## Audit: the eight existing plural questions

The audit covers `EN.GRM.NOUN.plurals_countability` (target band 5, provisional). Its 13 bank questions include the
**8** that are eligible for diagnosis or checks; those are the ones counted in the review package. For one new learner,
the allocation gives:

| Question | Band | Format | Ladder step | Family | Status | Role now |
|---|---:|---|---|---|---|---|
| grm.plu.01 | 1.5 | typed | regular | fam.plu.reg | candidate | practice |
| grm.plu.02 | 2.0 | typed | regular | fam.plu.reg | candidate | **diagnostic** |
| grm.plu.03 | 2.75 | typed | y_and_irregular | own | candidate | **diagnostic** |
| grm.plu.04 | 3.25 | typed | y_and_irregular | fam.plu.irr | candidate | practice |
| grm.plu.05 | 3.75 | typed | y_and_irregular | fam.plu.irr | candidate | **diagnostic** |
| grm.plu.08 | 5.25 | choice | uncountable | own | candidate | kept for **delayed retention** |
| grm.plu.09 | 5.75 | multi | uncountable | own | candidate | kept for **delayed retention** |
| grm.plu.10 | 6.25 | typed (correction) | uncountable | own | candidate | the only **independent check** question |

These are not among the 8: grm.plu.06 and .07 (many/much) are practice only, because their answers appear in a lesson
example. grm.plu.11 to .13 are above band 6.5, so they are kept for teaching.

- **Eligibility.** All 8 are candidates: evidence-fit under the current rules, and none educator-reviewed. None is in a
  pilot pool.
- **Difficulty.** The diagnostic questions are all below the target, at bands 2 to 3.75. They can **confirm** a gap (2
  wrong). They cannot rule one out, because the "near the target" rule needs a right answer at band 4.5 or above. Right
  answers therefore give "unresolved", never "weakened". The 3 questions at bands 5 to 6.5 are all reserved:
  retention takes 2 first, which leaves 1 for checks.
- **Coverage.**
  - Covered: regular plurals, irregular plurals (child, mouse, baby) and uncountable nouns.
  - Not covered by a diagnostic or check question: many/much (practice only); quantifier + plural noun ("many
    village", "two box"), apart from the regular-plural questions at bands 1.5 to 2; and "people" as an
    already-plural noun.
  - Karthik's errors are mostly at the **band-4** descriptor level (common irregular plurals). The diagnosis fits them;
    the band-5 check (uncountables) tests a different ladder step.
- **Prior exposure.**
  - Two pairs share a family (.01/.02, .04/.05). Only one of each pair can be asked fresh, and the other becomes a
    variant.
  - A diagnostic question is never reused for practice or a check; this is tested.
  - On a second essay, only the unused diagnostic questions remain. With 3 left after the first round, a second formal
    plural check is usually short (`contentGap`), and the studio then offers practice and says why.

**Shortfall.** To verify plurals for one learner (one check plus the delayed retention check), the bank needs **at least
one more** reviewed, unseen question at bands 5 to 6.5. Later checks would need more: up to 6 more for the policy's full
allowance. The proposed supplement has no plural questions; it covers only the three pilot competencies.

## The complete journey: what works, what is blocked, what was implemented

| Step | Shipped bank | Evidence |
|---|---|---|
| Essay → suspected plural error | **Works** (server gateway, mocked model in tests) | K8-1, ESSAY-DIAG, browser |
| Independent diagnostic (bank) | **Works**: 3 questions, a confirmed gap, answers counted | K9-1, ESSAY-DIAG, browser |
| Targeted instruction | **Works**: 5 plural lessons (candidate content) | K9-1, browser |
| Guided practice | **Works**: bank questions first, all assisted | K9-1, browser |
| Formative practice (model-written) | **Implemented in this change**: held, formative, decides nothing | K8-3, ESSAY-DIAG, browser |
| Independent recheck | **Blocked by missing reviewed content**: 1 of the 2 needed unseen questions at bands 5 to 6.5. The screen says "Mastery verification is not available …" | K9-1, browser |
| Persistent profile | **Works**: identical after a reload; the estimate's sd widens with elapsed time, as the engine's time model says | ESSAY-DIAG, browser |
| Delayed retention | **Blocked**, because the target is never shown. No retention check is offered and none is claimed | K9-1 |
| The same journey with test-only stand-ins for reviewed questions | **Works end to end**: recheck, later checks, then shown, then the delayed check, then verified | K9-2 |

K9-2 shows that the machinery is complete, and the only blocker is content. It also shows how much content is needed:

- **2 wrong diagnostic answers** (the studio stops asking once the gap is confirmed): the journey's check plus the
  policy's later checks, all right on test-only questions at bands 5 to 6.25 (half of them typed), are enough to show
  band 5.
- **3 wrong answers** (one more question answered): 8 right answers were *not* enough within the policy's allowance.
  The recognition-only version of this run was even further short, because guessing makes choice answers weaker
  evidence.

This is the production estimator working as designed (unchanged). It means verification after a confirmed gap needs
several unseen, preferably constructed, reviewed questions at the target band.

## Repeated provisional questions cannot establish mastery

K8-3 answers the same 5 model-written questions 4 more times over several weeks, then a second set. The result:

- every answer is held, 30 of them;
- the direct evidence count stays 0, and the engine state is `not_demonstrated`;
- the outcome is not shown, not verified, and retention is `not_applicable`;
- the profile state is never "demonstrated" or "verified";
- generated questions are never chosen for a formal diagnostic or a planned check.

Content validation also refuses any model-generated item that is not provisional.

## Remaining decisions

1. **Bank content.** Commission and review at least 1, and ideally 6 or more, plural questions at bands 5 to 6.5, with
   constructed formats preferred and covering quantifier + plural. The same applies to agreement, tense and articles
   (round 1).
2. **Educator review.** Decide whether candidate bank questions may keep acting as formal evidence before educator
   review, or whether the formal track should wait for reviewed (`validated`) questions. That is a stricter gate; it
   was not made here.
3. **Engine verification at a new target level.** See the finding above.
