# 10 — Remaining educational-quality gaps

1. **No educator review.** 0 approved explanations; 0 authorised reviewers. Supervised-evaluation mode teaches nothing until an educator
   approves explanations (and concept sections) through the packet ([06](06-EDUCATOR-REVIEW-PACKET.md)).
2. **Teaching quality.** 43 explanations are `revision_required` (38 from the Milestone 2 screening, 5 from this review: three of the
   corrected ones and two other changed ones); 5 `demo_only`. The corrected missing-number and rational-numbers explanations are
   mathematically correct but pedagogically weak (see 08).
3. **Recheck alignment.** Some explanations are paired with a recheck that does not test what they teach (rational-numbers sign rule vs an
   addition check; logic ↔ vs → questions). Found by review, not by a systematic check.
4. **"A common wrong answer".** Every generated "spot the mistake" explanation (300) presents a *modelled* error as common. No frequency
   data supports it. Not rewritten here (it would change 300 revisions); an educator decision on wording is needed.
5. **Unscreened content.** 1113 explanations and 336 concept sections outside the audited 64 are registered `pending_review` without any
   screening. They are shown in demonstration mode (labelled), never in supervised mode.
6. **General teaching after unverified difficulty.** With no misconception established, 4a/4c/5b/2c now get the general
   `check_what_it_uses` explanation, which the Milestone 2 screening rated demonstration-only. In supervised mode they would pause. There
   is no strong general explanation for linear equations yet (`worked_steps` is machine-blocked: worked steps unverified).
7. **Recovery findings.** A finding passed in by recovery without a diagnosis id licenses any misconception-specific explanation (none
   occurred in the scenarios: recovery findings now carry their id).
8. **Approval integrity is procedural.** Registry and reviewer list are repository files protected by pull-request review; no server-side
   record of explanation decisions (review@2 has one for modules and families).
9. **Separate remediation content.** `packages/mathematics` remediation strategies (mathematics unit view) are not covered by this
   registry. A supervised evaluation must not use that view until they are.
10. **Renderer.** The slice renderer's step badge is compressed beside long explanation text on mobile (cosmetic; content readable).
