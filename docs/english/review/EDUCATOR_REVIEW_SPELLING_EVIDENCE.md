# Educator review — spelling evidence foundation (Assessment Evidence v1)

**Nothing here is approved.** Every new question is provisional. Owner approvals recorded on 15 October 2026 are
product permission, not educator review, and no spelling item is educator-validated. This package asks an
educator (ideally with a linguist) to check the new questions and the assumptions the evidence system makes.

## What to review

| Sheet | Rows | What it is |
|---|---:|---|
| [`spelling-evidence/diagnostic-bank-review.csv`](spelling-evidence/diagnostic-bank-review.csv) | 139 | New diagnostic questions for six principles, exceptions and derivational contrasts |
| [`spelling-evidence/existing-items-word-families.csv`](spelling-evidence/existing-items-word-families.csv) | 98 | The lemma, ending and role recorded for each existing hand-written, dictation, journey and pilot inflection question |

For each **new question**, please write a decision (`approve`, `reject`, `revise`, `discuss`), any issues
(`incorrect answer`, `ambiguous`, `wrong difficulty`, `wrong skill`, `not age-appropriate`, `duplicate`,
`cultural or context`, `other`) and a comment. Each row shows:

- the principle and whether the rule **applies** to the word or must **not** be applied (a contrast);
- production (typed) or recognition (choose the spelling);
- its uses: familiar practice, unseen-word transfer, misconception probe, delayed retention;
- `reserved_lemma = yes`: the word appears nowhere else in OpenPath, so it can stay unseen until a transfer or
  delayed check — please judge whether 10–15-year-olds can be expected to know the word's meaning;
- the wrong answers tagged with a misconception (`no_doubling`, `over_doubling`, `kept_silent_e`,
  `y_not_changed`) and other likely errors that have no tag yet;
- the fingerprint the decision will be recorded against.

For each **existing question**, please confirm the lemma and role (`lemma_ok`), or correct them.

## Questions we need an educator to answer

1. Are the six principles stated at the right grain? Should `exceptions` be split (ck insertion, ie→y, irregular
   pay/said, British -ll-)?
2. British spelling: should `travelled` accept `traveled`?
3. Are contrast words genuinely contrasts for 10–15-year-olds (snow/fix never double; flee/canoe/dye keep e; stay/obey
   keep y; credit/gallop/pocket do not double)?
4. Errors with no misconception tag today: wrongly dropping a needed e (`fleing`), wrongly changing y (`plaied`,
   `studiing`), over-doubling in derivations (`preferrence`). Should OpenPath add tags for these?
5. Are the reserved transfer and retention words (e.g. plod, throb, wade, nudge, scurry, envy, compel, propel, outwit,
   blossom, inherit, glisten, gasp, drift) suitable — known meaning, not too rare?
6. Is a recognition item (choosing the spelling) evidence of the same rule as typing it, or only of recognising it?

## How decisions are recorded

Decisions belong in production's existing review record (`content/english/pilot/reviews.json`) with an educator
authority, the reviewer's id, date and the row's fingerprint, through the existing review tooling. A decision
changes an item's validation status only through that process; nothing in this package does.

## Readiness after review

Even with every question approved, no rule supports a reliable mastery claim until a real-learner study shows the
evidence predicts later unseen-word spelling (`docs/english/evidence/EVIDENCE_AUDIT.md`). The research pilot
protocol is in premsethutmc/openpath-research, `docs/pilot/PILOT_PROTOCOL.md`.
