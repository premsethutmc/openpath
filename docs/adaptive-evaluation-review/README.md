# Educator decision packet: one controlled integration pathway

**No content is approved or released by this packet.** Content snapshot: `fb80bb5b334675d382a9caf7de623e466a0fc663` on `milestone/adaptive-evaluation-2026-11-08`. Review the exact hashes below/linked, not the branch name alone. Controlled recovery remains default-off.

## What the educator receives

- [EXPLANATIONS.md](EXPLANATIONS.md): all nine explanations verbatim, exact revision hashes, worked mathematics, guided and independent questions and recorded answers.
- [CHOICE-QUESTIONS.md](CHOICE-QUESTIONS.md): the full multiple-choice options and answer letters (a letter alone is insufficient for review).
- [REVIEW-MANIFEST.json](REVIEW-MANIFEST.json): exact question objects, current eligibility checks and blank decision/reviewer/date/note fields. Filling a packet is **not** an approval in the runtime registry.
- [FAMILY-CHECKS.json](FAMILY-CHECKS.json): generator domains, exact family fingerprints, submission history, phase sizes and validation results.

The engine chooses among these existing general explanations based on saved diagnostic evidence. No scenario trace was supplied to the general packet generator; its “not reached by the audited scenarios” line means no trigger evidence was supplied here, not that the explanation is unreachable. The milestone’s synthetic goal journeys exercise the integration/exponents route; they do not establish learning by a real pupil.

## Nine decisions, not one blanket sign-off

All nine revisions are `pending_review`; the sole failed supervised-evaluation eligibility check is `approved-for-usage`. The registry currently has **zero authorised explanation reviewers**. The product owner must nominate an educator and authorise that identity through a reviewed registry change before decisions can be applied. Engineering must not nominate itself as an educator or fabricate a sign-off.

| Skill / explanation | Understanding and question to review |
|---|---|
| Integration methods / `why_du` | Does the learner understand why `2x dx = du`, with no extra division by 2? Is the short explanation enough for this learner level? |
| Integration methods / `limits_table` | Are both limits changed consistently from x to u, and is the fresh choice question a fair independent check? |
| Integration methods / `powers_check` | Does the prerequisite reminder distinguish repeated multiplication from multiplying base by exponent? Decide whether this is enough teaching or should hand off to exponents. |
| Indefinite integrals / `differentiate_back` | Is differentiation-back explained correctly? The check asks for a definite integral: decide whether it actually assesses the intended antiderivative understanding. |
| Indefinite integrals / `raise_then_divide` | Is the power rule correctly limited to the supported positive powers, and are upper/lower-limit subtraction and division clear? |
| Indefinite integrals / `powers_and_fractions` | Is this a sufficient bridge to powers/fractions, or merely advice to practise? Does the check measure the stated difficulty? |
| Exponents / `count_factors` | Does writing repeated factors explain positive whole-number exponents clearly? Check the worked 11³ example and the fresh 5⁴ item. |
| Exponents / `build_up` | Is “one multiplication fewer than the power” clear for this restricted domain? Review the full choice options, not just answer D. |
| Exponents / `facts_first` | Does this provide enough help with multiplication facts? Do not infer integer-exponent-law competence from a positive-power check. |

For **each exact hash**, record approve for supervised evaluation / revision required / demonstration only / block, educator identity, date, rationale, intended learner level, scope limitations and any required changes. The explanations’ prose does not explicitly state learning objectives; the questions above are review prompts, not new approved objectives. Machine “no violations” checks do not assess pedagogy or establish that prose is sufficient.

An authorised educator’s decision is recorded through the existing `explanation-review.ts decide` workflow; the tool validates identity, exact current revision, scope and approval integrity. Do not execute the illustrative status alternatives in EXPLANATIONS.md as literal shell pipes. Existing tooling supports `approved`, `revision_required`, `demo_only` or `blocked`. A later content edit requires review of the new hash.

## Three family release decisions

| Family | Exact fingerprint | Effective state | Technical result | Actual scope |
|---|---|---|---|---|
| `subst` | `ff41c625` | submitted, not stale | 72 deterministic items, 400 property cases, 16 boundary cases; no failures | Definite substitution integrals of `2x(x²+c)^n`; does not assess integration by parts |
| `pint` | `552b485b` | submitted, not stale | 360 deterministic items, 400 property cases, 16 boundary cases; no failures | Definite power integrals, `0≤a<b≤4`, `1≤k≤12`, `n=1..3`; does not independently establish symbolic antiderivatives or the constant C |
| `pow` | `9ef3b50f` | submitted, not stale | 42 deterministic items, 400 property cases, 8 boundary cases; no failures | Positive whole-number powers; does not cover all integer exponent laws |

Additional independent BigInt calculations checked all **474 served pool items**, including **235 choice items**, against closed-form arithmetic; direct answers and choice letters agree. No stale submission, invalid pool or answer defect was found to repair. Existing questions, answer letters and learner replay were not changed.

The exact block is procedural and educational: no named educator decision exists for these current family revisions, therefore the release-manager step cannot run. The families must stay **submitted** until an educator other than the author records approval, requests changes or rejects them, with a note stating what was checked. Only an approved family can subsequently be released by a release manager. Explanation approval and family release are separate gates; neither substitutes for the other.

Family review uses the existing content-review workflow (`review.ts`, targets `family:subst`, `family:pint`, `family:pow`). The CLI records a supplied name; identity/role verification belongs to the reviewed change. Do not treat access to this CLI as educator authority. Review the domain, samples, distractors, grading, phase separation and narrow competency coverage before approving. Do not approve an entire broad competency from this packet’s narrow families. Module release, when needed, additionally requires all of its dependent families; this packet does not claim to release an entire module or every possible recovery branch.

## Reproduce without recording decisions

From `frontend`:

```sh
node --import tsx scripts/adaptive-review-check.mts
node --import tsx ../packages/learning/scripts/explanation-review.ts check
```

The first command regenerates the three JSON/choice artifacts, validates families and asserts that all nine remain blocked by review. It will intentionally need updating after actual educator decisions. EXPLANATIONS.md was generated with the existing `scripts/explanation-review-packet.mts` and an explicit `--ids` list of the nine identifiers in REVIEW-MANIFEST.json. No registry-changing command was run.

The non-test browser journey on the milestone stops at the first unreviewed question and records zero answers or lessons. This remains the correct outcome until the human decisions above are completed. Do not deploy a test build or bypass review to demonstrate a successful pilot.
