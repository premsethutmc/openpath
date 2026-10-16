# Assessment Evidence v1 — spelling evidence foundation

*16 October 2026. Branch `feat/spelling-evidence-foundation-v1`. For review; not merged, not deployed.*

Goal: let OpenPath eventually tell genuine understanding of a spelling rule apart from remembered answers, by
fixing the content and evidence foundations. The production planner stays authoritative and decides exactly as
before; the research engine is not activated; nothing a child sees changes.

Starting point: the research audit (premsethutmc/openpath-research, `docs/RESULTS.md`, commit `2f33843`) found
id conflicts, word-family leakage, almost no contrast questions, little recognition-versus-production evidence
and no educator-validated items. Those findings came from synthetic learners and are treated as provisional.

## What did not change

| Area | Status | How it is checked |
|---|---|---|
| Production planner decisions and the default rule-evidence statuses | identical | `V3-4`: 48 fixed profile states (6 learner profiles × 8 stages) give byte-identical statuses, counts, misconceptions, retention and planner decisions (`test/fixtures/rule-evidence-baseline.json`, captured before any change) |
| Capability estimates (composite@1, updater) | untouched | no change to `updater.ts`, `composite.ts`, `model.ts`; all 205 existing core tests pass |
| Every existing item record | byte-identical | metadata lives beside the items, so review fingerprints and owner approvals stay valid; the identity lock records every item |
| The child's app, keyboard and spelling flow | untouched | no frontend file changed; `V3-19`: the new bank is not in the engine's default bundle, the app's content or the pilot allowlist |
| Learner histories | untouched | no stored data is rewritten; everything new is derived on replay |

The one deliberate behaviour change is in the **claim guard** (`countsAsVerified`): a "verified" rule now
supports a mastery claim only if every independent answer behind it is on educator-validated content. Before, an
answer on the unreviewed candidate bank could support a claim. This makes claims more conservative; it does not
change any rule status or planner decision, and the app's own profile already required validated items.

## A. Item identity

- **Conflict resolved.** `spl.infl.26–31@1` named six live doubling-journey contrasts (melted, cooked, fastest,
  shouted, dreaming, darker) and, in the test fixture `test/fixtures/inflection-drafts.json`, six unrelated drop-e
  drafts. The journey ids are kept (they are offered to learners and cited in the educator review). The fixture's
  drafts `spl.infl.26–41` were renamed `spl.infl.fx26–fx41` with content unchanged; no learner could ever have
  answered them. Recorded in `content/english/items/renamed-ids.json`.
- **Identity lock.** `content/english/items/identity-lock.json` fingerprints the *meaning* of all 2,806 spelling
  id@versions in every file that holds items (app content, retired versions, the new bank, test fixtures):
  question, scoring, capability, rule and exposure family. Review state and difficulty estimates are excluded, so
  validating an item or recalibrating it is not an identity change. `tools/english/evidence/identity.ts --check`
  (CI) fails if an id@version names two questions, changes meaning without a new version, or disappears. Real
  content may never be renamed; only test fixtures.

## B. Word-family identity

