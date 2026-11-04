# 08 — Independent review findings

A separate AI reviewer, given the code and content but not the conclusions, inspected the corrected explanations and the content-safety
contract. It changed no files. **This is AI screening evidence, not educator review.**

| Kind of evidence | What it covers here |
|---|---|
| Machine-verified | arithmetic of the four corrections (`content-corrections.test.ts`: the missing-number rule applied as written to every family question, checked by substitution; the doubling chain; 2/5 × (−7/9)); teaching-contract checks; registry validation; eligibility tests |
| Independent AI review | the six changed explanations (mathematics recomputed, age fit, clarity, consistency with the question, rendering, claims) and the contract |
| Educator approval | **none**. No reviewer is authorised in the registry; nothing is approved |

## Explanations (reviewer verdicts)

| Explanation | Mathematics (recomputed by the reviewer) | Verdict | Registry status now |
|---|---|---|---|
| multiplication-tables#doubling | correct (7 → 14 → 28 → 56; guided 6 × 4; check 9 × 8) | acceptable for educator review | pending_review |
| missing-number#worked_steps | correct for all four sentence forms; 27 − □ = 9 → 18 | needs change (teaching): five rules in one paragraph; near-identical phrasings; only the □ + k form worked; "Undo the adding: take away" omits the number | revision_required (AI screening); also machine-blocked (worked steps unverified) |
| missing-number#check_what_it_uses | correct | needs change: prerequisite list incomplete (division; differences beyond 20) | revision_required |
| rational-numbers#spot_the_mistake | correct (−14/45; 14/45 is the sign slip) | needs change: the sign rule should say "when multiplying or dividing"; the paired check is an addition | revision_required |
| propositional-logic#spot_the_mistake | correct (4 true rows) | needs change: guided and check use →, not ↔ | revision_required |
| standard-mass#spot_the_mistake | correct (1600 g) | needs change: quotes "the balance in the picture" with no picture | revision_required |

All six: "a common wrong answer" is the template's wording for a *modelled* error, not an observed frequency — an unsupported
educational claim, present in every generated "spot the mistake" explanation (gap 4, [10-GAPS.md](10-GAPS.md)).

Rendering: the slice renderer typeset sentence-like worked lines as mathematics, dropping spaces ("Not14/45, but − 14/45"). **Fixed**
(`renderer-adapter.ts`: a worked line that is a sentence is shown as text); the e2e check now passes on corrected screenshots. The app's
own lesson view (`Learn.tsx`) shows worked lines as plain text and was not affected.

## Contract findings and what was done

| # | Finding (severity) | Disposition |
|---|---|---|
| 1 | misconception evidence was yes/no per skill: an established *different* misconception licensed any "spot the mistake" (should-fix) | **Fixed.** Each record stores the misconception it addresses (read from its content; all 300 misconception-specific explanations resolve); the gate requires that one to be established. Scenario 2c (established added-not-subtracted) had been shown the forgot-divide explanation; it no longer is |
| 2 | approval digest has no secret; a repository writer can add a reviewer and approve (should-fix) | **Documented limit.** Integrity rests on pull-request review of the registry and its reviewer list; test 0 fails on any reviewer or approval until that is deliberately changed. Server-side recording of explanation decisions is a remaining gap |
| 3 | non-approved statuses unbound: a blocked revision could be relabelled (should-fix) | **Fixed.** Separate blocklist (`explanation-blocklist.v1.json`) refused in every mode whatever the registry says; registry check requires both to agree; `decide` refuses to change a blocked revision |
| 4 | hash covered recheck question ids, not their text (should-fix) | **Fixed.** The hash covers the guided and check questions' prompt, answer and options |
| 5 | study session restored a saved explanation without re-checking; showed the unregistered concept section (should-fix) | **Fixed.** Re-checked through the gate on every render; concept section gated; label shown |
| 6 | lesson page had no "not approved" label; cache ignored the mode; concept section unregistered (should-fix) | **Fixed.** Label on the lesson page; cache keyed by mode; concept sections registered (`<competency>#chapter`, 336) and gated |
| 7 | nothing set supervised mode in the app (note) | **Fixed.** Build-time setting `OPENPATH_TEACHING_MODE=supervised-evaluation` (`scripts/build.mjs` → `main.tsx`); not switchable from the page |
| 8 | competency check cannot fail through current callers (note) | kept as a guard against future callers and altered records (test 6) |
| 9 | `packages/mathematics` remediation strategies (`mathematics/unit/Unit.tsx`) are a separate content system with no gate (note) | **Not changed** (separate system, outside the 17 competencies' explanations). Remaining gap: a supervised evaluation must not use that unit view |
| 10 | verified: blocked, unregistered and changed content refused in both modes; supervised accepts only verified approvals; uncertain hypotheses never treated as established; no invented reviewer | — |
