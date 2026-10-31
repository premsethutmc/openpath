# 06 — Teaching-content review records (explanation-review@1)

Every new or revised linear-equations explanation has a revision-bound record in `content/learning/explanation-review.v1.json`:

| Record | Current revision status | Provenance | Notes |
|---|---|---|---|
| `MATH.algebra.linear-equations#chapter` | revision_required | ai-screening (A3 independent review) | first screen new; the two kept template sections use jargon and a bracket problem before brackets |
| 12 explanations (`balance` … `fix_bracket_sign`) | pending_review | engineering (A3), revised after the independent AI review | machine-checked by the teaching contract; maths re-derived independently; **not approved** |
| retired: `worked_steps`, `spot_the_mistake`, `check_what_it_uses` | unchanged (history) | Milestone 2 screening | no longer in the module; cannot be shown (no content) |

- No reviewer is listed; nothing is approved; no educator approval was assigned or simulated (tests use in-memory fixtures only).
- The four previously blocked revisions stay on the blocklist (4 entries; tests J12 and A2 test 3).
- Demonstration mode labels every explanation "Demonstration: this explanation has not been approved by an educator."; supervised-evaluation
  mode refuses all of them (J11, J13), so a supervised build pauses instead of teaching linear equations until an educator approves them.
- The concept-section record covers the lesson page's first sections; the educator packet (09) lists every revision hash to decide on.
