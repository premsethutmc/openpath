# Calculus teaching revision — educator decision requested

Local branch: `teaching/calculus-steps-2026-11-08`, based on adaptive candidate `08a6d5aa97aee22fb8025940341334be5f43e120` (PR #120). This is a teaching-text revision, not educational approval or release.

## What changed on the learner's screen

The existing `Lesson` component already renders each selected strategy's screens with Back, Next and Try it. The defect was sparse selected strategy content: an instruction to expand/cancel, or a quotient followed by its answer, did not teach the intervening work. The existing blueprints now supply the steps; there is no new lesson renderer or parallel content system.

- First principles: multiply `(x+h)(x+h)`, identify both cross terms, subtract the whole original function, factor and cancel `h` only for `h ≠ 0`, then take the limit. The seed example is `x²−5x−4`; the established constant-kept misconception retains its own example `2x²+4x−1` and correct result `4x+4`. The screens explain why the derivative of `x²` is `2x` and why a constant disappears.
- Substitution: name `u`, explain `du/dx` as a rate and `du=2x dx` as differential notation, replace the whole matching factor, transform each endpoint, then evaluate upper minus lower. The example is the definite integral of `2x(x²+1)²` from 0 to 1, giving `7/3`. It distinguishes an indefinite antiderivative with `+C` from evaluating a definite integral, and does not equate a differential with an exact finite increment.
- These steps appear in the existing relevant strategies as well as the chapter, so selecting a different teaching approach does not hide the needed working. Existing secondary worked examples remain. Original question families, answers, choice ordering, strategy scope, prerequisite probes and guided/check IDs are unchanged. The procedural derivative strategy’s automatic worked fragment was rejected by its existing symbolic-answer check. It is replaced by the authored expansion sequence. `reserveExample` preserves the old generator draw and exposure reservation; it does not relax a teaching or educator gate.

## Actual prerequisite accessibility

The shipped `Recovery` view can open a full prerequisite `Module` when the investigation identifies one; it is not restricted to a one-paragraph prerequisite screen. The opt-in deep goal tests demonstrate substitution → exponents (and, for a deeper gap, multiplication tables) → fresh substitution checks. That pathway remains default off and real evaluation remains subject to question release and explanation approval.

Do not infer that every calculus prerequisite is connected. A synthetic cubic-expansion gap (`gen:aqfp:3,1,2,0`) in the current deep driver produced: wrong attempt → wrong slip check → correct limits probe → escalation, with no algebra-identities lesson. Symbolic answers are deliberately not diagnostic authority for misconception attribution. The existing question solution metadata names limits; the presence of an algebra misconception alone does not ensure deep routing to algebra. The bounded revision teaches the flagged square expansion directly within the existing lesson. Extending cubic recovery needs a separate question-support/route change and validation; this revision does not claim to fix that route or globally enable it.

## Teacher decisions

Read [COMPARISON.md](COMPARISON.md) for the exact before/after screens, current hashes and complete guided/recheck questions (including choice options). Each changed revision must be reviewed separately; approval of an earlier revision does not carry forward.

1. Is the pacing and vocabulary suitable for the intended learner, especially the distinction between `du` and a finite increment?
2. Can the learner explain both cross terms, cancellation and the limiting step in their own working, rather than merely reproduce the final derivative?
3. Can the learner choose the substitution and transform both endpoints without help? Is the link from differentiating the inside expression to replacing the matching factor clear?
4. Confirm mathematical correctness and the fit of each strategy to its diagnostic trigger. Mark approved, revision required or blocked against the exact revision through the established authorised-educator process.
5. Review the remaining rational, radical and trigonometric first-principles examples separately; this bounded revision concentrates on the flagged quadratic and substitution teaching, not a comprehensive calculus rewrite.

The existing assessment asks for answers. Fresh independent questions and delayed failures test the software's flow and evidence handling, but do not assess handwritten derivations or establish educational effectiveness. Teacher observation of reasoning is still needed. All new/changed content remains pending review; no families are approved or released by this work.
