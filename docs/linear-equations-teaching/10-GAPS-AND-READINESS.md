# 10 — Remaining gaps and readiness decision

## Remaining gaps (honest)

1. **No educator review.** All 13 linear-equations records are `pending_review` or `revision_required`; nothing is approved. A
   supervised-evaluation build pauses instead of teaching linear equations until an educator works through the packet (09).
2. **Sub-skill evidence is competency-level.** The learner-state model (unchanged by boundary) aggregates all linear-equation answers. A
   learner who never solves a bracket equation is taught `brackets` once, rechecked, then sent to a person — but their status can read
   "transfer" (shown alone on other kinds). In the tested journey, even after a passed delayed check, they were **not verified** (J18), but
   nothing in the model guarantees that in general; family-level (sub-skill) evidence is the fix.
3. **Spaced, unexplained errors on one kind** are taught only once two answers alone on that kind are wrong with none right since; one
   unexplained error stays a slip (policy A).
4. **Concept section**: the two sections kept from the template (choosing the equation; word problems) use "constant"/"coefficient" and a
   bracket problem before brackets are taught (`revision_required`). Word-problem and modelling questions (`auleq`, `aulwp`) have no
   explanation of their own in this module.
5. **Presentation** (renderer unchanged — no UI redesign): the slice renderer shows each explanation as one long numbered list with the same
   badge on every step, squeezes text beside the badge on mobile, and does not emphasise the correction line; the app's lesson view shows
   worked lines as plain text (not typeset).
6. **Method evidence**: P2 does not register lines written as "3x + 4 − x = x + 12 − x" (unsupported, not invalid); plain working is
   verified. No P2 change was made.
7. **Delayed check coverage**: the module's retention questions are still two-step and modelling questions; the delayed check does not
   sample x-on-both-sides or brackets.
8. **Scope**: whole-number solutions only; negative numbers appear only inside brackets and as constants; fractions and negative answers
   remain `linear-rational`.
9. **Lesson-page length**: the lesson page shows all 12 explanations (general first, then the 8 mistakes); an educator may want the
   mistakes kept for interventions only.
10. **Teaching per kind**: a learner who has failed several kinds of equation alone can be taught each kind once (scenario 4b now gets
    three explanations); bounded, evidence-based, but long.
11. **Ranking scope**: kind-matching (`relevant`) and sub-skill teaching apply only to modules whose explanations span several families —
    today only linear equations.

## Readiness decision

**PASS — TEACHING IMPLEMENTED** (regressions: [08](08-REGRESSION-RESULTS.md); two introduced failures found and fixed):

- the complete sequence (A meaning → B one step → C two steps → D both sides → E brackets → F eight mistakes) works through the real engine,
  grader, evidence and renderer;
- every worked transformation is independently verified (all screens, 240 generated variants) and machine-checked by the teaching contract;
- adaptive decisions use legitimate evidence only: a mistake explanation only for its own established misconception; general instruction
  for repeated difficulty; no fabricated evidence; assisted success is never verification;
- independent rechecks work (fresh, same kind, discriminating, graded by the trusted grader, method evidence where P2 supports it);
- retention and recovery work (failed delayed check → recovery required, history kept; restart replay identical);
- content-safety gates stay enforced (12 + 1 records, nothing approved, the 4 blocked revisions still blocked, supervised mode refuses).

**Not ready for a supervised educational evaluation** until an educator approves the explanations (and the concept section is revised),
and until gap 2 is addressed or explicitly accepted for the evaluation.
