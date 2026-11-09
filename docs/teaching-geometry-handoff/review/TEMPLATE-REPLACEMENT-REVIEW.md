# Independent template-replacement review

The real browser selected the existing `worked_steps` instead of the newly appended strategy. The correction replaces that template strategy in place under the stable ID `worked_steps`, with the same `ahtri` family and the reviewed four-screen30°/90°/60° teaching. This is a meaningful correction to the delivered path, not evidence that the unused alternative was taught.

## Source inspection result

Pass at source level, pending regeneration and browser evidence:

- Replacement requires an existing template strategy ID and matching question family.
- Unflagged duplicate IDs and duplicate candidate definitions are rejected.
- Existing position in the strategy array is retained; other strategies stay intact.
- Shown-example and guided/check exposure reservations still apply. Candidate examples cannot be recycled as a fresh check.
- Explicit guided/check partition and scope validation remains enforced.
- Unit tests exercise missing-ID and family-change rejection.

## Record-resume caution

Keeping the strategy ID preserves the identity used by old teach records, but does not by itself prove decision replay is identical. Old `worked_steps` used guided `gen:ahtri:56,29` and check `gen:ahtri:25,65`; the replacement uses `gen:ahtri:56,82` and `gen:ahtri:24,57`, and changes the strategy kind from procedural to conceptual. An existing teach record resolves to the current strategy definition on resume.

Required regression: old guided/check records must remain readable, answer credit must be unchanged, and a resumed learner must not gain automatic mastery or crash. Only claim exact decision equivalence if separately verified; otherwise state preservation of record identity and answer replay, with fresh subsequent questions intentionally allowed.

No educator approval is implied by this review.
