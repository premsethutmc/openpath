# Pythagoras AI review, 2026-11-10

Reviewed upstream PR #124 at `04d764772906d1f72775b34c5d09fe7b6b6c7839`, independently of its implementation. Read-only review of content, method mappings, tests, and CBSE Grade 8 learner-view output. This is AI mathematical/content review, not human educator approval or real-learner evidence. The fixes below can proceed without waiting for an unassigned educator.

## Confirmed defects

1. **The second triple rule lacks its own worked example.** `packages/learning/src/library.ts` chooses one example per secondary family. The chapter and relevant strategies demonstrate `gen:ahgen:0,9,0` (the `2m` rule, with `m=9`, hypotenuse `82`). The `m² − n², 2mn, m² + n²` rule is stated but not worked. The actual Grade 8 follow-up includes `gen:ahgen:3,9,5:w`, which asks for `2mn=90`. The registry nonetheless lists `triple-rule-mn` as covered.
2. **Three unmapped explanations bypass method compatibility.** `method-alignment.ts` returns unknown without a map, while legacy records without `methodAlignment` are permitted by `followupCompatible`.
   - `triples` teaches scaling `8–15–17` by `2`, so `16,30 → 34`. Its guided item `gen:ahpyth:40,75,2` asks for a shorter side. Its independent check `gen:ahpyth:18,80,0` is not a scaling of any of the three base triples taught there.
   - `spot_the_mistake` gives a correct shorter-side correction but only “Not 18, but 36,” without intermediate square, subtract and root steps. It does not teach hypotenuse, converse or generation methods.
   - `check_what_it_uses` advises practising squares and roots. It does not teach a Pythagoras solution, yet it leads to shorter-side follow-ups.
3. **The stated domain should exclude zero.** Use “positive integers `m > n ≥ 1`.” “Whole numbers `m > n`” permits `n=0`, producing a degenerate triangle. The generator already uses positive `n`.
4. **Missing diagrams remain.** The learner-view automatic review reports three “picture named but not drawn” sections: Finding the hypotenuse, Squares on the sides, Spot a triple.

## Bounded next implementation

- Add a separately reserved `m,n` worked example with its own instance ID, all three substitutions, and a square-sum verification. For example `m=3,n=2` gives `5,12,13`, with `25+144=169`; the implementation must choose a valid reserved instance rather than reuse an independently assessed problem.
- Refresh the changed content and registry hashes through the repository's normal regeneration. Preserve existing review history and do not mark this as human approval.
- Repair each strategy before mapping it. Give triple-recognition a taught general fallback, or constrain its follow-ups to the cases it demonstrates. Expand the misconception's shorter-side working and map only that method. Route prerequisite-only advice into substantive teaching before any Pythagoras follow-up.
- Require newly taught Pythagoras paths to carry a real method map; preserve historical replay deliberately rather than changing old answers silently.
- Keep the existing rejection of a hypotenuse question after the shorter-side-only `worked_steps` strategy.
- Tests should separately require both triple methods, an instance-linked `m,n` worked example, correct domain, newly taught strategy mappings, and question-to-method compatibility after replay/reload. Text-presence checks alone are insufficient.

## Checks performed

- `pythagoras-methods.test.ts`, `pythagoras-shorter-side.test.ts`, `method-alignment-batch2.test.ts`: **19/19 passed** at the reviewed head.
- CBSE Grade 8 `learner-view` completed and exposed the `m,n` follow-up described above.
- These passing tests do not close the defects: they check map claims/text presence; the journey test accepts converse plus either triple rule, not necessarily both.
- No full-suite, TN learner-view or browser validation was performed in this review. No Pythagoras code, approval or learner record was changed.