`content/english/spelling/evidence/item-evidence.json` records, for every non-generated inflection item (98
existing, curated; 139 new, authored): lemma (base word), lexeme family (`lemma:<base>`), exposure family (the
item's own production family, unchanged), suffix, the transformation that produces the answer and, where needed, a
stem (`forget → forgot + -en = forgotten`). Generated items are covered by rule from their generation record.

Every entry is checked mechanically (`checkItemEvidence`): the lemma, suffix and transformation must reproduce an
accepted answer, apply items must use their rule's transformation and contrast items must not, and every tagged
wrong answer must be the form its misconception predicts. The check found one real subtlety in existing content
(`forgotten` is formed on the stem `forgot`, not `forget`) and nothing incorrect.

The rule-evidence projection now records each answer's lemma and whether **any form** of it was met before
(`newLemma`). Under the new draft policy (below) forms of a lemma already met are not new words.

## C. Assessment roles

Each item records `polarity` (apply / contrast), `mode` (production / recognition) and `uses`: any of
`familiar_practice`, `unseen_transfer`, `contrast`, `misconception_probe`, `delayed_retention`. An item may have
several uses; one answer is still one observation, and every observation carries an `independenceKey`
(capability#rule#lemma) so repeated answers on one lemma are one unit of evidence. Lemmas reserved for
unseen-word transfer and delayed retention appear in no other spelling item, including generated practice
(`reservedLemmaProblems`, `V3-7`). Whether a particular answer was on a familiar or an unseen word is decided from
the learner's own history, never from the item.

## D. Evidence eligibility is separate from availability

| Content | Offered by the app | Moves the estimate | Demonstrates a rule | Verifies a rule |
|---|---|---|---|---|
| Generated, unchecked | practice only | no | no | no |
| Candidate (existing bank; owner-approved or not) | yes | yes | yes, as before | **no** |
| Provisional (journey drafts, new diagnostic bank) | journey only; bank: never | no | yes, marked provisional | no |
| Educator-validated (none today) | when allowed | yes | yes | yes |

`evidenceEligibility(item)` derives this from the validation status alone. Owner approval is product permission;
it never sets validation (`V3-10` checks all 291 owner approvals).

## The provisional diagnostic bank

`content/english/spelling/evidence/diagnostic-bank.json`: 139 hand-authored items, `evidence_status:
"provisional"`, `availability: "review_only"`. Not loaded by the app or the engine's default content.

| Principle | Items | Apply | Contrast | Production | Recognition | Misconception probes | Unseen-transfer (reserved) | Delayed retention (reserved) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Default suffix (`plain`) | 19 | 16 | 3 | 17 | 2 | 17 | 4 | 4 |
| Short-vowel doubling (`double_short`) | 23 | 16 | 7 | 20 | 3 | 23 | 5 | 4 |
| Silent-e deletion (`drop_e`) | 22 | 16 | 6 | 19 | 3 | 16 | 4 | 4 |
| Consonant-y (`y_to_i`) | 23 | 16 | 7 | 20 | 3 | 16 | 4 | 4 |
| Stress-sensitive doubling (`stress_doubling`) | 20 | 16 | 4 | 17 | 3 | 20 | 4 | 4 |
| No doubling when unstressed (`no_double_unstressed`) | 19 | 16 | 3 | 17 | 2 | 19 | 4 | 4 |
| Exceptions (-ck-, ie→y, irregular pay/say, British -ll-) | 7 | 7 | 0 | 7 | 0 | 2 | 0 | 0 |
| Derivational contrasts (separate capability) | 6 | 0 | 6 | 6 | 0 | 3 | 0 | 0 |

Contrasts include the classic pairs and exceptions: hop/hope (hopping vs hoping), w and x never double (snowing,
fixed), vowel teams (sleeping, floated), e kept after ee/oe/ye (fleeing, canoeing, dyeing vs dying), y kept after a
vowel and before -ing (stayed, crying), stress on the first syllable (credited, galloping) against stress on the last
(occurring, patrolling). Derivational items (hopeful, careful, safely, noticeable, preference, beginner) target
`EN.FND.SPL.morphological` and only illustrate a principle; they are never inflection evidence. `travelled` accepts
the American `traveled` too, flagged for an educator decision.

## Evidence integrity (rule-evidence.ts)

Every `RuleObservation` now also records: lemma, lexeme family, exposure family, production/recognition mode,
`newLemma`, `afterInstruction`, `educatorValidated`, the misconception tag observed, and `independenceKey`. Rule,
contrast role, delayed status and content status were already recorded. These fields are additive.

`RULE_EVIDENCE_POLICY_V1_DRAFT` (not the default) adds lemma-level independence (forms of a lemma met before do not
count as new applications; a contrast lemma counts once) and `verifiedRequiresValidated` ("verified" only on
validated content; otherwise "demonstrated", with the reason). `withItemEvidence(englishInflections, index)` uses
the recorded lemmas and contrast polarity. The app and the planner keep the default policy.

## Diagnostic evidence audit

`docs/english/evidence/EVIDENCE_AUDIT.md`, regenerated and checked in CI. For each principle: independent eligible
word families, positive and contrast lemmas, production and recognition coverage, transfer and retention lemmas,
misconception probes, validation and owner-approval counts, and two separate verdicts: content coverage, and
whether a reliable mastery claim is possible. Coverage counts distinct lemmas, never questions. With the bank, the
six requested principles have complete *provisional* coverage; **no rule can support a reliable mastery claim**:
there are no educator-validated items and no real-learner reliability study.

## Research-engine boundary

`src/research-boundary.ts` reuses the research engine's existing contract (its shadow adapter consumes production
`LedgerEvent[]` unchanged plus an item index) instead of adding a new interface. Modes: `off` (default; returns
nothing) and `shadow` (a deep copy of the spelling evidence and the item index, `actionable: false`). Shadow mode
for real learners throws unless an approval record (by, date, record) is supplied. `active` and any other mode throw.
Nothing calls it from the app.

## Tests and CI

- New: `packages/english-core/test/v3-evidence-foundation.test.ts` (20 tests: identity, historical compatibility,
  planner preservation, word families and leakage, duplicate evidence, unreviewed content, mastery claims,
  recognition vs production, misconception classification, retention timing, recorded fields, audit, research
  boundary, mobile spelling flow, determinism).
- CI (`english` job): `identity.ts --check`, `audit.ts --check`, `review-sheet.ts --check`, plus the existing suites.

## Migration

None needed for stored data: no ledger event, decision or item record is rewritten. All new information is derived
on replay. Files added: the bank, item-evidence metadata, identity lock, renames record, audit, review sheets, tools,
two core modules and tests. Files changed: `rule-evidence.ts` (additive fields, optional policy fields, claim
guard), `subject-english-inflections.ts` (`lemmaOf`, `withItemEvidence`), `index.ts` exports, the test fixture's
ids and the three tests that name them.

## Rollback

- Whole change: revert the PR. No data needs restoring.
- Claim guard only: restore the one-line `countsAsVerified` (claims on candidate content become possible again).
- The bank, metadata, policy v1 and the research boundary are inert unless a later change uses them.
- The identity lock is append-only by design; dropping its CI step removes the guard without affecting the app.

## Decisions that need the owner (not implemented)

1. **Switch the default policy to v1** (lemma independence, verification only on validated items). It changes
   rule statuses on existing histories, so the planner would decide differently for some learners.
2. **Exposure families in the updater.** Production's `family` (e.g. `fam.infl.double` groups swim and run) drives
   the composite's fresh/variant/repeat exposure. Changing it to lemma families reinterprets past answers; it needs a
   migration decision.
3. **Missing misconception tags.** The framework lists no tag for dropping an e that must stay (`fleing`) or changing
   y wrongly (`plaied`, `studiing`); such errors are recorded as unclassified. Adding tags changes the frozen framework.
4. **Split the `exceptions` rule** into its sub-classes (recorded per item as `exception_class`).
5. **British vs American spelling** for `travelled`.
6. **Educator review** of the bank, the curated lemmas and roles (`docs/english/review/EDUCATOR_REVIEW_SPELLING_EVIDENCE.md`).
7. **Making reviewed bank items available** to children (a separate change; nothing here offers them).
8. **Shadow mode for real children** (a separate approval; the code refuses without one).
